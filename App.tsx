import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { RoomDatabaseRepository } from "./data/roomStorage";
import { UserProfile, Course, Asset, Quiz, SecondaryLevel, Subject, PaymentTransaction } from "./types";
import { ProfileContext } from "./context/ProfileContext";
import { Header } from "./components/Header";
import { Navigation, NavTab } from "./components/Navigation";
import { HomeTab } from "./components/HomeTab";
import { CoursesTab } from "./components/CoursesTab";
import { EvaluationsTab, EvaluationsSubTab } from "./components/EvaluationsTab";
import { ConcoursVipTab } from "./components/ConcoursVipTab";
import { ExercisesTab } from "./components/ExercisesTab";
import { HomeworkTab } from "./components/HomeworkTab";
import { QuizTab } from "./components/QuizTab";
import { ProfileTab } from "./components/ProfileTab";
import { TutorialsTab } from "./components/TutorialsTab";
import { Paiement } from "./components/Paiement";
import { AdminModal } from "./components/AdminModal";
import { AdminPage } from "./pages/AdminPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { KotlinCodeViewer } from "./components/KotlinCodeViewer";
import { AuthModal } from "./components/AuthModal";
import { LandingPage } from "./components/LandingPage";
import { ReceiptModal } from "./components/ReceiptModal";
import { NotificationModal } from "./components/NotificationModal";
import { SavoirPlusModal } from "./components/SavoirPlusModal";
import { VipModal } from "./components/VipModal";
import { UpdateModal } from "./components/UpdateModal";
import { InstallAppModal } from "./components/InstallAppModal";
import { ApkDownloadModal } from "./components/ApkDownloadModal";
import { PwaInstallModal } from "./components/PwaInstallModal";
import { DevelopmentPortfolioModal } from "./components/DevelopmentPortfolioModal";
import { ShareAppModal } from "./components/ShareAppModal";
import { AITutorTab } from "./components/AITutorTab";
import { VirtualLatexKeyboardProvider } from "./components/VirtualLatexKeyboard";
import ScrollToTop from "./components/ScrollToTop";
import { checkForAppUpdates, UpdateCheckResult, CURRENT_APP_VERSION, isNewerVersion, APP_VERSION } from "./utils/versionUtils";
import { subscribeToUpdateAvailable, applyServiceWorkerUpdate, checkServiceWorkerForUpdate } from "./utils/swUpdate";
import {
  syncLogoWithFirebase,
  syncSignatureWithRemote,
  syncFaviconWithRemote,
  syncPwaIconsWithRemote,
  setOfficialSignature,
  getFavicon,
  applyFaviconToDom,
  getPwaIcon192,
  applyPwa192ToDom,
  getPwaIcon512,
  applyPwa512ToDom,
  setFavicon,
  setPwaIcon192,
  setPwaIcon512,
} from "./utils/assetImages";
import { isUserAdmin } from "./utils/vipUtils";
import { updateUserPresence } from "./utils/userUtils";
import { ShieldAlert, ArrowLeft, CheckCircle2, X } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { 
  getUserProfileFromSupabase, 
  saveUserProfileToSupabase,
  subscribeToUserProfileSupabase, 
  subscribeToUserNotificationsSupabase,
  subscribeToAllCoursesSupabase,
  subscribeToAllAssetsSupabase,
  subscribeToAllQuizzesSupabase,
  subscribeToAppConfigSupabase,
  signOutSupabase,
  subscribeToAuthChangesSupabase,
  saveCourseToSupabase,
  saveAssetToSupabase,
  saveQuizToSupabase,
  getCoursesByLevelSupabase,
  getAssetsSupabase,
  getQuizzesByLevelSupabase,
  getAllTutorialsSupabase,
  subscribeToAllTutorialsSupabase
} from "./data/supabaseStorage";
import { syncUserToFirestore } from "./lib/firebaseClient";

