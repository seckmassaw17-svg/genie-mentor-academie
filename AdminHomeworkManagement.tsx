import React, { useState, useEffect } from "react";
import { HomeworkSubmission, HomeworkStatus, SecondaryLevel, Subject } from "../types";
import { RoomDatabaseRepository } from "../data/roomStorage";
import {
  submitHomeworkToSupabase,
  subscribeToAllHomeworksSupabase,
  saveNotificationToSupabase,
} from "../data/supabaseStorage";
import { ALL_LEVELS, ALL_SUBJECTS } from "../data/mockData";
import { FullscreenDocumentViewerModal } from "./FullscreenDocumentViewerModal";
import { MathLiveEditor } from "./MathLiveEditor";
import {
  FileCheck,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  User,
  Calendar,
  Download,
  FileText,
  Edit3,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Maximize2,
  MessageSquare,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export const AdminHomeworkManagement: React.FC = () => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>(() =>
    roomRepo.getAllHomeworks()
  );
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | HomeworkStatus>("ALL");
  const [levelFilter, setLevelFilter] = useState<"ALL" | SecondaryLevel>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<"ALL" | Subject>("ALL");

  // Grading Form State
  const [gradeInput, setGradeInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [mathFeedbackFormula, setMathFeedbackFormula] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  // Real-time Supabase sync
  useEffect(() => {
    const unsub = subscribeToAllHomeworksSupabase((remoteList) => {
      if (remoteList && remoteList.length > 0) {
        remoteList.forEach((hw) => roomRepo.saveHomework(hw));
        setSubmissions(remoteList);
      }
    });

    const refreshLocal = () => {
      setSubmissions(roomRepo.getAllHomeworks());
    };
    const unsubLocal = roomRepo.subscribe(refreshLocal);

    return () => {
      unsub();
      unsubLocal();
    };
  }, []);

  // When selected submission changes, preload grading form
  useEffect(() => {
    if (selectedSubmission) {
      setGradeInput(
        selectedSubmission.grade !== undefined ? selectedSubmission.grade.toString() : ""
      );
      setFeedbackInput(selectedSubmission.adminFeedback || "");
      setSaveSuccessMsg("");
      setSaveErrorMsg("");
    }
  }, [selectedSubmission]);

  // Filtered submissions
  const filteredList = submissions.filter((sub) => {
    if (statusFilter !== "ALL" && sub.status !== statusFilter) return false;
    const subLvl = sub.level || (sub as any).studentLevel;
    if (levelFilter !== "ALL" && subLvl !== levelFilter) return false;
    if (subjectFilter !== "ALL" && sub.subject !== subjectFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (sub.studentName || "").toLowerCase().includes(q);
      const matchTitle = (sub.title || "").toLowerCase().includes(q);
      const matchSubject = (sub.subject || "").toLowerCase().includes(q);
      const matchMatricule = (sub.studentMatricule || sub.matricule || "").toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchSubject && !matchMatricule) return false;
    }
    return true;
  });

  const pendingCount = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "GRADING").length;
  const gradedCount = submissions.filter((s) => s.status === "GRADED").length;

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const numGrade = parseFloat(gradeInput);
    if (isNaN(numGrade) || numGrade < 0 || numGrade > 20) {
      setSaveErrorMsg("Veuillez saisir une note valide entre 0 et 20.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    const updatedSubmission: HomeworkSubmission = {
      ...selectedSubmission,
      grade: numGrade,
      maxGrade: 20,
      adminFeedback: feedbackInput.trim() || "Devoir corrigé et validé par Massaw Seck.",
      status: "GRADED",
      correctedAt: Date.now(),
      correctedBy: "Massaw Seck (massaw.seck@unchk.edu.sn)",
      syncedWithFirebase: true,
    };

    try {
      // 1. Save in local Room repository
      roomRepo.saveHomework(updatedSubmission);

      // 2. Save in Supabase
      await submitHomeworkToSupabase(updatedSubmission);

      // 3. Send Notification to the student
      const notifMsg = `Votre devoir « ${selectedSubmission.title} » (${selectedSubmission.subject}) a été corrigé par M. Massaw Seck. Note attribuée : ${numGrade}/20.`;
      
      const notifId = "notif_hw_" + Date.now();
      const newNotif = {
        id: notifId,
        target_uid: selectedSubmission.userUid,
        targetUid: selectedSubmission.userUid,
        userUid: selectedSubmission.userUid,
        userId: selectedSubmission.userUid,
        recipientId: selectedSubmission.userUid,
        title: "📝 Devoir Corrigé - Note disponible !",
        message: notifMsg,
        type: "general" as const,
        createdAt: Date.now(),
        dateFormatted: `Le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        status: "unread" as const,
      };
      
      roomRepo.saveNotification(newNotif);
      await saveNotificationToSupabase(newNotif);

      setSelectedSubmission(updatedSubmission);
      setSaveSuccessMsg(`Note de ${numGrade}/20 et appréciation enregistrées avec succès ! L'élève a été notifié.`);
    } catch (err: any) {
      console.error("Error saving correction:", err);
      setSaveErrorMsg("Erreur lors de l'enregistrement : " + (err?.message || "Vérifiez votre connexion"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Stats Banner */}
      <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-200/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black">
                <FileCheck size={18} />
              </div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Gestion des Devoirs & Travaux Dirigés (TD)
              </h3>
            </div>
            <p className="text-xs text-indigo-200">
              Espace de correction pour l'administrateur <strong className="text-amber-300">Massaw Seck</strong> (massaw.seck@unchk.edu.sn).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-center">
              <span className="text-[10px] text-amber-200 block uppercase font-bold">À Corriger</span>
              <span className="text-base font-black text-amber-400">{pendingCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-center">
              <span className="text-[10px] text-emerald-200 block uppercase font-bold">Corrigés</span>
              <span className="text-base font-black text-emerald-400">{gradedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is List, Right is Detail & Grading Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Submissions List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2.5 shadow-xs">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher élève, devoir, matière..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">Tous Statuts</option>
                <option value="SUBMITTED">À Corriger</option>
                <option value="GRADED">Corrigés</option>
              </select>

              {/* Level Filter */}
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">Toutes Classes</option>
                {ALL_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>

              {/* Subject Filter */}
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate"
              >
                <option value="ALL">Toutes Matières</option>
                {ALL_SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submissions List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredList.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-2">
                <FileText className="mx-auto text-slate-400" size={28} />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Aucun devoir trouvé
                </p>
                <p className="text-[10px] text-slate-400">
                  Les devoirs rendus par les élèves apparaîtront ici.
                </p>
              </div>
            ) : (
              filteredList.map((sub) => {
                const isSelected = selectedSubmission?.id === sub.id;
                const isGraded = sub.status === "GRADED";
                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer text-left space-y-2 ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-[#1A237E] dark:border-indigo-400 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <User size={13} className="text-[#1A237E] dark:text-amber-400" />
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {sub.studentName}
                          </span>
                          {(sub.studentMatricule || sub.matricule) && (
                            <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 font-mono text-[9px] font-bold rounded">
                              {sub.studentMatricule || sub.matricule}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
                          <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold rounded">
                            {sub.level || (sub as any).studentLevel}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {sub.subject}
                          </span>
                        </div>
                      </div>

                      {isGraded ? (
                        <div className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-black text-xs border border-emerald-300">
                          {sub.grade !== undefined ? sub.grade : sub.grade20}/20
                        </div>
                      ) : (
                        <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                          À corriger
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {sub.title}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <Calendar size={10} />
                        <span>{sub.dateFormatted.split(" à ")[0].replace("Le ", "")}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Submission Inspector & Grading Console */}
        <div className="lg:col-span-7">
          {selectedSubmission ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              {/* Top Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-[#1A237E] text-white font-extrabold text-[10px] rounded-lg">
                      {selectedSubmission.studentLevel}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-[#1A237E] dark:text-indigo-300 font-extrabold text-[10px] rounded-lg border border-indigo-200">
                      {selectedSubmission.subject}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base">
                    {selectedSubmission.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Élève : <strong className="text-slate-800 dark:text-slate-200">{selectedSubmission.studentName}</strong> • {selectedSubmission.dateFormatted}
                  </p>
                </div>

                {selectedSubmission.status === "GRADED" && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-xl text-center">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">
                      Note Attribuée
                    </span>
                    <span className="text-xl font-black text-emerald-800 dark:text-emerald-400">
                      {selectedSubmission.grade} / 20
                    </span>
                  </div>
                )}
              </div>

              {/* Student Comments if any */}
              {selectedSubmission.studentComment && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase mb-0.5">
                    Commentaire de l'élève :
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 italic font-medium">
                    « {selectedSubmission.studentComment} »
                  </p>
                </div>
              )}

              {/* Document / PDF Reader Preview */}
              <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-amber-400" />
                    <span>Fichier de la copie élève</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedSubmission.fileType}
                  </span>
                </div>

                {/* File Render Box */}
                <div className="bg-slate-800 rounded-lg p-3 text-center space-y-2 border border-slate-700">
                  {selectedSubmission.fileData.startsWith("data:image/") ? (
                    <div className="max-h-60 overflow-y-auto rounded bg-black/40 p-1 flex justify-center">
                      <img
                        src={selectedSubmission.fileData}
                        alt="Copie Devoir"
                        className="max-h-56 object-contain rounded"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-400 mx-auto flex items-center justify-center font-black text-lg">
                        PDF
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        {selectedSubmission.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Document PDF prêt pour la lecture et correction.
                      </p>
                    </div>
                  )}

                  {/* Actions on file */}
                  <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-slate-700/60">
                    <a
                      href={selectedSubmission.fileData}
                      download={selectedSubmission.fileName}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#1A237E] font-black text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow"
                    >
                      <Download size={13} />
                      <span>Télécharger le Devoir</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setIsFullscreenOpen(true)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Maximize2 size={13} />
                      <span>Ouvrir en Plein Écran</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback messages */}
              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {saveErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {/* Grading Form */}
              <form onSubmit={handleSaveCorrection} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Note (/20) *
                    </label>
                    <div className="relative">
                      <Award size={16} className="absolute left-3 top-3 text-amber-500" />
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        required
                        value={gradeInput}
                        onChange={(e) => setGradeInput(e.target.value)}
                        placeholder="Ex: 16.5"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono font-black text-[#1A237E] dark:text-amber-300 focus:ring-2 focus:ring-[#1A237E]"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Correcteur Officiel
                    </label>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Massaw Seck (massaw.seck@unchk.edu.sn)
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>Appréciation Pédagogique & Remarques sur le PDF *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Visible par l'élève</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Ex: Très bon travail sur les équations différentielles. Attention toutefois aux unités dans la conclusion..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1A237E] mb-2"
                  />
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 space-y-1.5">
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                      Clavier Unique MathLive & Chimie (Insérer dans la remarque) :
                    </span>
                    <MathLiveEditor
                      value={mathFeedbackFormula}
                      onChange={setMathFeedbackFormula}
                      placeholder="Composez une formule (ex: fraction, racine de x², molécule)..."
                      helperText="Les symboles et combinaisons s'affichent directement sans code."
                      showPreview={false}
                    />
                    {mathFeedbackFormula && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackInput((prev) => prev + (prev ? " " : "") + mathFeedbackFormula);
                            setMathFeedbackFormula("");
                          }}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <span>Insérer la formule dans la remarque</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    <span>
                      {selectedSubmission.status === "GRADED"
                        ? "Mettre à jour la Note & Notification"
                        : "Enregistrer la Note & Notifier l'Élève"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3 h-full flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#1A237E] flex items-center justify-center">
                <FileCheck size={28} />
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                Sélectionnez un devoir dans la liste
              </h4>
              <p className="text-xs text-slate-400 max-w-xs">
                Cliquez sur un devoir soumis à gauche pour visualiser la copie PDF de l'élève, saisir sa note sur 20 et envoyer ses annotations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Plein Écran Sécurisé & Zoom In-App */}
      {selectedSubmission && (
        <FullscreenDocumentViewerModal
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
          fileData={selectedSubmission.fileData}
          fileName={selectedSubmission.fileName}
          fileType={selectedSubmission.fileType}
          title={`Devoir de ${selectedSubmission.studentName} — ${selectedSubmission.subject}`}
          subtitle={`${selectedSubmission.level} • ${selectedSubmission.title}`}
        />
      )}
    </div>
  );
};
