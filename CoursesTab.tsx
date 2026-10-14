import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Course, Asset, Subject, SecondaryLevel } from "../types";
import { ALL_LEVELS, STUDENT_LEVELS, getSubjectsForLevel, getLevelLabel, normalizeLevel } from "../data/mockData";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { EditCourseModal } from "./EditCourseModal";
import { VipModal } from "./VipModal";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { MathRenderer } from "./MathRenderer";
import { getEmbeddableDocumentUrl } from "../utils/documentUtils";
import { scrollToTopGlobal } from "./ScrollToTop";
import { 
  BookOpen, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  CheckCircle, 
  Sparkles, 
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  Play,
  Edit3,
  Trash2,
  Lock,
  Star,
  ArrowLeft,
  GraduationCap,
  Layers,
  CheckCircle2,
  Atom,
  Calculator,
  Compass,
  Languages,
  Globe2,
  BookMarked,
  Maximize2
} from "lucide-react";

interface CoursesTabProps {
  userLevel: SecondaryLevel;
  courses: Course[];
  assets: Asset[];
  selectedCourse: Course | null;
  onSelectCourse: (course: Course | null) => void;
  onToggleCacheAsset: (assetId: string) => void;
  onStartQuizForSubject?: (subject: Subject) => void;
  isAdmin?: boolean;
  isVIP?: boolean;
  isGuest?: boolean;
  onOpenLogin?: () => void;
  userUid?: string;
  userName?: string;
  userPhone?: string;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({
  userLevel,
  courses,
  assets,
  selectedCourse,
  onSelectCourse,
  onToggleCacheAsset,
  onStartQuizForSubject,
  isAdmin,
  isVIP,
  isGuest: isGuestProp,
  onOpenLogin,
  userUid,
  userName,
  userPhone,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const isGuest = isGuestProp ?? (!userUid || userUid === "guest" || userUid === "");

  const [selectedLevel, setSelectedLevel] = useState<SecondaryLevel | "ALL">(isAdmin ? "ALL" : (userLevel || "ALL"));
  const activeLevel = isAdmin ? selectedLevel : (userLevel || "ALL");

  // Synchroniser automatiquement la classe active dès que le niveau de l'élève est modifié
  useEffect(() => {
    if (!isAdmin && userLevel) {
      setSelectedLevel(userLevel);
    }
  }, [userLevel, isAdmin]);

  const availableSubjects = activeLevel === "ALL"
    ? ["Maths", "Physique-Chimie", "SVT", "Français", "Histoire-Géo", "Anglais", "Philo"] as Subject[]
    : getSubjectsForLevel(activeLevel);
  let routeMatiere: string | undefined = undefined;
  let routerNavigate: ((path: string) => void) | null = null;
  try {
    const params = useParams<{ matiere?: string }>();
    if (params.matiere) {
      routeMatiere = decodeURIComponent(params.matiere);
    }
    const nav = useNavigate();
    routerNavigate = (path: string) => nav(path);
  } catch {
    // Non-router fallback
  }

  // activeViewSubject: null means the user is on the subject selection hub; a Subject string means they are viewing that subject's lessons
  const [activeViewSubject, setActiveViewSubject] = useState<Subject | "ALL" | null>(() => {
    if (routeMatiere) return routeMatiere as Subject;
    return null;
  });

  // Réinitialisation immédiate du défilement au sommet lors des changements de vue
  useEffect(() => {
    scrollToTopGlobal("instant");
  }, [activeViewSubject, selectedCourse, selectedLevel]);

  useEffect(() => {
    if (routeMatiere) {
      setActiveViewSubject(routeMatiere as Subject);
    } else {
      setActiveViewSubject(null);
    }
  }, [routeMatiere]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewerAsset, setViewerAsset] = useState<Asset | null>(null);
  const [viewerVideoUrl, setViewerVideoUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>("");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);

  const handleDeleteCourse = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    roomRepo.deleteCourse(course.id);
    if (selectedCourse?.id === course.id) {
      onSelectCourse(null);
    }
  };

  const handleOpenEditCourse = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setEditingCourse(course);
  };

  const openAssetViewer = (ast: Asset) => {
    if (ast.isPremium && !isVIP && !isAdmin) {
      setIsVipModalOpen(true);
      return;
    }
    setViewerAsset(ast);
    setViewerVideoUrl(null);
    setViewerTitle(ast.name);
    setIsViewerOpen(true);
  };

