import React, { useState, useEffect } from "react";
import { UserProfile, Quiz, Asset, SecondaryLevel } from "../types";
import { ALL_LEVELS, normalizeLevel } from "../data/mockData";
import { QuizTab } from "./QuizTab";
import { HomeworkTab } from "./HomeworkTab";
import { ExercisesTab } from "./ExercisesTab";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { isUserAdmin } from "../utils/vipUtils";
import { scrollToTopGlobal } from "./ScrollToTop";
import { 
  HelpCircle, 
  FileCheck, 
  FileText, 
  GraduationCap,
  Lock,
  LogIn
} from "lucide-react";

export type EvaluationsSubTab = "quiz" | "devoirs" | "exercices";

interface EvaluationsTabProps {
  user: UserProfile | null;
  quizzes: Quiz[];
  assets: Asset[];
  initialSubTab?: EvaluationsSubTab;
  onToggleCacheAsset: (assetId: string) => void;
  onOpenLogin?: () => void;
}

export const EvaluationsTab: React.FC<EvaluationsTabProps> = ({
  user,
  quizzes,
  assets,
  initialSubTab = "quiz",
  onToggleCacheAsset,
  onOpenLogin,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const [activeSubTab, setActiveSubTab] = useState<EvaluationsSubTab>(initialSubTab);

  const isAdmin = user ? (isUserAdmin(user) || !!user.isAdmin) : false;
  const [selectedLevel, setSelectedLevel] = useState<SecondaryLevel | "ALL">(isAdmin ? "ALL" : (user?.level || "3ème"));
  const activeLevel = isAdmin ? selectedLevel : (user?.level || selectedLevel || "3ème");

  // Synchroniser automatiquement la classe active si le niveau de l'élève est modifié
  useEffect(() => {
    if (!isAdmin && user?.level) {
      setSelectedLevel(user.level);
    }
  }, [user?.level, isAdmin]);

  // Synchronize when initialSubTab changes from external navigation (e.g. from Course)
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Réinitialisation immédiate du défilement au sommet lors des changements d'onglets d'évaluation
  useEffect(() => {
    scrollToTopGlobal("instant");
  }, [activeSubTab, selectedLevel]);

  // Statistics calculation for badges based on activeLevel
  const levelQuizzesCount = (isAdmin && activeLevel === "ALL" 
    ? quizzes 
    : quizzes.filter((q) => q.level === activeLevel || normalizeLevel(q.level) === normalizeLevel(activeLevel))
  ).length;
  const userHomeworksCount = user ? roomRepo.getHomeworksByUser(user.uid).length : 0;
  const exercisesCount = assets.filter((a) => {
    const lvl = (a.level || "").toString();
    const matchesLevel = (isAdmin && activeLevel === "ALL") || lvl === activeLevel || normalizeLevel(lvl) === normalizeLevel(activeLevel);
    return matchesLevel || a.category === "exercice";
  }).length;

  if (!user) {
    return (
      <div className="h-full min-h-[60vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans max-w-xl mx-auto my-auto animate-in fade-in duration-300">
        <div
          onClick={onOpenLogin}
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 space-y-5 w-full cursor-pointer hover:border-amber-400 transition-all group"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto text-[#1A237E] shadow-inner relative group-hover:scale-105 transition-transform">
            <FileText size={36} className="text-[#1A237E]" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
              <Lock size={13} />
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 rounded-full border border-amber-300">
              Espace Verrouillé 🔒
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Exercices, Quiz QCM & Devoirs
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              L'accès aux exercices d'application, fiches d'épreuves et quiz chronométrés est réservé aux élèves connectés. Connectez-vous gratuitement pour vous entraîner et mesurer vos progrès.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-400/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              <LogIn size={18} />
              <span>Se connecter pour débloquer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-3 pb-24 min-w-0 animate-in fade-in duration-200">
      {/* Top Tab Bar (3 Sub-sections: Quiz, Devoirs, Exercices) */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center justify-between gap-1 shadow-xs border border-slate-200/80">
        {/* Sub-tab 1: Quiz QCM */}
        <button
          type="button"
          onClick={() => setActiveSubTab("quiz")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-w-0 ${
            activeSubTab === "quiz"
              ? "bg-[#1A237E] text-white shadow-md scale-[1.01]"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <HelpCircle size={16} className={activeSubTab === "quiz" ? "text-amber-300 shrink-0" : "shrink-0"} />
          <span className="truncate">Quiz QCM</span>
          {levelQuizzesCount > 0 && (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                activeSubTab === "quiz"
                  ? "bg-amber-400 text-[#1A237E]"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {levelQuizzesCount}
            </span>
          )}
        </button>

        {/* Sub-tab 2: Devoirs / TD */}
        <button
          type="button"
          onClick={() => setActiveSubTab("devoirs")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-w-0 ${
            activeSubTab === "devoirs"
              ? "bg-[#1A237E] text-white shadow-md scale-[1.01]"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <FileCheck size={16} className={activeSubTab === "devoirs" ? "text-amber-300 shrink-0" : "shrink-0"} />
          <span className="truncate">Devoirs / TD</span>
          {userHomeworksCount > 0 && (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                activeSubTab === "devoirs"
                  ? "bg-emerald-400 text-slate-900"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {userHomeworksCount}
            </span>
          )}
        </button>

        {/* Sub-tab 3: Exercices */}
        <button
          type="button"
          onClick={() => setActiveSubTab("exercices")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-w-0 ${
            activeSubTab === "exercices"
              ? "bg-[#1A237E] text-white shadow-md scale-[1.01]"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <FileText size={16} className={activeSubTab === "exercices" ? "text-amber-300 shrink-0" : "shrink-0"} />
          <span className="truncate">Exercices</span>
          {exercisesCount > 0 && (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                activeSubTab === "exercices"
                  ? "bg-amber-400 text-[#1A237E]"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {exercisesCount}
            </span>
          )}
        </button>
      </div>

      {/* FILTRE VISUEL DE CLASSES DÉFILANT (RÉSERVÉ À L'ADMINISTRATION) */}
      {isAdmin && (
        <div className="space-y-2 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-700 flex items-center space-x-1.5">
              <GraduationCap size={15} className="text-[#1A237E]" />
              <span>Filtrer par Classe (Vue Administrateur) :</span>
            </label>
            <div className="text-[11px] font-bold text-slate-500 flex items-center space-x-1.5">
              {selectedLevel !== "ALL" ? (
                <span>Classe active : <span className="text-[#1A237E] font-black">{selectedLevel}</span></span>
              ) : (
                <span className="text-[#1A237E] font-black">Toutes les classes</span>
              )}
            </div>
          </div>

          {/* Horizontal scrollable class selector pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-300">
            <button
              type="button"
              onClick={() => setSelectedLevel("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedLevel === "ALL"
                  ? "bg-[#1A237E] text-white shadow-md font-black ring-2 ring-[#1A237E]/20"
                  : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              Toutes les classes
            </button>

            {ALL_LEVELS.map((lvl) => {
              const isSelected = normalizeLevel(lvl) === normalizeLevel(selectedLevel);
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center space-x-1.5 ${
                    isSelected
                      ? "bg-[#1A237E] text-white shadow-md font-black ring-2 ring-[#1A237E]/20"
                      : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span>{lvl}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-view Content */}
      <div className="min-w-0 w-full">
        {activeSubTab === "quiz" && (
          <div className="animate-in fade-in duration-150">
            <QuizTab
              userLevel={user?.level || "3ème"}
              quizzes={quizzes}
              isAdmin={isAdmin}
              initialSelectedLevel={activeLevel}
            />
          </div>
        )}

        {activeSubTab === "devoirs" && (
          <div className="animate-in fade-in duration-150">
            <HomeworkTab user={user} onOpenLogin={onOpenLogin} />
          </div>
        )}

        {activeSubTab === "exercices" && (
          <div className="animate-in fade-in duration-150">
            <ExercisesTab
              userLevel={user?.level || "3ème"}
              assets={assets}
              onToggleCacheAsset={onToggleCacheAsset}
              isAdmin={isAdmin}
              isVIP={Boolean(user?.isVIP)}
              userUid={user?.uid || "guest"}
              userName={user?.displayName || "Invité"}
              userPhone={user?.phoneNumber || ""}
              selectedLevel={activeLevel}
            />
          </div>
        )}
      </div>
    </div>
  );
};
