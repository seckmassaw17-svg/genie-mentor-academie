import React, { useEffect, useState } from "react";
import { VIPPaymentRequest, VIPRequestStatus } from "../types";
import { supabase } from "../supabaseClient";
import {
  subscribeToVIPPaymentRequestsSupabase,
  updateVIPPaymentRequestStatusSupabase,
  fetchVIPPaymentRequestsSupabase,
  markAdminNotificationAsProcessed,
  safeUpdateProfile,
  safeUpdateSupabaseTable,
} from "../data/supabaseStorage";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { computeExpirationTimestamp, VIP_PLANS } from "../utils/vipUtils";
import {
  Check,
  X,
  Clock,
  Phone,
  FileText,
  User,
  Mail,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Crown,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export const AdminPaymentValidation: React.FC = () => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const [requests, setRequests] = useState<VIPPaymentRequest[]>(() => roomRepo.getAllVIPPaymentRequests());
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processedStatus, setProcessedStatus] = useState<{
    [id: string]: { status: VIPRequestStatus; date: string; reason?: string; timestamp: number };
  }>({});
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [showRejectInput, setShowRejectInput] = useState<{ [key: string]: boolean }>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSqlAssistant, setShowSqlAssistant] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const fetchRequests = async () => {
    try {
      const data = await fetchVIPPaymentRequestsSupabase();
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (err) {
      console.warn("Erreur fetch VIP requests:", err);
    }
  };

  useEffect(() => {
    fetchRequests();

    const unsub = subscribeToVIPPaymentRequestsSupabase((data) => {
      if (Array.isArray(data)) {
        setRequests(data);
      }
    });
    return () => unsub();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRequests();
      setFeedback({
        type: "success",
        message: "Actualisation réussie ! Les souscriptions VIP ont été rechargées depuis Supabase.",
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: "Erreur lors du rafraîchissement : " + (err?.message || "Erreur"),
      });
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setIsRefreshing(false);
    }
  };

  const sqlRlsScript = `-- ============================================================
-- SCRIPT SQL SUPABASE : PAIEMENTS VIP & TRANSACTIONS EN LIGNE
-- ============================================================

-- 1. Table vip_payment_requests
CREATE TABLE IF NOT EXISTS public.vip_payment_requests (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    user_uid TEXT NOT NULL,
    user_id TEXT,
    student_phone TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    plan_id TEXT,
    plan_title TEXT,
    duration_months INT,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_ref TEXT,
    phone_number TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    date_formatted TEXT,
    screenshot_url TEXT
);

-- 2. Table payment_transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_id TEXT,
    course_id TEXT,
    course_title TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_ref TEXT,
    phone_number TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    date_formatted TEXT,
    screenshot_url TEXT
);

-- 3. Activation de Row Level Security (RLS) et permissions administrateur
ALTER TABLE public.vip_payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vip_req_all" ON public.vip_payment_requests;
CREATE POLICY "vip_req_all" ON public.vip_payment_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_tx_all" ON public.payment_transactions;
CREATE POLICY "payment_tx_all" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);

-- 4. Publication Realtime Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_payment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions;`;

  // 1. VOICI LA FONCTION À COLLER / REMPLACER POUR LA VALIDATION VIP
  const handleApproveVip = async (request: VIPPaymentRequest) => {
    setProcessingId(request.id);
    const studentUid = request.student_uid || request.userUid;
    const planId = request.plan_id || request.planId;
    const nowStr = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Mettre à jour localement immédiatement pour zéro latence
    setProcessedStatus((prev) => ({
      ...prev,
      [request.id]: { status: "APPROVED", date: nowStr, timestamp: Date.now() },
    }));
    roomRepo.updateVIPPaymentRequestStatusLocal(request.id, "APPROVED");

    try {
      // Étape A : Mettre à jour la demande dans vip_payment_requests (status = 'APPROVED')
      await supabase.from('vip_payment_requests').update({ status: 'APPROVED' }).eq('id', request.id);
      await safeUpdateSupabaseTable('vip_payment_requests', request.id, { 
        status: 'APPROVED',
        updated_at: Date.now()
      });

      // Étape B : Activer le statut VIP dans la table profiles de l'élève
      const computedExpiresAt = computeExpirationTimestamp(planId);
      const planLabel = VIP_PLANS.find((p) => p.id === planId)?.durationLabel || planId || "1 Mois";

      await safeUpdateProfile(studentUid, { 
        is_vip: true, 
        vip_plan: request.plan_id || planLabel,
        vip_expires_at: computedExpiresAt || null,
        updated_at: Date.now(),
      });

      // Étape C : Envoyer une notification à l'élève
      const notifId = `notif_vip_appr_${request.id}`;
      const now = Date.now();
      await supabase.from('notifications').insert([{
        id: notifId,
        user_id: studentUid,
        user_uid: studentUid,
        recipient_id: studentUid,
        target_role: "student",
        title: "Pass VIP Activé !",
        message: "Votre demande de Pass VIP a été validée avec succès.",
        type: 'vip_approved',
        status: 'unread',
        is_read: false,
        created_at: now,
        date_formatted: `Aujourd'hui à ${nowStr}`
      }]);

      await markAdminNotificationAsProcessed(studentUid, "vip_request");

      // Mettre également à jour le cache local Room
      roomRepo.insertNotification({
        id: notifId,
        userUid: studentUid,
        userId: studentUid,
        title: "Pass VIP Activé !",
        message: "Votre demande de Pass VIP a été validée avec succès.",
        type: "vip_approved",
        status: "unread",
        createdAt: now,
        dateFormatted: `Aujourd'hui à ${nowStr}`,
      });

      const dateExpirationStr = computedExpiresAt === -1 
        ? "Accès Illimité (À vie)" 
        : new Date(computedExpiresAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

      setFeedback({
        type: "success",
        message: `Pass VIP validé avec succès pour ${request.studentName || request.userName} (Durée: ${planLabel}, Expiration: ${dateExpirationStr}) !`,
      });

      alert("Paiement VIP validé avec succès !");

      // Optionnel : Recharger la liste locale des demandes
      const refreshed = await fetchVIPPaymentRequestsSupabase();
      if (refreshed && refreshed.length > 0) {
        setRequests(refreshed);
      }
    } catch (error: any) {
      console.error("Erreur lors de la validation :", error?.message || error);
      setFeedback({
        type: "error",
        message: "Erreur lors de la validation : " + (error?.message || error),
      });
      alert("Erreur : " + (error?.message || error));
    } finally {
      setTimeout(() => setProcessingId(null), 1000);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleApprove = handleApproveVip;

  const handleReject = async (req: VIPPaymentRequest) => {
    setProcessingId(req.id);
    const reason =
      rejectReason[req.id] || "Référence de transaction Wave / Orange Money introuvable ou non reçue.";
    const nowStr = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    // Immediately mark locally for zero UI lag
    setProcessedStatus((prev) => ({
      ...prev,
      [req.id]: { status: "REJECTED", date: nowStr, reason, timestamp: Date.now() },
    }));
    roomRepo.updateVIPPaymentRequestStatusLocal(req.id, "REJECTED", reason);

    try {
      // Étape A : Mettre à jour la demande dans vip_payment_requests (status = 'REJECTED')
      await supabase.from('vip_payment_requests').update({ status: 'REJECTED' }).eq('id', req.id);

      await updateVIPPaymentRequestStatusSupabase(
        req.id,
        "REJECTED",
        req.userUid || req.student_uid || (req as any).user_uid,
        reason,
        undefined,
        undefined,
        req.studentName || req.userName
      );

      setFeedback({
        type: "success",
        message: `Demande VIP refusée pour ${req.studentName || req.userName}. Notification envoyée.`,
      });
    } catch (err) {
      console.error("Error rejecting VIP request:", err);
      setFeedback({
        type: "error",
        message: "Une erreur est survenue lors du refus de la demande.",
      });
    } finally {
      setTimeout(() => setProcessingId(null), 1000);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Filter requests with visual fixation (recently processed cards stay visible in PENDING tab until user switches tabs)
  const filteredRequests = requests.filter((r) => {
    if (filter === "ALL") return true;
    const localProc = processedStatus[r.id];
    const effectiveStatus = localProc ? localProc.status : r.status;

    if (filter === "PENDING") {
      // Show if original is pending OR recently processed in this view
      return r.status === "PENDING" || (localProc && localProc.status !== "PENDING");
    }
    if (filter === "APPROVED") {
      return effectiveStatus === "APPROVED";
    }
    if (filter === "REJECTED") {
      return effectiveStatus === "REJECTED";
    }
    return true;
  });

  const pendingCount = requests.filter(
    (r) => (processedStatus[r.id]?.status || r.status) === "PENDING"
  ).length;
  const approvedCount = requests.filter(
    (r) => (processedStatus[r.id]?.status || r.status) === "APPROVED"
  ).length;
  const rejectedCount = requests.filter(
    (r) => (processedStatus[r.id]?.status || r.status) === "REJECTED"
  ).length;

  return (
    <div className="space-y-4 text-xs">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1A237E]/80 to-slate-900 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Crown className="text-amber-400 fill-amber-400" size={22} />
            <h3 className="text-sm sm:text-base font-black tracking-wide text-white">
              Validation des Paiements Pass VIP (Wave / Orange Money)
            </h3>
          </div>
          <p className="text-[11px] text-slate-300 max-w-2xl leading-relaxed">
            Synchronisation en direct des paiements et abonnements VIP.
            Les nouvelles souscriptions et paiements s'affichent automatiquement à l'écran via Supabase Realtime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Forcer le rechargement depuis Supabase"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-amber-300" : ""} />
            <span>{isRefreshing ? "Actualisation..." : "Actualiser"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSqlAssistant(!showSqlAssistant)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Afficher les règles RLS Supabase pour les paiements"
          >
            <Sparkles size={14} />
            <span>Assistant RLS</span>
          </button>

          <div className="bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs shadow-md flex items-center space-x-2">
            <Clock size={16} />
            <span>{pendingCount} en attente</span>
          </div>
        </div>
      </div>

      {/* SQL & RLS Assistant Modal/Box */}
      {showSqlAssistant && (
        <div className="p-4 bg-slate-950 border-2 border-indigo-700/60 rounded-2xl space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="text-amber-400" size={18} />
              <h4 className="font-bold text-white text-xs sm:text-sm">
                Règles RLS Supabase pour autoriser la validation de tous les paiements
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
            Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase si les souscriptions en attente restent bloquées par les politiques Row Level Security (RLS).
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

      {/* 4 Dynamic Sub-Tabs / Filters in exact specified order */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { id: "PENDING", label: "🟠 En attente", count: pendingCount },
            { id: "APPROVED", label: "🟢 Validées", count: approvedCount },
            { id: "REJECTED", label: "🔴 Refusées", count: rejectedCount },
            { id: "ALL", label: "📋 Toutes", count: requests.length },
          ] as const
        ).map((tab) => {
          const isActive = filter === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-black text-xs cursor-pointer transition-all flex items-center space-x-2 shrink-0 ${
                isActive
                  ? "bg-amber-400 text-slate-950 shadow-md font-black"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                  isActive
                    ? "bg-slate-950 text-amber-400"
                    : "bg-slate-900 text-slate-300 border border-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 text-center space-y-2">
          <Clock className="mx-auto text-slate-500" size={36} />
          <p className="font-extrabold text-slate-200 text-sm">
            Aucune demande d'abonnement VIP dans cette catégorie.
          </p>
          <p className="text-[11px] text-slate-400">
            {filter === "PENDING"
              ? "Toutes les souscriptions VIP ont été traitées !"
              : "Les souscriptions d'élèves apparaîtront instantanément en temps réel."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRequests.map((req) => {
            const isProcessing = processingId === req.id;
            const effectiveStatus = processedStatus[req.id]?.status || req.status;
            const isPending = effectiveStatus === "PENDING";
            const isApproved = effectiveStatus === "APPROVED";
            const isRejected = effectiveStatus === "REJECTED";
            const processedInfo = processedStatus[req.id];
            const name = req.studentName || req.userName || "Élève";

            return (
              <div
                key={req.id}
                className={`bg-slate-900 border-2 rounded-2xl p-4 shadow-md space-y-3 transition-all ${
                  isPending
                    ? "border-amber-400/80 bg-slate-900/95 ring-1 ring-amber-400/30"
                    : isApproved
                    ? "border-emerald-500/80 bg-slate-900/90"
                    : "border-slate-700/80 bg-slate-900/60 opacity-90"
                }`}
              >
                {/* 1. Header with Full Student Identity */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Crown size={15} className="text-amber-400 fill-amber-400 shrink-0" />
                      <span className="font-black text-white text-sm truncate">
                        {name}
                      </span>
                    </div>
                    {/* User UID & Identifiers */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {req.studentMatricule && (
                        <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-mono font-black border border-amber-400/40">
                          Matricule: {req.studentMatricule}
                        </span>
                      )}
                      <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono font-bold border border-slate-700">
                        ID: {req.userId || req.userUid}
                      </span>
                      {req.userEmail && (
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center space-x-1 border border-slate-700">
                          <Mail size={10} className="text-slate-400" />
                          <span className="truncate max-w-[150px]">{req.userEmail}</span>
                        </span>
                      )}
                      {req.userPhone && (
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center space-x-1 border border-slate-700">
                          <Phone size={10} className="text-slate-400" />
                          <span>{req.userPhone}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {req.dateFormatted || (req.createdAt ? new Date(req.createdAt).toLocaleDateString("fr-FR") : "")}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      isPending
                        ? "bg-amber-400 text-slate-950 font-black"
                        : isApproved
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-600 font-black"
                        : "bg-rose-950 text-rose-300 border border-rose-600 font-black"
                    }`}
                  >
                    {isPending && "⏳ EN ATTENTE"}
                    {isApproved && "✅ VALIDÉ"}
                    {isRejected && "❌ REFUSÉ"}
                  </span>
                </div>

                {/* 2. Transaction Details Box */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center space-x-1 font-bold">
                      <Phone size={12} className="text-amber-400" />
                      <span>Téléphone Transfert :</span>
                    </span>
                    <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                      {req.userPhone || "Non renseigné"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center space-x-1 font-bold">
                      <FileText size={12} className="text-indigo-400" />
                      <span>Réf. Transaction :</span>
                    </span>
                    <span className="font-mono font-black text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-700 select-all">
                      {req.transactionRef}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-700 text-xs">
                    <span className="text-slate-300 font-bold">
                      Formule : {req.planDuration || "Pass VIP Standard"}
                    </span>
                    <span className="font-black text-emerald-400 text-sm">
                      {req.amount ? req.amount.toLocaleString("fr-FR") : "1 000"} FCFA
                    </span>
                  </div>

                  {(req.rejectionReason || processedInfo?.reason) && (
                    <div className="pt-1 text-[11px] text-rose-300 font-semibold bg-rose-950/40 border border-rose-800/60 p-2 rounded-lg">
                      Motif du refus : {processedInfo?.reason || req.rejectionReason}
                    </div>
                  )}
                </div>

                {/* 3. Rejection Reason Input */}
                {showRejectInput[req.id] && isPending && (
                  <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="Motif du refus (ex: Réf. transaction invalide ou non reçue)"
                      value={rejectReason[req.id] || ""}
                      onChange={(e) =>
                        setRejectReason({ ...rejectReason, [req.id]: e.target.value })
                      }
                      className="w-full p-2.5 bg-rose-950/40 border border-rose-600 rounded-xl text-xs text-rose-200 placeholder:text-rose-400/60 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                )}

                {/* 4. Action Buttons */}
                {isPending ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(req)}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Valider Pass VIP ✅</span>
                        </>
                      )}
                    </button>

                    {!showRejectInput[req.id] ? (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          setShowRejectInput({ ...showRejectInput, [req.id]: true })
                        }
                        className="py-2.5 px-3 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center space-x-1"
                      >
                        <X size={15} />
                        <span>Refuser ❌</span>
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
                  <div className="pt-1 flex items-center justify-between text-[11px] font-bold border-t border-slate-800">
                    <span
                      className={
                        isApproved
                          ? "text-emerald-400 flex items-center space-x-1.5"
                          : "text-rose-400 flex items-center space-x-1.5"
                      }
                    >
                      {isApproved ? <CheckCircle2 size={14} /> : <X size={14} />}
                      <span>
                        {isApproved
                          ? "Pass VIP activé & Profil synchronisé"
                          : "Demande rejetée"}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      {processedInfo?.date ? `À ${processedInfo.date}` : "Traité"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
