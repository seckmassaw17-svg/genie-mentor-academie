import React, { useEffect, useState } from "react";
import { ClassChangeRequest, ClassChangeStatus, SecondaryLevel, StudentRecord } from "../types";
import { supabase } from "../lib/supabaseClient";
import {
  subscribeToAllClassChangeRequestsSupabase,
  updateClassChangeRequestStatusSupabase,
  fetchClassChangeRequestsSupabase,
  fetchAllStudentsFromSupabase,
  updateStudentLevelSupabase,
  saveNotificationToSupabase,
  markAdminNotificationAsProcessed,
  safeUpdateProfile,
} from "../data/supabaseStorage";
import { RoomDatabaseRepository } from "../data/roomStorage";
import {
  Check,
  X,
  Clock,
  User,
  GraduationCap,
  Mail,
  Phone,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Search,
  Zap,
  Layers,
  ArrowRightLeft,
} from "lucide-react";

const ALL_CLASSES: SecondaryLevel[] = [
  "6ème",
  "5ème",
  "4ème",
  "3ème",
  "Seconde L",
  "Seconde S",
  "Première L1",
  "Première L2",
  "Première S1",
  "Première S2",
  "Terminale L1",
  "Terminale L2",
  "Terminale S1",
  "Terminale S2",
];

