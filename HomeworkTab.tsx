import React, { useState, useEffect, useRef } from "react";
import { UserProfile, HomeworkSubmission, SecondaryLevel, Subject } from "../types";
import { STUDENT_LEVELS, getSubjectsForLevel, getLevelLabel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { subscribeToUserHomeworksSupabase } from "../data/supabaseStorage";
import { FullscreenDocumentViewerModal } from "./FullscreenDocumentViewerModal";
import { notifyHomeworkSubmitted, getUserStudentId } from "../utils/userUtils";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  Eye,
  Trash2,
  BookOpen,
  Send,
  Sparkles,
  Download,
  Calendar,
  X,
  FileCheck,
  Maximize2
} from "lucide-react";

interface HomeworkTabProps {
  user: UserProfile | null;
  onOpenLogin?: () => void;
}

export const HomeworkTab: React.FC<HomeworkTabProps> = ({ user, onOpenLogin }) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const [homeworks, setHomeworks] = useState<HomeworkSubmission[]>(() =>
    user ? roomRepo.getHomeworksByUser(user.uid) : []
  );
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Form states
  const [studentName, setStudentName] = useState(user?.displayName || "");
  const [level, setLevel] = useState<SecondaryLevel>(user?.level || "3ème");
  const availableSubjects = getSubjectsForLevel(level);
  const [subject, setSubject] = useState<Subject>(availableSubjects[0] || "Mathématiques");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [fileData, setFileData] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modal / Preview state
  const [selectedHw, setSelectedHw] = useState<HomeworkSubmission | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const DRAFT_KEY = `savoirplus_homework_draft_${user?.uid || "guest"}`;
  const [restoredDraftNotice, setRestoredDraftNotice] = useState<string | null>(null);

  // Restore draft on mount
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.title || draft.comment || draft.fileName) {
          if (draft.title) setTitle(draft.title);
          if (draft.comment) setComment(draft.comment);
          if (draft.level) setLevel(draft.level);
          if (draft.subject) setSubject(draft.subject);
          if (draft.studentName) setStudentName(draft.studentName);
          if (draft.fileName && draft.fileData) {
            setFileName(draft.fileName);
            setFileData(draft.fileData);
            setFileType(draft.fileType || "");
            setFileSize(draft.fileSize || "");
          }
          setRestoredDraftNotice("Brouillon de devoir restauré automatiquement 💾");
          setTimeout(() => setRestoredDraftNotice(null), 4000);
        }
      }
    } catch (e) {
      console.warn("Draft restore notice:", e);
    }
  }, [user?.uid]);

  // Auto-save draft on any change
  useEffect(() => {
    if (title || comment || fileData) {
      try {
        const draft = {
          title,
          comment,
          level,
          subject,
          studentName,
          fileName,
          fileData,
          fileType,
          fileSize,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.warn("Draft auto-save notice:", e);
      }
    }
  }, [title, comment, level, subject, studentName, fileName, fileData, fileType, fileSize, DRAFT_KEY]);

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle("");
    setComment("");
    setFileData("");
    setFileName("");
    setFileSize("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setRestoredDraftNotice("Brouillon effacé.");
    setTimeout(() => setRestoredDraftNotice(null), 3000);
  };

  // Subscribe to room & supabase homeworks
  useEffect(() => {
    if (!user) return;
    const unsubRoom = roomRepo.subscribe(() => {
      setHomeworks(roomRepo.getHomeworksByUser(user.uid));
    });

    const unsubSupabase = subscribeToUserHomeworksSupabase(user.uid, (remoteHws) => {
      if (remoteHws && remoteHws.length > 0) {
        remoteHws.forEach((hw) => {
          roomRepo.insertHomework(hw);
        });
        setHomeworks(roomRepo.getHomeworksByUser(user.uid));
      }
    });

    return () => {
      unsubRoom();
      unsubSupabase();
    };
  }, [user?.uid]);

  // Adjust default subject when level changes
  const handleLevelChange = (newLvl: SecondaryLevel) => {
    setLevel(newLvl);
    const subjs = getSubjectsForLevel(newLvl);
    if (!subjs.includes(subject)) {
      setSubject(subjs[0] || "Mathématiques");
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Le fichier est trop volumineux (maximum 10 Mo).");
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} Mo`
        : `${(file.size / 1024).toFixed(0)} Ko`;

    setFileName(file.name);
    setFileType(file.type || "application/pdf");
    setFileSize(sizeFormatted);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!user) {
      if (onOpenLogin) {
        onOpenLogin();
      } else {
        setErrorMsg("Veuillez vous connecter pour soumettre votre devoir.");
      }
      return;
    }

    if (!studentName.trim()) {
      setErrorMsg("Veuillez renseigner votre prénom et nom.");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Veuillez donner un titre à votre devoir ou TD.");
      return;
    }
    if (!fileData) {
      setErrorMsg("Veuillez sélectionner un fichier (PDF ou image de votre devoir rédigé).");
      return;
    }

    setIsSubmitting(true);

    try {
      const now = Date.now();
      const dateFormatted = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const studentMatricule = getUserStudentId(user);

      const newHw: HomeworkSubmission = {
        id: "hw_" + now + "_" + Math.random().toString(36).substring(2, 7),
        userUid: user.uid,
        studentMatricule,
        matricule: studentMatricule,
        studentName: studentName.trim(),
        studentEmail: user.email || "",
        level,
        subject,
        title: title.trim(),
        comment: comment.trim() || undefined,
        fileData,
        fileName,
        fileType,
        fileSize,
        submittedAt: now,
        dateFormatted,
        status: "pending",
      };

      roomRepo.insertHomework(newHw);

      notifyHomeworkSubmitted(user, title.trim(), subject, level).catch(console.warn);

      // Clear local auto-save draft
      localStorage.removeItem(DRAFT_KEY);

      setSuccessMsg("Votre devoir a été transmis avec succès à l'administrateur Massaw Seck. Vous recevrez une notification dès qu'il sera corrigé !");
      setTitle("");
      setComment("");
      setFileData("");
      setFileName("");
      setFileSize("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setErrorMsg("Erreur lors de l'enregistrement du devoir : " + (err.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeBadge = (grade: number) => {
    if (grade >= 14) {
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }
    if (grade >= 10) {
      return "bg-indigo-100 text-indigo-800 border-indigo-300";
    }
    return "bg-amber-100 text-amber-800 border-amber-300";
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-2 top-2 opacity-10 pointer-events-none">
          <Award size={140} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-400/30">
            <Sparkles size={12} />
            <span>Génie Mentor Académie (GMA) • Espace Devoirs & TD</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Rendu & Correction des Devoirs
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl leading-relaxed">
            Téléversez vos devoirs rédigés au format PDF ou image. Vos copies sont corrigées personnellement par l'administrateur <strong className="text-amber-300 font-bold">Massaw Seck</strong> (<span className="text-slate-200 underline">massaw.seck@unchk.edu.sn</span>) avec note sur 20 et conseils méthodologiques.
          </p>
        </div>
      </div>

      {/* Main Grid : Form Submission + List of Submitted Homeworks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form Column (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#1A237E] flex items-center space-x-2">
                <Upload size={18} className="text-amber-500" />
                <span>Déposer une Copie / Devoir</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Remplissez les informations et insérez votre document.
              </p>
            </div>
            {(title || comment || fileData) && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors"
                title="Effacer le formulaire et le brouillon"
              >
                Effacer brouillon
              </button>
            )}
          </div>

          {restoredDraftNotice && (
            <div className="p-2.5 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-200 text-xs flex items-center justify-between">
              <span>{restoredDraftNotice}</span>
              <button
                type="button"
                onClick={() => setRestoredDraftNotice(null)}
                className="text-[10px] text-indigo-700 font-bold ml-2"
              >
                Fermer
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center space-x-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* 1. Nom & Prénom */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Prénom et Nom de l'élève <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoCapitalize="words"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ex: Babacar Diop"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 sm:p-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#1A237E] focus:ring-0 outline-hidden transition-all"
              />
            </div>

            {/* 2. Classe & Matière in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Classe / Niveau <span className="text-rose-500">*</span>
                </label>
                <select
                  value={level}
                  onChange={(e) => handleLevelChange(e.target.value as SecondaryLevel)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 sm:p-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#1A237E] focus:ring-0 outline-hidden transition-all cursor-pointer"
                >
                  {STUDENT_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Classe de {getLevelLabel(lvl)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Matière <span className="text-rose-500">*</span>
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 sm:p-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#1A237E] focus:ring-0 outline-hidden transition-all cursor-pointer"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Titre du Devoir */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Titre du Devoir / TD <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: TD N°1 - Calcul d'Intégrales & Suites"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 sm:p-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#1A237E] focus:ring-0 outline-hidden transition-all"
              />
            </div>

            {/* 4. Commentaire facultatif */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Remarques ou questions pour le professeur (facultatif)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: J'ai eu des difficultés sur la question 3 partie B..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-[#1A237E] focus:ring-0 outline-hidden transition-all resize-none"
              />
            </div>

            {/* 5. Sélecteur de Fichier PDF / Document */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Document à joindre (PDF ou Image du devoir) <span className="text-rose-500">*</span>
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  fileName
                    ? "border-emerald-400 bg-emerald-50/50"
                    : "border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {fileName ? (
                  <div className="flex items-center justify-between text-left">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCheck size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{fileName}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{fileSize} • Prêt pour envoi</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileName("");
                        setFileData("");
                        setFileSize("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 py-1">
                    <Upload size={24} className="mx-auto text-indigo-600 mb-1" />
                    <p className="font-bold text-slate-700 text-xs">
                      Cliquez pour insérer votre fichier PDF ou photo
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Formats supportés : PDF, PNG, JPEG (Max : 10 Mo)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#1A237E] hover:bg-indigo-900 text-amber-300 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 border border-amber-400/40 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <span>Transmission du devoir en cours...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Transmettre le Devoir à Massaw Seck</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* List Column (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
                  <FileText size={18} className="text-[#1A237E]" />
                  <span>Mes Devoirs Rendus & Notes</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suivi de vos corrections, notes /20 et appréciations.
                </p>
              </div>

              <span className="px-2.5 py-1 bg-indigo-50 text-[#1A237E] font-black text-xs rounded-full border border-indigo-100">
                {homeworks.length} devoir{homeworks.length > 1 ? "s" : ""}
              </span>
            </div>

            {homeworks.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-3">
                <div className="w-14 h-14 bg-indigo-50 text-[#1A237E] rounded-2xl flex items-center justify-center mx-auto">
                  <FileText size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Aucun devoir rendu pour l'instant</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Utilisez le formulaire pour rendre votre premier devoir ou TD. L'administrateur Massaw Seck le corrigera dans les plus brefs délais.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {homeworks.map((hw) => {
                  const isGraded = hw.status === "graded";
                  return (
                    <div
                      key={hw.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isGraded
                          ? "bg-white border-emerald-200 shadow-xs hover:border-emerald-300"
                          : "bg-slate-50/70 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-[#1A237E] text-amber-300 font-bold text-[10px] rounded-md">
                              {hw.subject}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold text-[10px] rounded-md">
                              {hw.level}
                            </span>
                            {isGraded ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-md border border-emerald-300 flex items-center space-x-1">
                                <CheckCircle2 size={11} />
                                <span>Corrigé par Massaw Seck</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-md border border-amber-300 flex items-center space-x-1">
                                <Clock size={11} />
                                <span>En attente de correction</span>
                              </span>
                            )}
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                            {hw.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>Rendu le {hw.dateFormatted}</span>
                          </p>
                        </div>

                        {/* Note Badge if graded */}
                        {isGraded && typeof hw.grade20 === "number" && (
                          <div className={`px-3 py-1.5 rounded-xl border-2 font-black text-center shrink-0 ${getGradeBadge(hw.grade20)}`}>
                            <span className="block text-lg sm:text-xl leading-none font-mono">
                              {hw.grade20}/20
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold">Note</span>
                          </div>
                        )}
                      </div>

                      {/* Feedback from teacher */}
                      {isGraded && hw.feedback && (
                        <div className="mt-3 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs space-y-1">
                          <p className="font-bold text-emerald-900 flex items-center space-x-1">
                            <Award size={14} className="text-emerald-700" />
                            <span>Appréciation de Massaw Seck :</span>
                          </p>
                          <p className="text-emerald-950 italic text-xs leading-relaxed">
                            "{hw.feedback}"
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">
                          📎 {hw.fileName} {hw.fileSize ? `(${hw.fileSize})` : ""}
                        </span>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedHw(hw)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-[#1A237E] text-[#1A237E] hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <Eye size={13} />
                            <span>Consulter</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Consultation Devoir */}
      {selectedHw && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 bg-[#1A237E] text-amber-300 font-bold text-[10px] rounded-md">
                  {selectedHw.subject} • {selectedHw.level}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">{selectedHw.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHw(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Note & Feedback if graded */}
            {selectedHw.status === "graded" && typeof selectedHw.grade20 === "number" && (
              <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-900 text-xs">Note Attribuée par Massaw Seck :</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono">{selectedHw.grade20}/20</span>
                </div>
                {selectedHw.feedback && (
                  <div>
                    <span className="font-bold text-emerald-800 text-xs">Commentaires & Conseils :</span>
                    <p className="text-xs text-emerald-950 italic mt-0.5">"{selectedHw.feedback}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Student remarks if any */}
            {selectedHw.comment && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-600 block">Votre message lors de la remise :</span>
                <p className="text-slate-800 mt-0.5">{selectedHw.comment}</p>
              </div>
            )}

            {/* Preview Document */}
            <div className="space-y-2">
              <span className="font-bold text-slate-700 text-xs block">Fichier soumis :</span>
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <FileText size={20} className="text-[#1A237E] shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">{selectedHw.fileName}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setIsFullscreenOpen(true)}
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1 cursor-pointer"
                  >
                    <Maximize2 size={13} />
                    <span>Plein Écran</span>
                  </button>
                  <a
                    href={selectedHw.fileData}
                    download={selectedHw.fileName}
                    className="px-3 py-1.5 bg-[#1A237E] text-amber-300 font-bold text-xs rounded-xl flex items-center space-x-1 shadow-xs"
                  >
                    <Download size={13} />
                    <span>Télécharger</span>
                  </a>
                </div>
              </div>

              {/* In-app preview if image or data */}
              {selectedHw.fileData?.startsWith("data:image/") ? (
                <div
                  onClick={() => setIsFullscreenOpen(true)}
                  className="mt-3 rounded-xl border border-slate-200 overflow-hidden max-h-72 bg-slate-900 flex items-center justify-center cursor-pointer group relative"
                  title="Cliquer pour afficher en plein écran avec zoom"
                >
                  <img
                    src={selectedHw.fileData}
                    alt={selectedHw.fileName}
                    className="max-h-72 object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                    <Maximize2 size={18} className="mr-1.5" />
                    <span>Cliquer pour zoomer en Plein Écran</span>
                  </div>
                </div>
              ) : selectedHw.fileData?.startsWith("data:application/pdf") ? (
                <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden h-72">
                  <iframe
                    src={selectedHw.fileData}
                    title={selectedHw.fileName}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : null}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHw(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Plein Écran Sécurisé & Zoom In-App pour Élève */}
      {selectedHw && (
        <FullscreenDocumentViewerModal
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
          fileData={selectedHw.fileData}
          fileName={selectedHw.fileName}
          fileType={selectedHw.fileType}
          title={`Devoir : ${selectedHw.title}`}
          subtitle={`${selectedHw.subject} • ${selectedHw.level}`}
        />
      )}
    </div>
  );
};
