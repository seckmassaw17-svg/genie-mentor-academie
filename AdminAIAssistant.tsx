import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Send,
  Copy,
  Check,
  FileText,
  Megaphone,
  Loader2,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Clock,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  CheckSquare,
  CircleDot,
  Share2,
  Maximize2,
  X,
  Save,
  GraduationCap,
  MessageSquare,
  Zap,
} from "lucide-react";
import { 
  Quiz, 
  QuizQuestion, 
  SecondaryLevel, 
  Subject, 
  QuestionType,
  QuizDraftPayload 
} from "../types";
import { ALL_LEVELS, getSubjectsForLevel, getLevelLabel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { 
  saveQuizToSupabase, 
  saveNotificationToSupabase, 
  logAdminActionToSupabase 
} from "../data/supabaseStorage";
import { MathRenderer } from "./MathRenderer";
import { LatexToolbar } from "./LatexToolbar";
import { useVirtualLatexKeyboard } from "./VirtualLatexKeyboard";

interface AdminAIAssistantProps {
  adminEmail?: string;
  adminName?: string;
  onQuizPublished?: (quiz: Quiz) => void;
  quizToEdit?: Quiz | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  draft?: QuizDraftPayload | null;
}

export const AdminAIAssistant: React.FC<AdminAIAssistantProps> = ({
  adminEmail = "massperpendiculaire@gmail.com",
  adminName = "Massaw Seck (Admin)",
  onQuizPublished,
  quizToEdit,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const { registerFocus, useVirtualKeyboardOnly } = useVirtualLatexKeyboard();

  // Active Main Tab: "quiz_copilot" | "exercise" | "announcement" | "course_generator"
  const [activeTab, setActiveTab] = useState<"quiz_copilot" | "exercise" | "announcement" | "course_generator">("quiz_copilot");

  // ============================================================================
  // 4. COURSE GENERATOR STATE
  // ============================================================================
  const [courseSubject, setCourseSubject] = useState<string>("Mathématiques");
  const [courseLevel, setCourseLevel] = useState<string>("3ème");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseInstruction, setCourseInstruction] = useState("");

  // ============================================================================
  // 1. QUIZ CO-PILOT STATE (Empty String Support for flexible typing)
  // ============================================================================
  const [quizSubject, setQuizSubject] = useState<Subject>("Mathématiques");
  const [quizLevel, setQuizLevel] = useState<SecondaryLevel>("3ème");
  const [quizChapter, setQuizChapter] = useState("Théorème de Pythagore & Trigonométrie");
  const [quizQuestionCount, setQuizQuestionCount] = useState<number | "">(5);
  const [quizDurationMinutes, setQuizDurationMinutes] = useState<number | "">(15);
  const [quizIncludeMedia, setQuizIncludeMedia] = useState<boolean>(true);
  const [quizCustomPrompt, setQuizCustomPrompt] = useState<string>("");

  // Question Types Selection
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>([
    "single",
    "multiple",
    "true_false",
    "short_answer",
  ]);

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome_msg",
      role: "assistant",
      content:
        "👋 **Bonjour Monsieur Massaw Seck !**\n\nJe suis votre **Co-pilote IA de Création de Quiz & Évaluations**.\n\nJe peux générer pour vous des quiz **sans restriction de nombre de questions**, mêlant **QCM simples, choix multiples, Vrai/Faux et réponses courtes**, avec prise en charge intégrale des **formules mathématiques en LaTeX** ($f(x) = x^2 + 2x + 1$) et des **figures / schémas illustratifs**.\n\nConfigurez les paramètres ci-contre ou tapez directement vos consignes ci-dessous pour créer ou ajuster votre quiz !",
      timestamp: Date.now(),
    },
  ]);
  const [inputChatText, setInputChatText] = useState("");
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  // Current active draft & publication state
  const [currentDraft, setCurrentDraft] = useState<QuizDraftPayload | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftEditCopy, setDraftEditCopy] = useState<QuizDraftPayload | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);
  const [publishedQuizId, setPublishedQuizId] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Load quizToEdit if passed into this component
  useEffect(() => {
    if (quizToEdit) {
      setQuizSubject(quizToEdit.subject);
      setQuizLevel(quizToEdit.level);
      setQuizChapter(quizToEdit.chapter || "");
      const count = quizToEdit.questions?.length || 5;
      setQuizQuestionCount(count);
      const mins = quizToEdit.durationMinutes || quizToEdit.duration_minutes || 15;
      setQuizDurationMinutes(mins);

      const convertedDraft: QuizDraftPayload = {
        title: quizToEdit.title,
        class_name: quizToEdit.level,
        subject: quizToEdit.subject,
        chapter: quizToEdit.chapter || "",
        time_limit_minutes: mins,
        questions: (quizToEdit.questions || []).map((q, idx) => ({
          question_text: q.question || q.question_text || `Question #${idx + 1}`,
          image_url: q.imageUrl || q.image_url || null,
          media_type: q.mediaType || q.media_type || (q.imageUrl || q.image_url ? "image" : null),
          type: q.type || (Array.isArray(q.correctIndices) && q.correctIndices.length > 1 ? "multiple" : "single"),
          options: Array.isArray(q.options) ? [...q.options] : ["Option 1", "Option 2"],
          correct_answers: Array.isArray(q.correct_answers)
            ? q.correct_answers
            : Array.isArray(q.correctIndices) && q.correctIndices.length > 0
            ? q.correctIndices
            : [typeof q.correctIndex === "number" ? q.correctIndex : 0],
          explanation: q.explanation || "Explication de la réponse.",
        })),
      };

      setCurrentDraft(convertedDraft);
      setChatMessages((prev) => [
        ...prev,
        {
          id: "loaded_quiz_" + Date.now(),
          role: "assistant",
          content: `📖 **Quiz chargé dans le Co-pilote :** "${quizToEdit.title}" (${quizToEdit.subject} - ${quizToEdit.level}, ${count} questions).\n\nVous pouvez maintenant me demander d'ajouter des questions, d'ajuster le temps ou de remplacer des notions !`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [quizToEdit]);

  // Auto-scroll chat to bottom
  const chatBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isCopilotLoading]);

  // Toggle a question type in the filter
  const toggleQuestionType = (type: QuestionType) => {
    if (selectedQuestionTypes.includes(type)) {
      if (selectedQuestionTypes.length > 1) {
        setSelectedQuestionTypes(selectedQuestionTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedQuestionTypes([...selectedQuestionTypes, type]);
    }
  };

  // Quick suggestion chips
  const handleApplyPreset = (type: "quick5" | "geom10" | "bac15" | "sciences8") => {
    if (type === "quick5") {
      setQuizQuestionCount(5);
      setQuizDurationMinutes(10);
      setQuizCustomPrompt("Génère un quiz rapide et stimulant de 5 questions (3 QCM simples, 1 Vrai/Faux, 1 calcul court) avec formules LaTeX.");
    } else if (type === "geom10") {
      setQuizQuestionCount(10);
      setQuizDurationMinutes(20);
      setQuizIncludeMedia(true);
      setQuizCustomPrompt("Conçois une évaluation complète de 10 questions avec figures géométriques, schémas vectoriels, calculs détaillés en LaTeX et explications méthodiques.");
    } else if (type === "bac15") {
      setQuizQuestionCount(15);
      setQuizDurationMinutes(30);
      setQuizLevel("Terminale S2");
      setQuizSubject("Mathématiques");
      setQuizChapter("Suites Numériques, Limites et Fonctions Logarithmes");
      setQuizCustomPrompt("Rédige un quiz d'excellence de 15 questions niveau Baccalauréat sénégalais avec QCM multiples, études de limites en LaTeX et résolutions pas à pas.");
    } else if (type === "sciences8") {
      setQuizQuestionCount(8);
      setQuizDurationMinutes(15);
      setQuizSubject("Physique-Chimie");
      setQuizChapter("Cinématique & Lois de Newton");
      setQuizCustomPrompt("Génère 8 questions sur les lois de Newton et la cinématique avec unités physiques en LaTeX et schémas de forces.");
    }
  };

  // Submit / Generate Quiz with Co-pilot
  const handleSendCopilotMessage = async (customInstruction?: string) => {
    const textToSend = (customInstruction ?? inputChatText).trim();
    if (!textToSend && !customInstruction && !quizChapter) return;

    const userMsgContent = textToSend || `Générer un quiz de ${quizQuestionCount} questions sur le chapitre "${quizChapter}" en ${quizSubject} (${quizLevel}).`;

    const userMessage: ChatMessage = {
      id: "user_" + Date.now(),
      role: "user",
      content: userMsgContent,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    if (!customInstruction) setInputChatText("");
    setIsCopilotLoading(true);
    setPublishSuccessMessage(null);

    try {
      const payload = {
        prompt: userMsgContent,
        messages: chatMessages
          .filter((m) => m.id !== "welcome_msg")
          .map((m) => ({ role: m.role === "assistant" ? "model" : "user", content: m.content })),
        subject: quizSubject,
        className: quizLevel,
        chapter: quizChapter,
        questionCount: quizQuestionCount,
        questionTypes: selectedQuestionTypes,
        includeMedia: quizIncludeMedia,
        currentDraft: currentDraft,
        adminName,
      };

      const response = await fetch("/api/gemini/quiz-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMsg: ChatMessage = {
        id: "asst_" + Date.now(),
        role: "assistant",
        content: data.message || "Voici le brouillon du quiz généré :",
        draft: data.draft || null,
        timestamp: Date.now(),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);

      if (data.draft && Array.isArray(data.draft.questions) && data.draft.questions.length > 0) {
        setCurrentDraft(data.draft);
        setPublishedQuizId(null);
      }

      // Audit Log
      await logAdminActionToSupabase(
        adminEmail,
        "QUIZ_COPILOT_GENERATE",
        `Génération Co-pilote Quiz : ${quizSubject} ${quizLevel} (${quizQuestionCount} questions)`
      );
    } catch (err: any) {
      console.error("[Quiz Co-pilot Error]:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          role: "assistant",
          content: "⚠️ Une erreur est survenue lors de la communication avec le Co-pilote IA. Veuillez vérifier votre connexion et réessayer.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Open Draft In-line Editor
  const handleOpenDraftEditor = () => {
    if (!currentDraft) return;
    setDraftEditCopy(JSON.parse(JSON.stringify(currentDraft)));
    setIsEditingDraft(true);
  };

  // Save changes made in Draft Editor
  const handleSaveDraftEdits = () => {
    if (!draftEditCopy) return;
    setCurrentDraft(draftEditCopy);
    setIsEditingDraft(false);
  };

  // Publish Draft onto Supabase & RoomDatabase
  const handlePublishQuizToSupabase = async () => {
    if (!currentDraft || !currentDraft.questions || currentDraft.questions.length === 0) return;

    setIsPublishing(true);
    setPublishSuccessMessage(null);

    try {
      const now = Date.now();
      const quizId = "quiz_ai_" + now;
      const durationMins = currentDraft.time_limit_minutes || quizDurationMinutes || 15;

      // Format clean questions according to QuizQuestion model
      const formattedQuestions: QuizQuestion[] = currentDraft.questions.map((q: any, idx: number) => {
        const qType: QuestionType = q.type || (Array.isArray(q.correct_answers) && q.correct_answers.length > 1 ? "multiple" : "single");
        const correctAnswers = Array.isArray(q.correct_answers) ? q.correct_answers : [0];
        const numIndices = correctAnswers.filter((a) => typeof a === "number") as number[];

        return {
          id: `q_${quizId}_${idx + 1}`,
          question: q.question_text || q.question || `Question #${idx + 1}`,
          question_text: q.question_text || q.question || `Question #${idx + 1}`,
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Option 1", "Option 2"],
          type: qType,
          correct_answers: correctAnswers,
          correctIndex: numIndices.length > 0 ? numIndices[0] : 0,
          correctIndices: numIndices.length > 0 ? numIndices : [0],
          correctAnswerText: typeof correctAnswers[0] === "string" ? correctAnswers[0] : undefined,
          explanation: q.explanation || "Explication détaillée de la réponse.",
          imageUrl: q.image_url || q.imageUrl || null,
          image_url: q.image_url || q.imageUrl || null,
          mediaType: q.media_type || (q.image_url ? "image" : undefined),
          media_type: q.media_type || (q.image_url ? "image" : undefined),
        };
      });

      const newQuiz: Quiz = {
        id: quizId,
        title: currentDraft.title || `${quizSubject} - ${quizChapter || "Évaluation"}`,
        subject: (currentDraft.subject as Subject) || quizSubject,
        level: (currentDraft.class_name as SecondaryLevel) || quizLevel,
        chapter: currentDraft.chapter || quizChapter,
        questions: formattedQuestions,
        durationMinutes: durationMins,
        duration_minutes: durationMins,
        duration: String(durationMins),
        durationSeconds: durationMins * 60,
        durationFormatted: `${String(Math.floor(durationMins / 60)).padStart(2, "0")} : ${String(durationMins % 60).padStart(2, "0")} : 00`,
        status: "published",
        isDraft: false,
        createdAt: now,
      };

      // 1. Save directly to Supabase table 'quizzes' and 'quiz_questions'
      await saveQuizToSupabase(newQuiz);

      // 2. Insert into local RoomDatabase DAO
      roomRepo.insertQuiz(newQuiz);

      // 3. Notify parent callback if provided
      if (onQuizPublished) {
        onQuizPublished(newQuiz);
      }

      // 4. Send targeted broadcast notification to the students of this class
      try {
        await saveNotificationToSupabase({
          id: "notif_newquiz_" + now,
          recipient: currentDraft.class_name || quizLevel,
          recipientId: currentDraft.class_name || quizLevel,
          target_uid: currentDraft.class_name || quizLevel,
          targetUid: currentDraft.class_name || quizLevel,
          targetRole: "eleve",
          userUid: currentDraft.class_name || quizLevel,
          title: `🎯 Nouveau Quiz d'Évaluation (${newQuiz.subject})`,
          message: `Un nouveau quiz interactif "${newQuiz.title}" (${formattedQuestions.length} questions • ${durationMins} min) est maintenant disponible dans votre espace Évaluations !`,
          type: "quiz_published",
          status: "unread",
          createdAt: now,
          dateFormatted: `Aujourd'hui à ${new Date(now).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        });
      } catch (notifErr) {
        console.warn("[Notice]: Notification broadcast warning:", notifErr);
      }

      // 5. Audit Log
      await logAdminActionToSupabase(
        adminEmail,
        "PUBLISH_QUIZ_SUPABASE",
        `Publication Quiz sur Supabase : "${newQuiz.title}" (${newQuiz.level} - ${formattedQuestions.length} questions)`
      );

      setPublishedQuizId(quizId);
      setPublishSuccessMessage(`✅ Félicitations ! Le quiz "${newQuiz.title}" a été validé et publié avec succès sur Supabase. Il est maintenant accessible en direct pour tous les élèves de la classe de ${getLevelLabel(newQuiz.level)} !`);

      // Add announcement in chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: "pub_" + Date.now(),
          role: "assistant",
          content: `🎉 **Quiz validé et publié sur Supabase avec succès !**\n\n- **Titre :** ${newQuiz.title}\n- **Classe :** ${newQuiz.level}\n- **Questions :** ${formattedQuestions.length}\n- **Statut :** \`published\` (En ligne)`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      console.error("[Publish Quiz Error]:", err);
      alert("Erreur lors de la publication sur Supabase: " + (err.message || String(err)));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyDraftJson = () => {
    if (!currentDraft) return;
    navigator.clipboard.writeText(JSON.stringify(currentDraft, null, 2));
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  // ============================================================================
  // 2. EXERCISE & ANNOUNCEMENT GENERATOR STATE
  // ============================================================================
  const [exSubject, setExSubject] = useState("Mathématiques");
  const [exLevel, setExLevel] = useState("3ème");
  const [exTopic, setExTopic] = useState("Théorème de Pythagore et Trigonométrie");
  const [exDifficulty, setExDifficulty] = useState("Intermédiaire (Examens)");

  const [annCategory, setAnnCategory] = useState("Rappel de Paiement / Mensualités");
  const [annAudience, setAnnAudience] = useState("Tous les élèves et parents");
  const [annTone, setAnnTone] = useState("Formel et encourageant");
  const [annTopic, setAnnTopic] = useState("Prochaine échéance des cours du soir et accès VIP");

  const [generatedTextResult, setGeneratedTextResult] = useState("");
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [announcementBroadcastSuccess, setAnnouncementBroadcastSuccess] = useState("");

  const handleGenerateText = async () => {
    setIsGeneratingText(true);
    setGeneratedTextResult("");
    setAnnouncementBroadcastSuccess("");

    try {
      const payload =
        activeTab === "course_generator"
          ? {
              taskType: "course",
              subject: courseSubject,
              level: courseLevel,
              topic: courseTitle,
              instruction: courseInstruction,
            }
          : activeTab === "exercise"
          ? { taskType: "exercise", subject: exSubject, level: exLevel, topic: exTopic, difficulty: exDifficulty }
          : {
              taskType: "announcement",
              announcementCategory: annCategory,
              targetAudience: annAudience,
              tone: annTone,
              topic: annTopic,
            };

      const response = await fetch("/api/gemini/admin-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.text) {
        setGeneratedTextResult(data.text);
        await logAdminActionToSupabase(
          adminEmail,
          "GENERATE_AI_CONTENT",
          `Génération IA (${activeTab === "course_generator" ? "Cours " + courseSubject : activeTab === "exercise" ? "Exercice " + exSubject : "Annonce " + annCategory})`
        );
      } else {
        throw new Error(data.error || "Erreur de génération");
      }
    } catch (err: any) {
      console.error("[Admin AI Generator Error]:", err);
      setGeneratedTextResult("Une erreur est survenue lors de la génération avec Gemini. Veuillez réessayer.");
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handleBroadcastAnnouncement = async () => {
    if (!generatedTextResult) return;
    setIsGeneratingText(true);

    try {
      const now = Date.now();
      await saveNotificationToSupabase({
        id: "notif_announcement_" + now,
        recipient: "all",
        recipientId: "all",
        target_uid: "all",
        targetUid: "all",
        targetRole: "all",
        userUid: "all",
        title: "📢 Annonce Officielle de la Direction",
        message: generatedTextResult,
        type: "admin_broadcast",
        status: "unread",
        createdAt: now,
        dateFormatted: `Aujourd'hui à ${new Date(now).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
      });

      await logAdminActionToSupabase(
        adminEmail,
        "BROADCAST_ANNOUNCEMENT",
        `Diffusion d'une annonce générale générée par IA ("${annCategory}")`
      );

      setAnnouncementBroadcastSuccess("📢 L'annonce a été diffusée avec succès à tous les élèves sous forme de notification !");
    } catch (err) {
      console.error("[Broadcast Error]:", err);
    } finally {
      setIsGeneratingText(false);
      setTimeout(() => setAnnouncementBroadcastSuccess(""), 5000);
    }
  };

  return (
    <div className="space-y-4 text-xs select-text">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-950 via-[#1A237E] to-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 rounded-2xl font-black shadow-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center space-x-2 flex-wrap">
                <span>Co-pilote IA de Création de Quiz & Assistance</span>
                <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full shadow-xs">
                  Gemini Flash 2.5
                </span>
                <span className="px-2 py-0.5 bg-indigo-950 text-amber-300 border border-amber-400/40 text-[10px] font-bold rounded-full">
                  LaTeX & Multimédia
                </span>
              </h3>
              <p className="text-xs text-amber-300 font-bold">
                Conception collaborative, prévisualisation interactive en mode brouillon et publication directe sur Supabase
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("quiz_copilot")}
          className={`py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "quiz_copilot"
              ? "bg-amber-400 text-slate-950 shadow-md font-black"
              : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80"
          }`}
        >
          <Sparkles size={16} className={activeTab === "quiz_copilot" ? "text-slate-950" : "text-amber-400"} />
          <span>🎯 Co-pilote Quiz IA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("course_generator")}
          className={`py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "course_generator"
              ? "bg-amber-400 text-slate-950 shadow-md font-black"
              : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80"
          }`}
        >
          <BookOpen size={16} className={activeTab === "course_generator" ? "text-slate-950" : "text-amber-400"} />
          <span>📝 Générer Cours</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("exercise")}
          className={`py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "exercise"
              ? "bg-amber-400 text-slate-950 shadow-md font-black"
              : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80"
          }`}
        >
          <CheckSquare size={16} className={activeTab === "exercise" ? "text-slate-950" : "text-amber-400"} />
          <span>✍️ Exercices Corrigés</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("announcement")}
          className={`py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "announcement"
              ? "bg-amber-400 text-slate-950 shadow-md font-black"
              : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80"
          }`}
        >
          <Megaphone size={16} className={activeTab === "announcement" ? "text-slate-950" : "text-amber-400"} />
          <span>📢 Annonces Officielles</span>
        </button>
      </div>

      {/* ============================================================================ */}
      {/* 1. QUIZ CO-PILOT TAB (MAIN FEATURE) */}
      {/* ============================================================================ */}
      {activeTab === "quiz_copilot" && (
        <div className="space-y-4">
          {/* Top Quick Preset Chips */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center space-x-2 overflow-x-auto scrollbar-none shadow-xs">
            <span className="text-[11px] font-extrabold text-amber-400 flex items-center space-x-1 shrink-0">
              <Zap size={14} className="text-amber-400" />
              <span>Préréglages rapides :</span>
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset("quick5")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-indigo-300 font-bold rounded-xl text-[11px] border border-indigo-500/40 transition-colors shrink-0 cursor-pointer"
            >
              ⚡ 5 questions rapides (QCM + Vrai/Faux)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("geom10")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-amber-300 font-bold rounded-xl text-[11px] border border-amber-500/40 transition-colors shrink-0 cursor-pointer"
            >
              📐 10 questions avec Géométrie & LaTeX
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("bac15")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-purple-300 font-bold rounded-xl text-[11px] border border-purple-500/40 transition-colors shrink-0 cursor-pointer"
            >
              🏆 15 questions niveau BAC (Tle S)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("sciences8")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-emerald-300 font-bold rounded-xl text-[11px] border border-emerald-500/40 transition-colors shrink-0 cursor-pointer"
            >
              🧪 8 questions Physique-Chimie
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Generator Settings & Interactive Chat (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Configuration Card */}
              <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-black text-white text-xs flex items-center space-x-2">
                    <SlidersHorizontal size={15} className="text-amber-400" />
                    <span>Paramètres du Quiz (Flexibilité Totale)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">Sans restrictions</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Classe / Niveau *
                    </label>
                    <select
                      value={quizLevel}
                      onChange={(e) => {
                        const newLvl = e.target.value as SecondaryLevel;
                        setQuizLevel(newLvl);
                        const validSubs = getSubjectsForLevel(newLvl);
                        if (!validSubs.includes(quizSubject)) {
                          setQuizSubject(validSubs[0]);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl p-2 text-xs font-bold text-white"
                    >
                      {ALL_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Matière *
                    </label>
                    <select
                      value={quizSubject}
                      onChange={(e) => setQuizSubject(e.target.value as Subject)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl p-2 text-xs font-bold text-white"
                    >
                      {getSubjectsForLevel(quizLevel).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Chapitre ou Thème Spécifique *
                  </label>
                  <input
                    type="text"
                    value={quizChapter}
                    onChange={(e) => setQuizChapter(e.target.value)}
                    placeholder="Ex: Nombres complexes, Électrostatique, Génétique..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl p-2 text-xs font-bold text-white placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nombre de Questions {quizQuestionCount !== "" ? `(${quizQuestionCount})` : ""}
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={quizQuestionCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuizQuestionCount(val === "" ? "" : Math.max(1, parseInt(val, 10) || 1));
                        }}
                        placeholder="Ex: 5"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl p-2 text-xs font-black text-amber-300 text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Temps Limite (Minutes) {quizDurationMinutes !== "" ? `(${quizDurationMinutes} min)` : ""}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={quizDurationMinutes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuizDurationMinutes(val === "" ? "" : Math.max(1, parseInt(val, 10) || 1));
                      }}
                      placeholder="Ex: 15"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl p-2 text-xs font-black text-amber-300 text-center"
                    />
                  </div>
                </div>

                {/* Question Types Multi-selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    Types de Questions Souhaités :
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleQuestionType("single")}
                      className={`p-2 rounded-xl text-[10px] font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                        selectedQuestionTypes.includes("single")
                          ? "bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-xs"
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      <CircleDot size={13} className="shrink-0 text-indigo-400" />
                      <span className="truncate">QCM Choix Unique</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleQuestionType("multiple")}
                      className={`p-2 rounded-xl text-[10px] font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                        selectedQuestionTypes.includes("multiple")
                          ? "bg-amber-950/80 border-amber-400 text-amber-200 shadow-xs"
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      <CheckSquare size={13} className="shrink-0 text-amber-400" />
                      <span className="truncate">Choix Multiples</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleQuestionType("true_false")}
                      className={`p-2 rounded-xl text-[10px] font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                        selectedQuestionTypes.includes("true_false")
                          ? "bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-xs"
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                      <span className="truncate">Vrai / Faux</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleQuestionType("short_answer")}
                      className={`p-2 rounded-xl text-[10px] font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                        selectedQuestionTypes.includes("short_answer")
                          ? "bg-purple-950/80 border-purple-400 text-purple-200 shadow-xs"
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      <Edit3 size={13} className="shrink-0 text-purple-400" />
                      <span className="truncate">Réponse Courte / Texte</span>
                    </button>
                  </div>
                </div>

                {/* Multimedia option toggle */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <ImageIcon size={16} className="text-amber-400" />
                    <div>
                      <span className="font-bold text-[11px] text-white block">
                        Support Multimédia & Figures
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Associer des schémas, figures ou courbes mathématiques
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={quizIncludeMedia}
                    onChange={(e) => setQuizIncludeMedia(e.target.checked)}
                    className="w-4 h-4 text-amber-400 accent-amber-400 rounded cursor-pointer"
                  />
                </div>

                {/* Direct Launch Button */}
                <button
                  type="button"
                  disabled={isCopilotLoading}
                  onClick={() => handleSendCopilotMessage(quizCustomPrompt || undefined)}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center space-x-2 border border-amber-300 active:scale-95 disabled:opacity-60"
                >
                  {isCopilotLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-slate-950" />
                      <span>Génération & Rédaction IA en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Générer le Brouillon de Quiz ({quizQuestionCount} questions)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Interactive Chat Stream Card */}
              <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-md space-y-3 flex flex-col h-[480px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-black text-white text-xs flex items-center space-x-2">
                    <MessageSquare size={15} className="text-amber-400" />
                    <span>Dialogue & Instructions avec le Co-pilote</span>
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-emerald-400 font-black flex items-center space-x-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>IA Active</span>
                    </span>
                  </div>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs scrollbar-thin scrollbar-thumb-slate-700">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl max-w-[94%] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-[#1A237E] text-white rounded-br-none shadow-md font-medium border border-indigo-500/40"
                            : "bg-slate-950 text-slate-100 rounded-bl-none border border-slate-800 shadow-md font-medium"
                        }`}
                      >
                        <div className={msg.role === "assistant" ? "text-slate-100 font-medium" : "text-white"}>
                          <MathRenderer content={msg.content} />
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 px-1 mt-0.5 font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}

                  {isCopilotLoading && (
                    <div className="flex items-center space-x-2 text-amber-300 p-2.5 bg-slate-950 border border-amber-400/30 rounded-2xl shadow-xs">
                      <Loader2 size={14} className="animate-spin text-amber-400" />
                      <span className="text-[11px] font-bold text-slate-200">Le Co-pilote rédige le quiz avec rendu LaTeX...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input with LaTeX Toolbar */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold">Insérer formule :</span>
                    <LatexToolbar
                      onInsert={(code) => setInputChatText((prev) => prev + (prev ? " " : "") + code)}
                      targetInputRef={chatInputRef}
                      buttonSize="xs"
                    />
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendCopilotMessage();
                    }}
                    className="flex items-center space-x-2"
                  >
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={inputChatText}
                      onFocus={(e) => {
                        registerFocus(e, inputChatText, setInputChatText, "Dialogue avec le Co-pilote");
                        e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      onClick={(e) => {
                        registerFocus(e, inputChatText, setInputChatText, "Dialogue avec le Co-pilote");
                        e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      onChange={(e) => setInputChatText(e.target.value)}
                      placeholder="Ex: 'Ajoute 3 questions avec formules LaTeX', 'Modifie la question 2'..."
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoComplete="off"
                      inputMode={useVirtualKeyboardOnly ? "none" : undefined}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={isCopilotLoading || !inputChatText.trim()}
                      className="p-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl cursor-pointer disabled:opacity-40 transition-colors shrink-0 shadow"
                      title="Envoyer au Co-pilote IA"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Draft Preview & Validation Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Publication Success Banner */}
              {publishSuccessMessage && (
                <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl text-emerald-200 font-bold flex items-start space-x-3 shadow-md animate-in fade-in">
                  <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-black text-white leading-snug">
                      {publishSuccessMessage}
                    </p>
                    <p className="text-[11px] text-emerald-300">
                      Les résultats des élèves seront enregistrés et consultables dans l'onglet "Élèves".
                    </p>
                  </div>
                </div>
              )}

              {/* Draft Preview Container */}
              <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 shadow-md space-y-4 min-h-[580px] flex flex-col justify-between">
                {/* Draft Header & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 ${
                        publishedQuizId
                          ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                          : "bg-amber-400/10 text-amber-300 border border-amber-400/30"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${publishedQuizId ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                        <span>{publishedQuizId ? "Statut : Publié sur Supabase" : "Statut : Brouillon (Draft)"}</span>
                      </span>
                      {currentDraft && (
                        <span className="text-[11px] font-bold text-slate-400">
                          {currentDraft.questions?.length || 0} question(s)
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-white text-base mt-1 truncate">
                      {currentDraft?.title || "Prévisualisation du Brouillon de Quiz"}
                    </h4>
                  </div>

                  {currentDraft && (
                    <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={handleOpenDraftEditor}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
                        title="Modifier manuellement une question, une option ou une formule"
                      >
                        <Edit3 size={14} />
                        <span>✏️ Modifier le brouillon</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPublishing}
                        onClick={handlePublishQuizToSupabase}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5 border border-emerald-500/50 disabled:opacity-60 active:scale-95"
                        title="Enregistrer et publier sur Supabase"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Publication...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} />
                            <span>✅ Valider et Publier sur Supabase</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyDraftJson}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-700"
                        title="Copier le JSON du quiz"
                      >
                        {copiedDraft ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Draft Questions List or Empty State */}
                {!currentDraft ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                    <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center font-bold shadow-inner">
                      <Sparkles size={32} className="animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-slate-200 text-sm">
                        Aucun brouillon de quiz généré pour le moment
                      </h5>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Sélectionnez la classe et la matière à gauche puis cliquez sur <strong>"Générer le Brouillon"</strong> ou conversez directement avec le Co-pilote pour voir apparaître le quiz interactif ici !
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-700">
                    {/* Metadata Summary Banner */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 bg-indigo-900 text-white font-black rounded-lg text-[10px] border border-indigo-700">
                          {currentDraft.subject}
                        </span>
                        <span className="px-2.5 py-0.5 bg-slate-900 text-amber-300 font-black rounded-lg text-[10px] border border-slate-700">
                          {currentDraft.class_name}
                        </span>
                        <span className="font-bold text-slate-200">
                          {currentDraft.chapter}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 font-bold text-slate-400">
                        <Clock size={13} />
                        <span>{currentDraft.time_limit_minutes || quizDurationMinutes} min</span>
                      </div>
                    </div>

                    {/* Questions Stepper / Accordion List */}
                    {currentDraft.questions.map((q: any, idx: number) => {
                      const qType = q.type || (Array.isArray(q.correct_answers) && q.correct_answers.length > 1 ? "multiple" : "single");
                      const correctAnswers = Array.isArray(q.correct_answers) ? q.correct_answers : [0];

                      return (
                        <div
                          key={q.id || idx}
                          className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all hover:border-slate-700"
                        >
                          {/* Question Top Header */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg">
                              Question #{idx + 1}
                            </span>

                            <div className="flex items-center space-x-2">
                              {qType === "multiple" ? (
                                <span className="px-2.5 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-600/50 text-[10px] font-black rounded-lg flex items-center space-x-1">
                                  <CheckSquare size={12} className="text-amber-400" />
                                  <span>Choix Multiples</span>
                                </span>
                              ) : qType === "true_false" ? (
                                <span className="px-2.5 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-[10px] font-black rounded-lg flex items-center space-x-1">
                                  <CheckCircle2 size={12} className="text-emerald-400" />
                                  <span>Vrai / Faux</span>
                                </span>
                              ) : qType === "short_answer" ? (
                                <span className="px-2.5 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-600/50 text-[10px] font-black rounded-lg flex items-center space-x-1">
                                  <Edit3 size={12} className="text-purple-400" />
                                  <span>Réponse Courte</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-600/50 text-[10px] font-black rounded-lg flex items-center space-x-1">
                                  <CircleDot size={12} className="text-indigo-400" />
                                  <span>Choix Unique</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Question Statement with KaTeX */}
                          <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-white font-bold text-xs sm:text-sm leading-relaxed">
                            <MathRenderer content={q.question_text || q.question} />
                          </div>

                          {/* Question Image if present */}
                          {(q.image_url || q.imageUrl) && (
                            <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-center">
                              <img
                                src={q.image_url || q.imageUrl}
                                alt={`Illustration question #${idx + 1}`}
                                className="max-h-56 max-w-full object-contain rounded-lg shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Options List with LaTeX and correct answer badge */}
                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="space-y-1.5">
                              {q.options.map((opt: string, optIdx: number) => {
                                const isCorrect = correctAnswers.includes(optIdx) || correctAnswers.includes(opt);

                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                                      isCorrect
                                        ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-200 font-bold"
                                        : "bg-slate-900 border-slate-800 text-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                                      <span
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-[10px] shrink-0 ${
                                          isCorrect
                                            ? "bg-emerald-500 text-slate-950"
                                            : "bg-slate-800 text-slate-400"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <div className="leading-snug">
                                        <MathRenderer content={opt} />
                                      </div>
                                    </div>

                                    {isCorrect && (
                                      <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-md text-[10px] font-black shrink-0 flex items-center space-x-1">
                                        <Check size={11} />
                                        <span>Bonne Réponse</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Explanation with KaTeX */}
                          {q.explanation && (
                            <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/40 text-[11px] text-amber-200/90 leading-relaxed">
                              <span className="font-black text-amber-400 block mb-1">
                                💡 Explication pédagogique détaillée :
                              </span>
                              <MathRenderer content={q.explanation} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================================ */}
          {/* MODAL: INTERACTIVE DRAFT EDITOR (Modifier le Brouillon) */}
          {/* ============================================================================ */}
          {isEditingDraft && draftEditCopy && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-700 text-white overflow-hidden">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 text-white">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black">
                      <Edit3 size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-white">
                        Édition Manuelle du Brouillon de Quiz
                      </h3>
                      <p className="text-[11px] text-amber-300">
                        Modifiez les énoncés, propositions, bonnes réponses ou figures
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingDraft(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Form Content */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs scrollbar-thin scrollbar-thumb-slate-700">
                  {/* Title & Chapter settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Titre du Quiz
                      </label>
                      <input
                        type="text"
                        value={draftEditCopy.title}
                        onChange={(e) => setDraftEditCopy({ ...draftEditCopy, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Chapitre
                      </label>
                      <input
                        type="text"
                        value={draftEditCopy.chapter || ""}
                        onChange={(e) => setDraftEditCopy({ ...draftEditCopy, chapter: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 font-bold text-white"
                      />
                    </div>
                  </div>

                  {/* Questions List Editor */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="font-black text-white uppercase tracking-wider">
                        Questions du Quiz ({draftEditCopy.questions.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newQ = {
                            question_text: "Nouvelle question (support LaTeX $...$)",
                            type: "single" as QuestionType,
                            options: ["Proposition A", "Proposition B", "Proposition C", "Proposition D"],
                            correct_answers: [0],
                            explanation: "Explication de la réponse...",
                          };
                          setDraftEditCopy({
                            ...draftEditCopy,
                            questions: [...draftEditCopy.questions, newQ],
                          });
                        }}
                        className="px-3 py-1.5 bg-amber-400 text-slate-950 hover:bg-amber-300 font-black rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <PlusCircle size={14} />
                        <span>Ajouter une question</span>
                      </button>
                    </div>

                    {draftEditCopy.questions.map((q: any, qIdx: number) => (
                      <div
                        key={qIdx}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-amber-400">
                            Question #{qIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (draftEditCopy.questions.length <= 1) {
                                alert("Le quiz doit contenir au moins 1 question.");
                                return;
                              }
                              setDraftEditCopy({
                                ...draftEditCopy,
                                questions: draftEditCopy.questions.filter((_, idx) => idx !== qIdx),
                              });
                            }}
                            className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-lg cursor-pointer"
                            title="Supprimer cette question"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block font-bold text-slate-300">
                              Énoncé (support LaTeX $...$)
                            </label>
                            <LatexToolbar
                              onInsert={(code) => {
                                const copy = [...draftEditCopy.questions];
                                copy[qIdx].question_text = (copy[qIdx].question_text || "") + " " + code;
                                setDraftEditCopy({ ...draftEditCopy, questions: copy });
                              }}
                              buttonSize="xs"
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={q.question_text || (q as any).question || ""}
                            onChange={(e) => {
                              const copy = [...draftEditCopy.questions];
                              copy[qIdx].question_text = e.target.value;
                              setDraftEditCopy({ ...draftEditCopy, questions: copy });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 font-medium text-white"
                          />
                        </div>

                        {/* Image URL input */}
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            URL de l'image / figure géométrique (Optionnel)
                          </label>
                          <input
                            type="text"
                            value={q.image_url || (q as any).imageUrl || ""}
                            onChange={(e) => {
                              const copy = [...draftEditCopy.questions];
                              copy[qIdx].image_url = e.target.value || null;
                              setDraftEditCopy({ ...draftEditCopy, questions: copy });
                            }}
                            placeholder="https://... ou data:image/..."
                            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl p-2 font-mono text-xs text-white placeholder-slate-500"
                          />
                        </div>

                        {/* Options Editor */}
                        <div className="space-y-2">
                          <label className="block font-bold text-slate-300">
                            Propositions (Cliquez sur le bouton pour marquer la bonne réponse) :
                          </label>
                          {(q.options || []).map((opt: string, optIdx: number) => {
                            const isCorrect = (q.correct_answers || [0]).includes(optIdx);

                            return (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...draftEditCopy.questions];
                                    copy[qIdx].correct_answers = [optIdx];
                                    setDraftEditCopy({ ...draftEditCopy, questions: copy });
                                  }}
                                  className={`px-3 py-2 rounded-xl font-mono font-black text-xs cursor-pointer ${
                                    isCorrect
                                      ? "bg-emerald-500 text-slate-950 shadow-xs"
                                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                  }`}
                                  title="Marquer comme bonne réponse"
                                >
                                  {String.fromCharCode(65 + optIdx)} {isCorrect && "✓"}
                                </button>

                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const copy = [...draftEditCopy.questions];
                                    copy[qIdx].options[optIdx] = e.target.value;
                                    setDraftEditCopy({ ...draftEditCopy, questions: copy });
                                  }}
                                  className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl p-2 font-medium text-white"
                                />

                                <LatexToolbar
                                  onInsert={(code) => {
                                    const copy = [...draftEditCopy.questions];
                                    copy[qIdx].options[optIdx] = (copy[qIdx].options[optIdx] || "") + " " + code;
                                    setDraftEditCopy({ ...draftEditCopy, questions: copy });
                                  }}
                                  buttonSize="xs"
                                  showLabel={false}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block font-bold text-slate-300">
                              Explication détaillée (LaTeX)
                            </label>
                            <LatexToolbar
                              onInsert={(code) => {
                                const copy = [...draftEditCopy.questions];
                                copy[qIdx].explanation = (copy[qIdx].explanation || "") + " " + code;
                                setDraftEditCopy({ ...draftEditCopy, questions: copy });
                              }}
                              buttonSize="xs"
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={q.explanation || ""}
                            onChange={(e) => {
                              const copy = [...draftEditCopy.questions];
                              copy[qIdx].explanation = e.target.value;
                              setDraftEditCopy({ ...draftEditCopy, questions: copy });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl p-2 font-medium text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-800 flex items-center justify-end space-x-3 bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setIsEditingDraft(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraftEdits}
                    className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl shadow cursor-pointer flex items-center space-x-1.5 active:scale-95"
                  >
                    <Save size={15} />
                    <span>Enregistrer les modifications du brouillon</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* 2. EXERCISE & ANNOUNCEMENT GENERATOR TABS */}
      {/* ============================================================================ */}
      {activeTab !== "quiz_copilot" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Form Column (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/95 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-md text-white">
            <h4 className="font-black text-white text-sm flex items-center space-x-2 border-b border-slate-800 pb-2.5">
              <Sparkles className="text-amber-400" size={18} />
              <span>
                {activeTab === "course_generator" ? "Paramètres de Rédaction de Cours" : activeTab === "exercise" ? "Paramètres de l'Exercice Corrigé" : "Paramètres de l'Annonce"}
              </span>
            </h4>

            {activeTab === "course_generator" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Classe *
                  </label>
                  <select
                    value={courseLevel}
                    onChange={(e) => setCourseLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white"
                  >
                    {ALL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Matière *
                  </label>
                  <select
                    value={courseSubject}
                    onChange={(e) => setCourseSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white"
                  >
                    <option value="Mathématiques">Mathématiques 🧮</option>
                    <option value="Physique-Chimie">Physique-Chimie 🧪</option>
                    <option value="SVT">SVT 🧬</option>
                    <option value="Français">Français 📚</option>
                    <option value="Histoire-Géographie">Histoire-Géographie 🌍</option>
                    <option value="Anglais">Anglais 🇬🇧</option>
                    <option value="Philosophie">Philosophie 🎓</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Titres / Thème *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Ex: Équations du second degré, Dérivabilité..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Consignes / Instructions de rédaction *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={courseInstruction}
                    onChange={(e) => setCourseInstruction(e.target.value)}
                    placeholder="Saisissez les instructions pour orienter l'IA dans la rédaction du cours (ex: insistez sur tel théorème, ajoutez tels exemples...)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-500 resize-none"
                  />
                </div>
              </div>
            ) : activeTab === "exercise" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Matière *
                  </label>
                  <select
                    value={exSubject}
                    onChange={(e) => setExSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white"
                  >
                    <option value="Mathématiques">Mathématiques 🧮</option>
                    <option value="Physique-Chimie">Physique-Chimie 🧪</option>
                    <option value="SVT">SVT 🧬</option>
                    <option value="Français">Français 📚</option>
                    <option value="Histoire-Géographie">Histoire-Géographie 🌍</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Niveau Scolaire *
                  </label>
                  <select
                    value={exLevel}
                    onChange={(e) => setExLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white"
                  >
                    <option value="6ème">6ème</option>
                    <option value="5ème">5ème</option>
                    <option value="4ème">4ème</option>
                    <option value="3ème">3ème (Préparation BFEM)</option>
                    <option value="Seconde S">Seconde S</option>
                    <option value="Seconde L">Seconde L</option>
                    <option value="Première S1/S2">Première S1/S2</option>
                    <option value="Première L">Première L</option>
                    <option value="Terminale S1/S2">Terminale S1/S2 (Préparation BAC)</option>
                    <option value="Terminale L1/L2">Terminale L1/L2 (Préparation BAC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Chapitre / Thème de l'exercice *
                  </label>
                  <input
                    type="text"
                    value={exTopic}
                    onChange={(e) => setExTopic(e.target.value)}
                    placeholder="Ex: Équations différentielles, Optique géométrique..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Niveau de Difficulté
                  </label>
                  <select
                    value={exDifficulty}
                    onChange={(e) => setExDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white"
                  >
                    <option value="Initiation (Facile)">Initiation (Facile)</option>
                    <option value="Intermédiaire (Examens)">Intermédiaire (Examens)</option>
                    <option value="Avancé / Perfectionnement (Excellence)">Avancé / Perfectionnement (Excellence)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Catégorie d'Annonce *
                  </label>
                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white"
                  >
                    <option value="Rappel de Paiement / Mensualités">Rappel de Paiement / Mensualités</option>
                    <option value="Calendrier des Cours & Examens Blancs">Calendrier des Cours & Examens Blancs</option>
                    <option value="Offre Spéciale Pass VIP">Offre Spéciale Pass VIP</option>
                    <option value="Congés / Horaires de Vacances">Congés / Horaires de Vacances</option>
                    <option value="Félicitations et Récompenses">Félicitations et Récompenses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Public Cible
                  </label>
                  <input
                    type="text"
                    value={annAudience}
                    onChange={(e) => setAnnAudience(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1">
                    Sujet / Message Clé *
                  </label>
                  <textarea
                    rows={3}
                    value={annTopic}
                    onChange={(e) => setAnnTopic(e.target.value)}
                    placeholder="Ex: Échéance de paiement des cours du soir fixée au 5 du mois..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-500"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isGeneratingText}
              onClick={handleGenerateText}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center space-x-2 border border-amber-300 active:scale-95 disabled:opacity-60"
            >
              {isGeneratingText ? (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                  <span>Génération IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>
                    {activeTab === "course_generator" ? "Rédiger le Cours avec l'IA" : activeTab === "exercise" ? "Générer l'Exercice Corrigé" : "Rédiger l'Annonce avec l'IA"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Output Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 shadow-md space-y-3 min-h-[380px] flex flex-col justify-between text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="font-black text-white text-sm flex items-center space-x-2">
                  <FileText className="text-amber-400" size={18} />
                  <span>Résultat Généré par l'IA Gemini</span>
                </h4>

                {generatedTextResult && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTextResult);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2500);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1 border border-slate-700"
                    >
                      {copiedText ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedText ? "Copié !" : "Copier le texte"}</span>
                    </button>

                    {activeTab === "announcement" && (
                      <button
                        type="button"
                        disabled={isGeneratingText}
                        onClick={handleBroadcastAnnouncement}
                        className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <Megaphone size={14} />
                        <span>Diffuser comme Notification</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {announcementBroadcastSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-200 rounded-2xl font-bold flex items-center space-x-2 animate-in fade-in">
                  <Check size={18} className="text-emerald-400 shrink-0" />
                  <span>{announcementBroadcastSuccess}</span>
                </div>
              )}

              {!generatedTextResult && !isGeneratingText ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <Sparkles size={36} className="text-amber-400 animate-pulse" />
                  <p className="font-bold text-slate-200 text-sm">
                    Aucun contenu généré pour le moment.
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Renseignez les critères à gauche et cliquez sur "Générer" pour obtenir un énoncé d'exercice avec son corrigé ou une annonce officielle rédigée par l'IA.
                  </p>
                </div>
              ) : isGeneratingText ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <Loader2 size={32} className="animate-spin text-amber-400" />
                  <p className="font-extrabold text-slate-200 text-xs">
                    Analyse et rédaction en cours avec le modèle Gemini...
                  </p>
                </div>
              ) : (
                <div className="flex-1 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-100 font-sans whitespace-pre-wrap overflow-y-auto max-h-[420px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                  <MathRenderer content={generatedTextResult} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
