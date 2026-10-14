import React, { useState, useEffect, useMemo } from "react";
import { CaisseTransaction, CaissePaymentMethod, PaymentTransaction, VIPPaymentRequest, VIPRequestStatus } from "../types";
import {
  saveCaisseTransactionToSupabase,
  subscribeToCaisseTransactionsSupabase,
  subscribeToAllTransactionsSupabase,
  saveTransactionToSupabase,
  updateTransactionStatusSupabase,
  subscribeToVIPPaymentRequestsSupabase,
  updateVIPPaymentRequestStatusSupabase,
  fetchVIPPaymentRequestsSupabase,
  fetchTransactionsSupabase,
  saveNotificationToSupabase,
  safeUpdateProfile,
  saveCaisseResetTimestampToSupabase,
  getCaisseResetTimestampFromSupabase,
  logAdminActionToSupabase,
  deleteAllCaisseTransactionsFromSupabase,
} from "../data/supabaseStorage";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { computeExpirationTimestamp, VIP_PLANS } from "../utils/vipUtils";
import {
  Wallet,
  PlusCircle,
  Banknote,
  Search,
  User,
  Phone,
  Calendar,
  FileText,
  CheckCircle2,
  TrendingUp,
  Download,
  DollarSign,
  ShieldCheck,
  Check,
  X,
  Clock,
  Crown,
  Filter,
  RefreshCw,
  AlertCircle,
  Layers,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Send,
  XCircle,
  RotateCcw,
  Trash2,
  Database,
  Copy,
} from "lucide-react";
import { WaveLogo, OrangeMoneyLogo } from "./PaymentLogos";

interface ModuleCaisseAdminProps {
  adminName?: string;
}

type CaisseSubTab = "overview" | "online_validation" | "cash_entry" | "ledger";

