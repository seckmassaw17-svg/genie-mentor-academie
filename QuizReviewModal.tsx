import React from "react";
import { QuizResultRecord } from "../types";
import { X, CheckCircle2, XCircle, HelpCircle, Award, BookOpen, Clock, Calendar } from "lucide-react";
import { MathRenderer } from "./MathRenderer";

interface QuizReviewModalProps {
  result: QuizResultRecord | null;
  onClose: () => void;
}

export const QuizReviewModal: React.FC<QuizReviewModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const getStatusBadge = (score20: number) => {
    if (score20 >= 16) {
      return {
        label: "Excellente note",
        bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        icon: <Award size={14} className="text-emerald-600" />,
      };
    } else if (score20 >= 14) {
      return {
        label: "Très Bien",
        bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
        icon: <CheckCircle2 size={14} className="text-indigo-600" />,
      };
    } else if (score20 >= 10) {
      return {
        label: "Passable / Encourageant",
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        icon: <CheckCircle2 size={14} className="text-amber-600" />,
      };
    } else {
      return {
        label: "À réviser",
        bg: "bg-rose-50 text-rose-800 border-rose-200",
        icon: <XCircle size={14} className="text-rose-600" />,
      };
    }
  };

  const status = getStatusBadge(result.score20);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1A237E] to-indigo-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase mb-1">
              <span className="px-2 py-0.5 bg-white/15 rounded-md text-[10px]">{result.subject}</span>
              <span>• Classe de {result.level}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black truncate">{result.quizTitle}</h2>
            <div className="flex items-center space-x-3 text-indigo-200 text-xs mt-1 flex-wrap gap-y-1">
              <span className="flex items-center space-x-1">
                <Calendar size={12} />
                <span>Évalué le {result.date}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock size={12} />
                <span>{result.correctAnswers} / {result.totalQuestions} réponses correctes</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Score Summary Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-2xl bg-[#1A237E] text-amber-300 font-black text-lg flex flex-col items-center justify-center shadow-xs">
              <span>{result.score20}</span>
              <span className="text-[9px] text-indigo-200 -mt-1">/ 20</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-black border flex items-center space-x-1 ${status.bg}`}>
                  {status.icon}
                  <span>{status.label}</span>
                </span>
                <span className="text-xs font-extrabold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  {result.scorePercentage}% de réussite
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Apprenant : <strong className="text-slate-800">{result.studentName}</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 block">Détail des réponses :</span>
            <span className="text-xs font-black text-[#1A237E]">
              {result.questionReviews ? `${result.questionReviews.length} questions révisables` : "Synthèse de note"}
            </span>
          </div>
        </div>

        {/* Scrollable Questions & Detailed Corrections Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {result.questionReviews && result.questionReviews.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <BookOpen size={14} className="text-[#1A237E]" />
                <span>Correction détaillée étape par étape (support LaTeX) :</span>
              </h3>

              {result.questionReviews.map((rev, qIdx) => {
                return (
                  <div
                    key={rev.questionId || qIdx}
                    className={`rounded-2xl p-4 border transition-all ${
                      rev.isCorrect
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-rose-50/40 border-rose-200"
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-start space-x-2">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                            rev.isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {qIdx + 1}
                        </span>
                        <div className="font-extrabold text-sm text-slate-900 leading-snug">
                          <MathRenderer content={rev.question} />
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md shrink-0 flex items-center space-x-1 ${
                          rev.isCorrect
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {rev.isCorrect ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>Incorrect</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Question image if present */}
                    {(rev.image_url || rev.imageUrl) && (
                      <div className="mb-3 p-2 bg-white rounded-xl border border-slate-200 flex justify-center">
                        <img
                          src={rev.image_url || rev.imageUrl || ""}
                          alt={`Illustration Question #${qIdx + 1}`}
                          className="max-h-48 max-w-full object-contain rounded-lg"
                        />
                      </div>
                    )}

                    {/* Options list with highlight and LaTeX */}
                    <div className="space-y-1.5 mb-3">
                      {rev.options.map((opt, optIdx) => {
                        const isCorrectOption = optIdx === rev.correctIndex || (Array.isArray(rev.correctIndices) && rev.correctIndices.includes(optIdx));
                        const isUserOption = optIdx === rev.userAnswerIndex || (Array.isArray(rev.userAnswerIndices) && rev.userAnswerIndices.includes(optIdx));

                        let optStyles = "bg-white border-slate-200 text-slate-700";
                        let badge = null;

                        if (isCorrectOption) {
                          optStyles = "bg-emerald-100/80 border-emerald-400 text-emerald-950 font-bold";
                          badge = (
                            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0">
                              <CheckCircle2 size={10} />
                              <span>Bonne réponse</span>
                            </span>
                          );
                        } else if (isUserOption && !rev.isCorrect) {
                          optStyles = "bg-rose-100/80 border-rose-400 text-rose-950 font-bold";
                          badge = (
                            <span className="text-[10px] font-extrabold text-rose-800 bg-rose-200 px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0">
                              <XCircle size={10} />
                              <span>Votre réponse</span>
                            </span>
                          );
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${optStyles}`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-black/5 text-[11px] font-bold flex items-center justify-center shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <div className="truncate">
                                <MathRenderer content={opt} />
                              </div>
                            </div>
                            {badge}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {rev.explanation && (
                      <div className="p-3 bg-white/90 border border-indigo-100 rounded-xl text-xs text-slate-700 space-y-1">
                        <div className="flex items-center space-x-1.5 text-[#1A237E] font-bold text-[11px]">
                          <HelpCircle size={13} />
                          <span>Explication pédagogique :</span>
                        </div>
                        <div className="text-[11px] leading-relaxed text-slate-600 pl-4 border-l-2 border-[#1A237E]/40">
                          <MathRenderer content={rev.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Award size={36} className="mx-auto text-amber-500" />
              <h4 className="font-extrabold text-slate-800 text-sm">Évaluation enregistrée</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cette évaluation a été validée avec la note de <strong>{result.score20} / 20</strong> ({result.scorePercentage}%).
                Les détails individuels des questions seront disponibles pour tous les futurs tests complétés.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            Fermer la correction
          </button>
        </div>
      </div>
    </div>
  );
};

