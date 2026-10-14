import React, { useState, useMemo, useEffect } from "react";
import {
  Video,
  Search,
  Filter,
  GraduationCap,
  BookOpen,
  PlayCircle,
  Sparkles,
  Clock,
  HardDrive,
  CheckCircle,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { TutorialVideo, SecondaryLevel, Subject, TutorialCategory } from "../types";
import { ALL_LEVELS, ALL_SUBJECTS, getSubjectsForLevel, normalizeLevel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { subscribeToAllTutorialsSupabase } from "../data/supabaseStorage";
import { TutorialVideoPlayerModal } from "./TutorialVideoPlayerModal";

interface TutorialsTabProps {
  userLevel?: SecondaryLevel | string;
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
  onNavigateHome?: () => void;
}

export const TutorialsTab: React.FC<TutorialsTabProps> = ({
  userLevel = "3ème",
  isAdmin = false,
  onNavigateToAdmin,
  onNavigateHome,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const navigate = useNavigate();

  // Local state for tutorials
  const [tutorials, setTutorials] = useState<TutorialVideo[]>(() => roomRepo.getAllTutorials());
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialVideo | null>(null);

  // Filters: Class -> Subject -> Resource Category
  const [selectedLevel, setSelectedLevel] = useState<string>(() => isAdmin ? "ALL" : (userLevel || "3ème"));
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | TutorialCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time synchronization
  useEffect(() => {
    const unsubRoom = roomRepo.subscribe(() => {
      setTutorials(roomRepo.getAllTutorials());
    });

    const unsubSupabase = subscribeToAllTutorialsSupabase((remoteList) => {
      if (remoteList) {
        roomRepo.syncTutorialsFromRemote(remoteList);
        setTutorials(remoteList);
      }
    });

    return () => {
      unsubRoom();
      unsubSupabase();
    };
  }, []);

  // Sync default level when userLevel prop changes
  useEffect(() => {
    if (userLevel && !isAdmin) {
      setSelectedLevel(userLevel);
    }
  }, [userLevel, isAdmin]);

  // Available subjects for the currently selected class
  const availableSubjects = useMemo(() => {
    if (selectedLevel === "ALL" || !selectedLevel) {
      return ALL_SUBJECTS;
    }
    return getSubjectsForLevel(selectedLevel);
  }, [selectedLevel]);

  // Reset subject filter if not applicable to new level
  useEffect(() => {
    if (selectedSubject !== "ALL" && !availableSubjects.includes(selectedSubject as Subject)) {
      setSelectedSubject("ALL");
    }
  }, [selectedLevel, availableSubjects, selectedSubject]);

  // Filtered tutorial videos
  const filteredTutorials = useMemo(() => {
    return tutorials.filter((t) => {
      // 1. Class Filter - Force students to ONLY see their own class, and let admins filter.
      if (!isAdmin) {
        if (normalizeLevel(t.level) !== normalizeLevel(userLevel)) {
          return false;
        }
      } else {
        if (selectedLevel !== "ALL" && normalizeLevel(t.level) !== normalizeLevel(selectedLevel)) {
          return false;
        }
      }

      // 2. Subject Filter
      if (selectedSubject !== "ALL" && t.subject !== selectedSubject) {
        return false;
      }

      // 3. Category Filter
      if (selectedCategory !== "ALL" && t.category !== selectedCategory) {
        return false;
      }

      // 4. Text Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesSubj = t.subject.toLowerCase().includes(q);
        const matchesLvl = t.level.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSubj && !matchesLvl) {
          return false;
        }
      }

      return true;
    });
  }, [tutorials, selectedLevel, selectedSubject, selectedCategory, searchQuery]);

  return (
    <div className="space-y-3 sm:space-y-4 pb-12">
      {/* Barre de navigation compacte & Retour à l'accueil */}
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
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#1A237E] flex items-center justify-center">
            <Video size={16} />
          </div>
          <span className="text-slate-900 font-extrabold text-sm sm:text-base">Tutoriels Vidéos</span>
        </div>
      </div>

      {/* FILTER LEVEL 1 : FILTRE DE CLASSES DÉFILANT */}
      {isAdmin && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-700 flex items-center space-x-1.5">
              <GraduationCap size={15} className="text-[#1A237E]" />
              <span>1. Choisissez la Classe :</span>
            </label>
            {selectedLevel !== "ALL" && (
              <span className="text-[10px] font-bold text-slate-500">
                Classe active : <span className="text-[#1A237E] font-black">{selectedLevel}</span>
              </span>
            )}
          </div>

          {/* Horizontal scrollable class selector pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
            <button
              type="button"
              onClick={() => setSelectedLevel("ALL")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedLevel === "ALL"
                  ? "bg-[#1A237E] text-white shadow-md font-black"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Toutes les classes
            </button>

            {ALL_LEVELS.map((lvl) => {
              const isMyLevel = normalizeLevel(lvl) === normalizeLevel(userLevel);
              const isSelected = normalizeLevel(lvl) === normalizeLevel(selectedLevel);
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center space-x-1.5 ${
                    isSelected
                      ? "bg-[#1A237E] text-white shadow-md font-black ring-2 ring-[#1A237E]/20"
                      : isMyLevel
                      ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{lvl}</span>
                  {isMyLevel && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black rounded-full">
                      Ma classe
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER LEVEL 2 : DANS CLASSES, FILTRE DE MATIÈRES */}
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-700 flex items-center space-x-1.5">
          <BookOpen size={15} className="text-[#1A237E]" />
          <span>2. Filtre par Matière :</span>
        </label>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedSubject("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              selectedSubject === "ALL"
                ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Toutes les matières
          </button>

          {availableSubjects.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedSubject === sub
                  ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* FILTER LEVEL 3 & SEARCH : RESSOURCES COMPLÉMENTAIRES vs EXERCICES CORRIGÉS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-200">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "ALL", label: "Toutes les vidéos" },
            { id: "Ressources complémentaires", label: "📚 Ressources complémentaires" },
            { id: "Exercices corrigés", label: "✍️ Exercices corrigés" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedCategory === c.id
                  ? "bg-slate-900 text-white font-black shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une vidéo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1A237E]"
          />
        </div>
      </div>

      {/* COUNT & ACTIVE CRITERIA */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          <strong className="text-slate-800 font-bold">{filteredTutorials.length}</strong> tutoriel(s)
          vidéo disponible(s)
        </span>
        {((isAdmin && selectedLevel !== "ALL") || selectedSubject !== "ALL" || selectedCategory !== "ALL" || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedLevel(isAdmin ? "ALL" : (userLevel || "3ème"));
              setSelectedSubject("ALL");
              setSelectedCategory("ALL");
              setSearchQuery("");
            }}
            className="text-[#1A237E] font-bold hover:underline cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* TUTORIAL VIDEOS GRID */}
      {filteredTutorials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTutorials.map((tut) => (
            <div
              key={tut.id}
              onClick={() => setSelectedTutorial(tut)}
              className="group bg-white border border-slate-200 hover:border-[#1A237E]/50 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              {/* Video Thumbnail / Mock Preview */}
              <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center group-hover:ring-2 group-hover:ring-[#1A237E]/30 transition-all">
                {tut.thumbnailUrl ? (
                  <img
                    src={tut.thumbnailUrl}
                    alt={tut.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 space-y-1">
                    <Video size={36} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                    <span className="text-[10px] font-mono">Vidéo Haute Définition</span>
                  </div>
                )}

                {/* Big Play Overlay Button */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                    <PlayCircle size={28} className="fill-current" />
                  </div>
                </div>

                {/* Duration Badge */}
                {tut.duration && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white rounded text-[10px] font-mono font-bold flex items-center space-x-1">
                    <Clock size={10} />
                    <span>{tut.duration}</span>
                  </div>
                )}

                {/* Max 2 GB indicator badge */}
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-amber-300 rounded text-[9px] font-mono font-bold flex items-center space-x-1">
                  <HardDrive size={10} />
                  <span>{tut.videoSize || "≤ 2 Go"}</span>
                </div>
              </div>

              {/* Information */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      tut.category === "Exercices corrigés"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    {tut.category}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                    {tut.level}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-[#1A237E] rounded text-[10px] font-bold">
                    {tut.subject}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#1A237E] transition-colors line-clamp-2">
                  {tut.title}
                </h3>

                {tut.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {tut.description.replace(/\$+/g, "")}
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-medium">
                  {tut.dateFormatted || "Disponible"}
                </span>
                <span className="font-bold text-[#1A237E] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Regarder le tutoriel</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <Video size={32} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">Aucun tutoriel vidéo trouvé</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Aucune vidéo ne correspond aux filtres sélectionnés (Classe, Matière ou Type). Modifiez
              vos filtres ou consultez toutes les classes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedLevel(isAdmin ? "ALL" : (userLevel || "3ème"));
              setSelectedSubject("ALL");
              setSelectedCategory("ALL");
              setSearchQuery("");
            }}
            className="px-4 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 cursor-pointer inline-flex items-center space-x-1.5"
          >
            <span>Afficher toutes les vidéos</span>
          </button>
        </div>
      )}

      {/* Video Player Modal with Quality Settings Button */}
      {selectedTutorial && (
        <TutorialVideoPlayerModal
          tutorial={selectedTutorial}
          onClose={() => setSelectedTutorial(null)}
        />
      )}
    </div>
  );
};
