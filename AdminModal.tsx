import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Course, Asset, Quiz, SecondaryLevel, Subject, QuizQuestion, StudentRecord, PaymentTransaction, UserNotification, VIPPaymentRequest, ClassChangeRequest } from "../types";
import { ALL_LEVELS, getSubjectsForLevel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { 
  subscribeToAllTransactionsSupabase as subscribeToAllTransactions, 
  saveTransactionToSupabase as saveTransactionToFirebase, 
  subscribeToVIPPaymentRequestsSupabase as subscribeToVIPPaymentRequests, 
  updateVIPPaymentRequestStatusSupabase as updateVIPPaymentRequestStatusFirebase, 
  saveNotificationToSupabase as saveNotificationToFirebase,
  subscribeToAllStudentsSupabase as subscribeToAllStudents,
  subscribeToClassChangeRequestsSupabase as subscribeToAllClassChangeRequests,
  updateClassChangeRequestStatusSupabase,
  subscribeToAllNotificationsSupabase as subscribeToAllNotifications,
  setUserVIPStatusSupabase as setUserVIPStatusFirebase,
  saveAppConfigToSupabase,
  getAppConfigFromSupabase,
  syncAllExistingDataToSupabase
} from "../data/supabaseStorage";
import { VIP_PLANS, computeExpirationTimestamp } from "../utils/vipUtils";
import { getLocalAppConfig, updateAppConfig, CURRENT_APP_VERSION, APP_VERSION } from "../utils/versionUtils";
import { AppLogo } from "./AppLogo";
import {
  getAppLogo,
  saveCustomLogoToFirebase,
  syncLogoWithFirebase,
  getOfficialSignature,
  subscribeToSignatureChange,
  setOfficialSignature,
  saveCustomSignatureToRemote,
  syncSignatureWithRemote,
} from "../utils/assetImages";
import { AdminPaymentValidation } from "./AdminPaymentValidation";
import { ModuleCaisseAdmin } from "./ModuleCaisseAdmin";
import { AdminHomeworkManagement } from "./AdminHomeworkManagement";
import { AdminPricingManagement } from "./AdminPricingManagement";
import { AdminAIAssistant } from "./AdminAIAssistant";
import { AdminAuditLogsView } from "./AdminAuditLogsView";
import { EditCourseModal } from "./EditCourseModal";
import { EditAssetModal } from "./EditAssetModal";
import { EditQuizModal } from "./EditQuizModal";
import { AIQuizModifierModal } from "./AIQuizModifierModal";
import { LatexToolbar } from "./LatexToolbar";
import { MathToolbar, MathRenderer } from "./MathRenderer";
import { MathLiveEditor } from "./MathLiveEditor";
import { scrollToTopGlobal } from "./ScrollToTop";
import { 
  Lock, 
  ShieldCheck, 
  PlusCircle, 
  FileText, 
  HelpCircle, 
  BookOpen, 
  X, 
  CheckCircle,
  Sparkles,
  FolderOpen,
  Upload,
  FileCheck,
  Trash2,
  Paperclip,
  Users,
  Search,
  Award,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Filter,
  CreditCard,
  XCircle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  User,
  AlertCircle,
  Bell,
  Send,
  RefreshCw,
  AlertTriangle,
  Sliders,
  Key,
  Save,
  Phone,
  Megaphone,
  Globe,
  Layers,
  Edit3,
  Download,
  Code2,
  DollarSign,
  Database
} from "lucide-react";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCourse: (course: Course) => void;
  onAddAsset: (asset: Asset) => void;
  onAddQuiz: (quiz: Quiz) => void;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  onOpenCodeViewer?: () => void;
}

