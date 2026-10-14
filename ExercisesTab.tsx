import React, { useState, useEffect } from "react";
import { Asset, SecondaryLevel, Subject } from "../types";
import { ALL_LEVELS, STUDENT_LEVELS, getSubjectsForLevel, getLevelLabel } from "../data/mockData";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { EditAssetModal } from "./EditAssetModal";
import { VipModal } from "./VipModal";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  HardDrive, 
  Search, 
  Eye, 
  X, 
  Sparkles,
  FileCheck,
  Edit3,
  Trash2,
  Filter,
  Lock,
  Star,
  Layers,
  ArrowLeft,
  ChevronRight,
  Calculator,
  Atom,
  Compass,
  BookMarked,
  Globe2,
  Languages,
  GraduationCap,
  BookOpen
} from "lucide-react";

interface ExercisesTabProps {
  userLevel: SecondaryLevel;
  assets: Asset[];
  onToggleCacheAsset: (assetId: string) => void;
  isAdmin?: boolean;
  isVIP?: boolean;
  userUid?: string;
  userName?: string;
  userPhone?: string;
  initialSubject?: Subject | null;
  selectedLevel?: SecondaryLevel | "ALL";
}

export const ExercisesTab: React.FC<ExercisesTabProps> = ({
  userLevel,
  assets,
  onToggleCacheAsset,
  isAdmin,
  isVIP,
  userUid,
  userName,
  userPhone,
  initialSubject = null,
  selectedLevel,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();

  const [internalLevel, setInternalLevel] = useState<SecondaryLevel | "ALL">(isAdmin ? (selectedLevel || "ALL") : userLevel);
  useEffect(() => {
    if (isAdmin && selectedLevel) {
      setInternalLevel(selectedLevel);
    }
  }, [selectedLevel, isAdmin]);
  const activeLevel = isAdmin ? (selectedLevel !== undefined ? selectedLevel : internalLevel) : userLevel;

  const availableSubjects = (isAdmin && activeLevel === "ALL")
    ? ["Maths", "Physique-Chimie", "SVT", "Français", "Histoire-Géo", "Anglais", "Philo"] as Subject[]
    : getSubjectsForLevel(activeLevel);
  // activeViewSubject: null means the user is on the subject selection hub; a Subject string means they are viewing that subject's exercises
  const [activeViewSubject, setActiveViewSubject] = useState<Subject | "ALL" | null>(initialSubject);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);

  const handleDeleteAsset = (asset: Asset) => {
    roomRepo.deleteAsset(asset.assetId);
  };

  const handleOpenAsset = (asset: Asset) => {
    if (asset.isPremium && !isVIP && !isAdmin) {
      setIsVipModalOpen(true);
      return;
    }
    setPreviewAsset(asset);
  };

  const handleCacheAsset = (asset: Asset) => {
    if (asset.isPremium && !isVIP && !isAdmin) {
      setIsVipModalOpen(true);
      return;
    }
    onToggleCacheAsset(asset.assetId);
  };

  const allCourses = roomRepo.getAllCourses();
  const allAssets = roomRepo.getAllAssets();
  const currentAssets = isAdmin ? allAssets : assets;

  // Filter assets by level
  const levelFilteredAssets = currentAssets.filter((a) => {
    const assetLevel = a.level || (allCourses.find(c => c.id === a.parentId)?.level);
    const matchesLevel = activeLevel === "ALL" || !assetLevel || assetLevel === activeLevel;
    const matchesAllowedSubject = activeLevel === "ALL" || !a.subject || availableSubjects.includes(a.subject);
    return matchesLevel && matchesAllowedSubject;
  });

  // Get count of exercises per subject
  const getSubjectExerciseCount = (subj: Subject) => {
    return levelFilteredAssets.filter((a) => a.subject === subj).length;
  };

  // Subject icon helper
  const getSubjectIcon = (subj: Subject) => {
    switch (subj) {
      case "Maths":
        return <Calculator size={22} className="text-emerald-700" />;
      case "Physique-Chimie":
        return <Atom size={22} className="text-emerald-700" />;
      case "SVT":
        return <Compass size={22} className="text-emerald-700" />;
      case "Français":
        return <BookMarked size={22} className="text-emerald-700" />;
      case "Histoire-Géo":
        return <Globe2 size={22} className="text-emerald-700" />;
      case "Anglais":
        return <Languages size={22} className="text-emerald-700" />;
      case "Philo":
        return <GraduationCap size={22} className="text-emerald-700" />;
      default:
        return <BookOpen size={22} className="text-emerald-700" />;
    }
  };

  // Filtered exercises for the detail view
  const displayedAssets = levelFilteredAssets.filter((a) => {
    const matchesSubject = activeViewSubject === "ALL" || a.subject === activeViewSubject;
    const matchesSearch =
      (a.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.storagePath || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="w-full max-w-full space-y-4 pb-20 min-w-0">

      {/* VIEW 1: SUBJECT SELECTION HUB (Boutons cliquables par matière) */}
      {activeViewSubject === null ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                <Layers size={18} className="text-emerald-700" />
                <span>Choisissez une matière pour voir ses exercices :</span>
              </h3>
              <p className="text-xs text-slate-500">
                Cliquez sur une matière pour accéder immédiatement à ses séries et fiches d'exercices.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveViewSubject("ALL")}
              className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-xl transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              Voir toutes les matières
            </button>
          </div>

          {/* Grid of Clickable Subject Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availableSubjects.map((subj) => {
              const count = getSubjectExerciseCount(subj);
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => {
                    setActiveViewSubject(subj);
                    setSearchQuery("");
                  }}
                  className="bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-600 p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md text-left flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getSubjectIcon(subj)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                        {subj}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {count > 0 ? `${count} série${count > 1 ? "s" : ""} d'exercices` : "Fiches bientôt disponibles"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-700 group-hover:text-white transition-all flex items-center space-x-1">
                      <span>Ouvrir</span>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW 2: EXERCISES LIST FOR SELECTED SUBJECT */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Back Button & Active Subject Header */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveViewSubject(null);
                  setSearchQuery("");
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all flex items-center space-x-1.5 text-xs font-bold shrink-0 cursor-pointer"
                title="Revenir au choix des matières"
              >
                <ArrowLeft size={16} />
                <span>Matières</span>
              </button>

              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center space-x-2 truncate">
                  <span>Matière :</span>
                  <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 truncate">
                    {activeViewSubject === "ALL" ? "Toutes les matières" : activeViewSubject}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate">
                  Classe de {activeLevel} • {displayedAssets.length} document(s) trouvé(s)
                </p>
              </div>
            </div>

            {/* Quick Switch Subject Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() => setActiveViewSubject("ALL")}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeViewSubject === "ALL"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tous
              </button>
              {availableSubjects.map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setActiveViewSubject(subj)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeViewSubject === subj
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <input
              type="text"
              placeholder={`Rechercher un exercice de ${activeViewSubject === "ALL" ? "toutes matières" : activeViewSubject}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Asset List */}
          {displayedAssets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 space-y-2">
              <FileText size={36} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Aucun exercice trouvé pour cette matière.</p>
              <p className="text-[11px] text-slate-400">
                Sélectionnez une autre matière ou réinitialisez votre recherche.
              </p>
              <button
                type="button"
                onClick={() => setActiveViewSubject(null)}
                className="mt-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1"
              >
                <ArrowLeft size={14} />
                <span>Changer de matière</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {displayedAssets.map((asset) => (
                <div
                  key={asset.assetId}
                  className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 hover:border-emerald-300 transition-all flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-2xl font-black text-xs flex items-center justify-center uppercase shadow-inner shrink-0 ${
                        asset.type === "pdf"
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : asset.type === "docx"
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {asset.type}
                    </div>

                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {asset.name}
                        </h3>
                        {asset.isPremium && (
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded-md flex items-center space-x-1 ${
                            isVIP || isAdmin
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}>
                            {isVIP || isAdmin ? (
                              <>
                                <Star size={10} className="fill-amber-500 text-amber-500" />
                                <span>VIP Débloqué</span>
                              </>
                            ) : (
                              <>
                                <Lock size={10} className="text-rose-600" />
                                <span>Exclusif VIP</span>
                              </>
                            )}
                          </span>
                        )}
                        {asset.subject && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md shrink-0">
                            {asset.subject}
                          </span>
                        )}
                        {asset.level && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 text-[10px] font-extrabold rounded-md shrink-0">
                            {asset.level}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-2">
                        <span>Taille : {asset.size}</span>
                        <span>•</span>
                        <span className="truncate font-mono text-[10px] text-slate-400">
                          {asset.storagePath}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isAdmin && (
                      <div className="flex items-center space-x-1.5 bg-amber-50 p-1 rounded-xl border border-amber-200">
                        <button
                          type="button"
                          onClick={() => setEditingAsset(asset)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-lg flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                          title="Modifier ce document / exercice"
                        >
                          <Edit3 size={14} />
                          <span className="hidden sm:inline">Modifier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(asset)}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                          title="Supprimer ce document"
                        >
                          <Trash2 size={14} />
                          <span className="hidden sm:inline">Supprimer</span>
                        </button>
                      </div>
                    )}

                    {asset.isPremium && !isVIP && !isAdmin ? (
                      <button
                        onClick={() => setIsVipModalOpen(true)}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-[#1A237E] font-black rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer border border-amber-300"
                        title="Abonnez-vous au Pass VIP pour débloquer ce document"
                      >
                        <Lock size={14} />
                        <span>Débloquer (Pass VIP)</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpenAsset(asset)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                          title="Consulter et lire le document"
                        >
                          <Eye size={16} />
                          <span>Ouvrir</span>
                        </button>

                        <button
                          onClick={() => handleCacheAsset(asset)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                            asset.isCachedOffline
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          }`}
                        >
                          {asset.isCachedOffline ? (
                            <>
                              <CheckCircle size={14} className="text-emerald-600" />
                              <span>En cache</span>
                            </>
                          ) : (
                            <>
                              <Download size={14} />
                              <span>Mettre en cache</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vip Unlock Modal */}
      <VipModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        userUid={userUid}
        userName={userName}
        userPhone={userPhone}
      />

      {/* Interactive Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        asset={previewAsset}
        title={previewAsset?.name}
        onToggleCacheAsset={onToggleCacheAsset}
      />

      {/* Admin Edit Asset Modal */}
      <EditAssetModal
        asset={editingAsset}
        isOpen={Boolean(editingAsset)}
        onClose={() => setEditingAsset(null)}
      />
    </div>
  );
};

