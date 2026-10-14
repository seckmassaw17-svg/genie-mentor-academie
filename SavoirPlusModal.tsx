import React, { useState } from "react";
import { Asset, UserProfile } from "../types";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { AppLogo } from "./AppLogo";
import { 
  Sparkles, 
  X, 
  Search, 
  FileText, 
  Award, 
  GraduationCap, 
  Zap, 
  Eye, 
  Download, 
  Lock, 
  Crown,
  ShieldCheck
} from "lucide-react";

interface SavoirPlusModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSelectAsset?: (asset: Asset) => void;
  onOpenVipModal?: () => void;
}

type VipCategory = "concours" | "examens" | "exercices";

export const SavoirPlusModal: React.FC<SavoirPlusModalProps> = ({
  isOpen,
  onClose,
  user,
  onSelectAsset,
  onOpenVipModal,
}) => {
  const [activeCategory, setActiveCategory] = useState<VipCategory>("concours");
  const [searchQuery, setSearchQuery] = useState("");

  const roomRepo = RoomDatabaseRepository.getInstance();
  const allAssets = roomRepo.getAllAssets();

  if (!isOpen) return null;

  // Filter assets according to selected VIP category
  const getCategoryAssets = (category: VipCategory): Asset[] => {
    return allAssets.filter((asset) => {
      const lvl = (asset.level || "").toString().toLowerCase();
      const cat = (asset.category || "").toString().toLowerCase();
      const name = (asset.name || "").toLowerCase();

      if (category === "concours") {
        return (
          lvl === "concours" ||
          cat === "concours" ||
          (lvl === "savoir+" && (name.includes("concours") || name.includes("olympiade") || name.includes("général") || name.includes("prytanée"))) ||
          name.includes("concours")
        );
      } else if (category === "examens") {
        return (
          lvl === "examens" ||
          cat === "examens" ||
          (lvl === "savoir+" && (name.includes("examen") || name.includes("bfem") || name.includes("bac") || name.includes("sujet"))) ||
          name.includes("bfem") ||
          name.includes("bac") ||
          name.includes("examen")
        );
      } else if (category === "exercices") {
        return (
          lvl.includes("exercice") ||
          cat.includes("exercice") ||
          (lvl === "savoir+" && (name.includes("exercice") || name.includes("avancé") || name.includes("fascicule") || name.includes("série"))) ||
          name.includes("avancé") ||
          name.includes("fascicule") ||
          (!lvl.includes("concours") && !lvl.includes("examen") && asset.isPremium)
        );
      }
      return false;
    });
  };

  const currentCategoryAssets = getCategoryAssets(activeCategory).filter((asset) =>
    (asset.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (asset.subject && asset.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDownload = (asset: Asset) => {
    if (asset.downloadUrl) {
      window.open(asset.downloadUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden space-y-4">
        
        {/* Top Gradient Banner Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-[#1A237E]" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <AppLogo
                className="w-12 h-12 rounded-2xl border-2 border-amber-400 shadow mx-auto"
                alt="Génie Mentor Académie Logo"
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-[#1A237E] p-0.5 rounded-full shadow">
                <Crown size={12} />
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  GMA VIP
                </h2>
                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-[#1A237E] dark:text-amber-300 text-[10px] font-extrabold rounded-full border border-amber-300/80 flex items-center space-x-1">
                  <Sparkles size={11} className="text-amber-500" />
                  <span>Accès Illimité Élève</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Génie Mentor Académie • Espace réservé aux épreuves d'Excellence, Concours & Examens Corrigés
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Non-VIP Alert Warning if opened by guest/non-VIP */}
        {!user.isVIP && !user.isAdmin && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-amber-200">
                  Pass VIP Non Inclus ou En Attente de Validation
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-amber-300/80">
                  Activez votre Pass VIP (1 000 FCFA / mois) via Wave ou Orange Money pour consulter & télécharger tous les PDF.
                </p>
              </div>
            </div>
            {onOpenVipModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenVipModal();
                }}
                className="px-3 py-2 bg-gradient-to-r from-[#1A237E] to-indigo-900 text-amber-300 font-extrabold text-xs rounded-xl shadow cursor-pointer shrink-0 ml-2 border border-amber-400/40"
              >
                Activer Pass VIP
              </button>
            )}
          </div>
        )}

        {/* 3 Clickable Section Tabs */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveCategory("concours")}
            className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
              activeCategory === "concours"
                ? "bg-gradient-to-br from-[#1A237E] to-indigo-900 text-white border-amber-400 shadow-md"
                : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className={`p-1.5 rounded-xl ${activeCategory === "concours" ? "bg-amber-400 text-[#1A237E]" : "bg-indigo-100 dark:bg-slate-700 text-[#1A237E] dark:text-indigo-300"}`}>
                <Award size={18} />
              </div>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeCategory === "concours" ? "bg-amber-400/30 text-amber-300" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                {getCategoryAssets("concours").length} PDF
              </span>
            </div>
            <span className="font-extrabold text-xs sm:text-sm">🏆 Concours</span>
            <span className={`text-[10px] truncate ${activeCategory === "concours" ? "text-indigo-200" : "text-slate-400"}`}>
              Général, ENA, Prytanée
            </span>
          </button>

          <button
            onClick={() => setActiveCategory("examens")}
            className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
              activeCategory === "examens"
                ? "bg-gradient-to-br from-[#1A237E] to-indigo-900 text-white border-amber-400 shadow-md"
                : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className={`p-1.5 rounded-xl ${activeCategory === "examens" ? "bg-amber-400 text-[#1A237E]" : "bg-emerald-100 dark:bg-slate-700 text-emerald-800 dark:text-emerald-300"}`}>
                <GraduationCap size={18} />
              </div>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeCategory === "examens" ? "bg-amber-400/30 text-amber-300" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                {getCategoryAssets("examens").length} PDF
              </span>
            </div>
            <span className="font-extrabold text-xs sm:text-sm">📜 Examens</span>
            <span className={`text-[10px] truncate ${activeCategory === "examens" ? "text-indigo-200" : "text-slate-400"}`}>
              BFEM & BAC Corrigés
            </span>
          </button>

          <button
            onClick={() => setActiveCategory("exercices")}
            className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
              activeCategory === "exercices"
                ? "bg-gradient-to-br from-[#1A237E] to-indigo-900 text-white border-amber-400 shadow-md"
                : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className={`p-1.5 rounded-xl ${activeCategory === "exercices" ? "bg-amber-400 text-[#1A237E]" : "bg-amber-100 dark:bg-slate-700 text-amber-800 dark:text-amber-300"}`}>
                <Zap size={18} />
              </div>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeCategory === "exercices" ? "bg-amber-400/30 text-amber-300" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                {getCategoryAssets("exercices").length} PDF
              </span>
            </div>
            <span className="font-extrabold text-xs sm:text-sm">⚡ Exercices Avancés</span>
            <span className={`text-[10px] truncate ${activeCategory === "exercices" ? "text-indigo-200" : "text-slate-400"}`}>
              Fascicules d'Excellence
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Rechercher un PDF dans ${activeCategory === "concours" ? "Concours" : activeCategory === "examens" ? "Examens" : "Exercices Avancés"}...`}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-[#1A237E]"
          />
        </div>

        {/* Assets List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {currentCategoryAssets.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-2">
              <FileText size={32} className="mx-auto text-slate-400 opacity-60" />
              <p className="font-extrabold text-xs text-slate-700 dark:text-slate-300">
                Aucun document PDF trouvé dans la section {activeCategory === "concours" ? "Concours" : activeCategory === "examens" ? "Examens" : "Exercices Avancés"}.
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                L'administration Génie Mentor Académie (GMA) ajoute régulièrement des épreuves et fascicules d'exercices corrigés.
              </p>
            </div>
          ) : (
            currentCategoryAssets.map((asset) => (
              <div
                key={asset.assetId}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 hover:border-amber-400 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-[#1A237E] dark:text-amber-300 font-black text-[10px] rounded-md border border-amber-300/80">
                      {asset.subject || "VIP"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {asset.type.toUpperCase()} • {asset.size}
                    </span>
                    {asset.isPremium && (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-[#1A237E] text-[9px] font-black rounded uppercase">
                        VIP
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1 group-hover:text-[#1A237E] dark:group-hover:text-amber-300 transition-colors">
                    {asset.name}
                  </h4>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {onSelectAsset && (
                    <button
                      onClick={() => {
                        if (user.isVIP || user.isAdmin) {
                          onSelectAsset(asset);
                          onClose();
                        } else if (onOpenVipModal) {
                          onClose();
                          onOpenVipModal();
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-slate-700 hover:bg-[#1A237E] hover:text-white text-[#1A237E] dark:text-indigo-200 font-bold text-xs rounded-xl border border-indigo-200 dark:border-slate-600 transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>Consulter</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (user.isVIP || user.isAdmin) {
                        handleDownload(asset);
                      } else if (onOpenVipModal) {
                        onClose();
                        onOpenVipModal();
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-[#1A237E] font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
                    title={user.isVIP || user.isAdmin ? "Télécharger le document PDF" : "Pass VIP requis pour télécharger"}
                  >
                    {user.isVIP || user.isAdmin ? <Download size={14} /> : <Lock size={14} />}
                    <span>{user.isVIP || user.isAdmin ? "Télécharger" : "Débloquer VIP"}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Direction Pédagogique GMA Dakar</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
