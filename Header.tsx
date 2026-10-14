import React from "react";
import { UserProfile } from "../types";
import { 
  GraduationCap, 
  ShieldCheck, 
  ArrowLeft, 
  Home, 
  BookOpen, 
  FileCheck, 
  Sparkles, 
  User, 
  LogIn, 
  Download,
  Smartphone,
  Code2
} from "lucide-react";
import { AppLogo } from "./AppLogo";
import { NotificationBell } from "./NotificationBell";
import { isUserAdmin } from "../utils/vipUtils";
import { getLevelLabel } from "../data/mockData";
import { useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  user: UserProfile | null;
  unreadNotifCount?: number;
  onOpenNotifications?: () => void;
  onOpenShare?: () => void;
  onOpenLogin?: () => void;
  onOpenLanding?: () => void;
  onOpenApkModal?: () => void;
  onOpenPortfolio?: () => void;
  isSyncing?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  unreadNotifCount = 0,
  onOpenNotifications,
  onOpenShare,
  onOpenLogin,
  onOpenLanding,
  onOpenApkModal,
  onOpenPortfolio,
  isSyncing = false,
  showBackButton,
  onBack,
}) => {
  const isAdmin = user ? (isUserAdmin(user) || !!user.isAdmin) : false;
  
  let locationPath = "";
  let routerNavigate: ((delta: number) => void) | null = null;
  let goToPath: ((path: string) => void) | null = null;
  try {
    const loc = useLocation();
    locationPath = loc.pathname;
    const nav = useNavigate();
    routerNavigate = (delta: number) => nav(delta);
    goToPath = (path: string) => nav(path);
  } catch {
    // If rendered outside of router context
  }

  const shouldDisplayBack = showBackButton ?? (locationPath !== "" && locationPath !== "/" && !locationPath.startsWith("/admin") && locationPath !== "/landing");

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (routerNavigate) {
      routerNavigate(-1);
    } else {
      window.history.back();
    }
  };

  // 5 Onglets selon Étape 3 : Accueil (libre), Cours (aperçu), Exercices (aperçu), Tuteur IA (protégé), Profil (protégé)
  const navLinks = [
    { label: "Accueil", path: "/", icon: <Home size={15} />, active: locationPath === "/" },
    { label: "Cours", path: "/cours", icon: <BookOpen size={15} />, active: locationPath.startsWith("/cours") },
    { label: "Exercices", path: "/evaluations", icon: <FileCheck size={15} />, active: locationPath.startsWith("/evaluations") || locationPath.startsWith("/exercices") },
    { label: "Tuteur IA", path: "/tuteur-ia", icon: <Sparkles size={15} />, active: locationPath.startsWith("/tuteur") },
    { label: "Profil", path: "/profil", icon: <User size={15} />, active: locationPath.startsWith("/profil") },
  ];

  return (
    <header className="bg-[#1A237E] text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Back Button & Logo Branding */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {shouldDisplayBack && (
              <button
                type="button"
                onClick={handleBackClick}
                className="p-2 -ml-1 bg-white/10 hover:bg-white/20 active:scale-95 text-amber-300 hover:text-white rounded-xl border border-white/20 transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
                title="Page précédente"
                aria-label="Retour à la page précédente"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <AppLogo 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-amber-300 shadow-md shrink-0 cursor-pointer" 
              alt="Génie Mentor Académie Logo Officiel"
              onClick={() => goToPath?.("/")}
            />
            <div className="min-w-0 cursor-pointer" onClick={() => goToPath?.("/")}>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white truncate">Génie Mentor Académie</h1>
                <span className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full shrink-0">
                  GMA
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <p className="text-[10px] sm:text-[11px] text-indigo-200 font-medium truncate">Soutien Scolaire & Concours</p>
                <span className="inline-flex items-center space-x-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden sm:inline">En Ligne</span>
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links for Tablet & PC (hidden on phone, visible md+) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 bg-white/10 p-1 rounded-2xl border border-white/15 backdrop-blur-xs">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => goToPath?.(link.path)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  link.active
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-indigo-100 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Action: Notification Bell, Mode Invité / Profile Badge */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Bouton Portfolio du Développement */}
            {onOpenPortfolio && (
              <button
                type="button"
                onClick={onOpenPortfolio}
                className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-amber-300 border border-amber-400/30 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Portfolio du Développement"
              >
                <Code2 size={13} className="text-amber-400" />
                <span>Portfolio</span>
              </button>
            )}

            {/* Bouton Télécharger / Installer l'application Génie Mentor Académie (GMA) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenApkModal) {
                  onOpenApkModal();
                } else if (onOpenLanding) {
                  onOpenLanding();
                } else if (goToPath) {
                  goToPath("/landing");
                }
              }}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-xs font-bold text-white border border-emerald-400/40 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Télécharger l'application GMA (PWA)"
            >
              <Smartphone size={14} className="text-white" />
              <span>Télécharger l'application GMA</span>
            </button>

            {/* If user is logged in */}
            {user ? (
              <>
                {/* Notification Center Button */}
                {onOpenNotifications && (
                  <NotificationBell
                    user={user}
                    unreadNotifCount={unreadNotifCount}
                    onOpenNotifications={onOpenNotifications}
                  />
                )}

                {/* Profile Badge */}
                <div className="text-right cursor-pointer" onClick={() => goToPath?.("/profil")}>
                  <p className="text-[11px] sm:text-xs font-bold text-white leading-tight truncate max-w-[110px] sm:max-w-[150px]">
                    {user.displayName || "Élève"}
                  </p>
                  {isAdmin ? (
                    <div className="flex items-center justify-end space-x-1 text-amber-300">
                      <ShieldCheck size={12} className="text-amber-400 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wide">
                        Administrateur
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end space-x-1 text-amber-300">
                      <GraduationCap size={12} className="text-amber-400 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-extrabold">
                        {getLevelLabel(user.level || "3ème")}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Mode Invité (Guest Mode) : Seul le badge Mode Invité est affiché, pas de bouton Se connecter dans l'en-tête */
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 text-[10px] sm:text-xs font-bold bg-white/10 text-amber-300 rounded-full border border-amber-400/30">
                  Mode Invité
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
