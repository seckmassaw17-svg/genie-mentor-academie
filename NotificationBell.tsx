import React, { useEffect, useState, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../supabaseClient";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { UserProfile, UserNotification } from "../types";
import { ADMIN_EMAILS, isUserAdmin } from "../utils/vipUtils";

export interface NotificationBellProps {
  user?: UserProfile | null;
  userUid?: string;
  isAdmin?: boolean;
  unreadNotifCount?: number;
  onOpenNotifications?: () => void;
  onUnreadCountChange?: (count: number) => void;
  className?: string;
  iconSize?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  user: userProp,
  userUid: userUidProp,
  isAdmin: isAdminProp,
  unreadNotifCount: externalUnreadCount,
  onOpenNotifications,
  onUnreadCountChange,
  className = "",
  iconSize = 18,
}) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const roomRepo = RoomDatabaseRepository.getInstance();

  const userEmail = (userProp?.email || "").toLowerCase().trim();
  const currentId = userProp?.id || userProp?.uid || userUidProp || "";

  const isLocalRead = useCallback((notifId: string): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const byUser = currentId ? localStorage.getItem(`savoir_read_notif_${currentId}_${notifId}`) : null;
      const general = localStorage.getItem(`savoir_read_notif_${notifId}`);
      const dismissed = localStorage.getItem(`savoir_dismissed_notif_${notifId}`);
      return byUser === "true" || general === "true" || dismissed === "true";
    } catch {
      return false;
    }
  }, [currentId]);

  const unreadCountChangeRef = useRef(onUnreadCountChange);
  useEffect(() => {
    unreadCountChangeRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (unreadCountChangeRef.current) {
      unreadCountChangeRef.current(unreadCount);
    }
  }, [unreadCount]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentEmail = (authData.user?.email || userEmail).toLowerCase().trim();
      const effectiveId = authData.user?.id || currentId;

      const userIsAdmin = Boolean(
        isAdminProp ||
        userProp?.isAdmin ||
        isUserAdmin(userProp || {}) ||
        (currentEmail && ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(currentEmail))
      );

      let unreadTotal = 0;
      let remoteNotifs: UserNotification[] = [];

      // 1. Check notifications table
      try {
        let query = supabase.from("notifications").select("*");

        if (userIsAdmin) {
          query = query.or("recipient.eq.admin,target_role.eq.admin,target_role.eq.all");
        } else {
          const conditions: string[] = [];
          if (effectiveId) {
            conditions.push(`user_id.eq.${effectiveId}`);
            conditions.push(`user_uid.eq.${effectiveId}`);
            conditions.push(`recipient_id.eq.${effectiveId}`);
            conditions.push(`target_uid.eq.${effectiveId}`);
            conditions.push(`recipient.eq.${effectiveId}`);
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
          remoteNotifs = data.map((d: any) => ({
            id: String(d.id),
            userUid: d.user_uid || d.user_id || effectiveId || "",
            status: (d.is_read || d.status === "READ" || d.status === "read" || isLocalRead(String(d.id))) ? "READ" : "UNREAD",
            title: d.title || "",
            message: d.message || "",
            type: d.type || "SYSTEM",
            createdAt: Number(d.created_at || Date.now()),
            dateFormatted: d.date_formatted || new Date(Number(d.created_at || Date.now())).toLocaleDateString("fr-FR"),
          }));
        }
      } catch (err) {
        console.warn("[NotificationBell] Erreur lecture notifications:", err);
      }

      // 2. Check dynamic validated/rejected requests for students
      if (!userIsAdmin && effectiveId) {
        try {
          const { data: classData } = await supabase
            .from("class_change_requests")
            .select("id, status, requested_at, updated_at, created_at")
            .or(`student_uid.eq.${effectiveId},user_uid.eq.${effectiveId}${currentEmail ? `,student_email.eq.${currentEmail}` : ""}`)
            .order("requested_at", { ascending: false });

          if (classData && classData.length > 0) {
            classData.forEach((req: any) => {
              const statusStr = String(req.status || "pending").toUpperCase();
              if (statusStr === "APPROVED" || statusStr === "VALIDATED" || statusStr === "REJECTED") {
                const notifId = statusStr === "REJECTED" ? `dyn_cls_rej_${req.id}` : `dyn_cls_appr_${req.id}`;
                if (!isLocalRead(notifId) && !remoteNotifs.some((n) => n.id === notifId)) {
                  const ts = Number(req.updated_at || req.requested_at || req.created_at || Date.now());
                  remoteNotifs.push({
                    id: notifId,
                    userUid: effectiveId,
                    status: "UNREAD",
                    title: statusStr === "REJECTED" ? "Changement de classe refusé" : "Classe validée",
                    message: "",
                    type: statusStr === "REJECTED" ? "class_rejected" : "class_approved",
                    createdAt: ts,
                    dateFormatted: new Date(ts).toLocaleDateString("fr-FR"),
                  });
                }
              }
            });
          }
        } catch {}

        try {
          const { data: vipData } = await supabase
            .from("vip_payment_requests")
            .select("id, status, requested_at, updated_at, created_at")
            .or(`student_uid.eq.${effectiveId},user_uid.eq.${effectiveId}`)
            .order("requested_at", { ascending: false });

          if (vipData && vipData.length > 0) {
            vipData.forEach((req: any) => {
              const statusStr = String(req.status || "pending").toUpperCase();
              if (statusStr === "APPROVED" || statusStr === "VALIDATED" || statusStr === "REJECTED") {
                const notifId = statusStr === "REJECTED" ? `dyn_vip_rej_${req.id}` : `dyn_vip_appr_${req.id}`;
                if (!isLocalRead(notifId) && !remoteNotifs.some((n) => n.id === notifId)) {
                  const ts = Number(req.updated_at || req.requested_at || req.created_at || Date.now());
                  remoteNotifs.push({
                    id: notifId,
                    userUid: effectiveId,
                    status: "UNREAD",
                    title: statusStr === "REJECTED" ? "VIP non validé" : "VIP validé",
                    message: "",
                    type: statusStr === "REJECTED" ? "vip_rejected" : "vip_approved",
                    createdAt: ts,
                    dateFormatted: new Date(ts).toLocaleDateString("fr-FR"),
                  });
                }
              }
            });
          }
        } catch {}
      } else if (userIsAdmin) {
        // Admin: Count pending items from tables
        try {
          const { data: pClass } = await supabase.from("class_change_requests").select("id").eq("status", "pending");
          if (pClass) {
            pClass.forEach((c: any) => {
              const notifId = `admin_cls_pend_${c.id}`;
              if (!isLocalRead(notifId) && !remoteNotifs.some((n) => n.id === notifId)) {
                remoteNotifs.push({ id: notifId, userUid: "admin", status: "UNREAD", title: "", message: "", type: "CLASS_CHANGE", createdAt: Date.now(), dateFormatted: "" });
              }
            });
          }
        } catch {}

        try {
          const { data: pVip } = await supabase.from("vip_payment_requests").select("id").eq("status", "PENDING");
          if (pVip) {
            pVip.forEach((v: any) => {
              const notifId = `admin_vip_pend_${v.id}`;
              if (!isLocalRead(notifId) && !remoteNotifs.some((n) => n.id === notifId)) {
                remoteNotifs.push({ id: notifId, userUid: "admin", status: "UNREAD", title: "", message: "", type: "VIP_PASS", createdAt: Date.now(), dateFormatted: "" });
              }
            });
          }
        } catch {}

        try {
          const { data: pTxs } = await supabase.from("transactions").select("id, transaction_id").or("status.eq.PENDING,status.eq.pending");
          if (pTxs) {
            pTxs.forEach((t: any) => {
              const notifId = `admin_tx_pend_${t.id || t.transaction_id}`;
              if (!isLocalRead(notifId) && !remoteNotifs.some((n) => n.id === notifId)) {
                remoteNotifs.push({ id: notifId, userUid: "admin", status: "UNREAD", title: "", message: "", type: "SYSTEM", createdAt: Date.now(), dateFormatted: "" });
              }
            });
          }
        } catch {}
      }

      // 3. Compter les non lus
      unreadTotal = remoteNotifs.filter((n) => (n.status === "UNREAD" || n.status === "unread") && !isLocalRead(n.id)).length;
      setUnreadCount(unreadTotal);
    } catch (err) {
      console.warn("[NotificationBell] Erreur calcul badges:", err);
      const local = roomRepo.getNotificationsByUser(currentId, Boolean(isAdminProp || userProp?.isAdmin));
      const unread = local.filter((n) => (n.status === "unread" || n.status === "UNREAD") && !isLocalRead(n.id)).length;
      setUnreadCount(unread);
    }
  }, [userEmail, currentId, isAdminProp, userProp, isLocalRead]);

  useEffect(() => {
    let isMounted = true;
    let activeChannel: any = null;

    refreshUnreadCount();

    const handleReadEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ notifId?: string }>;
      if (customEvent.detail?.notifId) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      refreshUnreadCount();
    };

    window.addEventListener("savoir_notif_read_updated", handleReadEvent);

    // Setup realtime subscription
    const currentEmail = userEmail;
    const effectiveIsAdmin = Boolean(isAdminProp || userProp?.isAdmin || isUserAdmin(userProp || {}));
    const filterStr = effectiveIsAdmin ? "recipient=eq.admin" : currentEmail ? `recipient=eq.${currentEmail}` : undefined;
    const channelName = `bell_channel_${effectiveIsAdmin ? "admin" : (currentEmail || "user").replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

    activeChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: filterStr,
        },
        () => {
          if (isMounted) refreshUnreadCount();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("savoir_notif_read_updated", handleReadEvent);
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [userEmail, isAdminProp, userProp, refreshUnreadCount]);

  const displayCount = externalUnreadCount !== undefined && externalUnreadCount >= 0
    ? (unreadCount > 0 ? unreadCount : externalUnreadCount)
    : unreadCount;

  return (
    <button
      type="button"
      onClick={onOpenNotifications}
      className={`relative p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl border border-white/20 transition-all shadow-xs cursor-pointer flex items-center justify-center ${className}`}
      title="Centre de Notifications"
      aria-label="Centre de Notifications"
    >
      <Bell size={iconSize} className="text-amber-300" />
      {displayCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#1A237E] shadow-sm animate-pulse">
          {displayCount > 9 ? "9+" : displayCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
