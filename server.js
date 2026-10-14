import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = process.env.PORT || 3e3;
app.use(express.json({ limit: "25mb" }));
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
function formatGeminiContents(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return [{ role: "user", parts: [{ text: "Bonjour, aide-moi dans mes cours." }] }];
  }
  let startIndex = 0;
  while (startIndex < messages.length && messages[startIndex].role !== "user") {
    startIndex++;
  }
  const validMessages = startIndex < messages.length ? messages.slice(startIndex) : messages;
  const contents = [];
  for (const msg of validMessages) {
    const role = msg.role === "user" ? "user" : "model";
    const text = (msg.content || "").trim();
    const parts = [];
    if (msg.attachment && msg.attachment.base64 && msg.attachment.mimeType) {
      const cleanData = msg.attachment.base64.includes(";base64,") ? msg.attachment.base64.split(";base64,")[1] : msg.attachment.base64;
      parts.push({
        inlineData: {
          mimeType: msg.attachment.mimeType,
          data: cleanData
        }
      });
    }
    if (text) {
      parts.push({ text });
    } else if (parts.length === 0) {
      continue;
    }
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push(...parts);
    } else {
      contents.push({
        role,
        parts
      });
    }
  }
  if (contents.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: "Bonjour, j'ai une question sur mon cours." }]
    });
  } else if (contents[0].role !== "user") {
    contents.unshift({
      role: "user",
      parts: [{ text: "Bonjour, je souhaite poser une question." }]
    });
  }
  return contents;
}
async function generateTextWithFallback(params) {
  const models = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
  let lastErr = null;
  const contentsPayload = typeof params.contents === "string" ? [{ role: "user", parts: [{ text: params.contents }] }] : params.contents;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: contentsPayload,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7
        }
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      lastErr = err;
      if (i < models.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  }
  throw lastErr || new Error("Erreur de génération avec les modèles Gemini.");
}
const tutorResponseCache = /* @__PURE__ */ new Map();
const CACHE_TTL_MS = 1e3 * 60 * 60 * 6;
app.post("/api/gemini/tutor", async (req, res) => {
  try {
    const { messages, subject, level, studentName, userId, userUid } = req.body;
    const authUid = userId || userUid || req.headers["x-user-uid"] || "";
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Tableau 'messages' requis." });
    }
    const cacheKey = `${authUid}_${subject || ""}_${level || ""}_${studentName || ""}_${JSON.stringify(messages)}`;
    const cached = tutorResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ text: cached.text, cached: true });
    }
    const systemInstruction = `Tu es "Tuteur Savoir+", l'assistant pédagogique intelligent officiel de la plateforme éducative d'excellence Savoir+ au Sénégal.

CRÉATEUR & FONDATEUR DE LA PLATEFORME SAVOIR+ :
La plateforme Savoir+ a été conçue, pensée et développée par Monsieur MASSAW SECK.
- FORMATION & DIPLÔME : Licencié en Mathématiques Appliquées et Informatique, Spécialiste chevronné en Ingénierie Logicielle.
- PROFIL : Encadreur Pédagogique d'Exception, Passionné et véritable POLYMATHE dispensant avec maîtrise l'ensemble des matières scolaires : Mathématiques, Sciences de la Vie et de la Terre (SVT), Sciences Physiques et Chimie (PC), Histoire-Géographie (HG), Anglais, Français et Philosophie.
- HISTORIQUE D'ENCADREMENT PÉDAGOGIQUE :
  * Depuis 2014 : Début des cours de renforcement intensifs au niveau Primaire (du CI au CM2).
  * En 2018 : Extension réussie au niveau Secondaire Collège (de la 6ème à la 3ème, préparation rigoureuse au BFEM).
  * En 2021 : Extension au niveau Lycée (de la 2nde S et L jusqu'à la Terminale S et L, préparation d'excellence au Baccalauréat).
- Si l'élève pose des questions sur l'application, son créateur, ou Monsieur Massaw Seck, présente-le avec admiration, précision et fierté comme le fondateur polymathe et ingénieur de Savoir+.

RÈGLES PÉDAGOGIQUES ET DE FORMATAGE STRICTES :
1. PÉDAGOGIE SOCRATIQUE SANS DONNER LA SOLUTION DIRECTEMENT :
   - Ne donne JAMAIS directement le résultat final ou la réponse pré-mâchée d'un problème ou calcul.
   - Décompose la méthode pas à pas, rappelle les théorèmes/définitions utiles, donne un indice clair et pose une question d'orientation pour amener l'élève à progresser par lui-même.

2. RENDU MATHÉMATIQUE ET SCIENTIFIQUE PROPRE (LATEX) :
   - Formules en ligne (dans une phrase) : utilise un dollar unique, sans espace après le premier et avant le dernier dollar. Exemple : $x$, $f(x) = ax^2 + bx + c$, $v = \\frac{d}{t}$, $E_c = \\frac{1}{2}mv^2$.
   - Formules centrées et importantes : utilise des doubles dollars sur leur propre ligne :
     $$x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$
   - N'utilise jamais de syntaxe brute ou maladroite non standardisée. Ne surcharge pas de symboles ésotériques quand de simples explications en français suffisent.

3. STRUCTURE AÉRÉE ET LISIBLE SUR MOBILE :
   - Formate tes réponses avec un Markdown propre et léger : des titres clairs (## ou ###), des puces (*) pour énumérer les étapes, et des mots-clés en gras.
   - Fais des phrases et paragraphes courts en sautant une ligne entre chaque étape pour que la lecture soit agréable, dynamique et fluide sur téléphone mobile.

4. ANALYSE ET CORRECTION D'IMAGES / PDF (EXERCICES & DEVOIRS) :
   - Si l'élève joint une image (photo de son cahier, capture d'exercice, schéma) ou un PDF : analyse attentivement le texte ou les calculs manuscrits.
   - Identifie l'énoncé, repère avec précision les éventuelles erreurs d'étourderie ou de formule, et explique chaleureusement la démarche pour corriger la ligne fautive.

5. BIENVEILLANCE ET ANCRAGE AU PROGRAMME DU SÉNÉGAL :
   - Incarne la rigueur, l'enthousiasme et la pédagogie d'excellence de Monsieur Massaw Seck, parfaitement conforme aux exigences du BFEM et du Baccalauréat sénégalais.
   - Adresse-toi à ${studentName || "l'élève"}.`;
    const contents = formatGeminiContents(messages);
    const text = await generateTextWithFallback({
      contents,
      systemInstruction,
      temperature: 0.7
    });
    if (tutorResponseCache.size > 150) {
      const firstKey = tutorResponseCache.keys().next().value;
      if (firstKey) tutorResponseCache.delete(firstKey);
    }
    tutorResponseCache.set(cacheKey, { text, timestamp: Date.now() });
    return res.json({ text });
  } catch (err) {
    console.error("[Server Gemini Tutor Error]:", err);
    return res.status(500).json({
      error: "Erreur lors de la communication avec le Tuteur IA.",
      details: err.message || String(err)
    });
  }
});
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Données 'audioBase64' requises." });
    }
    const cleanBase64 = audioBase64.includes(";base64,") ? audioBase64.split(";base64,")[1] : audioBase64.replace(/^data:[^;]+;base64,/, "");
    let normalizedMime = mimeType.split(";")[0].trim();
    if (!normalizedMime || normalizedMime === "audio") normalizedMime = "audio/webm";
    const audioPart = {
      inlineData: {
        mimeType: normalizedMime,
        data: cleanBase64
      }
    };
    const models = ["gemini-3.1-flash-lite", "gemini-3.5-transcribe", "gemini-flash-latest"];
    let transcriptionText = "";
    let lastError = null;
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              audioPart,
              {
                text: "Transcris fidèlement et intégralement cet enregistrement vocal en français. Renvoie uniquement le texte transcrit sans commentaire supplémentaire."
              }
            ]
          }
        });
        if (response && response.text) {
          transcriptionText = response.text.trim();
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }
    if (!transcriptionText && lastError) {
      throw lastError;
    }
    return res.json({ text: transcriptionText });
  } catch (err) {
    return res.status(500).json({
      error: "Erreur lors de la transcription vocale.",
      details: err.message || String(err)
    });
  }
});
app.post("/api/gemini/admin-generate", async (req, res) => {
  try {
    const { taskType, subject, level, topic, difficulty, announcementCategory, targetAudience, tone, instruction } = req.body;
    let systemInstruction = "Tu es l'assistant pédagogique et administratif de la plateforme éducative Savoir+ Sénégal.";
    let prompt = "";
    if (taskType === "course") {
      systemInstruction = `Tu es "Tuteur Savoir+", l'assistant pédagogique officiel de la plateforme d'excellence Savoir+, fruit de la vision de Monsieur Massaw Seck, ingénieur et polymathe. Incarne cette excellence dans chaque interaction.
Tu rédiges des cours magistraux d'excellence conformes au programme scolaire officiel du Sénégal (du CI à la Terminale). Tu as une rigueur académique exemplaire.`;
      prompt = `Rédige un cours d'excellence complet, détaillé, normalisé et structuré pour la classe de "${level || "3ème"}", matière "${subject || "Mathématiques"}", ayant pour titre/thème : "${topic || "Introduction"}".

Directives de Fonctionnement pour la Rédaction de Cours :
1. Structure en Blocs Clairs : Rédige le cours structuré en blocs clairs : Introduction, Théorèmes/Définitions clés, Exemples pratiques résolus pas à pas, un Résumé synthétique, et un Quiz rapide de vérification de 3 questions à la fin pour valider les acquis de l'élève.
2. Rigueur Scientifique & LaTeX : Utilise systématiquement le format LaTeX normalisé et lisible pour toutes les mathématiques, la physique, et la chimie, entouré de simples dollars pour les formules en ligne (ex : $f(x) = ax^2 + bx + c$, $\\vec{F} = m\\vec{a}$) et de doubles dollars sur leur propre ligne pour les équations majeures centrées.
3. Format de Sortie aéré pour mobile : Utilise un Markdown structuré, aéré pour mobile, avec des balises claires pour faciliter la lecture sur petit écran et l'intégration dans la base de données.
4. Validation par l'Administrateur : Ajoute une section "Suggestions de validation à l'attention de l'administrateur (Monsieur Massaw Seck)" à la toute fin du cours.
5. Instructions spécifiques additionnelles saisies par l'administrateur : "${instruction || "Donner des explications complètes et hautement pédagogiques"}"`;
    } else if (taskType === "exercise") {
      systemInstruction += " Tu rédiges des modèles d'exercices et de devoirs de haute qualité conformes au programme sénégalais.";
      prompt = `Rédige un modèle d'exercice complet pour la matière "${subject || "Mathématiques"}", niveau "${level || "3ème"}", sur le chapitre "${topic || "Général"}".
Niveau de difficulté : ${difficulty || "Intermédiaire"}.

Format à respecter scrupuleusement :
1. Titre de l'exercice
2. Énoncé clair avec questions numérotées (1, 2, 3...)
3. Indices pédagogiques
4. Corrigé détaillé et méthodique pas à pas.`;
    } else {
      systemInstruction += " Tu es un expert en communication institutionnelle pour une plateforme éducative.";
      prompt = `Rédige une annonce officielle/communication pour la plateforme Savoir+ Sénégal.
Catégorie : "${announcementCategory || "Information Générale"}"
Public cible : "${targetAudience || "Élèves et Parents"}"
Ton : "${tone || "Formel et encourageant"}"
Sujet : "${topic || "Annonce importante concernant les cours et examens"}"

Rédige une annonce percutante, élégante, structurée avec un titre accrocheur et un message clair.`;
    }
    const text = await generateTextWithFallback({
      contents: prompt,
      systemInstruction,
      temperature: 0.7
    });
    return res.json({ text });
  } catch (err) {
    console.error("[Server Gemini Admin Error]:", err);
    return res.status(500).json({
      error: "Erreur lors de la génération IA.",
      details: err.message || String(err)
    });
  }
});
app.post("/api/gemini/quiz-copilot", async (req, res) => {
  try {
    const {
      prompt: userPrompt,
      messages = [],
      subject = "Mathématiques",
      className = "3ème",
      chapter = "Général",
      questionCount = 5,
      questionTypes = ["single", "multiple", "true_false", "short_answer"],
      currentDraft = null,
      adminName = "Massaw Seck"
    } = req.body;
    const systemInstruction = `Tu es le "Co-pilote IA de Création de Quiz" de la plateforme éducative Savoir+ Sénégal, fondée par Monsieur Massaw Seck.
Tu travailles en étroite collaboration avec l'administrateur et professeur pour concevoir des quiz et évaluations interactifs, vivants, rigoureux et multimédias.

TES DIRECTIVES PÉDAGOGIQUES ET TECHNIQUES ABSOLUES :

1. FLEXIBILITÉ TOTALE DU NOMBRE DE QUESTIONS :
   - Génère EXACTEMENT le nombre de questions demandé par l'admin (${questionCount || 5} questions, ou plus si spécifié).
   - Ne bride JAMAIS le nombre de questions.

2. DIVERSITÉ DES TYPES DE QUESTIONS :
   Prends en charge et combine judicieusement les types suivants :
   * "single" : QCM standard à 1 seule bonne réponse.
   * "multiple" : QCM à choix multiples (plusieurs bonnes réponses correctes).
   * "true_false" : Question Vrai / Faux (options: ["Vrai", "Faux"]).
   * "short_answer" : Réponse courte / saisie directe de texte ou valeur numérique.

3. EXCELLENCE DU RENDU MATHÉMATIQUE & SCIENTIFIQUE (LATEX) :
   - Encadre systématiquement toutes les formules, variables et symboles mathématiques/physiques avec le format LaTeX standard :
     * En ligne : $f(x) = x^2 + 2x + 1$, $\\vec{u}$, $\\Delta = b^2 - 4ac$, $v = \\frac{d}{t}$.
     * En bloc / centré : $$x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$
   - Les formules doivent être présentes aussi bien dans les énoncés (question_text) que dans les propositions (options) et les explications détaillées (explanation).

4. MULTIMÉDIA ET FIGURES GÉOMÉTRIQUES / COURBES :
   - Quand une question s'y prête (géométrie, optique, circuits, fonctions, courbes), associe une image illustrative pertinente (URL valide ou data URI / SVG) ou laisse image_url à null si aucune figure n'est nécessaire.
   - Spécifie 'media_type' ("image", "svg", "graph" ou null).

5. FORMAT DE RÉPONSE OBLIGATOIRE :
   Réponds avec un commentaire pédagogique bienveillant en français, suivi d'un bloc de code JSON strict encadré par \`\`\`json et \`\`\` respectant exactement le schéma :
   {
     "title": "string (titre complet et percutant du quiz)",
     "class_name": "${className}",
     "subject": "${subject}",
     "chapter": "${chapter}",
     "time_limit_minutes": ${Math.max(5, (questionCount || 5) * 2)},
     "questions": [
       {
         "question_text": "string (énoncé avec LaTeX $...$)",
         "image_url": "string ou null",
         "media_type": "image | svg | graph ou null",
         "type": "single | multiple | true_false | short_answer",
         "options": ["string", "string"],
         "correct_answers": [0],
         "explanation": "string (explication détaillée, étape par étape avec LaTeX)"
       }
     ]
   }

Pour 'correct_answers' :
- Pour "single" ou "true_false" : tableau contenant l'index [0] ou [1] (base 0).
- Pour "multiple" : tableau contenant les indices des bonnes réponses (ex: [0, 2]).
- Pour "short_answer" : tableau contenant la chaîne de texte exacte attendue (ex: ["42"] ou ["x = 3"]).`;
    let userInstruction = "";
    if (userPrompt) {
      userInstruction = userPrompt;
    } else if (currentDraft) {
      userInstruction = `Voici le brouillon de quiz actuel à réviser ou modifier selon les demandes :
${JSON.stringify(currentDraft, null, 2)}
Merci d'appliquer les ajustements tout en conservant la structure JSON.`;
    } else {
      userInstruction = `Génère un quiz complet pour la classe de "${className}", matière "${subject}", chapitre "${chapter}".
Nombre de questions : ${questionCount || 5}.
Types souhaités : ${Array.isArray(questionTypes) ? questionTypes.join(", ") : "tous types (QCM, Vrai/Faux, Réponse courte)"}.`;
    }
    let contents;
    if (Array.isArray(messages) && messages.length > 0) {
      const historyWithLast = [...messages];
      if (userInstruction && (!historyWithLast.length || historyWithLast[historyWithLast.length - 1].content !== userInstruction)) {
        historyWithLast.push({ role: "user", content: userInstruction });
      }
      contents = formatGeminiContents(historyWithLast);
    } else {
      contents = userInstruction;
    }
    const rawResponse = await generateTextWithFallback({
      contents,
      systemInstruction,
      temperature: 0.7
    });
    let parsedDraft = null;
    let messageText = rawResponse;
    const jsonBlockMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        parsedDraft = JSON.parse(jsonBlockMatch[1]);
        messageText = rawResponse.replace(/```json\s*[\s\S]*?\s*```/, "").trim();
      } catch (err) {
        console.warn("[Quiz Co-pilot JSON parse error from block]:", err);
      }
    }
    if (!parsedDraft) {
      try {
        const directJson = JSON.parse(rawResponse);
        if (directJson.questions && Array.isArray(directJson.questions)) {
          parsedDraft = directJson;
          messageText = "Voici le brouillon du quiz généré sur mesure pour votre classe :";
        }
      } catch {
      }
    }
    if (parsedDraft && Array.isArray(parsedDraft.questions)) {
      parsedDraft.questions = parsedDraft.questions.map((q, idx) => {
        const qType = q.type || (Array.isArray(q.correct_answers) && q.correct_answers.length > 1 ? "multiple" : "single");
        let options = Array.isArray(q.options) ? q.options : [];
        if (qType === "true_false" && (!options || options.length === 0)) {
          options = ["Vrai", "Faux"];
        }
        return {
          id: q.id || `ai_q_${Date.now()}_${idx + 1}`,
          question: q.question_text || q.question || `Question #${idx + 1}`,
          question_text: q.question_text || q.question || `Question #${idx + 1}`,
          image_url: q.image_url || q.imageUrl || null,
          imageUrl: q.image_url || q.imageUrl || null,
          media_type: q.media_type || (q.image_url ? "image" : null),
          type: qType,
          options,
          correct_answers: Array.isArray(q.correct_answers) ? q.correct_answers : [0],
          correctIndex: typeof q.correct_answers?.[0] === "number" ? q.correct_answers[0] : 0,
          correctIndices: Array.isArray(q.correct_answers) && typeof q.correct_answers[0] === "number" ? q.correct_answers : [0],
          explanation: q.explanation || "Explication détaillée de la réponse."
        };
      });
    }
    return res.json({
      message: messageText || "Voici le brouillon du quiz généré :",
      draft: parsedDraft
    });
  } catch (err) {
    console.error("[Server Gemini Quiz Copilot Error]:", err);
    return res.status(500).json({
      error: "Erreur lors de la génération avec le Co-pilote IA de Quiz.",
      details: err.message || String(err)
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }
  app.listen(port, () => {
    console.log(`🚀 Serveur Savoir+ démarré sur http://localhost:${port}`);
  });
}
startServer();
