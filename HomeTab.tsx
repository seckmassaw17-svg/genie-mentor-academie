import React, { useState } from "react";
import { UserProfile, Course, Quiz, PaymentTransaction } from "../types";
import { CONSEIL_DU_JOUR, ALL_LEVELS } from "../data/mockData";
import { getLocalAppConfig } from "../utils/versionUtils";
import { MarqueeText } from "./MarqueeText";
import { isUserAdmin } from "../utils/vipUtils";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight, 
  Users,
  Home,
  BookmarkCheck,
  Crown,
  FileCheck,
  Video,
  LogIn,
  Download,
  Smartphone,
  CheckCircle2,
  Lock,
  Code2,
  CreditCard
} from "lucide-react";

interface HomeTabProps {
  user: UserProfile | null;
  courses: Course[];
  quizzes: Quiz[];
  onSelectCourse: (course: Course) => void;
  onNavigateTab: (tab: "cours" | "evaluations" | "tuteur" | "tutoriels" | "vip" | "profil" | "exercices" | "devoirs" | "quiz" | "paiement", subTab?: any) => void;
  onTriggerSyncWorker: () => void;
  isSyncing: boolean;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  onOpenSavoirPlus?: () => void;
  onOpenVipModal?: () => void;
  onOpenInstall?: () => void;
  onOpenLogin?: () => void;
  onOpenLanding?: () => void;
  onOpenApkModal?: () => void;
  onOpenPortfolio?: () => void;
  onNavigateToPaiement?: (type: "renforcement" | "domicile") => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  user,
  courses,
  quizzes,
  onSelectCourse,
  onNavigateTab,
  onTriggerSyncWorker,
  isSyncing,
  onOpenReceipt,
  onOpenSavoirPlus,
  onOpenVipModal,
  onOpenInstall,
  onOpenLogin,
  onOpenLanding,
  onOpenApkModal,
  onOpenPortfolio,
  onNavigateToPaiement,
}) => {
  const appCfg = getLocalAppConfig();
  const roomRepo = RoomDatabaseRepository.getInstance();
  const [conseilIndex, setConseilIndex] = useState(() => Math.floor(Math.random() * CONSEIL_DU_JOUR.length));

  const handleSyncWithConseil = () => {
    setConseilIndex((prev) => (prev + 1) % CONSEIL_DU_JOUR.length);
    onTriggerSyncWorker();
  };

  const isAdmin = user ? (isUserAdmin(user) || !!user.isAdmin) : false;
  const userLevel = user?.level || "3ème";
  const [homeLevelFilter, setHomeLevelFilter] = useState<string>("ALL");

  // Recent courses for current user level
  const filteredHomeCourses = courses.filter((c) => {
    if (!isAdmin) return true;
    if (homeLevelFilter === "ALL") return true;
    return c.level === homeLevelFilter;
  });
  const recentCourses = filteredHomeCourses.slice(0, 3);

  return (
    <div className="space-y-5 pb-20">
      {/* Guest Mode Discovery Banner if not logged in */}
      {!user && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-amber-400/40 rounded-3xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 rounded-full">
                  Mode Invité Actif
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  Accès libre aux cours et exercices
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Explorez Génie Mentor Académie en toute liberté !
              </h2>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Consultez les leçons et épreuves. Créez un compte gratuit pour poser vos questions au Tuteur IA, sauvegarder vos notes et préparer les concours d'excellence.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <LogIn size={15} />
                <span>Se connecter</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenApkModal) onOpenApkModal();
                  else if (onOpenLanding) onOpenLanding();
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl border border-emerald-500 transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                title="Télécharger l'application GMA (PWA)"
              >
                <Smartphone size={14} className="text-white" />
                <span>Télécharger l'application GMA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Banner if configured */}
      {appCfg.announcementText && (
        <div className="bg-amber-400/90 text-[#1A237E] font-bold text-xs p-3 rounded-2xl shadow-xs border border-amber-300 flex items-center space-x-2 animate-in fade-in overflow-hidden">
          <Sparkles size={16} className="text-[#1A237E] shrink-0" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <MarqueeText
              text={appCfg.announcementText}
              className="font-black text-xs text-[#1A237E]"
            />
          </div>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-[#1A237E] to-indigo-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <GraduationCap size={160} />
        </div>

        {/* Bande dorée GMA avec animation Marquee fluide et bouton d'actualisation bien séparé */}
        <div className="relative z-10 flex items-center justify-between bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 px-3.5 py-1.5 sm:py-2 rounded-2xl mb-4 shadow-md border border-amber-300/80 gap-2.5 overflow-hidden">
          <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <MarqueeText
                text={`Génie Mentor Académie (GMA) • ${user?.displayName || "Mode Invité"} • ${user?.classe ? `Classe de ${user.classe}` : `Niveau ${userLevel}`}`}
                className="text-xs font-black tracking-wide text-[#1A237E]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncWithConseil}
            disabled={isSyncing}
            className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-90 text-[#1A237E] flex items-center justify-center shadow transition-all cursor-pointer border border-amber-200 shrink-0"
            title="Actualiser les données pédagogiques (cours, quiz, exercices, conseils)"
            aria-label="Actualiser les données pédagogiques"
          >
            <RefreshCw size={15} className={isSyncing ? "animate-spin text-[#1A237E]" : "text-[#1A237E]"} />
          </button>
        </div>

        <div className="flex items-start justify-between relative z-10">
          <div>
            <h2 className="text-2xl font-black text-white">
              Bonjour, {user?.prenom || (user?.displayName ? user.displayName.split(" ")[0] : "Invité")} ! 👋
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
              <span className="font-bold text-amber-300">
                {user?.fullName || user?.displayName || (user ? "Élève" : "Mode Invité")}
              </span>
              <span className="text-indigo-200">•</span>
              <p className="text-indigo-200">
                Classe active : <strong className="text-amber-300 font-bold">{user?.classe || userLevel}</strong>
              </p>
              <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>En direct Cloud</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats bar */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-indigo-800/80">
          <div className="bg-indigo-950/40 rounded-xl p-2.5 text-center border border-indigo-700/50">
            <span className="block text-xl font-black text-amber-300">{courses.length}</span>
            <span className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Cours {userLevel}</span>
          </div>

          <div className="bg-indigo-950/40 rounded-xl p-2.5 text-center border border-indigo-700/50">
            <span className="block text-xl font-black text-emerald-300">{quizzes.length}</span>
            <span className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Quiz QCM</span>
          </div>

          <div className="bg-indigo-950/40 rounded-xl p-2.5 text-center border border-indigo-700/50">
            <span className="block text-xl font-black text-indigo-200">
              {roomRepo.getAllTutorials().length}
            </span>
            <span className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Tutoriels</span>
          </div>
        </div>
      </div>

      {/* Conseil du Jour Card */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 shadow-xs relative">
        <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm mb-1">
          <BookmarkCheck size={18} className="text-amber-600" />
          <span>Conseil du jour (Massaw Seck)</span>
        </div>
        <p className="text-xs text-amber-950 leading-relaxed italic">
          "{CONSEIL_DU_JOUR[conseilIndex]}"
        </p>
      </div>

      {/* Quick Access Grid - 5 CARDS */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Accès Rapides</span>
          {user?.isVIP && (
            <span className="px-2 py-0.5 bg-amber-100 text-[#1A237E] font-black text-[10px] rounded-full border border-amber-300 flex items-center space-x-1">
              <Crown size={11} className="text-amber-500" />
              <span>GMA VIP Activé</span>
            </span>
          )}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card VIP: Concours & VIP */}
          <button
            onClick={() => onNavigateTab("vip")}
            className="p-3.5 sm:p-4 bg-gradient-to-br from-[#1A237E] via-indigo-900 to-slate-900 text-white rounded-2xl border-2 border-amber-400 shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-200 text-left group flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden col-span-1 sm:col-span-2 md:col-span-1"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-extrabold shadow group-hover:scale-110 transition-transform">
                <Crown size={20} />
              </div>
              <span className="px-2 py-0.5 bg-amber-400 text-[#1A237E] font-black text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                {user?.isVIP ? "VIP Actif" : "Concours"}
              </span>
            </div>
            <div>
              <p className="font-extrabold text-white text-xs sm:text-sm leading-tight flex items-center space-x-1">
                <span>Concours & VIP</span>
                <Sparkles size={12} className="text-amber-400 animate-pulse" />
              </p>
              <p className="text-[10px] sm:text-[11px] text-amber-200/90 truncate">
                Concours Général, BFEM, BAC
              </p>
            </div>
          </button>

          {/* Card 1: Mes Cours */}
          <button
            onClick={() => onNavigateTab("cours")}
            className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all duration-200 text-left group flex flex-col justify-between h-28 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#1A237E] flex items-center justify-center font-bold group-hover:bg-[#1A237E] group-hover:text-white group-hover:scale-110 transition-all">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-[#1A237E] leading-tight">
                Mes Cours
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                Filtrés pour la {userLevel}
              </p>
            </div>
          </button>

          {/* Card: Évaluations / Exercices */}
          <button
            onClick={() => onNavigateTab("evaluations", "quiz")}
            className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all duration-200 text-left group flex flex-col justify-between h-28 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#1A237E] flex items-center justify-center font-bold group-hover:bg-[#1A237E] group-hover:text-white group-hover:scale-110 transition-all">
              <FileCheck size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-[#1A237E] leading-tight">
                Exercices & Quiz
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                Quiz, Devoirs & Épreuves
              </p>
            </div>
          </button>

          {/* Card: Tutoriels Vidéos */}
          <button
            onClick={() => onNavigateTab("tutoriels")}
            className="p-3.5 sm:p-4 bg-gradient-to-br from-indigo-950 via-[#1A237E] to-slate-900 text-white rounded-2xl border border-indigo-500/40 hover:border-amber-400 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-200 text-left group flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs group-hover:scale-110 transition-transform">
                <Video size={20} />
              </div>
              <span className="px-2 py-0.5 bg-amber-400/90 text-slate-950 font-black text-[9px] rounded-full uppercase tracking-wider">
                Vidéos
              </span>
            </div>
            <div>
              <p className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-300 leading-tight">
                Tutoriels Vidéos
              </p>
              <p className="text-[10px] sm:text-[11px] text-indigo-200 truncate">
                Ressources & Corrigés
              </p>
            </div>
          </button>

          {/* Card: Paiement */}
          <button
            onClick={() => {
              if (onNavigateToPaiement) {
                onNavigateToPaiement("renforcement");
              } else {
                onNavigateTab("paiement");
              }
            }}
            className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all duration-200 text-left group flex flex-col justify-between h-28 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 transition-all">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-300 leading-tight">
                Paiement
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Renforcements & Domicile
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Derniers Cours au programme */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {isAdmin ? `Derniers Cours (${homeLevelFilter === "ALL" ? "Toutes les classes" : homeLevelFilter})` : `Derniers Cours (${userLevel})`}
          </h3>
          <button
            onClick={() => onNavigateTab("cours")}
            className="text-xs font-semibold text-[#1A237E] hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Tout voir</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Filtre de classes tactile rapide pour l'administrateur */}
        {isAdmin && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
            <button
              type="button"
              onClick={() => setHomeLevelFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                homeLevelFilter === "ALL"
                  ? "bg-[#1A237E] text-white shadow-md font-black"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Toutes les classes
            </button>
            {ALL_LEVELS.map((lvl) => {
              const isSelected = homeLevelFilter === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setHomeLevelFilter(lvl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? "bg-[#1A237E] text-white shadow-md font-black"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        )}

        {recentCourses.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
            <p className="text-xs text-slate-500">
              Aucun cours trouvé dans le cache Room local pour {homeLevelFilter === "ALL" ? "les classes" : homeLevelFilter}.
            </p>
            <button
              onClick={onTriggerSyncWorker}
              className="mt-3 text-xs bg-[#1A237E] text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer"
            >
              Exécuter SyncWorker
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {recentCourses.map((course, idx) => {
              const isLockedForGuest = !user && idx > 0;
              return (
                <div
                  key={course.id}
                  onClick={() => {
                    if (isLockedForGuest) {
                      if (onOpenLogin) onOpenLogin();
                      return;
                    }
                    onSelectCourse(course);
                  }}
                  className={`rounded-2xl p-3.5 border transition-all flex items-center justify-between cursor-pointer ${
                    isLockedForGuest
                      ? "bg-slate-50/90 border-slate-200 hover:border-amber-400"
                      : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
                  }`}
                >
                  <div className="space-y-1 pr-3 min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-indigo-50 text-[#1A237E] font-bold text-[10px] rounded-md border border-indigo-100 shrink-0">
                        {course.subject}
                      </span>
                      {!user && (
                        <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-md shrink-0 flex items-center space-x-1 ${
                          idx === 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}>
                          {idx === 0 ? "Aperçu 🔓" : "Verrouillé 🔒"}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-medium truncate">
                        {course.chapter}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1">
                      {course.title}
                    </h4>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    {isLockedForGuest ? <Lock size={16} className="text-amber-500" /> : <ArrowRight size={16} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Portfolio du Développement & Application PWA Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="flex items-center space-x-3 text-left w-full sm:w-auto">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black text-lg shadow-md shrink-0">
            <Code2 size={22} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-white flex items-center space-x-2">
              <span>Génie Mentor Académie • Excellence Scolaire</span>
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full">v2.5.0</span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Plateforme PWA & Dossier Technique de Développement. Conçu par Massaw Seck.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {onOpenPortfolio && (
            <button
              type="button"
              onClick={onOpenPortfolio}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md active:scale-95"
            >
              <Code2 size={15} />
              <span>Dossier Technique & Portfolio</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
