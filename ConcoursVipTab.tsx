import React, { useState, useEffect } from "react";
import { Asset, UserProfile, Subject } from "../types";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { isUserVIP, formatVipCountdown, getVipStatusInfo, VipCountdownResult } from "../utils/vipUtils";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { VipModal } from "./VipModal";
import { EditAssetModal } from "./EditAssetModal";
import { 
  Award, 
  Crown, 
  Sparkles, 
  Search, 
  FileText, 
  Download, 
  Eye, 
  Lock, 
  CheckCircle, 
  HardDrive, 
  Star, 
  Filter,
  GraduationCap,
  Zap,
  PhoneCall,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ConcoursVipTabProps {
  user: UserProfile | null;
  assets: Asset[];
  onToggleCacheAsset: (assetId: string) => void;
  onOpenVipModal?: () => void;
  onNavigateHome?: () => void;
}

type VipCategory = "concours" | "examens" | "exercices";

export const ConcoursVipTab: React.FC<ConcoursVipTabProps> = ({
  user,
  assets,
  onToggleCacheAsset,
  onOpenVipModal,
  onNavigateHome,
}) => {
  let navigate: ((path: string) => void) | null = null;
  try {
    const nav = useNavigate();
    navigate = (path: string) => nav(path);
  } catch {
    // Outside router
  }

  const [activeCategory, setActiveCategory] = useState<VipCategory>("concours");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("Tous");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isVipModalOpenLocal, setIsVipModalOpenLocal] = useState(false);

  const roomRepo = RoomDatabaseRepository.getInstance();
  const allAssets = assets.length > 0 ? assets : roomRepo.getAllAssets();

  const isUserVipOrAdmin = isUserVIP(user);
  const statusInfo = getVipStatusInfo(user);
  const [countdown, setCountdown] = useState<VipCountdownResult>(() => formatVipCountdown(user?.vipExpiresAt));

  // Real-time ticking VIP countdown timer
  useEffect(() => {
    setCountdown(formatVipCountdown(user?.vipExpiresAt));
    if (!user?.vipExpiresAt || user?.vipExpiresAt === -1) return;

    const interval = setInterval(() => {
      setCountdown(formatVipCountdown(user?.vipExpiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.vipExpiresAt]);

  // Filter VIP assets by category
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
          name.includes("concours") ||
          name.includes("prytanée") ||
          name.includes("olympiade")
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

  const categoryAssets = getCategoryAssets(activeCategory);

  // Extract unique subjects for filtering
  const availableSubjects = Array.from(
    new Set(
      categoryAssets
        .map((a) => a.subject)
        .filter((s): s is Subject => !!s)
    )
  );

  const filteredAssets = categoryAssets.filter((asset) => {
    const matchesSearch =
      (asset.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.subject && asset.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject =
      selectedSubject === "Tous" || asset.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleOpenVip = () => {
    if (onOpenVipModal) {
      onOpenVipModal();
    } else {
      setIsVipModalOpenLocal(true);
    }
  };

  return (
    <div className="w-full max-w-full space-y-4 pb-24 min-w-0 animate-in fade-in duration-200">
      {/* VipModal */}
      <VipModal
        isOpen={isVipModalOpenLocal}
        onClose={() => setIsVipModalOpenLocal(false)}
        user={user}
      />

      {/* Document Viewer Modal */}
      {previewAsset && (
        <DocumentViewerModal
          isOpen={!!previewAsset}
          onClose={() => setPreviewAsset(null)}
          asset={previewAsset}
          isCached={!!previewAsset.isCachedOffline}
          onToggleCache={() => onToggleCacheAsset(previewAsset.assetId)}
        />
      )}

      {/* Edit Asset Modal for Admin */}
      {editingAsset && (
        <EditAssetModal
          isOpen={!!editingAsset}
          onClose={() => setEditingAsset(null)}
          asset={editingAsset}
        />
      )}

      {/* Barre compacte & Retour à l'accueil */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => {
            if (onNavigateHome) onNavigateHome();
            else if (navigate) navigate("/");
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#1A237E] hover:border-indigo-300 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={14} className="text-[#1A237E]" />
          <span>Retour à l'Accueil</span>
        </button>

        <div className="flex items-center space-x-2 text-xs font-black text-slate-800">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <Crown size={16} />
          </div>
          <span className="text-slate-900 font-extrabold text-sm sm:text-base">Concours & VIP</span>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-br from-[#1A237E] via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden border-2 border-amber-400">
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <Award size={180} />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400 text-[#1A237E] text-xs font-black shadow-sm">
              <Crown size={14} className="shrink-0" />
              <span>GMA Excellence VIP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Concours & Examens d'Élite
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-xl">
              Annales officielles corrigées, Concours Général Sénégalais, Prytanée Militaire et fiches de renforcement de haut niveau.
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {isUserVipOrAdmin ? (
              <div className="px-4 py-2.5 bg-emerald-500/20 border border-emerald-400/50 rounded-2xl flex items-center space-x-2.5 text-emerald-300">
                <CheckCircle size={18} className="shrink-0 text-emerald-400" />
                <div>
                  <span className="block font-black text-xs">
                    {user?.isAdmin ? "👑 Accès Administrateur" : "⭐ Pass VIP Actif"}
                  </span>
                  <span className="block text-[11px] text-emerald-200 font-mono font-bold">
                    {user?.isAdmin 
                      ? "Accès Permanent Illimité" 
                      : countdown.isLifetime 
                      ? "Accès Illimité (À vie)" 
                      : `⏱️ ${countdown.formattedText}`}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOpenVip}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#1A237E] font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
              >
                <Crown size={16} />
                <span>{statusInfo.isExpired ? "Renouveler Pass VIP" : "Activer Pass VIP (1 000 F)"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIP Expiration Countdown Card for Active VIPs */}
      {isUserVipOrAdmin && !user?.isAdmin && !countdown.isLifetime && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-amber-400/50 rounded-2xl p-3.5 sm:p-4 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <Clock size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xs text-amber-300 uppercase tracking-wide">
                  Chronomètre Dégressif VIP
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  En cours
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black font-mono tracking-tight text-white mt-0.5">
                {countdown.days} jour(s) {countdown.hours.toString().padStart(2, "0")}h {countdown.minutes.toString().padStart(2, "0")}m {countdown.seconds.toString().padStart(2, "0")}s restants
              </p>
              <p className="text-[11px] text-slate-300">
                {statusInfo.expirationFormatted}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenVip}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#1A237E] rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0 shadow-xs flex items-center space-x-1.5 self-end sm:self-center"
          >
            <Sparkles size={13} />
            <span>Prolonger l'abonnement</span>
          </button>
        </div>
      )}

      {/* Expired VIP Alert Warning */}
      {!isUserVipOrAdmin && statusInfo.isExpired && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-rose-900 flex items-center space-x-1.5">
                <span>Abonnement Concours VIP Expiré</span>
                <span className="bg-rose-200 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Accès Suspendu</span>
              </h4>
              <p className="text-[11px] text-rose-700 leading-snug mt-0.5">
                Votre durée d'abonnement est arrivée à son terme ({statusInfo.expirationFormatted}). Les documents de concours sont temporairement verrouillés jusqu'à votre réabonnement.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenVip}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer shadow-md flex items-center space-x-1.5 self-end sm:self-center"
          >
            <Crown size={14} />
            <span>Renouveler mon Pass VIP</span>
          </button>
        </div>
      )}

      {/* Non-VIP Alert Warning if never subscribed */}
      {!isUserVipOrAdmin && !statusInfo.isExpired && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">
                Documents Réservés aux Abonnés VIP
              </h4>
              <p className="text-[11px] text-slate-600">
                Abonnez-vous à partir de 1 000 FCFA (Wave ou Orange Money au 78 376 95 84) pour débloquer l'accès complet aux annales, épreuves et corrigés.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenVip}
            className="px-3.5 py-1.5 bg-[#1A237E] text-white hover:bg-indigo-900 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            Souscrire maintenant
          </button>
        </div>
      )}

      {/* Category Selection Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveCategory("concours");
            setSelectedSubject("Tous");
          }}
          className={`p-3 rounded-2xl text-xs font-extrabold border transition-all text-center flex flex-col items-center justify-center space-y-1 cursor-pointer ${
            activeCategory === "concours"
              ? "bg-[#1A237E] text-white border-[#1A237E] shadow-md scale-[1.02]"
              : "bg-white text-slate-700 border-slate-200 hover:border-indigo-200"
          }`}
        >
          <Award size={18} className={activeCategory === "concours" ? "text-amber-300" : "text-indigo-600"} />
          <span className="leading-tight truncate w-full">Concours Nationaux</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory("examens");
            setSelectedSubject("Tous");
          }}
          className={`p-3 rounded-2xl text-xs font-extrabold border transition-all text-center flex flex-col items-center justify-center space-y-1 cursor-pointer ${
            activeCategory === "examens"
              ? "bg-[#1A237E] text-white border-[#1A237E] shadow-md scale-[1.02]"
              : "bg-white text-slate-700 border-slate-200 hover:border-indigo-200"
          }`}
        >
          <GraduationCap size={18} className={activeCategory === "examens" ? "text-amber-300" : "text-amber-600"} />
          <span className="leading-tight truncate w-full">Examens (BFEM/BAC)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory("exercices");
            setSelectedSubject("Tous");
          }}
          className={`p-3 rounded-2xl text-xs font-extrabold border transition-all text-center flex flex-col items-center justify-center space-y-1 cursor-pointer ${
            activeCategory === "exercices"
              ? "bg-[#1A237E] text-white border-[#1A237E] shadow-md scale-[1.02]"
              : "bg-white text-slate-700 border-slate-200 hover:border-indigo-200"
          }`}
        >
          <Sparkles size={18} className={activeCategory === "exercices" ? "text-amber-300" : "text-emerald-600"} />
          <span className="leading-tight truncate w-full">Exercices d'Élite</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Rechercher parmi les épreuves de ${
              activeCategory === "concours"
                ? "concours"
                : activeCategory === "examens"
                ? "BFEM / BAC"
                : "renforcement"
            }...`}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1A237E]"
          />
        </div>

        {/* Subject Filter Pills */}
        {availableSubjects.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-slate-400 font-bold px-1 flex items-center space-x-1 shrink-0">
              <Filter size={12} />
              <span>Matière :</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedSubject("Tous")}
              className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubject === "Tous"
                  ? "bg-[#1A237E] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Toutes ({categoryAssets.length})
            </button>
            {availableSubjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSubject === sub
                    ? "bg-[#1A237E] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assets Listing */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 space-y-2">
          <FileText size={36} className="mx-auto text-slate-300" />
          <p className="text-xs font-bold text-slate-600">Aucune épreuve trouvée pour ces critères.</p>
          <p className="text-[11px] text-slate-400">
            Essayez un autre mot-clé ou sélectionnez une autre matière ci-dessus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map((asset) => {
            const isCached = !!asset.isCachedOffline;

            return (
              <div
                key={asset.assetId}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 hover:border-indigo-200 shadow-xs flex items-center justify-between gap-3 transition-all group"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#1A237E] flex items-center justify-center font-black shrink-0">
                    <FileText size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                      <h4 className="font-extrabold text-xs text-slate-800 truncate">
                        {asset.name}
                      </h4>
                      {asset.subject && (
                        <span className="px-1.5 py-0.2 bg-indigo-50 text-[#1A237E] text-[10px] font-bold rounded-md">
                          {asset.subject}
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md">
                        {asset.size || "1.2 MB"}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                      <span>Catégorie : {asset.category || "Épreuve VIP"}</span>
                      <span className="text-indigo-600 font-bold flex items-center space-x-0.5">
                        <CheckCircle size={10} />
                        <span>PDF Haute Définition</span>
                      </span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  {/* Admin Edit and Delete Controls */}
                  {user?.isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingAsset(asset)}
                        className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                        title="Modifier cette épreuve / fichier"
                      >
                        <Zap size={13} className="text-amber-600" />
                        <span className="hidden sm:inline">Modifier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Confirmer la suppression définitive de "${asset.name}" ?`)) {
                            roomRepo.deleteAsset(asset.assetId);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                        title="Supprimer cette épreuve / fichier"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}

                  {/* Read / Consult Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isUserVipOrAdmin) {
                        handleOpenVip();
                      } else {
                        setPreviewAsset(asset);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer ${
                      isUserVipOrAdmin
                        ? "bg-[#1A237E] hover:bg-indigo-900 text-white shadow-2xs"
                        : "bg-amber-400 hover:bg-amber-300 text-[#1A237E] font-black"
                    }`}
                  >
                    {isUserVipOrAdmin ? (
                      <>
                        <Eye size={13} />
                        <span>Lire</span>
                      </>
                    ) : (
                      <>
                        <Lock size={13} />
                        <span>Débloquer</span>
                      </>
                    )}
                  </button>

                  {/* PDF Download Button (for VIPs/Admins) */}
                  {isUserVipOrAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (asset.downloadUrl) {
                          window.open(asset.downloadUrl, "_blank");
                        } else {
                          setPreviewAsset(asset);
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-[#1A237E] border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer"
                      title="Télécharger / Ouvrir le fichier PDF"
                    >
                      <Download size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
