import React, { useState, useEffect } from "react";
import { Quiz, QuizQuestion, SecondaryLevel, Subject, QuestionType } from "../types";
import { ALL_LEVELS, getSubjectsForLevel, getLevelLabel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { uploadQuizImageToSupabase } from "../data/supabaseStorage";
import { MathRenderer, ensureMathDelimiters } from "./MathRenderer";
import { MathLiveEditor } from "./MathLiveEditor";
import { LatexToolbar } from "./LatexToolbar";
import { useVirtualLatexKeyboard } from "./VirtualLatexKeyboard";
import { scrollToTopGlobal } from "./ScrollToTop";
import { HelpCircle, X, Edit3, Save, Trash2, Plus, CheckSquare, CircleDot, Eye, EyeOff, Image as ImageIcon, Clock, Sparkles } from "lucide-react";

interface EditQuizModalProps {
  quiz: Quiz | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: Quiz) => void;
  onUpdateQuiz?: (updated: Quiz) => void;
}

export const EditQuizModal: React.FC<EditQuizModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onSave,
  onUpdateQuiz,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();

  const { registerFocus, useVirtualKeyboardOnly } = useVirtualLatexKeyboard();

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<SecondaryLevel>("3ème");
  const [subject, setSubject] = useState<Subject>("Maths");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [activeMathTarget, setActiveMathTarget] = useState<{ qIdx: number; field: "question" | "explanation" | number } | null>(null);
  const [showMathPreview, setShowMathPreview] = useState(true);

  // Duration state (compact minutes)
  const [durationMinutes, setDurationMinutes] = useState(15);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title);
      setLevel(quiz.level);
      setSubject(quiz.subject);

      // Parse quiz duration in minutes
      let mins = 15;
      if (quiz.durationMinutes && quiz.durationMinutes > 0) {
        mins = quiz.durationMinutes;
      } else if (quiz.duration_minutes && quiz.duration_minutes > 0) {
        mins = quiz.duration_minutes;
      } else if (quiz.durationSeconds && quiz.durationSeconds > 0) {
        mins = Math.ceil(quiz.durationSeconds / 60);
      } else if (quiz.duration) {
        const parsed = parseInt(quiz.duration, 10);
        if (!isNaN(parsed) && parsed > 0) mins = parsed;
      }
      setDurationMinutes(mins);

      setQuestions(
        JSON.parse(JSON.stringify(quiz.questions)).map((q: any) => ({
          ...q,
          type: q.type || (Array.isArray(q.correctIndices) && q.correctIndices.length > 1 ? "multiple" : "single"),
          correctIndices: Array.isArray(q.correctIndices) && q.correctIndices.length > 0
            ? q.correctIndices
            : [typeof q.correctIndex === "number" ? q.correctIndex : 0],
          correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        }))
      );
    }
  }, [quiz]);

  useEffect(() => {
    if (isOpen) {
      scrollToTopGlobal("instant");
    }
  }, [isOpen]);

  if (!isOpen || !quiz) return null;

  const handleUpdateQuestionText = (qIdx: number, text: string) => {
    const copy = [...questions];
    copy[qIdx].question = text;
    setQuestions(copy);
  };

  const handleUpdateExplanation = (qIdx: number, exp: string) => {
    const copy = [...questions];
    copy[qIdx].explanation = exp;
    setQuestions(copy);
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    const copy = [...questions];
    copy[qIdx].options[optIdx] = val;
    setQuestions(copy);
  };

  const handleToggleQuestionType = (qIdx: number, type: QuestionType) => {
    const copy = [...questions];
    copy[qIdx].type = type;
    if (type === "single") {
      const first = (copy[qIdx].correctIndices && copy[qIdx].correctIndices![0] !== undefined)
        ? copy[qIdx].correctIndices![0]
        : 0;
      copy[qIdx].correctIndex = first;
      copy[qIdx].correctIndices = [first];
    } else {
      if (!copy[qIdx].correctIndices || copy[qIdx].correctIndices!.length === 0) {
        copy[qIdx].correctIndices = [copy[qIdx].correctIndex || 0];
      }
    }
    setQuestions(copy);
  };

  const handleSetSingleCorrectIndex = (qIdx: number, optIdx: number) => {
    const copy = [...questions];
    copy[qIdx].correctIndex = optIdx;
    copy[qIdx].correctIndices = [optIdx];
    setQuestions(copy);
  };

  const handleToggleMultipleCorrectIndex = (qIdx: number, optIdx: number) => {
    const copy = [...questions];
    const current = copy[qIdx].correctIndices || [copy[qIdx].correctIndex || 0];
    let next: number[];
    if (current.includes(optIdx)) {
      if (current.length > 1) {
        next = current.filter((i) => i !== optIdx);
      } else {
        next = current; // Keep at least one answer
      }
    } else {
      next = [...current, optIdx].sort();
    }
    copy[qIdx].correctIndices = next;
    copy[qIdx].correctIndex = next[0];
    setQuestions(copy);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: "q_" + Date.now(),
        question: "Nouvelle question QCM (ex: Calculer $\\sqrt{16}$ ou $\\int_0^1 x dx$)...",
        type: "single",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: 0,
        correctIndices: [0],
        explanation: "Explication pédagogique de la réponse...",
      },
    ]);
  };

  const handleRemoveQuestion = (qIdx: number) => {
    if (questions.length <= 1) {
      alert("Un Quiz QCM doit contenir au moins 1 question.");
      return;
    }
    setQuestions(questions.filter((_, idx) => idx !== qIdx));
  };

  const getActiveMathTargetValue = (): string => {
    if (!activeMathTarget) return "";
    const { qIdx, field } = activeMathTarget;
    const q = questions[qIdx];
    if (!q) return "";
    if (field === "question") return q.question || "";
    if (field === "explanation") return q.explanation || "";
    if (typeof field === "number") return q.options[field] || "";
    return "";
  };

  const updateActiveMathTargetValue = (newVal: string) => {
    if (!activeMathTarget) return;
    const { qIdx, field } = activeMathTarget;
    setQuestions((prev) =>
      prev.map((item, i) => {
        if (i !== qIdx) return item;
        if (field === "question") return { ...item, question: newVal };
        if (field === "explanation") return { ...item, explanation: newVal };
        if (typeof field === "number") {
          const newOpts = [...item.options];
          newOpts[field] = newVal;
          return { ...item, options: newOpts };
        }
        return item;
      })
    );
  };

  const handleInsertMathSnippet = (snippet: string) => {
    if (!activeMathTarget) return;
    const { qIdx, field } = activeMathTarget;
    const copy = [...questions];
    if (field === "question") {
      copy[qIdx].question = (copy[qIdx].question || "") + (copy[qIdx].question ? " " : "") + snippet;
    } else if (field === "explanation") {
      copy[qIdx].explanation = (copy[qIdx].explanation || "") + (copy[qIdx].explanation ? " " : "") + snippet;
    } else if (typeof field === "number") {
      copy[qIdx].options[field] = (copy[qIdx].options[field] || "") + (copy[qIdx].options[field] ? " " : "") + snippet;
    }
    setQuestions(copy);
  };

  const handleQuestionImageUpload = async (qIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const publicUrl = await uploadQuizImageToSupabase(file);
      const finalUrl = publicUrl || URL.createObjectURL(file);
      const copy = [...questions];
      copy[qIdx].image_url = finalUrl;
      copy[qIdx].imageUrl = finalUrl;
      setQuestions(copy);
    } catch (err) {
      console.error("Error uploading image in EditQuizModal:", err);
      alert("Erreur lors de l'upload de l'image.");
    }
  };

  const handleRemoveQuestionImage = (qIdx: number) => {
    const copy = [...questions];
    copy[qIdx].image_url = null;
    copy[qIdx].imageUrl = undefined;
    setQuestions(copy);
  };

  const handleOptionImageUpload = async (qIdx: number, optIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const publicUrl = await uploadQuizImageToSupabase(file);
      const finalUrl = publicUrl || URL.createObjectURL(file);
      const copy = [...questions];
      const optImgs = [...(copy[qIdx].optionImages || copy[qIdx].option_images || [null, null, null, null])];
      optImgs[optIdx] = finalUrl;
      copy[qIdx].optionImages = optImgs;
      copy[qIdx].option_images = optImgs;
      setQuestions(copy);
    } catch (err) {
      console.error("Error uploading option image in EditQuizModal:", err);
      alert("Erreur lors de l'upload de l'image de cette option.");
    }
  };

  const handleRemoveOptionImage = (qIdx: number, optIdx: number) => {
    const copy = [...questions];
    const optImgs = [...(copy[qIdx].optionImages || copy[qIdx].option_images || [null, null, null, null])];
    optImgs[optIdx] = null;
    copy[qIdx].optionImages = optImgs;
    copy[qIdx].option_images = optImgs;
    setQuestions(copy);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || questions.length === 0) return;

    const minutesApprox = Math.max(1, durationMinutes || 15);
    const calculatedTotalSeconds = minutesApprox * 60;
    const formattedHHMMSS = `${Math.floor(minutesApprox / 60).toString().padStart(2, "0")} : ${(minutesApprox % 60).toString().padStart(2, "0")} : 00`;

    const updatedQuiz: Quiz = {
      ...quiz,
      title: title.trim(),
      level,
      subject,
      duration: `${minutesApprox}`,
      durationMinutes: minutesApprox,
      duration_minutes: minutesApprox,
      durationSeconds: calculatedTotalSeconds,
      durationFormatted: formattedHHMMSS,
      questions: questions.map((q) => ({
        ...q,
        question: ensureMathDelimiters(q.question.trim()),
        options: q.options.map((opt) => ensureMathDelimiters(opt.trim())),
        explanation: q.explanation ? ensureMathDelimiters(q.explanation.trim()) : "",
        type: q.type || "single",
        correctIndex: q.correctIndex !== undefined ? q.correctIndex : (q.correctIndices?.[0] || 0),
        correctIndices: q.correctIndices && q.correctIndices.length > 0 ? q.correctIndices : [q.correctIndex || 0],
        image_url: q.image_url || q.imageUrl || null,
        imageUrl: q.imageUrl || q.image_url || undefined,
        optionImages: q.optionImages || q.option_images || [null, null, null, null],
        option_images: q.option_images || q.optionImages || [null, null, null, null],
      })),
    };

    roomRepo.updateQuiz(updatedQuiz);
    if (onSave) onSave(updatedQuiz);
    if (onUpdateQuiz) onUpdateQuiz(updatedQuiz);
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Voulez-vous vraiment supprimer définitivement ce quiz ?")) {
      roomRepo.deleteQuiz(quiz.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="edit-quiz-modal-container bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#1A237E] text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit3 size={18} className="text-amber-300" />
            <h3 className="font-extrabold text-sm sm:text-base">
              Modifier le Quiz QCM (Chronomètre, Questions & LaTeX)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          <div>
            <label className="font-bold text-slate-800 block mb-1">Titre du Quiz QCM</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ color: "#000000" }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-black font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Classe / Niveau</label>
              <select
                value={level}
                onChange={(e) => {
                  const newLevel = e.target.value as SecondaryLevel;
                  setLevel(newLevel);
                  const validSubs = getSubjectsForLevel(newLevel);
                  if (!validSubs.includes(subject)) {
                    setSubject(validSubs[0]);
                  }
                }}
                style={{ color: "#000000" }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-black focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} style={{ color: "#000000" }}>
                    Classe de {getLevelLabel(lvl)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Matière</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                style={{ color: "#000000" }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-black focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {getSubjectsForLevel(level).map((sb) => (
                  <option key={sb} value={sb} style={{ color: "#000000" }}>{sb}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Durée (minutes)</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{ color: "#000000" }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-black focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="15"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold pointer-events-none">
                  min
                </span>
              </div>
            </div>
          </div>

          {/* PERMANENT DOCKED MathLive Unified Keyboard */}
          <div className="sticky top-0 z-30 space-y-2 shadow-lg bg-slate-900 border-2 border-indigo-500/60 rounded-2xl p-3 text-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-amber-300 flex items-center space-x-1.5 uppercase tracking-wide">
                <Sparkles size={14} className="text-amber-400" />
                <span>Clavier Unique MathLive WYSIWYG & Chimie</span>
              </span>
              <div className="flex items-center space-x-2">
                {activeMathTarget && (
                  <span className="text-[10px] bg-indigo-950 text-emerald-300 border border-indigo-700/80 px-2 py-0.5 rounded-lg font-black">
                    🎯 Cible : Q#{activeMathTarget.qIdx + 1} ({activeMathTarget.field === "question" ? "Énoncé" : activeMathTarget.field === "explanation" ? "Explication" : `Option ${(activeMathTarget.field as number) + 1}`})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowMathPreview(!showMathPreview)}
                  className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 cursor-pointer"
                >
                  {showMathPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span>{showMathPreview ? "Masquer prévisu" : "Afficher prévisu"}</span>
                </button>
              </div>
            </div>
            <MathLiveEditor
              value={getActiveMathTargetValue()}
              onChange={updateActiveMathTargetValue}
              placeholder="Écrivez ou cliquez sur les symboles visuels ci-dessus (ex: fraction, racine de x², molécule)..."
              helperText="Les symboles et combinaisons s'affichent directement sans code et se synchronisent en temps réel avec la question active."
              showPreview={false}
            />
          </div>

          {/* Questions Section */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                Édition des Questions ({questions.length}) :
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#1A237E] font-bold rounded-xl text-xs flex items-center space-x-1 border border-indigo-200 cursor-pointer"
              >
                <Plus size={14} />
                <span>Ajouter une Question</span>
              </button>
            </div>

            {questions.map((q, qIdx) => {
              const isMultiple = q.type === "multiple";
              const correctList = q.correctIndices || [q.correctIndex || 0];

              return (
                <div
                  key={q.id || qIdx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 relative group"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-[#1A237E] text-xs">
                        Question #{qIdx + 1}
                      </span>
                      {/* Type Toggle: Single vs Multiple */}
                      <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionType(qIdx, "single")}
                          className={`px-2 py-1 rounded-md font-bold transition-colors flex items-center space-x-1 ${
                            !isMultiple
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <CircleDot size={12} />
                          <span>Choix Unique</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionType(qIdx, "multiple")}
                          className={`px-2 py-1 rounded-md font-bold transition-colors flex items-center space-x-1 ${
                            isMultiple
                              ? "bg-amber-500 text-slate-950 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <CheckSquare size={12} />
                          <span>Choix Multiple</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors text-xs font-bold"
                    >
                      Supprimer question
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-800 text-xs">
                        Intitulé de la question (Support LaTeX $...$) :
                      </label>
                      <LatexToolbar
                        buttonSize="xs"
                        onInsert={(snippet) => {
                          const current = q.question || "";
                          const updated = current + (current ? " " : "") + snippet;
                          handleUpdateQuestionText(qIdx, updated);
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      required
                      value={q.question}
                      onFocus={(e) => {
                        setActiveMathTarget({ qIdx, field: "question" });
                        registerFocus(e, q.question, (val) => handleUpdateQuestionText(qIdx, val), `Énoncé Q#${qIdx + 1}`);
                        e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      onClick={(e) => {
                        setActiveMathTarget({ qIdx, field: "question" });
                        registerFocus(e, q.question, (val) => handleUpdateQuestionText(qIdx, val), `Énoncé Q#${qIdx + 1}`);
                        e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                      placeholder="Ex: Résoudre l'équation $\sqrt{x^2 + 1} = 2$..."
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoComplete="off"
                      inputMode={useVirtualKeyboardOnly ? "none" : undefined}
                      style={{ color: "#000000" }}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-black font-bold placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    {showMathPreview && q.question && (
                      <div className="mt-1 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs">
                        <span className="text-[10px] text-indigo-900 font-bold block mb-0.5">Aperçu Rendu Formule :</span>
                        <MathRenderer content={q.question} />
                      </div>
                    )}

                    {/* Optional Image / Figure for Question */}
                    <div className="mt-2">
                      {q.image_url || q.imageUrl ? (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 inline-block">
                          <div className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                            <ImageIcon size={13} className="text-indigo-600" />
                            <span>Figure / Illustration :</span>
                          </div>
                          <img
                            src={q.image_url || q.imageUrl || ""}
                            alt={`Figure question #${qIdx + 1}`}
                            className="max-h-40 max-w-xs object-contain rounded-lg border border-slate-200 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionImage(qIdx)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 cursor-pointer pt-1"
                          >
                            <Trash2 size={13} />
                            <span>Supprimer l'image</span>
                          </button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors">
                          <ImageIcon size={13} className="text-indigo-600" />
                          <span>+ Ajouter une image / figure</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) => handleQuestionImageUpload(qIdx, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 block text-[11px]">
                      Propositions & Réponses : {isMultiple ? "(Cochez les cases des bonnes réponses)" : "(Sélectionnez la seule bonne réponse)"}
                    </label>
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = isMultiple
                        ? correctList.includes(optIdx)
                        : q.correctIndex === optIdx;
                      const optImg = q.optionImages?.[optIdx] || q.option_images?.[optIdx];

                      return (
                        <div key={optIdx} className="space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center space-x-2">
                            {isMultiple ? (
                              <input
                                type="checkbox"
                                checked={isCorrect}
                                onChange={() => handleToggleMultipleCorrectIndex(qIdx, optIdx)}
                                className="w-4 h-4 text-amber-600 rounded cursor-pointer shrink-0"
                                title="Cocher si cette option est une bonne réponse"
                              />
                            ) : (
                              <input
                                type="radio"
                                name={`correct_${qIdx}`}
                                checked={isCorrect}
                                onChange={() => handleSetSingleCorrectIndex(qIdx, optIdx)}
                                className="w-4 h-4 text-[#1A237E] cursor-pointer shrink-0"
                                title="Sélectionner comme bonne réponse"
                              />
                            )}
                            <span className="font-mono font-bold text-slate-500 w-4 text-center">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <input
                              type="text"
                              required={!optImg}
                              value={opt}
                              onFocus={(e) => {
                                setActiveMathTarget({ qIdx, field: optIdx });
                                registerFocus(e, opt, (val) => handleUpdateOption(qIdx, optIdx, val), `Q#${qIdx + 1} - Option ${String.fromCharCode(65 + optIdx)}`);
                                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                              }}
                              onClick={(e) => {
                                setActiveMathTarget({ qIdx, field: optIdx });
                                registerFocus(e, opt, (val) => handleUpdateOption(qIdx, optIdx, val), `Q#${qIdx + 1} - Option ${String.fromCharCode(65 + optIdx)}`);
                                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                              }}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              placeholder={optImg ? `Option ${String.fromCharCode(65 + optIdx)} (Image jointe)` : `Option ${String.fromCharCode(65 + optIdx)}`}
                              autoCorrect="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              autoComplete="off"
                              inputMode={useVirtualKeyboardOnly ? "none" : undefined}
                              style={{ color: "#000000" }}
                              className={`flex-1 bg-white border rounded-xl p-2.5 text-xs text-black font-semibold placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 ${
                                isCorrect
                                  ? "border-emerald-500 font-bold bg-emerald-50/80 text-black"
                                  : "border-slate-300 text-black"
                              }`}
                            />
                            <LatexToolbar
                              buttonSize="xs"
                              showLabel={false}
                              onInsert={(snippet) => {
                                const current = opt || "";
                                const updated = current + (current ? " " : "") + snippet;
                                handleUpdateOption(qIdx, optIdx, updated);
                              }}
                            />
                            <label
                              className={`px-2 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0 transition-all border ${
                                optImg
                                  ? "bg-amber-100 text-amber-900 border-amber-300"
                                  : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                              title={`Joindre un schéma pour l'Option ${String.fromCharCode(65 + optIdx)}`}
                            >
                              <ImageIcon size={12} className={optImg ? "text-amber-600" : "text-slate-500"} />
                              <span>{optImg ? "Image ✓" : "+ Image"}</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={(e) => {
                                  handleOptionImageUpload(qIdx, optIdx, e);
                                  e.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {optImg && (
                            <div className="ml-6 flex items-center justify-between bg-white border border-amber-200 rounded-lg p-1.5 shadow-2xs">
                              <div className="flex items-center space-x-2">
                                <img
                                  src={optImg}
                                  alt={`Figure Option ${String.fromCharCode(65 + optIdx)}`}
                                  className="h-12 max-w-[120px] object-contain rounded border border-slate-200 bg-slate-50"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[11px] text-amber-900 font-semibold">
                                  Figure Option {String.fromCharCode(65 + optIdx)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionImage(qIdx, optIdx)}
                                className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center space-x-1 px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 size={12} />
                                <span>Supprimer</span>
                              </button>
                            </div>
                          )}

                          {showMathPreview && opt && (opt.includes("\\") || opt.includes("$")) && (
                            <div className="ml-8 p-1.5 bg-slate-100 rounded-lg text-xs">
                              <MathRenderer content={opt} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-800 text-xs">Explication pédagogique :</label>
                      <LatexToolbar
                        buttonSize="xs"
                        onInsert={(snippet) => {
                          const current = q.explanation || "";
                          const updated = current + (current ? " " : "") + snippet;
                          handleUpdateExplanation(qIdx, updated);
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      value={q.explanation || ""}
                      onFocus={() => setActiveMathTarget({ qIdx, field: "explanation" })}
                      onChange={(e) => handleUpdateExplanation(qIdx, e.target.value)}
                      style={{ color: "#000000" }}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-black font-semibold text-xs placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      placeholder="Pourquoi cette réponse est-elle correcte ? (Support formules mathématiques)"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-200">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-colors border border-rose-200 cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Supprimer le Quiz</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow transition-colors cursor-pointer"
              >
                <Save size={15} />
                <span>Enregistrer le Quiz</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