function getInitialUserProfile(roomRepo: RoomDatabaseRepository): UserProfile | null {
  const cached = roomRepo.getUserProfile();
  if (cached && (cached.displayName || cached.email)) return cached;
  try {
    const rawLocal = localStorage.getItem("savoirplus_user_profile");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && (parsed.displayName || parsed.email)) {
        return parsed;
      }
    }
    const rawSession = sessionStorage.getItem("savoirplus_user_profile");
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed && (parsed.displayName || parsed.email)) {
        return parsed;
      }
    }
    const rawSavoir = localStorage.getItem("savoir_user");
    if (rawSavoir) {
      const parsed = JSON.parse(rawSavoir);
      if (parsed && (parsed.displayName || parsed.email)) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export default function App() {
  const roomRepo = RoomDatabaseRepository.getInstance();

  const [user, setUserState] = useState<UserProfile | null>(() => getInitialUserProfile(roomRepo));
  const [isAuthChecking, setIsAuthChecking] = useState(() => !getInitialUserProfile(roomRepo));
  const [authDefaultLevel, setAuthDefaultLevel] = useState<SecondaryLevel>("3ème");

  const setUser = useCallback((newUserOrUpdater: React.SetStateAction<UserProfile | null>) => {
    setUserState((prev) => {
      const nextUser = typeof newUserOrUpdater === "function" ? newUserOrUpdater(prev) : newUserOrUpdater;
      if (nextUser) {
        let resolvedName = (nextUser.displayName || nextUser.fullName || "").trim();
        // Preserve existing user custom name if incoming name is fallback 'Élève'
        if ((!resolvedName || resolvedName === "Élève") && prev?.displayName && prev.displayName !== "Élève") {
          resolvedName = prev.displayName;
        }
        if (!resolvedName) {
          resolvedName = (nextUser.email ? nextUser.email.split("@")[0] : "") || "Élève";
        }
        const parts = resolvedName.split(/\s+/);
        const prenom = nextUser.prenom || (parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0]);
        const nom = nextUser.nom || (parts.length > 1 ? parts[parts.length - 1] : "");
        const formattedUser: UserProfile = {
          ...nextUser,
          displayName: resolvedName,
          fullName: resolvedName,
          prenom,
          nom,
        };
        setTimeout(() => {
          roomRepo.setUserProfile(formattedUser);
          roomRepo.registerOrUpdateStudent(formattedUser);
          try {
            localStorage.setItem("savoirplus_user_profile", JSON.stringify(formattedUser));
            localStorage.setItem("savoir_user", JSON.stringify(formattedUser));
            sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(formattedUser));
          } catch {}
          syncUserToFirestore(formattedUser).catch(() => {});
        }, 0);
        return formattedUser;
      } else {
        setTimeout(() => {
          roomRepo.clearUserProfile();
          try {
            localStorage.removeItem("savoirplus_user_profile");
            localStorage.removeItem("savoir_user");
            sessionStorage.removeItem("savoirplus_user_profile");
          } catch {}
        }, 0);
        return null;
      }
    });
  }, [roomRepo]);
  
  // URL and Routing State via React Router
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const navigateTo = (path: string) => {
    navigate(path);
    try {
      if (user?.uid) {
        localStorage.setItem("savoir_last_path_" + user.uid, path);
      }
    } catch {}
  };

  useEffect(() => {
    if (user?.uid && currentPath) {
      try {
        localStorage.setItem("savoir_last_path_" + user.uid, currentPath);
      } catch {}
    }
  }, [currentPath, user?.uid]);

  // Derive active bottom navigation tab from route
  let activeTab: NavTab = "accueil";
  if (currentPath.startsWith("/cours")) activeTab = "cours";
  else if (currentPath.startsWith("/evaluations")) activeTab = "evaluations";
  else if (currentPath.startsWith("/tuteur-ia") || currentPath.startsWith("/tuteur")) activeTab = "tuteur";
  else if (currentPath.startsWith("/tutoriels")) activeTab = "tutoriels";
  else if (currentPath.startsWith("/concours-vip")) activeTab = "vip";
  else if (currentPath.startsWith("/profil")) activeTab = "profil";
  else if (currentPath.startsWith("/paiement")) activeTab = "paiement";

  const handleTabChange = (tab: NavTab) => {
    switch (tab) {
      case "accueil":
        navigateTo("/");
        break;
      case "cours":
        navigateTo("/cours");
        break;
      case "evaluations":
        navigateTo("/evaluations");
        break;
      case "tuteur":
        navigateTo("/tuteur-ia");
        break;
      case "tutoriels":
        navigateTo("/tutoriels");
        break;
      case "vip":
        navigateTo("/concours-vip");
        break;
      case "profil":
        navigateTo("/profil");
        break;
      case "paiement":
        navigateTo("/paiement");
        break;
      default:
        navigateTo("/");
    }
  };

  const [evaluationsSubTab, setEvaluationsSubTabState] = useState<EvaluationsSubTab>(() => {
    try {
      const userCached = roomRepo.getUserProfile();
      const userKey = userCached?.uid ? `savoir_evaluations_subtab_${userCached.uid}` : null;
      const saved = (userKey ? localStorage.getItem(userKey) : null) || localStorage.getItem("savoir_evaluations_subtab");
      if (saved && ["quiz", "exercices", "devoirs"].includes(saved)) {
        return saved as EvaluationsSubTab;
      }
    } catch {}
    return "quiz";
  });

  const setEvaluationsSubTab = (subTab: EvaluationsSubTab) => {
    setEvaluationsSubTabState(subTab);
    try {
      localStorage.setItem("savoir_evaluations_subtab", subTab);
      if (user?.uid) {
        localStorage.setItem("savoir_last_evaluations_subtab_" + user.uid, subTab);
      }
    } catch {}
  };

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);

  // Modals for Receipts, Notifications, GMA VIP, and App Updates
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<PaymentTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const handleUnreadCountChange = useCallback((cnt: number) => {
    setUnreadNotifCount(cnt);
  }, []);
  const [isSavoirPlusOpen, setIsSavoirPlusOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // App Update Modal State
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  // Global startup update check, realtime config & update broadcasts for students and admins
  useEffect(() => {
    let isMounted = true;
    syncFaviconWithRemote().catch((err) => console.warn(err?.message || err));
    syncPwaIconsWithRemote().catch((err) => console.warn(err?.message || err));
    syncLogoWithFirebase().catch((err) => console.warn(err?.message || err));
    syncSignatureWithRemote().catch((err) => console.warn(err?.message || err));
    try {
      applyFaviconToDom(getFavicon());
      applyPwa192ToDom(getPwaIcon192());
      applyPwa512ToDom(getPwaIcon512());
    } catch {}

    const performVersionCheck = () => {
      checkForAppUpdates()
        .then((res) => {
          if (isMounted && res.hasUpdate) {
            setUpdateInfo(res);
            setIsUpdateModalOpen(true);
          }
        })
        .catch((err) => console.warn(err?.message || err));
    };

    // 1. Initial check at startup
    performVersionCheck();

    // 2. Realtime broadcast for updates and logo/signature changes across all clients
    const unsubConfig = subscribeToAppConfigSupabase((cfg) => {
      if (!isMounted || !cfg) return;
      if (cfg.signatureUrl) {
        setOfficialSignature(cfg.signatureUrl);
      }
      if (cfg.faviconUrl) {
        setFavicon(cfg.faviconUrl);
      }
      if (cfg.pwaIcon192Url) {
        setPwaIcon192(cfg.pwaIcon192Url);
      }
      if (cfg.pwaIcon512Url) {
        setPwaIcon512(cfg.pwaIcon512Url);
      }

      // Auto-refresh mechanism for all active users on any admin update/publish
      if (cfg.updatedAt) {
        const lastPublished = localStorage.getItem("savoir_last_published_at");
        if (lastPublished) {
          const lastTime = Number(lastPublished);
          if (cfg.updatedAt > lastTime) {
            localStorage.setItem("savoir_last_published_at", String(cfg.updatedAt));
            // Force clean SW and app code caches and reload
            import("./utils/swUpdate").then((sw) => {
              sw.cleanAppCodeCaches(true).finally(() => {
                window.location.reload();
              });
            });
            return;
          }
        } else {
          // Initialize on first load
          localStorage.setItem("savoir_last_published_at", String(cfg.updatedAt));
        }
      }

      const remoteVer = cfg.latest_version || cfg.globalVersion || APP_VERSION;
      const hasUpdate = isNewerVersion(APP_VERSION, remoteVer);
      if (hasUpdate) {
        setUpdateInfo({
          hasUpdate: true,
          latestVersion: remoteVer,
          currentVersion: APP_VERSION,
          apkUrl: cfg.apk_url || "",
          message: cfg.message || "Une nouvelle version de l'application Génie Mentor Académie est disponible.",
        });
        setIsUpdateModalOpen(true);
      }
    });

    // 3. Realtime Service Worker auto-update detection (when new worker is installed in background)
    const unsubSw = subscribeToUpdateAvailable((hasSwUpdate) => {
      if (!isMounted) return;
      if (hasSwUpdate) {
        setUpdateInfo((prev) => ({
          hasUpdate: true,
          latestVersion: prev?.latestVersion || APP_VERSION,
          currentVersion: APP_VERSION,
          apkUrl: prev?.apkUrl || "",
          message: "Une nouvelle version de l'application est prête à être installée.",
        }));
        setIsUpdateModalOpen(true);
      }
    });

    // 4. Check whenever student returns to the app / unlocks phone
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performVersionCheck();
        checkServiceWorkerForUpdate().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // 5. Periodic polling (every 60s) to guarantee update detection on mobile networks
    const intervalId = setInterval(performVersionCheck, 60 * 1000);

    return () => {
      isMounted = false;
      unsubConfig();
      unsubSw();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  // Periodic user presence heartbeat (keep lastSeen up to date in real-time)
  useEffect(() => {
    if (!user?.uid) return;
    updateUserPresence(user.uid);
    const interval = setInterval(() => {
      updateUserPresence(user.uid);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Forced direct fetch from Supabase table 'courses', 'assets', 'quizzes', 'tutorials' on initial load & level change
  useEffect(() => {
    let isMounted = true;
    const fetchDirectPedagogicalData = async () => {
      try {
        const isAdminUser = Boolean(user && (user.isAdmin || isUserAdmin(user)));
        const targetLevel = isAdminUser ? undefined : (user?.level || undefined);
        const [remoteCourses, remoteAssets, remoteQuizzes, remoteTutorials] = await Promise.all([
          getCoursesByLevelSupabase(targetLevel),
          getAssetsSupabase(targetLevel),
          getQuizzesByLevelSupabase(targetLevel),
          getAllTutorialsSupabase(),
        ]);

        if (!isMounted) return;

        if (Array.isArray(remoteCourses)) {
          setCourses(remoteCourses);
          roomRepo.syncCoursesFromFirebase(remoteCourses);
        }
        if (Array.isArray(remoteAssets)) {
          setAssets(remoteAssets);
          roomRepo.syncAssetsFromFirebase(remoteAssets);
        }
        if (Array.isArray(remoteQuizzes)) {
          setQuizzes(remoteQuizzes);
          roomRepo.syncQuizzesFromFirebase(remoteQuizzes);
        }
        if (Array.isArray(remoteTutorials)) {
          roomRepo.syncTutorialsFromRemote(remoteTutorials);
        }
      } catch (err) {
        console.warn("[App] Direct pedagogical fetch on load notice:", err);
      }
    };

    fetchDirectPedagogicalData();

    return () => {
      isMounted = false;
    };
  }, [user?.level, user?.isAdmin, user?.email]);

  // Subscribe to Room database state updates
  useEffect(() => {
    const refreshData = () => {
      const u = roomRepo.getUserProfile();
      const isAdminUser = Boolean(u && (u.isAdmin || isUserAdmin(u)));
      const localCourses = u
        ? (isAdminUser ? roomRepo.getAllCourses() : roomRepo.getCoursesByLevel(u.level || "3ème"))
        : roomRepo.getAllCourses();
      if (localCourses && localCourses.length > 0) {
        setCourses(localCourses);
      }

      const localAssets = roomRepo.getAllAssets();
      if (localAssets && localAssets.length > 0) {
        setAssets(localAssets);
      }

      const localQuizzes = u
        ? (isAdminUser ? roomRepo.getAllQuizzes() : roomRepo.getQuizzesByLevel(u.level || "3ème"))
        : roomRepo.getAllQuizzes();
      if (localQuizzes && localQuizzes.length > 0) {
        setQuizzes(localQuizzes);
      }

      if (u) {
        // Refresh notification count
        const notifs = roomRepo.getNotificationsByUser(u.uid, u.isAdmin);
        const unread = notifs.filter((n) => n.status === "unread").length;
        setUnreadNotifCount(unread);
      } else {
        setUnreadNotifCount(0);
      }
    };

    refreshData();
    const unsubscribe = roomRepo.subscribe(refreshData);
    return () => {
      unsubscribe();
    };
  }, [user?.level, user?.uid, user?.isAdmin]);

  // Real-time courses, assets and quizzes synchronization across all devices
  useEffect(() => {
    const unsubCourses = subscribeToAllCoursesSupabase((remoteCourses) => {
      if (remoteCourses && remoteCourses.length > 0) {
        setCourses(remoteCourses);
        roomRepo.syncCoursesFromFirebase(remoteCourses);
      }
    });

    const unsubAssets = subscribeToAllAssetsSupabase((remoteAssets) => {
      if (remoteAssets && remoteAssets.length > 0) {
        setAssets(remoteAssets);
        roomRepo.syncAssetsFromFirebase(remoteAssets);
      }
    });

    const unsubQuizzes = subscribeToAllQuizzesSupabase((remoteQuizzes) => {
      if (remoteQuizzes && remoteQuizzes.length > 0) {
        setQuizzes(remoteQuizzes);
        roomRepo.syncQuizzesFromFirebase(remoteQuizzes);
      }
    });

    return () => {
      unsubCourses();
      unsubAssets();
      unsubQuizzes();
    };
  }, []);

  // Supabase session persistence listener with real-time profile & notification sync
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    // Listen for cross-window OAuth popup completion
    const handlePopupMessage = (evt: MessageEvent) => {
      if (evt.data?.type === "SUPABASE_AUTH_SUCCESS") {
        if (supabase) {
          supabase.auth.getSession().catch(console.warn);
        }
      }
    };
    window.addEventListener("message", handlePopupMessage);

    // Safety fallback: Ensure auth checking never blocks screen for more than 1000ms
    const safetyTimer = setTimeout(() => {
      setIsAuthChecking(false);
    }, 1000);

    const unsubscribeAuth = subscribeToAuthChangesSupabase(async (sessionUser) => {
      clearTimeout(safetyTimer);
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (unsubNotifs) { unsubNotifs(); unsubNotifs = null; }

      if (sessionUser) {
        setIsSyncing(true);
        let remoteProfile: UserProfile | null = null;
        let userIsAdmin = false;
        try {
          // 1. Fetch remote profile from Supabase
          remoteProfile = await getUserProfileFromSupabase(sessionUser.uid);
          const cleanEmail = (sessionUser.email || "").trim().toLowerCase();
          const isAdmin = isUserAdmin({ email: cleanEmail });
          userIsAdmin = Boolean(remoteProfile?.isAdmin || isAdmin);

          // Auto-provision authorized admin accounts on Google or email sign-in (Unassigned to any class, Global Access)
          if (isAdmin) {
            if (!remoteProfile) {
              remoteProfile = {
                uid: sessionUser.uid,
                email: cleanEmail,
                displayName: cleanEmail.split("@")[0] || "Administrateur",
                role: "admin",
                level: undefined,
                classe: undefined,
                phoneNumber: "",
                isAdmin: true,
                isVIP: true,
                isProfileComplete: true,
                createdAt: Date.now(),
              };
              saveUserProfileToSupabase(remoteProfile).catch((err) => {
                console.warn("[Supabase] Admin profile save notice:", err);
              });
            } else {
              remoteProfile.isAdmin = true;
              remoteProfile.isVIP = true;
              remoteProfile.role = "admin";
              remoteProfile.level = undefined;
              remoteProfile.classe = undefined;
              remoteProfile.isProfileComplete = true;
              saveUserProfileToSupabase(remoteProfile).catch((err) => {
                console.warn("[Supabase] Admin profile update notice:", err);
              });
            }
          } else if (!remoteProfile) {
            // New student account: Auto-create default draft profile with role 'eleve'
            remoteProfile = {
              uid: sessionUser.uid,
              email: cleanEmail,
              displayName: cleanEmail.split("@")[0] || "Élève",
              role: "eleve",
              level: undefined,
              classe: null as any,
              phoneNumber: "",
              isAdmin: false,
              isVIP: false,
              isProfileComplete: false,
              createdAt: Date.now(),
            };
            saveUserProfileToSupabase(remoteProfile).catch((err) => {
              console.warn("[Supabase] Eleve profile save notice:", err);
            });
          }

          const rawClasse = remoteProfile?.classe;
          const hasAssignedClass = Boolean(
            remoteProfile &&
            rawClasse &&
            String(rawClasse).trim() !== "" &&
            rawClasse !== "null" &&
            rawClasse !== "undefined"
          );

          if (hasAssignedClass && remoteProfile && (remoteProfile.isProfileComplete || remoteProfile.isAdmin || isAdmin)) {
            const finalProfile = {
              ...remoteProfile,
              level: rawClasse as SecondaryLevel,
              classe: rawClasse,
              isProfileComplete: true,
            };
            setUser(finalProfile);
          } else if (isAdmin && remoteProfile) {
            setUser(remoteProfile);
          } else if (remoteProfile) {
            const fallbackClass = rawClasse || remoteProfile.level || "3ème";
            const finalProfile = {
              ...remoteProfile,
              level: fallbackClass as SecondaryLevel,
              classe: fallbackClass,
              isProfileComplete: true,
            };
            setUser(finalProfile);
          }
        } catch (err) {
          console.warn("Background auth profile sync notice:", err);
          const localCached = getInitialUserProfile(roomRepo);
          if (localCached && (localCached.displayName || localCached.email)) {
            setUser(localCached);
          } else {
            setUser(null);
          }
        } finally {
          setIsSyncing(false);
          setIsAuthChecking(false);
        }

        // 3. Real-time User Profile Listener (remplace la classe active instantanément dès validation)
        unsubProfile = subscribeToUserProfileSupabase(sessionUser.uid, (updatedProfile) => {
          if (!updatedProfile) return;
          const targetLevel = updatedProfile.classe || updatedProfile.level || "3ème";
          const finalProfile: UserProfile = {
            ...updatedProfile,
            level: (targetLevel as SecondaryLevel) || updatedProfile.level || "3ème",
            classe: targetLevel || updatedProfile.classe || "3ème",
            isProfileComplete: true,
          };
          setUser(finalProfile);
        });

        // 4. Real-time Notifications Listener (chargement initial au login et tri par date décroissante)
        unsubNotifs = subscribeToUserNotificationsSupabase(sessionUser.uid, (notifs) => {
          if (notifs) {
            roomRepo.syncNotificationsFromRemote(notifs, sessionUser.uid, userIsAdmin);
          }
          const userNotifs = notifs && notifs.length > 0 ? notifs : roomRepo.getNotificationsByUser(sessionUser.uid, userIsAdmin);
          const unread = userNotifs.filter((n) => n.status === "unread").length;
          setUnreadNotifCount(unread);
        }, userIsAdmin);
      } else {
        // En cas de rechargement ou mode hors-ligne : préserver le profil utilisateur stocké localement
        const localCached = getInitialUserProfile(roomRepo);
        if (localCached && (localCached.displayName || localCached.email)) {
          setUser(localCached);
        } else {
          setUser(null);
        }
        setIsAuthChecking(false);
      }
    });

    return () => {
      window.removeEventListener("message", handlePopupMessage);
      clearTimeout(safetyTimer);
      if (unsubProfile) unsubProfile();
      if (unsubNotifs) unsubNotifs();
      unsubscribeAuth();
    };
  }, []);

  // 1. RE-FETCH SYSTÉMATIQUE APRÈS UPDATE : fonction réutilisable refreshProfile
  const refreshProfile = useCallback(async (forcedUid?: string): Promise<UserProfile | null> => {
    if (!supabase) return null;
    try {
      // 2. IDENTIFIANT UNIQUE STRICT (UUID) issu de supabase.auth.getUser()
      let targetId = forcedUid;
      if (!targetId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          targetId = authData.user.id;
        }
      }
      if (!targetId) {
        targetId = user?.id || user?.uid;
      }
      if (!targetId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (error || !data) {
        console.warn("[refreshProfile] Supabase single fetch notice:", error?.message);
        return null;
      }

      const rawField = data.classe || data.level || data.class_name || data.new_class_name || data.niveau;
      const hasValidClasseField = Boolean(
        rawField &&
        String(rawField).trim() !== "" &&
        rawField !== "null" &&
        rawField !== "undefined"
      );
      const rawClasse = hasValidClasseField ? String(rawField).trim() : null;
      const rawLevel = rawClasse ? (rawClasse as SecondaryLevel) : undefined;
      const isExplicitAdmin = Boolean(data.is_admin || data.role === "admin" || isUserAdmin({ email: data.email }));
      const role = isExplicitAdmin ? "admin" : (data.role || "eleve");

      const currentLocal = roomRepo.getUserProfile() || user;
      const rawDisplayName = (data.display_name && String(data.display_name).trim()) || "";
      const rawFullName = (data.full_name && String(data.full_name).trim()) || "";
      const resolvedDisplayName = rawDisplayName && rawDisplayName !== "Élève"
        ? rawDisplayName
        : rawFullName && rawFullName !== "Élève"
        ? rawFullName
        : currentLocal?.displayName && currentLocal.displayName !== "Élève"
        ? currentLocal.displayName
        : currentLocal?.fullName && currentLocal.fullName !== "Élève"
        ? currentLocal.fullName
        : (data.email ? data.email.split("@")[0] : "") ||
          (isExplicitAdmin ? "Administrateur" : "Élève");

      const nameParts = resolvedDisplayName.trim().split(/\s+/);
      const prenom = (data.prenom && String(data.prenom).trim() && data.prenom !== "Élève" ? String(data.prenom).trim() : null) ||
        (nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : (currentLocal?.prenom && currentLocal.prenom !== "Élève" ? currentLocal.prenom : nameParts[0]));
      const nom = (data.nom && String(data.nom).trim() && data.nom !== "Élève" ? String(data.nom).trim() : null) ||
        (nameParts.length > 1 ? nameParts.slice(1).join(" ") : (currentLocal?.nom && currentLocal.nom !== "Élève" ? currentLocal.nom : ""));

      const freshProfile: UserProfile = {
        id: data.id,
        uid: data.id,
        email: data.email,
        displayName: resolvedDisplayName,
        fullName: resolvedDisplayName,
        prenom,
        nom,
        role,
        studentId: data.student_id,
        matricule: data.matricule || data.student_id,
        level: isExplicitAdmin ? undefined : rawLevel,
        classe: isExplicitAdmin ? undefined : (rawClasse || (null as any)),
        phoneNumber: data.phone_number || "",
        phone: data.phone_number || "",
        photoUrl: data.photo_url || data.avatar_url || "",
        photoURL: data.photo_url || data.avatar_url || "",
        avatarUrl: data.avatar_url || data.photo_url || "",
        avatar_url: data.avatar_url || data.photo_url || "",
        isAdmin: isExplicitAdmin,
        isVIP: Boolean(data.is_vip),
        vipPlan: data.vip_plan,
        vipExpiresAt: data.vip_expires_at ? Number(data.vip_expires_at) : undefined,
        isProfileComplete: Boolean(isExplicitAdmin || (data.is_profile_complete && rawClasse)),
        lastSeen: data.last_seen ? Number(data.last_seen) : Date.now(),
        createdAt: data.created_at ? Number(data.created_at) : Date.now(),
      };

      // Écraser le state React local avec la donnée fraîche de Supabase
      roomRepo.setUserProfile(freshProfile);
      roomRepo.registerOrUpdateStudent(freshProfile);
      setUser(freshProfile);

      return freshProfile;
    } catch (err) {
      console.warn("[refreshProfile] Exception:", err);
      return null;
    }
  }, [user?.id, user?.uid, user?.displayName, user?.fullName, roomRepo]);

  // Rechargement du profil lors de la navigation ou du focus pour synchroniser la classe active instantanément
  useEffect(() => {
    const currentUid = user?.id || user?.uid;
    if (!currentUid) return;

    const syncLatestClass = () => {
      refreshProfile(currentUid).catch(console.warn);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncLatestClass();
      }
    };

    window.addEventListener("focus", syncLatestClass);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", syncLatestClass);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user?.id, user?.uid, refreshProfile]);

  // Handler for level change as required by prompt
  const handleUpdateLevel = async (newLevel: SecondaryLevel) => {
    // If user is Admin or Director, class changes in UI must NEVER modify their profile or disconnect them
    if (user?.isAdmin || isUserAdmin(user)) {
      return;
    }
    try {
      await signOutSupabase();
    } catch (e) {
      console.warn("Sign out notice on level change:", e);
    }
    // 1. Clear local courses cache
    roomRepo.clearCourses();
    // 2. Clear user session/profile in repository and disconnect session
    roomRepo.clearUserProfile();
    setAuthDefaultLevel(newLevel);
    setUser(null);
    navigateTo("/");
  };

  const handleLogout = async () => {
    // 1. Déconnexion locale immédiate pour une réactivité instantanée dans l'interface
    setUser(null);
    roomRepo.clearUserProfile();

    // 2. Nettoyage strict des profils et jetons de persistance dans le stockage local et session
    try {
      localStorage.removeItem("savoirplus_user_profile");
      localStorage.removeItem("savoir_user");
      sessionStorage.removeItem("savoirplus_user_profile");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
        }
        if (key.startsWith("savoir_last_") || key.startsWith("savoir_evaluations_")) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    // 3. Redirection immédiate vers l'accueil
    navigateTo("/");

    // 4. Déconnexion distante Supabase avec timeout de sécurité de 1,5s (non-bloquante)
    try {
      await Promise.race([
        signOutSupabase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
      ]);
    } catch (e) {
      console.warn("Sign out Supabase notice:", e);
    }
  };

  const handleLogin = (newUser: UserProfile) => {
    roomRepo.setUserProfile(newUser);
    setUser(newUser);
    refreshProfile(newUser.id || newUser.uid).catch(console.warn);
    try {
      const savedSubTab = localStorage.getItem("savoir_evaluations_subtab_" + newUser.uid) || localStorage.getItem("savoir_evaluations_subtab");
      if (savedSubTab && ["quiz", "exercices", "devoirs"].includes(savedSubTab)) {
        setEvaluationsSubTabState(savedSubTab as EvaluationsSubTab);
      }
      const savedPath = localStorage.getItem("savoir_last_path_" + newUser.uid);
      if (savedPath && savedPath !== currentPath) {
        navigateTo(savedPath);
      } else {
        navigateTo("/");
      }
    } catch {}
  };

  const handleUpdatePhoto = async (newPhotoUrl: string) => {
    const updated = roomRepo.updateUserProfile({ photoUrl: newPhotoUrl, avatarUrl: newPhotoUrl });
    if (updated) {
      setUser(updated);
      roomRepo.registerOrUpdateStudent(updated);
      await saveUserProfileToSupabase(updated).catch((err) => {
        console.warn("Direct Supabase profile photo sync notice:", err);
      });
      // 1. RE-FETCH SYSTÉMATIQUE APRÈS UPDATE
      await refreshProfile(updated.id || updated.uid);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile | null | void> => {
    const updated = roomRepo.updateUserProfile(updates);
    if (updated) {
      setUser(updated);
      roomRepo.registerOrUpdateStudent(updated);

      if (supabase && (updates.displayName || updates.fullName || updates.prenom || updates.nom)) {
        const nameToSave = (updates.displayName || updates.fullName || "").trim();
        if (nameToSave && nameToSave !== "Élève") {
          supabase.auth.updateUser({
            data: {
              display_name: nameToSave,
              full_name: nameToSave,
              name: nameToSave,
              prenom: updates.prenom || updated.prenom,
              nom: updates.nom || updated.nom,
            }
          }).catch((err) => console.warn("Supabase auth metadata update notice:", err));
        }
      }

      await saveUserProfileToSupabase(updated).catch((err) => {
        console.warn("Direct Supabase profile sync notice:", err);
      });
      // Re-fetch systématique pour garantir la cohérence d'état
      await refreshProfile(updated.id || updated.uid).catch(() => {});
      return updated;
    }
  };

  const handleClearRoomCache = () => {
    roomRepo.clearCourses();
    roomRepo.clearAssets();
    if (user) {
      setCourses([]);
      setAssets([]);
    }
  };

  const handleResetDatabase = () => {
    roomRepo.resetToDefault();
    if (user) {
      setCourses(roomRepo.getCoursesByLevel(user.level));
      setAssets(roomRepo.getAllAssets());
      setQuizzes(roomRepo.getQuizzesByLevel(user.level));
    }
  };

  const handleToggleCacheAsset = (assetId: string) => {
    roomRepo.toggleAssetOfflineCache(assetId);
  };

  const handleTriggerSyncWorker = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // Synchronise exclusivement les données et contenus pédagogiques (cours, quiz, exercices, devoirs) depuis Supabase/API
      const [remoteCourses, remoteAssets, remoteQuizzes] = await Promise.all([
        getCoursesByLevelSupabase(),
        getAssetsSupabase(),
        getQuizzesByLevelSupabase(),
      ]);

      if (remoteCourses && remoteCourses.length > 0) roomRepo.syncCoursesFromFirebase(remoteCourses);
      if (remoteAssets && remoteAssets.length > 0) roomRepo.syncAssetsFromFirebase(remoteAssets);
      if (remoteQuizzes && remoteQuizzes.length > 0) roomRepo.syncQuizzesFromFirebase(remoteQuizzes);

      const u = roomRepo.getUserProfile() || user;
      const isAdminUser = Boolean(u && (u.isAdmin || isUserAdmin(u)));
      const targetLevel = u?.level || "3ème";
      setCourses(isAdminUser ? roomRepo.getAllCourses() : roomRepo.getCoursesByLevel(targetLevel));
      setAssets(roomRepo.getAllAssets());
      setQuizzes(isAdminUser ? roomRepo.getAllQuizzes() : roomRepo.getQuizzesByLevel(targetLevel));

      showToast("Contenus pédagogiques actualisés avec succès ! (Cours, quiz, exercices)");
    } catch (err) {
      console.warn("[App] Actualisation pédagogique Supabase notice:", err);
      // Fallback: run background sync worker
      await roomRepo.runSyncWorker(user?.level || "3ème").catch(console.warn);
      showToast("Contenus pédagogiques synchronisés en local !");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCourse = (course: Course) => {
    roomRepo.insertCourses([course]);
    saveCourseToSupabase(course).catch((err) => console.warn(err?.message || err));
  };

  const handleAddAsset = (asset: Asset) => {
    roomRepo.insertAssets([asset]);
    saveAssetToSupabase(asset).catch((err) => console.warn(err?.message || err));
  };

  const handleAddQuiz = (quiz: Quiz) => {
    roomRepo.insertQuiz(quiz);
    saveQuizToSupabase(quiz).catch((err) => console.warn(err?.message || err));
  };

  // Dedicated Fullscreen Password Reset Route (Intercepte le jeton de réinitialisation Supabase)
  if (currentPath.startsWith("/reset-password")) {
    return (
      <ResetPasswordPage
        onNavigateHome={() => navigateTo("/")}
        onLogin={handleLogin}
      />
    );
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-400 text-[#1A237E] font-black text-xl flex items-center justify-center shadow-lg animate-pulse">
            GMA
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white">Génie Mentor Académie</h1>
            <p className="text-xs text-slate-400">Vérification de l'authentification sécurisée...</p>
          </div>
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mt-3" />
          <button
            type="button"
            onClick={() => setIsAuthChecking(false)}
            className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Accéder directement
          </button>
        </div>
      </div>
    );
  }

  // Dedicated Login Route
  if (currentPath === "/login") {
    if (user) {
      return <Navigate to="/" replace />;
    }
    return (
      <ProfileContext.Provider
        value={{
          user,
          setUser,
          refreshProfile,
          updateProfile: handleUpdateProfile,
          updateClass: handleUpdateLevel,
          logout: handleLogout,
          isSyncing,
          setIsSyncing,
        }}
      >
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 select-none font-sans">
          <AuthModal
            isOpen={true}
            onClose={() => navigateTo("/")}
            onContinueAsGuest={() => navigateTo("/")}
            onLogin={(u) => {
              handleLogin(u);
              navigateTo("/");
            }}
            initialLevel={authDefaultLevel}
          />
        </div>
      </ProfileContext.Provider>
    );
  }

  // Dedicated Landing Page Route
  if (currentPath === "/landing") {
    return (
      <ProfileContext.Provider
        value={{
          user,
          setUser,
          refreshProfile,
          updateProfile: handleUpdateProfile,
          updateClass: handleUpdateLevel,
          logout: handleLogout,
          isSyncing,
          setIsSyncing,
        }}
      >
        <LandingPage
          onExploreWeb={() => navigateTo("/")}
          onOpenLogin={() => navigateTo("/login")}
          onOpenPortfolio={() => setIsPortfolioModalOpen(true)}
          apkDownloadUrl={updateInfo?.apkUrl}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onContinueAsGuest={() => setIsAuthModalOpen(false)}
          onLogin={(u) => {
            handleLogin(u);
            setIsAuthModalOpen(false);
          }}
          initialLevel={authDefaultLevel}
        />
      </ProfileContext.Provider>
    );
  }

  const handleOpenReceipt = (tx: PaymentTransaction) => {
    setSelectedReceiptTx(tx);
    setIsReceiptOpen(true);
  };

  // Dedicated Fullscreen Admin Route with Strict AuthGuard Protection
  if (currentPath.startsWith("/admin")) {
    const userIsAdmin = user ? Boolean(user.isAdmin || isUserAdmin(user) || (user as any).role === "admin") : false;
    if (!userIsAdmin) {
      return (
        <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">Accès Restreint</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                L'Espace Administration est strictement réservé aux administrateurs autorisés (Direction Génie Mentor Académie).
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo("/")}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>Retourner à l'Accueil</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <ProfileContext.Provider
        value={{
          user,
          setUser,
          refreshProfile,
          updateProfile: handleUpdateProfile,
          updateClass: handleUpdateLevel,
          logout: handleLogout,
          isSyncing,
          setIsSyncing,
        }}
      >
        <VirtualLatexKeyboardProvider>
          <ScrollToTop />
          <AdminPage
            user={user}
            refreshProfile={refreshProfile}
            onNavigateHome={() => navigateTo("/")}
            onOpenCodeViewer={() => setIsCodeViewerOpen(true)}
            onOpenReceipt={handleOpenReceipt}
            onUpdatePhoto={handleUpdatePhoto}
            onUpdateProfile={handleUpdateProfile}
          />
        </VirtualLatexKeyboardProvider>
      </ProfileContext.Provider>
    );
  }

  return (
    <ProfileContext.Provider
      value={{
        user,
        setUser,
        refreshProfile,
        updateProfile: handleUpdateProfile,
        updateClass: handleUpdateLevel,
        logout: handleLogout,
        isSyncing,
        setIsSyncing,
      }}
    >
      <VirtualLatexKeyboardProvider>
        <ScrollToTop />
        <div className="h-[100dvh] w-full flex flex-col font-sans overflow-hidden bg-slate-50 text-slate-800 relative selection:bg-[#1A237E] selection:text-white">
        {/* Night Blue Header with Responsive Desktop Layout */}
        <Header
          user={user}
          unreadNotifCount={unreadNotifCount}
          onOpenNotifications={() => setIsNotifOpen(true)}
          onOpenShare={() => setIsShareModalOpen(true)}
          onOpenLogin={() => navigateTo("/login")}
          onOpenLanding={() => navigateTo("/landing")}
          onOpenApkModal={() => setIsApkModalOpen(true)}
          onOpenPortfolio={() => setIsPortfolioModalOpen(true)}
          isSyncing={isSyncing}
        />

        {/* Main Screen Content with Fluid Responsive Width (Mobile 1-col, Tablet 2-col, PC wide layout) */}
        <main
          key={currentPath}
          id="main-scroll-container"
          className={`flex-1 min-h-0 w-full max-w-7xl mx-auto -webkit-overflow-scrolling-touch animate-page-enter ${
            currentPath.startsWith("/tuteur")
              ? "flex flex-col flex-1 min-h-0 overflow-hidden pb-0 px-0 sm:px-3 lg:px-6 pt-0"
              : "overflow-y-auto overflow-x-hidden pb-6 px-3 sm:px-6 lg:px-8 py-3 sm:py-6"
          }`}
        >
        <Routes>
          <Route
            path="/landing"
            element={
              <LandingPage
                onExploreWeb={() => navigateTo("/")}
                onOpenLogin={() => navigateTo("/login")}
                onOpenPortfolio={() => setIsPortfolioModalOpen(true)}
                apkDownloadUrl={updateInfo?.apkUrl}
              />
            }
          />
          <Route
            path="/"
            element={
              <HomeTab
                user={user}
                courses={courses}
                quizzes={quizzes}
                onSelectCourse={(course) => {
                  setSelectedCourse(course);
                  navigateTo("/cours/" + course.subject);
                }}
                onNavigateTab={(tab, subTab) => {
                  if (tab === "exercices" || tab === "devoirs" || tab === "quiz") {
                    navigateTo("/evaluations");
                    if (tab === "exercices" || tab === "devoirs") setEvaluationsSubTab(tab);
                  } else if (tab === "evaluations") {
                    navigateTo("/evaluations");
                    if (subTab) setEvaluationsSubTab(subTab);
                  } else if (tab === "tutoriels") {
                    navigateTo("/tutoriels");
                  } else if (tab === "vip") {
                    navigateTo("/concours-vip");
                  } else if (tab === "tuteur") {
                    navigateTo("/tuteur-ia");
                  } else if (tab === "cours") {
                    navigateTo("/cours");
                  } else if (tab === "profil") {
                    navigateTo("/profil");
                  } else if (tab === "paiement") {
                    navigateTo(subTab ? `/paiement?type=${subTab}` : "/paiement");
                  } else {
                    navigateTo("/");
                  }
                }}
                onNavigateToPaiement={(type) => {
                  navigateTo(`/paiement?type=${type}`);
                }}
                onTriggerSyncWorker={handleTriggerSyncWorker}
                isSyncing={isSyncing}
                onOpenReceipt={handleOpenReceipt}
                onOpenSavoirPlus={() => navigateTo("/concours-vip")}
                onOpenVipModal={() => setIsVipModalOpen(true)}
                onOpenLogin={() => navigateTo("/login")}
                onOpenLanding={() => setIsApkModalOpen(true)}
                onOpenApkModal={() => setIsApkModalOpen(true)}
                onOpenPortfolio={() => setIsPortfolioModalOpen(true)}
              />
            }
          />

          <Route
            path="/cours"
            element={
              <CoursesTab
                userLevel={user?.level || "3ème"}
                courses={courses}
                assets={assets}
                selectedCourse={selectedCourse}
                onSelectCourse={(course) => setSelectedCourse(course)}
                onToggleCacheAsset={handleToggleCacheAsset}
                onStartQuizForSubject={(subject) => {
                  navigateTo("/evaluations");
                  setEvaluationsSubTab("quiz");
                }}
                isAdmin={user ? Boolean(user.isAdmin || isUserAdmin(user)) : false}
                isVIP={user?.isVIP || false}
                isGuest={!user}
                onOpenLogin={() => navigateTo("/login")}
                userUid={user?.uid || ""}
                userName={user?.displayName || "Invité"}
                userPhone={user?.phoneNumber || ""}
              />
            }
          />

          <Route
            path="/cours/:matiere"
            element={
              <CoursesTab
                userLevel={user?.level || "3ème"}
                courses={courses}
                assets={assets}
                selectedCourse={selectedCourse}
                onSelectCourse={(course) => setSelectedCourse(course)}
                onToggleCacheAsset={handleToggleCacheAsset}
                onStartQuizForSubject={(subject) => {
                  navigateTo("/evaluations");
                  setEvaluationsSubTab("quiz");
                }}
                isAdmin={user ? Boolean(user.isAdmin || isUserAdmin(user)) : false}
                isVIP={user?.isVIP || false}
                isGuest={!user}
                onOpenLogin={() => navigateTo("/login")}
                userUid={user?.uid || ""}
                userName={user?.displayName || "Invité"}
                userPhone={user?.phoneNumber || ""}
              />
            }
          />

          <Route
            path="/evaluations"
            element={
              <EvaluationsTab
                user={user}
                quizzes={quizzes}
                assets={assets}
                initialSubTab={evaluationsSubTab}
                onToggleCacheAsset={handleToggleCacheAsset}
                onOpenLogin={() => navigateTo("/login")}
              />
            }
          />

          <Route
            path="/evaluations/quiz/:id"
            element={
              <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
                <QuizTab
                  quizzes={quizzes}
                  userLevel={user?.level || "3ème"}
                  isAdmin={user?.isAdmin || false}
                />
              </div>
            }
          />

          <Route
            path="/tutoriels"
            element={
              <TutorialsTab
                userLevel={user?.level || "3ème"}
                isAdmin={user ? Boolean(user.isAdmin || isUserAdmin(user)) : false}
                onNavigateToAdmin={() => navigateTo("/admin/dashboard")}
                onNavigateHome={() => navigateTo("/")}
              />
            }
          />

          <Route
            path="/concours-vip"
            element={
              <ConcoursVipTab
                user={user}
                assets={assets}
                onToggleCacheAsset={handleToggleCacheAsset}
                onOpenVipModal={() => setIsVipModalOpen(true)}
                onNavigateHome={() => navigateTo("/")}
              />
            }
          />

          <Route
            path="/tuteur-ia"
            element={<AITutorTab user={user} onOpenLogin={() => navigateTo("/login")} onNavigateHome={() => navigateTo("/")} />}
          />
          <Route
            path="/tuteur"
            element={<Navigate to="/tuteur-ia" replace />}
          />

          <Route
            path="/profil"
            element={
              <ProfileTab
                user={user}
                onUpdateLevel={handleUpdateLevel}
                onUpdatePhoto={handleUpdatePhoto}
                onUpdateProfile={handleUpdateProfile}
                refreshProfile={refreshProfile}
                onClearRoomCache={handleClearRoomCache}
                onResetDatabase={handleResetDatabase}
                onOpenAdmin={() => navigateTo("/admin/dashboard")}
                onOpenCodeViewer={() => setIsCodeViewerOpen(true)}
                onLogout={handleLogout}
                onOpenReceipt={handleOpenReceipt}
                onOpenShare={() => setIsShareModalOpen(true)}
                onOpenNotifications={() => setIsNotifOpen(true)}
                onOpenLogin={() => navigateTo("/login")}
                onNavigateHome={() => navigateTo("/")}
                onOpenPortfolio={() => setIsPortfolioModalOpen(true)}
                onOpenPwaInstall={() => setIsApkModalOpen(true)}
                unreadNotifCount={unreadNotifCount}
              />
            }
          />

          <Route
            path="/reset-password"
            element={
              <ResetPasswordPage
                onNavigateHome={() => navigateTo("/")}
                onLogin={handleLogin}
              />
            }
          />

          <Route
            path="/paiement"
            element={
              <Paiement
                user={user}
                onNavigateHome={() => navigateTo("/")}
                onOpenReceipt={handleOpenReceipt}
              />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Material 3 Bottom Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userLevel={user?.level || "3ème"}
        isGuest={!user}
        isAdmin={user ? Boolean(user.isAdmin || isUserAdmin(user)) : false}
      />

      {/* Share Application Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Admin Space Modal */}
      {isAdminOpen && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          onAddCourse={handleAddCourse}
          onAddAsset={handleAddAsset}
          onAddQuiz={handleAddQuiz}
          onOpenReceipt={handleOpenReceipt}
          onOpenCodeViewer={() => setIsCodeViewerOpen(true)}
        />
      )}

      {/* Kotlin Source Code Inspector Modal */}
      <KotlinCodeViewer
        isOpen={isCodeViewerOpen}
        onClose={() => setIsCodeViewerOpen(false)}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        transaction={selectedReceiptTx}
      />

      {/* Notifications Modal */}
      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        user={user}
        userUid={user?.uid || ""}
        isAdmin={user?.isAdmin || false}
        onOpenReceipt={handleOpenReceipt}
        onUnreadCountChange={handleUnreadCountChange}
      />

      {/* GMA VIP Hub Modal */}
      <SavoirPlusModal
        isOpen={isSavoirPlusOpen}
        onClose={() => setIsSavoirPlusOpen(false)}
        user={user}
        onOpenVipModal={() => setIsVipModalOpen(true)}
      />

      {/* Pass VIP Subscription Request Modal */}
      <VipModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        userUid={user?.uid || ""}
        userName={user?.displayName || "Invité"}
        userPhone={user?.phoneNumber || ""}
      />

      {/* PWA Application Installation & Package Modal */}
      <PwaInstallModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        onOpenPortfolio={() => setIsPortfolioModalOpen(true)}
      />

      {/* Portfolio de Développement Modal */}
      <DevelopmentPortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        onOpenPwaInstall={() => setIsApkModalOpen(true)}
      />

      {/* App Update Pop-up Modal */}
      {updateInfo && (
        <UpdateModal
          isOpen={isUpdateModalOpen}
          latestVersion={updateInfo.latestVersion}
          currentVersion={updateInfo.currentVersion}
          apkUrl={updateInfo.apkUrl}
          message={updateInfo.message}
          onClose={() => setIsUpdateModalOpen(false)}
          onUpdate={applyServiceWorkerUpdate}
        />
      )}

      {/* Floating Info Toast (Synchronisation & État de mise à jour) */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[120] max-w-sm w-[92%] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md flex items-center space-x-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30">
              <CheckCircle2 size={18} className="animate-pulse" />
            </span>
            <p className="text-xs font-semibold text-slate-100 flex-1 leading-snug">
              {toastMessage}
            </p>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
        </div>
      </VirtualLatexKeyboardProvider>
    </ProfileContext.Provider>
  );
}