  const handleCacheAsset = (ast: Asset) => {
    if (ast.isPremium && !isVIP && !isAdmin) {
      setIsVipModalOpen(true);
      return;
    }
    onToggleCacheAsset(ast.assetId);
  };

  const openVideoViewer = (courseTitle: string) => {
    setViewerAsset(null);
    setViewerVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    setViewerTitle(`Capsule Vidéo Explicative : ${courseTitle}`);
    setIsViewerOpen(true);
  };

  // FILTERING BY ACTIVE LEVEL (Merge direct Supabase courses prop + local cache)
  const allCoursesList = roomRepo.getAllCourses();
  const mergedMap = new Map<string, Course>();
  allCoursesList.forEach((c) => mergedMap.set(c.id, c));
  courses.forEach((c) => mergedMap.set(c.id, c));
  const coursesSource = Array.from(mergedMap.values());

  // Direct fetch fallback if courses list is empty on mount
  useEffect(() => {
    if (coursesSource.length === 0) {
      import("../data/supabaseStorage").then(({ getCoursesByLevelSupabase }) => {
        getCoursesByLevelSupabase().then((remote) => {
          if (remote && remote.length > 0) {
            roomRepo.syncCoursesFromFirebase(remote);
          }
        }).catch(console.warn);
      });
    }
  }, []);
  const levelFilteredCourses = coursesSource.filter((c) => {
    const matchesLevel = (isAdmin && activeLevel === "ALL") || c.level === activeLevel || normalizeLevel(c.level) === normalizeLevel(activeLevel);
    const matchesSubject = (isAdmin && activeLevel === "ALL") || availableSubjects.includes(c.subject);
    return matchesLevel && matchesSubject;
  });

  // Get course count per subject
  const getSubjectCourseCount = (subj: Subject) => {
    return levelFilteredCourses.filter((c) => c.subject === subj).length;
  };

  // Subject icon helper
  const getSubjectIcon = (subj: Subject) => {
    switch (subj) {
      case "Maths":
        return <Calculator size={22} className="text-[#1A237E]" />;
      case "Physique-Chimie":
        return <Atom size={22} className="text-[#1A237E]" />;
      case "SVT":
        return <Compass size={22} className="text-[#1A237E]" />;
      case "Français":
        return <BookMarked size={22} className="text-[#1A237E]" />;
      case "Histoire-Géo":
        return <Globe2 size={22} className="text-[#1A237E]" />;
      case "Anglais":
        return <Languages size={22} className="text-[#1A237E]" />;
      case "Philo":
        return <GraduationCap size={22} className="text-[#1A237E]" />;
      default:
        return <BookOpen size={22} className="text-[#1A237E]" />;
    }
  };

