import React, { useState, useEffect, useRef } from "react";
import { Course, SecondaryLevel, Subject } from "../types";
import { ALL_LEVELS, getSubjectsForLevel, getLevelLabel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { uploadCoursePdfToSupabase, uploadCourseVideoToSupabase } from "../data/supabaseStorage";
import { BookOpen, X, Edit3, Save, Trash2, Sparkles, FileText, Upload, Link2, ExternalLink, Video, Play, Film } from "lucide-react";
import { MathLiveEditor } from "./MathLiveEditor";
import { getEmbeddableDocumentUrl } from "../utils/documentUtils";
import { scrollToTopGlobal } from "./ScrollToTop";

interface EditCourseModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: Course) => void;
  onUpdateCourse?: (updated: Course) => void;
}

export const EditCourseModal: React.FC<EditCourseModalProps> = ({
  course,
  isOpen,
  onClose,
  onSave,
  onUpdateCourse,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<SecondaryLevel>("3ème");
  const [subject, setSubject] = useState<Subject>("Maths");
  const [chapter, setChapter] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [courseMathFormula, setCourseMathFormula] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Video state (up to 2 GB support)
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFileName, setVideoFileName] = useState("");
  const [videoSize, setVideoSize] = useState<string | undefined>(undefined);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setLevel(course.level);
      setSubject(course.subject);
      setChapter(course.chapter);
      setSummary(course.summary);
      setContent(course.content);
      setPdfUrl(course.pdfUrl || "");
      setPdfFileName(course.pdfFileName || "");
      setVideoUrl(course.videoUrl || "");
      setVideoFileName(course.videoFileName || "");
      setVideoSize(course.videoSize);
    }
  }, [course]);

  useEffect(() => {
    if (isOpen) {
      scrollToTopGlobal("instant");
    }
  }, [isOpen]);

  if (!isOpen || !course) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_SIZE) {
      alert("Le fichier dépasse la taille limite de 50 Mo. Veuillez sélectionner un document plus léger.");
      return;
    }

    setIsUploadingFile(true);
    setUploadProgress(20);
    try {
      const publicUrl = await uploadCoursePdfToSupabase(file, (p) => setUploadProgress(p));
      if (publicUrl) {
        setPdfUrl(publicUrl);
        setPdfFileName(file.name);
      } else {
        const objUrl = URL.createObjectURL(file);
        setPdfUrl(objUrl);
        setPdfFileName(file.name);
      }
    } catch (err) {
      console.error("Error uploading PDF in modal:", err);
      alert("Erreur lors de l'upload du document PDF.");
    } finally {
      setIsUploadingFile(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Up to 2 GB (2 * 1024 * 1024 * 1024 bytes)
    const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;
    if (file.size > MAX_VIDEO_SIZE) {
      alert("Le fichier vidéo dépasse la taille maximale autorisée de 2 Go.");
      return;
    }

    setIsUploadingVideo(true);
    setVideoUploadProgress(10);
    const sizeStr = file.size >= 1024 * 1024 * 1024 
      ? (file.size / (1024 * 1024 * 1024)).toFixed(2) + " Go" 
      : (file.size / (1024 * 1024)).toFixed(1) + " Mo";
    setVideoSize(sizeStr);
    setVideoFileName(file.name);

    try {
      const publicUrl = await uploadCourseVideoToSupabase(file, (p) => setVideoUploadProgress(p));
      if (publicUrl) {
        setVideoUrl(publicUrl);
      } else {
        // Create local object URL for preview and fallback
        const objUrl = URL.createObjectURL(file);
        setVideoUrl(objUrl);
      }
    } catch (err) {
      console.error("Error uploading video in modal:", err);
      alert("Erreur lors du téléversement de la vidéo.");
    } finally {
      setIsUploadingVideo(false);
      setTimeout(() => setVideoUploadProgress(0), 1200);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCourse: Course = {
      ...course,
      title: title.trim(),
      level,
      subject,
      chapter: chapter.trim(),
      summary: summary.trim(),
      content: content.trim(),
      pdfUrl: pdfUrl.trim() ? getEmbeddableDocumentUrl(pdfUrl.trim()) : undefined,
      pdfFileName: pdfFileName.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      videoFileName: videoFileName.trim() || undefined,
      videoSize: videoSize,
      createdAt: Date.now(),
    };
    roomRepo.updateCourse(updatedCourse);
    if (onSave) onSave(updatedCourse);
    if (onUpdateCourse) onUpdateCourse(updatedCourse);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce cours ?")) {
      roomRepo.deleteCourse(course.id);
      onClose();
    }
  };

  const handleInsertMath = (snippet: string) => {
    const textarea = contentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = content.substring(0, start);
      const after = content.substring(end);
      const newContent = before + snippet + after;
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + snippet.length, start + snippet.length);
      }, 50);
    } else {
      setContent((prev) => prev + (prev.endsWith("\n") || !prev ? "" : "\n") + snippet);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#1A237E] text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit3 size={18} className="text-amber-300" />
            <h3 className="font-extrabold text-sm sm:text-base">
              Modifier le Cours Rédigé & Support PDF
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Classe / Niveau</label>
              <select
                value={level}
                onChange={(e) => {
                  const newLevel = e.target.value as SecondaryLevel;
                  setLevel(newLevel);
                  const validSubs = getSubjectsForLevel(newLevel);
                  if (!validSubs.includes(subject)) {
                    setSubject(validSubs[0]);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-[#1A237E]"
              >
                {ALL_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>Classe de {getLevelLabel(lvl)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Matière</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-[#1A237E]"
              >
                {getSubjectsForLevel(level).map((sb) => (
                  <option key={sb} value={sb}>{sb}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Titre de la leçon rédigée</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Chapitre</label>
            <input
              type="text"
              required
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Résumé synthétique</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium"
            />
          </div>

          {/* PDF / Document Integration Section */}
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-[#1A237E] flex items-center space-x-1.5">
                <FileText size={14} className="text-amber-500" />
                <span>Document PDF / Support de cours (Optionnel)</span>
              </label>
              {pdfUrl && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                  Document attaché
                </span>
              )}
            </div>

            <div>
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="url"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  placeholder="Collez ici le lien du document ou support PDF"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-[#1A237E]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold cursor-pointer transition-colors shadow-2xs">
                <Upload size={13} className="text-indigo-600" />
                <span>{isUploadingFile ? `Envoi en cours (${uploadProgress}%)...` : "Téléverser un fichier PDF local"}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <span className="text-[10px] text-slate-400 font-medium">
                Format PDF jusqu'à 50 Mo supporté
              </span>

              {pdfUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPdfUrl("");
                    setPdfFileName("");
                  }}
                  className="text-rose-600 hover:underline text-[11px] font-bold cursor-pointer"
                >
                  Retirer le PDF
                </button>
              )}
            </div>

            {isUploadingFile && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* VIDEO INTEGRATION SECTION (Up to 2 Go / 2 GB support) */}
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border-2 border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-emerald-950 flex items-center space-x-1.5">
                <Video size={16} className="text-emerald-600" />
                <span>Support Vidéo Pédagogique (Jusqu'à 2 Go)</span>
              </label>
              {videoUrl ? (
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-md flex items-center space-x-1">
                  <Play size={10} />
                  <span>Vidéo liée</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-bold">Optionnel</span>
              )}
            </div>

            {/* Video preview if present */}
            {videoUrl && (
              <div className="rounded-xl overflow-hidden bg-black border border-emerald-300 max-h-56 relative group">
                <video
                  controls
                  src={videoUrl}
                  className="w-full max-h-52 object-contain"
                  preload="metadata"
                >
                  Votre navigateur ne supporte pas la lecture de cette vidéo.
                </video>
              </div>
            )}

            <div>
              <div className="relative">
                <Film size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="URL directe de la vidéo (MP4, YouTube, lien cloud ou Supabase)"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black cursor-pointer transition-colors shadow-2xs">
                <Upload size={13} />
                <span>
                  {isUploadingVideo
                    ? `Upload vidéo en cours (${videoUploadProgress}%)...`
                    : "Téléverser un fichier vidéo (Jusqu'à 2 Go)"}
                </span>
                <input
                  type="file"
                  accept="video/*,video/mp4,video/webm,video/quicktime,video/x-matroska"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </label>

              <span className="text-[10px] text-emerald-800 font-medium">
                MP4, WebM, MOV, MKV jusqu'à <strong>2 Go</strong>
              </span>

              {videoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl("");
                    setVideoFileName("");
                    setVideoSize(undefined);
                  }}
                  className="text-rose-600 hover:underline text-[11px] font-bold cursor-pointer"
                >
                  Retirer la vidéo
                </button>
              )}
            </div>

            {isUploadingVideo && (
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${videoUploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-emerald-800 font-semibold text-right">
                  Téléversement direct en cours... {videoUploadProgress}%
                </p>
              </div>
            )}
          </div>

          {/* Content with PERMANENT LaTeX Keyboard Toolbar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 block">
                Contenu détaillé rédigé (Texte / KaTeX LaTeX)
              </label>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                Éditeur Scientifique
              </span>
            </div>

            {/* Clavier WYSIWYG MathLive Unique & Visuel */}
            <div className="sticky top-0 z-20 shadow-md rounded-2xl overflow-hidden border border-indigo-100">
              <MathLiveEditor
                value={courseMathFormula}
                onChange={setCourseMathFormula}
                onInsertToContent={(snip) => handleInsertMath(snip)}
                placeholder="Composer ou insérer une formule visuelle dans le cours..."
              />
            </div>

            <textarea
              ref={contentTextareaRef}
              rows={8}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez le cours ici. Utilisez le clavier LaTeX ci-dessus pour insérer des fractions, intégrales, racines..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-xs leading-relaxed focus:bg-white focus:ring-2 focus:ring-[#1A237E]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-colors border border-rose-200 cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Supprimer le Cours</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow transition-colors cursor-pointer"
              >
                <Save size={15} />
                <span>Enregistrer la modification</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
