import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserProfile,
  Course,
  Asset,
  Quiz,
  SecondaryLevel,
  Subject,
  PaymentTransaction,
  ClassChangeRequest,
  StudentRecord,
  UserNotification,
} from "../types";
import { ALL_LEVELS, ALL_SUBJECTS, getSubjectsForLevel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { scrollToTopGlobal } from "../components/ScrollToTop";
import {
  saveCourseToSupabase as saveCourseToFirebase,
  saveAssetToSupabase as saveAssetToFirebase,
  saveQuizToSupabase as saveQuizToFirebase,
  deleteCourseFromSupabase as deleteCourseFromFirebase,
  deleteAssetFromSupabase as deleteAssetFromFirebase,
  deleteQuizFromSupabase as deleteQuizFromFirebase,
  saveAppConfigToSupabase,
  saveAppConfigToSupabase as saveAppConfigToFirebase,
  logAdminActionToSupabase,
  getAppConfigFromSupabase,
  getAppConfigFromSupabase as getAppConfigFromFirebase,
  saveLogoToSupabase as saveLogoToFirebase,
  uploadAppLogoToSupabase,
  uploadCoursePdfToSupabase,
  uploadQuizImageToSupabase,
  updateUserPasswordSupabase as updateUserPasswordFirebase,
  saveNotificationToSupabase as saveNotificationToFirebase,
  subscribeToAllStudentsSupabase as subscribeToAllStudents,
  fetchAllStudentsFromSupabase as fetchAllStudentsFromFirebase,
  subscribeToClassChangeRequestsSupabase as subscribeToAllClassChangeRequests,
  subscribeToAllNotificationsSupabase as subscribeToAllNotifications,
  subscribeToVIPPaymentRequestsSupabase as subscribeToVIPPaymentRequests,
  subscribeToCaisseTransactionsSupabase as subscribeToCaisseTransactions,
  subscribeToHomeworkSubmissionsSupabase as subscribeToAllHomeworks,
  updateClassChangeRequestStatusSupabase as updateClassChangeRequestStatusFirebase,
  deleteNotificationFromSupabase as deleteNotificationFromFirebase,
  clearAllNotificationsFromSupabase as clearAllNotificationsFromFirebase,
  deleteStudentFromSupabaseCascade as deleteUserFromFirebaseCascade,
  purgeNonAdminUsersFromSupabase as purgeNonAdminUsersFromFirebase,
  updateStudentLevelSupabase,
  fetchClassChangeRequestsSupabase,
  fetchVIPPaymentRequestsSupabase,
  fetchTransactionsSupabase,
  fetchCaisseTransactionsSupabase,
  fetchAllStudentsFromSupabase,
} from "../data/supabaseStorage";
import { CURRENT_APP_VERSION, getLocalAppConfig, saveLocalAppConfig, APP_VERSION } from "../utils/versionUtils";
import { AppLogo } from "../components/AppLogo";
import {
  getAppLogo,
  syncLogoWithFirebase,
  setAppLogo,
  useAppLogo,
  getOfficialSignature,
  useOfficialSignature,
  setOfficialSignature,
  saveCustomSignatureToRemote,
  syncSignatureWithRemote,
  getFavicon,
  setFavicon,
  useFavicon,
  saveCustomFaviconToRemote,
  syncFaviconWithRemote,
  getPwaIcon192,
  setPwaIcon192,
  usePwaIcon192,
  saveCustomPwaIcon192ToRemote,
  getPwaIcon512,
  setPwaIcon512,
  usePwaIcon512,
  saveCustomPwaIcon512ToRemote,
  uploadCustomAssetToSupabase,
} from "../utils/assetImages";
import { testSupabaseConnection, supabase } from "../lib/supabaseClient";
import { validatePasswordComplexity } from "../utils/passwordValidation";
import { PasswordValidationCard } from "../components/PasswordValidationCard";
import { AdminPaymentValidation } from "../components/AdminPaymentValidation";
import { AdminClassChangeValidation } from "../components/AdminClassChangeValidation";
import { ModuleCaisseAdmin } from "../components/ModuleCaisseAdmin";
import { AdminHomeworkManagement } from "../components/AdminHomeworkManagement";
import { AdminTutorialsManagement } from "../components/AdminTutorialsManagement";
import { AdminPricingManagement } from "../components/AdminPricingManagement";
import { AdminAIAssistant } from "../components/AdminAIAssistant";
import { AdminAuditLogsView } from "../components/AdminAuditLogsView";
import { EditCourseModal } from "../components/EditCourseModal";
import { EditAssetModal } from "../components/EditAssetModal";
import { EditQuizModal } from "../components/EditQuizModal";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { MathToolbar, MathRenderer, ensureMathDelimiters, normalizeLatex } from "../components/MathRenderer";
import { MathLiveEditor } from "../components/MathLiveEditor";
import { getEmbeddableDocumentUrl } from "../utils/documentUtils";
import {
  logAdminActionToFirebase,
  notifyCoursePublished,
  notifyAssetPublished,
  notifyQuizPublished,
  getUserStudentId,
} from "../utils/userUtils";
import { getDistinctQuizResults, calculateStudentQuizAverage } from "../utils/quizUtils";
import {
  Shield,
  ShieldCheck,
  ArrowLeft,
  LayoutDashboard,
  Sparkles,
  Coins,
  CreditCard,
  Building2,
  Users,
  User,
  FileCheck,
  Edit3,
  BookOpen,
  FolderOpen,
  HelpCircle,
  Bell,
  Settings,
  GraduationCap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Trash2,
  Plus,
  Search,
  KeyRound,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Code2,
  Send,
  ExternalLink,
  ChevronRight,
  UserCheck,
  TrendingUp,
  Download,
  Phone,
  FileText,
  AlertTriangle,
  Database,
  FileJson,
  Copy,
  Check,
  CircleDot,
  CheckSquare,
  Image as ImageIcon,
  Video,
  Smartphone,
  Globe,
  Layers,
  Link as LinkIcon,
} from "lucide-react";

export type AdminTab =
  | "overview"
  | "vip_validation"
  | "class_requests"
  | "caisse"
  | "students"
  | "homework"
  | "tutorials"
  | "global_edit"
  | "pricing"
  | "courses"
  | "assets"
  | "quizzes"
  | "notifications"
  | "settings"
  | "ai_assistant"
  | "audit_logs";

interface AdminPageProps {
  user: UserProfile;
  onNavigateHome: () => void;
  onOpenCodeViewer?: () => void;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  onUpdatePhoto?: (newUrl: string) => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
  refreshProfile?: (forcedUid?: string) => Promise<UserProfile | null>;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  user,
  onNavigateHome,
  onOpenCodeViewer,
  onOpenReceipt,
  onUpdatePhoto,
  onUpdateProfile,
  refreshProfile,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();

  const loc = useLocation();
  const currentPath = loc.pathname;
  const nav = useNavigate();
  const routerNavigate = (path: string) => nav(path);

  // Active Admin Tab State
  const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
    if (currentPath === "/admin/dashboard" || currentPath === "/admin") return "overview";
    if (currentPath.startsWith("/admin/vip") || currentPath.startsWith("/admin/validation-vip")) return "vip_validation";
    if (currentPath.startsWith("/admin/changements-classe") || currentPath.startsWith("/admin/demandes-classe")) return "class_requests";
    if (currentPath.startsWith("/admin/quiz")) return "quizzes";
    if (currentPath.startsWith("/admin/eleves")) return "students";
    if (currentPath.startsWith("/admin/tresorerie")) return "caisse";
    if (currentPath.startsWith("/admin/epreuves")) return "assets";
    if (currentPath.startsWith("/admin/cours")) return "courses";
    if (currentPath.startsWith("/admin/devoirs")) return "homework";
    if (currentPath.startsWith("/admin/tutoriels")) return "tutorials";
    if (currentPath.startsWith("/admin/notifications")) return "notifications";
    if (currentPath.startsWith("/admin/parametres")) return "settings";
    if (currentPath.startsWith("/admin/tarifs")) return "pricing";
    if (currentPath.startsWith("/admin/assistant-ia") || currentPath.startsWith("/admin/ia")) return "ai_assistant";
    if (currentPath.startsWith("/admin/audit") || currentPath.startsWith("/admin/securite")) return "audit_logs";
    if (currentPath.startsWith("/admin/edition-globale") || currentPath.startsWith("/admin/global")) return "global_edit";
    try {
      const saved = localStorage.getItem("savoir_admin_active_tab");
      if (saved) return saved as AdminTab;
    } catch {}
    return "overview";
  });

  // Keep activeTab in sync with URL
  useEffect(() => {
    if (!currentPath) return;
    if (currentPath === "/admin/dashboard" || currentPath === "/admin") {
      setActiveTabState("overview");
    } else if (currentPath.startsWith("/admin/vip") || currentPath.startsWith("/admin/validation-vip")) {
      setActiveTabState("vip_validation");
    } else if (currentPath.startsWith("/admin/changements-classe") || currentPath.startsWith("/admin/demandes-classe")) {
      setActiveTabState("class_requests");
    } else if (currentPath.startsWith("/admin/edition-globale") || currentPath.startsWith("/admin/global")) {
      setActiveTabState("global_edit");
    } else if (currentPath.startsWith("/admin/quiz")) {
      setActiveTabState("quizzes");
    } else if (currentPath.startsWith("/admin/eleves")) {
      setActiveTabState("students");
    } else if (currentPath.startsWith("/admin/tresorerie")) {
      setActiveTabState("caisse");
    } else if (currentPath.startsWith("/admin/epreuves")) {
      setActiveTabState("assets");
    } else if (currentPath.startsWith("/admin/cours")) {
      setActiveTabState("courses");
    } else if (currentPath.startsWith("/admin/devoirs")) {
      setActiveTabState("homework");
    } else if (currentPath.startsWith("/admin/tutoriels")) {
      setActiveTabState("tutorials");
    } else if (currentPath.startsWith("/admin/notifications")) {
      setActiveTabState("notifications");
    } else if (currentPath.startsWith("/admin/parametres")) {
      setActiveTabState("settings");
    } else if (currentPath.startsWith("/admin/tarifs")) {
      setActiveTabState("pricing");
    } else if (currentPath.startsWith("/admin/assistant-ia") || currentPath.startsWith("/admin/ia")) {
      setActiveTabState("ai_assistant");
    } else if (currentPath.startsWith("/admin/audit") || currentPath.startsWith("/admin/securite")) {
      setActiveTabState("audit_logs");
    }
  }, [currentPath]);

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    scrollToTopGlobal("instant");
    try {
      localStorage.setItem("savoir_admin_active_tab", tab);
    } catch {}
    if (routerNavigate) {
      switch (tab) {
        case "overview":
          routerNavigate("/admin/dashboard");
          break;
        case "vip_validation":
          routerNavigate("/admin/vip");
          break;
        case "class_requests":
          routerNavigate("/admin/changements-classe");
          break;
        case "global_edit":
          routerNavigate("/admin/edition-globale");
          break;
        case "quizzes":
          routerNavigate("/admin/quiz");
          break;
        case "students":
          routerNavigate("/admin/eleves");
          break;
        case "caisse":
          routerNavigate("/admin/tresorerie");
          break;
        case "assets":
          routerNavigate("/admin/epreuves");
          break;
        case "courses":
          routerNavigate("/admin/cours");
          break;
        case "homework":
          routerNavigate("/admin/devoirs");
          break;
        case "tutorials":
          routerNavigate("/admin/tutoriels");
          break;
        case "notifications":
          routerNavigate("/admin/notifications");
          break;
        case "settings":
          routerNavigate("/admin/parametres");
          break;
        case "pricing":
          routerNavigate("/admin/tarifs");
          break;
        case "ai_assistant":
          routerNavigate("/admin/assistant-ia");
          break;
        case "audit_logs":
          routerNavigate("/admin/audit");
          break;
        default:
          routerNavigate("/admin/dashboard");
      }
    }
  };

  // Feedback Messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // Real-Time Data States
  const [students, setStudents] = useState<StudentRecord[]>(() => roomRepo.getAllStudents());
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);
  const [classRequests, setClassRequests] = useState<ClassChangeRequest[]>(() =>
    roomRepo.getAllClassChangeRequests()
  );
  const [notifications, setNotifications] = useState<UserNotification[]>(() =>
    roomRepo.getAllNotifications()
  );
  const [courses, setCourses] = useState<Course[]>(() => roomRepo.getAllCourses());
  const [assets, setAssets] = useState<Asset[]>(() => roomRepo.getAllAssets());
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => roomRepo.getAllQuizzes());
  const [vipPendingCount, setVipPendingCount] = useState(0);
  const [homeworkPendingCount, setHomeworkPendingCount] = useState(0);
  const [caisseBalance, setCaisseBalance] = useState(0);
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);

  const handleGlobalSyncAll = async () => {
    setIsGlobalSyncing(true);
    try {
      const [classReqs, txs, vips, caisseTxs, studs] = await Promise.all([
        fetchClassChangeRequestsSupabase(),
        fetchTransactionsSupabase(),
        fetchVIPPaymentRequestsSupabase(),
        fetchCaisseTransactionsSupabase(),
        fetchAllStudentsFromSupabase(),
      ]);

      if (Array.isArray(classReqs)) {
        setClassRequests(classReqs);
        classReqs.forEach((r) => roomRepo.syncClassChangeRequest(r));
      }

      if (Array.isArray(studs) && studs.length > 0) {
        setStudents(studs);
        studs.forEach((s) => roomRepo.registerOrUpdateStudent(s));
      }

      if (Array.isArray(vips)) {
        const vipPending = vips.filter((v) => (v.status || "").toUpperCase() === "PENDING").length;
        setVipPendingCount(vipPending);
      }

      // Propagate notifications across roomRepo
      roomRepo.notify();

      const pendingCls = classReqs.filter((r) => {
        const s = (r.status || "").toLowerCase().trim();
        return s === "pending" || s === "en_attente" || (s !== "approved" && s !== "rejected");
      }).length;

      showToast(
        `Actualisation globale réussie : ${classReqs.length} changements de classe (${pendingCls} en attente), ${vips.length} souscriptions VIP, ${txs.length} transactions et ${studs.length} élèves synchronisés !`
      );
    } catch (err: any) {
      console.error("[AdminPage] Erreur actualisation globale:", err);
      showToast("Erreur lors de l'actualisation globale : " + (err?.message || "Erreur de connexion"), true);
    } finally {
      setIsGlobalSyncing(false);
    }
  };

  // Firebase Config & Status States
  const [hasCopiedConfig, setHasCopiedConfig] = useState(false);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<string | null>(null);

  const handleTestFirebaseDb = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    try {
      const isOnline = await testSupabaseConnection();
      setDbTestResult(
        isOnline
          ? "Connexion active et opérationnelle vers Supabase PostgreSQL Cloud !"
          : "Initialisé et connecté à Supabase Cloud."
      );
      showToast("Test Supabase effectué avec succès !");
    } catch (err) {
      setDbTestResult("Erreur de communication avec Supabase.");
      showToast("Erreur lors du test de connexion.", true);
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleCopyFirebaseConfig = () => {
    const supaConfig = {
      url: "https://rmumbqtvdmmnngvjivud.supabase.co",
      status: "Actif / Connecté",
      database: "PostgreSQL",
      realtime: "Activé",
    };
    navigator.clipboard.writeText(JSON.stringify(supaConfig, null, 2));
    setHasCopiedConfig(true);
    showToast("Configuration Supabase copiée dans le presse-papier !");
    setTimeout(() => setHasCopiedConfig(false), 2500);
  };

  // Search & Filter States (Pure visual filters, never modifies admin's own profile)
  const [globalClassFilter, setGlobalClassFilter] = useState<string>("ALL");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentLevelFilter, setStudentLevelFilter] = useState<string>("ALL");
  const [studentAuthFilter, setStudentAuthFilter] = useState<"ALL" | "ONLINE" | "GOOGLE" | "EMAIL">("ALL");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseLevelFilter, setCourseLevelFilter] = useState<string>("ALL");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetLevelFilter, setAssetLevelFilter] = useState<string>("ALL");
  const [quizSearch, setQuizSearch] = useState("");
  const [quizLevelFilter, setQuizLevelFilter] = useState<string>("ALL");

  const handleApplyVisualClassFilter = (lvl: string) => {
    // Strictly visual filter for Directeurs/Admins: modifies local React state only
    setGlobalClassFilter(lvl);
    setStudentLevelFilter(lvl);
    setCourseLevelFilter(lvl);
    setAssetLevelFilter(lvl);
    setQuizLevelFilter(lvl);
  };

  // Selected Items for Modals
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentRecord | null>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentRecord | null>(null);
  const [isPurgingStudents, setIsPurgingStudents] = useState(false);

  // Real-Time Subscriptions Setup
  useEffect(() => {
    // 1. Students Subscription
    const unsubStudents = subscribeToAllStudents((list) => {
      if (list && list.length > 0) {
        setStudents(list);
        setSelectedStudentForDetail((curr) => {
          if (!curr) return null;
          const updated = list.find((s) => s.uid === curr.uid || (s.matricule && s.matricule === curr.matricule) || (s.email && s.email === curr.email));
          return updated ? { ...curr, ...updated } : curr;
        });
      }
    });

    // 2. Class Change Requests Subscription
    const unsubClassReqs = subscribeToAllClassChangeRequests((list) => {
      if (list) setClassRequests(list);
    });

    // 3. Notifications Subscription
    const unsubNotifs = subscribeToAllNotifications((list) => {
      if (list) setNotifications(list);
    });

    // 4. VIP Requests for Counter
    const unsubVip = subscribeToVIPPaymentRequests((list) => {
      const pending = list.filter((r) => r.status === "PENDING").length;
      setVipPendingCount(pending);
    });

    // 5. Homeworks for Counter
    const unsubHw = subscribeToAllHomeworks((list) => {
      const pending = list.filter((h) => h.status === "pending").length;
      setHomeworkPendingCount(pending);
    });

    // 6. Caisse Transactions for Balance
    const unsubCaisse = subscribeToCaisseTransactions((txs) => {
      const total = txs.reduce((sum, t) => sum + t.amount, 0);
      setCaisseBalance(total);
    });

    // Room DB fallback synchronization
    const refreshRoom = () => {
      setCourses(roomRepo.getAllCourses());
      setAssets(roomRepo.getAllAssets());
      setQuizzes(roomRepo.getAllQuizzes());
    };
    const unsubRoom = roomRepo.subscribe(refreshRoom);

    return () => {
      unsubStudents();
      unsubClassReqs();
      unsubNotifs();
      unsubVip();
      unsubHw();
      unsubCaisse();
      unsubRoom();
    };
  }, []);

  // Class Change Action Handlers
  const handleApproveClassChange = async (req: ClassChangeRequest) => {
    try {
      roomRepo.updateClassChangeRequestStatus(req.id, "approved");
      await updateClassChangeRequestStatusFirebase(
        req.id,
        "approved",
        req.userUid,
        req.requestedLevel
      );
      showToast(`Demande approuvée pour ${req.userName} ! Classe passée en ${req.requestedLevel}.`);
    } catch (err) {
      console.error("Error approving class change:", err);
      showToast("Erreur lors de l'approbation de la classe.", true);
    }
  };

  const handleRejectClassChange = async (req: ClassChangeRequest) => {
    const reason = window.prompt("Motif optionnel du refus de la demande :");
    try {
      roomRepo.updateClassChangeRequestStatus(req.id, "rejected", reason || undefined);
      await updateClassChangeRequestStatusFirebase(
        req.id,
        "rejected",
        req.userUid,
        req.requestedLevel,
        reason || undefined
      );
      showToast(`Demande refusée pour ${req.userName}.`);
    } catch (err) {
      console.error("Error rejecting class change:", err);
      showToast("Erreur lors du refus.", true);
    }
  };

  // Student Delete Handler
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    const uid = studentToDelete.uid;
    const name = studentToDelete.displayName;
    setStudentToDelete(null);
    try {
      roomRepo.deleteStudent(uid);
      await deleteUserFromFirebaseCascade(uid);
      await logAdminActionToFirebase(
        user?.displayName || "Massaw Seck",
        "DELETE_STUDENT",
        `Suppression définitive du compte élève : ${name} (${studentToDelete.email})`,
        uid,
        { studentName: name, studentEmail: studentToDelete.email }
      );
      showToast(`L'élève ${name} et son historique ont été supprimés avec succès.`);
    } catch (err) {
      console.error("Error deleting student:", err);
      showToast("Erreur lors de la suppression de l'élève.", true);
    }
  };

  // Purge Demo Students Handler
  const handlePurgeNonAdminStudents = async () => {
    if (
      !window.confirm(
        "⚠️ Attention : Cette action va effacer tous les comptes élèves de démonstration/test pour ne conserver que les administrateurs. Confirmer ?"
      )
    ) {
      return;
    }
    setIsPurgingStudents(true);
    try {
      const purged = roomRepo.purgeAllNonAdminStudents();
      await purgeNonAdminUsersFromFirebase();
      await logAdminActionToFirebase(
        user?.displayName || "Massaw Seck",
        "PURGE_STUDENTS",
        `Purge administrative des comptes élèves de test (${purged} comptes supprimés)`
      );
      showToast(`Nettoyage réussi : ${purged} compte(s) élève(s) purgé(s).`);
    } catch (err) {
      console.error("Error purging students:", err);
      showToast("Erreur lors du nettoyage des comptes.", true);
    } finally {
      setIsPurgingStudents(false);
    }
  };

  // Global Config State
  const [globalAnnouncement, setGlobalAnnouncement] = useState("");
  const [globalSupportPhone, setGlobalSupportPhone] = useState("783769584");
  const [globalVipPrice, setGlobalVipPrice] = useState("5000");
  const [isSavingGlobalConfig, setIsSavingGlobalConfig] = useState(false);

  useEffect(() => {
    getAppConfigFromFirebase().then((cfg) => {
      if (cfg) {
        if (cfg.announcementText) setGlobalAnnouncement(cfg.announcementText);
        if (cfg.supportPhone) setGlobalSupportPhone(cfg.supportPhone);
        if (cfg.vipPriceFCFA) setGlobalVipPrice(String(cfg.vipPriceFCFA));
      }
    });
  }, []);

  const handleSaveGlobalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobalConfig(true);
    try {
      await saveAppConfigToFirebase({
        announcementText: globalAnnouncement.trim(),
        supportPhone: globalSupportPhone.trim(),
        vipPriceFCFA: parseInt(globalVipPrice) || 5000,
      });
      showToast("Configuration globale enregistrée et synchronisée !");
    } catch (err) {
      console.error("Error saving config:", err);
      showToast("Erreur lors de l'enregistrement de la configuration.", true);
    } finally {
      setIsSavingGlobalConfig(false);
    }
  };

  // Course Form State
  const [cTitle, setCTitle] = useState("");
  const [cLevel, setCLevel] = useState<SecondaryLevel>("3ème");
  const [cSubject, setCSubject] = useState<Subject>("Mathématiques");
  const [cChapter, setCChapter] = useState("");
  const [cSummary, setCSummary] = useState("");
  const [cContent, setCContent] = useState("");
  const [courseMathFormula, setCourseMathFormula] = useState("");
  const [cPdfUrl, setCPdfUrl] = useState("");
  const [cPdfFileName, setCPdfFileName] = useState("");
  const [isUploadingCoursePdf, setIsUploadingCoursePdf] = useState(false);
  const [coursePdfProgress, setCoursePdfProgress] = useState(0);
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);

  const handleCourseFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 30 * 1024 * 1024; // 30 MB
    if (file.size > MAX_SIZE) {
      showToast("Le fichier dépasse la taille maximale autorisée de 30 Mo.", true);
      return;
    }

    setIsUploadingCoursePdf(true);
    setCoursePdfProgress(15);
    try {
      const publicUrl = await uploadCoursePdfToSupabase(file, (p) => setCoursePdfProgress(p));
      if (publicUrl) {
        setCPdfUrl(publicUrl);
        setCPdfFileName(file.name);
        setCoursePdfProgress(100);
        showToast(`Document PDF "${file.name}" importé avec succès dans le stockage.`);
      } else {
        const objUrl = URL.createObjectURL(file);
        setCPdfUrl(objUrl);
        setCPdfFileName(file.name);
        showToast(`Document PDF "${file.name}" attaché en local.`);
      }
    } catch (err) {
      console.error("Error uploading course PDF:", err);
      showToast("Erreur lors de l'envoi du fichier PDF.", true);
    } finally {
      setIsUploadingCoursePdf(false);
      setTimeout(() => setCoursePdfProgress(0), 1200);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cTitle.trim() || !cChapter.trim() || !cSummary.trim()) {
      showToast("Veuillez remplir tous les champs obligatoires du cours.", true);
      return;
    }
    setIsSubmittingCourse(true);
    try {
      const newCourse: Course = {
        id: "course_" + Date.now(),
        title: cTitle.trim(),
        subject: cSubject,
        level: cLevel,
        chapter: cChapter.trim(),
        summary: cSummary.trim(),
        content: cContent.trim() || cSummary.trim(),
        pdfUrl: cPdfUrl.trim() ? getEmbeddableDocumentUrl(cPdfUrl.trim()) : undefined,
        pdfFileName: cPdfFileName.trim() || undefined,
        createdAt: Date.now(),
      };

      // 1. Enregistrement local garanti
      roomRepo.insertCourses([newCourse]);

      // 2. Synchronisation distante et notification
      saveCourseToFirebase(newCourse).catch((syncErr) => {
        console.warn("Notice sync course to Supabase:", syncErr);
      });
      notifyCoursePublished(newCourse).catch(console.warn);
      logAdminActionToFirebase(
        user?.displayName || "Massaw Seck",
        "CREATE_COURSE",
        `Création et publication du cours : « ${newCourse.title} » (${newCourse.subject} - ${newCourse.level})`,
        undefined,
        { courseId: newCourse.id, subject: newCourse.subject, level: newCourse.level }
      ).catch(console.warn);

      setCTitle("");
      setCChapter("");
      setCSummary("");
      setCContent("");
      setCPdfUrl("");
      setCPdfFileName("");
      showToast(`Cours « ${newCourse.title} » créé et enregistré avec succès !`);
    } catch (err) {
      console.error("Error creating course:", err);
      showToast(`Cours enregistré dans la base de données locale.`);
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  // Student refresh handler
  const [isRefreshingStudents, setIsRefreshingStudents] = useState(false);
  const handleRefreshStudents = async () => {
    setIsRefreshingStudents(true);
    try {
      const list = await fetchAllStudentsFromFirebase();
      if (list && list.length > 0) {
        setStudents(list);
      }
      showToast(`Synchronisation terminée : ${list.length} élève(s) chargé(s).`);
    } catch (err) {
      showToast("Actualisation terminée avec les données locales.");
    } finally {
      setIsRefreshingStudents(false);
    }
  };

  // Asset Form State (PDF / Word upload)
  const [aTitle, setATitle] = useState("");
  const [aLevel, setALevel] = useState<SecondaryLevel>("3ème");
  const [aSubject, setASubject] = useState<Subject>("Mathématiques");
  const [aType, setAType] = useState<"exam" | "concours" | "exercise">("exam");
  const [aDescription, setADescription] = useState("");
  const [aPdfUrl, setAPdfUrl] = useState("");
  const [aFileName, setAFileName] = useState("");
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aTitle.trim() || !aDescription.trim()) {
      showToast("Veuillez remplir le titre et la description de l'épreuve.", true);
      return;
    }
    setIsSubmittingAsset(true);
    try {
      const newAsset: Asset = {
        assetId: "asset_" + Date.now(),
        name: aTitle.trim(),
        subject: aSubject,
        level: aLevel,
        type: "pdf",
        category: aType,
        size: "1.8 Mo",
        storagePath: `epreuves/${aLevel}/${aSubject}/${aTitle.trim()}.pdf`,
        downloadUrl:
          aPdfUrl.trim() ||
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        isCachedOffline: false,
      };
      roomRepo.insertAssets([newAsset]);
      await saveAssetToFirebase(newAsset);
      await notifyAssetPublished(newAsset).catch(console.warn);
      await logAdminActionToFirebase(
        user?.displayName || "Massaw Seck",
        "CREATE_ASSET",
        `Ajout épreuve/ressource : « ${newAsset.name} » (${newAsset.subject} - ${newAsset.level})`,
        undefined,
        { assetId: newAsset.assetId, subject: newAsset.subject, level: newAsset.level }
      );
      setATitle("");
      setADescription("");
      setAPdfUrl("");
      setAFileName("");
      showToast(`Épreuve "${newAsset.name}" ajoutée et synchronisée avec succès ! Notification envoyée aux élèves.`);
    } catch (err) {
      console.error("Error creating asset:", err);
      showToast("Erreur lors de l'ajout de l'épreuve.", true);
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  // Quiz Form State
  const [qTitle, setQTitle] = useState("");
  const [qLevel, setQLevel] = useState<SecondaryLevel>("3ème");
  const [qSubject, setQSubject] = useState<Subject>("Maths");
  const [qDuration, setQDuration] = useState("15");
  const [qQuestions, setQQuestions] = useState<
    Array<{
      question: string;
      options: [string, string, string, string];
      type: "single" | "multiple";
      correctIndex: number;
      correctIndices: number[];
      explanation: string;
      image_url?: string | null;
      imageUrl?: string | null;
      isUploadingImage?: boolean;
      optionImages?: [string | null, string | null, string | null, string | null];
      option_images?: [string | null, string | null, string | null, string | null];
      isUploadingOptionImage?: [boolean, boolean, boolean, boolean];
    }>
  >([
    {
      question: "",
      options: ["", "", "", ""],
      type: "single",
      correctIndex: 0,
      correctIndices: [0],
      explanation: "",
      image_url: null,
      imageUrl: null,
      optionImages: [null, null, null, null],
      option_images: [null, null, null, null],
      isUploadingOptionImage: [false, false, false, false],
    },
  ]);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [activeQuizMathTarget, setActiveQuizMathTarget] = useState<{
    qIdx: number;
    field: "question" | "explanation" | number;
  } | null>({ qIdx: 0, field: "question" });
  const [showQuizMathPreview, setShowQuizMathPreview] = useState(true);
  const [inlineMathLiveField, setInlineMathLiveField] = useState<string | null>(null);

  const getActiveQuizTargetValue = (): string => {
    if (!activeQuizMathTarget) return "";
    const { qIdx, field } = activeQuizMathTarget;
    const q = qQuestions[qIdx];
    if (!q) return "";
    if (field === "question") return q.question || "";
    if (field === "explanation") return q.explanation || "";
    if (typeof field === "number") return q.options[field] || "";
    return "";
  };

  const updateActiveQuizTargetValue = (newVal: string) => {
    if (!activeQuizMathTarget) return;
    const { qIdx, field } = activeQuizMathTarget;
    setQQuestions((prev) =>
      prev.map((item, i) => {
        if (i !== qIdx) return item;
        if (field === "question") {
          return { ...item, question: newVal };
        }
        if (field === "explanation") {
          return { ...item, explanation: newVal };
        }
        if (typeof field === "number") {
          const newOpts = [...item.options] as [string, string, string, string];
          newOpts[field] = newVal;
          return { ...item, options: newOpts };
        }
        return item;
      })
    );
  };

  const handleInsertQuizMathSnippet = (snippet: string) => {
    if (!activeQuizMathTarget) {
      setQQuestions((prev) => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        copy[0].question = (copy[0].question || "") + (copy[0].question ? " " : "") + snippet;
        return copy;
      });
      return;
    }
    const { qIdx, field } = activeQuizMathTarget;
    setQQuestions((prev) => {
      if (!prev[qIdx]) return prev;
      const copy = [...prev];
      if (field === "question") {
        copy[qIdx].question = (copy[qIdx].question || "") + (copy[qIdx].question ? " " : "") + snippet;
      } else if (field === "explanation") {
        copy[qIdx].explanation = (copy[qIdx].explanation || "") + (copy[qIdx].explanation ? " " : "") + snippet;
      } else if (typeof field === "number") {
        const newOpts = [...copy[qIdx].options] as [string, string, string, string];
        newOpts[field] = (newOpts[field] || "") + (newOpts[field] ? " " : "") + snippet;
        copy[qIdx].options = newOpts;
      }
      return copy;
    });
  };

  const handleAddQuestionRow = () => {
    setQQuestions((prev) => [
      ...prev,
      {
        question: "",
        options: ["", "", "", ""],
        type: "single",
        correctIndex: 0,
        correctIndices: [0],
        explanation: "",
        image_url: null,
        imageUrl: null,
        optionImages: [null, null, null, null],
        option_images: [null, null, null, null],
        isUploadingOptionImage: [false, false, false, false],
      },
    ]);
  };

  const handleRemoveQuestionRow = (index: number) => {
    if (qQuestions.length <= 1) return;
    setQQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuizQuestionImageUpload = async (qIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Veuillez sélectionner un fichier image (PNG, JPG, WebP).", true);
      return;
    }

    setQQuestions((prev) =>
      prev.map((item, i) => (i === qIdx ? { ...item, isUploadingImage: true } : item))
    );

    try {
      const base64Promise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });

      let publicUrl: string | null = null;
      try {
        publicUrl = await uploadQuizImageToSupabase(file);
      } catch (uploadErr) {
        console.warn("Supabase upload error for question:", uploadErr);
      }

      const base64Data = await base64Promise;
      const finalUrl = publicUrl || base64Data || URL.createObjectURL(file);

      setQQuestions((prev) =>
        prev.map((item, i) =>
          i === qIdx
            ? { ...item, image_url: finalUrl, imageUrl: finalUrl, isUploadingImage: false }
            : item
        )
      );
      showToast("Figure / illustration de la question ajoutée avec succès.");
    } catch (err) {
      console.error("Error uploading quiz question image:", err);
      showToast("Erreur lors de l'upload de l'image.", true);
      setQQuestions((prev) =>
        prev.map((item, i) => (i === qIdx ? { ...item, isUploadingImage: false } : item))
      );
    }
  };

  const handleRemoveQuizQuestionImage = (qIdx: number) => {
    setQQuestions((prev) =>
      prev.map((item, i) =>
        i === qIdx ? { ...item, image_url: null, imageUrl: null } : item
      )
    );
  };

  const handleQuizOptionImageUpload = async (
    qIdx: number,
    optIdx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Veuillez sélectionner un fichier image (PNG, JPG, WebP).", true);
      return;
    }

    setQQuestions((prev) =>
      prev.map((item, i) => {
        if (i !== qIdx) return item;
        const uploading = [...(item.isUploadingOptionImage || [false, false, false, false])] as [boolean, boolean, boolean, boolean];
        uploading[optIdx] = true;
        return { ...item, isUploadingOptionImage: uploading };
      })
    );

    try {
      const base64Promise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });

      let publicUrl: string | null = null;
      try {
        publicUrl = await uploadQuizImageToSupabase(file);
      } catch (uploadErr) {
        console.warn("Supabase upload error for option:", uploadErr);
      }

      const base64Data = await base64Promise;
      const finalUrl = publicUrl || base64Data || URL.createObjectURL(file);

      setQQuestions((prev) =>
        prev.map((item, i) => {
          if (i !== qIdx) return item;
          const currentImgs = [...(item.optionImages || [null, null, null, null])] as [string | null, string | null, string | null, string | null];
          currentImgs[optIdx] = finalUrl;
          const uploading = [...(item.isUploadingOptionImage || [false, false, false, false])] as [boolean, boolean, boolean, boolean];
          uploading[optIdx] = false;
          return {
            ...item,
            optionImages: currentImgs,
            option_images: currentImgs,
            isUploadingOptionImage: uploading,
          };
        })
      );
      showToast(`Illustration de l'option ${String.fromCharCode(65 + optIdx)} ajoutée.`);
    } catch (err) {
      console.error("Error uploading option image:", err);
      showToast("Erreur lors de l'upload de l'image de cette option.", true);
      setQQuestions((prev) =>
        prev.map((item, i) => {
          if (i !== qIdx) return item;
          const uploading = [...(item.isUploadingOptionImage || [false, false, false, false])] as [boolean, boolean, boolean, boolean];
          uploading[optIdx] = false;
          return { ...item, isUploadingOptionImage: uploading };
        })
      );
    }
  };

  const handleRemoveQuizOptionImage = (qIdx: number, optIdx: number) => {
    setQQuestions((prev) =>
      prev.map((item, i) => {
        if (i !== qIdx) return item;
        const currentImgs = [...(item.optionImages || [null, null, null, null])] as [string | null, string | null, string | null, string | null];
        currentImgs[optIdx] = null;
        return {
          ...item,
          optionImages: currentImgs,
          option_images: currentImgs,
        };
      })
    );
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim()) {
      showToast("Veuillez donner un titre au Quiz QCM.", true);
      return;
    }
    for (let i = 0; i < qQuestions.length; i++) {
      if (!qQuestions[i].question.trim()) {
        showToast(`La question #${i + 1} est vide.`, true);
        return;
      }
      for (let optIdx = 0; optIdx < 4; optIdx++) {
        const text = qQuestions[i].options[optIdx]?.trim();
        const img = qQuestions[i].optionImages?.[optIdx] || qQuestions[i].option_images?.[optIdx];
        if (!text && !img) {
          showToast(`L'option ${String.fromCharCode(65 + optIdx)} de la question #${i + 1} doit avoir un texte ou une image.`, true);
          return;
        }
      }
      if (qQuestions[i].type === "multiple" && (!qQuestions[i].correctIndices || qQuestions[i].correctIndices.length === 0)) {
        showToast(`Veuillez cocher au moins une bonne réponse pour la question #${i + 1}.`, true);
        return;
      }
    }
    setIsSubmittingQuiz(true);
    try {
      const parsedDuration = Math.max(1, parseInt(qDuration, 10) || 15);
      const newQuiz: Quiz = {
        id: "quiz_" + Date.now(),
        title: qTitle.trim(),
        subject: qSubject,
        level: qLevel,
        createdAt: Date.now(),
        duration: String(parsedDuration),
        durationMinutes: parsedDuration,
        duration_minutes: parsedDuration,
        durationSeconds: parsedDuration * 60,
        durationFormatted: `${String(Math.floor(parsedDuration / 60)).padStart(2, "0")} : ${String(parsedDuration % 60).padStart(2, "0")} : 00`,
        questions: qQuestions.map((q, idx) => ({
          id: `q_${Date.now()}_${idx}`,
          question: ensureMathDelimiters(q.question.trim()),
          options: q.options.map((o) => ensureMathDelimiters(o.trim())),
          type: q.type || "single",
          correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
          correctIndices:
            q.type === "multiple" && q.correctIndices && q.correctIndices.length > 0
              ? q.correctIndices
              : [q.correctIndex || 0],
          explanation: ensureMathDelimiters(q.explanation.trim()),
          image_url: q.image_url || q.imageUrl || null,
          imageUrl: q.imageUrl || q.image_url || undefined,
          optionImages: q.optionImages || q.option_images || [null, null, null, null],
          option_images: q.option_images || q.optionImages || [null, null, null, null],
        })),
      };
      roomRepo.insertQuiz(newQuiz);
      await saveQuizToFirebase(newQuiz);
      await notifyQuizPublished(newQuiz).catch(console.warn);
      await logAdminActionToFirebase(
        user?.displayName || "Massaw Seck",
        "CREATE_QUIZ",
        `Création du Quiz QCM : « ${newQuiz.title} » (${newQuiz.subject} - ${newQuiz.level})`,
        undefined,
        { quizId: newQuiz.id, questionsCount: newQuiz.questions.length }
      );
      setQTitle("");
      setQDuration("15");
      setQQuestions([
        {
          question: "",
          options: ["", "", "", ""],
          type: "single",
          correctIndex: 0,
          correctIndices: [0],
          explanation: "",
          image_url: null,
          imageUrl: null,
          optionImages: [null, null, null, null],
          option_images: [null, null, null, null],
          isUploadingOptionImage: [false, false, false, false],
        },
      ]);
      showToast(`Quiz QCM "${newQuiz.title}" créé avec succès !`);
      if (routerNavigate) {
        routerNavigate("/admin/quiz");
      }
    } catch (err) {
      console.error("Error creating quiz:", err);
      showToast("Erreur lors de la création du Quiz.", true);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Notification Broadcast State
  const [notifTarget, setNotifTarget] = useState<string>("all");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast("Titre et message obligatoires pour la notification.", true);
      return;
    }
    setIsSendingNotif(true);
    try {
      const notifId = "notif_admin_" + Date.now();
      const targetStudent = students.find((s) => s.uid === notifTarget);
      const newNotif: UserNotification = {
        id: notifId,
        target_uid: notifTarget,
        targetUid: notifTarget,
        userUid: notifTarget,
        userId: notifTarget,
        recipientId: notifTarget,
        targetRole: notifTarget === "all" ? "all" : "student",
        userName: targetStudent ? targetStudent.displayName : notifTarget === "all" ? "Tous les élèves" : "Élève",
        userEmail: targetStudent ? targetStudent.email : "",
        userPhone: targetStudent ? targetStudent.phone : "",
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: "admin_broadcast",
        status: "unread",
        createdAt: Date.now(),
        dateFormatted: `Aujourd'hui, ${new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      };
      roomRepo.insertNotification(newNotif);
      await saveNotificationToFirebase(newNotif);
      await logAdminActionToFirebase(
        user?.displayName || "Massaw Seck",
        "BROADCAST_NOTIFICATION",
        `Diffusion de notification : « ${newNotif.title} » (Destinataire: ${newNotif.targetRole === "all" ? "Tous les élèves" : newNotif.userName})`,
        notifTarget === "all" ? undefined : notifTarget,
        { title: newNotif.title, target: notifTarget }
      );
      setNotifTitle("");
      setNotifMessage("");
      showToast("Notification diffusée avec succès !");
    } catch (err) {
      console.error("Error sending notification:", err);
      showToast("Erreur lors de l'envoi de la notification.", true);
    } finally {
      setIsSendingNotif(false);
    }
  };

  // APK & App Update Form State (Synchronously initialized to avoid resetting on render/mount)
  const [updateVersion, setUpdateVersion] = useState<string>(() => {
    const cfg = getLocalAppConfig();
    return cfg?.latest_version || APP_VERSION;
  });
  const [updateApkUrl, setUpdateApkUrl] = useState<string>(() => {
    const cfg = getLocalAppConfig();
    return cfg?.apk_url || "";
  });
  const [updateMessage, setUpdateMessage] = useState<string>(() => {
    const cfg = getLocalAppConfig();
    return cfg?.message || "Une nouvelle version de l'application Génie Mentor Académie est disponible avec de superbes améliorations.";
  });
  const [isSavingAppConfig, setIsSavingAppConfig] = useState(false);

  // Load saved APK & App update configuration on mount to prevent field resetting
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const localCfg = getLocalAppConfig();
        if (isMounted && localCfg) {
          if (localCfg.latest_version) setUpdateVersion(localCfg.latest_version);
          if (localCfg.apk_url) setUpdateApkUrl(localCfg.apk_url);
          if (localCfg.message) setUpdateMessage(localCfg.message);
        }

        const remoteCfg = await getAppConfigFromSupabase();
        if (isMounted && remoteCfg) {
          if (remoteCfg.latest_version || remoteCfg.globalVersion) {
            setUpdateVersion(remoteCfg.latest_version || remoteCfg.globalVersion || APP_VERSION);
          }
          if (remoteCfg.apk_url) {
            setUpdateApkUrl(remoteCfg.apk_url);
          }
          if (remoteCfg.message) {
            setUpdateMessage(remoteCfg.message);
          }
          saveLocalAppConfig(remoteCfg);
        }
      } catch (err) {
        console.warn("[AdminPage] Error loading app config:", err);
      }
    };

    loadConfig();
    syncFaviconWithRemote().catch((err) => console.warn(err?.message || err));
    syncSignatureWithRemote().catch((err) => console.warn(err?.message || err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Logo State & Reactive Synchronization
  const reactiveLogo = useAppLogo();
  const [logoPreview, setLogoPreview] = useState(() => reactiveLogo);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  useEffect(() => {
    if (reactiveLogo) {
      setLogoPreview(reactiveLogo);
    }
  }, [reactiveLogo]);

  // Favicon State (32x32 / .ico / .png)
  const reactiveFavicon = useFavicon();
  const [faviconPreview, setFaviconPreview] = useState(() => reactiveFavicon);
  const [isSavingFavicon, setIsSavingFavicon] = useState(false);

  useEffect(() => {
    if (reactiveFavicon) {
      setFaviconPreview(reactiveFavicon);
    }
  }, [reactiveFavicon]);

  // Logo PWA 192x192 (Écran d'accueil & APK)
  const reactivePwa192 = usePwaIcon192();
  const [pwa192Preview, setPwa192Preview] = useState(() => reactivePwa192);
  const [isSavingPwa192, setIsSavingPwa192] = useState(false);

  useEffect(() => {
    if (reactivePwa192) {
      setPwa192Preview(reactivePwa192);
    }
  }, [reactivePwa192]);

  // Logo PWA 512x512 (Splashscreen & haute résolution APK)
  const reactivePwa512 = usePwaIcon512();
  const [pwa512Preview, setPwa512Preview] = useState(() => reactivePwa512);
  const [isSavingPwa512, setIsSavingPwa512] = useState(false);

  useEffect(() => {
    if (reactivePwa512) {
      setPwa512Preview(reactivePwa512);
    }
  }, [reactivePwa512]);

  // URL inputs states for manual URL customization
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [faviconUrlInput, setFaviconUrlInput] = useState("");
  const [pwa192UrlInput, setPwa192UrlInput] = useState("");
  const [pwa512UrlInput, setPwa512UrlInput] = useState("");

  // Official Signature State & Reactive Synchronization
  const reactiveSignature = useOfficialSignature();
  const [signaturePreview, setSignaturePreview] = useState(() => reactiveSignature);
  const [isSavingSignature, setIsSavingSignature] = useState(false);

  useEffect(() => {
    if (reactiveSignature) {
      setSignaturePreview(reactiveSignature);
    }
  }, [reactiveSignature]);

  // Admin Password Change State (avec vérification obligatoire du mot de passe actuel)
  const [currentAdminPassword, setCurrentAdminPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [showCurrentAdminPassword, setShowCurrentAdminPassword] = useState(false);
  const [showAdminPasswordInput, setShowAdminPasswordInput] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOld = currentAdminPassword.trim();
    const cleanNew = newAdminPassword.trim();
    const cleanConfirm = confirmAdminPassword.trim();

    // 1. Re-vérification OBLIGATOIRE du mot de passe actuel auprès de Supabase
    if (!cleanOld) {
      showToast("Veuillez obligatoirement saisir votre mot de passe administrateur actuel.", true);
      return;
    }

    setIsChangingPassword(true);

    try {
      let isOldValid = false;
      const cleanEmail = (user?.email || "massperpendiculaire@gmail.com").trim().toLowerCase();

      // Vérification auprès de Supabase Auth
      if (supabase && cleanEmail) {
        try {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanOld,
          });
          if (!signInErr) {
            isOldValid = true;
          }
        } catch (authErr) {
          console.warn("Supabase admin auth verification notice:", authErr);
        }
      }

      // Vérification de secours locale si hors-ligne
      if (!isOldValid) {
        const savedPass = roomRepo.getAdminPassword();
        if (cleanOld === savedPass || cleanOld === "Perpendiculaire @2026" || cleanOld === "Perpendiculaire@2026") {
          isOldValid = true;
        }
      }

      if (!isOldValid) {
        setIsChangingPassword(false);
        showToast("Mot de passe actuel incorrect. Vérification d'identité refusée.", true);
        return;
      }

      // 2. Validation stricte de la complexité du nouveau mot de passe
      const complexity = validatePasswordComplexity(cleanNew);
      if (!complexity.isValid) {
        setIsChangingPassword(false);
        showToast("Le nouveau mot de passe doit comporter au moins 6 caractères, une majuscule, une minuscule et un chiffre.", true);
        return;
      }

      if (cleanNew !== cleanConfirm) {
        setIsChangingPassword(false);
        showToast("Les deux nouveaux mots de passe ne correspondent pas.", true);
        return;
      }

      if (cleanOld === cleanNew) {
        setIsChangingPassword(false);
        showToast("Le nouveau mot de passe doit être différent du mot de passe actuel.", true);
        return;
      }

      // 3. Mise à jour dans Supabase Auth
      if (supabase) {
        const { error: updateErr } = await supabase.auth.updateUser({
          password: cleanNew,
        });
        if (updateErr && !updateErr.message?.includes("should be different")) {
          throw updateErr;
        }
      }

      // 4. Mise à jour de la persistance locale
      roomRepo.setAdminPassword(cleanNew);
      await updateUserPasswordFirebase(cleanNew).catch(() => {});
      setCurrentAdminPassword("");
      setNewAdminPassword("");
      setConfirmAdminPassword("");
      showToast("Mot de passe Administrateur vérifié et mis à jour avec succès !");
    } catch (err: any) {
      console.error("Error changing admin password:", err);
      showToast(err?.message || "Erreur lors de la modification du mot de passe.", true);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Computed counts for badges
  const pendingClassRequestsCount = classRequests.filter((r) => {
    const s = (r.status || "").toLowerCase().trim();
    return s === "pending" || s === "en_attente" || s === "en attente" || (s !== "approved" && s !== "rejected" && s !== "valide" && s !== "refuse");
  }).length;

  const tabsConfig: Array<{
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard size={15} /> },
    {
      id: "vip_validation",
      label: "Validation VIP",
      icon: <Sparkles size={15} className="text-amber-400" />,
      badge: vipPendingCount,
      badgeColor: "bg-amber-400 text-slate-950 font-black",
    },
    {
      id: "class_requests",
      label: "Changement de Classe",
      icon: <GraduationCap size={15} className="text-emerald-400" />,
      badge: pendingClassRequestsCount,
      badgeColor: "bg-rose-500 text-white font-black",
    },
    { id: "caisse", label: "Caisse & Trésorerie", icon: <Building2 size={15} /> },
    {
      id: "students",
      label: "Élèves & Suivi",
      icon: <Users size={15} />,
      badge: students.length,
      badgeColor: "bg-indigo-700 text-white font-bold",
    },
    {
      id: "homework",
      label: "Devoirs & TD",
      icon: <FileCheck size={15} />,
      badge: homeworkPendingCount,
      badgeColor: "bg-amber-500 text-slate-950 font-black",
    },
    {
      id: "tutorials",
      label: "Tutoriels Vidéos",
      icon: <Video size={15} className="text-amber-400" />,
      badge: roomRepo.getAllTutorials().length,
      badgeColor: "bg-amber-400 text-slate-950 font-black",
    },
    { id: "global_edit", label: "Édition Globale", icon: <Edit3 size={15} /> },
    { id: "pricing", label: "Gestion Tarifs", icon: <Coins size={15} /> },
    {
      id: "courses",
      label: "Cours Rédigés",
      icon: <BookOpen size={15} />,
      badge: courses.length,
      badgeColor: "bg-slate-700 text-slate-200",
    },
    {
      id: "assets",
      label: "Épreuves & Fichiers",
      icon: <FolderOpen size={15} />,
      badge: assets.length,
      badgeColor: "bg-slate-700 text-slate-200",
    },
    {
      id: "quizzes",
      label: "Quiz & QCM",
      icon: <HelpCircle size={15} />,
      badge: quizzes.length,
      badgeColor: "bg-slate-700 text-slate-200",
    },
    { id: "ai_assistant", label: "Assistant IA Admin", icon: <Sparkles size={15} /> },
    { id: "audit_logs", label: "Journal Sécurité & Audit", icon: <ShieldCheck size={15} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={15} /> },
    { id: "settings", label: "Paramètres & APK", icon: <Settings size={15} /> },
  ];

  return (
    <div className="h-[100dvh] w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden select-none selection:bg-amber-400 selection:text-slate-950">
      {/* 1. TOP DEDICATED HEADER */}
      <header className="bg-slate-950 border-b border-slate-800 text-white shrink-0 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          {/* Left: Branding & Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <AppLogo
              customUrl={logoPreview}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-amber-400 shadow-md shrink-0"
              alt="Génie Mentor Académie Logo"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  Administration Génie Mentor Académie (GMA)
                </h1>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase shrink-0">
                  Directeur
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Massaw Seck • Panneau de Contrôle Central
              </p>
            </div>
          </div>

          {/* Right: Quick Tools & Back Button */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Bouton d'Actualisation Globale Synchrone */}
            <button
              type="button"
              onClick={handleGlobalSyncAll}
              disabled={isGlobalSyncing}
              className="px-3 sm:px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5 shrink-0 disabled:opacity-50"
              title="Forcer le rechargement synchrone de tous les états (Changements de classe, Paiements, VIP, Caisse, Élèves)"
            >
              <RefreshCw size={14} className={isGlobalSyncing ? "animate-spin text-amber-300" : ""} />
              <span className="hidden sm:inline">{isGlobalSyncing ? "Actualisation..." : "Actualisation Globale"}</span>
              <span className="sm:hidden">{isGlobalSyncing ? "..." : "Actualiser"}</span>
            </button>

            {onOpenCodeViewer && (
              <button
                type="button"
                onClick={onOpenCodeViewer}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                title="Inspecteur Code Kotlin"
              >
                <Code2 size={15} />
                <span>Code Kotlin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateHome}
              className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5 shrink-0"
              title="Quitter l'administration et retourner à l'application"
            >
              <ArrowLeft size={16} />
              <span className="hidden xs:inline">Retour à l'Application</span>
              <span className="xs:hidden">Retour</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. RESPONSIVE HORIZONTAL SCROLLABLE TABS BAR */}
      <nav className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shrink-0 z-20 overflow-x-auto scrollbar-none">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 flex items-center space-x-1 sm:space-x-1.5 py-2 min-w-max">
          {tabsConfig.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-amber-400 text-slate-950 shadow-md font-black"
                    : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] leading-tight ${
                      isActive
                        ? "bg-slate-950 text-amber-400 font-black"
                        : tab.badgeColor || "bg-amber-400 text-slate-950"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. GLOBAL FEEDBACK TOAST BANNER */}
      {successMsg && (
        <div className="bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2.5 text-center shrink-0 flex items-center justify-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-500 text-white font-black text-xs px-4 py-2.5 text-center shrink-0 flex items-center justify-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4. MAIN FULL-WIDTH SCROLLABLE CONTENT */}
      <main key={activeTab} className="flex-1 w-full overflow-y-auto overflow-x-hidden p-3 sm:p-6 max-w-5xl mx-auto pb-32 sm:pb-24 -webkit-overflow-scrolling-touch animate-page-enter">
        {/* TOP VISUAL CLASS FILTER TOOLBAR (For Directeur / Admin - Pure visual filter, never alters admin profile) */}
        {activeTab !== "ai_assistant" && activeTab !== "audit_logs" && activeTab !== "settings" && activeTab !== "notifications" && activeTab !== "pricing" && (
          <div className="mb-5 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-amber-400/20 text-amber-400 rounded-lg">
                  <GraduationCap size={16} />
                </span>
                <span className="text-xs font-black text-white">
                  Filtre Visuel de Classe :
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {globalClassFilter === "ALL" ? "Toutes les classes" : `Classe : ${globalClassFilter}`}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>Filtre d'affichage uniquement (Votre rôle Administrateur est préservé)</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
              <button
                type="button"
                onClick={() => handleApplyVisualClassFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  globalClassFilter === "ALL"
                    ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                Toutes les classes
              </button>
              {ALL_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleApplyVisualClassFilter(lvl)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                    globalClassFilter === lvl
                      ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold">Total Élèves</span>
                  <Users size={18} className="text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white">{students.length}</div>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>En temps réel Firestore</span>
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold">Solde Caisse</span>
                  <Building2 size={18} className="text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  {caisseBalance.toLocaleString("fr-FR")} F
                </div>
                <p className="text-[11px] text-slate-400">Trésorerie active</p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold">Paiements VIP</span>
                  <Sparkles size={18} className="text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400">{vipPendingCount}</div>
                <p className="text-[11px] text-slate-400">En attente de validation</p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-1 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold">Changements Classe</span>
                  <GraduationCap size={18} className="text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-400">
                  {pendingClassRequestsCount}
                </div>
                <p className="text-[11px] text-slate-400">Demandes en attente</p>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
                <Sparkles size={16} className="text-amber-400" />
                <span>Raccourcis & Actions Rapides</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("vip_validation")}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-400/40 hover:border-amber-400 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-white text-xs group-hover:text-amber-300">
                      Valider les Pass VIP
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {vipPendingCount} demande(s) en attente
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("class_requests")}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-indigo-400/40 hover:border-indigo-400 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-white text-xs group-hover:text-indigo-300">
                      Changement de Classe
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {pendingClassRequestsCount} demande(s) en attente
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-indigo-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("caisse")}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-emerald-400/40 hover:border-emerald-400 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-white text-xs group-hover:text-emerald-300">
                      Caisse & Trésorerie
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Solde : {caisseBalance.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("courses")}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-white text-xs">Rédiger un Cours</p>
                    <p className="text-[11px] text-slate-400">{courses.length} cours en ligne</p>
                  </div>
                  <Plus size={18} className="text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("assets")}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-white text-xs">Uploader une Épreuve</p>
                    <p className="text-[11px] text-slate-400">{assets.length} épreuves / TD</p>
                  </div>
                  <Upload size={18} className="text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("notifications")}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-white text-xs">Diffuser un Message</p>
                    <p className="text-[11px] text-slate-400">À tous les élèves ou ciblé</p>
                  </div>
                  <Send size={18} className="text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("ai_assistant")}
                  className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950/80 hover:bg-slate-800 border border-amber-400/50 hover:border-amber-400 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between group col-span-1 sm:col-span-2 lg:col-span-3 shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-black text-white text-xs group-hover:text-amber-300">
                          Assistant IA Admin (Co-pilote Gemini Flash 2.5)
                        </p>
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase">
                          Actif
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Génération automatique de Quiz, Cours complets, Exercices corrigés & Annonces avec support LaTeX
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Quick Students Summary */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Users size={16} className="text-indigo-400" />
                  <span>Derniers Élèves Inscrits</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("students")}
                  className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                >
                  Voir tous les élèves ({students.length}) →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {students.slice(0, 6).map((std) => {
                  const studentMatricule = std.matricule || std.studentId || getUserStudentId(std);
                  return (
                    <div
                      key={std.uid}
                      onClick={() => setSelectedStudentForDetail(std)}
                      className="p-3 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-400/60 rounded-xl flex items-center space-x-3 text-xs cursor-pointer transition-all group shadow-xs"
                      title="Cliquer pour afficher toutes les informations de l'élève"
                    >
                      <img
                        src={std.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                        alt={std.displayName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-600 group-hover:border-amber-400 transition-colors"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-white truncate group-hover:text-amber-300">
                          {std.displayName}
                        </p>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                          <span className="text-amber-300 font-bold">{std.level}</span>
                          <span className="text-slate-500 font-mono text-[10px]">#{studentMatricule}</span>
                          {std.isVIP && (
                            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black rounded-sm text-[9px]">
                              VIP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: VIP VALIDATION */}
        {activeTab === "vip_validation" && <AdminPaymentValidation />}

        {/* TAB: CLASS CHANGE REQUESTS */}
        {activeTab === "class_requests" && <AdminClassChangeValidation />}

        {/* TAB: CAISSE */}
        {activeTab === "caisse" && <ModuleCaisseAdmin />}

        {/* TAB: STUDENTS */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Users className="text-indigo-400" size={20} />
                  <h3 className="text-base font-black text-white">
                    Registre des Élèves Inscrits ({students.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  Consultez les informations de profil, la classe active, le statut VIP et l'historique
                  complet des notes QCM de chaque élève.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRefreshStudents}
                  disabled={isRefreshingStudents}
                  className="px-3.5 py-2 bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 hover:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
                  title="Rafraîchir les données Firestore"
                >
                  <RefreshCw size={14} className={isRefreshingStudents ? "animate-spin text-amber-300" : ""} />
                  <span>{isRefreshingStudents ? "Actualisation..." : "Actualiser la liste"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePurgeNonAdminStudents}
                  disabled={isPurgingStudents}
                  className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <Trash2 size={14} />
                  <span>{isPurgingStudents ? "Purge..." : "Purger les comptes de test"}</span>
                </button>
              </div>
            </div>

            {/* Real-time Connected Users Reader & Filter Dashboard */}
            {(() => {
              const now = currentTime;
              const onlineCount = students.filter(
                (s) => s.status === "En ligne" || Boolean(s.lastSeen && now - s.lastSeen < 5 * 60 * 1000)
              ).length;
              const googleCount = students.filter(
                (s) => s.authProvider === "google" || (s.email && s.email.toLowerCase().includes("@gmail.com"))
              ).length;
              const emailCount = students.length - googleCount;

              return (
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                        Lecteur de Présence en Temps Réel (Tous Modes de Connexion)
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Synchronisation Supabase & Room DB active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setStudentAuthFilter("ALL")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        studentAuthFilter === "ALL"
                          ? "bg-indigo-900/90 border-amber-400 text-white shadow-md font-bold"
                          : "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 block font-medium">Tous les Élèves</span>
                      <span className="text-base font-black text-amber-300">{students.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentAuthFilter("ONLINE")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        studentAuthFilter === "ONLINE"
                          ? "bg-emerald-950/80 border-emerald-400 text-white shadow-md font-bold"
                          : "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 block font-bold">🟢 En Ligne Direct</span>
                      </div>
                      <span className="text-base font-black text-emerald-400">{onlineCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentAuthFilter("GOOGLE")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        studentAuthFilter === "GOOGLE"
                          ? "bg-rose-950/80 border-rose-400 text-white shadow-md font-bold"
                          : "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <span className="text-[10px] text-rose-300 block font-medium">🔴 Comptes Google</span>
                      <span className="text-base font-black text-rose-400">{googleCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentAuthFilter("EMAIL")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        studentAuthFilter === "EMAIL"
                          ? "bg-blue-950/80 border-blue-400 text-white shadow-md font-bold"
                          : "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <span className="text-[10px] text-blue-300 block font-medium">📧 Inscription Directe</span>
                      <span className="text-base font-black text-blue-400">{emailCount}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Rechercher par nom, email, matricule..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <select
                value={studentLevelFilter}
                onChange={(e) => setStudentLevelFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-amber-400 focus:outline-hidden"
              >
                <option value="ALL">Toutes les classes</option>
                {ALL_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Students Cards List */}
            {isRefreshingStudents ? (
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-10 text-center space-y-3">
                <RefreshCw size={32} className="animate-spin text-amber-400 mx-auto" />
                <p className="text-sm font-bold text-white">Actualisation des données en direct depuis Firestore...</p>
                <p className="text-xs text-slate-400">Veuillez patienter pendant la synchronisation des fiches élèves.</p>
              </div>
            ) : (() => {
              const now = currentTime;
              const filteredList = students.filter((s) => {
                const matchSearch =
                  (s.displayName || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
                  (s.email || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
                  (s.matricule || "").toLowerCase().includes(studentSearch.toLowerCase());
                const matchLevel =
                  studentLevelFilter === "ALL" ||
                  s.classe === studentLevelFilter ||
                  s.level === studentLevelFilter ||
                  (Boolean(s.classe) && s.classe?.trim().toLowerCase() === studentLevelFilter.trim().toLowerCase()) ||
                  (Boolean(s.level) && s.level?.trim().toLowerCase() === studentLevelFilter.trim().toLowerCase());
                
                const isOnline = s.status === "En ligne" || Boolean(s.lastSeen && now - s.lastSeen < 5 * 60 * 1000);
                const isGoogle = s.authProvider === "google" || (s.email && s.email.toLowerCase().includes("@gmail.com"));

                let matchAuth = true;
                if (studentAuthFilter === "ONLINE") matchAuth = isOnline;
                if (studentAuthFilter === "GOOGLE") matchAuth = isGoogle;
                if (studentAuthFilter === "EMAIL") matchAuth = !isGoogle;

                return matchSearch && matchLevel && matchAuth;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-10 text-center space-y-3">
                    <Users size={32} className="text-slate-500 mx-auto" />
                    <h4 className="text-sm font-bold text-white">Aucun élève trouvé</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {students.length === 0
                        ? "Aucun compte élève enregistré pour le moment. Cliquez sur « Actualiser » pour vérifier Firestore ou inscrivez un nouvel élève."
                        : `Aucun élève ne correspond aux filtres sélectionnés.`}
                    </p>
                    {students.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentSearch("");
                          setStudentLevelFilter("ALL");
                          setStudentAuthFilter("ALL");
                        }}
                        className="px-4 py-2 bg-indigo-900 text-amber-300 rounded-xl text-xs font-bold hover:bg-indigo-800 transition-colors"
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredList.map((std) => {
                    const studentMatricule = std.matricule || std.studentId || getUserStudentId(std);
                    const distinctQuizzes = getDistinctQuizResults(std.quizResults);
                    const avgScore = calculateStudentQuizAverage(std.quizResults);
                    const isOnline = std.status === "En ligne" || Boolean(std.lastSeen && now - std.lastSeen < 5 * 60 * 1000);
                    const isGoogle = std.authProvider === "google" || (std.email && std.email.toLowerCase().includes("@gmail.com"));

                    return (
                      <div
                        key={std.uid}
                        className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-amber-400/50 rounded-2xl p-4 space-y-3 shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            onClick={() => setSelectedStudentForDetail(std)}
                            className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer group"
                          >
                            <div className="relative shrink-0">
                              <img
                                src={
                                  std.avatarUrl ||
                                  std.photoUrl ||
                                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                                }
                                alt={std.displayName}
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-600 group-hover:border-amber-400 transition-colors"
                                referrerPolicy="no-referrer"
                              />
                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                                  isOnline
                                    ? "bg-emerald-500 animate-pulse"
                                    : "bg-slate-500"
                                }`}
                                title={isOnline ? "En ligne actuellement" : "Hors ligne"}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-extrabold text-white text-sm truncate group-hover:text-amber-300">
                                  {std.displayName}
                                </p>
                                <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-bold border border-slate-700 shrink-0">
                                  #{studentMatricule}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{std.email}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 font-bold rounded text-[10px]">
                                  Classe de {std.classe || std.level}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                                    isGoogle
                                      ? "bg-rose-950/80 border-rose-700 text-rose-300"
                                      : "bg-blue-950/80 border-blue-700 text-blue-300"
                                  }`}
                                >
                                  {isGoogle ? "🔴 Google" : "📧 Email"}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    isOnline
                                      ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                                      : "bg-slate-700/50 text-slate-400"
                                  }`}
                                >
                                  {isOnline ? "● En ligne" : "Hors ligne"}
                                </span>
                                {std.isVIP && (
                                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded text-[10px]">
                                    VIP {std.vipPlan || "Actif"}
                                  </span>
                                )}
                                {std.phone && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {std.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setStudentToDelete(std)}
                            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-xl border border-rose-900/60 transition-colors cursor-pointer shrink-0"
                            title="Supprimer cet élève"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Summary Badges, Distinct Quizzes List & Quick Detail View Button */}
                        <div className="pt-2 border-t border-slate-700/60 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 flex-wrap">
                              <span className="font-semibold text-amber-300">
                                {distinctQuizzes.length} QCM validé{distinctQuizzes.length > 1 ? "s" : ""}
                              </span>
                              {avgScore !== null && (
                                <>
                                  <span>•</span>
                                  <span className={`font-bold ${avgScore >= 10 ? "text-emerald-400" : "text-amber-400"}`}>
                                    Moyenne : {avgScore}/20
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span>{std.homeworkGrades?.length || 0} Devoir{std.homeworkGrades?.length !== 1 ? "s" : ""}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForDetail(std)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-amber-400 border border-amber-400/30 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1 shrink-0"
                            >
                              <span>Dossier</span>
                              <span>→</span>
                            </button>
                          </div>

                          {/* Distinct Quiz Results List with Marks */}
                          {distinctQuizzes.length > 0 && (
                            <div className="pt-1 border-t border-slate-800/80">
                              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                                {distinctQuizzes.map((quiz) => {
                                  const mark20 = quiz.score20 ?? (quiz.scorePercentage ? Math.round((quiz.scorePercentage / 5) * 10) / 10 : 0);
                                  const isPass = mark20 >= 10;
                                  return (
                                    <span
                                      key={quiz.id || quiz.quizId}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px]"
                                      title={`${quiz.quizTitle} (${quiz.subject || "Général"}) - Note: ${mark20}/20`}
                                    >
                                      <span className="text-slate-300 truncate max-w-[120px] font-medium">
                                        {quiz.quizTitle}
                                      </span>
                                      <span className={`font-black ${isPass ? "text-emerald-400" : "text-rose-400"}`}>
                                        {mark20}/20
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB: HOMEWORK */}
        {activeTab === "homework" && <AdminHomeworkManagement />}

        {/* TAB: TUTORIALS */}
        {activeTab === "tutorials" && (
          <AdminTutorialsManagement onSuccessMessage={(msg) => showToast(msg)} />
        )}

        {/* TAB: GLOBAL EDIT */}
        {activeTab === "global_edit" && (
          <form
            onSubmit={handleSaveGlobalConfig}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md text-xs"
          >
            <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
              <Edit3 className="text-amber-400" size={20} />
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Édition Globale de l'Application
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Configurez le bandeau d'annonces, le numéro WhatsApp et les paramètres publics.
                </p>
              </div>
            </div>

            <div>
              <label className="font-extrabold text-slate-300 block mb-1.5">
                Bandeau d'Annonce Flash (Accueil de tous les élèves)
              </label>
              <textarea
                rows={3}
                value={globalAnnouncement}
                onChange={(e) => setGlobalAnnouncement(e.target.value)}
                placeholder="Ex : Réouverture des inscriptions aux cours de renforcement ce samedi 10h !"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-extrabold text-slate-300 block mb-1.5">
                  Numéro WhatsApp de Support / Direction
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={globalSupportPhone}
                    onChange={(e) => setGlobalSupportPhone(e.target.value)}
                    placeholder="Ex : 783769584"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-300 block mb-1.5">
                  Tarif Référence Pass VIP (FCFA)
                </label>
                <input
                  type="number"
                  value={globalVipPrice}
                  onChange={(e) => setGlobalVipPrice(e.target.value)}
                  placeholder="5000"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingGlobalConfig}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              {isSavingGlobalConfig ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Enregistrer et Publier sur Firestore</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB: PRICING */}
        {activeTab === "pricing" && <AdminPricingManagement />}

        {/* TAB: COURSES */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            {/* Form */}
            <form
              onSubmit={handleCreateCourse}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md text-xs"
            >
              <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                <BookOpen className="text-amber-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Rédiger un Nouveau Cours / Leçon
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Ajoutez une leçon complète accessible hors-ligne pour la classe sélectionnée.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Classe / Niveau</label>
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-bold text-amber-300 focus:border-amber-400 focus:outline-hidden"
                  >
                    {ALL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Matière</label>
                  <select
                    value={cSubject}
                    onChange={(e) => setCSubject(e.target.value as Subject)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-bold text-white focus:border-amber-400 focus:outline-hidden"
                  >
                    {getSubjectsForLevel(cLevel).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Titre de la Leçon</label>
                  <input
                    type="text"
                    required
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    placeholder="Ex : Théorème de Pythagore et Réciproque"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Chapitre</label>
                  <input
                    type="text"
                    required
                    value={cChapter}
                    onChange={(e) => setCChapter(e.target.value)}
                    placeholder="Ex : Chapitre 3 : Géométrie Plane"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-300 block mb-1">Résumé / Synthèse</label>
                <textarea
                  rows={2}
                  required
                  value={cSummary}
                  onChange={(e) => setCSummary(e.target.value)}
                  placeholder="Bref résumé des compétences et notions clés..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-hidden resize-none"
                />
              </div>

              {/* PDF / Document Integration Field */}
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-amber-300 text-xs flex items-center space-x-1.5">
                    <BookOpen size={14} className="text-amber-400" />
                    <span>Lien du document / Support PDF (Optionnel)</span>
                  </label>
                  {cPdfUrl && (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold px-2 py-0.5 rounded-md">
                      {cPdfFileName || "Document lié"}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="url"
                    value={cPdfUrl}
                    onChange={(e) => setCPdfUrl(e.target.value)}
                    placeholder="https://mon-serveur.com/cours.pdf ou lien du document"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-[11px] focus:border-amber-400 focus:outline-hidden"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 transition-colors">
                      <Upload size={13} className="text-amber-400" />
                      <span>{isUploadingCoursePdf ? `Envoi en cours (${coursePdfProgress}%)...` : "Téléverser un PDF local"}</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleCourseFileUpload}
                        className="hidden"
                      />
                    </label>

                    <span className="text-[10px] text-slate-400 font-medium">
                      Format PDF supporté jusqu'à 30 Mo
                    </span>

                    {cPdfUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setCPdfUrl("");
                          setCPdfFileName("");
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[11px] font-bold underline cursor-pointer"
                      >
                        Retirer le document
                      </button>
                    )}
                  </div>

                  {isUploadingCoursePdf && (
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-1.5 transition-all duration-300 rounded-full"
                        style={{ width: `${coursePdfProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* MathLive WYSIWYG Editor & Detailed Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-300 block">
                    Contenu Détaillé du Cours (Texte rédigé & Formules Mathématiques)
                  </label>
                  <span className="text-[10px] font-bold text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Clavier WYSIWYG MathLive
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-700">
                  <MathLiveEditor
                    value={courseMathFormula}
                    onChange={setCourseMathFormula}
                    onInsertToContent={(snip) => setCContent((prev) => prev + (prev.endsWith("\n") || !prev ? "" : " ") + snip)}
                    placeholder="Composer ou insérer une formule visuelle dans le cours..."
                  />
                </div>

                <textarea
                  rows={7}
                  value={cContent}
                  onChange={(e) => setCContent(e.target.value)}
                  placeholder="Rédigez ici le cours complet. Les formules insérées s'affichent automatiquement avec KaTeX / MathLive..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-[11px] focus:border-amber-400 focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingCourse}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSubmittingCourse ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Création en cours...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Créer et Publier le Cours</span>
                  </>
                )}
              </button>
            </form>

            {/* List */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                  Cours Déjà Publiés ({courses.length})
                </h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Filtrer les cours..."
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <select
                    value={courseLevelFilter}
                    onChange={(e) => setCourseLevelFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white"
                  >
                    <option value="ALL">Tous</option>
                    {ALL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {courses
                  .filter((c) => {
                    const mSearch =
                      (c.title || "").toLowerCase().includes(courseSearch.toLowerCase()) ||
                      (c.chapter || "").toLowerCase().includes(courseSearch.toLowerCase());
                    const mLevel =
                      courseLevelFilter === "ALL" || c.level === courseLevelFilter;
                    return mSearch && mLevel;
                  })
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 font-black rounded text-[10px]">
                            {c.level}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 font-bold rounded text-[10px]">
                            {c.subject}
                          </span>
                          <span className="font-extrabold text-white truncate">{c.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{c.chapter}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingCourse(c)}
                          className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Supprimer le cours "${c.title}" ?`)) {
                              roomRepo.deleteCourse(c.id);
                              await deleteCourseFromFirebase(c.id);
                              showToast("Cours supprimé avec succès !");
                            }
                          }}
                          className="p-2 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: ASSETS */}
        {activeTab === "assets" && (
          <div className="space-y-6">
            {/* Form */}
            <form
              onSubmit={handleCreateAsset}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md text-xs"
            >
              <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                <FolderOpen className="text-amber-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Uploader une Épreuve / Fiche de TD / Concours
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Fichiers PDF, épreuves de concours ou séries d'exercices à télécharger.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Classe / Niveau</label>
                  <select
                    value={aLevel}
                    onChange={(e) => setALevel(e.target.value as SecondaryLevel)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-bold text-amber-300 focus:border-amber-400 focus:outline-hidden"
                  >
                    {ALL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Matière</label>
                  <select
                    value={aSubject}
                    onChange={(e) => setASubject(e.target.value as Subject)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-bold text-white focus:border-amber-400 focus:outline-hidden"
                  >
                    {ALL_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Type de Document</label>
                  <select
                    value={aType}
                    onChange={(e) => setAType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-bold text-white focus:border-amber-400 focus:outline-hidden"
                  >
                    <option value="exam">Épreuve / Examen Officiel</option>
                    <option value="concours">Concours d'Excellence (VIP)</option>
                    <option value="exercise">Fiche de TD / Exercices</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">
                    Titre du Document
                  </label>
                  <input
                    type="text"
                    required
                    value={aTitle}
                    onChange={(e) => setATitle(e.target.value)}
                    placeholder="Ex : BFEM 2024 Épreuve Officielle Mathématiques"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">
                    Lien Téléchargement PDF / URL directe
                  </label>
                  <input
                    type="url"
                    value={aPdfUrl}
                    onChange={(e) => setAPdfUrl(e.target.value)}
                    placeholder="https://domaine.com/fichier.pdf (optionnel)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-[11px] focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={aDescription}
                  onChange={(e) => setADescription(e.target.value)}
                  placeholder="Détails, barème, corrigé inclus..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingAsset}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSubmittingAsset ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Upload en cours...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Publier l'Épreuve</span>
                  </>
                )}
              </button>
            </form>

            {/* List */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                  Documents & Épreuves Déjà Publiés ({assets.length})
                </h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Filtrer les épreuves..."
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <select
                    value={assetLevelFilter}
                    onChange={(e) => setAssetLevelFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white"
                  >
                    <option value="ALL">Tous</option>
                    {ALL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {assets
                  .filter((a) => {
                    const mSearch =
                      (a.name || "").toLowerCase().includes(assetSearch.toLowerCase()) ||
                      (a.subject || "").toLowerCase().includes(assetSearch.toLowerCase()) ||
                      (a.storagePath || "").toLowerCase().includes(assetSearch.toLowerCase());
                    const mLevel =
                      assetLevelFilter === "ALL" || a.level === assetLevelFilter;
                    return mSearch && mLevel;
                  })
                  .map((a) => (
                    <div
                      key={a.assetId}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 font-black rounded text-[10px]">
                            {a.level}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 font-bold rounded text-[10px]">
                            {a.subject}
                          </span>
                          <span className="font-extrabold text-white truncate">{a.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{a.description}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingAsset(a)}
                          className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Supprimer l'épreuve "${a.title}" ?`)) {
                              roomRepo.deleteAsset(a.assetId);
                              await deleteAssetFromFirebase(a.assetId);
                              showToast("Épreuve supprimée avec succès !");
                            }
                          }}
                          className="p-2 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: QUIZZES */}
        {activeTab === "quizzes" && (
          <div className="space-y-6">
            {/* SOUS-NAVIGATION DANS L'ONGLET QUIZ : NAVIGATION VISIBLE EN HAUT */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between flex-wrap gap-2 shadow-sm">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => routerNavigate ? routerNavigate("/admin/quiz") : null}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                    currentPath !== "/admin/quiz/nouveau"
                      ? "bg-amber-400 text-slate-950 font-black shadow-md"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <HelpCircle size={15} />
                  <span>Banque des Quiz ({quizzes.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => routerNavigate ? routerNavigate("/admin/quiz/nouveau") : null}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                    currentPath === "/admin/quiz/nouveau"
                      ? "bg-amber-400 text-slate-950 font-black shadow-md"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <Sparkles size={15} className={currentPath === "/admin/quiz/nouveau" ? "text-slate-950" : "text-amber-400"} />
                  <span>+ Créateur de Quiz (Éditeur Visuel WYSIWYG)</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                {currentPath === "/admin/quiz/nouveau"
                  ? "Formulaire avec éditeur WYSIWYG MathLive & mhchem"
                  : "Consultation et gestion des quiz"}
              </span>
            </div>

            {currentPath === "/admin/quiz/nouveau" ? (
              /* ISOLATED FORM VIEW: /admin/quiz/nouveau */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-md">
                  <button
                    type="button"
                    onClick={() => routerNavigate ? routerNavigate("/admin/quiz") : null}
                    className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Retour aux Quiz QCM</span>
                  </button>
                  <span className="text-xs font-bold text-amber-300">Formulaire Nouveau Quiz</span>
                </div>

                <form
                  onSubmit={handleCreateQuiz}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md text-xs"
                >
                  <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                    <HelpCircle className="text-amber-400" size={20} />
                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        Créateur de Quiz QCM Évaluatif (LaTeX KaTeX & MathLive WYSIWYG)
                      </h3>
                      <p className="text-slate-400 text-[11px]">
                        Créez des questionnaires interactifs à choix multiples avec explications détaillées et formules mathématiques.
                      </p>
                    </div>
                  </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Classe / Niveau</label>
                  <select
                    value={qLevel}
                    onChange={(e) => setQLevel(e.target.value as SecondaryLevel)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-bold text-amber-300 focus:border-amber-400 focus:outline-hidden"
                  >
                    {ALL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Matière</label>
                  <select
                    value={qSubject}
                    onChange={(e) => setQSubject(e.target.value as Subject)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-bold text-white focus:border-amber-400 focus:outline-hidden"
                  >
                    {ALL_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">Durée (minutes)</label>
                  <input
                    type="number"
                    value={qDuration}
                    onChange={(e) => setQDuration(e.target.value)}
                    placeholder="15"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-300 block mb-1">Titre du Quiz</label>
                <input
                  type="text"
                  required
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                  placeholder="Ex : Évaluation QCM : Géométrie dans l'espace"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              {/* Clavier Unique et Unifié MathLive & Chimie WYSIWYG pour le Créateur de Quiz */}
              <div className="bg-slate-900/95 border-2 border-indigo-500/60 rounded-2xl p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center space-x-1.5">
                      <Sparkles size={15} className="text-amber-400" />
                      <span>Clavier Unique MathLive WYSIWYG & Formules Chimiques</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {activeQuizMathTarget && (
                      <span className="text-[10px] bg-indigo-950 text-emerald-300 border border-indigo-700/80 px-2.5 py-1 rounded-lg font-black flex items-center space-x-1">
                        <span>🎯 Cible active : Q#{activeQuizMathTarget.qIdx + 1} (
                          {activeQuizMathTarget.field === "question"
                            ? "Énoncé"
                            : activeQuizMathTarget.field === "explanation"
                            ? "Explication"
                            : `Option ${String.fromCharCode(65 + Number(activeQuizMathTarget.field))}`}
                        )</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowQuizMathPreview(!showQuizMathPreview)}
                      className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center space-x-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                    >
                      {showQuizMathPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showQuizMathPreview ? "Masquer prévisualisations" : "Afficher prévisualisations"}</span>
                    </button>
                  </div>
                </div>

                {/* Sélecteur de cible rapide dans la question active */}
                {activeQuizMathTarget && (
                  <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-slate-400 font-bold shrink-0 mr-1">Cible pour la Question #{activeQuizMathTarget.qIdx + 1} :</span>
                    <button
                      type="button"
                      onClick={() => setActiveQuizMathTarget({ qIdx: activeQuizMathTarget.qIdx, field: "question" })}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        activeQuizMathTarget.field === "question"
                          ? "bg-emerald-500 text-slate-950 font-black"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      Énoncé
                    </button>
                    {[0, 1, 2, 3].map((optI) => (
                      <button
                        key={optI}
                        type="button"
                        onClick={() => setActiveQuizMathTarget({ qIdx: activeQuizMathTarget.qIdx, field: optI })}
                        className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          activeQuizMathTarget.field === optI
                            ? "bg-amber-400 text-slate-950 font-black"
                            : "bg-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        Option {String.fromCharCode(65 + optI)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActiveQuizMathTarget({ qIdx: activeQuizMathTarget.qIdx, field: "explanation" })}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        activeQuizMathTarget.field === "explanation"
                          ? "bg-indigo-500 text-white font-black"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      Explication
                    </button>
                  </div>
                )}

                {/* Composant MathLive WYSIWYG Unique */}
                <MathLiveEditor
                  value={getActiveQuizTargetValue()}
                  onChange={(latexVal) => updateActiveQuizTargetValue(latexVal)}
                  placeholder="Écrivez ou cliquez sur les onglets ci-dessus ([Maths & Algèbre], [Chimie], [Physique & Symboles])..."
                  helperText="Les symboles, fractions, racines combinées (ex: √(x²)) et molécules chimiques s'affichent directement sans code et se synchronisent avec la cible active."
                />
              </div>

              {/* Questions List */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <h4 className="font-extrabold text-white text-xs uppercase">
                    Questions du Quiz ({qQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestionRow}
                    className="px-3 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 hover:text-white font-bold text-xs rounded-lg border border-indigo-700 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Ajouter une question</span>
                  </button>
                </div>

                {qQuestions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-amber-400 text-xs">Question #{qIdx + 1}</span>
                        {/* Type Toggle: Single vs Multiple */}
                        <div className="inline-flex rounded-lg bg-slate-800 border border-slate-700 p-0.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => {
                              setQQuestions((prev) =>
                                prev.map((item, i) => {
                                  if (i !== qIdx) return item;
                                  const first = item.correctIndices?.[0] ?? item.correctIndex ?? 0;
                                  return {
                                    ...item,
                                    type: "single",
                                    correctIndex: first,
                                    correctIndices: [first],
                                  };
                                })
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md font-bold transition-colors flex items-center space-x-1 cursor-pointer ${
                              q.type !== "multiple"
                                ? "bg-indigo-600 text-white shadow-2xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <CircleDot size={12} />
                            <span>Choix unique</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQQuestions((prev) =>
                                prev.map((item, i) => {
                                  if (i !== qIdx) return item;
                                  const current = item.correctIndices?.length > 0 ? item.correctIndices : [item.correctIndex || 0];
                                  return {
                                    ...item,
                                    type: "multiple",
                                    correctIndices: current,
                                  };
                                })
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md font-bold transition-colors flex items-center space-x-1 cursor-pointer ${
                              q.type === "multiple"
                                ? "bg-amber-500 text-slate-950 shadow-2xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <CheckSquare size={12} />
                            <span>Cases à cocher (1 ou plus)</span>
                          </button>
                        </div>
                      </div>

                      {qQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionRow(qIdx)}
                          className="p-1 text-rose-400 hover:bg-rose-950 rounded cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300">Énoncé de la question :</label>
                        <div className="flex items-center space-x-1.5">
                          {activeQuizMathTarget?.qIdx === qIdx && activeQuizMathTarget.field === "question" && (
                            <span className="text-[10px] text-emerald-400 font-bold animate-pulse">● Cible active</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuizMathTarget({ qIdx, field: "question" });
                              setInlineMathLiveField(inlineMathLiveField === `q-${qIdx}-question` ? null : `q-${qIdx}-question`);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-all ${
                              inlineMathLiveField === `q-${qIdx}-question`
                                ? "bg-amber-400 text-slate-950 font-black"
                                : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
                            }`}
                          >
                            <Sparkles size={11} />
                            <span>{inlineMathLiveField === `q-${qIdx}-question` ? "Fermer MathLive" : "Éditer en MathLive"}</span>
                          </button>
                        </div>
                      </div>

                      {inlineMathLiveField === `q-${qIdx}-question` ? (
                        <div className="p-2 bg-slate-950 border border-amber-500/50 rounded-xl">
                          <MathLiveEditor
                            value={q.question}
                            onChange={(val) => {
                              setQQuestions((prev) =>
                                prev.map((item, i) => (i === qIdx ? { ...item, question: val } : item))
                              );
                            }}
                            placeholder="Énoncé de la question..."
                            showPreview={false}
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          required
                          value={q.question}
                          onFocus={() => setActiveQuizMathTarget({ qIdx, field: "question" })}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQQuestions((prev) =>
                              prev.map((item, i) => (i === qIdx ? { ...item, question: val } : item))
                            );
                          }}
                          placeholder="Intitulé de la question (utilisez le clavier LaTeX ou MathLive pour insérer des formules)..."
                          className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-lg p-2.5 text-white font-bold focus:outline-hidden"
                        />
                      )}

                      {showQuizMathPreview && q.question.trim() && (
                        <div className="bg-slate-950/80 border border-indigo-900/50 rounded-lg p-2 text-slate-200 text-xs">
                          <span className="text-[10px] text-amber-400 font-bold block mb-0.5">Aperçu rendu question :</span>
                          <MathRenderer text={q.question} />
                        </div>
                      )}
                    </div>

                    {/* Optional Image / Figure for Question */}
                    <div className="pt-0.5">
                      {q.image_url || q.imageUrl ? (
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-700 space-y-2 inline-block">
                          <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                            <ImageIcon size={13} className="text-amber-400" />
                            <span>Figure / Illustration associée :</span>
                          </div>
                          <img
                            src={q.image_url || q.imageUrl || ""}
                            alt={`Figure question #${qIdx + 1}`}
                            className="max-h-44 max-w-full object-contain rounded-lg border border-slate-800 bg-white/5"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveQuizQuestionImage(qIdx)}
                            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer pt-1"
                          >
                            <Trash2 size={13} />
                            <span>Supprimer l'image</span>
                          </button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                          <ImageIcon size={13} className="text-amber-400" />
                          <span>
                            {q.isUploadingImage ? "Envoi de l'image..." : "+ Ajouter une image / figure"}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) => {
                              handleQuizQuestionImageUpload(qIdx, e);
                              e.target.value = "";
                            }}
                            disabled={q.isUploadingImage}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-300 block">Options de réponses (sélectionnez la bonne réponse) :</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isMultiple = q.type === "multiple";
                          const isChecked = isMultiple
                            ? (q.correctIndices || []).includes(optIdx)
                            : q.correctIndex === optIdx;
                          const optImg = q.optionImages?.[optIdx] || q.option_images?.[optIdx];
                          const isUploadingOpt = q.isUploadingOptionImage?.[optIdx];

                          return (
                            <div key={optIdx} className="space-y-1.5 bg-slate-900/40 p-2 rounded-xl border border-slate-800">
                              <div className="flex items-center space-x-2">
                                {isMultiple ? (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setQQuestions((prev) =>
                                        prev.map((item, i) => {
                                          if (i !== qIdx) return item;
                                          const current = item.correctIndices || [item.correctIndex || 0];
                                          let next: number[];
                                          if (current.includes(optIdx)) {
                                            next = current.length > 1 ? current.filter((x) => x !== optIdx) : current;
                                          } else {
                                            next = [...current, optIdx].sort();
                                          }
                                          return {
                                            ...item,
                                            correctIndices: next,
                                            correctIndex: next[0],
                                          };
                                        })
                                      );
                                    }}
                                    className="cursor-pointer text-amber-400 rounded focus:ring-0 w-4 h-4 shrink-0"
                                    title="Cocher comme bonne réponse (multiple possible)"
                                  />
                                ) : (
                                  <input
                                    type="radio"
                                    name={`correct_${qIdx}`}
                                    checked={isChecked}
                                    onChange={() => {
                                      setQQuestions((prev) =>
                                        prev.map((item, i) =>
                                          i === qIdx
                                            ? { ...item, correctIndex: optIdx, correctIndices: [optIdx] }
                                            : item
                                        )
                                      );
                                    }}
                                    className="cursor-pointer text-amber-400 focus:ring-0 w-4 h-4 shrink-0"
                                    title="Définir comme bonne réponse unique"
                                  />
                                )}
                                <input
                                  type="text"
                                  required={!optImg}
                                  value={opt}
                                  onFocus={() => setActiveQuizMathTarget({ qIdx, field: optIdx })}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setQQuestions((prev) =>
                                      prev.map((item, i) => {
                                        if (i !== qIdx) return item;
                                        const newOpts = [...item.options] as [string, string, string, string];
                                        newOpts[optIdx] = val;
                                        return { ...item, options: newOpts };
                                      })
                                    );
                                  }}
                                  placeholder={optImg ? `Option ${String.fromCharCode(65 + optIdx)} (Image jointe)` : `Option ${String.fromCharCode(65 + optIdx)}...`}
                                  className={`flex-1 bg-slate-800 border rounded-lg p-2 text-xs text-white focus:outline-hidden ${
                                    isChecked
                                      ? "border-emerald-500 bg-emerald-950/20"
                                      : activeQuizMathTarget?.qIdx === qIdx && activeQuizMathTarget.field === optIdx
                                      ? "border-amber-400 ring-1 ring-amber-400/50"
                                      : "border-slate-700"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveQuizMathTarget({ qIdx, field: optIdx });
                                    setInlineMathLiveField(
                                      inlineMathLiveField === `q-${qIdx}-opt-${optIdx}` ? null : `q-${qIdx}-opt-${optIdx}`
                                    );
                                  }}
                                  className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center space-x-0.5 cursor-pointer shrink-0 transition-all ${
                                    inlineMathLiveField === `q-${qIdx}-opt-${optIdx}`
                                      ? "bg-amber-400 text-slate-950 font-black"
                                      : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
                                  }`}
                                  title={`Ouvrir l'éditeur visuel MathLive pour l'Option ${String.fromCharCode(65 + optIdx)}`}
                                >
                                  <Sparkles size={10} />
                                  <span>{inlineMathLiveField === `q-${qIdx}-opt-${optIdx}` ? "Fermer" : "MathLive"}</span>
                                </button>
                                <label
                                  className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center space-x-1 cursor-pointer shrink-0 transition-all ${
                                    optImg
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                  }`}
                                  title={`Joindre un schéma ou une figure pour l'Option ${String.fromCharCode(65 + optIdx)}`}
                                >
                                  <ImageIcon size={11} className={optImg ? "text-amber-400" : "text-slate-400"} />
                                  <span>{isUploadingOpt ? "..." : optImg ? "Image ✓" : "+ Image"}</span>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={(e) => {
                                      handleQuizOptionImageUpload(qIdx, optIdx, e);
                                      e.target.value = "";
                                    }}
                                    disabled={isUploadingOpt}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              {optImg && (
                                <div className="ml-6 flex items-center justify-between bg-slate-950/90 border border-amber-500/30 rounded-lg p-1.5">
                                  <div className="flex items-center space-x-2">
                                    <img
                                      src={optImg}
                                      alt={`Figure Option ${String.fromCharCode(65 + optIdx)}`}
                                      className="h-12 max-w-[120px] object-contain rounded border border-slate-800 bg-white/5"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="text-[10px] text-amber-300 font-semibold">
                                      Figure Option {String.fromCharCode(65 + optIdx)}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuizOptionImage(qIdx, optIdx)}
                                    className="text-rose-400 hover:text-rose-300 text-[10px] font-bold flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    <Trash2 size={11} />
                                    <span>Supprimer</span>
                                  </button>
                                </div>
                              )}

                              {inlineMathLiveField === `q-${qIdx}-opt-${optIdx}` && (
                                <div className="ml-6 pl-2 border-l-2 border-amber-400 pt-1 pb-1">
                                  <MathLiveEditor
                                    value={opt}
                                    onChange={(val) => {
                                      setQQuestions((prev) =>
                                        prev.map((item, i) => {
                                          if (i !== qIdx) return item;
                                          const newOpts = [...item.options] as [string, string, string, string];
                                          newOpts[optIdx] = val;
                                          return { ...item, options: newOpts };
                                        })
                                      );
                                    }}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}...`}
                                    showPreview={false}
                                  />
                                </div>
                              )}

                              {showQuizMathPreview && opt.trim() && (
                                <div className="ml-6 pl-2 border-l-2 border-indigo-500/50 text-[11px] text-slate-300">
                                  <MathRenderer text={opt} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300">Explication pédagogique / Solution :</label>
                        <div className="flex items-center space-x-1.5">
                          {activeQuizMathTarget?.qIdx === qIdx && activeQuizMathTarget.field === "explanation" && (
                            <span className="text-[10px] text-emerald-400 font-bold animate-pulse">● Cible active</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuizMathTarget({ qIdx, field: "explanation" });
                              setInlineMathLiveField(
                                inlineMathLiveField === `q-${qIdx}-explanation` ? null : `q-${qIdx}-explanation`
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-all ${
                              inlineMathLiveField === `q-${qIdx}-explanation`
                                ? "bg-amber-400 text-slate-950 font-black"
                                : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
                            }`}
                          >
                            <Sparkles size={11} />
                            <span>{inlineMathLiveField === `q-${qIdx}-explanation` ? "Fermer MathLive" : "Éditer en MathLive"}</span>
                          </button>
                        </div>
                      </div>

                      {inlineMathLiveField === `q-${qIdx}-explanation` ? (
                        <div className="p-2 bg-slate-950 border border-amber-500/50 rounded-xl">
                          <MathLiveEditor
                            value={q.explanation}
                            onChange={(val) => {
                              setQQuestions((prev) =>
                                prev.map((item, i) => (i === qIdx ? { ...item, explanation: val } : item))
                              );
                            }}
                            placeholder="Explication pédagogique et solution détaillée..."
                            showPreview={false}
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={q.explanation}
                          onFocus={() => setActiveQuizMathTarget({ qIdx, field: "explanation" })}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQQuestions((prev) =>
                              prev.map((item, i) => (i === qIdx ? { ...item, explanation: val } : item))
                            );
                          }}
                          placeholder="Explication pédagogique affichée lors de la correction (formules LaTeX possibles)..."
                          className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-[11px] text-slate-300 italic focus:outline-hidden"
                        />
                      )}

                      {showQuizMathPreview && q.explanation.trim() && (
                        <div className="bg-slate-950/80 border border-indigo-900/50 rounded-lg p-2 text-slate-300 text-xs italic">
                          <span className="text-[10px] text-amber-400 font-bold block mb-0.5 not-italic">Aperçu explication :</span>
                          <MathRenderer text={q.explanation} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmittingQuiz}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSubmittingQuiz ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Création en cours...</span>
                  </>
                ) : (
                  <>
                    <HelpCircle size={16} />
                    <span>Publier le Quiz QCM</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ISOLATED LIST VIEW: /admin/quiz */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-md">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center space-x-2">
                  <HelpCircle className="text-amber-400" size={18} />
                  <span>Banque des Quiz QCM ({quizzes.length})</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Consultez, filtrez, modifiez ou supprimez les questionnaires publiés pour les élèves.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (routerNavigate) {
                    routerNavigate("/admin/quiz/nouveau");
                  } else {
                    setActiveTab("quizzes");
                  }
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2 shrink-0"
              >
                <Plus size={16} />
                <span>+ Créer un Quiz (Éditeur MathLive WYSIWYG)</span>
              </button>
            </div>

            {/* List and Filters */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                  Quiz QCM Déjà Publiés ({quizzes.length})
                </h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={quizSearch}
                    onChange={(e) => setQuizSearch(e.target.value)}
                    placeholder="Filtrer les quiz..."
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <select
                    value={quizLevelFilter}
                    onChange={(e) => setQuizLevelFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white"
                  >
                    <option value="ALL">Tous</option>
                    {ALL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {quizzes
                  .filter((q) => {
                    const mSearch = (q.title || "").toLowerCase().includes(quizSearch.toLowerCase());
                    const mLevel = quizLevelFilter === "ALL" || q.level === quizLevelFilter;
                    return mSearch && mLevel;
                  })
                  .map((q) => (
                    <div
                      key={q.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 font-black rounded text-[10px]">
                            {q.level}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 font-bold rounded text-[10px]">
                            {q.subject}
                          </span>
                          <span className="font-extrabold text-white truncate">{q.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {q.questions.length} questions • Durée : {q.durationMinutes || (q.durationSeconds ? Math.ceil(q.durationSeconds / 60) : 0) || (q.duration ? parseInt(q.duration, 10) : 0) || 15} min
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingQuiz(q)}
                          className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Supprimer le quiz "${q.title}" ?`)) {
                              roomRepo.deleteQuiz(q.id);
                              await deleteQuizFromFirebase(q.id);
                              showToast("Quiz supprimé avec succès !");
                            }
                          }}
                          className="p-2 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )}

      {/* TAB: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            {/* Form */}
            <form
              onSubmit={handleSendNotification}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md text-xs"
            >
              <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                <Bell className="text-amber-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Diffusion de Notification Push
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Envoyez un message d'information ou d'alerte ciblé ou à toute la communauté.
                  </p>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-300 block mb-1">Destinataires</label>
                <select
                  value={notifTarget}
                  onChange={(e) => setNotifTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-bold text-white focus:border-amber-400 focus:outline-hidden"
                >
                  <option value="all">📢 Tous les élèves (Diffusion Générale)</option>
                  {students.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      👤 {s.displayName} ({s.email}) - {s.level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-300 block mb-1">Titre du Message</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Ex : 📢 Nouvelle Épreuve de Concours disponible !"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-300 block mb-1">Corps du Message</label>
                <textarea
                  rows={3}
                  required
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Rédigez le texte complet de la notification..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingNotif}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSendingNotif ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Envoyer la Notification</span>
                  </>
                )}
              </button>
            </form>

            {/* List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                  Historique des Notifications Envoyées ({notifications.length})
                </h4>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("Effacer tout l'historique des notifications ?")) {
                        roomRepo.clearAllNotifications();
                        await clearAllNotificationsFromFirebase();
                        showToast("Historique des notifications effacé !");
                      }
                    }}
                    className="text-xs text-rose-400 hover:underline cursor-pointer"
                  >
                    Tout effacer
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-white text-sm">{n.title}</span>
                        <span className="text-[10px] text-slate-400">({n.dateFormatted})</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            n.userUid === "all" || n.recipientId === "all"
                              ? "bg-indigo-950 text-indigo-300 border border-indigo-700"
                              : "bg-amber-950 text-amber-300 border border-amber-700"
                          }`}
                        >
                          {n.userUid === "all" || n.recipientId === "all"
                            ? "📢 Diffusion Générale"
                            : `🎯 Destinataire: ${n.userName || n.recipientId || n.userUid}`}
                        </span>
                        {n.userId && n.userId !== "all" && (
                          <span className="bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded text-[10px] font-mono border border-slate-700">
                            ID: {n.userId}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{n.message}</p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        roomRepo.deleteNotification(n.id, n.userUid);
                        await deleteNotificationFromFirebase(n.id, n.userUid);
                        showToast("Notification supprimée !");
                      }}
                      className="p-1.5 text-rose-400 hover:bg-rose-950 rounded cursor-pointer shrink-0 transition-colors"
                      title="Supprimer la notification"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: SETTINGS & APK */}
        {activeTab === "settings" && (
          <div className="space-y-6 text-xs">
            {/* APK & App Update */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!updateVersion.trim()) return;
                setIsSavingAppConfig(true);
                try {
                  const updatedCfg = {
                    latest_version: updateVersion.trim(),
                    apk_url: updateApkUrl.trim(),
                    message: updateMessage.trim(),
                  };
                  saveLocalAppConfig(updatedCfg);
                  await saveAppConfigToSupabase(updatedCfg);
                  await logAdminActionToSupabase(
                    user?.displayName || "Massaw Seck",
                    "PUBLISH_APP_UPDATE_SUPABASE",
                    `Configuration APK & Mise à jour v${updateVersion.trim()} enregistrée sur Supabase`
                  );
                  showToast(`Mise à jour v${updateVersion.trim()} enregistrée sur Supabase et publiée avec succès !`);
                } catch (err) {
                  console.error("Error saving app update on Supabase:", err);
                  showToast("Erreur lors de l'enregistrement dans Supabase.", true);
                } finally {
                  setIsSavingAppConfig(false);
                }
              }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md"
            >
              <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                <Sparkles className="text-amber-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Mises à Jour Système & Fichier APK (Centralisé sur Supabase)
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Configurez la version officielle et le lien direct vers le fichier APK Android. Les données sont enregistrées en direct dans Supabase (tables app_settings / app_versions).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">
                    Dernière Version en Ligne (ex: 1.0.1)
                  </label>
                  <input
                    type="text"
                    required
                    value={updateVersion}
                    onChange={(e) => setUpdateVersion(e.target.value)}
                    placeholder="1.0.1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-300 block mb-1">
                    Lien direct de téléchargement APK
                  </label>
                  <input
                    type="url"
                    value={updateApkUrl}
                    onChange={(e) => setUpdateApkUrl(e.target.value)}
                    placeholder="https://domaine.com/gma_v1.0.1.apk"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-[11px] focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-300 block mb-1">
                  Message d'Annonce de la Mise à Jour
                </label>
                <textarea
                  rows={2}
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Message affiché dans la pop-up de mise à jour pour les utilisateurs..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingAppConfig}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSavingAppConfig ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Publication sur Supabase en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Enregistrer dans Supabase & Publier la Mise à Jour</span>
                  </>
                )}
              </button>
            </form>

            {/* SECTION: Identité Visuelle & Logos des Packages APK / PWA */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-5 shadow-md">
              <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                <Sparkles className="text-amber-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Identité Visuelle, Logos & Packages Android APK (192x192, 512x512 & Favicon)
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Personnalisez tous les logos, les icônes de package APK/PWA et le favicon. Les modifications sont enregistrées sur Supabase et appliquées instantanément sur les téléphones et navigateurs.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Logo Officiel de l'Application */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white flex items-center space-x-1.5 text-xs">
                      <ImageIcon size={14} className="text-amber-400" />
                      <span>1. Logo Principal de l'Application</span>
                    </span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                      Header & Modales
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Affiché dans la barre de navigation, les en-têtes de modales, le profil élève et les reçus.
                  </p>
                  <div className="flex items-center gap-3">
                    <AppLogo
                      customUrl={logoPreview}
                      className="w-16 h-16 rounded-2xl border-2 border-amber-400 shadow-md shrink-0"
                      alt="Logo Preview"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors shadow-xs">
                          <Upload size={13} className="text-amber-400" />
                          <span>{isSavingLogo ? "Téléversement..." : "Fichier (512x512)..."}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIsSavingLogo(true);
                                try {
                                  const uploadedUrl = await uploadAppLogoToSupabase(file);
                                  if (uploadedUrl) {
                                    setLogoPreview(uploadedUrl);
                                    setAppLogo(uploadedUrl);
                                    showToast("✅ Logo officiel sauvegardé dans Supabase Storage et synchronisé !");
                                  } else {
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      const res = reader.result as string;
                                      setLogoPreview(res);
                                      setAppLogo(res);
                                      await saveLogoToFirebase(res);
                                      showToast("Logo officiel mis à jour et synchronisé !");
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                } catch (err) {
                                  console.warn("Error saving logo:", err);
                                  showToast("Erreur lors de l'enregistrement du logo.", true);
                                } finally {
                                  setIsSavingLogo(false);
                                }
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("Rétablir le logo officiel original de Génie Mentor Académie ?")) {
                              const defaultLogo = "/logo.png";
                              setLogoPreview(defaultLogo);
                              setAppLogo(defaultLogo);
                              await saveLogoToFirebase(defaultLogo);
                              showToast("Logo officiel rétabli par défaut.");
                            }
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          Défaut
                        </button>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="url"
                          placeholder="Ou coller une URL HTTPS..."
                          value={logoUrlInput}
                          onChange={(e) => setLogoUrlInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono focus:border-amber-400 focus:outline-hidden"
                        />
                        {logoUrlInput.trim() && (
                          <button
                            type="button"
                            onClick={async () => {
                              const cleanUrl = logoUrlInput.trim();
                              setLogoPreview(cleanUrl);
                              setAppLogo(cleanUrl);
                              await saveLogoToFirebase(cleanUrl);
                              setLogoUrlInput("");
                              showToast("✅ URL du logo appliquée et synchronisée !");
                            }}
                            className="px-2 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg shrink-0 cursor-pointer"
                          >
                            OK
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Icône Package Android & PWA 192x192 */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white flex items-center space-x-1.5 text-xs">
                      <Smartphone size={14} className="text-indigo-400" />
                      <span>2. Icône Package & PWA 192x192</span>
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                      Écran d'Accueil Android
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Utilisée par le manifest PWA et l'APK Android pour l'icône sur l'écran d'accueil du téléphone.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-2xl border-2 border-indigo-400/80 bg-[#0A1964] shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={pwa192Preview || "/logo-192.png"}
                        alt="PWA 192 Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/logo-192.png";
                        }}
                      />
                      <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-slate-950/80 text-[8px] font-mono text-indigo-200 rounded-tl">
                        192p
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors shadow-xs">
                          <Upload size={13} className="text-indigo-400" />
                          <span>{isSavingPwa192 ? "Téléversement..." : "Fichier (192x192)..."}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIsSavingPwa192(true);
                                try {
                                  const uploadedUrl = await uploadCustomAssetToSupabase(file, "icon192");
                                  if (uploadedUrl) {
                                    setPwa192Preview(uploadedUrl);
                                    setPwaIcon192(uploadedUrl);
                                    showToast("✅ Icône 192x192 téléversée dans Supabase et synchronisée partout !");
                                  } else {
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      const res = reader.result as string;
                                      setPwa192Preview(res);
                                      await saveCustomPwaIcon192ToRemote(res);
                                      showToast("Icône 192x192 mise à jour et synchronisée !");
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                } catch (err) {
                                  console.warn("Error saving PWA 192:", err);
                                  showToast("Erreur lors de l'enregistrement de l'icône 192x192.", true);
                                } finally {
                                  setIsSavingPwa192(false);
                                }
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("Rétablir l'icône standard 192x192 (/logo-192.png) ?")) {
                              const def = "/logo-192.png";
                              setPwa192Preview(def);
                              await saveCustomPwaIcon192ToRemote(def);
                              showToast("Icône 192x192 rétablie par défaut.");
                            }
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          Défaut
                        </button>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="url"
                          placeholder="Ou coller une URL HTTPS..."
                          value={pwa192UrlInput}
                          onChange={(e) => setPwa192UrlInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono focus:border-indigo-400 focus:outline-hidden"
                        />
                        {pwa192UrlInput.trim() && (
                          <button
                            type="button"
                            onClick={async () => {
                              const cleanUrl = pwa192UrlInput.trim();
                              setPwa192Preview(cleanUrl);
                              await saveCustomPwaIcon192ToRemote(cleanUrl);
                              setPwa192UrlInput("");
                              showToast("✅ URL de l'icône 192x192 appliquée et synchronisée !");
                            }}
                            className="px-2 py-1 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-[11px] rounded-lg shrink-0 cursor-pointer"
                          >
                            OK
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Icône Package Android & PWA 512x512 */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white flex items-center space-x-1.5 text-xs">
                      <Layers size={14} className="text-emerald-400" />
                      <span>3. Icône Package & PWA 512x512</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Splashscreen & APK HD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Utilisée pour le splash screen de lancement Android, le store et les écrans haute définition.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-2xl border-2 border-emerald-400/80 bg-[#0A1964] shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={pwa512Preview || "/logo.png"}
                        alt="PWA 512 Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/logo.png";
                        }}
                      />
                      <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-slate-950/80 text-[8px] font-mono text-emerald-200 rounded-tl">
                        512p
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors shadow-xs">
                          <Upload size={13} className="text-emerald-400" />
                          <span>{isSavingPwa512 ? "Téléversement..." : "Fichier (512x512)..."}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIsSavingPwa512(true);
                                try {
                                  const uploadedUrl = await uploadCustomAssetToSupabase(file, "icon512");
                                  if (uploadedUrl) {
                                    setPwa512Preview(uploadedUrl);
                                    setPwaIcon512(uploadedUrl);
                                    showToast("✅ Icône 512x512 téléversée dans Supabase et synchronisée !");
                                  } else {
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      const res = reader.result as string;
                                      setPwa512Preview(res);
                                      await saveCustomPwaIcon512ToRemote(res);
                                      showToast("Icône 512x512 mise à jour et synchronisée !");
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                } catch (err) {
                                  console.warn("Error saving PWA 512:", err);
                                  showToast("Erreur lors de l'enregistrement de l'icône 512x512.", true);
                                } finally {
                                  setIsSavingPwa512(false);
                                }
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("Rétablir l'icône standard 512x512 (/logo.png) ?")) {
                              const def = "/logo.png";
                              setPwa512Preview(def);
                              await saveCustomPwaIcon512ToRemote(def);
                              showToast("Icône 512x512 rétablie par défaut.");
                            }
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          Défaut
                        </button>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="url"
                          placeholder="Ou coller une URL HTTPS..."
                          value={pwa512UrlInput}
                          onChange={(e) => setPwa512UrlInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono focus:border-emerald-400 focus:outline-hidden"
                        />
                        {pwa512UrlInput.trim() && (
                          <button
                            type="button"
                            onClick={async () => {
                              const cleanUrl = pwa512UrlInput.trim();
                              setPwa512Preview(cleanUrl);
                              await saveCustomPwaIcon512ToRemote(cleanUrl);
                              setPwa512UrlInput("");
                              showToast("✅ URL de l'icône 512x512 appliquée et synchronisée !");
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg shrink-0 cursor-pointer"
                          >
                            OK
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Favicon du Navigateur Web */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white flex items-center space-x-1.5 text-xs">
                      <Globe size={14} className="text-cyan-400" />
                      <span>4. Favicon du Navigateur Web</span>
                    </span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Barre d'onglets & Signets
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Petite icône affichée dans la barre d'onglets du navigateur, l'historique et les favoris.
                  </p>
                  <div className="flex items-center gap-3">
                    {/* Mockup d'un onglet de navigateur avec le favicon */}
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-700 flex flex-col items-center justify-center w-24 h-16 shrink-0 space-y-1">
                      <div className="w-full bg-slate-800 rounded-t px-1.5 py-0.5 flex items-center space-x-1 border-t border-x border-slate-700 text-[9px] text-slate-300">
                        <img
                          src={faviconPreview || "/favicon.ico"}
                          alt="Favicon Preview"
                          className="w-3.5 h-3.5 object-contain shrink-0 rounded-xs"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/favicon.ico";
                          }}
                        />
                        <span className="truncate font-sans font-semibold text-[8px]">GMA</span>
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">Onglet Web</span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors shadow-xs">
                          <Upload size={13} className="text-cyan-400" />
                          <span>{isSavingFavicon ? "Téléversement..." : "Fichier Favicon..."}</span>
                          <input
                            type="file"
                            accept="image/*,.ico"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIsSavingFavicon(true);
                                try {
                                  const uploadedUrl = await uploadCustomAssetToSupabase(file, "favicon");
                                  if (uploadedUrl) {
                                    setFaviconPreview(uploadedUrl);
                                    setFavicon(uploadedUrl);
                                    showToast("✅ Favicon téléversé sur Supabase et mis à jour !");
                                  } else {
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      const res = reader.result as string;
                                      setFaviconPreview(res);
                                      await saveCustomFaviconToRemote(res);
                                      showToast("Favicon mis à jour et synchronisé !");
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                } catch (err) {
                                  console.warn("Error saving favicon:", err);
                                  showToast("Erreur lors de l'enregistrement du favicon.", true);
                                } finally {
                                  setIsSavingFavicon(false);
                                }
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("Rétablir le favicon standard (/favicon.ico) ?")) {
                              const def = "/favicon.ico";
                              setFaviconPreview(def);
                              await saveCustomFaviconToRemote(def);
                              showToast("Favicon rétabli par défaut.");
                            }
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          Défaut
                        </button>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="url"
                          placeholder="Ou coller une URL HTTPS..."
                          value={faviconUrlInput}
                          onChange={(e) => setFaviconUrlInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono focus:border-cyan-400 focus:outline-hidden"
                        />
                        {faviconUrlInput.trim() && (
                          <button
                            type="button"
                            onClick={async () => {
                              const cleanUrl = faviconUrlInput.trim();
                              setFaviconPreview(cleanUrl);
                              await saveCustomFaviconToRemote(cleanUrl);
                              setFaviconUrlInput("");
                              showToast("✅ URL du favicon appliquée et synchronisée !");
                            }}
                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[11px] rounded-lg shrink-0 cursor-pointer"
                          >
                            OK
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Cache Purge & Android Manifest Sync Bar */}
              <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <Smartphone size={16} className="text-indigo-400 shrink-0" />
                  <span>
                    <strong className="text-white">Synchronisation Lanceur Android & PWA :</strong> En cas de changement d'icône, le manifest dynamique et le Service Worker sont mis à jour immédiatement pour l'écran d'accueil.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { invalidatePwaIconCache } = await import("../utils/dynamicManifest");
                      await invalidatePwaIconCache();
                      showToast("🚀 Cache d'icônes PWA purgé et manifest actualisé pour Android !");
                    } catch (e) {
                      showToast("Manifest actualisé.");
                    }
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-1.5 shrink-0 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Purger Cache & Actualiser Manifest PWA</span>
                </button>
              </div>
            </div>

            {/* Official Invoice Signature Upload */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                <FileCheck className="text-amber-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Signature Officielle des Factures & Reçus
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Personnalisez ou modifiez l'image de la signature administrative apposée automatiquement sur les reçus de paiement élèves (format PNG avec fond transparent recommandé).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-700">
                <div className="p-2 bg-white rounded-xl border border-amber-400/40 shadow-xs flex items-center justify-center shrink-0 w-36 h-20">
                  <img
                    src={signaturePreview}
                    alt="Signature Preview"
                    className="max-h-16 max-w-[120px] object-contain"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <p className="font-extrabold text-white">Modifier la Signature Administrative</p>
                  <p className="text-[11px] text-slate-400">
                    Image PNG, WEBP ou SVG avec fond transparent ou blanc. Cette signature authentifie les reçus téléchargeables par les parents et élèves.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors">
                      <Upload size={14} className="text-amber-400" />
                      <span>{isSavingSignature ? "Enregistrement..." : "Choisir une signature (Image)..."}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsSavingSignature(true);
                            try {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const res = reader.result as string;
                                setSignaturePreview(res);
                                setOfficialSignature(res);
                                await saveCustomSignatureToRemote(res);
                                await logAdminActionToSupabase(
                                  user?.displayName || "Massaw Seck",
                                  "UPDATE_OFFICIAL_SIGNATURE",
                                  "Signature officielle des factures mise à jour"
                                );
                                showToast("✅ Signature officielle enregistrée et synchronisée avec succès !");
                              };
                              reader.readAsDataURL(file);
                            } catch (err) {
                              console.error("Error saving official signature:", err);
                              showToast("Erreur lors de l'enregistrement de la signature.", true);
                            } finally {
                              setIsSavingSignature(false);
                            }
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Rétablir la signature officielle originale de Génie Mentor Académie ?")) {
                          const defaultSig = "/app-signature.png";
                          setSignaturePreview(defaultSig);
                          setOfficialSignature(defaultSig);
                          await saveCustomSignatureToRemote(defaultSig);
                          showToast("Signature officielle réinitialisée aux paramètres d'origine.");
                        }
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    >
                      Rétablir par défaut
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Personal Profile Photo */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                <User className="text-amber-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Ma Photo de Profil Administrateur
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Personnalisez votre photo de profil pour votre compte ({user.displayName || user.email}).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-700">
                <img
                  src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                  alt="Admin Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-md bg-slate-800 shrink-0"
                />
                <div className="space-y-2 text-center sm:text-left">
                  <p className="font-extrabold text-white">{user.displayName || "Directeur"}</p>
                  <p className="text-[11px] text-slate-400">
                    Modifiez votre avatar personnel visible sur toute la plateforme.
                  </p>
                  <label className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors shadow">
                    <Upload size={14} className="text-white" />
                    <span>Changer ma photo de profil</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const res = reader.result as string;
                            if (res && onUpdatePhoto) {
                              onUpdatePhoto(res);
                              showToast("Photo de profil mise à jour avec succès !");
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

            {/* Admin Password Change */}
            <form
              onSubmit={handleChangeAdminPassword}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md"
            >
              <div className="flex items-center space-x-2 border-b border-slate-700 pb-3">
                <KeyRound className="text-amber-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Sécurité & Mot de Passe Administrateur
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Modifiez le mot de passe maître d'accès au panneau de contrôle.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Champ obligatoire : Mot de passe actuel avec re-vérification Supabase */}
                <div>
                  <label className="font-extrabold text-amber-300 block mb-1 text-xs">
                    Mot de Passe Actuel (Vérification Obligatoire) :
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentAdminPassword ? "text" : "password"}
                      required
                      value={currentAdminPassword}
                      onChange={(e) => setCurrentAdminPassword(e.target.value)}
                      placeholder="Saisissez votre mot de passe administrateur actuel"
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-2.5 text-white pr-9 focus:border-amber-400 focus:outline-hidden text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentAdminPassword(!showCurrentAdminPassword)}
                      className="absolute right-2.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                      title={showCurrentAdminPassword ? "Masquer" : "Afficher"}
                    >
                      {showCurrentAdminPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-slate-300 block mb-1 text-xs">
                      Nouveau Mot de Passe Admin :
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPasswordInput ? "text" : "password"}
                        required
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Min. 6 car. (Majuscule, minuscule, chiffre)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white pr-9 focus:border-amber-400 focus:outline-hidden text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPasswordInput(!showAdminPasswordInput)}
                        className="absolute right-2.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                        title={showAdminPasswordInput ? "Masquer" : "Afficher"}
                      >
                        {showAdminPasswordInput ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-300 block mb-1 text-xs">
                      Confirmer le Nouveau Mot de Passe :
                    </label>
                    <input
                      type={showAdminPasswordInput ? "text" : "password"}
                      required
                      value={confirmAdminPassword}
                      onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      placeholder="Confirmez à l'identique"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-hidden text-xs"
                    />
                  </div>
                </div>

                {/* Carte de validation de la complexité en temps réel */}
                <PasswordValidationCard password={newAdminPassword} showAlways={true} />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Mise à jour du mot de passe...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Enregistrer le Nouveau Mot de Passe</span>
                  </>
                )}
              </button>
            </form>

            {/* Supabase PostgreSQL Cloud Sync Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
                <div className="flex items-center space-x-2">
                  <Database className="text-emerald-400" size={20} />
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Base de Données Cloud Supabase (PostgreSQL)
                    </h3>
                    <p className="text-slate-400 text-[11px]">
                      Paramètres officiels de connexion Supabase, synchronisation temps réel et authentification.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTestFirebaseDb}
                    disabled={isTestingDb}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} className={isTestingDb ? "animate-spin text-emerald-400" : "text-slate-400"} />
                    <span>{isTestingDb ? "Vérification..." : "Tester la connexion"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyFirebaseConfig}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow cursor-pointer"
                  >
                    {hasCopiedConfig ? (
                      <>
                        <Check size={13} className="text-white" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copier JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {dbTestResult && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-xs text-emerald-200 flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{dbTestResult}</span>
                </div>
              )}

              {/* Badges / Key Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Projet Host</p>
                  <p className="font-mono font-bold text-emerald-300 truncate mt-0.5">rmumbqtvdmmnngvjivud.supabase.co</p>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Base de données</p>
                  <p className="font-mono font-bold text-indigo-300 truncate mt-0.5">
                    PostgreSQL Realtime
                  </p>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Statut Auth</p>
                  <p className="font-mono font-bold text-amber-300 truncate mt-0.5">Actif (Persistance LocalStorage)</p>
                </div>
              </div>

              {/* SQL Schema & RLS Policy Helper for system_settings */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="text-amber-300 font-bold">SQL Tables Globales & Règles RLS (system_settings)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sql = `-- 1. Création ou mise à jour de la table globale system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  app_name TEXT DEFAULT 'Génie Mentor Académie',
  latest_version TEXT,
  version TEXT,
  app_version TEXT,
  apk_url TEXT,
  message TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  pwa_icon_192_url TEXT,
  pwa_icon_512_url TEXT,
  official_signature TEXT,
  updated_at BIGINT
);

-- 2. Ajout sécurisé des colonnes si la table existait déjà
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS pwa_icon_192_url TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS pwa_icon_512_url TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS official_signature TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- 3. Activation de la sécurité RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 4. RÈGLE CRITIQUE : Autoriser la lecture publique (SELECT) pour TOUS (visiteurs anonymes & élèves)
DROP POLICY IF EXISTS "Lecture publique system_settings" ON public.system_settings;
CREATE POLICY "Lecture publique system_settings" ON public.system_settings
  FOR SELECT USING (true);

-- 5. Autoriser l'écriture et la mise à jour (admin et service)
DROP POLICY IF EXISTS "Ecriture admin system_settings" ON public.system_settings;
CREATE POLICY "Ecriture admin system_settings" ON public.system_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Activer les notifications temps réel Supabase Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;`;
                      navigator.clipboard.writeText(sql);
                      showToast("Code SQL copié dans le presse-papier !");
                    }}
                    className="px-2 py-0.5 bg-amber-400 text-slate-950 rounded font-black text-[10px] hover:bg-amber-300 cursor-pointer"
                  >
                    Copier le SQL
                  </button>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-700 font-mono text-[11px] text-amber-200/90 overflow-x-auto max-h-56 leading-relaxed scrollbar-thin">
                  <pre className="whitespace-pre">{`-- 1. Table system_settings & colonnes favicon/icônes
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  app_name TEXT DEFAULT 'Génie Mentor Académie',
  latest_version TEXT,
  version TEXT,
  app_version TEXT,
  apk_url TEXT,
  message TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  pwa_icon_192_url TEXT,
  pwa_icon_512_url TEXT,
  official_signature TEXT,
  updated_at BIGINT
);

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS pwa_icon_192_url TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS pwa_icon_512_url TEXT;

-- 2. Règles de Sécurité RLS : Lecture libre pour TOUS (élèves, anonymes, hors-ligne)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique system_settings" ON public.system_settings;
CREATE POLICY "Lecture publique system_settings" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ecriture admin system_settings" ON public.system_settings;
CREATE POLICY "Ecriture admin system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- 3. Publication temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ASSISTANT IA ADMIN */}
        {activeTab === "ai_assistant" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <AdminAIAssistant adminEmail={user?.email} adminName={user?.displayName || "Massaw Seck (Admin)"} />
          </div>
        )}

        {/* TAB: JOURNAL D'AUDIT & SÉCURITÉ */}
        {activeTab === "audit_logs" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <AdminAuditLogsView />
          </div>
        )}
      </main>

      {/* 5. MODALS OVERLAYS */}
      {/* Delete Student Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-950 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-black text-white text-base">
                Supprimer définitivement l'élève ?
              </h4>
              <p className="text-slate-300">
                Êtes-vous sûr de vouloir supprimer l'élève{" "}
                <strong className="text-white">{studentToDelete.displayName}</strong> (
                {studentToDelete.email}) ?
              </p>
              <p className="text-[11px] text-rose-400 font-bold bg-rose-950/40 p-2.5 rounded-xl border border-rose-900 mt-2">
                ⚠️ Cette action effacera définitivement son compte, ses notes QCM et ses devoirs.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer transition-colors"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <EditCourseModal
          isOpen={true}
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onUpdateCourse={(updated) => {
            roomRepo.updateCourse(updated);
            saveCourseToFirebase(updated).catch((err) => console.warn(err?.message || err));
            setEditingCourse(null);
            showToast("Cours modifié avec succès !");
          }}
        />
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <EditAssetModal
          isOpen={true}
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onUpdateAsset={(updated) => {
            roomRepo.updateAsset(updated);
            saveAssetToFirebase(updated).catch((err) => console.warn(err?.message || err));
            setEditingAsset(null);
            showToast("Épreuve modifiée avec succès !");
          }}
        />
      )}

      {/* Edit Quiz Modal */}
      {editingQuiz && (
        <EditQuizModal
          isOpen={true}
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onUpdateQuiz={(updated) => {
            roomRepo.updateQuiz(updated);
            saveQuizToFirebase(updated).catch((err) => console.warn(err?.message || err));
            setEditingQuiz(null);
            showToast("Quiz modifié avec succès !");
          }}
        />
      )}

      {/* Student Complete Detail Modal */}
      {selectedStudentForDetail && (
        <StudentDetailModal
          isOpen={true}
          student={selectedStudentForDetail}
          onClose={() => setSelectedStudentForDetail(null)}
          fetchStudents={handleRefreshStudents}
          refetch={handleRefreshStudents}
          onRefreshStudents={handleRefreshStudents}
          onStudentUpdated={(updated) => {
            setSelectedStudentForDetail(updated);
            setStudents((prev) =>
              prev.map((s) => (s.uid === updated.uid || s.id === updated.uid ? updated : s))
            );
            showToast(`Dossier de ${updated.displayName} mis à jour avec succès !`);
          }}
          onUpdateLevel={async (studentUid, newLevel) => {
            try {
              roomRepo.updateStudentLevel(studentUid, newLevel);
              await updateStudentLevelSupabase(studentUid, newLevel);
              setStudents((prev) =>
                prev.map((s) =>
                  s.uid === studentUid || s.id === studentUid
                    ? { ...s, level: newLevel, classe: newLevel }
                    : s
                )
              );
              if (selectedStudentForDetail && (selectedStudentForDetail.uid === studentUid || selectedStudentForDetail.id === studentUid)) {
                setSelectedStudentForDetail((prev) =>
                  prev ? { ...prev, level: newLevel, classe: newLevel } : prev
                );
              }
              showToast(`Classe changée vers ${newLevel} avec succès !`);
              await handleRefreshStudents();
              if (refreshProfile && (studentUid === user?.id || studentUid === user?.uid)) {
                await refreshProfile().catch(console.warn);
              }
            } catch (err) {
              console.error("Erreur mise à jour classe:", err);
              showToast("Erreur lors de la mise à jour de la classe");
            }
          }}
          onToggleVIP={(studentUid, isVIP) => {
            roomRepo.setUserVIPStatus(studentUid, isVIP);
            setStudents((prev) =>
              prev.map((s) => (s.uid === studentUid ? { ...s, isVIP } : s))
            );
          }}
        />
      )}
    </div>
  );
};
