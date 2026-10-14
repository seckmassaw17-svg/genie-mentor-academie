import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Edit3,
  Trash2,
  Clock,
  CheckSquare,
  CircleDot,
  RotateCcw,
  Save,
  BookOpen,
  HelpCircle,
  Zap,
  Plus,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Quiz, QuizQuestion, SecondaryLevel, Subject, QuestionType, QuizDraftPayload } from "../types";
import { ALL_LEVELS, getSubjectsForLevel, getLevelLabel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { saveQuizToSupabase, logAdminActionToSupabase } from "../data/supabaseStorage";
import { MathRenderer } from "./MathRenderer";
import { LatexToolbar } from "./LatexToolbar";
import { useVirtualLatexKeyboard } from "./VirtualLatexKeyboard";

interface AIQuizModifierModalProps {
  quiz: Quiz | null;
  isOpen: boolean;
  onClose: () => void;
  onQuizUpdated?: (updatedQuiz: Quiz) => void;
  adminEmail?: string;
  adminName?: string;
}

export const AIQuizModifierModal: React.FC<AIQuizModifierModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onQuizUpdated,
  adminEmail = "massperpendiculaire@gmail.com",
  adminName = "Massaw Seck (Admin)",
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const { registerFocus, useVirtualKeyboardOnly } = useVirtualLatexKeyboard();

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active modified draft state
  const [draft, setDraft] = useState<QuizDraftPayload | null>(null);
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  const [manualDraftEdit, setManualDraftEdit] = useState<QuizDraftPayload | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // References for focused text fields to insert LaTeX
  const questionInputRefs = useRef<{ [key: string]: HTMLTextAreaElement | HTMLInputElement | null }>({});

  // Initialize draft whenever quiz opens
  useEffect(() => {
    if (quiz) {
      const convertedQuestions = (quiz.questions || []).map((q, idx) => ({
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
        explanation: q.explanation || "Explication détaillée de la réponse.",
      }));

      const initialDraft: QuizDraftPayload = {
        title: quiz.title,
        class_name: quiz.level,
        subject: quiz.subject,
        chapter: quiz.chapter || "",
        time_limit_minutes:
          quiz.durationMinutes ||
          quiz.duration_minutes ||
          (quiz.durationSeconds ? Math.ceil(quiz.durationSeconds / 60) : 15),
        questions: convertedQuestions,
      };

      setDraft(initialDraft);
      setManualDraftEdit(JSON.parse(JSON.stringify(initialDraft)));
      setSuccessMessage(null);
      setErrorMessage(null);
      setPrompt("");
    }
  }, [quiz, isOpen]);

  if (!isOpen || !quiz || !draft) return null;

  // Apply quick instruction chips
  const handleQuickPreset = (instruction: string) => {
    setPrompt(instruction);
  };

  // Submit AI modification
  const handleSendModification = async (customText?: string) => {
    const textToSend = (customText || prompt).trim();
    if (!textToSend) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        prompt: `Voici le quiz existant intitulé "${draft.title}" (${draft.subject} - ${draft.class_name}).
INSTRUCTIONS DE MODIFICATION PAR L'ADMINISTRATEUR :
${textToSend}

Applique fidèlement toutes les modifications demandées sur le brouillon fourni ci-dessous, en conservant ou améliorant la structure JSON, le balisage LaTeX $...$ pour les formules mathématiques/scientifiques, et la rigueur pédagogique :
${JSON.stringify(draft, null, 2)}`,
        subject: draft.subject,
        className: draft.class_name,
        chapter: draft.chapter || quiz.chapter || "Général",
        questionCount: draft.questions.length,
        currentDraft: draft,
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

      if (data.draft && Array.isArray(data.draft.questions) && data.draft.questions.length > 0) {
        setDraft(data.draft);
        setManualDraftEdit(JSON.parse(JSON.stringify(data.draft)));
        setSuccessMessage("✨ Le Co-pilote IA a appliqué vos modifications avec succès ! Vous pouvez les prévisualiser ci-dessous.");
        setPrompt("");
      } else {
        throw new Error("L'IA n'a pas renvoyé de brouillon valide.");
      }

      await logAdminActionToSupabase(
        adminEmail,
        "QUIZ_AI_MODIFY",
        `Modification par IA du quiz "${quiz.title}" (${quiz.level}) : "${textToSend.slice(0, 60)}..."`
      );
    } catch (err: any) {
      console.error("[AI Modify Error]:", err);
      setErrorMessage(err.message || "Erreur lors de la modification par l'IA.");
    } finally {
      setIsLoading(false);
    }
  };

  // Save modified quiz to Supabase & RoomDatabase
  const handleSaveToSupabase = async () => {
    if (!draft || !draft.questions || draft.questions.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const now = Date.now();
      const durationMins = draft.time_limit_minutes || 15;

      const formattedQuestions: QuizQuestion[] = draft.questions.map((q, idx) => {
        const qType: QuestionType = q.type || (Array.isArray(q.correct_answers) && q.correct_answers.length > 1 ? "multiple" : "single");
        const correctAnswers = Array.isArray(q.correct_answers) ? q.correct_answers : [0];
        const numIndices = correctAnswers.filter((a) => typeof a === "number") as number[];

        return {
          id: quiz.questions[idx]?.id || `q_${quiz.id}_${idx + 1}`,
          question: q.question_text || `Question #${idx + 1}`,
          question_text: q.question_text || `Question #${idx + 1}`,
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Option 1", "Option 2"],
          type: qType,
          correct_answers: correctAnswers,
          correctIndex: numIndices.length > 0 ? numIndices[0] : 0,
          correctIndices: numIndices.length > 0 ? numIndices : [0],
          correctAnswerText: typeof correctAnswers[0] === "string" ? correctAnswers[0] : undefined,
          explanation: q.explanation || "Explication de la réponse.",
          imageUrl: q.image_url || null,
          image_url: q.image_url || null,
          mediaType: q.media_type || (q.image_url ? "image" : undefined),
          media_type: q.media_type || (q.image_url ? "image" : undefined),
        };
      });

      const updatedQuiz: Quiz = {
        ...quiz,
        title: draft.title || quiz.title,
        subject: (draft.subject as Subject) || quiz.subject,
        level: (draft.class_name as SecondaryLevel) || quiz.level,
        chapter: draft.chapter || quiz.chapter,
        questions: formattedQuestions,
        durationMinutes: durationMins,
        duration_minutes: durationMins,
        duration: String(durationMins),
        durationSeconds: durationMins * 60,
        durationFormatted: `${String(Math.floor(durationMins / 60)).padStart(2, "0")} : ${String(durationMins % 60).padStart(2, "0")} : 00`,
        status: "published",
        isDraft: false,
      };

      // 1. Update in Supabase
      await saveQuizToSupabase(updatedQuiz);

      // 2. Update in RoomDatabase
      roomRepo.updateQuiz(updatedQuiz);

      // 3. Callback
      if (onQuizUpdated) {
        onQuizUpdated(updatedQuiz);
      }

      await logAdminActionToSupabase(
        adminEmail,
        "QUIZ_UPDATE_CONFIRMED",
        `Validation et mise à jour sur Supabase du Quiz "${updatedQuiz.title}" (${updatedQuiz.level})`
      );

      setSuccessMessage("✅ Quiz mis à jour avec succès sur Supabase et disponible en direct pour les élèves !");
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error("[Save Updated Quiz Error]:", err);
      setErrorMessage(err.message || "Erreur lors de l'enregistrement sur Supabase.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-xs">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#1A237E] via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-amber-400/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-400 text-[#1A237E] rounded-2xl font-black shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">
                  Modifier ce Quiz avec l'IA
                </h3>
                <span className="px-2 py-0.5 bg-amber-400 text-[#1A237E] font-black text-[10px] rounded-full">
                  Co-pilote Gemini
                </span>
              </div>
              <p className="text-xs text-amber-300 font-bold">
                {quiz.title} • {quiz.subject} ({quiz.level})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Status Banners */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-200 font-bold flex items-center space-x-2.5 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-2xl text-rose-900 dark:text-rose-200 font-bold flex items-center space-x-2.5 animate-in fade-in">
              <X size={18} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Zap size={14} className="text-amber-500" />
              <span>Idées de modifications rapides :</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickPreset("Enrichis chaque question avec des explications méthodiques détaillées et des formules LaTeX précises.")}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#1A237E] font-bold rounded-xl border border-indigo-200 text-[10px] transition-colors cursor-pointer"
              >
                📐 Ajouter explications & formules LaTeX
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("Ajoute 2 nouvelles questions pertinentes sur ce chapitre pour approfondir l'évaluation.")}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-200 text-[10px] transition-colors cursor-pointer"
              >
                ➕ Ajouter 2 questions supplémentaires
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("Ajuste le temps limite à 10 minutes et rends les énoncés plus concis.")}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold rounded-xl border border-purple-200 text-[10px] transition-colors cursor-pointer"
              >
                ⏱️ Raccourcir le temps limite à 10 min
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("Transforme la question 1 en une question de type Vrai / Faux.")}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-xl border border-emerald-200 text-[10px] transition-colors cursor-pointer"
              >
                🔄 Convertir en Vrai / Faux
              </button>
            </div>
          </div>

          {/* Prompt Input Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center space-x-1.5">
                <Edit3 size={14} className="text-[#1A237E] dark:text-amber-400" />
                <span>Vos instructions de modification en langage naturel :</span>
              </label>
              <LatexToolbar
                onInsert={(code) => setPrompt((prev) => prev + (prev ? " " : "") + code)}
                buttonSize="xs"
              />
            </div>
            
            <div className="flex items-start space-x-2">
              <textarea
                rows={2}
                value={prompt}
                onFocus={(e) => {
                  registerFocus(e, prompt, setPrompt, "Instructions Co-pilote IA");
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                onClick={(e) => {
                  registerFocus(e, prompt, setPrompt, "Instructions Co-pilote IA");
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: 'Remplace la question 2 par un exercice sur les limites', 'Ajoute des étapes de calcul avec formules LaTeX', 'Modifie le titre pour inclure BFEM 2026'..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                autoComplete="off"
                inputMode={useVirtualKeyboardOnly ? "none" : undefined}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1A237E]"
              />
              <button
                type="button"
                disabled={isLoading || !prompt.trim()}
                onClick={() => handleSendModification()}
                className="px-4 py-3 bg-[#1A237E] hover:bg-indigo-900 text-amber-300 font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2 shrink-0 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-amber-300" />
                    <span className="hidden sm:inline">IA en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span className="hidden sm:inline">Appliquer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Draft Preview / Accordion of Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <h4 className="font-black text-slate-900 dark:text-white text-xs flex items-center space-x-1.5">
                  <BookOpen size={15} className="text-[#1A237E] dark:text-amber-400" />
                  <span>Aperçu du Quiz Révisé ({draft.questions.length} questions)</span>
                </h4>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-bold text-[10px]">
                  {draft.time_limit_minutes || 15} min
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsManualEditOpen(!isManualEditOpen)}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Edit3 size={12} />
                  <span>{isManualEditOpen ? "Fermer l'éditeur manuel" : "Édition manuelle"}</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {draft.questions.map((q, idx) => {
                const qType = q.type || (Array.isArray(q.correct_answers) && q.correct_answers.length > 1 ? "multiple" : "single");
                const correctAnswers = Array.isArray(q.correct_answers) ? q.correct_answers : [0];

                return (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-[#1A237E] text-amber-300 font-black text-[10px] rounded-md">
                          Question #{idx + 1}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {qType === "multiple" ? "Choix Multiples" : qType === "true_false" ? "Vrai / Faux" : "Choix Unique"}
                        </span>
                      </div>

                      {isManualEditOpen && (
                        <LatexToolbar
                          onInsert={(code) => {
                            const copy = { ...draft };
                            copy.questions[idx].question_text = (copy.questions[idx].question_text || "") + " " + code;
                            setDraft(copy);
                          }}
                          buttonSize="xs"
                        />
                      )}
                    </div>

                    {/* Question Text with KaTeX */}
                    {isManualEditOpen ? (
                      <textarea
                        rows={2}
                        value={q.question_text}
                        onChange={(e) => {
                          const copy = { ...draft };
                          copy.questions[idx].question_text = e.target.value;
                          setDraft(copy);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium"
                      />
                    ) : (
                      <div className="text-slate-900 dark:text-slate-100 font-bold text-xs leading-relaxed">
                        <MathRenderer content={q.question_text} />
                      </div>
                    )}

                    {/* Options list */}
                    <div className="space-y-1.5 pt-1">
                      {q.options?.map((opt, optIdx) => {
                        const isCorrect = correctAnswers.includes(optIdx) || correctAnswers.includes(opt);
                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                              isCorrect
                                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-950 dark:text-emerald-200 font-bold"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                              <span className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <div className="truncate flex-1">
                                <MathRenderer content={opt} />
                              </div>
                            </div>
                            {isCorrect && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-black flex items-center space-x-1 shrink-0">
                                <CheckCircle2 size={12} />
                                <span>Correcte</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-2 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                        <span className="font-extrabold text-[#1A237E] dark:text-amber-400 block text-[10px]">
                          💡 Explication pédagogique :
                        </span>
                        <MathRenderer content={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl cursor-pointer transition-colors"
          >
            Annuler
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSaving || isLoading}
              onClick={handleSaveToSupabase}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Enregistrement sur Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>✅ Valider et Mettre à Jour sur Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