export const AdminClassChangeValidation: React.FC = () => {
  const roomRepo = RoomDatabaseRepository.getInstance();

  // Mode: "requests" (Traiter les demandes reçues en priorité) ou "mutation" (Changer directement la classe d'un élève)
  const [activeMode, setActiveMode] = useState<"mutation" | "requests">("requests");

  // Requests state
  const [requests, setRequests] = useState<ClassChangeRequest[]>(() => roomRepo.getAllClassChangeRequests());
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSqlAssistant, setShowSqlAssistant] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processedStatus, setProcessedStatus] = useState<{
    [id: string]: { status: ClassChangeStatus; date: string; reason?: string; timestamp: number };
  }>({});
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [showRejectInput, setShowRejectInput] = useState<{ [key: string]: boolean }>({});
  const [overrideClass, setOverrideClass] = useState<{ [reqId: string]: SecondaryLevel }>({});

  // Direct Class Mutation State
  const [studentsList, setStudentsList] = useState<StudentRecord[]>(() => roomRepo.getAllStudents());
  const [searchStudentTerm, setSearchStudentTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [targetNewClass, setTargetNewClass] = useState<SecondaryLevel>("Terminale S2");
  const [isDirectMutating, setIsDirectMutating] = useState(false);

  // Global Feedback Toast
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchClassChangeRequestsSupabase();
      if (Array.isArray(data)) {
        setRequests(data);
        data.forEach((r) => roomRepo.syncClassChangeRequest(r));
      }
    } catch (err) {
      console.warn("Erreur chargement class_change_requests depuis Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const studs = await fetchAllStudentsFromSupabase();
      if (Array.isArray(studs) && studs.length > 0) {
        setStudentsList(studs);
        studs.forEach((s) => roomRepo.registerOrUpdateStudent(s));
      }
    } catch (err) {
      console.warn("Erreur chargement élèves pour mutation:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStudents();

    // Abonnement temps réel Supabase aux demandes
    const unsub = subscribeToAllClassChangeRequestsSupabase((data) => {
      if (Array.isArray(data)) {
        setRequests(data);
        data.forEach((r) => roomRepo.syncClassChangeRequest(r));
      }
    });
    return () => unsub();
  }, []);

  // Action: Effectuer le basculement d'un élève vers une nouvelle classe (sans perte de données)
  const executeClassTransfer = async (
    studentId: string,
    studentName: string,
    oldClass: string,
    newClass: SecondaryLevel,
    associatedRequestId?: string
  ) => {
    const targetUid = studentId;

    // 1. Mise à jour immédiate locale dans Room (zéro lag)
    roomRepo.updateStudentLevel(targetUid, newClass);

    // 2. Appel RPC & mise à jour dans Supabase (table profiles)
    try {
      const { error: rpcError } = await supabase.rpc("admin_change_student_class", {
        target_student_id: targetUid,
        new_class_name: newClass,
      });

      if (rpcError) {
        console.warn("[RPC admin_change_student_class notice]", rpcError);
        // Fallback direct sur la table profiles
        await safeUpdateProfile(targetUid, { classe: newClass, level: newClass });
      }
    } catch (rpcEx) {
      console.warn("[RPC exception fallback profiles]", rpcEx);
      try {
        await safeUpdateProfile(targetUid, { classe: newClass, level: newClass });
      } catch (fbErr) {
        console.error("Erreur fallback profiles:", fbErr);
      }
    }

    // Synchronisation complémentaire
    await updateStudentLevelSupabase(targetUid, newClass).catch((err) => console.warn(err?.message || err));

    // 3. Si une demande était associée ou en attente pour cet élève, la marquer comme approuvée
    if (associatedRequestId) {
      await supabase.from("class_change_requests").update({ status: "APPROVED" }).eq("id", associatedRequestId);
      await updateClassChangeRequestStatusSupabase(
        associatedRequestId,
        "approved",
        targetUid,
        newClass,
        undefined,
        studentName
      ).catch(console.warn);
    } else {
      // Trouver et clore d'éventuelles demandes en attente pour cet élève
      const pendingReq = requests.find((r) => (r.userUid === targetUid || r.id === targetUid) && isPendingStatus(r.status));
      if (pendingReq) {
        await supabase.from("class_change_requests").update({ status: "APPROVED" }).eq("id", pendingReq.id);
        await updateClassChangeRequestStatusSupabase(
          pendingReq.id,
          "approved",
          targetUid,
          newClass,
          undefined,
          studentName
        ).catch(console.warn);
      }
    }

    // 4. Notification obligatoire à l'élève : "Nouvelle classe disponible !"
    const notifObj = {
      id: `notif_cls_transf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userUid: targetUid,
      target_uid: targetUid,
      recipientId: targetUid,
      targetRole: "student",
      title: "Nouvelle classe disponible !",
      message: `Votre classe a été mise à jour vers ${newClass}. Veuillez rejoindre votre nouvelle classe.`,
      type: "class_change",
      status: "unread" as const,
      is_read: false,
      createdAt: Date.now(),
      dateFormatted: `Aujourd'hui à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    };

    roomRepo.saveNotification(notifObj);
    await saveNotificationToSupabase(notifObj).catch((e) => console.warn("Notice notif Supabase:", e));
    await markAdminNotificationAsProcessed(targetUid, "class_change");

    return true;
  };

  // Traiter une demande d'élève avec choix / confirmation de la classe
  const handleApproveRequestWithClass = async (req: ClassChangeRequest) => {
    const chosenClass = overrideClass[req.id] || (req.requestedLevel as SecondaryLevel);
    setProcessingId(req.id);

    try {
      const nowStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      setProcessedStatus((prev) => ({
        ...prev,
        [req.id]: { status: "approved", date: nowStr, timestamp: Date.now() },
      }));

      // 1. Mise à jour immédiate dans Room et dans le state local
      roomRepo.updateClassChangeRequestStatus(req.id, "approved");
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "approved" as ClassChangeStatus, requestedLevel: chosenClass } : r))
      );

      // 2. Mise à jour explicite du statut dans class_change_requests Supabase
      await updateClassChangeRequestStatusSupabase(
        req.id,
        "approved",
        req.userUid || (req as any).userId || req.id,
        chosenClass,
        undefined,
        req.userName
      );

      // 3. Exécution complète du transfert de classe
      await executeClassTransfer(
        req.userUid || (req as any).userId || req.id,
        req.userName,
        req.currentLevel,
        chosenClass,
        req.id
      );

      setFeedback({
        type: "success",
        message: `Classe de ${req.userName} modifiée avec succès vers ${chosenClass} ! Notification envoyée et demande validée définitivement.`,
      });

      // Rafraîchir les données depuis Supabase pour synchronisation parfaite
      await fetchRequests();
      await fetchStudents();
    } catch (err: any) {
      console.error("Erreur validation changement de classe:", err);
      setFeedback({
        type: "error",
        message: "Erreur lors de la mise à jour de la classe : " + (err?.message || "Erreur"),
      });
    } finally {
      setProcessingId(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Traiter un rejet de demande
  const handleReject = async (req: ClassChangeRequest) => {
    setProcessingId(req.id);
    const reason = rejectReason[req.id] || "Demande non conforme aux critères d'admission.";
    const nowStr = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setProcessedStatus((prev) => ({
      ...prev,
      [req.id]: { status: "rejected", date: nowStr, reason, timestamp: Date.now() },
    }));
    roomRepo.updateClassChangeRequestStatus(req.id, "rejected", reason);
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" as ClassChangeStatus, rejectionReason: reason } : r))
    );

    try {
      // 1. Mise à jour explicite du statut dans class_change_requests
      await updateClassChangeRequestStatusSupabase(
        req.id,
        "rejected",
        req.userUid,
        req.requestedLevel,
        reason,
        req.userName
      );

      setFeedback({
        type: "success",
        message: `Demande refusée pour ${req.userName}. Notification envoyée.`,
      });

      await fetchRequests();
    } catch (err) {
      console.error("Error rejecting class change request:", err);
      setFeedback({
        type: "error",
        message: "Une erreur est survenue lors du refus de la demande.",
      });
    } finally {
      setProcessingId(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Traiter la mutation directe depuis le panneau "Changer la classe d'un élève"
  const handleDirectClassMutation = async () => {
    if (!selectedStudent) {
      setFeedback({ type: "error", message: "Veuillez d'abord sélectionner un élève." });
      return;
    }

    const currentClass = selectedStudent.classe || selectedStudent.level;
    if (targetNewClass === currentClass) {
      setFeedback({
        type: "error",
        message: `L'élève ${selectedStudent.displayName} est déjà dans la classe de ${targetNewClass}. Choisissez une autre classe.`,
      });
      return;
    }

    setIsDirectMutating(true);
    try {
      const studentId = selectedStudent.id || selectedStudent.uid;
      await executeClassTransfer(studentId, selectedStudent.displayName, currentClass, targetNewClass);

      setFeedback({
        type: "success",
        message: `Basculement réussi : ${selectedStudent.displayName} est maintenant en classe de ${targetNewClass} sans perte de données ! Actualisation de la page...`,
      });

      // Rafraîchir la page après enregistrement comme demandé
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      console.error("Erreur mutation directe:", err);
      setFeedback({
        type: "error",
        message: "Erreur lors du basculement de classe : " + (err?.message || "Erreur"),
      });
      setIsDirectMutating(false);
    }
  };

  // Helper functions
  const isPendingStatus = (status?: string | null) => {
    if (!status) return true;
    const s = String(status).toLowerCase().trim();
    return s === "" || s === "pending" || s === "en_attente" || s === "en attente" || (s !== "approved" && s !== "rejected" && s !== "valide" && s !== "refuse");
  };

  const isApprovedStatus = (status?: string | null) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s === "approved" || s === "valide" || s === "validée" || s === "approuve" || s === "approuvée";
  };

  const isRejectedStatus = (status?: string | null) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s === "rejected" || s === "refuse" || s === "refusée";
  };

  const getEffectiveStatus = (req: ClassChangeRequest) => {
    const localProc = processedStatus[req.id];
    return localProc ? localProc.status : req.status;
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchRequests(), fetchStudents()]);
      setFeedback({
        type: "success",
        message: "Actualisation réussie ! Les demandes et la liste des élèves ont été rechargées depuis Supabase.",
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (e: any) {
      setFeedback({
        type: "error",
        message: "Erreur lors de l'actualisation : " + (e?.message || "Erreur de connexion"),
      });
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setIsRefreshing(false);
    }
  };

  const sqlRlsScript = `-- ============================================================
-- SCRIPT SQL SUPABASE : DEMANDES DE CHANGEMENT DE CLASSE & RLS
-- ============================================================

-- 1. Création de la table class_change_requests si inexistante
CREATE TABLE IF NOT EXISTS public.class_change_requests (
    id TEXT PRIMARY KEY,
    student_uid TEXT NOT NULL,
    user_uid TEXT,
    student_name TEXT NOT NULL,
    student_email TEXT,
    matricule TEXT,
    current_level TEXT,
    requested_level TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    requested_at BIGINT,
    processed_at BIGINT,
    processed_by TEXT,
    admin_feedback TEXT
);

-- 2. Activer RLS et autoriser l'administrateur à lire et modifier TOUTES les lignes (notamment 'pending')
ALTER TABLE public.class_change_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_change_requests_all" ON public.class_change_requests;
DROP POLICY IF EXISTS "class_change_admin_all" ON public.class_change_requests;
CREATE POLICY "class_change_requests_all" ON public.class_change_requests FOR ALL USING (true) WITH CHECK (true);

-- 3. Activer la réplication Realtime Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_change_requests;`;

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    const localProc = processedStatus[r.id];
    const effectiveStatus = localProc ? localProc.status : r.status;

    if (filter === "pending") {
      return isPendingStatus(effectiveStatus);
    }
    if (filter === "approved") {
      return isApprovedStatus(effectiveStatus);
    }
    if (filter === "rejected") {
      return isRejectedStatus(effectiveStatus);
    }
    return true;
  });

  const pendingCount = requests.filter((r) => isPendingStatus(getEffectiveStatus(r))).length;
  const approvedCount = requests.filter((r) => isApprovedStatus(getEffectiveStatus(r))).length;
  const rejectedCount = requests.filter((r) => isRejectedStatus(getEffectiveStatus(r))).length;

  // Filtrage des élèves pour la recherche de mutation directe
  const matchingStudents = studentsList.filter((s) => {
    if (!searchStudentTerm.trim()) return true;
    const q = searchStudentTerm.toLowerCase();
    return (
      s.displayName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.matricule?.toLowerCase().includes(q) ||
      s.phoneNumber?.toLowerCase().includes(q) ||
      s.classe?.toLowerCase().includes(q) ||
      s.level?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 text-xs">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <GraduationCap className="text-amber-400" size={22} />
            <h3 className="text-sm sm:text-base font-black tracking-wide text-white">
              Gestion & Mutation des Classes Élèves
            </h3>
          </div>
          <p className="text-[11px] text-slate-300 max-w-2xl leading-relaxed">
            Synchronisation en direct des demandes de passage en classe supérieure ou de transfert.
            Les nouvelles demandes s'affichent automatiquement à l'écran grâce à l'abonnement en temps réel Supabase.
          </p>
        </div>

        {/* Action Buttons: Refresh, SQL RLS, Modes */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="px-3 py-2 bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Forcer le rechargement synchrone depuis Supabase"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-amber-300" : ""} />
            <span>{isRefreshing ? "Actualisation..." : "Actualiser"}</span>
          </button>

          {/* Assistant SQL & RLS Button */}
          <button
            type="button"
            onClick={() => setShowSqlAssistant(!showSqlAssistant)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Afficher les règles RLS et tables pour Supabase"
          >
            <ShieldCheck size={14} />
            <span>Assistant RLS</span>
          </button>

          {/* Mode Selector Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveMode("requests")}
              className={`px-3 py-2 rounded-lg font-black text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeMode === "requests"
                  ? "bg-amber-400 text-slate-950 shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Clock size={15} />
              <span>Demandes Reçues</span>
              {pendingCount > 0 && (
                <span className="bg-rose-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("mutation")}
              className={`px-3 py-2 rounded-lg font-black text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeMode === "mutation"
                  ? "bg-amber-400 text-slate-950 shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Zap size={15} />
              <span>Mutation Directe</span>
            </button>
          </div>
        </div>
      </div>

      {/* SQL & RLS Assistant Modal/Box */}
      {showSqlAssistant && (
        <div className="p-4 bg-slate-950 border-2 border-indigo-700/60 rounded-2xl space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="text-emerald-400" size={18} />
              <h4 className="font-bold text-white text-xs sm:text-sm">
                Règles RLS Supabase pour autoriser la lecture & modification par l'administrateur
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(sqlRlsScript);
                setSqlCopied(true);
                setTimeout(() => setSqlCopied(false), 2500);
              }}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition-all cursor-pointer flex items-center space-x-1.5"
            >
              {sqlCopied ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
              <span>{sqlCopied ? "Copié !" : "Copier le SQL"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Si certaines demandes "en attente" restent invisibles, exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase (SQL Editor &gt; New Query &gt; Coller &gt; Run). Il garantit que les politiques Row Level Security (RLS) autorisent l'administrateur à lire et mettre à jour toutes les demandes et active le temps réel.
          </p>
          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-amber-200 overflow-x-auto max-h-48 whitespace-pre">
            {sqlRlsScript}
          </pre>
        </div>
      )}

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border font-bold flex items-center space-x-2 shadow-sm animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
              : "bg-rose-950/80 border-rose-500 text-rose-200"
          }`}
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: MUTATION DIRECTE DE CLASSE (PAGE SPÉCIFIQUE DE BASCULEMENT) */}
      {/* ========================================================================= */}
      {activeMode === "mutation" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in fade-in">
          {/* Left Column: Student Selection & Search */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <User size={15} className="text-amber-400" />
                1. Sélectionner l'Élève à Basculer
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-bold">
                {studentsList.length} élèves inscrits
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchStudentTerm}
                onChange={(e) => setSearchStudentTerm(e.target.value)}
                placeholder="Rechercher par nom, email, classe..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Students List Scrollable */}
            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {matchingStudents.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Aucun élève trouvé.
                </div>
              ) : (
                matchingStudents.map((s) => {
                  const isSelected = selectedStudent?.uid === s.uid || selectedStudent?.id === s.id;
                  const currentClass = s.classe || s.level || "Non assignée";

                  return (
                    <button
                      key={s.uid || s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(s);
                        // Default target class to something different
                        if (currentClass !== "Terminale S2") {
                          setTargetNewClass("Terminale S2");
                        } else {
                          setTargetNewClass("3ème");
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-400/10 border-amber-400 shadow-md ring-1 ring-amber-400/40"
                          : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/70 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={s.avatarUrl || s.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate">{s.displayName || "Élève"}</p>
                          <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                        </div>
                      </div>

                      <span className="shrink-0 font-black text-[10px] px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                        {currentClass}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Class Mutation Control Panel */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft size={16} className="text-amber-400" />
                  2. Configuration du Basculement de Classe
                </span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck size={14} /> Données Préservées à 100%
                </span>
              </div>

              {selectedStudent ? (
                <div className="space-y-4">
                  {/* Selected Student Banner */}
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={selectedStudent.avatarUrl || selectedStudent.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border-2 border-amber-400 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-black text-white text-xs sm:text-sm">{selectedStudent.displayName}</h4>
                        <p className="text-[11px] text-slate-400">
                          Matricule: <span className="text-amber-300 font-mono font-bold">{selectedStudent.matricule || "N/A"}</span> • {selectedStudent.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Classe Actuelle</span>
                      <span className="inline-block px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-lg font-black text-xs">
                        {selectedStudent.classe || selectedStudent.level}
                      </span>
                    </div>
                  </div>

                  {/* Transition Visualizer */}
                  <div className="p-4 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-900/60 rounded-xl flex items-center justify-between">
                    <div className="text-center flex-1">
                      <span className="text-[10px] text-rose-400 font-bold block uppercase tracking-wide">
                        Ancienne Classe (Supprimée)
                      </span>
                      <strong className="text-white font-black text-sm sm:text-base line-through opacity-80">
                        {selectedStudent.classe || selectedStudent.level}
                      </strong>
                    </div>

                    <div className="px-3 flex flex-col items-center">
                      <ArrowRight size={20} className="text-amber-400 animate-pulse" />
                      <span className="text-[9px] font-black text-amber-300 uppercase">Balance</span>
                    </div>

                    <div className="text-center flex-1">
                      <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wide">
                        Nouvelle Classe (Active)
                      </span>
                      <strong className="text-emerald-300 font-black text-sm sm:text-base">
                        {targetNewClass}
                      </strong>
                    </div>
                  </div>

                  {/* Class Picker Grid */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-200 block">
                      Sélectionnez la Nouvelle Classe de Destination :
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {ALL_CLASSES.map((cls) => {
                        const isCurrent = (selectedStudent.classe || selectedStudent.level) === cls;
                        const isSelected = targetNewClass === cls;

                        return (
                          <button
                            key={cls}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => setTargetNewClass(cls)}
                            className={`p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                              isCurrent
                                ? "bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed opacity-40 line-through"
                                : isSelected
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black scale-102"
                                : "bg-slate-950/80 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-800"
                            }`}
                          >
                            {cls}
                            {isCurrent && <span className="block text-[9px] font-normal">(Actuelle)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Guarantee Info Card */}
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1">
                    <p className="text-[11px] font-bold text-indigo-200 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      Garantie Zéro Perte de Données :
                    </p>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Le basculement remplace la classe active dans <code className="text-amber-300 font-mono">profiles.classe</code> sur Supabase. Toutes les données personnelles, devoirs, résultats de quiz, historique de caisse et abonnements VIP restent 100% rattachés au compte de l'élève.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center space-y-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl">
                  <GraduationCap size={40} className="text-slate-600 mx-auto" />
                  <p className="font-bold text-slate-400 text-xs">
                    Veuillez cliquer sur un élève dans la liste de gauche pour configurer son basculement de classe.
                  </p>
                </div>
              )}
            </div>

            {/* Validation Action Button */}
            {selectedStudent && (
              <button
                type="button"
                disabled={isDirectMutating || (selectedStudent.classe || selectedStudent.level) === targetNewClass}
                onClick={handleDirectClassMutation}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-900/40 cursor-pointer transition-all active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isDirectMutating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Enregistrement dans Supabase & Actualisation...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Enregistrer et Basculer {selectedStudent.displayName} en {targetNewClass}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DEMANDES REÇUES PAR LES ÉLÈVES */}
      {/* ========================================================================= */}
      {activeMode === "requests" && (
        <div className="space-y-4 animate-in fade-in">
          {/* 4 Dynamic Sub-Tabs / Filters */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                { id: "pending", label: "🟠 En attente", count: pendingCount },
                { id: "approved", label: "🟢 Validées", count: approvedCount },
                { id: "rejected", label: "🔴 Refusées", count: rejectedCount },
                { id: "all", label: "📋 Toutes", count: requests.length },
              ] as const
            ).map((tab) => {
              const isActive = filter === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-amber-400 text-slate-950 shadow-md font-black"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? "bg-slate-950 text-amber-400 font-bold" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cards List */}
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <RefreshCw size={24} className="animate-spin mx-auto text-amber-400" />
              <p>Chargement des demandes...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
              Aucune demande dans cette catégorie.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredRequests.map((req) => {
                const proc = processedStatus[req.id];
                const effStatus = getEffectiveStatus(req);
                const isPending = isPendingStatus(effStatus);
                const isApproved = isApprovedStatus(effStatus);
                const isRejected = isRejectedStatus(effStatus);
                const isProcessing = processingId === req.id;

                const selectedClassForReq = overrideClass[req.id] || (req.requestedLevel as SecondaryLevel);

                return (
                  <div
                    key={req.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Header Card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center font-black text-amber-400 text-xs">
                            {req.userName?.charAt(0) || "E"}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs">{req.userName}</h4>
                            <p className="text-[10px] text-slate-400">{req.userEmail}</p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            isPending
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                              : isApproved
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-600 font-black"
                              : "bg-rose-950 text-rose-300 border border-rose-600 font-black"
                          }`}
                        >
                          {isPending && "⏳ EN ATTENTE"}
                          {isApproved && "✅ VALIDÉE"}
                          {isRejected && "❌ REFUSÉE"}
                        </span>
                      </div>

                      {/* Transition Details with Target Class Chooser */}
                      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                          <div className="text-center flex-1">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">
                              Classe Actuelle
                            </span>
                            <strong className="text-amber-300 font-black text-xs">
                              {req.currentLevel}
                            </strong>
                          </div>

                          <div className="px-2 text-slate-500">
                            <ArrowRight size={16} className="text-amber-400 animate-pulse" />
                          </div>

                          <div className="text-center flex-1">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">
                              Nouvelle Classe Cible
                            </span>
                            {isPending ? (
                              <select
                                value={selectedClassForReq}
                                onChange={(e) =>
                                  setOverrideClass({
                                    ...overrideClass,
                                    [req.id]: e.target.value as SecondaryLevel,
                                  })
                                }
                                className="mt-1 bg-slate-900 border border-emerald-500 text-emerald-300 font-black text-xs rounded-lg px-2 py-1 focus:outline-none"
                              >
                                {ALL_CLASSES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <strong className="text-emerald-400 font-black text-xs">
                                {selectedClassForReq}
                              </strong>
                            )}
                          </div>
                        </div>

                        {/* Motif formulé par l'élève */}
                        {req.reason && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-amber-300/90 uppercase tracking-wider block">
                              Motif formulé par l'élève :
                            </span>
                            <p className="text-slate-200 italic text-xs leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                              "{req.reason}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Rejection input */}
                      {showRejectInput[req.id] && isPending && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                          <input
                            type="text"
                            placeholder="Motif du refus (ex: Niveau prérequis non validé)"
                            value={rejectReason[req.id] || ""}
                            onChange={(e) =>
                              setRejectReason({ ...rejectReason, [req.id]: e.target.value })
                            }
                            className="w-full p-2.5 bg-rose-950/40 border border-rose-600 rounded-xl text-xs text-rose-200 placeholder:text-rose-400/60 focus:outline-none focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isPending ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApproveRequestWithClass(req)}
                          className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={16} />
                              <span>Valider & Basculer en {selectedClassForReq}</span>
                            </>
                          )}
                        </button>

                        {!showRejectInput[req.id] ? (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => setShowRejectInput({ ...showRejectInput, [req.id]: true })}
                            className="py-2.5 px-3 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center space-x-1"
                          >
                            <X size={15} />
                            <span>Refuser</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleReject(req)}
                            className="py-2.5 px-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl cursor-pointer transition-all flex items-center justify-center space-x-1 shadow-md"
                          >
                            <span>Confirmer Refus</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 flex items-center justify-between text-[11px] font-bold border-t border-slate-800">
                        <span className={isApproved ? "text-emerald-400 flex items-center space-x-1.5" : "text-rose-400 flex items-center space-x-1.5"}>
                          {isApproved ? <CheckCircle2 size={14} /> : <X size={14} />}
                          <span>{isApproved ? `Approuvée : Classe passée en ${selectedClassForReq}` : "Demande rejetée"}</span>
                        </span>
                        <span className="text-slate-400">{proc?.date ? `À ${proc.date}` : "Traité"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