export const AdminModalContent: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onAddCourse,
  onAddAsset,
  onAddQuiz,
  onOpenReceipt,
  onOpenCodeViewer,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();

  const [pin, setPin] = useState("");
  const [showLockPassword, setShowLockPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState("");
  const [activeFormTab, setActiveFormTab] = useState<"editor" | "pricing" | "payments" | "vip_payments" | "caisse" | "class_requests" | "notifications" | "students" | "homework" | "course" | "asset" | "quiz" | "settings" | "ai_assistant" | "audit_logs">("editor");
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [vipRequests, setVipRequests] = useState<VIPPaymentRequest[]>([]);
  const [paymentCategory, setPaymentCategory] = useState<"all" | "vip" | "domicile" | "renforcement">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [vipRejectModalReq, setVipRejectModalReq] = useState<VIPPaymentRequest | null>(null);
  const [vipRejectReason, setVipRejectReason] = useState("");
  const [vipProcessingId, setVipProcessingId] = useState<string | null>(null);
  const [allNotifs, setAllNotifs] = useState(() => roomRepo.getAllNotifications());
  const [classRequests, setClassRequests] = useState(() => roomRepo.getAllClassChangeRequests());

  // Outil d'Édition Globale State
  const [appNameInput, setAppNameInput] = useState("Génie Mentor Académie");
  const [heroTitleInput, setHeroTitleInput] = useState("Réussite Scolaire & Concours au Sénégal");
  const [heroSubtitleInput, setHeroSubtitleInput] = useState("Accédez aux cours complets, épreuves corrigées du BFEM, BAC et concours nationaux.");
  const [announcementTextInput, setAnnouncementTextInput] = useState("");
  const [supportPhoneInput, setSupportPhoneInput] = useState("+221 77 123 45 67");
  const [vipPriceInput, setVipPriceInput] = useState<number>(2000);
  const [adminCodeInput, setAdminCodeInput] = useState(() => roomRepo.getAdminPassword());
  const [editorSearchQuery, setEditorSearchQuery] = useState("");
  const [editorContentType, setEditorContentType] = useState<"all" | "courses" | "assets">("all");

  // Admin CRUD Editor states
  const [adminEditingCourse, setAdminEditingCourse] = useState<Course | null>(null);
  const [adminEditingAsset, setAdminEditingAsset] = useState<Asset | null>(null);
  const [adminEditingQuiz, setAdminEditingQuiz] = useState<Quiz | null>(null);
  const [assetManagerFilter, setAssetManagerFilter] = useState<"all" | "concours" | "pdf" | "video" | "image">("all");
  const [assetManagerSearch, setAssetManagerSearch] = useState("");
  const [courseManagerSearch, setCourseManagerSearch] = useState("");
  const [courseManagerLevel, setCourseManagerLevel] = useState<string>("Tous");
  const [quizManagerSearch, setQuizManagerSearch] = useState("");
  const [quizManagerLevel, setQuizManagerLevel] = useState<string>("Tous");

  // Réinitialisation immédiate du défilement au sommet lors de l'ouverture et du changement d'onglet
  useEffect(() => {
    scrollToTopGlobal("instant");
  }, [activeFormTab, isOpen]);

  // Admin Change Password Modal State
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [adminOldPwd, setAdminOldPwd] = useState("");
  const [adminNewPwd, setAdminNewPwd] = useState("");
  const [adminConfirmPwd, setAdminConfirmPwd] = useState("");
  const [adminChangePwdError, setAdminChangePwdError] = useState("");
  const [adminChangePwdSuccess, setAdminChangePwdSuccess] = useState("");
  const [showChangePwdOld, setShowChangePwdOld] = useState(false);
  const [showChangePwdNew, setShowChangePwdNew] = useState(false);
  const [showChangePwdConfirm, setShowChangePwdConfirm] = useState(false);

  // Admin Broadcast Message State
  const [adminNotifTitle, setAdminNotifTitle] = useState("📢 Notification Administrateur Génie Mentor Académie (GMA)");
  const [adminNotifMsg, setAdminNotifMsg] = useState("");
  const [adminNotifTarget, setAdminNotifTarget] = useState("all");

  // App Update System Config State
  const [updateVersionInput, setUpdateVersionInput] = useState("1.0.1");
  const [updateApkUrlInput, setUpdateApkUrlInput] = useState("");
  const [updateMessageInput, setUpdateMessageInput] = useState("Une nouvelle version de l'application Génie Mentor Académie est disponible avec de superbes améliorations.");
  const [isSavingAppConfig, setIsSavingAppConfig] = useState(false);

  // Logo Firebase State
  const [logoPreview, setLogoPreview] = useState<string>(() => getAppLogo());
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // Official Signature State
  const [signaturePreview, setSignaturePreview] = useState<string>(() => getOfficialSignature());
  const [isSavingSignature, setIsSavingSignature] = useState(false);

  // Supabase Migration State
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseSyncResult, setSupabaseSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      syncLogoWithFirebase().then((url) => {
        if (url) setLogoPreview(url);
      }).catch((err) => console.warn(err?.message || err));
      syncSignatureWithRemote().then((url) => {
        if (url) setSignaturePreview(url);
      }).catch((err) => console.warn(err?.message || err));

      setSignaturePreview(getOfficialSignature());
      const unsubSig = subscribeToSignatureChange((newSig) => {
        setSignaturePreview(newSig);
      });
      return () => unsubSig();
    }
  }, [isOpen]);

  // Load configuration ONLY on modal opening without overwriting on tab switch
  useEffect(() => {
    if (isOpen) {
      const cfg = getLocalAppConfig();
      if (cfg.latest_version) setUpdateVersionInput(cfg.latest_version);
      if (cfg.apk_url) setUpdateApkUrlInput(cfg.apk_url);
      if (cfg.message) setUpdateMessageInput(cfg.message);
      if (cfg.appName) setAppNameInput(cfg.appName);
      if (cfg.heroTitle) setHeroTitleInput(cfg.heroTitle);
      if (cfg.heroSubtitle) setHeroSubtitleInput(cfg.heroSubtitle);
      if (cfg.announcementText) setAnnouncementTextInput(cfg.announcementText);
      if (cfg.supportPhone) setSupportPhoneInput(cfg.supportPhone);
      if (cfg.vipPriceFCFA) setVipPriceInput(cfg.vipPriceFCFA);
      setAdminCodeInput(roomRepo.getAdminPassword());

      getAppConfigFromSupabase().then((remoteCfg) => {
        if (remoteCfg) {
          if (remoteCfg.latest_version) setUpdateVersionInput(remoteCfg.latest_version);
          if (remoteCfg.apk_url) setUpdateApkUrlInput(remoteCfg.apk_url);
          if (remoteCfg.message) setUpdateMessageInput(remoteCfg.message);
          if (remoteCfg.appName) setAppNameInput(remoteCfg.appName);
          if (remoteCfg.heroTitle) setHeroTitleInput(remoteCfg.heroTitle);
          if (remoteCfg.heroSubtitle) setHeroSubtitleInput(remoteCfg.heroSubtitle);
          if (remoteCfg.announcementText) setAnnouncementTextInput(remoteCfg.announcementText);
          if (remoteCfg.supportPhone) setSupportPhoneInput(remoteCfg.supportPhone);
          if (remoteCfg.vipPriceFCFA) setVipPriceInput(remoteCfg.vipPriceFCFA);
        }
      }).catch((err) => console.warn(err?.message || err));
    }
  }, [isOpen]);

  const handleSaveAllEdits = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingAppConfig(true);
    try {
      const updatedConfig = {
        appName: appNameInput.trim(),
        heroTitle: heroTitleInput.trim(),
        heroSubtitle: heroSubtitleInput.trim(),
        announcementText: announcementTextInput.trim(),
        supportPhone: supportPhoneInput.trim(),
        vipPriceFCFA: Number(vipPriceInput) || 2000,
        latest_version: updateVersionInput.trim(),
        apk_url: updateApkUrlInput.trim(),
        message: updateMessageInput.trim(),
        logoUrl: logoPreview,
        signatureUrl: signaturePreview,
        updatedAt: Date.now(),
      };

      updateAppConfig(updatedConfig);
      await saveAppConfigToSupabase(updatedConfig);

      if (adminCodeInput.trim() && adminCodeInput.trim() !== roomRepo.getAdminPassword()) {
        roomRepo.setAdminPassword(adminCodeInput.trim());
      }

      if (logoPreview) {
        await saveCustomLogoToFirebase(logoPreview);
      }

      if (signaturePreview) {
        await saveCustomSignatureToRemote(signaturePreview);
      }

      // Automatically notify all students if an announcement was published/updated
      if (announcementTextInput.trim()) {
        const notif: UserNotification = {
          id: "notif_ann_" + Date.now(),
          userUid: "all",
          title: "📢 Annonce Officielle Génie Mentor Académie",
          message: announcementTextInput.trim(),
          type: "admin_broadcast",
          status: "unread",
          createdAt: Date.now(),
          dateFormatted: `Aujourd'hui, ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        };
        roomRepo.insertNotification(notif);
        saveNotificationToFirebase(notif).catch((err) => console.warn(err?.message || err));
      }

      setSuccessMsg("✅ Toutes les modifications de l'application ont été enregistrées et publiées avec succès !");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Error saving app edits:", err);
      setPinError("Erreur lors de l'enregistrement des modifications.");
    } finally {
      setIsSavingAppConfig(false);
    }
  };

  // Deletion & Reset Revenue Confirmations State
  const [txToDelete, setTxToDelete] = useState<PaymentTransaction | null>(null);
  const [showResetRevenueConfirm, setShowResetRevenueConfirm] = useState(false);

  // Student Tracking & Deletion Tab State
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentLevelFilter, setStudentLevelFilter] = useState<SecondaryLevel | "Tous">("Tous");
  const [studentSubTab, setStudentSubTab] = useState<"inscrits" | "online">("inscrits");
  const [studentToDelete, setStudentToDelete] = useState<StudentRecord | null>(null);
  const [expandedStudentUid, setExpandedStudentUid] = useState<string | null>(null);
  const [allQuizzesList, setAllQuizzesList] = useState<Quiz[]>(() => roomRepo.getAllQuizzes());

  useEffect(() => {
    let unsubscribeTransactions: () => void = () => {};
    let unsubscribeVIP: () => void = () => {};
    let unsubscribeStudents: () => void = () => {};
    let unsubscribeClassReqs: () => void = () => {};
    let unsubscribeNotifs: () => void = () => {};

    const refreshAdminData = () => {
      setTransactions(roomRepo.getAllTransactions());
      setAllNotifs(roomRepo.getAllNotifications());
      setAllQuizzesList(roomRepo.getAllQuizzes());
      setClassRequests(roomRepo.getAllClassChangeRequests());
    };

    // Firebase realtime subscription for admin transactions
    unsubscribeTransactions = subscribeToAllTransactions((txs) => {
      setTransactions((prev) => {
        const txMap = new Map<string, PaymentTransaction>(prev.map(t => [t.id, t]));
        txs.forEach(t => txMap.set(t.id, t));
        return Array.from(txMap.values()).sort((a, b) => b.createdAt - a.createdAt);
      });
    });

    // Firebase realtime subscription for VIP payment requests
    unsubscribeVIP = subscribeToVIPPaymentRequests((reqs) => {
      setVipRequests(reqs);
    });

    // Firebase realtime subscription for all connected users / students
    unsubscribeStudents = subscribeToAllStudents((stds) => {
      refreshAdminData();
    });

    // Firebase realtime subscription for class change requests
    unsubscribeClassReqs = subscribeToAllClassChangeRequests((reqs) => {
      setClassRequests(reqs);
    });

    // Firebase realtime subscription for all notifications
    unsubscribeNotifs = subscribeToAllNotifications((notifs) => {
      setAllNotifs(notifs);
    });

    refreshAdminData();
    const unsubLocal = roomRepo.subscribe(refreshAdminData);

    return () => {
      unsubLocal();
      unsubscribeTransactions();
      unsubscribeVIP();
      unsubscribeStudents();
      unsubscribeClassReqs();
      unsubscribeNotifs();
    };
  }, []);

  // New Course Form State
  const [cTitle, setCTitle] = useState("");
  const [cSubject, setCSubject] = useState<Subject>("Maths");
  const [cLevel, setCLevel] = useState<SecondaryLevel>("3ème");
  const [cChapter, setCChapter] = useState("");
  const [cSummary, setCSummary] = useState("");
  const [cContent, setCContent] = useState("");
  const [courseFile, setCourseFile] = useState<File | null>(null);
  const courseFileInputRef = useRef<HTMLInputElement>(null);

  const handleCourseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const max2GB = 2 * 1024 * 1024 * 1024; // 2 Go max
      if (file.size > max2GB) {
        alert("Le fichier sélectionné dépasse la limite autorisée de 2 Go. Veuillez choisir un fichier ou une vidéo de taille inférieure.");
        return;
      }
      setCourseFile(file);
    }
  };

  const handleClearCourseFile = () => {
    setCourseFile(null);
    if (courseFileInputRef.current) {
      courseFileInputRef.current.value = "";
    }
  };

  // New Asset Form State
  const [aName, setAName] = useState("");
  const [aLevel, setALevel] = useState<SecondaryLevel>("3ème");
  const [aSubject, setASubject] = useState<Subject>("Maths");
  const [aType, setAType] = useState<"pdf" | "docx" | "image">("pdf");
  const [aParentId, setAParentId] = useState("");
  const [aSize, setASize] = useState("1.2 MB");
  const [aPath, setAPath] = useState("docs/fichier.pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Octets";
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const calculatedSize = formatFileSize(file.size);
    setASize(calculatedSize);
    setAPath(`docs/${file.name}`);

    // Auto-fill title if empty
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    if (!aName) {
      setAName(fileNameWithoutExt);
    }

    // Auto-detect type
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || file.type.includes("pdf")) {
      setAType("pdf");
    } else if (ext === "doc" || ext === "docx" || file.type.includes("word") || file.type.includes("officedocument")) {
      setAType("docx");
    } else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "") || file.type.startsWith("image/")) {
      setAType("image");
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // New Quiz Form State
  const [qTitle, setQTitle] = useState("");
  const [qSubject, setQSubject] = useState<Subject>("Maths");
  const [qLevel, setQLevel] = useState<SecondaryLevel>("3ème");
  const [qQuestionText, setQQuestionText] = useState("");
  const [qOpt1, setQOpt1] = useState("");
  const [qOpt2, setQOpt2] = useState("");
  const [qOpt3, setQOpt3] = useState("");
  const [qOpt4, setQOpt4] = useState("");
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qExplanation, setQExplanation] = useState("");
  const [activeQuizFieldTarget, setActiveQuizFieldTarget] = useState<"question" | "opt1" | "opt2" | "opt3" | "opt4" | "explanation">("question");
  const [showQuizMathPreview, setShowQuizMathPreview] = useState(true);
  const [aiModifierQuiz, setAiModifierQuiz] = useState<Quiz | null>(null);

  const getActiveQuizFieldValue = (): string => {
    switch (activeQuizFieldTarget) {
      case "opt1": return qOpt1;
      case "opt2": return qOpt2;
      case "opt3": return qOpt3;
      case "opt4": return qOpt4;
      case "explanation": return qExplanation;
      case "question":
      default: return qQuestionText;
    }
  };

  const updateActiveQuizFieldValue = (val: string) => {
    switch (activeQuizFieldTarget) {
      case "opt1": setQOpt1(val); break;
      case "opt2": setQOpt2(val); break;
      case "opt3": setQOpt3(val); break;
      case "opt4": setQOpt4(val); break;
      case "explanation": setQExplanation(val); break;
      case "question":
      default: setQQuestionText(val); break;
    }
  };

  const handleInsertQuizModalMath = (snip: string) => {
    switch (activeQuizFieldTarget) {
      case "opt1":
        setQOpt1((prev) => prev + (prev ? " " : "") + snip);
        break;
      case "opt2":
        setQOpt2((prev) => prev + (prev ? " " : "") + snip);
        break;
      case "opt3":
        setQOpt3((prev) => prev + (prev ? " " : "") + snip);
        break;
      case "opt4":
        setQOpt4((prev) => prev + (prev ? " " : "") + snip);
        break;
      case "explanation":
        setQExplanation((prev) => prev + (prev ? " " : "") + snip);
        break;
      case "question":
      default:
        setQQuestionText((prev) => prev + (prev ? " " : "") + snip);
        break;
    }
  };

  const [successMsg, setSuccessMsg] = useState("");

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const activeAdminPass = roomRepo.getAdminPassword();
    const cleanInput = pin.trim();
    const isDefaultPass = activeAdminPass === "Perpendiculaire @2026";

    const isMatch = cleanInput === activeAdminPass || (isDefaultPass && (cleanInput === "Perpendiculaire @2026" || cleanInput === "Perpendiculaire@2026" || cleanInput === "1717"));

    if (isMatch) {
      setIsUnlocked(true);
      setPinError("");
    } else {
      setPinError("Mot de passe Administrateur incorrect. L'ancien mot de passe a été révoqué.");
    }
  };

  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminChangePwdError("");
    setAdminChangePwdSuccess("");

    const activeAdminPass = roomRepo.getAdminPassword();
    const cleanOld = adminOldPwd.trim();
    const cleanNew = adminNewPwd.trim();
    const cleanConfirm = adminConfirmPwd.trim();
    const isDefaultPass = activeAdminPass === "Perpendiculaire @2026";

    const isOldValid = cleanOld === activeAdminPass || (isDefaultPass && (cleanOld === "Perpendiculaire @2026" || cleanOld === "Perpendiculaire@2026"));

    if (!isOldValid) {
      setAdminChangePwdError("Le mot de passe actuel est incorrect.");
      return;
    }

    if (cleanNew.length < 4) {
      setAdminChangePwdError("Le nouveau mot de passe doit comporter au moins 4 caractères.");
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setAdminChangePwdError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    roomRepo.setAdminPassword(cleanNew);
    setAdminChangePwdSuccess("Le mot de passe Administrateur a été modifié et enregistré avec succès !");
    setAdminOldPwd("");
    setAdminNewPwd("");
    setAdminConfirmPwd("");

    setTimeout(() => {
      setIsChangePasswordModalOpen(false);
      setAdminChangePwdSuccess("");
    }, 2000);
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cTitle || !cChapter || !cContent) return;
    const ext = courseFile ? courseFile.name.split(".").pop()?.toLowerCase() : "";
    const isVideo = courseFile && (courseFile.type.startsWith("video/") || ["mp4", "webm", "avi", "mkv", "mov"].includes(ext || ""));

    const newCourse: Course = {
      id: "c_custom_" + Date.now(),
      title: cTitle,
      subject: cSubject,
      level: cLevel,
      chapter: cChapter,
      summary: cSummary || cTitle,
      content: cContent,
      createdAt: Date.now(),
      videoUrl: isVideo ? URL.createObjectURL(courseFile) : undefined,
      videoFileName: isVideo ? courseFile.name : undefined,
      videoSize: isVideo ? formatFileSize(courseFile.size) : undefined,
    };
    onAddCourse(newCourse);

    if (courseFile) {
      let type: "pdf" | "docx" | "image" | "audio" = "pdf";
      if (isVideo) {
        // Video file support
        type = "audio"; // fallback asset category
      } else if (ext === "pdf" || courseFile.type.includes("pdf")) {
        type = "pdf";
      } else if (ext === "doc" || ext === "docx" || courseFile.type.includes("word") || courseFile.type.includes("officedocument")) {
        type = "docx";
      } else if (courseFile.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
        type = "image";
      }

      const courseAsset: Asset = {
        assetId: "ast_" + Date.now(),
        parentId: newCourse.id,
        name: `[Support] ${cTitle} - ${courseFile.name}`,
        type,
        size: formatFileSize(courseFile.size),
        storagePath: `courses/${newCourse.id}/${courseFile.name}`,
        downloadUrl: URL.createObjectURL(courseFile),
        isCachedOffline: true,
        level: cLevel,
        subject: cSubject,
      };
      onAddAsset(courseAsset);
    }

    // Automatically notify all students that a new course is available
    const courseNotif: UserNotification = {
      id: "notif_crs_" + Date.now(),
      userUid: "all",
      title: `📚 Nouveau Cours : ${cTitle}`,
      message: `Un nouveau cours de ${cSubject} (${cChapter}) pour la classe de ${cLevel} est disponible sur la plateforme.`,
      type: "admin_broadcast",
      status: "unread",
      createdAt: Date.now(),
      dateFormatted: `Aujourd'hui, ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    };
    roomRepo.insertNotification(courseNotif);
    saveNotificationToFirebase(courseNotif).catch((err) => console.warn(err?.message || err));

    setSuccessMsg(
      courseFile
        ? "Cours et support joint enregistrés ! Notification envoyée aux élèves."
        : "Cours ajouté avec succès ! Notification envoyée aux élèves."
    );
    setTimeout(() => setSuccessMsg(""), 3000);
    setCTitle("");
    setCChapter("");
    setCSummary("");
    setCContent("");
    setCourseFile(null);
    if (courseFileInputRef.current) {
      courseFileInputRef.current.value = "";
    }
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aName) return;

    let downloadUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    if (selectedFile) {
      downloadUrl = URL.createObjectURL(selectedFile);
    }

    const newAsset: Asset = {
      assetId: "ast_" + Date.now(),
      parentId: aParentId || undefined,
      name: aName,
      type: aType,
      size: aSize || "1.2 MB",
      storagePath: aPath || `docs/${aName}.${aType}`,
      downloadUrl,
      isCachedOffline: true,
      level: aLevel,
      subject: aSubject,
    };
    onAddAsset(newAsset);

    // Automatically notify students about the new exercise/document
    const assetNotif: UserNotification = {
      id: "notif_ast_" + Date.now(),
      userUid: "all",
      title: `📝 Nouveau Document / Exercice : ${aName}`,
      message: `Un nouveau document pédagogique (${aSubject} - ${aLevel || "Toutes classes"}) est disponible en téléchargement.`,
      type: "admin_broadcast",
      status: "unread",
      createdAt: Date.now(),
      dateFormatted: `Aujourd'hui, ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    };
    roomRepo.insertNotification(assetNotif);
    saveNotificationToFirebase(assetNotif).catch((err) => console.warn(err?.message || err));

    setSuccessMsg(`Document "${aName}" ajouté avec succès ! Notification envoyée aux élèves.`);
    setTimeout(() => setSuccessMsg(""), 3000);
    setAName("");
    setSelectedFile(null);
    setASize("1.2 MB");
    setAPath("docs/fichier.pdf");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle || !qQuestionText || !qOpt1 || !qOpt2) return;
    const questions: QuizQuestion[] = [
      {
        id: "qq_" + Date.now(),
        question: qQuestionText,
        options: [qOpt1, qOpt2, qOpt3 || "Option C", qOpt4 || "Option D"],
        correctIndex: qCorrectIdx,
        explanation: qExplanation || "Correction enregistrée par l'administrateur.",
      },
    ];

    const newQuiz: Quiz = {
      id: "q_custom_" + Date.now(),
      title: qTitle,
      subject: qSubject,
      level: qLevel,
      questions,
      createdAt: Date.now(),
    };
    onAddQuiz(newQuiz);
    setSuccessMsg("Quiz QCM créé avec succès !");
    setTimeout(() => setSuccessMsg(""), 3000);
    setQTitle("");
    setQQuestionText("");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#1A237E] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Espace Admin — Génie Mentor Académie (GMA)</h3>
              <p className="text-xs text-indigo-200">Administrateur : Massaw Seck</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isUnlocked && (
              <>
                {onOpenCodeViewer && (
                  <button
                    type="button"
                    onClick={onOpenCodeViewer}
                    className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 font-bold text-xs rounded-xl flex items-center space-x-1.5 border border-indigo-600 transition-colors cursor-pointer"
                    title="Code Source Kotlin Native Android"
                  >
                    <Code2 size={14} className="text-amber-400" />
                    <span className="hidden sm:inline">Code Kotlin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#1A237E] font-extrabold text-xs rounded-xl flex items-center space-x-1.5 shadow transition-colors cursor-pointer"
                  title="Modifier le mot de passe Administrateur"
                >
                  <KeyRound size={14} />
                  <span className="hidden sm:inline">Mot de passe Admin</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lock Screen */}
        {!isUnlocked ? (
          <form onSubmit={handleVerifyPin} className="p-8 space-y-5 text-center my-auto">
            <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
              <Lock size={28} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">Mot de passe Administrateur</h4>
              <p className="text-xs text-slate-500 mt-1">
                Veuillez vous authentifier pour accéder au panneau de gestion.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-2">
              <div className="relative flex items-center">
                <input
                  type={showLockPassword ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Mot de passe Admin"
                  className="w-full text-center text-base font-bold py-3 pl-4 pr-11 border-2 border-slate-200 rounded-2xl focus:border-[#1A237E] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowLockPassword(!showLockPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showLockPassword ? "Masquer" : "Afficher"}
                >
                  {showLockPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {pinError && <p className="text-xs text-rose-600 font-semibold">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full max-w-sm mx-auto py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
            >
              Déverrouiller l'Espace Admin
            </button>
          </form>
        ) : (
          /* Admin Dashboard & Upload Forms */
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center space-x-2 text-emerald-800 text-xs font-bold animate-in fade-in">
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form & Management Selection Tabs */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-11 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveFormTab("ai_assistant")}
                title="Assistant IA Admin"
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 relative cursor-pointer ${
                  activeFormTab === "ai_assistant"
                    ? "bg-[#1A237E] text-amber-300 font-black shadow border border-amber-400 scale-[1.02]"
                    : "text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300"
                }`}
              >
                <Sparkles size={14} className="text-amber-500" />
                <span className="truncate">Assistant IA</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("audit_logs")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 relative cursor-pointer ${
                  activeFormTab === "audit_logs"
                    ? "bg-[#1A237E] text-white font-extrabold shadow border border-indigo-400 scale-[1.02]"
                    : "text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                }`}
              >
                <ShieldCheck size={14} className="text-indigo-600" />
                <span className="truncate">Audit</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab("editor")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 relative cursor-pointer ${
                  activeFormTab === "editor"
                    ? "bg-amber-400 text-[#1A237E] font-extrabold shadow border border-amber-300 scale-[1.02]"
                    : "text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300"
                }`}
              >
                <Sliders size={14} className="text-amber-700" />
                <span className="truncate">Édition</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("pricing")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 relative cursor-pointer ${
                  activeFormTab === "pricing"
                    ? "bg-emerald-600 text-white font-extrabold shadow border border-emerald-500 scale-[1.02]"
                    : "text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300"
                }`}
              >
                <DollarSign size={14} className="text-emerald-700" />
                <span className="truncate">Tarifs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("payments")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 relative cursor-pointer ${
                  activeFormTab === "payments"
                    ? "bg-[#1A237E] text-white shadow"
                    : "text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                <CreditCard size={14} />
                <span className="truncate">Paiements</span>
                {(transactions.filter((t) => t.status === "pending").length + vipRequests.filter((r) => r.status === "PENDING").length) > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white font-black text-[9px] rounded-full absolute -top-1 -right-1 shadow animate-pulse">
                    {transactions.filter((t) => t.status === "pending").length + vipRequests.filter((r) => r.status === "PENDING").length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("caisse")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 relative cursor-pointer ${
                  activeFormTab === "caisse"
                    ? "bg-[#1A237E] text-white shadow"
                    : "text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                <FolderOpen size={14} />
                <span className="truncate">Caisse</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("notifications")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 relative cursor-pointer ${
                  activeFormTab === "notifications"
                    ? "bg-[#1A237E] text-white shadow"
                    : "text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                }`}
              >
                <Bell size={14} />
                <span className="truncate">Notifs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("class_requests")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 relative cursor-pointer ${
                  activeFormTab === "class_requests"
                    ? "bg-[#1A237E] text-white shadow"
                    : "text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                }`}
              >
                <GraduationCap size={14} />
                <span className="truncate">Classes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("students")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  activeFormTab === "students"
                    ? "bg-[#1A237E] text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users size={14} />
                <span className="truncate">Élèves</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("homework")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  activeFormTab === "homework"
                    ? "bg-[#1A237E] text-amber-300 shadow border border-amber-400"
                    : "text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                }`}
              >
                <FileCheck size={14} className="text-amber-500" />
                <span className="truncate">Devoirs TD</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("course")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  activeFormTab === "course"
                    ? "bg-[#1A237E] text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen size={14} />
                <span className="truncate">Cours</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("asset")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  activeFormTab === "asset"
                    ? "bg-[#1A237E] text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText size={14} />
                <span className="truncate">Fichiers</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab("settings")}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  activeFormTab === "settings"
                    ? "bg-[#1A237E] text-white shadow"
                    : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                <KeyRound size={14} />
                <span className="truncate">Sécurité</span>
              </button>
            </div>

            {/* TAB OUTIL IA ADMIN */}
            {activeFormTab === "ai_assistant" && (
              <AdminAIAssistant />
            )}

            {/* TAB JOURNAL D'AUDIT ET SÉCURITÉ */}
            {activeFormTab === "audit_logs" && (
              <AdminAuditLogsView />
            )}

            {/* TAB OUTIL D'ÉDITION GLOBALE DE L'APPLICATION */}
            {activeFormTab === "editor" && (
              <div className="space-y-6">
                {/* Header de l'outil d'édition */}
                <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-indigo-800 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Sliders size={20} className="text-amber-300" />
                      <h4 className="font-extrabold text-base text-amber-300">Studio d'Édition Globale de l'Application</h4>
                      <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-200 border border-amber-300/30 rounded-full font-bold text-[10px]">
                        Accès Code Administratif
                      </span>
                    </div>
                    <p className="text-indigo-100 text-xs">
                      Modifiez en temps réel les informations, titres, annonces, tarifs, logo et code secret de Génie Mentor Académie.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAllEdits}
                    disabled={isSavingAppConfig}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-[#1A237E] font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 flex items-center space-x-2 cursor-pointer shrink-0"
                  >
                    {isSavingAppConfig ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Publication en cours...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Enregistrer Tout dans Firebase</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 1. INFORMATIONS D'IDENTITÉ ET TEXTES D'ACCUEIL */}
                <div className="bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-xs space-y-4">
                  <h5 className="font-extrabold text-[#1A237E] flex items-center space-x-2 text-sm border-b border-slate-100 pb-2">
                    <Globe size={18} className="text-indigo-600" />
                    <span>1. Titres, Textes & Annonces d'Accueil</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nom Officiel de l'Application</label>
                      <input
                        type="text"
                        value={appNameInput}
                        onChange={(e) => setAppNameInput(e.target.value)}
                        placeholder="Ex: Génie Mentor Académie"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tarif du Pass VIP (en F CFA)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={vipPriceInput}
                          onChange={(e) => setVipPriceInput(Number(e.target.value))}
                          placeholder="2000"
                          className="w-full pl-3 pr-16 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                        />
                        <span className="absolute right-3 top-2 text-xs font-black text-slate-500">F CFA</span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Titre de la Bannière d'Accueil (Grand Héros)</label>
                      <input
                        type="text"
                        value={heroTitleInput}
                        onChange={(e) => setHeroTitleInput(e.target.value)}
                        placeholder="Ex: Réussite Scolaire & Concours au Sénégal"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Sous-titre explicatif d'Accueil</label>
                      <textarea
                        rows={2}
                        value={heroSubtitleInput}
                        onChange={(e) => setHeroSubtitleInput(e.target.value)}
                        placeholder="Description affichée sous le titre d'accueil..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5 text-amber-800">
                          <Megaphone size={14} className="text-amber-600" />
                          <span>Bandeau d'Annonce Général (Message défilant/Alerte)</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Laissez vide pour désactiver</span>
                      </label>
                      <input
                        type="text"
                        value={announcementTextInput}
                        onChange={(e) => setAnnouncementTextInput(e.target.value)}
                        placeholder="Ex: 🚨 Inscriptions ouvertes pour les préparations au Concours de Police 2026 !"
                        className="w-full px-3 py-2 bg-amber-50/60 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium text-amber-950"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Téléphone Support / Service Client (WhatsApp)</label>
                      <input
                        type="text"
                        value={supportPhoneInput}
                        onChange={(e) => setSupportPhoneInput(e.target.value)}
                        placeholder="+221 77 123 45 67"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. MODIFICATION DU CODE ADMINISTRATIF */}
                <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <h5 className="font-extrabold text-[#1A237E] flex items-center space-x-2 text-sm">
                      <Key size={18} className="text-amber-600" />
                      <span>2. Modifier le Code Administratif Secret</span>
                    </h5>
                    <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-full font-bold text-[10px]">
                      Code d'Accès Sécurisé
                    </span>
                  </div>

                  <p className="text-xs text-amber-900/80">
                    Ce code administratif protège le panneau d'administration. Par défaut, le code est <code className="font-black bg-amber-100 px-1.5 py-0.5 rounded text-amber-950">GMA2026</code>. Vous pouvez le personnaliser ci-dessous.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <Key size={16} className="absolute left-3 top-3 text-amber-600" />
                      <input
                        type="text"
                        value={adminCodeInput}
                        onChange={(e) => setAdminCodeInput(e.target.value)}
                        placeholder="Entrez le nouveau code administratif..."
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-black text-sm text-[#1A237E] tracking-wider"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!adminCodeInput.trim()) {
                          setPinError("Le code administratif ne peut pas être vide.");
                          return;
                        }
                        roomRepo.setAdminPassword(adminCodeInput.trim());
                        setSuccessMsg("✅ Nouveau code administratif enregistré avec succès !");
                        setTimeout(() => setSuccessMsg(""), 4000);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      Mettre à jour le Code
                    </button>
                  </div>
                </div>

                {/* 3. LOGO OFFICIEL DE L'APPLICATION */}
                <div className="bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-xs space-y-4">
                  <h5 className="font-extrabold text-[#1A237E] flex items-center space-x-2 text-sm border-b border-slate-100 pb-2">
                    <Sparkles size={18} className="text-amber-500" />
                    <span>3. Logo Officiel de l'Application (Firebase)</span>
                  </h5>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <AppLogo
                      customUrl={logoPreview}
                      className="w-20 h-20 rounded-2xl border-2 border-amber-400 shadow-md shrink-0"
                      alt="Logo Génie Mentor Académie"
                    />

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <h6 className="font-extrabold text-slate-800 text-xs">Téléverser une nouvelle image de logo</h6>
                      <p className="text-[11px] text-slate-500">Choisissez un fichier image PNG ou JPG pour mettre à jour l'icône principale de Génie Mentor Académie.</p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <label className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-700 rounded-xl cursor-pointer text-xs transition-colors flex items-center space-x-1.5 shadow-2xs">
                          <Upload size={14} className="text-indigo-700" />
                          <span>Sélectionner une image...</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const result = reader.result as string;
                                  setLogoPreview(result);
                                  setIsSavingLogo(true);
                                  try {
                                    await saveCustomLogoToFirebase(result);
                                    setSuccessMsg("✅ Logo mis à jour et synchronisé dans Firebase !");
                                    setTimeout(() => setSuccessMsg(""), 4000);
                                  } catch (err) {
                                    console.error("Error saving logo:", err);
                                  } finally {
                                    setIsSavingLogo(false);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. MISES À JOUR & GESTION DES VERSIONS */}
                <div className="bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-xs space-y-4">
                  <h5 className="font-extrabold text-[#1A237E] flex items-center space-x-2 text-sm border-b border-slate-100 pb-2">
                    <Download size={18} className="text-indigo-600" />
                    <span>4. Version de l'Application & Lien APK Android</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Dernière Version Disponible</label>
                      <input
                        type="text"
                        value={updateVersionInput}
                        onChange={(e) => setUpdateVersionInput(e.target.value)}
                        placeholder="Ex: 2.5.0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Lien Direct de Téléchargement APK</label>
                      <input
                        type="url"
                        value={updateApkUrlInput}
                        onChange={(e) => setUpdateApkUrlInput(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Message de la Mise à Jour</label>
                      <textarea
                        rows={2}
                        value={updateMessageInput}
                        onChange={(e) => setUpdateMessageInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* BOUTON GLOBAL D'ENREGISTREMENT */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAllEdits}
                    disabled={isSavingAppConfig}
                    className="px-6 py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-sm rounded-xl shadow-md transition-transform active:scale-95 flex items-center space-x-2 cursor-pointer"
                  >
                    {isSavingAppConfig ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Enregistrement en cours...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} className="text-amber-300" />
                        <span>Enregistrer et Publier Toutes les Modifications</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB TARIFS & INSCRIPTIONS */}
            {activeFormTab === "pricing" && (
              <AdminPricingManagement />
            )}

            {/* TAB ABONNEMENTS VIP WAVE/OM */}
            {activeFormTab === "vip_payments" && (
              <AdminPaymentValidation />
            )}

            {/* TAB GESTION DES DEVOIRS ET TD */}
            {activeFormTab === "homework" && (
              <AdminHomeworkManagement />
            )}

            {/* TAB CAISSE ET INSCRIPTIONS EN PRESENTIEL */}
            {activeFormTab === "caisse" && (
              <ModuleCaisseAdmin adminName="Massaw Seck (Admin)" />
            )}

            {/* TAB DEMANDES DE CHANGEMENT DE CLASSE */}
            {activeFormTab === "class_requests" && (
              <div className="space-y-4 text-xs">
                <div className="bg-[#1A237E] rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-800 text-amber-300 rounded-xl flex items-center justify-center font-black">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">Demandes de Changement de Classe</h4>
                      <p className="text-[11px] text-indigo-200">
                        Validez ou refusez les demandes de passage de classe des élèves
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black rounded-xl text-xs">
                      {classRequests.filter((r) => !r.status || r.status === "pending" || (r.status !== "approved" && r.status !== "rejected")).length} en attente
                    </span>
                  </div>
                </div>

                {/* Pending Requests */}
                <div className="space-y-3">
                  <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide flex items-center space-x-1.5">
                    <Clock size={15} className="text-amber-600" />
                    <span>Demandes en attente de décision ({classRequests.filter((r) => !r.status || r.status === "pending" || (r.status !== "approved" && r.status !== "rejected")).length})</span>
                  </h5>

                  {classRequests.filter((r) => !r.status || r.status === "pending" || (r.status !== "approved" && r.status !== "rejected")).length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-500">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                      <p className="font-bold">Aucune demande de changement de classe en attente.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Toutes les demandes ont été traitées par l'administration.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {classRequests
                        .filter((r) => !r.status || r.status === "pending" || (r.status !== "approved" && r.status !== "rejected"))
                        .map((req) => (
                          <div
                            key={req.id}
                            className="bg-white border-2 border-amber-200 hover:border-amber-400 rounded-2xl p-4 shadow-xs space-y-3 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-slate-900 text-sm">{req.userName}</span>
                                  <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                    {req.userEmail}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">Demande soumise {req.dateFormatted}</p>
                              </div>
                              <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                                <span className="font-bold text-slate-700">Classe actuelle : <strong className="text-[#1A237E]">{req.currentLevel}</strong></span>
                                <span className="text-slate-400">➔</span>
                                <span className="font-bold text-slate-700">Demande : <strong className="text-emerald-700">{req.requestedLevel}</strong></span>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                              <span className="font-extrabold text-slate-700 text-[11px] block">Motif de la demande :</span>
                              <p className="text-slate-800 font-medium italic text-xs leading-relaxed">"{req.reason}"</p>
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  const reason = window.prompt("Motif optionnel du refus de la demande :");
                                  roomRepo.updateClassChangeRequestStatus(req.id, "rejected", reason || undefined);
                                  await updateClassChangeRequestStatusSupabase(req.id, "rejected", req.userUid, req.requestedLevel, reason || undefined, req.userName);
                                  setClassRequests(roomRepo.getAllClassChangeRequests());
                                }}
                                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                <XCircle size={15} />
                                <span>Refuser la demande</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase.rpc('approve_class_change', {
                                      request_id: req.id,
                                      student_id: req.userUid,
                                      new_class_name: req.requestedLevel
                                    });

                                    if (error) {
                                      if (error.code === 'PGRST202' || error.message?.toLowerCase().includes('approve_class_change')) {
                                        roomRepo.updateClassChangeRequestStatus(req.id, "approved");
                                        await updateClassChangeRequestStatusSupabase(req.id, "approved", req.userUid, req.requestedLevel, undefined, req.userName);
                                        alert("Classe de l'élève mise à jour avec succès !");
                                        setClassRequests(roomRepo.getAllClassChangeRequests());
                                      } else {
                                        alert("Erreur lors de la validation : " + error.message);
                                      }
                                    } else {
                                      alert("Classe de l'élève mise à jour avec succès !");
                                      roomRepo.updateClassChangeRequestStatus(req.id, "approved");
                                      setClassRequests(roomRepo.getAllClassChangeRequests());
                                    }
                                  } catch (err: any) {
                                    alert("Erreur lors de la validation : " + (err?.message || "Erreur"));
                                  }
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
                              >
                                <CheckCircle2 size={16} />
                                <span>Accepter & Basculer en {req.requestedLevel}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Historique des demandes traitées */}
                {classRequests.filter((r) => r.status !== "pending").length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-slate-200">
                    <h5 className="font-extrabold text-slate-700 text-xs uppercase tracking-wide">
                      Historique des demandes traitées ({classRequests.filter((r) => r.status !== "pending").length})
                    </h5>
                    <div className="space-y-2">
                      {classRequests
                        .filter((r) => r.status !== "pending")
                        .map((req) => (
                          <div
                            key={req.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900">{req.userName}</span>
                                <span className="text-[10px] text-slate-500">({req.currentLevel} ➔ {req.requestedLevel})</span>
                              </div>
                              <p className="text-[11px] text-slate-600">Motif : "{req.reason}"</p>
                            </div>
                            <div className="text-right">
                              {req.status === "approved" ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg text-[10px]">
                                  <CheckCircle size={12} />
                                  <span>Acceptée</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-100 text-rose-800 font-extrabold rounded-lg text-[10px]">
                                  <XCircle size={12} />
                                  <span>Refusée</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB SÉCURITÉ / PARAMÈTRES ADMIN */}
            {activeFormTab === "settings" && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                      <KeyRound size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Paramètres & Sécurité Administrateur</h4>
                      <p className="text-xs text-slate-500">Gestion de l'accès sécurisé à l'Espace Admin</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordModalOpen(true)}
                    className="px-4 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <KeyRound size={15} />
                    <span>Modifier le mot de passe Admin</span>
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                  <h5 className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>Mot de passe Administrateur en vigueur</span>
                  </h5>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-600 font-medium">Mot de passe actuel :</span>
                    <span className="font-mono font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-indigo-950 text-xs">
                      {roomRepo.getAdminPassword()}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Ce mot de passe sécurisé est nécessaire pour déverrouiller le panneau Administrateur Génie Mentor Académie. Toute modification est instantanément sauvegardée localement et synchronisée sur Firestore.
                  </p>
                </div>

                {/* GESTION DES MISES À JOUR SYSTÈME (APK & LATEST VERSION) */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!updateVersionInput.trim()) return;
                    setIsSavingAppConfig(true);
                    try {
                      await updateAppConfig({
                        latest_version: updateVersionInput.trim(),
                        apk_url: updateApkUrlInput.trim(),
                        message: updateMessageInput.trim(),
                      });
                      setSuccessMsg(`Mise à jour v${updateVersionInput.trim()} enregistrée et publiée avec succès !`);
                      setTimeout(() => setSuccessMsg(""), 4000);
                    } catch (err) {
                      console.error("Error saving app config:", err);
                    } finally {
                      setIsSavingAppConfig(false);
                    }
                  }}
                  className="bg-white border-2 border-indigo-100 rounded-xl p-4 space-y-3 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h5 className="font-extrabold text-[#1A237E] flex items-center space-x-2 text-sm">
                      <Sparkles size={16} className="text-amber-500" />
                      <span>Configuration des Mises à jour de l'Application (APK)</span>
                    </h5>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-mono text-[11px] font-bold">
                      Version installée : v{APP_VERSION}
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    Définissez la version en ligne (<code className="bg-slate-100 px-1 rounded">latest_version</code>) et le lien direct vers le fichier APK (<code className="bg-slate-100 px-1 rounded">apk_url</code>) dans Firestore (<code className="bg-slate-100 px-1 rounded">system/app_config</code>). Une notification pop-up s'affichera au démarrage pour tous les utilisateurs si la version en ligne est supérieure.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Dernière Version en Ligne (ex: 1.0.1 ou 1.1.0)
                      </label>
                      <input
                        type="text"
                        required
                        value={updateVersionInput}
                        onChange={(e) => setUpdateVersionInput(e.target.value)}
                        placeholder="Ex: 1.0.1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Lien de téléchargement direct de l'APK (apk_url)
                      </label>
                      <input
                        type="url"
                        value={updateApkUrlInput}
                        onChange={(e) => setUpdateApkUrlInput(e.target.value)}
                        placeholder="Ex: https://domaine.com/gma_v1.0.1.apk"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Message d'Annonce de la Mise à jour
                    </label>
                    <textarea
                      rows={2}
                      value={updateMessageInput}
                      onChange={(e) => setUpdateMessageInput(e.target.value)}
                      placeholder="Message à afficher dans la pop-up pour les utilisateurs..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingAppConfig}
                    className="w-full py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-colors flex items-center justify-center space-x-2"
                  >
                    {isSavingAppConfig ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Enregistrement en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} className="text-amber-300" />
                        <span>Publier la Mise à jour en Ligne (Firestore & Local)</span>
                      </>
                    )}
                  </button>
                </form>

                {/* GESTION ET REGISTRE DU LOGO OFFICIEL (FIREBASE) */}
                <div className="bg-white border-2 border-amber-200 rounded-xl p-4 space-y-4 text-xs shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h5 className="font-extrabold text-[#1A237E] flex items-center space-x-2 text-sm">
                      <Sparkles size={16} className="text-amber-600" />
                      <span>Logo Officiel de l'Application (Firebase)</span>
                    </h5>
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full font-bold text-[10px] border border-amber-200">
                      Cloud Sync Active
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Le logo ci-dessous est enregistré et synchronisé directement dans la base de données Firebase Firestore (<code className="bg-slate-100 px-1 rounded">system/app_config.logoUrl</code>). Vous pouvez charger une nouvelle image de logo depuis votre appareil pour remplacer le visuel de l'application partout sur tous les téléphones et navigateurs.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="relative shrink-0">
                      <AppLogo
                        customUrl={logoPreview}
                        className="w-20 h-20 rounded-2xl border-2 border-amber-400 shadow-md"
                        alt="Logo de l'application Génie Mentor Académie"
                      />
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <h6 className="font-extrabold text-slate-800 text-xs">Changer / Téléverser un nouveau Logo</h6>
                      <p className="text-[11px] text-slate-500">Formats acceptés : PNG, JPG, WEBP. Taille conseillée : carrée ou rectangulaire (ex: 512x512px).</p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <label className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-700 rounded-xl cursor-pointer text-xs transition-colors flex items-center space-x-1.5 shadow-2xs">
                          <Upload size={14} className="text-indigo-700" />
                          <span>Sélectionner une image...</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const result = reader.result as string;
                                  setLogoPreview(result);
                                  setIsSavingLogo(true);
                                  try {
                                    await saveCustomLogoToFirebase(result);
                                    setSuccessMsg("✅ Logo de l'application enregistré et publié avec succès dans Firebase !");
                                    setTimeout(() => setSuccessMsg(""), 4000);
                                  } catch (err) {
                                    console.error("Error saving logo:", err);
                                  } finally {
                                    setIsSavingLogo(false);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          disabled={isSavingLogo}
                          onClick={async () => {
                            setIsSavingLogo(true);
                            try {
                              await saveCustomLogoToFirebase(logoPreview);
                              setSuccessMsg("✅ Logo actuel synchronisé et enregistré dans Firebase (system/app_config) !");
                              setTimeout(() => setSuccessMsg(""), 4000);
                            } catch (err) {
                              console.error("Error syncing logo:", err);
                            } finally {
                              setIsSavingLogo(false);
                            }
                          }}
                          className="px-3 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold rounded-xl cursor-pointer text-xs transition-colors shadow-xs flex items-center space-x-1.5"
                        >
                          {isSavingLogo ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Sauvegarde...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} className="text-amber-300" />
                              <span>Enregistrer mon logo dans Firebase</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SIGNATURE OFFICIELLE DES FACTURES & REÇUS */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileCheck size={18} className="text-amber-500" />
                    <div>
                      <h5 className="font-extrabold text-slate-900 text-xs">
                        Signature Officielle des Factures & Reçus
                      </h5>
                      <p className="text-[10px] text-slate-500">
                        Cette signature administrative est automatiquement apposée au bas des reçus de paiement élèves (format PNG avec fond transparent conseillé).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="p-2 bg-white rounded-xl border border-amber-400/40 shadow-xs flex items-center justify-center shrink-0 w-36 h-20">
                      <img
                        src={signaturePreview}
                        alt="Signature Preview"
                        className="max-h-16 max-w-[120px] object-contain"
                      />
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <h6 className="font-extrabold text-slate-800 text-xs">Modifier la Signature Administrative</h6>
                      <p className="text-[11px] text-slate-500">
                        Sélectionnez un fichier image pour authentifier les reçus téléchargeables par les parents et élèves.
                      </p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <label className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-700 rounded-xl cursor-pointer text-xs transition-colors flex items-center space-x-1.5 shadow-2xs">
                          <Upload size={14} className="text-amber-600" />
                          <span>{isSavingSignature ? "Enregistrement..." : "Choisir une signature (Image)..."}</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const result = reader.result as string;
                                  setSignaturePreview(result);
                                  setOfficialSignature(result);
                                  setIsSavingSignature(true);
                                  try {
                                    await saveCustomSignatureToRemote(result);
                                    setSuccessMsg("✅ Signature officielle enregistrée et synchronisée avec succès !");
                                    setTimeout(() => setSuccessMsg(""), 4000);
                                  } catch (err) {
                                    console.error("Error saving signature:", err);
                                  } finally {
                                    setIsSavingSignature(false);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("Rétablir la signature officielle par défaut ?")) {
                              const defaultSig = "/app-signature.png";
                              setSignaturePreview(defaultSig);
                              setOfficialSignature(defaultSig);
                              await saveCustomSignatureToRemote(defaultSig);
                              setSuccessMsg("Signature officielle rétablie par défaut.");
                              setTimeout(() => setSuccessMsg(""), 3000);
                            }
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                        >
                          Rétablir par défaut
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MIGRATION & SYNCHRONISATION SUPABASE (POSTGRESQL) */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <Database size={16} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">
                          Migration & Synchronisation Supabase (PostgreSQL)
                        </h4>
                        <p className="text-[10px] text-emerald-800 font-medium">
                          Dual-write actif. Vous pouvez synchroniser toutes les données existantes en 1 clic.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">
                        État de la base Supabase : <span className="text-emerald-600 font-extrabold">Connectée & Prête</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Migrer tous les élèves ({roomRepo.getAllStudents().length}), cours ({roomRepo.getAllCourses().length}), QCM ({roomRepo.getAllQuizzes().length}) et devoirs vers PostgreSQL.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSyncingSupabase}
                      onClick={async () => {
                        setIsSyncingSupabase(true);
                        setSupabaseSyncResult(null);
                        try {
                          const res = await syncAllExistingDataToSupabase({
                            students: roomRepo.getAllStudents(),
                            courses: roomRepo.getAllCourses(),
                            quizzes: roomRepo.getAllQuizzes(),
                            homeworks: roomRepo.getAllHomeworks(),
                            vipRequests: roomRepo.getAllVIPPaymentRequests(),
                            classRequests: roomRepo.getAllClassChangeRequests(),
                          });
                          if (res.success) {
                            setSupabaseSyncResult(`✅ ${res.count} enregistrements migrés vers Supabase avec succès !`);
                          } else {
                            setSupabaseSyncResult("⚠️ Migration partielle ou erreur réseau.");
                          }
                        } catch (err: any) {
                          setSupabaseSyncResult("❌ Erreur lors de la synchronisation : " + (err?.message || err));
                        } finally {
                          setIsSyncingSupabase(false);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl cursor-pointer text-xs transition-colors shadow-xs flex items-center space-x-1.5 whitespace-nowrap shrink-0"
                    >
                      {isSyncingSupabase ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Migration en cours...</span>
                        </>
                      ) : (
                        <>
                          <Database size={14} />
                          <span>Lancer la Migration vers Supabase</span>
                        </>
                      )}
                    </button>
                  </div>

                  {supabaseSyncResult && (
                    <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs">
                      {supabaseSyncResult}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB PAIEMENTS: VALIDATIONS PAIEMENTS (MANUAL VALIDATION SYSTEM) */}
            {activeFormTab === "payments" && (() => {
              const pendingTx = transactions.filter((t) => t.status === "pending");
              const approvedTx = transactions.filter((t) => t.status === "approved");
              const rejectedTx = transactions.filter((t) => t.status === "rejected");

              const totalValidatedAmount = approvedTx.reduce((acc, t) => acc + t.amount, 0);

              const handleValidate = (tx: PaymentTransaction, e?: React.MouseEvent) => {
                if (e) { e.preventDefault(); e.stopPropagation(); }
                const updatedTx = { ...tx, status: "approved" as const };
                roomRepo.updateTransactionStatus(tx.id, "approved");
                saveTransactionToFirebase(updatedTx).catch((err) => console.warn(err?.message || err));

                const notif = {
                  id: "notif_" + Date.now(),
                  userUid: tx.userUid,
                  title: "✅ Paiement Validé par l'Administration !",
                  message: `Félicitations ! Votre paiement de ${tx.amount.toLocaleString("fr-FR")} FCFA pour l'apprenant "${tx.learnerName}" (${tx.type === 'renforcement' ? 'Renforcement au centre' : 'Cours à domicile'}) a été validé avec succès par l'administration. Votre reçu numérique est prêt.`,
                  type: "payment_status" as const,
                  status: "unread" as const,
                  transactionId: tx.id,
                  createdAt: Date.now(),
                  dateFormatted: `Aujourd'hui, ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
                };
                saveNotificationToFirebase(notif).catch((err) => console.warn(err?.message || err));

                setTransactions(roomRepo.getAllTransactions());
                setSuccessMsg(`Paiement de ${tx.learnerName || tx.userName} (${tx.amount.toLocaleString("fr-FR")} FCFA) validé avec succès ! Notification envoyée à l'élève.`);
                setTimeout(() => setSuccessMsg(""), 4000);
              };

              const handleReject = (tx: PaymentTransaction, e?: React.MouseEvent) => {
                if (e) { e.preventDefault(); e.stopPropagation(); }
                const updatedTx = { ...tx, status: "rejected" as const };
                roomRepo.updateTransactionStatus(tx.id, "rejected");
                saveTransactionToFirebase(updatedTx).catch((err) => console.warn(err?.message || err));

                const notif = {
                  id: "notif_" + Date.now(),
                  userUid: tx.userUid,
                  title: "❌ Paiement Rejeté par l'Administration",
                  message: `Le paiement de ${tx.amount.toLocaleString("fr-FR")} FCFA pour l'apprenant "${tx.learnerName}" a été rejeté. Veuillez vérifier votre transfert vers le 78 376 95 84.`,
                  type: "payment_status" as const,
                  status: "unread" as const,
                  transactionId: tx.id,
                  createdAt: Date.now(),
                  dateFormatted: `Aujourd'hui, ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
                };
                saveNotificationToFirebase(notif).catch((err) => console.warn(err?.message || err));

                setTransactions(roomRepo.getAllTransactions());
                setSuccessMsg(`Paiement de ${tx.learnerName || tx.userName} rejeté. L'élève a été notifié.`);
                setTimeout(() => setSuccessMsg(""), 4000);
              };

              const confirmDeleteTx = () => {
                if (!txToDelete) return;
                const wasApproved = txToDelete.status === "approved";
                const amount = txToDelete.amount;
                roomRepo.deleteTransaction(txToDelete.id, txToDelete.userUid);
                setTransactions(roomRepo.getAllTransactions());
                if (wasApproved) {
                  setSuccessMsg(`Transaction supprimée. Le montant de ${amount.toLocaleString("fr-FR")} FCFA a été retiré des recettes validées.`);
                } else {
                  setSuccessMsg("Transaction supprimée avec succès.");
                }
                setTxToDelete(null);
                setTimeout(() => setSuccessMsg(""), 4000);
              };

              const confirmResetRevenue = () => {
                roomRepo.resetValidatedRevenue();
                setTransactions(roomRepo.getAllTransactions());
                setSuccessMsg("Les recettes validées ont été réinitialisées à 0 FCFA avec succès !");
                setShowResetRevenueConfirm(false);
                setTimeout(() => setSuccessMsg(""), 4000);
              };

              return (
                <div className="space-y-4 text-xs animate-in fade-in">
                  {/* Top Summary Banner */}
                  <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-amber-950 rounded-2xl p-4 text-white shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">Validation Manuelle des Paiements</h4>
                          <p className="text-[11px] text-indigo-200">
                            Transferts Wave & Orange Money vers le <strong>78 376 95 84</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {pendingTx.length > 0 && (
                          <span className="px-3 py-1 bg-amber-400 text-amber-950 text-xs font-black rounded-full shadow animate-pulse">
                            {pendingTx.length} en attente
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowResetRevenueConfirm(true)}
                          className="px-2.5 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-[11px] rounded-xl border border-rose-400 flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                          title="Remettre les recettes validées à 0 FCFA"
                        >
                          <RefreshCw size={12} />
                          <span>Remettre à 0 FCFA</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center text-[11px]">
                      <div className="bg-white/10 p-2 rounded-xl">
                        <p className="text-amber-300 font-bold">En Attente</p>
                        <p className="font-black text-sm text-white">{pendingTx.length}</p>
                      </div>
                      <div className="bg-white/10 p-2 rounded-xl">
                        <p className="text-emerald-300 font-bold">Validés</p>
                        <p className="font-black text-sm text-emerald-300">{approvedTx.length}</p>
                      </div>
                      <div className="bg-white/10 p-2 rounded-xl">
                        <p className="text-indigo-200 font-bold">Recettes Validées</p>
                        <p className="font-black text-sm text-amber-300">{totalValidatedAmount.toLocaleString("fr-FR")} FCFA</p>
                      </div>
                    </div>
                  </div>

                  {/* Protection Info Note */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center space-x-2 text-[11px] text-amber-900 font-semibold">
                    <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                    <span>
                      <strong>Protection Administrateur :</strong> Si vous supprimez une transaction, son montant est automatiquement déduit du total des recettes validées.
                    </span>
                  </div>

                  {/* Sub-Category Switcher: Domicile/Renforcement vs Pass VIP */}
                  <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPaymentCategory("domicile")}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                        paymentCategory !== "vip"
                          ? "bg-[#1A237E] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <CreditCard size={14} />
                      <span>Cours à Domicile & Renforcement</span>
                      {pendingTx.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full">
                          {pendingTx.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentCategory("vip")}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                        paymentCategory === "vip"
                          ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                          : "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100"
                      }`}
                    >
                      <Sparkles size={14} className="text-amber-600" />
                      <span>Pass VIP Élite (Temps Réel)</span>
                      {vipRequests.filter(r => r.status === "PENDING").length > 0 && (
                        <span className="px-1.5 py-0.2 bg-rose-500 text-white font-black text-[10px] rounded-full animate-pulse">
                          {vipRequests.filter(r => r.status === "PENDING").length}
                        </span>
                      )}
                    </button>
                  </div>

                  {paymentCategory === "vip" ? (
                    <div className="pt-2">
                      <AdminPaymentValidation />
                    </div>
                  ) : (
                    <>
                  {/* Pending Transactions Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                        <Clock size={16} className="text-amber-600 animate-spin" />
                        <span>Demandes en attente de vérification ({pendingTx.length})</span>
                      </h4>
                      <span className="text-[11px] text-slate-500 italic">
                        Numéro récepteur : <strong>78 376 95 84</strong>
                      </span>
                    </div>

                    {pendingTx.length === 0 ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-1">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                        <p className="font-extrabold text-emerald-950 text-xs">Toutes les transactions ont été traitées !</p>
                        <p className="text-[11px] text-emerald-800">Aucun paiement Wave ou OM en attente de validation.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingTx.map((tx) => (
                          <div
                            key={tx.id}
                            className="bg-white border-2 border-amber-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all space-y-3 relative"
                          >
                            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="uppercase text-[10px] font-black bg-[#1A237E] text-white px-2 py-0.5 rounded-md">
                                    {tx.type === "renforcement" ? "Renforcement" : "Cours à Domicile"}
                                  </span>
                                  <span className="font-extrabold text-slate-900 text-sm">
                                    Apprenant : {tx.learnerName || tx.userName}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Niveau {tx.level} {tx.serie ? `(${tx.serie})` : ""} • Mensualité : <strong className="text-amber-900 font-bold">{tx.selectedMonth || "Actuelle"}</strong>
                                </p>
                              </div>

                              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-[11px] rounded-full border border-amber-300">
                                {tx.amount.toLocaleString("fr-FR")} FCFA
                              </span>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                              <div>
                                <span className="text-slate-500 block">Opérateur :</span>
                                <span className="font-extrabold uppercase text-amber-700">{tx.operator} Money</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Transfert envoyé au :</span>
                                <span className="font-bold text-slate-800">78 376 95 84</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Compte expéditeur :</span>
                                <span className="font-bold text-slate-800">{tx.userName}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Date de la demande :</span>
                                <span className="font-bold text-slate-800">{tx.dateFormatted}</span>
                              </div>
                              {tx.address && (
                                <div className="col-span-2">
                                  <span className="text-slate-500 block">Adresse Domicile :</span>
                                  <span className="font-bold text-slate-800">{tx.address}</span>
                                </div>
                              )}
                              {tx.tuteurName && (
                                <div className="col-span-2">
                                  <span className="text-slate-500 block">Tuteur Responsable :</span>
                                  <span className="font-bold text-slate-800">{tx.tuteurName}</span>
                                </div>
                              )}
                            </div>

                            {/* Validation Action Buttons */}
                            <div className="flex space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleValidate(tx)}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                              >
                                <CheckCircle2 size={16} />
                                <span>Valider (Notifier)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReject(tx)}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                              >
                                <XCircle size={16} />
                                <span>Rejeter</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setTxToDelete(tx);
                                }}
                                className="px-3 py-2.5 bg-slate-100 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-rose-300 cursor-pointer flex items-center space-x-1 transition-colors"
                                title="Supprimer définitivement la transaction"
                              >
                                <Trash2 size={15} />
                              </button>

                              {onOpenReceipt && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReceipt(tx)}
                                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer flex items-center space-x-1"
                                  title="Voir le reçu numérique"
                                >
                                  <FileText size={15} />
                                  <span>Reçu</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* History of Validated and Rejected Transactions */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Historique des Décisions Récentes :
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        Supprimer retire le montant des recettes
                      </span>
                    </div>

                    {approvedTx.length === 0 && rejectedTx.length === 0 ? (
                      <p className="text-slate-400 text-[11px] italic">Aucun historique de décision.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {[...approvedTx, ...rejectedTx].map((tx) => (
                          <div
                            key={tx.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900">{tx.learnerName || tx.userName}</span>
                                <span className="text-[10px] text-slate-500">({tx.level} - {tx.selectedMonth || "Mensualité"})</span>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                {tx.operator.toUpperCase()} • {tx.amount.toLocaleString("fr-FR")} FCFA • {tx.dateFormatted}
                              </p>
                            </div>

                            <div className="flex items-center space-x-2">
                              {tx.status === "approved" ? (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full border border-emerald-300">
                                  Validé
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full border border-rose-300">
                                  Rejeté
                                </span>
                              )}

                              {onOpenReceipt && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReceipt(tx)}
                                  className="p-1.5 text-[#1A237E] hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                                  title="Voir Reçu"
                                >
                                  <FileText size={15} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setTxToDelete(tx);
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer la transaction (Soustrait le montant des recettes)"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Overlay: Delete Transaction Confirmation */}
                  {txToDelete && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center animate-in zoom-in-95 border border-slate-200">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full mx-auto flex items-center justify-center font-bold">
                          <Trash2 size={24} />
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">Supprimer la transaction ?</h4>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            Voulez-vous vraiment supprimer la transaction de <strong>{txToDelete.learnerName || txToDelete.userName}</strong> ({txToDelete.amount.toLocaleString("fr-FR")} FCFA) ?
                            {txToDelete.status === "approved" && (
                              <span className="block mt-1 font-bold text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                                ⚠️ Le montant de {txToDelete.amount.toLocaleString("fr-FR")} FCFA sera immédiatement déduit du total des recettes validées.
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setTxToDelete(null)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={confirmDeleteTx}
                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow cursor-pointer transition-colors"
                          >
                            Confirmer & Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modal Overlay: Reset Revenue Confirmation */}
                  {showResetRevenueConfirm && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center animate-in zoom-in-95 border border-slate-200">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full mx-auto flex items-center justify-center font-bold">
                          <RefreshCw size={24} />
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">Remettre les Recettes à 0 FCFA ?</h4>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            Êtes-vous sûr de vouloir réinitialiser le total des recettes validées à 0 FCFA ?
                            <span className="block mt-1 font-bold text-slate-800 bg-slate-100 p-2 rounded-xl border border-slate-200">
                              Cette action réinitialisera toutes les transactions validées pour repartir sur une comptabilité à zéro.
                            </span>
                          </p>
                        </div>

                        <div className="flex space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowResetRevenueConfirm(false)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={confirmResetRevenue}
                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow cursor-pointer transition-colors"
                          >
                            Confirmer & Remettre à 0
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                  )}
                </div>
              );
            })()}

            {/* TAB NOTIFICATIONS & MESSAGES ADMINISTRATEUR */}
            {activeFormTab === "notifications" && (() => {
              const allStudents = roomRepo.getAllStudents();

              const handleSendBroadcast = (e: React.FormEvent) => {
                e.preventDefault();
                if (!adminNotifMsg.trim()) return;

                roomRepo.sendAdminMessage(adminNotifTarget, adminNotifTitle, adminNotifMsg);
                setSuccessMsg("Message administrateur envoyé avec succès !");
                setAdminNotifMsg("");
                setTimeout(() => setSuccessMsg(""), 4000);
              };

              const handleDeleteNotif = (notifId: string) => {
                if (window.confirm("Êtes-vous sûr de vouloir supprimer cette notification ? Cette action est réservée à l'administrateur.")) {
                  const targetNotif = allNotifs.find((n) => n.id === notifId);
                  roomRepo.deleteNotification(notifId, targetNotif?.userUid);
                  setAllNotifs(roomRepo.getAllNotifications());
                  setSuccessMsg("Notification supprimée de la base de données.");
                  setTimeout(() => setSuccessMsg(""), 3000);
                }
              };

              const handleClearAllNotifs = () => {
                if (window.confirm("Attention : Voulez-vous supprimer TOUTES les notifications système ?")) {
                  allNotifs.forEach((n) => {
                    roomRepo.deleteNotification(n.id, n.userUid);
                  });
                  roomRepo.clearAllNotifications();
                  setAllNotifs(roomRepo.getAllNotifications());
                  setSuccessMsg("Toutes les notifications ont été supprimées.");
                  setTimeout(() => setSuccessMsg(""), 3000);
                }
              };

              return (
                <div className="space-y-5 text-xs animate-in fade-in">
                  {/* Top Header */}
                  <div className="bg-gradient-to-r from-[#1A237E] to-indigo-900 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black">
                        <Bell size={20} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white">Gestionnaire des Notifications Administrateur</h4>
                        <p className="text-[11px] text-indigo-200">
                          Envoyez des messages dédiés et supprimez les notifications obsolètes.
                        </p>
                      </div>
                    </div>
                    {allNotifs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllNotifs}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center space-x-1 cursor-pointer transition-colors shadow"
                      >
                        <Trash2 size={14} />
                        <span>Tout effacer</span>
                      </button>
                    )}
                  </div>

                  {/* Form: Send Dedicated Admin Notification */}
                  <form onSubmit={handleSendBroadcast} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                      <Send size={16} className="text-[#1A237E]" />
                      <span>Envoyer une Notification / Message Dédié</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Destinataire</label>
                        <select
                          value={adminNotifTarget}
                          onChange={(e) => setAdminNotifTarget(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                        >
                          <option value="all">📢 Tous les élèves (Diffusion Générale)</option>
                          {allStudents.map((std) => (
                            <option key={std.uid} value={std.uid}>
                              👤 {std.displayName} ({std.level})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Titre du Message</label>
                        <input
                          type="text"
                          required
                          value={adminNotifTitle}
                          onChange={(e) => setAdminNotifTitle(e.target.value)}
                          placeholder="Ex: Rappel de cours / Info importante..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contenu du Message Administrateur</label>
                      <textarea
                        required
                        rows={3}
                        value={adminNotifMsg}
                        onChange={(e) => setAdminNotifMsg(e.target.value)}
                        placeholder="Rédigez votre message dédié aux élèves ou à un élève spécifique..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 resize-none font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-colors flex items-center justify-center space-x-2"
                    >
                      <Send size={16} />
                      <span>Envoyer la Notification aux Élèves</span>
                    </button>
                  </form>

                  {/* List & Deletion of Existing Notifications */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                        Toutes les Notifications Système ({allNotifs.length}) :
                      </h4>
                      <span className="text-[11px] text-slate-400 italic">
                        Réservé exclusivement à l'administrateur
                      </span>
                    </div>

                    {allNotifs.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
                        <Bell size={28} className="mx-auto mb-1 text-slate-400" />
                        <p className="font-bold">Aucune notification enregistrée.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {Array.from(new Map<string, UserNotification>(allNotifs.map((n, i) => [n.id || `notif_${i}`, n])).values()).map((notif, idx) => (
                          <div
                            key={`${notif.id}_${idx}`}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between shadow-xs hover:border-indigo-300 transition-colors"
                          >
                            <div className="space-y-1 flex-1 pr-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-slate-900">{notif.title}</span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                                  {notif.dateFormatted}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed">{notif.message}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteNotif(notif.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer shrink-0 border border-rose-200"
                              title="Supprimer la notification (Administrateur)"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB 0: ÉLÈVES & SUIVI DES RÉSULTATS */}
            {activeFormTab === "students" && (() => {
              const allStudents = roomRepo.getAllStudents();
              const nowTime = Date.now();
              const onlineCount = allStudents.filter((s) => Boolean(s.lastSeen && nowTime - Number(s.lastSeen) < 5 * 60 * 1000)).length;

              const filteredStudents = allStudents.filter((std) => {
                const matchesSearch =
                  (std.displayName || "").toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                  (std.email || "").toLowerCase().includes(studentSearchQuery.toLowerCase());
                const matchesLevel =
                  studentLevelFilter === "Tous" ||
                  std.classe === studentLevelFilter ||
                  std.level === studentLevelFilter ||
                  (Boolean(std.classe) && std.classe?.trim().toLowerCase() === studentLevelFilter.trim().toLowerCase()) ||
                  (Boolean(std.level) && std.level?.trim().toLowerCase() === studentLevelFilter.trim().toLowerCase());
                const matchesSubTab =
                  studentSubTab === "online" ? std.status === "En ligne" : true;
                return matchesSearch && matchesLevel && matchesSubTab;
              });

              // Calculate overall platform average
              let totalScores20: number[] = [];
              allStudents.forEach((s) => {
                if (s.quizResults) {
                  s.quizResults.forEach((q) => totalScores20.push(q.score20));
                }
              });
              const platformAvg =
                totalScores20.length > 0
                  ? (totalScores20.reduce((a, b) => a + b, 0) / totalScores20.length).toFixed(1)
                  : "N/A";

              const handleDeleteStudentConfirm = () => {
                if (!studentToDelete) return;
                roomRepo.deleteStudent(studentToDelete.uid);
                setStudentToDelete(null);
                setSuccessMsg("Élève et toutes ses données supprimés avec succès par l'administrateur.");
                setTimeout(() => setSuccessMsg(""), 3500);
              };

              const handleDeleteQuizResultItem = (studentUid: string, timestamp: number, quizTitle: string) => {
                if (window.confirm(`Supprimer la note de QCM "${quizTitle}" pour cet élève ?`)) {
                  roomRepo.deleteStudentQuizResult(studentUid, timestamp);
                  setSuccessMsg("Note de QCM supprimée par l'administrateur.");
                  setTimeout(() => setSuccessMsg(""), 3000);
                }
              };

              return (
                <div className="space-y-4 text-xs">
                  {/* Top Summary Banner */}
                  <div className="bg-gradient-to-r from-[#1A237E] to-indigo-900 rounded-2xl p-4 text-white shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="text-amber-300" size={20} />
                        <div>
                          <h4 className="font-extrabold text-sm text-white">Suivi Pédagogique des Élèves</h4>
                          <p className="text-[11px] text-indigo-200">
                            Interface d'administration — Gestion complète et suivi en temps réel
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white/10 rounded-xl text-[11px] font-mono font-bold text-amber-300 border border-white/20">
                        {allStudents.length} Élève(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center text-[11px]">
                      <div className="bg-white/10 p-2 rounded-xl">
                        <p className="text-indigo-200 font-medium">Inscrits</p>
                        <p className="font-black text-sm text-white">{allStudents.length}</p>
                      </div>
                      <div className="bg-white/10 p-2 rounded-xl">
                        <p className="text-emerald-300 font-medium">En ligne</p>
                        <p className="font-black text-sm text-emerald-300">{onlineCount}</p>
                      </div>
                      <div className="bg-white/10 p-2 rounded-xl">
                        <p className="text-amber-300 font-medium">Moyenne Globale</p>
                        <p className="font-black text-sm text-amber-300">{platformAvg} / 20</p>
                      </div>
                    </div>
                  </div>

                  {/* Purge Demo Accounts Button for Admin */}
                  <div className="flex flex-col sm:flex-row items-center justify-between bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-3 gap-2">
                    <div className="space-y-0.5 text-left w-full sm:w-auto">
                      <span className="font-black text-rose-900 dark:text-rose-200 text-xs block flex items-center space-x-1.5">
                        <Trash2 size={13} className="text-rose-600" />
                        <span>Purger Tous les Utilisateurs Démo</span>
                      </span>
                      <span className="text-[11px] text-rose-700 dark:text-rose-300 block">
                        Nettoie la base de données Room et Firestore. Conserve uniquement votre compte Administrateur officiel.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Confirmer la suppression définitive de TOUS les utilisateurs démo / tests de l'application et de Firebase pour ne conserver QUE l'administrateur officiel ?")) {
                          const count = roomRepo.purgeAllNonAdminStudents();
                          setSuccessMsg(`Purge effectuée : ${count} utilisateur(s) démo supprimé(s). Seul l'administrateur est conservé.`);
                          setTimeout(() => setSuccessMsg(""), 4000);
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Purger les Démo</span>
                    </button>
                  </div>

                  {/* Dual Interface Navigation Buttons: Inscrit vs En Ligne */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setStudentSubTab("inscrits")}
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        studentSubTab === "inscrits"
                          ? "bg-white text-[#1A237E] shadow-sm border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Users size={16} className={studentSubTab === "inscrits" ? "text-[#1A237E]" : "text-slate-400"} />
                      <span>Inscrits ({allStudents.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentSubTab("online")}
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        studentSubTab === "online"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span>En Ligne ({onlineCount})</span>
                    </button>
                  </div>

                  {/* Search and Level Filters */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom d'élève ou adresse email..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-slate-800 text-xs font-medium focus:outline-hidden focus:border-[#1A237E]"
                      />
                    </div>

                    {/* Level Filter Pills */}
                    <div className="flex items-center space-x-1 overflow-x-auto pb-1 no-scrollbar">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 pr-1">
                        Filtrer par classe :
                      </span>
                      {(["Tous", ...ALL_LEVELS] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setStudentLevelFilter(lvl as SecondaryLevel | "Tous")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 transition-all cursor-pointer ${
                            studentLevelFilter === lvl
                              ? "bg-[#1A237E] text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Cards List */}
                  {filteredStudents.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-500 space-y-1">
                      <Users size={28} className="mx-auto text-slate-400" />
                      <p className="font-bold">
                        {studentSubTab === "online" ? "Aucun élève actuellement en ligne" : "Aucun élève trouvé"}
                      </p>
                      <p className="text-[11px]">Essayez de modifier votre recherche ou la sous-interface sélectionnée.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredStudents.map((std) => {
                        const isExpanded = expandedStudentUid === std.uid;
                        const results = std.quizResults || [];
                        const hasResults = results.length > 0;

                        // Calculate student average
                        const sum20 = results.reduce((acc, r) => acc + r.score20, 0);
                        const avg20 = hasResults ? (sum20 / results.length).toFixed(1) : null;
                        const numericAvg = avg20 ? parseFloat(avg20) : 0;

                        return (
                          <div
                            key={std.uid}
                            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-indigo-200 transition-all space-y-3 relative group"
                          >
                            {/* Student Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-[#1A237E] font-black text-sm flex items-center justify-center shadow-xs border border-indigo-200">
                                  {std.displayName.slice(0, 2).toUpperCase()}
                                </div>

                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h5 className="font-bold text-slate-900 text-sm">{std.displayName}</h5>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-[#1A237E] font-extrabold text-[10px] rounded-md border border-indigo-100">
                                      {std.level}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500">{std.email}</p>
                                </div>
                              </div>

                              {/* Status, Average Badge & Delete Student Button */}
                              <div className="flex items-start space-x-2">
                                <div className="text-right space-y-1">
                                  <span
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      std.status === "En ligne"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-slate-100 text-slate-600 border border-slate-200"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        std.status === "En ligne" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                      }`}
                                    ></span>
                                    <span>{std.status}</span>
                                  </span>

                                  <div>
                                    {avg20 ? (
                                      <span
                                        className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                                          numericAvg >= 14
                                            ? "bg-emerald-100 text-emerald-800"
                                            : numericAvg >= 10
                                            ? "bg-indigo-100 text-[#1A237E]"
                                            : "bg-rose-100 text-rose-800"
                                        }`}
                                      >
                                        Moyenne : {avg20} / 20
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                        Aucun QCM
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setStudentToDelete(std)}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors border border-rose-200 cursor-pointer"
                                  title="Supprimer cet élève de la plateforme (Admin)"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Connection detail & Accordion toggle */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <div className="flex items-center space-x-1 text-slate-500">
                                <Clock size={13} />
                                <span>Dernière connexion : {std.lastLogin || "Récemment"}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStudentUid(isExpanded ? null : std.uid)
                                }
                                className="text-[#1A237E] font-bold hover:underline flex items-center space-x-1 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100"
                              >
                                <span>
                                  {isExpanded ? "Fermer la fiche détaillée" : "Voir fiche complète & Devoirs/Quiz"}
                                </span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>

                            {/* Accordion Content: Comprehensive Student Profile, Homeworks & Quiz History */}
                            {isExpanded && (() => {
                              const studentHomeworks = roomRepo.getHomeworksByUser(std.uid);
                              const isVip = roomRepo.isVipUser(std.uid);

                              return (
                                <div className="pt-3 space-y-4 animate-in fade-in duration-200 border-t border-slate-200">
                                  {/* Student Summary Info Grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
                                    <div>
                                      <span className="text-slate-500 block">Classe & Niveau :</span>
                                      <span className="font-extrabold text-[#1A237E]">{std.level}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Méthode Inscription :</span>
                                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                                        std.authProvider === "google" 
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-indigo-50 text-[#1A237E] border border-indigo-200"
                                      }`}>
                                        <span>{std.authProvider === "google" ? "🔴 Google Auth" : "📧 Inscription Directe"}</span>
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Statut Connexion :</span>
                                      <span className={`font-extrabold ${std.status === "En ligne" ? "text-emerald-600" : "text-slate-600"}`}>
                                        ● {std.status}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Abonnement VIP :</span>
                                      <span className={`font-extrabold ${isVip ? "text-amber-700" : "text-slate-600"}`}>
                                        {isVip ? `⭐ Actif (${std.vipPlan || "Pass VIP"})` : "Standard (Non-VIP)"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Identifiant / UID :</span>
                                      <span className="font-mono text-[10px] text-slate-600 truncate block select-all font-bold" title={std.uid}>
                                        {std.uid}
                                      </span>
                                    </div>
                                  </div>

                                  {/* VIP PASS CONTROLS BY ADMIN */}
                                  <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-3 space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <Sparkles size={16} className="text-amber-600" />
                                        <span className="font-black text-[#1A237E]">Gestion du Statut VIP Élève (Administration) :</span>
                                      </div>
                                      <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border ${
                                        isVip 
                                          ? "bg-amber-100 text-amber-900 border-amber-300" 
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}>
                                        {isVip ? "👑 VIP ACTIF" : "NON VIP"}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      {isVip ? (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (window.confirm(`Désactiver le Pass VIP pour ${std.displayName} ?`)) {
                                              await setUserVIPStatusFirebase(std.uid, false);
                                              setSuccessMsg(`Pass VIP désactivé pour ${std.displayName}.`);
                                              setTimeout(() => setSuccessMsg(""), 3000);
                                            }
                                          }}
                                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors shadow-2xs"
                                        >
                                          Désactiver le Pass VIP
                                        </button>
                                      ) : (
                                        <>
                                          <span className="text-[11px] font-bold text-slate-600">Activer le Pass :</span>
                                          {VIP_PLANS.map((plan) => (
                                            <button
                                              key={plan.id}
                                              type="button"
                                              onClick={async () => {
                                                const expiresAt = computeExpirationTimestamp(plan.id);
                                                await setUserVIPStatusFirebase(std.uid, true, plan.durationLabel, expiresAt);
                                                setSuccessMsg(`⭐ Pass VIP (${plan.durationLabel}) activé avec succès pour ${std.displayName} !`);
                                                setTimeout(() => setSuccessMsg(""), 3500);
                                              }}
                                              className="px-2.5 py-1.5 bg-[#1A237E] hover:bg-indigo-900 text-amber-300 font-extrabold text-[11px] rounded-xl cursor-pointer transition-colors shadow-2xs border border-amber-400/40"
                                            >
                                              {plan.durationLabel} ({plan.priceFCFA.toLocaleString("fr-FR")} F)
                                            </button>
                                          ))}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* SECTION DEVOIRS ET TD RENDUS */}
                                  <div className="space-y-2 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-1.5">
                                        <FileCheck size={16} className="text-[#1A237E]" />
                                        <h6 className="font-extrabold text-[#1A237E] text-xs uppercase tracking-wide">
                                          Devoirs et TD Rendus ({studentHomeworks.length})
                                        </h6>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setActiveFormTab("homework")}
                                        className="text-[10px] text-indigo-700 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                                      >
                                        <span>Gérer / Corriger dans l'espace Devoirs</span>
                                        <span>➔</span>
                                      </button>
                                    </div>

                                    {studentHomeworks.length === 0 ? (
                                      <div className="bg-white rounded-xl p-3 text-center text-slate-500 text-[11px] border border-dashed border-slate-200">
                                        Aucun devoir ou TD rendu par cet élève pour le moment.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {studentHomeworks.map((hw) => (
                                          <div
                                            key={hw.id}
                                            className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs"
                                          >
                                            <div className="flex items-start justify-between">
                                              <div>
                                                <div className="flex items-center space-x-2">
                                                  <span className="px-2 py-0.5 bg-[#1A237E] text-white font-black text-[10px] rounded">
                                                    {hw.subject}
                                                  </span>
                                                  <span className="font-extrabold text-slate-900 text-xs">
                                                    {hw.title}
                                                  </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                  Rendu le {hw.dateFormatted} • Fichier : <strong>{hw.fileName}</strong> ({hw.fileSize || "PDF"})
                                                </p>
                                              </div>

                                              <div>
                                                {hw.status === "graded" ? (
                                                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-black text-[11px] rounded-lg border border-emerald-300">
                                                    Note : {hw.grade20 ?? "--"} / 20
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-1 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-lg border border-amber-300">
                                                    En attente de correction
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {hw.feedback && (
                                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                                                <span className="font-bold text-slate-700 block">Correction Massaw Seck :</span>
                                                <p className="text-slate-800 italic">"{hw.feedback}"</p>
                                              </div>
                                            )}

                                            <div className="flex items-center justify-between pt-1">
                                              <a
                                                href={hw.fileData}
                                                download={hw.fileName}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#1A237E] font-bold text-[10px] rounded-lg border border-indigo-200 flex items-center space-x-1 transition-colors"
                                              >
                                                <Download size={12} />
                                                <span>Télécharger le devoir ({hw.fileType.toUpperCase()})</span>
                                              </a>

                                              <button
                                                type="button"
                                                onClick={() => setActiveFormTab("homework")}
                                                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] rounded-lg shadow-xs transition-colors cursor-pointer"
                                              >
                                                {hw.status === "graded" ? "Modifier la note" : "Corriger ce devoir"}
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* SECTION RELEVÉ DES NOTES QCM */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                                        Relevé des Évaluations Quiz / QCM ({results.length}) :
                                      </p>
                                      <span className="text-[10px] text-slate-400">Administration : Suppression de note possible</span>
                                    </div>

                                    {!hasResults ? (
                                      <div className="bg-slate-50 rounded-xl p-3 text-center text-slate-500 text-[11px]">
                                        Cet élève n'a pas encore validé d'évaluation QCM.
                                      </div>
                                    ) : (
                                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {results.map((res) => (
                                          <div
                                            key={res.id || res.timestamp}
                                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between"
                                          >
                                            <div className="space-y-0.5">
                                              <div className="flex items-center space-x-2">
                                                <span className="px-2 py-0.5 bg-indigo-100 text-[#1A237E] font-bold text-[10px] rounded">
                                                  {res.subject}
                                                </span>
                                                <span className="font-bold text-slate-800 text-xs">
                                                  {res.quizTitle}
                                                </span>
                                              </div>
                                              <p className="text-[10px] text-slate-500">
                                                Effectué le {res.date} • {res.correctAnswers}/{res.totalQuestions} réponses correctes
                                              </p>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                              <div className="text-right">
                                                <p className="font-black text-sm text-[#1A237E]">
                                                  {res.score20} / 20
                                                </p>
                                                <p className="text-[10px] font-bold text-emerald-700">
                                                  {res.scorePercentage}%
                                                </p>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={() => handleDeleteQuizResultItem(std.uid, res.timestamp, res.quizTitle)}
                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                                                title="Supprimer ce résultat de Quiz (Admin)"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Confirmation Modal overlay for deleting a student */}
                  {studentToDelete && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto font-black">
                          <Trash2 size={24} />
                        </div>

                        <div className="text-center space-y-1">
                          <h4 className="font-extrabold text-slate-900 text-base">
                            Supprimer définitivement l'élève ?
                          </h4>
                          <p className="text-xs text-slate-600">
                            Êtes-vous sûr de vouloir supprimer l'élève <strong>{studentToDelete.displayName}</strong> ({studentToDelete.email}) ?
                          </p>
                          <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-100 mt-2">
                            ⚠️ Cette action effacera également son historique complet de Quiz et ses données de progression.
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(null)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteStudentConfirm}
                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-colors"
                          >
                            Confirmer la Suppression
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Course Form */}
            {activeFormTab === "course" && (
              <form onSubmit={handleCreateCourse} className="space-y-3.5 text-xs">
                {/* Info banner explaining pure written text lesson */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex items-start space-x-3 text-indigo-950">
                  <BookOpen size={20} className="text-[#1A237E] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-left">
                    <p className="font-extrabold text-[#1A237E] text-xs">
                      Rédaction d'un Cours Textuel Rédigé (Article / Leçon) :
                    </p>
                    <p className="text-[11px] text-indigo-900/90 leading-relaxed">
                      Un cours sur <strong>Génie Mentor Académie</strong> est une leçon textuelle complète (titre, niveau, matière, chapitre, résumé et explications rédigées). Aucun fichier PDF/Vidéo n'est requis.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Classe / Niveau</label>
                    <select
                      value={cLevel}
                      onChange={(e) => {
                        const newLvl = e.target.value as SecondaryLevel;
                        setCLevel(newLvl);
                        const validSubs = getSubjectsForLevel(newLvl);
                        if (!validSubs.includes(cSubject)) {
                          setCSubject(validSubs[0]);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-[#1A237E]"
                    >
                      {ALL_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Matière</label>
                    <select
                      value={cSubject}
                      onChange={(e) => setCSubject(e.target.value as Subject)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-[#1A237E]"
                    >
                      {getSubjectsForLevel(cLevel).map((sb) => (
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
                    placeholder="Ex: Théorème de Pythagore et Réciproque"
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chapitre</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Chapitre 2 : Géométrie plane"
                    value={cChapter}
                    onChange={(e) => setCChapter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Résumé synthétique (Pour fiches rapides)</label>
                  <input
                    type="text"
                    placeholder="Brève synthèse des points clés à retenir..."
                    value={cSummary}
                    onChange={(e) => setCSummary(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Contenu détaillé de la leçon rédigée</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!cContent) {
                          setCContent(
                            "## 1. Définitions et Concept Général\nExplication détaillée des notions fondamentales...\n\n## 2. Propriétés et Formules Clés\n- Formule 1 : ...\n- Propriété principale : ...\n\n## 3. Exemple d'Application BFEM / BAC\nÉnoncé du problème et résolution étape par étape..."
                          );
                        }
                      }}
                      className="text-[10px] text-indigo-700 font-bold hover:underline flex items-center space-x-1"
                    >
                      <Sparkles size={12} />
                      <span>Insérer Trame Modèle</span>
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    required
                    placeholder="## 1. Introduction&#10;Définition de la notion...&#10;&#10;## 2. Propriétés et démonstrations..."
                    value={cContent}
                    onChange={(e) => setCContent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-xs leading-relaxed mb-2"
                  />
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Clavier WYSIWYG MathLive Visuel (Cliquez pour insérer) :
                    </span>
                    <MathLiveEditor
                      value=""
                      onChange={() => {}}
                      onInsertToContent={(snip) => setCContent((prev) => prev + (prev.endsWith("\n") || !prev ? "" : " ") + snip)}
                      placeholder="Composer ou insérer une formule visuelle..."
                    />
                  </div>
                </div>

                {/* File Attachment Section for Course (PDF, Videos, Images) */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-slate-700 block">
                    Joindre un support de cours (PDF, vidéo, image) [Optionnel] :
                  </label>

                  <input
                    type="file"
                    ref={courseFileInputRef}
                    onChange={handleCourseFileChange}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.webm,.avi,video/*,image/*,application/pdf"
                    className="hidden"
                  />

                  {!courseFile ? (
                    <button
                      type="button"
                      onClick={() => courseFileInputRef.current?.click()}
                      className="w-full py-3.5 px-4 bg-indigo-50/70 hover:bg-indigo-100/80 border-2 border-dashed border-indigo-200 hover:border-[#1A237E] rounded-2xl flex items-center justify-center space-x-3 transition-all cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white text-[#1A237E] shadow-xs flex items-center justify-center border border-indigo-100 flex-shrink-0">
                        <Paperclip size={18} />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-[#1A237E] text-xs block">
                          Joindre un fichier / vidéo explicative (jusqu'à 2 Go)
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Fichiers PDF, Vidéos MP4/WebM (jusqu'à 2 Go), Word ou Images
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                          <FileCheck size={18} />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {courseFile.name}
                          </p>
                          <p className="text-[10px] font-semibold text-emerald-800">
                            Fichier joint prêt à être lié au cours
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleClearCourseFile}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Retirer ce fichier"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <BookOpen size={16} />
                  <span>Publier la Leçon Rédigée (Room + Firestore)</span>
                </button>

                {/* All courses listing for Admin with Modify and Delete */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <BookOpen size={15} className="text-[#1A237E]" />
                      <span>Tous les Cours Rédigés ({roomRepo.getAllCourses().length})</span>
                    </h4>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Rechercher un cours..."
                        value={courseManagerSearch}
                        onChange={(e) => setCourseManagerSearch(e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs flex-1 sm:w-44"
                      />
                      <select
                        value={courseManagerLevel}
                        onChange={(e) => setCourseManagerLevel(e.target.value)}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#1A237E]"
                      >
                        <option value="Tous">Toutes classes</option>
                        {ALL_LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {roomRepo.getAllCourses()
                      .filter((c) => {
                        const matchesSearch = (c.title || "").toLowerCase().includes(courseManagerSearch.toLowerCase()) || (c.chapter || "").toLowerCase().includes(courseManagerSearch.toLowerCase());
                        const matchesLevel = courseManagerLevel === "Tous" || c.level === courseManagerLevel;
                        return matchesSearch && matchesLevel;
                      })
                      .map((c) => (
                        <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs hover:border-indigo-300 transition-colors">
                          <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-indigo-50 text-[#1A237E] font-bold text-[10px] rounded">
                                {c.level} • {c.subject}
                              </span>
                              <h5 className="font-bold text-slate-900 text-xs truncate">{c.title}</h5>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{c.chapter} - {c.summary}</p>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setAdminEditingCourse(c)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                              title="Modifier ce cours"
                            >
                              <Edit3 size={13} />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Supprimer définitivement le cours "${c.title}" de Room et Firestore ?`)) {
                                  roomRepo.deleteCourse(c.id);
                                  setSuccessMsg("Cours supprimé avec succès.");
                                  setTimeout(() => setSuccessMsg(""), 3000);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                              title="Supprimer ce cours"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </form>
            )}

            {/* Asset Form */}
            {activeFormTab === "asset" && (
              <form onSubmit={handleCreateAsset} className="space-y-3.5 text-xs">
                {/* Hidden native file selector */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  className="hidden"
                />

                {/* File Upload Zone / Button */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    Document / Fichier à sélectionner :
                  </label>

                  {!selectedFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 px-4 bg-indigo-50/80 hover:bg-indigo-100/90 border-2 border-dashed border-indigo-300 hover:border-[#1A237E] rounded-2xl flex flex-col items-center justify-center space-y-2 transition-all group cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-white text-[#1A237E] shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform border border-indigo-100">
                        <Upload size={22} />
                      </div>
                      <div className="text-center space-y-0.5">
                        <span className="font-extrabold text-[#1A237E] text-xs block">
                          Parcourir / Choisir un fichier
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          PDF, Word (.docx), ou Images (.png, .jpg)
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                          <FileCheck size={20} />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] font-semibold text-emerald-800 flex items-center space-x-2 mt-0.5">
                            <span>Taille réelle : <strong>{aSize}</strong></span>
                            <span>•</span>
                            <span className="uppercase text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-md font-bold">
                              {aType}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0 pl-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-[#1A237E] font-bold text-[11px] rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
                        >
                          Changer
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelectedFile}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Retirer le fichier"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom du fichier / sujet</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sujet BAC 2024 Mathématiques S2"
                    value={aName}
                    onChange={(e) => setAName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Classe / Niveau (Destination)</label>
                    <select
                      value={aLevel}
                      onChange={(e) => {
                        const newLvl = e.target.value as SecondaryLevel;
                        setALevel(newLvl);
                        const validSubs = getSubjectsForLevel(newLvl);
                        if (!validSubs.includes(aSubject)) {
                          setASubject(validSubs[0]);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold"
                    >
                      {ALL_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl === "GMA" || lvl === "Génie Mentor Académie" || lvl === "Savoir+" || lvl === "Concours" || lvl === "Examens" || lvl.includes("Exercice")
                            ? `Section VIP : ${lvl === "Savoir+" ? "GMA" : lvl}`
                            : `Classe de ${lvl}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Matière</label>
                    <select
                      value={aSubject}
                      onChange={(e) => setASubject(e.target.value as Subject)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold"
                    >
                      {getSubjectsForLevel(aLevel).map((sb) => (
                        <option key={sb} value={sb}>{sb}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Type de document</label>
                    <select
                      value={aType}
                      onChange={(e) => setAType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-semibold"
                    >
                      <option value="pdf">PDF (.pdf)</option>
                      <option value="docx">Word (.docx)</option>
                      <option value="image">Image (.png/.jpg)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Taille réelle calculée</label>
                    <input
                      type="text"
                      value={aSize}
                      onChange={(e) => setASize(e.target.value)}
                      placeholder="Ex: 1.2 MB"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Upload size={16} />
                  <span>Uploader et enregistrer (Room + Firestore)</span>
                </button>

                {/* All Assets / Documents Listing with Edit & Delete */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <FileCheck size={15} className="text-[#1A237E]" />
                      <span>Tous les Fichiers & Épreuves ({roomRepo.getAllAssets().length})</span>
                    </h4>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Rechercher un fichier..."
                        value={assetManagerSearch}
                        onChange={(e) => setAssetManagerSearch(e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs flex-1 sm:w-40"
                      />
                      <select
                        value={assetManagerFilter}
                        onChange={(e) => setAssetManagerFilter(e.target.value as any)}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#1A237E]"
                      >
                        <option value="all">Tous types</option>
                        <option value="concours">Concours & VIP</option>
                        <option value="pdf">PDF</option>
                        <option value="video">Vidéos</option>
                        <option value="image">Images</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {roomRepo.getAllAssets()
                      .filter((ast) => {
                        const matchesSearch = (ast.name || "").toLowerCase().includes(assetManagerSearch.toLowerCase()) || (ast.subject && ast.subject.toLowerCase().includes(assetManagerSearch.toLowerCase()));
                        let matchesCategory = true;
                        if (assetManagerFilter === "concours") {
                          matchesCategory = ast.level === "Concours" || ast.level === "Savoir+" || ast.level === "GMA" || ast.level === "Génie Mentor Académie" || ast.level === "Examens" || ast.isPremium === true;
                        } else if (assetManagerFilter !== "all") {
                          matchesCategory = ast.type === assetManagerFilter;
                        }
                        return matchesSearch && matchesCategory;
                      })
                      .map((ast) => (
                        <div key={ast.assetId} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs hover:border-indigo-300 transition-colors">
                          <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-indigo-50 text-[#1A237E] font-bold text-[10px] rounded">
                                {ast.level || "Général"} • {ast.subject || "Tous"}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {ast.type}
                              </span>
                              {ast.isPremium && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                  VIP
                                </span>
                              )}
                              <h5 className="font-bold text-slate-900 text-xs truncate">{ast.name}</h5>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{ast.size} - {ast.storagePath}</p>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setAdminEditingAsset(ast)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                              title="Modifier ce fichier"
                            >
                              <Edit3 size={13} />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Supprimer définitivement "${ast.name}" de Room et Firestore ?`)) {
                                  roomRepo.deleteAsset(ast.assetId);
                                  setSuccessMsg("Fichier supprimé avec succès.");
                                  setTimeout(() => setSuccessMsg(""), 3000);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                              title="Supprimer ce fichier"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </form>
            )}

            {/* Quiz Form */}
            {activeFormTab === "quiz" && (
              <form onSubmit={handleCreateQuiz} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Classe</label>
                    <select
                      value={qLevel}
                      onChange={(e) => {
                        const newLvl = e.target.value as SecondaryLevel;
                        setQLevel(newLvl);
                        const validSubs = getSubjectsForLevel(newLvl);
                        if (!validSubs.includes(qSubject)) {
                          setQSubject(validSubs[0]);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    >
                      {ALL_LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Matière</label>
                    <select
                      value={qSubject}
                      onChange={(e) => setQSubject(e.target.value as Subject)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    >
                      {getSubjectsForLevel(qLevel).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Titre du Quiz</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Évaluation rapide sur Thales"
                    value={qTitle}
                    onChange={(e) => setQTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Question QCM</label>
                    <LatexToolbar
                      buttonSize="xs"
                      onInsert={(snippet) => {
                        setQQuestionText((prev) => prev + (prev ? " " : "") + snippet);
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Intitulé de la question..."
                    value={qQuestionText}
                    onFocus={() => setActiveQuizFieldTarget("question")}
                    onChange={(e) => setQQuestionText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-semibold mb-2 focus:border-indigo-600 focus:outline-hidden"
                  />
                  {showQuizMathPreview && qQuestionText.trim() && (
                    <div className="mb-2 p-2 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-950">
                      <span className="text-[10px] font-bold text-indigo-700 block mb-0.5">Aperçu LaTeX question :</span>
                      <MathRenderer content={qQuestionText} />
                    </div>
                  )}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-white">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                        Clavier Unique MathLive (Formules & Chimie) :
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-700/60">
                        🎯 Cible : {
                          activeQuizFieldTarget === "question" ? "Énoncé question" :
                          activeQuizFieldTarget === "opt1" ? "Option A" :
                          activeQuizFieldTarget === "opt2" ? "Option B" :
                          activeQuizFieldTarget === "opt3" ? "Option C" :
                          activeQuizFieldTarget === "opt4" ? "Option D" : "Explication"
                        }
                      </span>
                    </div>
                    <MathLiveEditor
                      value={getActiveQuizFieldValue()}
                      onChange={updateActiveQuizFieldValue}
                      placeholder="Écrivez ou cliquez sur les symboles ci-dessus (ex: fraction, racine de x², molécule)..."
                      helperText="Les symboles et combinaisons s'affichent directement sans code et se synchronisent en temps réel."
                      showPreview={false}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs block">Options de réponses (cliquez pour cibler le clavier LaTeX) :</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Option A"
                        required
                        value={qOpt1}
                        onFocus={() => setActiveQuizFieldTarget("opt1")}
                        onChange={(e) => setQOpt1(e.target.value)}
                        className={`w-full bg-slate-50 border rounded-xl p-2 text-slate-800 text-xs focus:outline-hidden ${
                          activeQuizFieldTarget === "opt1" ? "border-indigo-600 ring-1 ring-indigo-500" : "border-slate-200"
                        }`}
                      />
                      {showQuizMathPreview && qOpt1.trim() && (
                        <div className="mt-1 text-[11px] text-indigo-900 bg-indigo-50/50 px-2 py-0.5 rounded">
                          <MathRenderer content={qOpt1} />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Option B"
                        required
                        value={qOpt2}
                        onFocus={() => setActiveQuizFieldTarget("opt2")}
                        onChange={(e) => setQOpt2(e.target.value)}
                        className={`w-full bg-slate-50 border rounded-xl p-2 text-slate-800 text-xs focus:outline-hidden ${
                          activeQuizFieldTarget === "opt2" ? "border-indigo-600 ring-1 ring-indigo-500" : "border-slate-200"
                        }`}
                      />
                      {showQuizMathPreview && qOpt2.trim() && (
                        <div className="mt-1 text-[11px] text-indigo-900 bg-indigo-50/50 px-2 py-0.5 rounded">
                          <MathRenderer content={qOpt2} />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Option C"
                        value={qOpt3}
                        onFocus={() => setActiveQuizFieldTarget("opt3")}
                        onChange={(e) => setQOpt3(e.target.value)}
                        className={`w-full bg-slate-50 border rounded-xl p-2 text-slate-800 text-xs focus:outline-hidden ${
                          activeQuizFieldTarget === "opt3" ? "border-indigo-600 ring-1 ring-indigo-500" : "border-slate-200"
                        }`}
                      />
                      {showQuizMathPreview && qOpt3.trim() && (
                        <div className="mt-1 text-[11px] text-indigo-900 bg-indigo-50/50 px-2 py-0.5 rounded">
                          <MathRenderer content={qOpt3} />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Option D"
                        value={qOpt4}
                        onFocus={() => setActiveQuizFieldTarget("opt4")}
                        onChange={(e) => setQOpt4(e.target.value)}
                        className={`w-full bg-slate-50 border rounded-xl p-2 text-slate-800 text-xs focus:outline-hidden ${
                          activeQuizFieldTarget === "opt4" ? "border-indigo-600 ring-1 ring-indigo-500" : "border-slate-200"
                        }`}
                      />
                      {showQuizMathPreview && qOpt4.trim() && (
                        <div className="mt-1 text-[11px] text-indigo-900 bg-indigo-50/50 px-2 py-0.5 rounded">
                          <MathRenderer content={qOpt4} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Option correcte</label>
                  <select
                    value={qCorrectIdx}
                    onChange={(e) => setQCorrectIdx(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                  >
                    <option value={0}>Option A (Premier choix)</option>
                    <option value={1}>Option B (Second choix)</option>
                    <option value={2}>Option C (Troisième choix)</option>
                    <option value={3}>Option D (Quatrième choix)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Explication de la correction</label>
                    <LatexToolbar
                      buttonSize="xs"
                      onInsert={(snippet) => {
                        setQExplanation((prev) => prev + (prev ? " " : "") + snippet);
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Explication détaillée de la réponse exacte..."
                    value={qExplanation}
                    onFocus={() => setActiveQuizFieldTarget("explanation")}
                    onChange={(e) => setQExplanation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                  {showQuizMathPreview && qExplanation.trim() && (
                    <div className="mt-1 p-2 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-950">
                      <MathRenderer content={qExplanation} />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-colors"
                >
                  Enregistrer le QCM
                </button>

                {/* List of Created Quizzes & Admin Modification / Deletion */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Tous les QCM enregistrés sur la plateforme ({allQuizzesList.length}) :
                    </h4>
                  </div>

                  {allQuizzesList.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-slate-500 text-[11px]">
                      Aucun QCM n'a été créé pour le moment.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {allQuizzesList.map((qz) => (
                        <div
                          key={qz.id}
                          className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs hover:border-indigo-300 transition-colors"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-indigo-50 text-[#1A237E] font-bold text-[10px] rounded">
                                {qz.level} • {qz.subject}
                              </span>
                              <h5 className="font-bold text-slate-900 text-xs truncate">{qz.title}</h5>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              {qz.questions.length} question(s) QCM
                            </p>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setAiModifierQuiz(qz)}
                              className="p-1.5 bg-gradient-to-r from-[#1A237E] to-indigo-800 hover:from-indigo-900 hover:to-[#1A237E] text-amber-300 font-bold rounded-lg border border-amber-400/50 text-xs transition-colors cursor-pointer flex items-center space-x-1 shadow-xs"
                              title="Modifier ce quiz avec l'assistance du Co-pilote IA"
                            >
                              <Sparkles size={13} className="text-amber-400" />
                              <span>IA</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAdminEditingQuiz(qz)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                              title="Modifier manuellement ce QCM"
                            >
                              <Edit3 size={13} />
                              <span>Modifier</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Supprimer le QCM "${qz.title}" de la plateforme ?`)) {
                                  roomRepo.deleteQuiz(qz.id);
                                  setAllQuizzesList(roomRepo.getAllQuizzes());
                                  setSuccessMsg("QCM supprimé par l'administrateur.");
                                  setTimeout(() => setSuccessMsg(""), 3000);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                              title="Supprimer ce QCM (Admin)"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Change Admin Password Modal Dialog */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => {
                setIsChangePasswordModalOpen(false);
                setAdminChangePwdError("");
                setAdminChangePwdSuccess("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Modifier le mot de passe Admin</h3>
                <p className="text-xs text-slate-500">Mettez à jour votre accès administrateur</p>
              </div>
            </div>

            {adminChangePwdError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center space-x-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{adminChangePwdError}</span>
              </div>
            )}

            {adminChangePwdSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center space-x-2">
                <CheckCircle size={16} className="shrink-0" />
                <span>{adminChangePwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangeAdminPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mot de passe Admin actuel :</label>
                <div className="relative flex items-center">
                  <input
                    type={showChangePwdOld ? "text" : "password"}
                    required
                    value={adminOldPwd}
                    onChange={(e) => setAdminOldPwd(e.target.value)}
                    placeholder="Ancien mot de passe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-10 text-slate-800 font-medium focus:border-[#1A237E] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePwdOld(!showChangePwdOld)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showChangePwdOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nouveau mot de passe Admin :</label>
                <div className="relative flex items-center">
                  <input
                    type={showChangePwdNew ? "text" : "password"}
                    required
                    value={adminNewPwd}
                    onChange={(e) => setAdminNewPwd(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-10 text-slate-800 font-medium focus:border-[#1A237E] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePwdNew(!showChangePwdNew)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showChangePwdNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Confirmer le nouveau mot de passe :</label>
                <div className="relative flex items-center">
                  <input
                    type={showChangePwdConfirm ? "text" : "password"}
                    required
                    value={adminConfirmPwd}
                    onChange={(e) => setAdminConfirmPwd(e.target.value)}
                    placeholder="Confirmez le nouveau mot de passe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-10 text-slate-800 font-medium focus:border-[#1A237E] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePwdConfirm(!showChangePwdConfirm)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showChangePwdConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-bold rounded-xl transition-colors cursor-pointer shadow"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Course Modal */}
      {adminEditingCourse && (
        <EditCourseModal
          course={adminEditingCourse}
          isOpen={Boolean(adminEditingCourse)}
          onClose={() => setAdminEditingCourse(null)}
          onSave={(updated) => {
            roomRepo.updateCourse(updated);
            setAdminEditingCourse(null);
            setSuccessMsg("Cours modifié avec succès !");
            setTimeout(() => setSuccessMsg(""), 3000);
          }}
        />
      )}

      {/* Admin Edit Asset / Concours Modal */}
      {adminEditingAsset && (
        <EditAssetModal
          asset={adminEditingAsset}
          isOpen={Boolean(adminEditingAsset)}
          onClose={() => setAdminEditingAsset(null)}
        />
      )}

      {/* Admin Edit Quiz Modal (Manual) */}
      {adminEditingQuiz && (
        <EditQuizModal
          quiz={adminEditingQuiz}
          isOpen={Boolean(adminEditingQuiz)}
          onClose={() => setAdminEditingQuiz(null)}
          onSave={(updated) => {
            roomRepo.updateQuiz(updated);
            setAdminEditingQuiz(null);
            setAllQuizzesList(roomRepo.getAllQuizzes());
            setSuccessMsg("QCM modifié avec succès !");
            setTimeout(() => setSuccessMsg(""), 3000);
          }}
        />
      )}

      {/* Admin Edit Quiz with AI Modal */}
      {aiModifierQuiz && (
        <AIQuizModifierModal
          quiz={aiModifierQuiz}
          isOpen={Boolean(aiModifierQuiz)}
          onClose={() => setAiModifierQuiz(null)}
          onQuizUpdated={(updated) => {
            setAllQuizzesList(roomRepo.getAllQuizzes());
            setAiModifierQuiz(null);
            setSuccessMsg(`Quiz "${updated.title}" mis à jour avec succès par l'IA !`);
            setTimeout(() => setSuccessMsg(""), 3500);
          }}
        />
      )}
    </div>
  );
};

export const AdminModal: React.FC<AdminModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <AdminModalContent {...props} />;
};

