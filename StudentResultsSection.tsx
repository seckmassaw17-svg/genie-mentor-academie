import React, { useState, useEffect } from "react";
import { UserProfile, QuizResultRecord, Subject } from "../types";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { subscribeToUserQuizResultsSupabase } from "../data/supabaseStorage";
import { QuizReviewModal } from "./QuizReviewModal";
import { 
  GraduationCap, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  FileCheck, 
  Filter, 
  AlertCircle,
  Eye,
  Sparkles,
  ChevronRight,
  Calculator,
  Atom,
  Compass,
  BookMarked,
  Globe2,
  Languages
} from "lucide-react";

interface StudentResultsSectionProps {
  user: UserProfile;
}

export const StudentResultsSection: React.FC<StudentResultsSectionProps> = ({ user }) => {
  const roomRepo = RoomDatabaseRepository.getInstance();

  const [results, setResults] = useState<QuizResultRecord[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [selectedResultForReview, setSelectedResultForReview] = useState<QuizResultRecord | null>(null);

  // Load results from Room and subscribe to Firestore sync
  useEffect(() => {
    const loadFromRoom = () => {
      const studentResults = roomRepo.getQuizResultsByStudent(user.uid);
      setResults(studentResults);
    };

    loadFromRoom();

    const unsubRoom = roomRepo.subscribe(loadFromRoom);

    // Subscribe to Supabase real-time user evaluations
    const unsubSupabase = subscribeToUserQuizResultsSupabase(user.uid, (remoteResults) => {
      if (remoteResults && remoteResults.length > 0) {
        remoteResults.forEach((res) => {
          roomRepo.addQuizResult(user.uid, res);
        });
        setResults(remoteResults);
      }
    });

    return () => {
      unsubRoom();
      unsubSupabase();
    };
  }, [user.uid, user.email]);

  // Calculations for Synthesis Card
  const totalCount = results.length;
  
  const average20 = totalCount > 0
    ? Math.round((results.reduce((acc, r) => acc + (r.score20 || (r.scorePercentage / 5)), 0) / totalCount) * 10) / 10
    : 0;

  const averagePct = totalCount > 0
    ? Math.round(results.reduce((acc, r) => acc + r.scorePercentage, 0) / totalCount)
    : 0;

  const passedCount = results.filter((r) => (r.score20 || 0) >= 10 || r.scorePercentage >= 50).length;
  const successRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  // Filtered results
  const filteredResults = results.filter((r) => {
    if (selectedSubjectFilter === "ALL") return true;
    return r.subject === selectedSubjectFilter;
  });

  // Extract unique subjects from student's evaluations for filter tabs
  const availableSubjectsInResults = Array.from(new Set(results.map((r) => r.subject)));

  // Subject icon helper
  const getSubjectIcon = (subj: Subject | string) => {
    switch (subj) {
      case "Maths":
        return <Calculator size={15} className="text-[#1A237E]" />;
      case "Physique-Chimie":
        return <Atom size={15} className="text-[#1A237E]" />;
      case "SVT":
        return <Compass size={15} className="text-[#1A237E]" />;
      case "Français":
        return <BookMarked size={15} className="text-[#1A237E]" />;
      case "Histoire-Géo":
        return <Globe2 size={15} className="text-[#1A237E]" />;
      case "Anglais":
        return <Languages size={15} className="text-[#1A237E]" />;
      case "Philo":
        return <GraduationCap size={15} className="text-[#1A237E]" />;
      default:
        return <BookOpen size={15} className="text-[#1A237E]" />;
    }
  };

  // Status badge helper based on note /20
  const getStatusBadge = (score20: number) => {
    if (score20 >= 16) {
      return {
        label: "Excellente note",
        bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dot: "bg-emerald-500",
      };
    } else if (score20 >= 14) {
      return {
        label: "Très Bien",
        bg: "bg-indigo-50 text-[#1A237E] border-indigo-200",
        dot: "bg-indigo-500",
      };
    } else if (score20 >= 10) {
      return {
        label: "Passable / Encourageant",
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
      };
    } else {
      return {
        label: "À réviser",
        bg: "bg-rose-50 text-rose-800 border-rose-200",
        dot: "bg-rose-500",
      };
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-900 text-amber-300 flex items-center justify-center font-black shadow-xs">
            <Award size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Mes Résultats & Suivi des Notes
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Historique des évaluations de {user.displayName} (Classe de {user.level})
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-indigo-50 text-[#1A237E] font-extrabold text-xs rounded-full border border-indigo-200">
          {totalCount} test{totalCount > 1 ? "s" : ""} enregistré{totalCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* 1. SYNTHÈSE STATISTIQUE GLOBALE (EN HAUT DE PAGE) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Moyenne Globale */}
        <div className="bg-gradient-to-br from-indigo-900 to-[#1A237E] text-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
              Moyenne Globale
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
              <TrendingUp size={15} />
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                {totalCount > 0 ? average20.toFixed(1) : "--"}
              </span>
              <span className="text-xs text-indigo-200 font-bold">/ 20</span>
            </div>
            <p className="text-[10px] text-indigo-200 mt-0.5">
              {totalCount > 0 ? `Équivaut à ${averagePct}% de réussite générale` : "Aucune évaluation validée"}
            </p>
          </div>
        </div>

        {/* Total Évaluations */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tests Réalisés
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-[#1A237E] flex items-center justify-center">
              <FileCheck size={15} />
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {totalCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">évaluation(s)</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Enregistrées en BDD Room & Firebase
            </p>
          </div>
        </div>

        {/* Taux de Réussite & Mentions */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Taux de Réussite
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                {totalCount > 0 ? `${successRate}%` : "--"}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({passedCount}/{totalCount})
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Notes supérieures ou égales à 10/20
            </p>
          </div>
        </div>
      </div>

      {/* 2. SYSTÈME DE FILTRE PAR MATIÈRE */}
      {totalCount > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-700 flex items-center space-x-1.5">
              <Filter size={13} className="text-[#1A237E]" />
              <span>Filtrer les notes par matière :</span>
            </span>
            <span className="text-[11px] text-slate-500">
              {filteredResults.length} résultat{filteredResults.length > 1 ? "s" : ""} affiché{filteredResults.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setSelectedSubjectFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubjectFilter === "ALL"
                  ? "bg-[#1A237E] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Toutes ({totalCount})
            </button>

            {availableSubjectsInResults.map((subj) => {
              const subjCount = results.filter((r) => r.subject === subj).length;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(subj)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                    selectedSubjectFilter === subj
                      ? "bg-[#1A237E] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{subj}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedSubjectFilter === subj ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {subjCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. LISTE DE L'HISTORIQUE DES NOTES */}
      <div className="space-y-2.5">
        {results.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#1A237E] flex items-center justify-center mx-auto">
              <BookOpen size={24} />
            </div>
            <h4 className="font-extrabold text-slate-800 text-sm">Aucune évaluation réalisée</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Vous n'avez pas encore passé de test QCM. Rendez-vous dans l'onglet <strong>Évaluations → Quiz QCM</strong> pour tester vos connaissances et enregistrer vos premières notes !
            </p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <AlertCircle size={20} className="mx-auto text-slate-400" />
            <p className="text-xs font-bold text-slate-700">Aucune note pour {selectedSubjectFilter}</p>
            <p className="text-[11px] text-slate-500">Sélectionnez une autre matière ou "Toutes".</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredResults.map((result) => {
              const status = getStatusBadge(result.score20);
              return (
                <div
                  key={result.id}
                  className="bg-slate-50/90 hover:bg-indigo-50/30 rounded-2xl p-3.5 border border-slate-200 hover:border-indigo-200 transition-all space-y-2.5 text-xs shadow-2xs"
                >
                  {/* Card Header: Subject, Level, Date & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="px-2.5 py-0.5 bg-white border border-indigo-200 text-[#1A237E] font-black rounded-lg text-[11px] flex items-center space-x-1 shadow-2xs">
                        {getSubjectIcon(result.subject)}
                        <span>{result.subject}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        Classe de {result.level}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <Clock size={11} />
                        <span>{result.date}</span>
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center space-x-1 shrink-0 ${status.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                      <span>{status.label}</span>
                    </span>
                  </div>

                  {/* Title & Score Ribbon */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate leading-snug">
                        {result.quizTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {result.correctAnswers} / {result.totalQuestions} questions correctes ({result.scorePercentage}%)
                      </p>
                    </div>

                    {/* Score display */}
                    <div className="text-right shrink-0">
                      <div className="px-3 py-1 bg-white border border-indigo-200 rounded-xl shadow-2xs">
                        <span className="text-base font-black text-[#1A237E] leading-none">
                          {result.score20}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-0.5">/ 20</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button: Voir le détail / Correction */}
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Identifiant élève : <span className="font-mono text-slate-600">{user.uid.slice(0, 8)}...</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedResultForReview(result)}
                      className="px-3 py-1.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Voir le détail / Correction</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MODAL DE RÉVISION ET CORRECTION DÉTAILLÉE */}
      {selectedResultForReview && (
        <QuizReviewModal
          result={selectedResultForReview}
          onClose={() => setSelectedResultForReview(null)}
        />
      )}
    </div>
  );
};