export const ModuleCaisseAdmin: React.FC<ModuleCaisseAdminProps> = ({
  adminName = "Massaw Seck (Admin)",
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<CaisseSubTab>("overview");

  // Data States
  const [caisseTransactions, setCaisseTransactions] = useState<CaisseTransaction[]>([]);
  const [onlineTransactions, setOnlineTransactions] = useState<PaymentTransaction[]>(() => roomRepo.getAllTransactions());
  const [vipRequests, setVipRequests] = useState<VIPPaymentRequest[]>(() => roomRepo.getAllVIPPaymentRequests());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState<string>("ALL");
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [onlineTypeFilter, setOnlineTypeFilter] = useState<"ALL" | "renforcement" | "domicile" | "vip">("ALL");

  // Cash Form State
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<string>("10000");
  const [motif, setMotif] = useState<string>("Inscription cours du soir");
  const [customMotif, setCustomMotif] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<CaissePaymentMethod>("Cash 💵");
  const [note, setNote] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  // Reject modal state
  const [rejectingItem, setRejectingItem] = useState<{ id: string; type: "course" | "vip"; name: string; amount: number; userUid: string } | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  // SQL code modal state
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  useEffect(() => {
    // 1. Subscribe to Caisse transactions
    const unsubCaisse = subscribeToCaisseTransactionsSupabase((data) => {
      setCaisseTransactions(data);
    });

    // 2. Subscribe to Online Course Transactions (Wave & OM)
    const unsubOnline = subscribeToAllTransactionsSupabase((data) => {
      if (Array.isArray(data)) {
        setOnlineTransactions(data);
      }
    });

    // 3. Subscribe to VIP Payment Requests
    const unsubVip = subscribeToVIPPaymentRequestsSupabase((data) => {
      if (Array.isArray(data)) {
        setVipRequests(data);
      }
    });

    // Initial remote fetch
    fetchTransactionsSupabase().then((data) => {
      if (Array.isArray(data)) setOnlineTransactions(data);
    }).catch(console.warn);

    fetchVIPPaymentRequestsSupabase().then((data) => {
      if (Array.isArray(data)) setVipRequests(data);
    }).catch(console.warn);

    return () => {
      unsubCaisse();
      unsubOnline();
      unsubVip();
    };
  }, []);

  // Validation Handler for Online Course Transactions (Renforcement / Domicile)
  const handleApproveOnlineTx = async (tx: PaymentTransaction) => {
    setProcessingTxId(tx.id);
    const updatedTx: PaymentTransaction = { ...tx, status: "approved" };
    
    // Immediate optimistic local update
    roomRepo.updateTransactionStatus(tx.id, "approved");
    setOnlineTransactions(roomRepo.getAllTransactions());

    try {
      await updateTransactionStatusSupabase(tx.id, "approved");
      await saveTransactionToSupabase(updatedTx);

      // Notification sent to student
      const now = Date.now();
      const notif = {
        id: `notif_pay_appr_${tx.id}_${now}`,
        recipient: tx.userUid || tx.userId || "student",
        recipientId: tx.userUid || tx.userId || "student",
        target_uid: tx.userUid || tx.userId,
        targetUid: tx.userUid || tx.userId,
        userUid: tx.userUid || tx.userId,
        userId: tx.userUid || tx.userId,
        title: "✅ Paiement Validé par l'Administration !",
        message: `Votre paiement de ${tx.amount.toLocaleString("fr-FR")} FCFA pour l'apprenant "${tx.learnerName || tx.userName}" (${tx.type === "domicile" ? "Cours à Domicile" : "Cours de Renforcement"}) a été validé avec succès. Votre reçu officiel est disponible dans votre profil.`,
        type: "SYSTEM" as const,
        status: "UNREAD" as const,
        transactionId: tx.id,
        createdAt: now,
        dateFormatted: `Aujourd'hui à ${new Date(now).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
      };
      await saveNotificationToSupabase(notif).catch(console.warn);

      setSuccessMsg(`✅ Paiement de ${tx.learnerName || tx.userName} (${tx.amount.toLocaleString("fr-FR")} FCFA via ${(tx.operator || "wave").toUpperCase()}) validé et cumulé en Caisse !`);
    } catch (err) {
      console.warn("Notice validating online tx:", err);
    } finally {
      setProcessingTxId(null);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  // Validation Handler for VIP Pass Requests
  const handleApproveVipRequest = async (req: VIPPaymentRequest) => {
    setProcessingTxId(req.id);
    const studentUid = req.student_uid || req.userUid;
    const planId = req.plan_id || req.planId;
    const nowStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const now = Date.now();

    roomRepo.updateVIPPaymentRequestStatusLocal(req.id, "APPROVED");
    setVipRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "APPROVED" as VIPRequestStatus } : r))
    );

    try {
      await updateVIPPaymentRequestStatusSupabase(req.id, "APPROVED");

      const computedExpiresAt = computeExpirationTimestamp(planId);
      const planLabel = VIP_PLANS.find((p) => p.id === planId)?.durationLabel || planId || "1 Mois";

      if (studentUid) {
        await safeUpdateProfile(studentUid, {
          is_vip: true,
          vip_plan: req.plan_id || planLabel,
          vip_expires_at: computedExpiresAt || null,
          updated_at: now,
        });
      }

      const notif = {
        id: `notif_vip_appr_${req.id}_${now}`,
        recipient: studentUid,
        recipientId: studentUid,
        target_uid: studentUid,
        targetUid: studentUid,
        userUid: studentUid,
        userId: studentUid,
        title: "👑 Pass VIP Activé !",
        message: `Votre demande d'abonnement Pass VIP (${planLabel}) a été validée par la Direction. Vous avez désormais un accès illimité à tous les contenus exclusifs et corrigés.`,
        type: "VIP_PASS" as const,
        status: "UNREAD" as const,
        createdAt: now,
        dateFormatted: `Aujourd'hui à ${nowStr}`,
      };
      await saveNotificationToSupabase(notif).catch(console.warn);

      setSuccessMsg(`👑 Pass VIP validé avec succès pour ${req.studentName || req.userName} (${req.amount.toLocaleString("fr-FR")} FCFA) et cumulé en Caisse !`);
    } catch (err) {
      console.warn("Notice validating VIP request:", err);
    } finally {
      setProcessingTxId(null);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  // Reject Handler (Course or VIP)
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const { id, type, userUid, name, amount } = rejectingItem;
    const reason = rejectReasonInput.trim() || "Information de paiement incomplète ou non reçue.";
    const now = Date.now();
    const nowStr = new Date(now).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    try {
      if (type === "course") {
        roomRepo.updateTransactionStatus(id, "rejected", reason);
        setOnlineTransactions(roomRepo.getAllTransactions());
        await updateTransactionStatusSupabase(id, "rejected", reason);

        const notif = {
          id: `notif_pay_rej_${id}_${now}`,
          recipient: userUid,
          recipientId: userUid,
          target_uid: userUid,
          targetUid: userUid,
          userUid: userUid,
          userId: userUid,
          title: "❌ Paiement Non Validé",
          message: `Votre paiement de ${amount.toLocaleString("fr-FR")} FCFA n'a pas pu être validé. Motif : "${reason}". Veuillez contacter la Direction ou renouveler l'opération.`,
          type: "SYSTEM" as const,
          status: "UNREAD" as const,
          createdAt: now,
          dateFormatted: `Aujourd'hui à ${nowStr}`,
        };
        await saveNotificationToSupabase(notif).catch(console.warn);
      } else {
        roomRepo.updateVIPPaymentRequestStatusLocal(id, "REJECTED", reason);
        setVipRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" as VIPRequestStatus, rejectionReason: reason } : r))
        );
        await updateVIPPaymentRequestStatusSupabase(id, "REJECTED", reason);

        const notif = {
          id: `notif_vip_rej_${id}_${now}`,
          recipient: userUid,
          recipientId: userUid,
          target_uid: userUid,
          targetUid: userUid,
          userUid: userUid,
          userId: userUid,
          title: "❌ Pass VIP Non Validé",
          message: `Votre demande d'activation du Pass VIP n'a pas pu être validée. Motif : "${reason}".`,
          type: "VIP_PASS" as const,
          status: "UNREAD" as const,
          createdAt: now,
          dateFormatted: `Aujourd'hui à ${nowStr}`,
        };
        await saveNotificationToSupabase(notif).catch(console.warn);
      }

      setSuccessMsg(`Paiement de ${name} rejeté. L'élève a été alerté.`);
    } catch (err) {
      console.warn("Notice rejecting item:", err);
    } finally {
      setRejectingItem(null);
      setRejectReasonInput("");
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  // Deletion handlers
  const handleDeleteOnlineItem = (item: { id: string; source: "course" | "vip"; studentName: string }) => {
    if (window.confirm(`Voulez-vous vraiment supprimer définitivement la transaction de "${item.studentName}" ?`)) {
      if (item.source === "course") {
        roomRepo.deleteTransaction(item.id);
        setOnlineTransactions(roomRepo.getAllTransactions());
      } else {
        roomRepo.deleteVIPPaymentRequest(item.id);
        setVipRequests(roomRepo.getAllVIPPaymentRequests());
      }
      setSuccessMsg(`Transaction de ${item.studentName} supprimée avec succès.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  const handleDeleteCaisseTransaction = (tx: CaisseTransaction) => {
    if (window.confirm(`Voulez-vous vraiment supprimer définitivement l'entrée en caisse de "${tx.studentName}" (${tx.amount.toLocaleString("fr-FR")} FCFA) ?`)) {
      roomRepo.deleteCaisseTransaction(tx.id);
      setCaisseTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      setSuccessMsg(`Entrée en caisse de ${tx.studentName} supprimée avec succès.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  const handleClearAllLedgerHistory = async () => {
    if (
      window.confirm(
        "⚠️ ATTENTION : Voulez-vous vraiment supprimer DÉFINITIVEMENT TOUT l'historique de la caisse et du Grand Livre ?\n\nToutes les entrées de caisse seront effacées de Supabase (table caisse_transactions) et de l'application."
      )
    ) {
      roomRepo.clearAllCaisseTransactions();
      setCaisseTransactions([]);
      await deleteAllCaisseTransactionsFromSupabase().catch(console.warn);
      await logAdminActionToSupabase(
        "massperpendiculaire@gmail.com",
        "VIDER_HISTORIQUE_CAISSE",
        "Suppression définitive et vidage intégral du Grand Livre et des entrées de caisse."
      ).catch(console.warn);
      setSuccessMsg("🗑️ L'historique complet de la caisse a été entièrement vidé et supprimé de Supabase.");
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  // Register On-site Cash Entry
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;

    setIsSubmitting(true);
    setSuccessMsg("");

    const selectedMotif = motif === "Autre" ? customMotif || "Paiement Divers" : motif;
    const txId = "caisse_" + Date.now();

    const newTx: CaisseTransaction = {
      id: txId,
      studentName: studentName.trim(),
      phone: phone.trim() || "Non spécifié",
      amount: numAmount,
      motif: selectedMotif,
      paymentMethod,
      note: note.trim() || undefined,
      adminName,
      createdAt: Date.now(),
      dateFormatted: `Le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    };

    try {
      await saveCaisseTransactionToSupabase(newTx);
      setSuccessMsg(`Paiement de ${numAmount.toLocaleString("fr-FR")} FCFA (${paymentMethod}) enregistré avec succès pour ${studentName} !`);

      // Reset form
      setStudentName("");
      setPhone("");
      setNote("");
      setCustomMotif("");
    } catch (err) {
      console.error("Error saving caisse transaction:", err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  // State for reset to 0 F (état initial)
  const [caisseResetTimestamp, setCaisseResetTimestamp] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("savoir_caisse_reset_timestamp") || 0);
    } catch {
      return 0;
    }
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    getCaisseResetTimestampFromSupabase().then((ts) => {
      if (ts && ts > 0) {
        setCaisseResetTimestamp(ts);
        try {
          localStorage.setItem("savoir_caisse_reset_timestamp", String(ts));
        } catch {}
      }
    }).catch(console.warn);
  }, []);

  const handleResetCumul = async () => {
    setIsResetting(true);
    const now = Date.now();
    setCaisseResetTimestamp(now);
    try {
      localStorage.setItem("savoir_caisse_reset_timestamp", String(now));
    } catch {}

    try {
      await saveCaisseResetTimestampToSupabase(now);
      await logAdminActionToSupabase(
        "massperpendiculaire@gmail.com",
        "REMISE_A_ZERO_CAISSE",
        `Remise à 0 FCFA du solde cumulé de la trésorerie (${grandTotalConsolide.toLocaleString("fr-FR")} FCFA réinitialisés).`
      );
      setSuccessMsg("✅ Le solde cumulé de la trésorerie a été remis à 0 FCFA dans la base de données (État initial).");
    } catch (err) {
      console.warn("Notice saving reset timestamp:", err);
      setSuccessMsg("✅ Le solde cumulé de la trésorerie a été remis à 0 FCFA (État initial).");
    } finally {
      setIsResetting(false);
      setShowResetModal(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  const handleRestoreFullHistory = async () => {
    setCaisseResetTimestamp(0);
    try {
      localStorage.removeItem("savoir_caisse_reset_timestamp");
    } catch {}
    await saveCaisseResetTimestampToSupabase(0).catch(console.warn);
    setSuccessMsg("Le cumul historique complet de la trésorerie a été rétabli.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // ==========================================
  // CONSOLIDATED ACCOUNTING & TOTALS
  // ==========================================
  const effectiveCaisseTransactions = useMemo(() => {
    if (caisseResetTimestamp <= 0) return caisseTransactions;
    return caisseTransactions.filter((t) => (t.createdAt || 0) >= caisseResetTimestamp);
  }, [caisseTransactions, caisseResetTimestamp]);

  const approvedOnlineCourseTxs = useMemo(
    () =>
      onlineTransactions.filter(
        (t) =>
          (t.status || "").toLowerCase() === "approved" &&
          (caisseResetTimestamp <= 0 || (t.createdAt || 0) >= caisseResetTimestamp)
      ),
    [onlineTransactions, caisseResetTimestamp]
  );

  const approvedVipRequests = useMemo(
    () =>
      vipRequests.filter(
        (r) =>
          (r.status || "").toUpperCase() === "APPROVED" &&
          (caisseResetTimestamp <= 0 ||
            Number(r.requested_at || r.created_at || r.createdAt || 0) >= caisseResetTimestamp)
      ),
    [vipRequests, caisseResetTimestamp]
  );

  const pendingOnlineTxs = useMemo(
    () => onlineTransactions.filter((t) => (t.status || "").toLowerCase() === "pending"),
    [onlineTransactions]
  );

  const pendingVipRequests = useMemo(
    () => vipRequests.filter((r) => (r.status || "").toUpperCase() === "PENDING"),
    [vipRequests]
  );

  const totalPendingCount = pendingOnlineTxs.length + pendingVipRequests.length;

  // Total Cash from direct caisse
  const totalCashDirect = effectiveCaisseTransactions
    .filter((t) => t.paymentMethod === "Cash 💵")
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Total Wave: direct caisse Wave + approved electronic Wave courses + approved VIP Wave
  const totalWaveCaisse = effectiveCaisseTransactions
    .filter((t) => t.paymentMethod === "Wave 🌊")
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalWaveOnlineCourses = approvedOnlineCourseTxs
    .filter((t) => (t.operator || "").toLowerCase().includes("wave"))
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalWaveVip = approvedVipRequests
    .filter((r) => (r.operator || "WAVE").toUpperCase().includes("WAVE"))
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalWaveCombined = totalWaveCaisse + totalWaveOnlineCourses + totalWaveVip;

  // Total Orange Money: direct caisse OM + approved electronic OM courses + approved VIP OM
  const totalOMCaisse = effectiveCaisseTransactions
    .filter((t) => t.paymentMethod === "Orange Money 🟧")
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalOMOnlineCourses = approvedOnlineCourseTxs
    .filter((t) => (t.operator || "").toLowerCase().includes("orange"))
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalOMVip = approvedVipRequests
    .filter((r) => (r.operator || "").toUpperCase().includes("ORANGE"))
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalOMCombined = totalOMCaisse + totalOMOnlineCourses + totalOMVip;

  // GRAND TOTAL CONSOLIDÉ CUMULÉ
  const grandTotalConsolide = totalCashDirect + totalWaveCombined + totalOMCombined;

  // All unified pending items for validation
  const unifiedPendingList = useMemo(() => {
    const list: Array<{
      id: string;
      source: "course" | "vip";
      studentName: string;
      levelOrPlan: string;
      amount: number;
      operator: "wave" | "orange";
      transactionRef: string;
      dateFormatted: string;
      createdAt: number;
      status: string;
      userUid: string;
      phone?: string;
      typeLabel: string;
      rejectionReason?: string;
      rawObj: any;
    }> = [];

    // Online course transactions
    onlineTransactions.forEach((tx) => {
      const op: "wave" | "orange" = (tx.operator || "").toLowerCase().includes("orange") ? "orange" : "wave";
      const st = (tx.status || "pending").toLowerCase();
      list.push({
        id: tx.id,
        source: "course",
        studentName: tx.learnerName || tx.userName || "Élève",
        levelOrPlan: tx.level || "Cours",
        amount: Number(tx.amount || 0),
        operator: op,
        transactionRef: tx.id || "WAVE-DIRECT",
        dateFormatted: tx.dateFormatted || new Date(tx.createdAt || Date.now()).toLocaleDateString("fr-FR"),
        createdAt: Number(tx.createdAt || Date.now()),
        status: st,
        userUid: tx.userUid || tx.userId || "",
        phone: tx.phoneNumber || "78 376 95 84",
        typeLabel: tx.type === "domicile" ? "Cours à Domicile" : "Cours de Renforcement",
        rejectionReason: tx.rejectionReason,
        rawObj: tx,
      });
    });

    // VIP requests
    vipRequests.forEach((req) => {
      const op: "wave" | "orange" = (req.operator || "").toUpperCase().includes("ORANGE") ? "orange" : "wave";
      const st = (req.status || "PENDING").toLowerCase();
      const planDuration = req.plan_duration || req.plan_id || req.planId || "Pass VIP";
      list.push({
        id: req.id,
        source: "vip",
        studentName: req.studentName || req.userName || "Élève",
        levelOrPlan: planDuration,
        amount: Number(req.amount || 0),
        operator: op,
        transactionRef: req.transaction_ref || req.transactionRef || "VIP-PAY",
        dateFormatted: req.dateFormatted || new Date(Number(req.requested_at || req.created_at || Date.now())).toLocaleDateString("fr-FR"),
        createdAt: Number(req.requested_at || req.created_at || Date.now()),
        status: st,
        userUid: req.student_uid || req.userUid || "",
        phone: req.userPhone || "",
        typeLabel: "Abonnement Pass VIP",
        rejectionReason: req.rejection_reason || req.rejectionReason,
        rawObj: req,
      });
    });

    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [onlineTransactions, vipRequests]);

  const filteredOnlineList = useMemo(() => {
    return unifiedPendingList.filter((item) => {
      // Status filter
      if (onlineStatusFilter === "PENDING" && item.status !== "pending") return false;
      if (onlineStatusFilter === "APPROVED" && item.status !== "approved") return false;
      if (onlineStatusFilter === "REJECTED" && item.status !== "rejected") return false;

      // Type filter
      if (onlineTypeFilter === "vip" && item.source !== "vip") return false;
      if (onlineTypeFilter === "renforcement" && (item.source !== "course" || item.typeLabel.includes("Domicile"))) return false;
      if (onlineTypeFilter === "domicile" && (item.source !== "course" || !item.typeLabel.includes("Domicile"))) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.studentName.toLowerCase().includes(q) ||
          item.levelOrPlan.toLowerCase().includes(q) ||
          item.transactionRef.toLowerCase().includes(q) ||
          item.typeLabel.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [unifiedPendingList, onlineStatusFilter, onlineTypeFilter, searchQuery]);

  return (
    <div className="space-y-5 text-xs">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-slate-900 border-2 border-amber-400/50 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-amber-400 text-[#1A237E] rounded-2xl font-black shadow-md">
              <Banknote size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                <span>Caisse & Trésorerie Consolidée</span>
                {totalPendingCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-xs animate-pulse">
                    {totalPendingCount} à valider
                  </span>
                )}
              </h3>
              <p className="text-xs text-amber-300 font-bold">
                Cumul global des recettes (Espèces 💵 + Wave 🌊 + Orange Money 🟧)
              </p>
            </div>
          </div>
          <p className="text-[11px] text-indigo-200 pt-0.5 leading-relaxed">
            Module unique de validation des paiements électroniques (Wave & Orange Money) et d'encaissement au guichet pour les cours de renforcement, cours à domicile et Pass VIP.
          </p>
        </div>

        {/* Consolidated Total Box & Reset Button */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-inner">
          <div>
            <span className="text-[10px] text-indigo-200 block font-bold uppercase tracking-wider">
              Trésorerie Totale Cumulée
            </span>
            <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
              {grandTotalConsolide.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          <div className="flex flex-wrap items-center sm:items-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-amber-300 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm border border-indigo-400/40"
              title="Afficher le script SQL Supabase pour activer Caisse, Trésorerie & Audit"
            >
              <Database size={13} />
              <span>Script SQL Supabase</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-md border border-rose-300/40"
              title="Remettre le cumul de la caisse à 0 F (État initial)"
            >
              <RotateCcw size={13} />
              <span>Remettre le Cumul à 0 F</span>
            </button>

            {caisseResetTimestamp > 0 && (
              <button
                type="button"
                onClick={handleRestoreFullHistory}
                className="text-[10px] text-indigo-200 hover:text-white underline cursor-pointer text-center sm:text-right"
              >
                Rétablir le cumul historique
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accounting Stats 4-Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 block">
            💵 Espèces (Cash) Guichet
          </span>
          <span className="text-lg font-black text-emerald-900 dark:text-emerald-200 font-mono">
            {totalCashDirect.toLocaleString("fr-FR")} FCFA
          </span>
          <span className="text-[9px] text-emerald-700/80 block">Encaissements physiques</span>
        </div>

        <div className="bg-sky-50 dark:bg-sky-950/40 border border-[#1EA5FC]/40 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-extrabold text-sky-800 dark:text-sky-300 block flex items-center space-x-1">
            <WaveLogo size={14} showLabel={false} />
            <span>Total Wave Validé</span>
          </span>
          <span className="text-lg font-black text-sky-900 dark:text-sky-200 font-mono">
            {totalWaveCombined.toLocaleString("fr-FR")} FCFA
          </span>
          <span className="text-[9px] text-sky-700/80 block">Guichet + En ligne</span>
        </div>

        <div className="bg-orange-50 dark:bg-orange-950/40 border border-[#FF7900]/40 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-extrabold text-orange-800 dark:text-orange-300 block flex items-center space-x-1">
            <OrangeMoneyLogo size={14} showLabel={false} />
            <span>Total Orange Money</span>
          </span>
          <span className="text-lg font-black text-orange-900 dark:text-orange-200 font-mono">
            {totalOMCombined.toLocaleString("fr-FR")} FCFA
          </span>
          <span className="text-[9px] text-orange-700/80 block">Guichet + En ligne</span>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-extrabold text-[#1A237E] dark:text-indigo-300 block flex items-center space-x-1">
            <Clock size={14} className="text-amber-500" />
            <span>En attente de validation</span>
          </span>
          <span className="text-lg font-black text-indigo-950 dark:text-white font-mono">
            {totalPendingCount} dossier{totalPendingCount > 1 ? "s" : ""}
          </span>
          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block">Wave & Orange Money</span>
        </div>
      </div>

      {/* Sub-Navigation Navigation Pills */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveSubTab("online_validation")}
          className={`py-2 px-3.5 rounded-xl font-extrabold text-xs transition-all flex items-center space-x-1.5 cursor-pointer relative ${
            activeSubTab === "online_validation"
              ? "bg-[#1A237E] text-amber-300 shadow-md border border-amber-400/30"
              : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          }`}
        >
          <CheckCircle2 size={15} />
          <span>Validation Paiements Wave & OM</span>
          {totalPendingCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white font-black text-[9px] rounded-full shadow">
              {totalPendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("cash_entry")}
          className={`py-2 px-3.5 rounded-xl font-extrabold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
            activeSubTab === "cash_entry"
              ? "bg-[#1A237E] text-amber-300 shadow-md border border-amber-400/30"
              : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          }`}
        >
          <PlusCircle size={15} />
          <span>Encaissement au Guichet (Cash)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("ledger")}
          className={`py-2 px-3.5 rounded-xl font-extrabold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
            activeSubTab === "ledger"
              ? "bg-[#1A237E] text-amber-300 shadow-md border border-amber-400/30"
              : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          }`}
        >
          <Wallet size={15} />
          <span>Grand Livre & Journal Général</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl font-bold flex items-center space-x-2 animate-in fade-in shadow-xs">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TAB: VALIDATION DES PAIEMENTS WAVE & ORANGE MONEY & VIP                */}
      {/* ========================================================================= */}
      {activeSubTab === "online_validation" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 mr-1">Statut :</span>
              {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOnlineStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                    onlineStatusFilter === st
                      ? "bg-[#1A237E] text-amber-300 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {st === "PENDING" && `En attente (${totalPendingCount})`}
                  {st === "APPROVED" && `Validés (${approvedOnlineCourseTxs.length + approvedVipRequests.length})`}
                  {st === "REJECTED" && "Rejetés"}
                  {st === "ALL" && `Tous (${unifiedPendingList.length})`}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher élève, code..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 pl-8 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {filteredOnlineList.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
              <p className="font-black text-sm text-slate-700 dark:text-slate-200">
                {onlineStatusFilter === "PENDING" ? "Aucune transaction en attente de validation !" : "Aucune transaction trouvée."}
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Tous les paiements Wave et Orange Money soumis par les élèves sont à jour.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredOnlineList.map((item) => {
                const isPending = item.status === "pending";
                const isApproved = item.status === "approved";
                const isRejected = item.status === "rejected";
                const isProcessing = processingTxId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-4 shadow-sm transition-all space-y-3 ${
                      isPending
                        ? "border-amber-300 dark:border-amber-700 bg-amber-50/20"
                        : isApproved
                        ? "border-emerald-300 dark:border-emerald-800"
                        : "border-slate-200 dark:border-slate-800 opacity-80"
                    }`}
                  >
                    {/* Header: Student, Type & Operator */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-black text-slate-900 dark:text-white text-sm">
                            {item.studentName}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-[#1A237E] dark:text-indigo-300 rounded-md text-[10px] font-extrabold border border-indigo-200 dark:border-indigo-800">
                            {item.levelOrPlan}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.typeLabel} • {item.dateFormatted}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-center space-x-1">
                          {item.operator === "wave" ? (
                            <span className="px-2 py-1 bg-cyan-50 border border-[#1EA5FC] text-[#0A5F9E] rounded-lg font-black text-[10px] flex items-center space-x-1">
                              <WaveLogo size={14} showLabel={false} />
                              <span>WAVE</span>
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-orange-50 border border-[#FF7900] text-[#B34700] rounded-lg font-black text-[10px] flex items-center space-x-1">
                              <OrangeMoneyLogo size={14} showLabel={false} />
                              <span>ORANGE</span>
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400 mt-1">
                          {item.amount.toLocaleString("fr-FR")} FCFA
                        </span>
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="font-bold">Réf. Transaction :</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {item.transactionRef}
                        </span>
                      </div>
                      {item.phone && (
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="font-bold">Tél. de contact :</span>
                          <span className="font-mono font-semibold">{item.phone}</span>
                        </div>
                      )}
                      {item.rejectionReason && (
                        <div className="text-rose-600 dark:text-rose-400 pt-1 border-t border-rose-100 dark:border-rose-900/40 italic">
                          Motif de refus : "{item.rejectionReason}"
                        </div>
                      )}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {isApproved && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl font-extrabold text-[10px] inline-flex items-center space-x-1">
                            <CheckCircle2 size={13} />
                            <span>Validé & Encaissé</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-xl font-extrabold text-[10px] inline-flex items-center space-x-1">
                            <XCircle size={13} />
                            <span>Rejeté</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 rounded-xl font-black text-[10px] inline-flex items-center space-x-1 animate-pulse">
                            <Clock size={13} />
                            <span>En attente de décision</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                setRejectingItem({
                                  id: item.id,
                                  type: item.source,
                                  name: item.studentName,
                                  amount: item.amount,
                                  userUid: item.userUid,
                                })
                              }
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-rose-200 flex items-center space-x-1"
                            >
                              <X size={14} />
                              <span>Refuser</span>
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => {
                                if (item.source === "course") {
                                  handleApproveOnlineTx(item.rawObj);
                                } else {
                                  handleApproveVipRequest(item.rawObj);
                                }
                              }}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                            >
                              {isProcessing ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              <span>Valider le Paiement</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteOnlineItem(item)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 flex items-center space-x-1"
                          title="Supprimer définitivement cette transaction"
                        >
                          <Trash2 size={13} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: ENCAISSEMENT AU GUICHET (CASH / SUR PLACE)                         */}
      {/* ========================================================================= */}
      {activeSubTab === "cash_entry" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <PlusCircle className="text-[#1A237E] dark:text-indigo-400" size={20} />
              <h4 className="font-black text-slate-900 dark:text-white text-sm">
                Enregistrer un Règlement au Guichet (Cash 💵 / Direct)
              </h4>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Nom complet de l'élève / Client *
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ex: Awa Ndiaye"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 pl-9 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Numéro de Téléphone (Optionnel)
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 77 654 32 10"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 pl-9 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Montant Encaissé (FCFA) *
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  step="500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex: 10000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-black text-[#1A237E] dark:text-indigo-300 focus:ring-2 focus:ring-[#1A237E]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Motif du Règlement *
                </label>
                <select
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                >
                  <option value="Inscription cours du soir">Inscription cours du soir</option>
                  <option value="Mensualité cours du soir">Mensualité cours du soir</option>
                  <option value="Cours à domicile">Cours à domicile</option>
                  <option value="Achat fascicule / document">Achat fascicule / document</option>
                  <option value="Abonnement Pass VIP">Abonnement Pass VIP</option>
                  <option value="Autre">Autre motif sur mesure</option>
                </select>
              </div>

              {motif === "Autre" && (
                <div>
                  <input
                    type="text"
                    required
                    value={customMotif}
                    onChange={(e) => setCustomMotif(e.target.value)}
                    placeholder="Préciser le motif..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Mode de Règlement *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Cash 💵")}
                    className={`p-2.5 rounded-xl border text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center space-y-1 ${
                      paymentMethod === "Cash 💵"
                        ? "bg-[#1A237E] text-amber-300 border-amber-400 shadow"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Banknote size={18} />
                    <span>Espèces (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Wave 🌊")}
                    className={`p-2.5 rounded-xl border text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center space-y-1 ${
                      paymentMethod === "Wave 🌊"
                        ? "bg-cyan-50 border-[#1EA5FC] text-[#0A5F9E] ring-1 ring-[#1EA5FC]"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <WaveLogo size={18} showLabel={false} />
                    <span>Wave Guichet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Orange Money 🟧")}
                    className={`p-2.5 rounded-xl border text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center space-y-1 ${
                      paymentMethod === "Orange Money 🟧"
                        ? "bg-orange-50 border-[#FF7900] text-[#B34700] ring-1 ring-[#FF7900]"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <OrangeMoneyLogo size={18} showLabel={false} />
                    <span>OM Guichet</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Observation / N° Reçu Papier (Optionnel)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Reçu papier délivré..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-[#1A237E] to-indigo-800 hover:from-indigo-900 hover:to-[#1A237E] text-white font-black rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center space-x-2 border border-amber-400/40"
              >
                <PlusCircle size={16} />
                <span>{isSubmitting ? "Enregistrement..." : "Enregistrer et Cumuler en Caisse"}</span>
              </button>
            </form>
          </div>

          {/* Quick Summary Info */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-gradient-to-br from-indigo-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 border-2 border-indigo-200 dark:border-slate-700 rounded-3xl p-5 space-y-3">
              <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center space-x-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>Règles de Gestion & Sécurité Financière</span>
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Toutes les entrées enregistrées sont directement associées au compte administrateur <strong>{adminName}</strong> et sont cumulées dans le Grand Livre comptable. Les élèves ne peuvent en aucun cas consulter les données comptables ni les transactions des autres élèves.
              </p>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 space-y-2">
                <span className="font-extrabold text-[11px] text-[#1A237E] dark:text-amber-300 block">
                  Récapitulatif des recettes guichet :
                </span>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Espèces (Cash) :</span>
                  <span className="font-mono text-emerald-600">{totalCashDirect.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Wave Guichet :</span>
                  <span className="font-mono text-sky-600">{totalWaveCaisse.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Orange Money Guichet :</span>
                  <span className="font-mono text-orange-600">{totalOMCaisse.toLocaleString("fr-FR")} FCFA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: GRAND LIVRE & JOURNAL CONSOLIDÉ                                   */}
      {/* ========================================================================= */}
      {activeSubTab === "ledger" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center space-x-2">
                <Wallet className="text-[#1A237E] dark:text-indigo-400" size={18} />
                <span>Grand Livre des Recettes Validées & Encaissées</span>
              </h4>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleClearAllLedgerHistory}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer"
                  title="Supprimer définitivement toutes les écritures de la caisse"
                >
                  <Trash2 size={13} />
                  <span>Vider tout l'historique</span>
                </button>

                <div className="relative w-full sm:w-52">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher écriture..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 pl-8 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {/* Direct Caisse entries */}
              {caisseTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-slate-900 dark:text-white text-xs block">
                        {tx.studentName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {tx.phone !== "Non spécifié" ? `📞 ${tx.phone}` : "Guichet"} • {tx.dateFormatted}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono block">
                        +{tx.amount.toLocaleString("fr-FR")} FCFA
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-[9px] font-black inline-block mt-0.5">
                        {tx.paymentMethod}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                    <span className="font-bold text-[#1A237E] dark:text-indigo-300">
                      Motif : {tx.motif}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 italic">
                        Encaissé par : {tx.adminName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCaisseTransaction(tx)}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 font-bold rounded-lg text-[10px] transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 flex items-center space-x-1"
                        title="Supprimer cette écriture"
                      >
                        <Trash2 size={11} />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Validated Online transactions */}
              {approvedOnlineCourseTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2 hover:border-emerald-400 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-slate-900 dark:text-white text-xs block">
                        {tx.learnerName || tx.userName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        En ligne ({tx.type === "domicile" ? "Domicile" : "Centre"}) • {tx.level} • {tx.dateFormatted}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono block">
                        +{tx.amount.toLocaleString("fr-FR")} FCFA
                      </span>
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full text-[9px] font-black inline-block mt-0.5">
                        {(tx.operator || "wave").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-emerald-100 dark:border-emerald-900/50">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      Réf: {tx.id}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-700 font-bold">
                        Validé électroniquement ✓
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteOnlineItem({ id: tx.id, source: "course", studentName: tx.learnerName || tx.userName })}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 font-bold rounded-lg text-[10px] transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 flex items-center space-x-1"
                        title="Supprimer cette écriture"
                      >
                        <Trash2 size={11} />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Validated VIP Pass transactions */}
              {approvedVipRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 hover:border-amber-400 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-slate-900 dark:text-white text-xs block">
                        {req.studentName || req.userName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Pass VIP ({req.plan_duration || req.plan_id || "VIP"}) • {req.dateFormatted}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-amber-700 dark:text-amber-400 text-sm font-mono block">
                        +{req.amount.toLocaleString("fr-FR")} FCFA
                      </span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[9px] font-black inline-block mt-0.5">
                        👑 VIP ({(req.operator || "WAVE").toUpperCase()})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-amber-100 dark:border-amber-900/50">
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      Réf: {req.transaction_ref || req.transactionRef || req.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteOnlineItem({ id: req.id, source: "vip", studentName: req.studentName || req.userName || "VIP" })}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 font-bold rounded-lg text-[10px] transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 flex items-center space-x-1"
                      title="Supprimer cette écriture VIP"
                    >
                      <Trash2 size={11} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-800 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-black text-rose-700 dark:text-rose-400 text-sm flex items-center space-x-2">
                <XCircle size={18} />
                <span>Refuser le Paiement</span>
              </h4>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Vous êtes sur le point de refuser le paiement de <strong>{rejectingItem.name}</strong> d'un montant de <strong>{rejectingItem.amount.toLocaleString("fr-FR")} FCFA</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Motif explicatif (transmis à l'élève dans la notification) :
              </label>
              <textarea
                rows={3}
                required
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="Ex: Code de transaction introuvable ou montant non reçu sur le 78 376 95 84..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Confirmer le Refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: REMETTRE LE CUMUL À 0 F */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-800 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-modal-scale">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-black text-rose-700 dark:text-rose-400 text-sm flex items-center space-x-2">
                <RotateCcw size={18} />
                <span>Réinitialiser le Solde de Caisse</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">
                Voulez-vous vraiment remettre le solde cumulé de la trésorerie à 0 FCFA (état initial) ?
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-extrabold flex items-center space-x-1">
                  <AlertCircle size={14} className="text-amber-600" />
                  <span>Conséquences de l'action :</span>
                </p>
                <p>• Le montant total cumulé repartira de 0 FCFA dans la base de données distante Supabase.</p>
                <p>• L'historique complet des écritures et transactions reste intégralement archivé et consultable.</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetCumul}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                {isResetting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Réinitialisation...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Confirmer la remise à 0 F</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL CODE MODAL: COPIER LE CODE POUR SUPABASE */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-indigo-400 dark:border-indigo-800 rounded-3xl p-5 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-modal-scale">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-[#1A237E] dark:text-indigo-300 rounded-xl">
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">
                    Script SQL Supabase pour Activer Caisse, Trésorerie & Audit
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Copiez et collez ce script dans l'onglet SQL Editor de votre projet Supabase.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-[11px] text-indigo-900 dark:text-indigo-200">
              <p className="font-bold flex items-center space-x-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>Ce script crée les tables distantes : caisse_transactions, admin_audit_logs, app_config, payment_transactions et vip_payment_requests avec Row Level Security (RLS) activé.</span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 rounded-2xl p-4 font-mono text-[11px] leading-relaxed border border-slate-800 relative">
              <pre className="whitespace-pre-wrap select-all">
{`-- ============================================================
-- SCRIPT SQL SUPABASE - GÉNIE MENTOR ACADÉMIE (GMA) (Caisse, Trésorerie & Audit)
-- ============================================================

-- 1. Table de la Caisse Guichet (Espèces, Wave, Orange Money)
CREATE TABLE IF NOT EXISTS public.caisse_transactions (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_matricule TEXT,
    phone TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    motif TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    note TEXT,
    admin_name TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    date_formatted TEXT
);

-- 2. Table du Journal de Sécurité & Audit Administrateur
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_email TEXT NOT NULL,
    admin_name TEXT,
    action_type TEXT NOT NULL,
    target TEXT,
    details TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    date_formatted TEXT,
    action TEXT,
    timestamp BIGINT
);

-- 3. Table de Configuration Globale (Cumul Caisse, Reset, Versions)
CREATE TABLE IF NOT EXISTS public.app_config (
    id TEXT PRIMARY KEY,
    key TEXT,
    value TEXT,
    reset_at BIGINT,
    updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000),
    global_version TEXT,
    published_at BIGINT,
    published_by TEXT,
    logo_url TEXT,
    app_name TEXT,
    official_signature TEXT
);

-- 4. Table des Transactions Cours en Ligne (Wave & Orange Money)
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

-- 5. Table des Demandes d'Activation Pass VIP
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

-- 6. Activation de Row Level Security (RLS) et politiques d'accès
ALTER TABLE public.caisse_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caisse_tx_all" ON public.caisse_transactions;
CREATE POLICY "caisse_tx_all" ON public.caisse_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_all" ON public.admin_audit_logs;
CREATE POLICY "audit_logs_all" ON public.admin_audit_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_config_all" ON public.app_config;
CREATE POLICY "app_config_all" ON public.app_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_tx_all" ON public.payment_transactions;
CREATE POLICY "payment_tx_all" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.vip_payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vip_req_all" ON public.vip_payment_requests;
CREATE POLICY "vip_req_all" ON public.vip_payment_requests FOR ALL USING (true) WITH CHECK (true);

-- 7. Table des Demandes de Changement de Classe
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

ALTER TABLE public.class_change_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_change_requests_all" ON public.class_change_requests;
CREATE POLICY "class_change_requests_all" ON public.class_change_requests FOR ALL USING (true) WITH CHECK (true);

-- 8. Activer le Realtime Supabase sur toutes les tables administratives
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_change_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.caisse_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_payment_requests;`}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Ouvrez Supabase &gt; SQL Editor &gt; New Query &gt; Coller &gt; Run
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sqlText = `-- ============================================================
-- SCRIPT SQL SUPABASE - GÉNIE MENTOR ACADÉMIE (GMA) (Caisse, Trésorerie & Audit)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.caisse_transactions (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_matricule TEXT,
    phone TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    motif TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    note TEXT,
    admin_name TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    date_formatted TEXT
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_email TEXT NOT NULL,
    admin_name TEXT,
    action_type TEXT NOT NULL,
    target TEXT,
    details TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    date_formatted TEXT,
    action TEXT,
    timestamp BIGINT
);

CREATE TABLE IF NOT EXISTS public.app_config (
    id TEXT PRIMARY KEY,
    key TEXT,
    value TEXT,
    reset_at BIGINT,
    updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000),
    global_version TEXT,
    published_at BIGINT,
    published_by TEXT,
    logo_url TEXT,
    app_name TEXT,
    official_signature TEXT
);

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

ALTER TABLE public.caisse_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caisse_tx_all" ON public.caisse_transactions;
CREATE POLICY "caisse_tx_all" ON public.caisse_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_all" ON public.admin_audit_logs;
CREATE POLICY "audit_logs_all" ON public.admin_audit_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_config_all" ON public.app_config;
CREATE POLICY "app_config_all" ON public.app_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_tx_all" ON public.payment_transactions;
CREATE POLICY "payment_tx_all" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.vip_payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vip_req_all" ON public.vip_payment_requests;
CREATE POLICY "vip_req_all" ON public.vip_payment_requests FOR ALL USING (true) WITH CHECK (true);`;
                    navigator.clipboard.writeText(sqlText);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 3000);
                  }}
                  className="px-4 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  {sqlCopied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Copié dans le presse-papiers !</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copier le Code SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