  // Subject and search query filtering for the lessons view
  const displayedCourses = levelFilteredCourses.filter((course) => {
    const matchesSubject = activeViewSubject === "ALL" || course.subject === activeViewSubject;
    const matchesSearch =
      (course.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.chapter || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.summary || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4 pb-24 min-w-0">
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
              <span className="text-slate-400 font-medium">({levelFilteredCourses.length} cours)</span>
            </div>
          </div>

          {/* Horizontal scrollable class selector pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-300">
            <button
              type="button"
              onClick={() => {
                setSelectedLevel("ALL");
                setActiveViewSubject(null);
              }}
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
                  onClick={() => {
                    setSelectedLevel(lvl);
                    setActiveViewSubject(null);
                  }}
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

      {/* VIEW 1: SUBJECT SELECTION HUB (Boutons cliquables par matière pour ne pas encombrer la page) */}
      {activeViewSubject === null ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                <Layers size={18} className="text-[#1A237E]" />
                <span>Choisissez une matière pour voir ses cours :</span>
              </h3>
              <p className="text-xs text-slate-500">
                Cliquez sur un bouton pour accéder immédiatement aux leçons et fiches correspondantes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveViewSubject("ALL")}
              className="px-3 py-1.5 text-xs font-bold text-[#1A237E] bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              Voir tout le programme
            </button>
          </div>

          {/* Grid of Clickable Subject Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availableSubjects.map((subj) => {
              const count = getSubjectCourseCount(subj);
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => {
                    setActiveViewSubject(subj);
                    setSearchQuery("");
                    if (routerNavigate) routerNavigate(`/cours/${encodeURIComponent(subj)}`);
                  }}
                  className="bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-[#1A237E] p-4 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] text-left flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getSubjectIcon(subj)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-[#1A237E] transition-colors truncate">
                        {subj}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {count > 0 ? `${count} leçon${count > 1 ? "s" : ""} rédigée${count > 1 ? "s" : ""}` : "Aucune leçon pour l'instant"}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#1A237E] group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shrink-0">
                    <ChevronRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW 2: COURSES OF THE SELECTED SUBJECT */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveViewSubject(null);
                if (routerNavigate) routerNavigate("/cours");
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>Toutes les matières</span>
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-black px-3 py-1 bg-[#1A237E] text-white rounded-xl">
                {activeViewSubject === "ALL" ? "Toutes les matières" : activeViewSubject}
              </span>
              <span className="text-xs text-slate-500 font-bold hidden sm:inline">
                ({displayedCourses.length} cours)
              </span>
            </div>
          </div>

          {/* Quick Subject Switching Bar */}
          <div className="w-full max-w-full flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setActiveViewSubject("ALL");
                if (routerNavigate) routerNavigate("/cours");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeViewSubject === "ALL"
                  ? "bg-[#1A237E] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Tous
            </button>
            {availableSubjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => {
                  setActiveViewSubject(subj);
                  if (routerNavigate) routerNavigate(`/cours/${encodeURIComponent(subj)}`);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  activeViewSubject === subj
                    ? "bg-[#1A237E] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {subj}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={`Rechercher dans les cours ${activeViewSubject === "ALL" ? "" : "de " + activeViewSubject}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E] focus:border-transparent text-slate-800 placeholder-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Course List */}
          {displayedCourses.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-3">
              <BookOpen size={36} className="mx-auto text-slate-300" />
              <div>
                <h3 className="font-bold text-slate-700 text-sm">Aucun cours trouvé</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Aucun cours ne correspond à votre recherche en {activeViewSubject} ({activeLevel}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveViewSubject(null);
                }}
                className="px-4 py-2 bg-[#1A237E] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Retour aux matières
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full max-w-full overflow-hidden">
              {displayedCourses.map((course, idx) => {
                const courseAssets = assets.filter((a) => a.parentId === course.id);
                const isLockedForGuest = isGuest && idx > 0;

                const handleCourseClick = () => {
                  if (isLockedForGuest) {
                    if (onOpenLogin) {
                      onOpenLogin();
                    } else if (routerNavigate) {
                      routerNavigate("/login");
                    }
                    return;
                  }
                  onSelectCourse(course);
                };

                return (
                  <div
                    key={course.id}
                    onClick={handleCourseClick}
                    className={`rounded-2xl p-4 border transition-all duration-200 space-y-2 group min-w-0 w-full overflow-hidden relative cursor-pointer ${
                      isLockedForGuest
                        ? "bg-slate-50/90 border-slate-200 hover:border-amber-400 hover:shadow-md"
                        : "bg-white border-slate-200 hover:border-[#1A237E] hover:shadow-lg hover:-translate-y-1 active:scale-[0.99]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-[#1A237E] font-extrabold text-xs rounded-lg border border-indigo-100 shrink-0">
                            {course.subject}
                          </span>
                          {isGuest && (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg shrink-0 flex items-center space-x-1 ${
                              idx === 0
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}>
                              {idx === 0 ? (
                                <span>Aperçu Gratuit 🔓</span>
                              ) : (
                                <>
                                  <Lock size={11} />
                                  <span>Verrouillé 🔒</span>
                                </>
                              )}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 font-medium truncate">{course.chapter}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-[#1A237E] transition-colors break-words">
                          {course.title}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {isAdmin && (
                          <div className="flex items-center space-x-1 bg-amber-50 p-1 rounded-xl border border-amber-200" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditCourse(e, course)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] sm:text-[11px] rounded-lg flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                              title="Modifier cette leçon"
                            >
                              <Edit3 size={12} />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCourse(e, course)}
                              className="px-1.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] sm:text-[11px] rounded-lg flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                              title="Supprimer cette leçon"
                            >
                              <Trash2 size={12} />
                              <span>Suppr.</span>
                            </button>
                          </div>
                        )}
                        {isLockedForGuest ? (
                          <Lock size={18} className="text-amber-500 shrink-0" />
                        ) : (
                          <ChevronRight size={18} className="text-slate-400 group-hover:text-[#1A237E] transition-colors shrink-0" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed break-words">
                      {course.summary}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center space-x-1 font-medium truncate">
                        <FileText size={12} className="text-indigo-600 shrink-0" />
                        <span>{courseAssets.length} ressource(s)</span>
                      </span>
                      {isLockedForGuest ? (
                        <span className="text-amber-600 font-black flex items-center space-x-1 shrink-0">
                          <Lock size={12} />
                          <span>Connexion requise →</span>
                        </span>
                      ) : (
                        <span className="text-[#1A237E] font-extrabold group-hover:underline shrink-0">Lire le cours →</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#1A237E] text-white p-5 flex items-start justify-between">
              <div className="space-y-1 pr-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-amber-400 text-[#1A237E] font-black text-xs rounded-md">
                    {selectedCourse.subject}
                  </span>
                  <span className="text-xs text-indigo-200">{selectedCourse.chapter}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{selectedCourse.title}</h3>
              </div>
              <button
                onClick={() => onSelectCourse(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Summary with Math formula support */}
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
                <h4 className="text-xs font-bold text-[#1A237E] uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Résumé Pédagogique</span>
                </h4>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  <MathRenderer content={selectedCourse.summary} />
                </div>
              </div>

              {/* Integrated PDF / Document Viewer (if course has a linked document) */}
              {selectedCourse.pdfUrl && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-[#1A237E] uppercase tracking-wider flex items-center space-x-1.5">
                      <FileText size={15} className="text-indigo-600" />
                      <span>Support de Cours / Document PDF Intégré</span>
                    </h4>
                    <div className="flex items-center space-x-2">
                      <a
                        href={selectedCourse.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-[#1A237E] font-bold text-[11px] rounded-lg transition-colors flex items-center space-x-1 shadow-2xs"
                      >
                        <ExternalLink size={12} />
                        <span>Ouvrir en plein écran</span>
                      </a>
                    </div>
                  </div>

                  <div className="w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 shadow-inner relative group min-h-[360px] sm:min-h-[460px]">
                    <iframe
                      src={getEmbeddableDocumentUrl(selectedCourse.pdfUrl)}
                      className="w-full h-[360px] sm:h-[460px] border-0"
                      title={`Document ${selectedCourse.title}`}
                      allow="autoplay"
                    />
                  </div>
                </div>
              )}

              {/* Full Content with KaTeX Math Formula Rendering */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contenu Détaillé du Cours (Texte & Formules Scientifiques)
                  </h4>
                </div>
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 text-xs sm:text-sm leading-relaxed font-sans text-slate-800">
                  <MathRenderer content={selectedCourse.content} />
                </div>
              </div>

              {/* Attached Assets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ressources & Documents Associés
                </h4>
                {assets.filter((a) => a.parentId === selectedCourse.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">
                    Aucun document PDF ou fiche annexe pour ce cours.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assets
                      .filter((a) => a.parentId === selectedCourse.id)
                      .map((ast) => (
                        <div
                          key={ast.assetId}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#1A237E] flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{ast.name}</p>
                              <p className="text-[10px] text-slate-400">{ast.size}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => openAssetViewer(ast)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#1A237E] font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <Eye size={12} />
                              <span>Lire</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (ast.downloadUrl) {
                                  window.open(ast.downloadUrl, "_blank");
                                } else {
                                  openAssetViewer(ast);
                                }
                              }}
                              className="p-1.5 rounded-lg border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-indigo-300 transition-colors cursor-pointer"
                              title="Télécharger ou ouvrir le document PDF"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Start Quiz Action if available */}
              {onStartQuizForSubject && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const subj = selectedCourse.subject;
                      onSelectCourse(null);
                      onStartQuizForSubject(subj);
                    }}
                    className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle size={16} className="text-amber-300" />
                    <span>Tester mes connaissances sur ce cours (Quiz)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => onSelectCourse(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {isViewerOpen && (
        <DocumentViewerModal
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setViewerAsset(null);
            setViewerVideoUrl(null);
          }}
          asset={viewerAsset}
          videoUrl={viewerVideoUrl}
          title={viewerTitle}
          onToggleOfflineCache={handleCacheAsset}
        />
      )}

      {/* VIP Modal Trigger if locked */}
      {isVipModalOpen && (
        <VipModal
          isOpen={isVipModalOpen}
          onClose={() => setIsVipModalOpen(false)}
          userUid={userUid}
          userName={userName}
          userPhone={userPhone}
          userLevel={userLevel}
        />
      )}

      {/* Edit Course Modal for Admin */}
      {editingCourse && (
        <EditCourseModal
          isOpen={!!editingCourse}
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={(updated) => {
            roomRepo.updateCourse(updated);
            setEditingCourse(null);
          }}
        />
      )}
    </div>
  );
};
