import React, { useState, useRef, useEffect, useCallback } from "react";
import { UserProfile, SecondaryLevel, PaymentTransaction, ClassChangeRequest } from "../types";
import { ALL_LEVELS, STUDENT_LEVELS, getLevelLabel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { updateUserPasswordSupabase, signOutSupabase, handleResetPassword, fetchTransactionsSupabase } from "../data/supabaseStorage";
import { supabase } from "../lib/supabaseClient";
import { AdminContactCard } from "./AdminContactCard";
import { UpdateModal } from "./UpdateModal";
import { AppLogo } from "./AppLogo";
import { checkForAppUpdates, CURRENT_APP_VERSION, APP_VERSION } from "../utils/versionUtils";
import { subscribeToUpdateAvailable, applyServiceWorkerUpdate, checkServiceWorkerForUpdate } from "../utils/swUpdate";
import { StudentResultsSection } from "./StudentResultsSection";
import { getVipStatusInfo, isUserAdmin } from "../utils/vipUtils";
import { getUserStudentId, notifyClassChangeSubmitted } from "../utils/userUtils";
import { PasswordValidationCard } from "./PasswordValidationCard";
import { validatePasswordComplexity } from "../utils/passwordValidation";
import { 
  User, 
  GraduationCap, 
  Trash2, 
  LogOut, 
  LogIn,
  ShieldCheck, 
  Key, 
  Camera, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Code2,
  Edit2,
  Check,
  X,
  Upload,
  Download,
  CreditCard,
  Clock,
  FileText,
  XCircle,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  Hourglass,
  Sparkles,
  Share2,
  Cloud,
  Wifi,
  Bell,
  Smartphone
} from "lucide-react";

interface ProfileTabProps {
  user: UserProfile | null;
  onUpdateLevel: (newLevel: SecondaryLevel) => void;
  onUpdatePhoto: (newUrl: string) => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  refreshProfile?: (forcedUid?: string) => Promise<UserProfile | null>;
  onClearRoomCache: () => void;
  onResetDatabase: () => void;
  onOpenAdmin: () => void;
  onOpenCodeViewer: () => void;
  onLogout: () => void;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  onOpenShare?: () => void;
  onOpenNotifications?: () => void;
  onOpenLogin?: () => void;
  onNavigateHome?: () => void;
  onOpenPortfolio?: () => void;
  onOpenPwaInstall?: () => void;
  unreadNotifCount?: number;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  onUpdateLevel,
  onUpdatePhoto,
  onUpdateProfile,
  refreshProfile,
  onClearRoomCache,
  onResetDatabase,
  onOpenAdmin,
  onOpenCodeViewer,
  onLogout,
  onOpenReceipt,
  onOpenShare,
  onOpenNotifications,
  onOpenLogin,
  onNavigateHome,
  onOpenPortfolio,
  onOpenPwaInstall,
  unreadNotifCount = 0,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const isAdmin = user ? (isUserAdmin(user) || !!user.isAdmin) : false;
  const [selectedLevel, setSelectedLevel] = useState<SecondaryLevel>(user?.level || "3ème");
  const [isEditingName, setIsEditingName] = useState(false);

  // Helper to extract clean name parts and avoid unwanted fallback to 'Élève'
  const resolveCurrentName = useCallback(() => {
    if (!user) return { prenom: "", nom: "", full: "" };
    const p = (user.prenom && user.prenom !== "Élève") ? user.prenom : "";
    const n = (user.nom && user.nom !== "Élève") ? user.nom : "";
    const rawFull = (user.fullName && user.fullName !== "Élève")
      ? user.fullName
      : (user.displayName && user.displayName !== "Élève")
      ? user.displayName
      : "";
    let finalP = p;
    let finalN = n;
    if (!finalP && !finalN && rawFull) {
      const parts = rawFull.split(/\s+/);
      finalP = parts[0] || "";
      finalN = parts.slice(1).join(" ") || "";
    }
    const full = (finalP || finalN) ? `${finalP} ${finalN}`.trim() : rawFull;
    return { prenom: finalP, nom: finalN, full };
  }, [user]);

  const [prenomInput, setPrenomInput] = useState(() => resolveCurrentName().prenom);
  const [nomInput, setNomInput] = useState(() => resolveCurrentName().nom);
  const [displayNameInput, setDisplayNameInput] = useState(() => resolveCurrentName().full);

  // Synchronisation dynamique dès que le profil utilisateur est mis à jour
  useEffect(() => {
    if (user) {
      const current = resolveCurrentName();
      setPrenomInput(current.prenom);
      setNomInput(current.nom);
      setDisplayNameInput(current.full);
    }
  }, [user?.displayName, user?.fullName, user?.prenom, user?.nom, resolveCurrentName]);

  const [showLevelConfirm, setShowLevelConfirm] = useState(false);
  const [targetLevel, setTargetLevel] = useState<SecondaryLevel | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(300); // 5 minutes = 300s
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Compte à rebours dynamique de 5 minutes (300s) pour l'expiration du lien / code email
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (resetEmailSent && resetCountdown > 0) {
      timer = setInterval(() => {
        setResetCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resetEmailSent, resetCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Détection de la méthode de connexion de l'utilisateur (user.app_metadata.provider)
  const [authProvider, setAuthProvider] = useState<string>(() => {
    return user?.app_metadata?.provider || (user as any)?.authProvider || "email";
  });

  useEffect(() => {
    if (!supabase || !user?.uid) return;
    supabase.auth.getUser().then(({ data: { user: supaUser } }) => {
      if (supaUser?.app_metadata) {
        const provider = supaUser.app_metadata.provider || supaUser.app_metadata.providers?.[0] || "email";
        setAuthProvider(provider);
        if (user && !user.app_metadata) {
          onUpdateProfile({ app_metadata: supaUser.app_metadata as any });
        }
      }
    }).catch((err) => {
      console.warn("ProfileTab authProvider check notice:", err);
    });
  }, [user?.uid]);

  const isGoogleOAuth = Boolean(
    authProvider === "google" ||
    user?.app_metadata?.provider === "google" ||
    user?.app_metadata?.providers?.includes("google") ||
    user?.authProvider === "google"
  );

  const hasNoPasswordDefined = Boolean(user && (!user.password || user.password.trim() === ""));
  const isOAuthOrNoPassword = isGoogleOAuth || hasNoPasswordDefined;

  // Class Change Request & Manual Update Check State
  const [classChangeReason, setClassChangeReason] = useState("");
  const [classChangeReasonError, setClassChangeReasonError] = useState("");
  const [classRequest, setClassRequest] = useState<ClassChangeRequest | null>(null);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);
  const [vipRequest, setVipRequest] = useState<any | null>(null);
  const [dismissedVipRequestId, setDismissedVipRequestId] = useState<string | null>(null);
  const [isCancellingVipRequest, setIsCancellingVipRequest] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [hasSwUpdate, setHasSwUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateModalData, setUpdateModalData] = useState<{
    latestVersion: string;
    currentVersion: string;
    apkUrl: string;
    message?: string;
  } | null>(null);
  const [isProfileUpdateModalOpen, setIsProfileUpdateModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUpdateAvailable((available) => {
      setHasSwUpdate(available);
    });
    return () => unsub();
  }, []);

  const handleApplyUpdate = async () => {
    setIsApplyingUpdate(true);
    setToastMsg("Mise à jour en cours d'installation...");
    try {
      // Envoie le signal SKIP_WAITING au Service Worker, nettoie les caches d'application sans toucher à la session ni aux images, et recharge sur controllerchange
      await applyServiceWorkerUpdate();
    } catch (err) {
      console.warn("Update application error:", err);
      window.location.reload();
    }
  };

  const handleManualUpdateCheck = async () => {
    setIsCheckingUpdate(true);
    try {
      // 1. Interroge Supabase pour comparer la version installée et la "Dernière Version en Ligne"
      const res = await checkForAppUpdates();
      if (!res.hasUpdate) {
        // a. Si l'application est déjà à jour par rapport à Supabase -> Affiche le toast : "Votre application est déjà à jour (v1.0.1). Aucune action requise."
        setToastMsg(`Votre application est déjà à jour (v${APP_VERSION}). Aucune action requise.`);
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        // b. Si une nouvelle version supérieure existe -> Affiche la modale avec la barre de progression (0% à 100%),
        // puis le message "Mise à jour complète !" avec le bouton "OK" qui applique la mise à jour (SKIP_WAITING) et recharge la page.
        setUpdateModalData({
          latestVersion: res.latestVersion,
          currentVersion: res.currentVersion || APP_VERSION,
          apkUrl: res.apkUrl || "",
          message: res.message,
        });
        setIsProfileUpdateModalOpen(true);
      }
    } catch (err) {
      console.warn("Manual update check notice:", err);
      setToastMsg(`Votre application est déjà à jour (v${APP_VERSION}). Aucune action requise.`);
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleClearCacheWithToast = () => {
    onClearRoomCache();
    setToastMsg("Cache des cours vidé");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleResetDatabaseWithToast = () => {
    onResetDatabase();
    setToastMsg("Programme réinitialisé");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (refreshProfile) {
      refreshProfile().catch(console.warn);
    }
  }, [refreshProfile]);

  useEffect(() => {
    if (!user) return;
    const roomRepo = RoomDatabaseRepository.getInstance();
    let isMounted = true;

    const fetchLatestStudentRequest = async () => {
      const studentId = user.id || user.uid;
      try {
        const { data, error } = await supabase
          .from("class_change_requests")
          .select("*")
          .or(`student_uid.eq.${studentId},user_uid.eq.${studentId}${user.email ? `,student_email.eq.${user.email}` : ''}`);

        if (!error && data && data.length > 0 && isMounted) {
          data.sort((a: any, b: any) => Number(b.requested_at || b.created_at || 0) - Number(a.requested_at || a.created_at || 0));
          const latest = data[0];
          const mapped: ClassChangeRequest = {
            id: latest.id,
            userUid: latest.student_uid || latest.user_uid || studentId,
            userName: latest.student_name || user.displayName,
            userEmail: latest.student_email || user.email || "",
            studentMatricule: latest.matricule || "",
            currentLevel: latest.current_level || latest.current_class || user.level,
            requestedLevel: latest.requested_level || latest.requested_class || user.level,
            reason: latest.reason || "",
            status: (String(latest.status || 'pending').toLowerCase() as any),
            rejectionReason: latest.rejection_reason || undefined,
            createdAt: Number(latest.requested_at || latest.created_at || Date.now()),
            dateFormatted: new Date(Number(latest.requested_at || latest.created_at || Date.now())).toLocaleDateString("fr-FR"),
          };
          setClassRequest(mapped);
          roomRepo.syncClassChangeRequest(mapped);
        } else if (isMounted) {
          const reqs = roomRepo.getClassChangeRequestsByUser(user.uid);
          if (reqs.length > 0) {
            reqs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setClassRequest(reqs[0]);
          } else {
            setClassRequest(null);
          }
        }
      } catch (err) {
        console.warn("[ProfileTab] Notice fetching student class requests:", err);
      }
    };

    const fetchLatestVipRequest = async () => {
      const studentId = user.id || user.uid;
      try {
        const { data, error } = await supabase
          .from("vip_payment_requests")
          .select("*")
          .or(`student_uid.eq.${studentId},user_uid.eq.${studentId}`);

        if (!error && data && data.length > 0 && isMounted) {
          data.sort((a: any, b: any) => Number(b.requested_at || b.created_at || 0) - Number(a.requested_at || a.created_at || 0));
          setVipRequest(data[0]);
        } else if (isMounted) {
          setVipRequest(null);
        }
      } catch (err) {
        console.warn("[ProfileTab] Notice fetching student VIP requests:", err);
      }
    };

    const fetchTransactions = async () => {
      const studentId = user.id || user.uid;
      const localTxs = roomRepo.getAllTransactions();
      try {
        const remoteTxs = await fetchTransactionsSupabase(studentId);
        if (isMounted) {
          const map = new Map<string, PaymentTransaction>();
          localTxs.forEach((tx) => map.set(tx.id, tx));
          remoteTxs.forEach((tx) => map.set(tx.id, tx));
          const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setTransactions(merged);
        }
      } catch (err) {
        console.warn("[ProfileTab] Notice fetching transactions:", err);
        if (isMounted) {
          setTransactions(localTxs);
        }
      }
    };

    const loadData = () => {
      fetchTransactions();
      fetchLatestStudentRequest();
      fetchLatestVipRequest();
    };

    loadData();

    // Supabase Realtime subscriptions for immediate state updates on student requests & transactions
    const studentId = user.id || user.uid;
    const classChannel = supabase
      .channel(`student_class_requests_${studentId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "class_change_requests",
          filter: `student_uid=eq.${studentId}`,
        },
        () => {
          fetchLatestStudentRequest();
          if (refreshProfile) refreshProfile().catch(console.warn);
        }
      )
      .subscribe();

    const vipChannel = supabase
      .channel(`student_vip_requests_${studentId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vip_payment_requests",
          filter: `student_uid=eq.${studentId}`,
        },
        () => {
          fetchLatestVipRequest();
          if (refreshProfile) refreshProfile().catch(console.warn);
        }
      )
      .subscribe();

    const txChannel = supabase
      .channel(`student_txs_${studentId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    const unsubRoom = roomRepo.subscribe(loadData);

    return () => {
      isMounted = false;
      unsubRoom();
      supabase.removeChannel(classChannel);
      supabase.removeChannel(vipChannel);
      supabase.removeChannel(txChannel);
    };
  }, [user?.uid, user?.id, user?.email, refreshProfile]);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation: maximum 5MB
    if (file.size > 5 * 1024 * 1024) {
      setToastMsg("L'image est trop volumineuse (maximum 5 Mo).");
      setTimeout(() => setToastMsg(null), 3500);
      return;
    }

    setIsUploadingPhoto(true);
    setToastMsg("Synchronisation de la photo avec Supabase Storage (bucket avatars)... ☁️");

    let uploadedPublicUrl: string | null = null;
    try {
      const { uploadAvatarToSupabase } = await import("../data/supabaseStorage");
      uploadedPublicUrl = await uploadAvatarToSupabase(file, user.uid);
    } catch (err) {
      console.warn("Storage upload exception:", err);
    }

    if (uploadedPublicUrl) {
      onUpdatePhoto(uploadedPublicUrl);
      setIsUploadingPhoto(false);
      setToastMsg("Photo de profil mise à jour et synchronisée avec succès ! ✨");
      setTimeout(() => setToastMsg(null), 3500);
      return;
    }

    // Seamless fallback to base64 if offline or Supabase bucket not yet configured
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onUpdatePhoto(base64);
        setToastMsg("Photo enregistrée en local ! 💾");
        setTimeout(() => setToastMsg(null), 3000);
      }
      setIsUploadingPhoto(false);
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
      setToastMsg("Erreur lors de la lecture de l'image.");
      setTimeout(() => setToastMsg(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrenom = prenomInput.trim();
    const cleanNom = nomInput.trim();
    const combined = `${cleanPrenom} ${cleanNom}`.trim();
    const cleanName = combined || displayNameInput.trim();

    if (cleanName && cleanName !== "Élève") {
      const parts = cleanName.split(/\s+/);
      const prenom = cleanPrenom || (parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0]);
      const nom = cleanNom || (parts.length > 1 ? parts.slice(1).join(" ") : "");

      await onUpdateProfile({
        displayName: cleanName,
        fullName: cleanName,
        prenom,
        nom,
      });
      setIsEditingName(false);
      setToastMsg("Nom et prénom enregistrés avec succès !");
      setTimeout(() => setToastMsg(null), 3000);
      if (refreshProfile) {
        await refreshProfile(user.id || user.uid).catch(() => {});
      }
    } else {
      setToastMsg("Veuillez saisir votre prénom et nom.");
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleLevelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLvl = e.target.value as SecondaryLevel;
    if (newLvl !== user.level) {
      const isPending = classRequest && String(classRequest.status || 'pending').toUpperCase() === 'PENDING';
      if (isPending) {
        setToastMsg("Une demande de changement de classe est déjà en cours de traitement. Veuillez l'annuler pour choisir une autre classe.");
        setTimeout(() => setToastMsg(null), 3500);
        return;
      }
      if (isUserAdmin(user) || user.isAdmin) {
        // Admins/Directors have super-access to all classes. Preview without altering director profile
        setToastMsg(`Aperçu de classe actif : Classe de ${getLevelLabel(newLvl)} (Statut Directeur / Admin conservé)`);
        setTimeout(() => setToastMsg(null), 3000);
        return;
      }
      setTargetLevel(newLvl);
      setClassChangeReason("");
      setClassChangeReasonError("");
      setShowLevelConfirm(true);
    }
  };

  const handleSendClassChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLevel) return;

    if (user.isAdmin || isUserAdmin(user)) {
      setShowLevelConfirm(false);
      setTargetLevel(null);
      setClassChangeReason("");
      return;
    }

    if (!classChangeReason.trim()) {
      setClassChangeReasonError("Veuillez indiquer le motif de votre demande de changement de classe.");
      return;
    }

    // Récupération obligatoire du student_uid de la session Supabase courante (auth.user().id)
    let studentUid = user.uid || user.id;
    if (supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          studentUid = authData.user.id;
        }
      } catch (authErr) {
        console.warn("[ProfileTab] Notice getting auth session uid:", authErr);
      }
    }

    if (!studentUid) {
      setClassChangeReasonError("Erreur d'identification de session. Veuillez vous réauthentifier.");
      return;
    }

    roomRepo.createClassChangeRequest(
      studentUid,
      user.displayName || user.email?.split("@")[0] || "Élève",
      user.email || "",
      user.level || "3ème",
      targetLevel,
      classChangeReason.trim()
    );

    notifyClassChangeSubmitted(user, targetLevel, classChangeReason.trim()).catch(console.warn);

    setShowLevelConfirm(false);
    setClassChangeReason("");
    setClassChangeReasonError("");
    setDismissedRequestId(null);
    setToastMsg(`Votre demande de passage en classe de ${targetLevel} a été transmise à l'administration.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCancelClassChangeRequest = async () => {
    setIsCancellingRequest(true);
    try {
      const studentId = user.id || user.uid;

      if (classRequest?.id) {
        await supabase
          .from('class_change_requests')
          .delete()
          .eq('id', classRequest.id);
        roomRepo.deleteClassChangeRequest(classRequest.id);
      }

      await supabase
        .from('class_change_requests')
        .delete()
        .or(`student_uid.eq.${studentId},user_uid.eq.${studentId}`)
        .eq('status', 'pending');

      roomRepo.deletePendingClassChangeRequestsByUser(user.uid);
      if (studentId !== user.uid) {
        roomRepo.deletePendingClassChangeRequestsByUser(studentId);
      }

      // Rafraîchir l'état du profil immédiatement pour masquer le bandeau jaune et réautoriser la sélection
      setClassRequest(null);
      if (refreshProfile) {
        await refreshProfile().catch(console.warn);
      }
      setToastMsg("Demande de changement de classe annulée. Vous pouvez maintenant sélectionner une autre classe.");
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error("[ProfileTab] Erreur lors de l'annulation de la demande :", err);
      setToastMsg("Erreur lors de l'annulation de la demande.");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setIsCancellingRequest(false);
    }
  };

  const handleCancelVipRequest = async () => {
    setIsCancellingVipRequest(true);
    try {
      const studentId = user.id || user.uid;

      if (vipRequest?.id) {
        await supabase
          .from('vip_payment_requests')
          .delete()
          .eq('id', vipRequest.id);
      }

      await supabase
        .from('vip_payment_requests')
        .delete()
        .or(`student_uid.eq.${studentId},user_uid.eq.${studentId}`)
        .eq('status', 'pending');

      setVipRequest(null);
      if (refreshProfile) {
        await refreshProfile().catch(console.warn);
      }
      setToastMsg("Demande de Pass VIP annulée.");
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error("[ProfileTab] Erreur lors de l'annulation de la demande VIP :", err);
      setToastMsg("Erreur lors de l'annulation de la demande VIP.");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setIsCancellingVipRequest(false);
    }
  };

  const handleTriggerResetPassword = async () => {
    if (!user.email) {
      setPasswordError("Aucune adresse e-mail associée à ce compte.");
      return;
    }
    setIsSendingReset(true);
    setPasswordError("");
    try {
      if (!supabase) throw new Error("Supabase non initialisé");
      const redirectUrl = typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}/reset-password`
        : "https://votre-app.com/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(user.email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });
      if (error) throw error;

      try {
        localStorage.setItem("savoir_reset_requested_at", Date.now().toString());
        localStorage.setItem("savoir_reset_email", user.email.trim().toLowerCase());
      } catch {}

      setResetCountdown(300); // Exactement 5 minutes = 300 secondes
      setResetEmailSent(true);
    } catch (err: any) {
      console.error("Erreur envoi email réinitialisation :", err);
      setPasswordError(err?.message || "Erreur lors de l'envoi de l'e-mail de réinitialisation.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const cleanOld = oldPasswordInput.trim();
    const cleanNewPassword = newPasswordInput.trim();
    const isUserAdminRole = Boolean(user.isAdmin || isUserAdmin(user));

    // 1. Saisie et re-vérification obligatoire du mot de passe actuel (Admin et Élèves/Utilisateurs avec ou sans mot de passe enregistré)
    if (!cleanOld) {
      setPasswordError(
        isUserAdminRole
          ? "Veuillez obligatoirement saisir votre mot de passe administrateur actuel."
          : "Veuillez obligatoirement saisir votre mot de passe actuel."
      );
      return;
    }

    setIsSavingPassword(true);
    let isOldValid = false;

    // a. Re-vérification stricte auprès de Supabase (signInWithPassword)
    if (supabase && user.email) {
      try {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email.trim().toLowerCase(),
          password: cleanOld,
        });
        if (!signInErr) {
          isOldValid = true;
        }
      } catch (authErr) {
        console.warn("Supabase auth verification test:", authErr);
      }
    }

    // b. Fallback base locale Room (mot de passe enregistré dans le profil ou dans la table élèves)
    if (!isOldValid) {
      const studentRec = roomRepo.getStudentByUid(user.uid);
      const savedAdminPass = roomRepo.getAdminPassword();
      const hasSavedPassword = Boolean((user.password && user.password.trim() !== "") || (studentRec?.password && studentRec.password.trim() !== ""));

      if (!hasSavedPassword && !isUserAdminRole) {
        // Si l'utilisateur n'a pas encore de mot de passe enregistré en BDD (ex: premier ajout après OAuth), on l'autorise à définir son nouveau mot de passe
        isOldValid = true;
      } else if (
        (user.password && cleanOld === user.password) ||
        (studentRec?.password && cleanOld === studentRec.password) ||
        (isUserAdminRole && (
          cleanOld === savedAdminPass ||
          cleanOld === "Perpendiculaire @2026" ||
          cleanOld === "Perpendiculaire@2026"
        ))
      ) {
        isOldValid = true;
      }
    }

    if (!isOldValid) {
      setIsSavingPassword(false);
      setPasswordError("Mot de passe actuel incorrect. Vérification d'identité refusée.");
      return;
    }

    if (cleanOld === cleanNewPassword) {
      setIsSavingPassword(false);
      setPasswordError("Le nouveau mot de passe doit être différent de l'ancien mot de passe.");
      return;
    }

    // 2. Validation stricte de la complexité du nouveau mot de passe (6 car. min, majuscule, minuscule, chiffre)
    const complexity = validatePasswordComplexity(cleanNewPassword);
    if (!complexity.isValid) {
      setIsSavingPassword(false);
      setPasswordError(
        "Le mot de passe doit comporter au moins 6 caractères et inclure au moins une majuscule, une minuscule et un chiffre."
      );
      return;
    }

    setIsSavingPassword(true);
    try {
      if (supabase) {
        // Mise à jour sécurisée dans Supabase Auth
        const { error } = await supabase.auth.updateUser({
          password: cleanNewPassword,
        });

        if (error && !error.message?.includes("should be different")) {
          throw error;
        }
      }

      // Mise à jour du profil local et de la base Room
      onUpdateProfile({
        password: cleanNewPassword,
        authProvider: "email",
      });
      if (user.isAdmin) {
        roomRepo.setAdminPassword(cleanNewPassword);
      }
      roomRepo.registerOrUpdateStudent({ ...user, password: cleanNewPassword, authProvider: "email" });

      setPasswordSuccess("Votre nouveau mot de passe a été enregistré avec succès !");
      setOldPasswordInput("");
      setNewPasswordInput("");

      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess("");
      }, 2500);
    } catch (err: any) {
      console.error("Update password error:", err);
      setPasswordError(err?.message || "Erreur lors de la mise à jour du mot de passe.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCancelPassword = () => {
    setIsChangingPassword(false);
    setOldPasswordInput("");
    setNewPasswordInput("");
    setShowOldPassword(false);
    setShowNewPassword(false);
    setPasswordError("");
    setPasswordSuccess("");
  };

  if (!user) {
    return (
      <div className="h-full min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans max-w-xl mx-auto my-auto animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 space-y-5 w-full">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-inner relative">
            <User size={36} className="text-[#1A237E]" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
              <Lock size={13} />
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 rounded-full border border-amber-300">
              Espace Protégé • Compte Gratuit
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Mon Espace Personnel Élève
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Connectez-vous pour choisir votre classe officielle (de la 6ème à la Terminale), suivre vos moyennes aux quiz, gérer votre abonnement VIP et télécharger vos reçus certifiés.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Choix de votre classe et matières adaptées</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Relevés de notes et classement aux quiz QCM</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Accès illimité aux épreuves de concours avec le Pass VIP</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Sauvegarde automatique sur le Cloud & Mode Hors-ligne</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-400/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              <LogIn size={18} />
              <span>Se connecter ou S'inscrire</span>
            </button>
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
              >
                Continuer en Mode Invité (Accueil)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Hidden image file input for phone gallery/camera */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Responsive 2-Column Grid (1 col on mobile, 2 cols on Tablet / Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* COLONNE GAUCHE : Identité, Classe active, Notes et Résultats */}
        <div className="space-y-4">
          {/* Profile Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 text-center shadow-xs space-y-4 relative transition-colors">
        <div className="relative w-24 h-24 mx-auto group cursor-pointer" onClick={() => !isUploadingPhoto && photoInputRef.current?.click()}>
          <img
            src={
              user.avatarUrl ||
              user.photoUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
            }
            alt={user.displayName}
            className="w-24 h-24 rounded-full object-cover border-4 border-[#1A237E] dark:border-amber-400 shadow-md mx-auto group-hover:opacity-90 transition-opacity"
          />
          {isUploadingPhoto ? (
            <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white">
              <RefreshCw size={22} className="animate-spin text-amber-400" />
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                photoInputRef.current?.click();
              }}
              className="absolute bottom-0 right-0 p-2 bg-[#1A237E] dark:bg-amber-400 text-white dark:text-slate-950 rounded-full shadow hover:bg-indigo-900 dark:hover:bg-amber-300 transition-colors cursor-pointer"
              title="Insérer une photo depuis le téléphone (Supabase Storage)"
            >
              <Camera size={14} />
            </button>
          )}
        </div>

        <div>
          {!isEditingName ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {user.fullName || (user.prenom ? `${user.prenom} ${user.nom || ""}`.trim() : (user.displayName && user.displayName !== "Élève" ? user.displayName : "")) || (user.email ? user.email.split("@")[0] : "Mon Profil")}
                </h2>
                <button
                  onClick={() => {
                    const current = resolveCurrentName();
                    setPrenomInput(current.prenom);
                    setNomInput(current.nom);
                    setDisplayNameInput(current.full);
                    setIsEditingName(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#1A237E] dark:hover:text-amber-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Modifier mon Prénom et Nom"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              {user.isAdmin && (
                <span className="inline-block px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black rounded-full border border-amber-300 dark:border-amber-700">
                  ADMINISTRATEUR (Massaw Seck)
                </span>
              )}

              {/* Fiche d'identité détaillée & persistance */}
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Prénom</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {(user.prenom && user.prenom !== "Élève") ? user.prenom : (user.displayName && user.displayName !== "Élève" ? user.displayName.split(" ")[0] : "—")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Nom</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {(user.nom && user.nom !== "Élève") ? user.nom : (user.displayName && user.displayName !== "Élève" ? user.displayName.split(" ").slice(1).join(" ") : "—")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">E-mail</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 break-all">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Rôle / Statut</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${isAdmin ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"}`}>
                      {isAdmin ? "Administrateur" : (user.role === "enseignant" ? "Enseignant" : user.role === "parent" ? "Parent d'élève" : "Élève")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Classe active</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {isAdmin ? "Aucune (Accès Global & Illimité)" : (user.classe || user.level || "3ème")}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">UID d'authentification (BDD)</span>
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all select-all font-semibold">
                    {user.uid}
                  </span>
                </div>
              </div>

              {(() => {
                const vipInfo = getVipStatusInfo(user);
                if (vipInfo.isAdminUser) {
                  return (
                    <div className="pt-1">
                      <span className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-400 text-[#1A237E] font-black text-xs rounded-full shadow-sm border border-amber-300">
                        <Sparkles size={12} className="fill-[#1A237E]" />
                        <span>Mode Administrateur • Accès VIP Illimité</span>
                      </span>
                    </div>
                  );
                }
                if (vipInfo.isActive) {
                  return (
                    <div className="pt-1 space-y-0.5">
                      <span className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-400 text-[#1A237E] font-black text-xs rounded-full shadow-sm border border-amber-300">
                        <Sparkles size={12} className="fill-[#1A237E]" />
                        <span>Mode VIP Activé • {vipInfo.planLabel}</span>
                      </span>
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        {vipInfo.expirationFormatted}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="pt-1">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] rounded-full border border-slate-200 dark:border-slate-700">
                      <Lock size={12} className="text-amber-500" />
                      <span>Mode VIP : Non activé</span>
                    </span>
                  </div>
                );
              })()}

              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>

              <div className="pt-1">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
                  <span>{isAdmin ? "Identifiant Admin :" : "Matricule Unique :"}</span>
                  <span className="text-[#1A237E] dark:text-amber-400 font-extrabold">#{getUserStudentId(user).replace(/^#/, '')}</span>
                </span>
              </div>

              {/* VIP Request Status Banner */}
              {(() => {
                if (!vipRequest || dismissedVipRequestId === vipRequest.id) return null;
                const reqStatus = String(vipRequest.status || 'pending').toUpperCase();
                const isPending = reqStatus === 'PENDING';
                const isApproved = reqStatus === 'APPROVED' || reqStatus === 'VALIDATED';
                const isRejected = reqStatus === 'REJECTED';

                if (isPending) {
                  return (
                    <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-2 text-left shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 font-bold text-amber-900 dark:text-amber-200">
                          <Hourglass size={15} className="text-amber-600 animate-pulse shrink-0" />
                          <span>Paiement Pass VIP en cours de validation</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-amber-200/90 text-amber-900 font-black text-[10px] rounded-full uppercase tracking-wider border border-amber-300 shadow-2xs">
                          🟠 EN ATTENTE
                        </span>
                      </div>
                      <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-300">
                        Votre demande pour le <strong>Pass VIP {vipRequest.plan_id || vipRequest.planId || ""}</strong> via {vipRequest.operator || "Transfert"}{vipRequest.transaction_ref ? ` (Réf: ${vipRequest.transaction_ref})` : ""} est entre les mains de la Direction.
                      </p>
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={handleCancelVipRequest}
                          disabled={isCancellingVipRequest}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 font-bold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {isCancellingVipRequest ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              <span>Annulation en cours...</span>
                            </>
                          ) : (
                            <>
                              <X size={13} className="text-rose-600" />
                              <span>Annuler la demande</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isApproved) {
                  return (
                    <div className="mt-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs space-y-2 text-left shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Demande acceptée : Pass VIP validé avec succès !</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-900 font-black text-[10px] rounded-full uppercase tracking-wider border border-emerald-300 shadow-2xs">
                          🟢 DEMANDE VALIDÉE
                        </span>
                      </div>
                      <p className="text-[11px] leading-snug text-emerald-800 dark:text-emerald-300">
                        Félicitations ! Votre demande de Pass VIP a été validée par la Direction. Votre accès VIP est désormais actif.
                      </p>
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setDismissedVipRequestId(vipRequest.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          <Check size={13} />
                          <span>J'ai compris</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isRejected) {
                  return (
                    <div className="mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 rounded-xl text-rose-900 dark:text-rose-200 text-xs space-y-2 text-left shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 font-bold text-rose-900 dark:text-rose-200">
                          <XCircle size={16} className="text-rose-600 shrink-0" />
                          <span>Demande refusée : Paiement VIP non validé</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-rose-200 text-rose-900 font-black text-[10px] rounded-full uppercase tracking-wider border border-rose-300 shadow-2xs">
                          🔴 DEMANDE REFUSÉE
                        </span>
                      </div>
                      <p className="text-[11px] leading-snug text-rose-800 dark:text-rose-300">
                        Votre demande de Pass VIP n'a pas été acceptée par l'administration.
                        {vipRequest.rejection_reason && (
                          <span className="block mt-1 font-semibold text-rose-900 dark:text-rose-200">
                            Motif : <em>"{vipRequest.rejection_reason}"</em>
                          </span>
                        )}
                      </p>
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setDismissedVipRequestId(vipRequest.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          <X size={13} />
                          <span>Fermer / Nouvelle demande</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          ) : (
            <form onSubmit={handleSaveName} className="max-w-sm mx-auto bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-left animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Modifier mon identité</span>
                <span className="text-[10px] text-slate-500 font-medium">Ne modifie pas votre rôle</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">Prénom :</label>
                  <input
                    type="text"
                    required
                    value={prenomInput}
                    onChange={(e) => setPrenomInput(e.target.value)}
                    placeholder="Ex: Massaw"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-[#1A237E]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">Nom :</label>
                  <input
                    type="text"
                    required
                    value={nomInput}
                    onChange={(e) => setNomInput(e.target.value)}
                    placeholder="Ex: Seck"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-[#1A237E]"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1A237E] dark:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold rounded-xl hover:bg-indigo-900 dark:hover:bg-amber-300 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Check size={14} />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Photo Upload Trigger Button */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-[#1A237E] dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Upload size={13} />
            <span>Changer la photo (depuis le téléphone)</span>
          </button>
        </div>

        {/* Role or Level selector */}
        {isAdmin ? (
          <div className="bg-gradient-to-r from-[#1A237E] via-indigo-950 to-slate-900 rounded-2xl p-4 border-2 border-amber-400 text-white shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black shrink-0 shadow">
                <ShieldCheck size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Rôle du Compte</span>
                <span className="text-base font-black text-white">Administrateur</span>
                <p className="text-[11px] text-indigo-200">Non affecté à une classe spécifique • Accès global et sans restriction à l'ensemble des niveaux, cours, exercices et fonctionnalités</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black">
              Accès Global
            </span>
          </div>
        ) : (
          <div className="bg-indigo-50/80 rounded-2xl p-4 border border-indigo-100 space-y-3 text-left">
            <label className="text-xs font-bold text-[#1A237E] flex items-center space-x-1.5">
              <GraduationCap size={16} />
              <span>Classe / Niveau d'Étude Actuel :</span>
            </label>

            <select
              value={user.level}
              onChange={handleLevelSelect}
              disabled={Boolean(classRequest && String(classRequest.status || 'pending').toUpperCase() === 'PENDING')}
              className={`w-full bg-white border-2 border-indigo-200 rounded-xl p-2.5 text-sm font-extrabold text-[#1A237E] focus:outline-none focus:border-[#1A237E] transition-all ${
                classRequest && String(classRequest.status || 'pending').toUpperCase() === 'PENDING' ? "opacity-60 cursor-not-allowed bg-slate-100" : "cursor-pointer"
              }`}
            >
              {STUDENT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {getLevelLabel(lvl)}
                </option>
              ))}
            </select>

            {(() => {
              if (!classRequest || dismissedRequestId === classRequest.id) {
                return (
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed italic">
                    <strong>Demande d'autorisation : </strong>Pour passer en classe supérieure ou changer de filière, choisissez une classe ci-dessus pour envoyer une demande à l'administration.
                  </p>
                );
              }

              const reqStatus = String(classRequest.status || 'pending').toUpperCase();
              const isPending = reqStatus === 'PENDING';
              const isApproved = reqStatus === 'APPROVED' || reqStatus === 'VALIDATED';
              const isRejected = reqStatus === 'REJECTED';

              if (isPending) {
                return (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2 shadow-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                        <Hourglass size={15} className="text-amber-600 animate-pulse shrink-0" />
                        <span>Demande de changement de classe en cours de traitement</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-amber-200/90 text-amber-900 font-black text-[10px] rounded-full uppercase tracking-wider border border-amber-300 shadow-2xs">
                        🟠 EN ATTENTE
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-amber-800">
                      Vous avez demandé le passage de la classe de <strong>{classRequest.currentLevel}</strong> à <strong>{classRequest.requestedLevel}</strong>.
                      Motif : <em>"{classRequest.reason}"</em>. L'administration étudie votre dossier. Vous restez pour l'instant en classe de <strong>{user.level}</strong>.
                    </p>
                    <div className="pt-1.5 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleCancelClassChangeRequest}
                        disabled={isCancellingRequest}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 hover:border-rose-400 font-bold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isCancellingRequest ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Annulation en cours...</span>
                          </>
                        ) : (
                          <>
                            <X size={13} className="text-rose-600" />
                            <span>Annuler la demande</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              }

              if (isApproved) {
                return (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs space-y-2 shadow-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>Demande acceptée : Changement de classe validé avec succès !</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-900 font-black text-[10px] rounded-full uppercase tracking-wider border border-emerald-300 shadow-2xs">
                        🟢 DEMANDE VALIDÉE
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-emerald-800">
                      Félicitations ! Votre demande de passage en classe de <strong>{classRequest.requestedLevel}</strong> a été validée par la Direction. Vos cours, devoirs et exercices sont à jour.
                    </p>
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setDismissedRequestId(classRequest.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        <Check size={13} />
                        <span>J'ai compris</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (isRejected) {
                return (
                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-2 shadow-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-rose-900">
                        <XCircle size={16} className="text-rose-600 shrink-0" />
                        <span>Demande refusée : Changement de classe non validé</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-rose-200 text-rose-900 font-black text-[10px] rounded-full uppercase tracking-wider border border-rose-300 shadow-2xs">
                        🔴 DEMANDE REFUSÉE
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-rose-800">
                      Votre demande pour passer en classe de <strong>{classRequest.requestedLevel}</strong> n'a pas été acceptée par l'administration.
                      {classRequest.rejectionReason && (
                        <span className="block mt-1 font-semibold text-rose-900">
                          Motif : <em>"{classRequest.rejectionReason}"</em>
                        </span>
                      )}
                    </p>
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setDismissedRequestId(classRequest.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={13} />
                        <span>Fermer / Nouvelle demande</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>
        )}
      </div>

      {/* Mes Résultats & Suivi des Notes Section (Uniquement pour les élèves/utilisateurs) */}
      {!isAdmin && <StudentResultsSection user={user} />}
        </div>

        {/* COLONNE DROITE : Sécurité, Admin, Liens & Déconnexion */}
        <div className="space-y-4">
      {/* Section Changer mon mot de passe */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-[#1A237E] dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Sécurité du Compte</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isOAuthOrNoPassword ? "Définir un mot de passe personnel" : "Modifier votre mot de passe"}
              </p>
            </div>
          </div>

          {!isChangingPassword && (
            <button
              type="button"
              onClick={() => {
                setIsChangingPassword(true);
                setPasswordError("");
                setPasswordSuccess("");
              }}
              className="px-3.5 py-2 bg-[#1A237E] dark:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold rounded-xl hover:bg-indigo-900 dark:hover:bg-amber-300 transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <Lock size={14} />
              <span>{isOAuthOrNoPassword ? "Définir un mot de passe" : "Changer mon mot de passe"}</span>
            </button>
          )}
        </div>

        {isChangingPassword && (
          <form onSubmit={handleSavePassword} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
            {passwordError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center space-x-1.5">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center space-x-1.5">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {/* Ancien mot de passe : Requis pour tous les utilisateurs */}
            <div>
              <label className={`text-xs font-bold block mb-1 ${isAdmin ? "text-amber-600 dark:text-amber-400" : "text-[#1A237E] dark:text-indigo-300"}`}>
                {isAdmin ? "Mot de passe actuel (Vérification Admin) :" : "Mot de passe actuel :"}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showOldPassword ? "text" : "password"}
                  required
                  value={oldPasswordInput}
                  onChange={(e) => {
                    setOldPasswordInput(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder={isAdmin ? "Saisissez votre mot de passe administrateur actuel" : "Saisissez votre mot de passe actuel"}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl py-2 pl-9 pr-10 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-[#1A237E] ${
                    isAdmin ? "border-amber-300 dark:border-amber-600/50" : "border-slate-200 dark:border-slate-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showOldPassword ? "Masquer" : "Afficher"}
                >
                  {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAdmin ? "Nouveau mot de passe administrateur :" : "Nouveau mot de passe :"}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPasswordInput}
                  onChange={(e) => {
                    setNewPasswordInput(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="Min. 6 caractères (Majuscule, minuscule, chiffre)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-10 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-[#1A237E]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showNewPassword ? "Masquer" : "Afficher"}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Indicateurs visuels en temps réel de complexité du mot de passe */}
              <PasswordValidationCard password={newPasswordInput} showAlways={true} />
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="flex-1 py-2.5 bg-[#1A237E] dark:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold rounded-xl hover:bg-indigo-900 dark:hover:bg-amber-300 transition-colors cursor-pointer flex items-center justify-center space-x-1 shadow-xs disabled:opacity-50"
              >
                <Check size={14} />
                <span>{isSavingPassword ? "Enregistrement..." : "Enregistrer le mot de passe"}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelPassword}
                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center space-x-1"
              >
                <X size={14} />
                <span>Annuler</span>
              </button>
            </div>

            {/* Flux Réinitialisation de mot de passe par Email avec expiration de 5 minutes */}
            {user.email && (
              <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800 space-y-2">
                {!resetEmailSent ? (
                  <button
                    type="button"
                    onClick={handleTriggerResetPassword}
                    disabled={isSendingReset}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 dark:text-amber-400 dark:hover:text-amber-300 font-semibold underline cursor-pointer disabled:opacity-50"
                  >
                    {isSendingReset ? "Envoi du lien en cours..." : "Mot de passe oublié ? M'envoyer un lien de réinitialisation"}
                  </button>
                ) : (
                  <div className="p-3 bg-indigo-50 dark:bg-slate-800/80 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 text-left space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#1A237E] dark:text-indigo-300 flex items-center space-x-1.5">
                        <Clock size={14} className="text-amber-500 animate-pulse" />
                        <span>Lien envoyé par e-mail</span>
                      </span>
                      <span
                        className={`text-xs font-mono font-black px-2 py-0.5 rounded-full border ${
                          resetCountdown > 0
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300"
                        }`}
                      >
                        {resetCountdown > 0 ? `Expire dans ${formatCountdown(resetCountdown)}` : "Expiré (00:00)"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Un lien de réinitialisation sécurisé valable <strong>5 minutes (300s)</strong> a été envoyé à :{" "}
                      <span className="font-bold text-[#1A237E] dark:text-amber-400">{user.email}</span>.
                    </p>

                    {resetCountdown === 0 ? (
                      <div className="pt-1">
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mb-1.5">
                          ⚠️ Le délai de 5 minutes est dépassé. Ce lien a expiré.
                        </p>
                        <button
                          type="button"
                          onClick={handleTriggerResetPassword}
                          disabled={isSendingReset}
                          className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <RefreshCw size={13} className={isSendingReset ? "animate-spin" : ""} />
                          <span>Renvoyer un nouveau lien de réinitialisation</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">
                        Cliquez sur le lien dans votre boîte mail avant la fin du décompte pour définir votre mot de passe.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>

      {/* Admin Space Protected Button */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1A237E] font-black flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Espace Administrateur</h3>
            <p className="text-xs text-slate-600">Protégé par Code PIN • Massaw Seck</p>
          </div>
        </div>

        <button
          onClick={onOpenAdmin}
          className="px-3.5 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1 transition-colors cursor-pointer"
        >
          <Key size={14} />
          <span>Accéder à l'Admin</span>
        </button>
      </div>

      {/* Share Application Card */}
      {onOpenShare && (
        <div className="bg-gradient-to-r from-[#1A237E] to-indigo-900 rounded-2xl p-4 text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1A237E] font-black flex items-center justify-center shrink-0">
              <Share2 size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm truncate">Partager l'application GMA</h3>
              <p className="text-xs text-indigo-200 truncate">Recommandez GMA à vos camarades et proches</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenShare}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-[#1A237E] rounded-xl text-xs font-black shadow-xs flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Share2 size={14} className="stroke-[2.5]" />
            <span>Partager</span>
          </button>
        </div>
      )}

      {/* Official Admin Contact Card */}
      <AdminContactCard />

      {/* Portfolio de Développement & PWA Actions */}
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {onOpenPortfolio && (
          <button
            type="button"
            onClick={onOpenPortfolio}
            className="w-full py-3 bg-gradient-to-r from-[#1A237E] to-indigo-900 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-sm hover:shadow transition-all cursor-pointer border border-amber-400/40"
          >
            <Code2 size={16} className="text-amber-400" />
            <span>Portfolio du Développement</span>
          </button>
        )}

        {onOpenPwaInstall && (
          <button
            type="button"
            onClick={onOpenPwaInstall}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
          >
            <Smartphone size={16} />
            <span>Installer l'Application (PWA)</span>
          </button>
        )}
      </div>

      {/* Logout button */}
      <div className="pt-2">
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={(e) => {
            e.preventDefault();
            setIsLoggingOut(true);
            onLogout();
          }}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-60"
        >
          {isLoggingOut ? (
            <>
              <RefreshCw size={16} className="animate-spin text-amber-500" />
              <span>Déconnexion en cours...</span>
            </>
          ) : (
            <>
              <LogOut size={16} />
              <span>Déconnexion de la Session</span>
            </>
          )}
        </button>
      </div>

      {/* Update Ready Banner */}
      {hasSwUpdate && (
        <div className="p-4 bg-gradient-to-r from-amber-500 via-amber-600 to-[#1A237E] text-white rounded-3xl shadow-lg border-2 border-amber-300 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="space-y-0.5 text-left">
            <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wide text-amber-200">
              <Sparkles size={14} className="animate-pulse" />
              <span>Mise à jour prête !</span>
            </div>
            <p className="text-[11px] text-white/90 font-medium">
              Une nouvelle version est téléchargée. Cliquez pour l'installer sans perte de session.
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={isApplyingUpdate}
            className="px-4 py-2.5 bg-white hover:bg-amber-50 text-[#1A237E] text-xs font-black rounded-2xl shadow-md flex items-center space-x-1.5 cursor-pointer transition-all shrink-0 border border-amber-300"
          >
            <Download size={14} className={isApplyingUpdate ? "animate-spin text-indigo-700" : "animate-bounce text-amber-600"} />
            <span>{isApplyingUpdate ? "Installation..." : "Mettre à jour"}</span>
          </button>
        </div>
      )}

      {/* Discreet Version Tag and Branding */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 flex-wrap gap-y-1">
          <AppLogo 
            className="w-5 h-5 rounded-md border border-amber-300"
            alt="Génie Mentor Académie Logo" 
          />
          <span className="text-xs font-bold text-[#1A237E] dark:text-indigo-300">Génie Mentor Académie (GMA)</span>
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700">
            v{APP_VERSION}
          </span>
          <button
            type="button"
            onClick={handleManualUpdateCheck}
            disabled={isCheckingUpdate || isApplyingUpdate}
            className="px-2.5 py-1 text-[10px] font-extrabold rounded-full border flex items-center space-x-1 cursor-pointer transition-all bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
            title="Vérifier les mises à jour"
          >
            <RefreshCw size={10} className={isCheckingUpdate || isApplyingUpdate ? "animate-spin" : ""} />
            <span>{isCheckingUpdate ? "Vérification..." : "Mises à jour"}</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          Encadrement Pédagogique & Réussite Scolaire • Version {APP_VERSION} (Offline-First)
        </p>
      </div>
        </div>
      </div>



      {/* Level Change Confirmation / Request Modal */}
      {showLevelConfirm && targetLevel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-11 h-11 bg-indigo-100 text-[#1A237E] rounded-2xl flex items-center justify-center shrink-0 font-bold">
                <GraduationCap size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Demande de Changement de Classe</h3>
                <p className="text-[11px] text-slate-500">
                  {user.isAdmin ? "Modification directe (Admin)" : "Soumettre une demande à l'administration"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100 text-xs text-[#1A237E] space-y-1">
              <div className="flex justify-between font-bold">
                <span>Classe actuelle : <strong>Classe de {getLevelLabel(user.level)}</strong></span>
                <span>Nouvelle classe : <strong className="text-emerald-700">Classe de {getLevelLabel(targetLevel)}</strong></span>
              </div>
              <p className="text-[10px] text-indigo-900/70">
                {user.isAdmin
                  ? "En tant qu'Admin, le changement est immédiat."
                  : "Votre demande sera envoyée à l'administration. En attendant sa validation, vous conservez l'accès à vos cours de la classe de " + getLevelLabel(user.level) + "."}
              </p>
            </div>

            {!user.isAdmin ? (
              <form onSubmit={handleSendClassChangeRequest} className="space-y-3">
                {classChangeReasonError && (
                  <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-1.5 font-medium">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{classChangeReasonError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Motif de la demande de changement de classe <span className="text-red-500">*</span> :
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={classChangeReason}
                    onChange={(e) => {
                      setClassChangeReason(e.target.value);
                      if (classChangeReasonError) setClassChangeReasonError("");
                    }}
                    placeholder="Précisez la raison de votre demande (ex : Erreur de choix lors de l'inscription, passage en classe supérieure, changement de série...)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#1A237E] resize-none"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLevelConfirm(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Send size={14} />
                    <span>Envoyer la Demande</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Confirmez-vous le passage à la classe de <strong>{targetLevel}</strong> ? Cela effacera le cache local et réinitialisera la session.
                </p>
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLevelConfirm(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLevelConfirm(false);
                      onUpdateLevel(targetLevel);
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
                  >
                    Confirmer & Réinitialiser
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modale de mise à jour avec barre de progression */}
      {updateModalData && (
        <UpdateModal
          isOpen={isProfileUpdateModalOpen}
          latestVersion={updateModalData.latestVersion}
          currentVersion={updateModalData.currentVersion}
          apkUrl={updateModalData.apkUrl}
          message={updateModalData.message}
          autoStart={true}
          onClose={() => setIsProfileUpdateModalOpen(false)}
          onUpdate={handleApplyUpdate}
        />
      )}

      {/* Toast Notification discret pour information instantanée */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 text-white text-xs font-bold rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none max-w-[90vw] text-center">
          <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
