import React from "react";
import { Home, BookOpen, FileCheck, Sparkles, User, Lock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export type NavTab = "accueil" | "cours" | "evaluations" | "tuteur" | "profil" | "tutoriels" | "vip" | "exercices" | "devoirs" | "quiz" | "paiement";

interface NavigationProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  userLevel?: string;
  isGuest?: boolean;
  isAdmin?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  userLevel = "3ème",
  isGuest = false,
  isAdmin = false,
}) => {
  const location = useLocation();
  const locationPath = location?.pathname || "";
  const navigate = useNavigate();

  // Determine current active tab based on router URL if available, fallback to activeTab prop
  let currentActiveTab = activeTab || "accueil";
  if (locationPath) {
    if (locationPath === "/") currentActiveTab = "accueil";
    else if (locationPath.startsWith("/cours")) currentActiveTab = "cours";
    else if (locationPath.startsWith("/evaluations") || locationPath.startsWith("/exercices")) currentActiveTab = "evaluations";
    else if (locationPath.startsWith("/tuteur-ia") || locationPath.startsWith("/tuteur")) currentActiveTab = "tuteur";
    else if (locationPath.startsWith("/profil")) currentActiveTab = "profil";
    else if (locationPath.startsWith("/paiement")) currentActiveTab = "paiement";
  }

  const isEvaluationsActive = currentActiveTab === "evaluations" || currentActiveTab === "exercices" || currentActiveTab === "devoirs" || currentActiveTab === "quiz";

  // Strict 5 tabs according to Étape 3:
  // 1. Accueil (libre)
  // 2. Cours (aperçu)
  // 3. Exercices (aperçu)
  // 4. Tuteur IA (protégé)
  // 5. Profil (protégé)
  const tabs: { 
    id: NavTab; 
    label: string; 
    icon: React.ReactNode; 
    path: string; 
    badge?: string; 
    badgeColor?: string;
    isProtected?: boolean;
    isActive?: boolean;
  }[] = [
    {
      id: "accueil",
      label: "Accueil",
      icon: <Home size={18} />,
      path: "/",
      isActive: currentActiveTab === "accueil",
    },
    {
      id: "cours",
      label: "Cours",
      icon: <BookOpen size={18} />,
      path: "/cours",
      badge: isGuest ? "Aperçu" : (isAdmin ? "Global" : userLevel),
      badgeColor: isGuest ? "bg-slate-700" : (isAdmin ? "bg-emerald-600" : "bg-amber-500"),
      isActive: currentActiveTab === "cours",
    },
    {
      id: "evaluations",
      label: "Exercices",
      icon: <FileCheck size={18} />,
      path: "/evaluations",
      badge: isGuest ? "Aperçu" : undefined,
      badgeColor: "bg-slate-700",
      isActive: isEvaluationsActive,
    },
    {
      id: "tuteur",
      label: "Tuteur IA",
      icon: <Sparkles size={18} />,
      path: "/tuteur-ia",
      isProtected: true,
      badge: isGuest ? "Verrouillé" : "IA 24/7",
      badgeColor: isGuest ? "bg-amber-600" : "bg-indigo-600",
      isActive: currentActiveTab === "tuteur",
    },
    {
      id: "profil",
      label: "Profil",
      icon: <User size={18} />,
      path: "/profil",
      isProtected: true,
      badge: isGuest ? "Connexion" : undefined,
      badgeColor: "bg-amber-500",
      isActive: currentActiveTab === "profil",
    },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (onTabChange) {
      onTabChange(tab.id);
    }
    if (navigate) {
      navigate(tab.path);
    }
  };

  return (
    <nav className="md:hidden shrink-0 w-full bg-white border-t border-slate-200/90 shadow-xl z-30 overflow-hidden pb-[env(safe-area-inset-bottom,0px)]">
      <div className="w-full max-w-lg mx-auto px-1 py-1 flex items-center justify-around">
        {tabs.map((tab) => {
          const isCurrentActive = !!tab.isActive;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`relative flex flex-col items-center py-1 px-1 rounded-2xl transition-all cursor-pointer min-w-0 flex-1 shrink-0 ${
                isCurrentActive
                  ? "text-[#1A237E] font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1.5 rounded-2xl transition-all ${
                    isCurrentActive ? "bg-indigo-50 text-[#1A237E] scale-105 shadow-xs" : ""
                  }`}
                >
                  {tab.icon}
                </div>
                {tab.badge && (
                  <span className={`absolute -top-1 -right-2 text-white text-[7px] sm:text-[8px] font-extrabold px-1 py-0.2 rounded-full border border-white shadow-xs shrink-0 ${tab.badgeColor || "bg-amber-500"}`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] mt-0.5 whitespace-nowrap font-medium tracking-tight">
                {tab.label}
              </span>
              {isCurrentActive && (
                <div className="w-4 h-1 bg-[#1A237E] rounded-full mt-0.5 shrink-0"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
