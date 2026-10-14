import React, { useState, useEffect, useCallback, useRef } from "react";
import { UserNotification, PaymentTransaction, UserProfile } from "../types";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { supabase } from "../supabaseClient";
import { ADMIN_EMAILS, isUserAdmin } from "../utils/vipUtils";
import { formatFriendlyNotificationDate } from "../utils/dateUtils";
import {
  Bell,
  X,
  Check,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Layers,
  Inbox,
  CheckCheck,
  SendHorizontal,
  Crown,
  GraduationCap,
  Sparkles,
  XCircle,
  RefreshCw,
} from "lucide-react";

export interface NotificationCenterProps {
  user?: UserProfile | null;
  userUid?: string;
  isAdmin?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectTransactionForReceipt?: (tx: PaymentTransaction) => void;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  onUnreadCountChange?: (count: number) => void;
  variant?: "modal" | "dropdown" | "embedded";
}

type NotificationFilter = "all" | "unread" | "read" | "requests";

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  user: userProp,
  userUid: userUidProp,
  isAdmin: isAdminProp,
  isOpen = true,
  onClose,
  onSelectTransactionForReceipt,
  onOpenReceipt,
  onUnreadCountChange,
  variant = "modal",
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [isLoading, setIsLoading] = useState(false);

  const effectiveUid = userProp?.uid || userProp?.id || userUidProp || "";
  const effectiveEmail = (userProp?.email || "").toLowerCase().trim();
  const effectiveIsAdmin = Boolean(
    isAdminProp ||
    userProp?.isAdmin ||
    isUserAdmin(userProp || {}) ||
    (effectiveEmail && ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(effectiveEmail))
  );

  const isLocalRead = (notifId: string): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const byUser = localStorage.getItem(`savoir_read_notif_${effectiveUid}_${notifId}`);
      const general = localStorage.getItem(`savoir_read_notif_${notifId}`);
      const dismissed = localStorage.getItem(`savoir_dismissed_notif_${notifId}`);
      return byUser === "true" || general === "true" || dismissed === "true";
    } catch {
      return false;
    }
  };

  const markLocalRead = (notifId: string) => {
    if (typeof window === "undefined") return;
    try {
      if (effectiveUid) {
        localStorage.setItem(`savoir_read_notif_${effectiveUid}_${notifId}`, "true");
      }
      localStorage.setItem(`savoir_read_notif_${notifId}`, "true");
      localStorage.setItem(`savoir_dismissed_notif_${notifId}`, "true");
      window.dispatchEvent(new CustomEvent("savoir_notif_read_updated", { detail: { notifId, uid: effectiveUid } }));
    } catch {}
  };

  // 1. Récupération des notifications depuis Supabase avec génération dynamique si nécessaire
  const fetchAllNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentEmail = (authData.user?.email || effectiveEmail).toLowerCase().trim();
      const currentId = authData.user?.id || effectiveUid;

      const userIsAdmin = Boolean(
        effectiveIsAdmin ||
        (currentEmail && ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(currentEmail))
      );

      let fetchedList: UserNotification[] = [];

      // A. Requête sur la table notifications
      try {
        let query = supabase.from("notifications").select("*");

        if (userIsAdmin) {
          query = query.or("recipient.eq.admin,target_role.eq.admin,target_role.eq.all");
        } else {
          const conditions: string[] = [];
          if (currentId) {
            conditions.push(`user_id.eq.${currentId}`);
            conditions.push(`user_uid.eq.${currentId}`);
            conditions.push(`recipient_id.eq.${currentId}`);
            conditions.push(`target_uid.eq.${currentId}`);
            conditions.push(`recipient.eq.${currentId}`);
          }
          if (currentEmail) {
            conditions.push(`recipient.eq.${currentEmail}`);
            conditions.push(`user_email.eq.${currentEmail}`);
          }
          conditions.push("target_role.eq.all");
          conditions.push("recipient.eq.all");

          query = query.or(conditions.join(","));
        }

        const { data, error } = await query
          .neq("status", "PROCESSED")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          fetchedList = data.map((d: any) => {
            const id = String(d.id || `notif_${d.created_at}`);
            const alreadyRead = isLocalRead(id) || d.is_read || d.status === "READ" || d.status === "read";
            return {
              id,
              recipient: d.recipient || d.target_uid,
              sender_email: d.sender_email || d.user_email,
              targetUid: d.target_uid || d.recipient,
              target_uid: d.target_uid || d.recipient,
              userUid: d.user_uid || d.user_id || d.sender_email || d.recipient,
              userId: d.user_id || d.user_uid || d.sender_email || d.recipient,
              userName: d.user_name || d.sender_email || "Utilisateur",
              userEmail: d.sender_email || d.user_email || d.recipient,
              recipientId: d.recipient || d.recipient_id,
              title: d.title || "",
              message: d.message || "",
              type: d.type || "SYSTEM",
              status: alreadyRead ? ("READ" as const) : ("UNREAD" as const),
              transactionId: d.transaction_id,
              createdAt: Number(d.created_at || Date.now()),
              dateFormatted: formatFriendlyNotificationDate(d.date_formatted || d.created_at || Date.now()),
            };
          });
        }
      } catch (err) {
        console.warn("[NotificationCenter] Erreur lecture table notifications:", err);
      }

      // B. Génération dynamique
      if (!userIsAdmin && currentId) {
        const dynamicCards: UserNotification[] = [];

        // 1. Demandes de changement de classe validées ou refusées pour l'élève
        try {
          const { data: classData } = await supabase
            .from("class_change_requests")
            .select("*")
            .or(`student_uid.eq.${currentId},user_uid.eq.${currentId}${currentEmail ? `,student_email.eq.${currentEmail}` : ""}`)
            .order("requested_at", { ascending: false });

          if (classData && classData.length > 0) {
            classData.forEach((req: any) => {
              const statusStr = String(req.status || "pending").toUpperCase();
              const reqId = req.id || `cls_${req.requested_at}`;
              const targetClass = req.requested_level || req.requested_class || req.requestedLevel || "supérieure";
              const dateTs = Number(req.updated_at || req.requested_at || req.created_at || Date.now());
              const dateStr = formatFriendlyNotificationDate(dateTs);

              if (statusStr === "APPROVED" || statusStr === "VALIDATED") {
                const notifId = `dyn_cls_appr_${reqId}`;
                const alreadyRead = isLocalRead(notifId);
                dynamicCards.push({
                  id: notifId,
                  userUid: currentId,
                  userId: currentId,
                  title: "🎓 Votre passage en classe supérieure a été validé !",
                  message: `Félicitations ! Votre demande de passage en classe de ${targetClass} a été approuvée par la Direction. Vos cours, devoirs et exercices sont à jour.`,
                  type: "class_approved",
                  status: alreadyRead ? "READ" : "UNREAD",
                  createdAt: dateTs,
                  dateFormatted: dateStr,
                });
              } else if (statusStr === "REJECTED") {
                const notifId = `dyn_cls_rej_${reqId}`;
                const alreadyRead = isLocalRead(notifId);
                dynamicCards.push({
                  id: notifId,
                  userUid: currentId,
                  userId: currentId,
                  title: "❌ Demande de changement de classe non validée",
                  message: `Votre demande pour passer en classe de ${targetClass} n'a pas été acceptée par l'administration.${req.reason || req.rejection_reason ? ` Motif : "${req.reason || req.rejection_reason}"` : ""}`,
                  type: "class_rejected",
                  status: alreadyRead ? "READ" : "UNREAD",
                  createdAt: dateTs,
                  dateFormatted: dateStr,
                });
              }
            });
          }
        } catch (clsErr) {
          console.warn("[NotificationCenter] Notice fetch class_change_requests:", clsErr);
        }

        // 2. Demandes de paiement VIP validées ou refusées pour l'élève
        try {
          const { data: vipData } = await supabase
            .from("vip_payment_requests")
            .select("*")
            .or(`student_uid.eq.${currentId},user_uid.eq.${currentId}`)
            .order("requested_at", { ascending: false });

          if (vipData && vipData.length > 0) {
            vipData.forEach((req: any) => {
              const statusStr = String(req.status || "pending").toUpperCase();
              const reqId = req.id || `vip_${req.requested_at}`;
              const planLabel = req.plan_duration || req.plan_id || req.planId || "Pass VIP";
              const dateTs = Number(req.updated_at || req.requested_at || req.created_at || Date.now());
              const dateStr = formatFriendlyNotificationDate(dateTs);

              if (statusStr === "APPROVED" || statusStr === "VALIDATED") {
                const notifId = `dyn_vip_appr_${reqId}`;
                const alreadyRead = isLocalRead(notifId);
                dynamicCards.push({
                  id: notifId,
                  userUid: currentId,
                  userId: currentId,
                  title: "👑 Votre accès VIP est activé !",
                  message: `Félicitations ! Votre paiement pour le ${planLabel} a été validé avec succès par la Direction. Profitez de l'intégralité des contenus exclusifs et corrigés.`,
                  type: "vip_approved",
                  status: alreadyRead ? "READ" : "UNREAD",
                  createdAt: dateTs,
                  dateFormatted: dateStr,
                });
              } else if (statusStr === "REJECTED") {
                const notifId = `dyn_vip_rej_${reqId}`;
                const alreadyRead = isLocalRead(notifId);
                dynamicCards.push({
                  id: notifId,
                  userUid: currentId,
                  userId: currentId,
                  title: "❌ Paiement Pass VIP non validé",
                  message: `Votre demande de Pass VIP (${planLabel}) n'a pas été acceptée.${req.rejection_reason ? ` Motif : "${req.rejection_reason}"` : ""}`,
                  type: "vip_rejected",
                  status: alreadyRead ? "READ" : "UNREAD",
                  createdAt: dateTs,
                  dateFormatted: dateStr,
                });
              }
            });
          }
        } catch (vipErr) {
          console.warn("[NotificationCenter] Notice fetch vip_payment_requests:", vipErr);
        }

        // Combiner sans doublons
        const map = new Map<string, UserNotification>();
        fetchedList.forEach((n) => map.set(n.id, n));
        dynamicCards.forEach((d) => {
          if (!map.has(d.id)) {
            map.set(d.id, d);
          }
        });
        fetchedList = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      } else if (userIsAdmin) {
        // Admin Dynamic Notifications: Alert on every pending request or transaction
        const adminDynamicCards: UserNotification[] = [];

        // 1. Demandes de changement de classe en attente
        try {
          const { data: pendingClassReqs } = await supabase
            .from("class_change_requests")
            .select("*")
            .eq("status", "pending")
            .order("requested_at", { ascending: false });

          if (pendingClassReqs && pendingClassReqs.length > 0) {
            pendingClassReqs.forEach((req: any) => {
              const notifId = `admin_cls_pend_${req.id}`;
              const alreadyRead = isLocalRead(notifId);
              const dateTs = Number(req.requested_at || req.created_at || Date.now());
              adminDynamicCards.push({
                id: notifId,
                recipient: "admin",
                recipientId: "admin",
                target_uid: "admin",
                targetUid: "admin",
                userUid: req.student_uid || req.user_uid,
                userName: req.student_name || "Élève",
                title: "🎓 Nouvelle demande de changement de classe",
                message: `L'élève ${req.student_name || "Élève"} (${req.student_email || "Élève"}) demande à passer de ${req.current_level || "sa classe"} en ${req.requested_level || "classe supérieure"}. Motif: "${req.reason || "Non précisé"}".`,
                type: "CLASS_CHANGE",
                status: alreadyRead ? "READ" : "UNREAD",
                createdAt: dateTs,
                dateFormatted: formatFriendlyNotificationDate(dateTs),
              });
            });
          }
        } catch {}

        // 2. Demandes Pass VIP en attente
        try {
          const { data: pendingVipReqs } = await supabase
            .from("vip_payment_requests")
            .select("*")
            .eq("status", "PENDING")
            .order("requested_at", { ascending: false });

          if (pendingVipReqs && pendingVipReqs.length > 0) {
            pendingVipReqs.forEach((req: any) => {
              const notifId = `admin_vip_pend_${req.id}`;
              const alreadyRead = isLocalRead(notifId);
              const dateTs = Number(req.requested_at || req.created_at || Date.now());
              adminDynamicCards.push({
                id: notifId,
                recipient: "admin",
                recipientId: "admin",
                target_uid: "admin",
                targetUid: "admin",
                userUid: req.student_uid || req.user_uid,
                userName: req.student_name || "Élève",
                title: "👑 Nouvelle souscription Pass VIP",
                message: `L'élève ${req.student_name || req.userName || "Élève"} a soumis un paiement VIP de ${(Number(req.amount) || 2000).toLocaleString("fr-FR")} FCFA via ${(req.operator || "WAVE").toUpperCase()} (Réf: ${req.transaction_ref || req.id}).`,
                type: "VIP_PASS",
                status: alreadyRead ? "READ" : "UNREAD",
                createdAt: dateTs,
                dateFormatted: formatFriendlyNotificationDate(dateTs),
              });
            });
          }
        } catch {}

        // 3. Transactions de cours en attente
        try {
          const { data: pendingTxs } = await supabase
            .from("transactions")
            .select("*")
            .or("status.eq.PENDING,status.eq.pending")
            .order("created_at", { ascending: false });

          if (pendingTxs && pendingTxs.length > 0) {
            pendingTxs.forEach((tx: any) => {
              const notifId = `admin_tx_pend_${tx.id || tx.transaction_id}`;
              const alreadyRead = isLocalRead(notifId);
              const dateTs = tx.created_at ? (typeof tx.created_at === "number" ? tx.created_at : new Date(tx.created_at).getTime()) : Date.now();
              adminDynamicCards.push({
                id: notifId,
                recipient: "admin",
                recipientId: "admin",
                target_uid: "admin",
                targetUid: "admin",
                userUid: tx.user_id || tx.user_uid,
                userName: tx.student_name || "Élève",
                title: `💳 Nouveau paiement ${(tx.operator || "WAVE").toUpperCase()}`,
                message: `Paiement de ${(Number(tx.amount) || 0).toLocaleString("fr-FR")} FCFA reçu pour l'élève ${tx.student_name || "Apprenant"} (${tx.class_name || "Cours"}, Réf: ${tx.transaction_id || tx.id}).`,
                type: "SYSTEM",
                status: alreadyRead ? "READ" : "UNREAD",
                createdAt: dateTs,
                dateFormatted: formatFriendlyNotificationDate(dateTs),
              });
            });
          }
        } catch {}

        // Combiner sans doublons pour l'admin
        const map = new Map<string, UserNotification>();
        fetchedList.forEach((n) => map.set(n.id, n));
        adminDynamicCards.forEach((d) => {
          if (!map.has(d.id)) {
            map.set(d.id, d);
          }
        });
        fetchedList = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      }

      // C. Sauvegarde dans Room local
      if (fetchedList.length > 0) {
        fetchedList.forEach((n) => roomRepo.insertNotification(n));
      } else if (currentId) {
        fetchedList = roomRepo.getNotificationsByUser(currentId, userIsAdmin).map((n) => ({
          ...n,
          status: isLocalRead(n.id) ? "READ" : (n.status === "read" || n.status === "READ" ? "READ" : "UNREAD"),
        }));
      }

      setNotifications(fetchedList);
    } catch (err) {
      console.warn("[NotificationCenter] Erreur globale chargement notifications:", err);
      const local = roomRepo.getNotificationsByUser(effectiveUid, effectiveIsAdmin);
      setNotifications(local);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUid, effectiveEmail, effectiveIsAdmin]);

  useEffect(() => {
    if (isOpen) {
      fetchAllNotifications();
    }

    const handleReadEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ notifId: string }>;
      if (customEvent.detail?.notifId) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === customEvent.detail.notifId ? { ...n, status: "READ" as const } : n))
        );
      }
    };

    window.addEventListener("savoir_notif_read_updated", handleReadEvent);

    return () => {
      window.removeEventListener("savoir_notif_read_updated", handleReadEvent);
    };
  }, [isOpen, fetchAllNotifications]);

  // 2. Marquer une notification comme lue et acquitter immédiatement le badge rouge
  const handleMarkAsRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // A. Stockage local immédiat (Zéro latence)
    markLocalRead(notifId);

    // B. Mise à jour de l'état React local
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, status: "READ" as const } : n))
    );

    // C. Mise à jour dans Room
    roomRepo.markNotificationAsRead(notifId, effectiveUid);

    // D. Mise à jour dans Supabase si table notifications existe
    if (!notifId.startsWith("dyn_")) {
      try {
        await supabase
          .from("notifications")
          .update({ is_read: true, status: "READ" })
          .eq("id", notifId);
      } catch (err) {
        console.warn("[Supabase] Notice mark notification read:", err);
      }
    }
  };

  // Tout marquer comme lu
  const handleMarkAllAsRead = async () => {
    notifications.forEach((n) => markLocalRead(n.id));

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: "READ" as const }))
    );

    if (effectiveUid) {
      roomRepo.markAllNotificationsAsRead(effectiveUid);
    }

    try {
      if (effectiveIsAdmin) {
        await supabase.from("notifications").update({ is_read: true, status: "READ" }).eq("recipient", "admin");
      } else if (effectiveEmail) {
        await supabase.from("notifications").update({ is_read: true, status: "READ" }).eq("recipient", effectiveEmail);
      }
    } catch {}
  };

  // Supprimer une notification
  const handleDeleteNotification = async (notifId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    markLocalRead(notifId);
    roomRepo.deleteNotification(notifId, effectiveUid);

    setNotifications((prev) => prev.filter((n) => n.id !== notifId));

    if (!notifId.startsWith("dyn_")) {
      try {
        await supabase.from("notifications").delete().eq("id", notifId);
      } catch {}
    }
  };

  // Tout effacer
  const handleClearAll = async () => {
    if (window.confirm("Voulez-vous effacer toutes vos notifications ?")) {
      notifications.forEach((n) => {
        markLocalRead(n.id);
        roomRepo.deleteNotification(n.id, effectiveUid);
      });

      setNotifications([]);

      try {
        if (effectiveUid) {
          await supabase.from("notifications").delete().eq("target_uid", effectiveUid);
        }
      } catch {}
    }
  };

  // Synchronisation sécurisée du compteur de notifications non lues avec le parent
  const unreadCountRef = useRef(onUnreadCountChange);
  useEffect(() => {
    unreadCountRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  const uniqueNotifs = Array.from(
    new Map<string, UserNotification>(notifications.map((n, i) => [n.id || `notif_${i}`, n])).values()
  );

  const unreadCount = uniqueNotifs.filter((n) => (n.status === "UNREAD" || n.status === "unread") && !isLocalRead(n.id)).length;

  useEffect(() => {
    if (unreadCountRef.current) {
      unreadCountRef.current(unreadCount);
    }
  }, [unreadCount]);

  if (!isOpen && variant === "modal") return null;

  const readCount = uniqueNotifs.filter((n) => (n.status === "READ" || n.status === "read") || isLocalRead(n.id)).length;
  const requestsCount = uniqueNotifs.filter(
    (n) =>
      n.type === "vip_request" ||
      n.type === "vip_approved" ||
      n.type === "vip_rejected" ||
      n.type === "class_change" ||
      n.type === "class_approved" ||
      n.type === "class_rejected" ||
      n.title.toLowerCase().includes("demande") ||
      n.title.toLowerCase().includes("pass") ||
      n.title.toLowerCase().includes("classe") ||
      n.title.toLowerCase().includes("paiement")
  ).length;

  const filteredNotifs = uniqueNotifs.filter((n) => {
    const isUnread = (n.status === "UNREAD" || n.status === "unread") && !isLocalRead(n.id);
    if (activeFilter === "unread") return isUnread;
    if (activeFilter === "read") return !isUnread;
    if (activeFilter === "requests") {
      return (
        n.type === "vip_request" ||
        n.type === "vip_approved" ||
        n.type === "vip_rejected" ||
        n.type === "class_change" ||
        n.type === "class_approved" ||
        n.type === "class_rejected" ||
        n.title.toLowerCase().includes("demande") ||
        n.title.toLowerCase().includes("pass") ||
        n.title.toLowerCase().includes("classe") ||
        n.title.toLowerCase().includes("paiement")
      );
    }
    return true;
  });

  const getCardStatusBadge = (notif: UserNotification) => {
    const titleLower = notif.title.toLowerCase();
    const msgLower = (notif.message || "").toLowerCase();
    const typeLower = (notif.type || "").toLowerCase();

    const isApproved =
      typeLower.includes("approved") ||
      titleLower.includes("validé") ||
      titleLower.includes("approuv") ||
      titleLower.includes("activé") ||
      titleLower.includes("accepté") ||
      msgLower.includes("a validé") ||
      msgLower.includes("accepté");

    const isRejected =
      typeLower.includes("rejected") ||
      titleLower.includes("rejeté") ||
      titleLower.includes("refus") ||
      titleLower.includes("non validé") ||
      msgLower.includes("n'a pas été acceptée");

    const isPending =
      titleLower.includes("transmis") ||
      titleLower.includes("en cours") ||
      titleLower.includes("attente") ||
      msgLower.includes("en cours d'examen");

    if (isApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 shadow-2xs">
          <CheckCircle2 size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Validée / Active</span>
        </span>
      );
    }

    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300/80 shadow-2xs">
          <XCircle size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />
          <span>Refusée</span>
        </span>
      );
    }

    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/80 shadow-2xs">
          <Clock size={12} className="shrink-0 text-amber-600 dark:text-amber-400 animate-spin" />
          <span>En cours d'examen</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300/60">
        <SendHorizontal size={12} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
        <span>Information GMA</span>
      </span>
    );
  };

  const content = (
    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-4 my-auto relative animate-in zoom-in-95 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-[#1A237E] dark:text-indigo-300 flex items-center justify-center relative font-bold shadow-xs">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Centre de Notifications
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Validations, alertes et suivi de compte
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs shrink-0 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeFilter === "all"
              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Layers size={13} />
          <span>Toutes ({uniqueNotifs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("unread")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeFilter === "unread"
              ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Inbox size={13} />
          <span>Non lues ({unreadCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("requests")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeFilter === "requests"
              ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Clock size={13} />
          <span>Démarches ({requestsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("read")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeFilter === "read"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <CheckCheck size={13} />
          <span>Lues ({readCount})</span>
        </button>
      </div>

      {/* Action bar */}
      {uniqueNotifs.length > 0 && (
        <div className="flex items-center justify-between shrink-0 text-xs px-1">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-xs text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 font-bold flex items-center space-x-1.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Check size={14} />
              <span>Tout marquer comme lu</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium">
              Toutes vos notifications sont à jour
            </span>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-rose-700 dark:text-rose-300 hover:text-rose-900 font-bold flex items-center space-x-1 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ml-auto"
          >
            <Trash2 size={13} />
            <span>Tout effacer</span>
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
        {isLoading && filteredNotifs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Chargement des notifications...</p>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Bell size={36} className="mx-auto opacity-30" />
            <p className="text-xs font-semibold">
              {activeFilter === "unread"
                ? "Aucune notification non lue."
                : activeFilter === "read"
                ? "Aucune notification archivée comme lue."
                : activeFilter === "requests"
                ? "Aucune démarche ou requête en cours."
                : "Aucune notification pour le moment."}
            </p>
          </div>
        ) : (
          filteredNotifs.map((notif, idx) => {
            const isUnread = (notif.status === "UNREAD" || notif.status === "unread") && !isLocalRead(notif.id);

            return (
              <div
                key={`${notif.id}_${idx}`}
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 relative ${
                  isUnread
                    ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 shadow-xs"
                    : "bg-slate-50/90 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80"
                }`}
              >
                {/* Header with status badge & action */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>{getCardStatusBadge(notif)}</div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black rounded-lg transition-transform active:scale-95 cursor-pointer flex items-center space-x-1 shadow-2xs"
                        title="Acquitter et masquer le badge rouge"
                      >
                        <Check size={12} />
                        <span>Marquer lu</span>
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-md flex items-center space-x-1 border border-emerald-300/40">
                        <span>✅ Vu</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(notif.id, e)}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer flex items-center space-x-1 border border-rose-200 dark:border-rose-800/80 shadow-2xs"
                      title="Supprimer définitivement cette notification"
                    >
                      <Trash2 size={12} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h4
                  className={`text-xs leading-snug ${
                    isUnread
                      ? "text-indigo-950 dark:text-indigo-100 font-black"
                      : "text-slate-800 dark:text-slate-200 font-bold"
                  }`}
                >
                  {notif.title}
                </h4>

                {/* Message body */}
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {notif.message}
                </p>

                {/* Footer with date & primary dismiss button */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-200/70 dark:border-slate-700">
                  <span>{formatFriendlyNotificationDate(notif.createdAt || notif.dateFormatted)}</span>

                  <div className="flex items-center space-x-2">
                    {notif.transactionId && (
                      <button
                        type="button"
                        onClick={() => {
                          handleMarkAsRead(notif.id);
                          const tx = roomRepo.getAllTransactions().find((t) => t.id === notif.transactionId);
                          if (tx) {
                            if (onSelectTransactionForReceipt) onSelectTransactionForReceipt(tx);
                            else if (onOpenReceipt) onOpenReceipt(tx);
                            if (onClose) onClose();
                          }
                        }}
                        className="text-[#1A237E] dark:text-amber-400 font-extrabold flex items-center space-x-1 hover:underline cursor-pointer"
                      >
                        <FileText size={12} />
                        <span>Voir Reçu</span>
                      </button>
                    )}

                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="px-2 py-0.5 bg-indigo-900 text-white font-black text-[10px] rounded-md hover:bg-indigo-800 transition-colors cursor-pointer"
                      >
                        J'ai compris
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-bold text-xs rounded-xl shadow cursor-pointer shrink-0 transition-colors"
        >
          Fermer
        </button>
      )}
    </div>
  );

  if (variant === "embedded") {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};

export default NotificationCenter;
