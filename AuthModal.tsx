import React, { useState, useEffect } from "react";
import { UserProfile, SecondaryLevel } from "../types";
import { STUDENT_LEVELS, COLLEGE_LEVELS, LYCEE_LEVELS, getLevelLabel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import {
  signInWithEmailSupabase,
  signUpWithEmailSupabase,
  signInWithGoogleSupabase,
  signOutSupabase,
  sendPasswordResetEmailSupabase,
  updateUserPasswordSupabase,
  saveUserProfileToSupabase,
  getUserProfileFromSupabase,
} from "../data/supabaseStorage";
import { isUserAdmin } from "../utils/vipUtils";
import { supabase } from "../lib/supabaseClient";
import { syncUserToFirestore } from "../lib/firebaseClient";
import {
  GraduationCap,
  UserPlus,
  LogIn,
  Lock,
  Mail,
  User,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Send,
  X,
  Clock,
} from "lucide-react";
import { AppLogo } from "./AppLogo";
import { PasswordValidationCard } from "./PasswordValidationCard";
import { validatePasswordComplexity } from "../utils/passwordValidation";

interface AuthModalProps {
  onLogin: (user: UserProfile) => void;
  initialLevel?: SecondaryLevel;
  isOpen?: boolean;
  onClose?: () => void;
  onContinueAsGuest?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  onLogin,
  initialLevel,
  isOpen = true,
  onClose,
  onContinueAsGuest,
}) => {
  if (isOpen === false) return null;
  const roomRepo = RoomDatabaseRepository.getInstance();

  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  // Registration Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Email Confirmation State (Supabase standard email verification - NO manual code)
  const [isEmailConfirmationPending, setIsEmailConfirmationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [isResending, setIsResending] = useState(false);

  // Class Selection State (Google ou E-mail : Choix obligatoire si classe === NULL)
  const [userNeedingClass, setUserNeedingClass] = useState<UserProfile | null>(null);
  const [selectedClass, setSelectedClass] = useState<SecondaryLevel | null>(null);
  const [classError, setClassError] = useState("");
  const [isSavingClass, setIsSavingClass] = useState(false);

  // Password Visibility States
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Forgot Password Modal State
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [forgotResetSuccess, setForgotResetSuccess] = useState(false);
  const [forgotResetError, setForgotResetError] = useState("");
  const [forgotResetCountdown, setForgotResetCountdown] = useState(300); // 5 minutes = 300s

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (forgotResetSuccess && forgotResetCountdown > 0) {
      timer = setInterval(() => {
        setForgotResetCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [forgotResetSuccess, forgotResetCountdown]);

  const formatForgotCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ==========================================================================
  // Password Security Criteria Validation Helper
  // ==========================================================================
  const checkPasswordCriteria = (pwd: string) => {
    const hasMinLength = pwd.length >= 6;
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    return {
      hasMinLength,
      hasLower,
      hasUpper,
      hasDigit,
      isValid: hasMinLength && hasLower && hasUpper && hasDigit,
    };
  };

  const regPasswordValidation = checkPasswordCriteria(regPassword);

  // ==========================================================================
  // 1. Détection au niveau de la connexion Google & Session Supabase
  // ==========================================================================
  useEffect(() => {
    if (!supabase) return;

    const checkSessionAndClass = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const cleanEmail = (session.user.email || "").trim().toLowerCase();
        const isAdmin = isUserAdmin({ email: cleanEmail });
        if (isAdmin) {
          // Admin accounts have full access handled by App.tsx
          return;
        }

        // 1. Vérifie si l'utilisateur possède déjà une classe valide dans son profil Supabase (table profiles)
        const remote = await getUserProfileFromSupabase(session.user.id);
        const hasValidClass = Boolean(
          remote &&
          remote.classe &&
          String(remote.classe).trim() !== "" &&
          remote.classe !== "null" &&
          remote.classe !== "undefined"
        );

        if (hasValidClass && remote) {
          // 2.b. Si (classe contient une valeur valide enregistrée par l'élève) :
          // -> Redirige directement vers l'accueil configuré sur cette classe active.
          const resolvedName =
            (remote.displayName && remote.displayName.trim()) ||
            (remote.fullName && remote.fullName.trim()) ||
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.user_metadata?.display_name ||
            cleanEmail.split("@")[0] ||
            "Élève";
          const nameParts = resolvedName.trim().split(/\s+/);
          const prenom = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0];
          const nom = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

          const fullUser: UserProfile = {
            ...remote,
            displayName: resolvedName,
            fullName: resolvedName,
            prenom,
            nom,
            role: remote.role || "eleve",
            level: remote.classe as SecondaryLevel,
            classe: remote.classe,
            isProfileComplete: true,
          };
          roomRepo.setUserProfile(fullUser);
          roomRepo.registerOrUpdateStudent(fullUser);
          try {
            localStorage.setItem("savoirplus_user_profile", JSON.stringify(fullUser));
            localStorage.setItem("savoir_user", JSON.stringify(fullUser));
            sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(fullUser));
          } catch {}
          syncUserToFirestore(fullUser).catch(() => {});
          onLogin(fullUser);
        } else {
          // 2.a. Si (classe === null || classe === '' || classe === undefined) :
          // -> Redirige OBLIGATOIREMENT l'utilisateur vers l'écran de sélection de la classe.
          const resolvedDraftName =
            remote?.displayName ||
            remote?.fullName ||
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.user_metadata?.display_name ||
            cleanEmail.split("@")[0] ||
            "Élève";
          const draftParts = resolvedDraftName.trim().split(/\s+/);
          const draftPrenom = draftParts.length > 1 ? draftParts.slice(0, -1).join(" ") : draftParts[0];
          const draftNom = draftParts.length > 1 ? draftParts[draftParts.length - 1] : "";

          const draftProfile: UserProfile = {
            uid: session.user.id,
            email: cleanEmail,
            displayName: resolvedDraftName,
            fullName: resolvedDraftName,
            prenom: draftPrenom,
            nom: draftNom,
            role: remote?.role || "eleve",
            photoUrl:
              remote?.photoUrl ||
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              "",
            level: undefined,
            classe: null as any,
            isAdmin: false,
            isVIP: Boolean(remote?.isVIP),
            isProfileComplete: false,
            createdAt: remote?.createdAt || Date.now(),
            authProvider: (session.user.app_metadata?.provider as any) || "google",
          };
          setUserNeedingClass(draftProfile);
          setSelectedClass(null);
          setClassError("");
        }
      } catch (err) {
        console.warn("Session and class verification notice:", err);
      }
    };

    checkSessionAndClass();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        checkSessionAndClass();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [onLogin]);

  // ==========================================================================
  // Google Auth Button Handler
  // ==========================================================================
  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    setLoginError("");

    try {
      await signInWithGoogleSupabase();
    } catch (err: any) {
      console.warn("Google sign-in notice:", err);
      setLoginError(
        err?.message || "Impossible de se connecter avec Google pour le moment. Veuillez réessayer ou utiliser l'e-mail."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ==========================================================================
  // Validation du Choix de la Classe (Google & E-mail)
  // ==========================================================================
  const handleValidateClassSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userNeedingClass) return;
    setClassError("");

    if (!selectedClass) {
      setClassError("Veuillez obligatoirement sélectionner votre classe ci-dessous.");
      return;
    }

    setIsSavingClass(true);
    try {
      // 1. Récupération stricte de l'UUID utilisateur Supabase active
      let userUuid = userNeedingClass.uid || userNeedingClass.id;
      if (supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.id) {
            userUuid = authData.user.id;
          }
        } catch {}
      }

      if (!userUuid) {
        throw new Error("Identifiant de session invalide. Veuillez vous réauthentifier.");
      }

      const finalUser: UserProfile = {
        ...userNeedingClass,
        uid: userUuid,
        id: userUuid,
        role: userNeedingClass.role || "eleve",
        level: selectedClass,
        classe: selectedClass,
        isProfileComplete: true,
      };

      // 2. Déclenchement instantané de l'UPDATE sur la table profiles dans Supabase
      // et ATTENTE de la confirmation de sauvegarde (Persistance garantie)
      if (supabase) {
        const { error: directErr } = await supabase
          .from("profiles")
          .update({
            classe: selectedClass,
            level: selectedClass,
            is_profile_complete: true,
            updated_at: Date.now(),
          })
          .eq("id", userUuid);

        if (directErr) {
          console.warn("[Supabase Direct UPDATE notice, trying upsert]:", directErr);
        }
      }

      // Enregistrement complet avec fallback upsert
      await saveUserProfileToSupabase(finalUser);

      // 3. Mise à jour de la base Room locale
      roomRepo.setUserProfile(finalUser);
      roomRepo.registerOrUpdateStudent(finalUser);
      try {
        localStorage.setItem("savoirplus_user_profile", JSON.stringify(finalUser));
        localStorage.setItem("savoir_user", JSON.stringify(finalUser));
        sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(finalUser));
      } catch {}
      syncUserToFirestore(finalUser).catch(() => {});

      // 4. Fermeture de l'écran uniquement UNE FOIS la confirmation de sauvegarde reçue de Supabase
      setUserNeedingClass(null);
      setSelectedClass(null);
      onLogin(finalUser);
    } catch (err: any) {
      console.error("Save class error:", err);
      setClassError(`Erreur d'enregistrement dans Supabase : ${err?.message || "Échec de connexion"}. Veuillez réessayer.`);
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleCancelClassSelection = async () => {
    try {
      await signOutSupabase();
    } catch {
      // ignore
    }
    setUserNeedingClass(null);
    setSelectedClass(null);
    setClassError("");
  };

  // ==========================================================================
  // Inscription Form Submission (avec Validation Mot de Passe & E-mail Supabase)
  // ==========================================================================
  const validateFullName = (name: string): boolean => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    return parts.length >= 2 && trimmed.length >= 4;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!validateFullName(regName)) {
      setRegError("Veuillez saisir votre Nom et Prénom complets (ex: Babacar Ndiaye).");
      return;
    }

    const cleanRegEmail = regEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanRegEmail)) {
      setRegError("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    // Validation stricte du mot de passe :
    // a. Longueur minimale : 6 caractères.
    // b. Doit contenir au moins : une minuscule, une majuscule et un chiffre.
    const validation = checkPasswordCriteria(regPassword);
    if (!validation.isValid) {
      setRegError(
        "Le mot de passe doit comporter au moins 6 caractères et contenir au moins une lettre minuscule, une lettre majuscule et un chiffre."
      );
      return;
    }

    setIsRegistering(true);
    try {
      // Au clic sur "S'inscrire (Validation par E-mail)", utilise la fonction d'inscription standard Supabase (signUp) avec confirmation par e-mail
      const createdUser = await signUpWithEmailSupabase(
        cleanRegEmail,
        regPassword,
        regName.trim(),
        undefined
      );

      if (createdUser && createdUser.uid) {
        const parts = regName.trim().split(/\s+/);
        const registeredProfile: UserProfile = {
          ...createdUser,
          id: createdUser.uid,
          uid: createdUser.uid,
          displayName: regName.trim(),
          fullName: regName.trim(),
          prenom: parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0],
          nom: parts.length > 1 ? parts[parts.length - 1] : "",
          email: cleanRegEmail,
          role: createdUser.role || "eleve",
          level: "3ème",
          classe: "3ème",
          isProfileComplete: true,
        };
        roomRepo.setUserProfile(registeredProfile);
        roomRepo.registerOrUpdateStudent(registeredProfile);
        try {
          localStorage.setItem("savoirplus_user_profile", JSON.stringify(registeredProfile));
          localStorage.setItem("savoir_user", JSON.stringify(registeredProfile));
          sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(registeredProfile));
        } catch {}
        syncUserToFirestore(registeredProfile).catch(() => {});
      }

      // Une fois le formulaire soumis avec succès :
      // a. N'envoie pas de code manuel à saisir sur l'écran.
      // b. Affiche un écran/message d'information :
      // "Un e-mail de confirmation a été envoyé à votre adresse. Veuillez cliquer sur le lien reçu pour confirmer votre e-mail et rejoindre Savoir+."
      setRegisteredEmail(cleanRegEmail);
      setIsEmailConfirmationPending(true);
      setResendStatus("");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("existe déjà")) {
        setRegError("Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter dans l'onglet 'Se connecter'.");
      } else {
        setRegError(msg || "Erreur lors de la création du compte. Veuillez réessayer.");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Renvoi de l'e-mail de confirmation Supabase
  const handleResendConfirmationEmail = async () => {
    if (!registeredEmail || !supabase || isResending) return;
    setIsResending(true);
    setResendStatus("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: registeredEmail,
      });
      if (error) throw error;
      setResendStatus("Un nouvel e-mail de confirmation a été envoyé avec succès.");
      setTimeout(() => setResendStatus(""), 6000);
    } catch (err: any) {
      setResendStatus(err?.message || "Impossible de renvoyer l'e-mail pour le moment.");
    } finally {
      setIsResending(false);
    }
  };

  // ==========================================================================
  // Connexion Form Submission
  // ==========================================================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanEmail) {
      setLoginError("Veuillez saisir votre adresse e-mail.");
      return;
    }

    if (!cleanPassword) {
      setLoginError("Veuillez saisir votre mot de passe.");
      return;
    }

    setIsLoggingIn(true);
    try {
      // 1. Vérification spéciale compte administrateur
      const isAdminLogin =
        cleanEmail === "massaw.seck@unchk.edu.sn" ||
        cleanEmail === "massperpendiculaire@gmail.com" ||
        cleanEmail === "massaw.savoirplus@gmail.com";

      // Tenter d'abord la connexion via Supabase (ce qui gère les comptes restaurés après effacement du cache/cookies)
      let supaUser: UserProfile | null = null;
      let supaError: any = null;

      try {
        supaUser = await signInWithEmailSupabase(cleanEmail, cleanPassword);
      } catch (err) {
        supaError = err;
      }

      if (supaUser) {
        // Connexion Supabase réussie !
        // Si c'est un compte administrateur, on s'assure qu'il est synchronisé localement avec les privilèges admin
        if (isAdminLogin) {
          supaUser.isAdmin = true;
          supaUser.isVIP = true;
          supaUser.role = "admin";
          supaUser.password = cleanPassword;
          roomRepo.setAdminPassword(cleanPassword);
        }

        const hasValidClass = Boolean(
          supaUser.classe &&
          String(supaUser.classe).trim() !== "" &&
          supaUser.classe !== "null" &&
          supaUser.classe !== "undefined"
        );

        // Si (classe === null || classe === '' || classe === undefined) :
        // -> Redirige OBLIGATOIREMENT l'utilisateur vers l'écran de sélection de la classe.
        if (!hasValidClass && !supaUser.isAdmin) {
          const draftProfile: UserProfile = {
            ...supaUser,
            password: cleanPassword,
            level: undefined,
            classe: null as any,
            isProfileComplete: false,
            authProvider: "email",
          };
          setUserNeedingClass(draftProfile);
          setSelectedClass(null);
          setClassError("");
          return;
        }

        const authUserId = supaUser.id || supaUser.uid;
        const resolvedName = (supaUser.displayName || supaUser.fullName || "").trim() || cleanEmail.split("@")[0] || "Élève";
        const parts = resolvedName.split(/\s+/);
        const prenom = supaUser.prenom || (parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0]);
        const nom = supaUser.nom || (parts.length > 1 ? parts[parts.length - 1] : "");

        const fullUser: UserProfile = {
          ...supaUser,
          id: authUserId,
          uid: authUserId,
          displayName: resolvedName,
          fullName: resolvedName,
          prenom,
          nom,
          email: cleanEmail,
          role: supaUser.role || (isAdminLogin ? "admin" : "eleve"),
          level: isAdminLogin ? undefined : ((supaUser.classe as SecondaryLevel) || supaUser.level || "3ème"),
          classe: isAdminLogin ? undefined : (supaUser.classe || supaUser.level || "3ème"),
          password: cleanPassword,
          isProfileComplete: true,
        };

        if (fullUser.isAdmin) {
          roomRepo.setAdminPassword(cleanPassword);
        } else {
          roomRepo.registerOrUpdateStudent(fullUser);
        }
        roomRepo.setUserProfile(fullUser);
        try {
          localStorage.setItem("savoirplus_user_profile", JSON.stringify(fullUser));
          localStorage.setItem("savoir_user", JSON.stringify(fullUser));
          sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(fullUser));
        } catch {}
        syncUserToFirestore(fullUser).catch(() => {});
        onLogin(fullUser);
        return;
      }

      // 2. Si la connexion Supabase a échoué (ex: hors-ligne, utilisateur non créé dans Supabase Auth, etc.) :
      // On applique le fallback d'authentification pour le compte administrateur
      if (isAdminLogin) {
        const savedAdminPass = (roomRepo.getAdminPassword() || "123456").trim();
        // L'administrateur est autorisé avec son mot de passe enregistré, le mot de passe d'initialisation 123456, ou son mot de passe saisi (>= 6 caractères)
        if (cleanPassword === savedAdminPass || cleanPassword === "123456" || cleanPassword.length >= 6) {
          // Si un nouveau mot de passe a été fourni par l'administrateur, on le met à jour
          roomRepo.setAdminPassword(cleanPassword);
          const existingProfile = roomRepo.getUserProfile();
          let adminUid = existingProfile?.uid || existingProfile?.id;
          if (supabase) {
            try {
              const { data: authData } = await supabase.auth.getUser();
              if (authData?.user?.id) adminUid = authData.user.id;
            } catch {}
          }
          if (!adminUid) {
            adminUid = cleanEmail === "massperpendiculaire@gmail.com" ? "admin_massperpendiculaire" : "massaw_seck_admin";
          }
          const adminParts = (existingProfile?.displayName || "Massaw Seck").split(/\s+/);
          const userProfile: UserProfile = {
            id: adminUid,
            uid: adminUid,
            displayName: existingProfile?.displayName || (cleanEmail === "massperpendiculaire@gmail.com" ? "Massaw Seck" : "Administrateur"),
            fullName: existingProfile?.displayName || (cleanEmail === "massperpendiculaire@gmail.com" ? "Massaw Seck" : "Administrateur"),
            prenom: adminParts[0] || "Massaw",
            nom: adminParts.slice(1).join(" ") || "Seck",
            email: cleanEmail,
            role: "admin",
            level: undefined,
            classe: undefined,
            photoUrl: existingProfile?.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
            isAdmin: true,
            isVIP: true,
            isProfileComplete: true,
            password: cleanPassword,
            createdAt: existingProfile?.createdAt || Date.now(),
          };
          roomRepo.setUserProfile(userProfile);
          try {
            localStorage.setItem("savoirplus_user_profile", JSON.stringify(userProfile));
            localStorage.setItem("savoir_user", JSON.stringify(userProfile));
            sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(userProfile));
          } catch {}
          syncUserToFirestore(userProfile).catch(() => {});
          onLogin(userProfile);
          return;
        }
      }

      if (supaError) {
        const msg = (supaError.message || "").toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          setLoginError(
            "Votre adresse e-mail n'a pas encore été confirmée. Veuillez cliquer sur le lien reçu par e-mail avant de vous connecter."
          );
          return;
        }
      }

      // Vérification fallback dans la base locale (Room DB) pour les élèves
      const allStudents = roomRepo.getAllStudents();
      const match = allStudents.find((s) => (s.email || "").toLowerCase().trim() === cleanEmail);
      if (match && ((match.password || "").trim() === cleanPassword || match.password === loginPassword)) {
        const hasValidClass = Boolean(
          match.classe &&
          String(match.classe).trim() !== "" &&
          match.classe !== "null" &&
          match.classe !== "undefined"
        );
        if (!hasValidClass && !match.isAdmin) {
          setUserNeedingClass(match);
          setSelectedClass(null);
          setClassError("");
          return;
        }
        const studentUid = match.uid || match.id || `student_${Date.now()}`;
        const parts = (match.displayName || "").trim().split(/\s+/);
        const studentUser: UserProfile = {
          ...match,
          id: studentUid,
          uid: studentUid,
          fullName: match.displayName,
          prenom: parts[0] || match.displayName,
          nom: parts.slice(1).join(" ") || "",
          role: match.role || "eleve",
          level: match.level || "3ème",
          classe: match.classe || match.level || "3ème",
          isProfileComplete: true,
        };
        roomRepo.setUserProfile(studentUser);
        try {
          localStorage.setItem("savoirplus_user_profile", JSON.stringify(studentUser));
          localStorage.setItem("savoir_user", JSON.stringify(studentUser));
          sessionStorage.setItem("savoirplus_user_profile", JSON.stringify(studentUser));
        } catch {}
        syncUserToFirestore(studentUser).catch(() => {});
        onLogin(studentUser);
        return;
      }

      throw supaError || new Error("Identifiants invalides : e-mail ou mot de passe incorrect.");
    } catch (err: any) {
      setLoginError(err?.message || "Identifiants invalides : e-mail ou mot de passe incorrect.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ==========================================================================
  // Mot de passe oublié (Flux Supabase Auth avec envoi d'e-mail de réinitialisation)
  // ==========================================================================
  const handleResetPassword = async (email: string) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      alert("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    setIsSendingResetEmail(true);
    setForgotResetError("");

    const redirectUrl = typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/reset-password`
      : "https://votre-app.com/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    setIsSendingResetEmail(false);

    if (error) {
      setForgotResetError(error.message);
    } else {
      try {
        localStorage.setItem("savoir_reset_requested_at", Date.now().toString());
        localStorage.setItem("savoir_reset_email", cleanEmail);
      } catch {}
      setForgotResetCountdown(300);
      setForgotResetSuccess(true);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleResetPassword(forgotEmail);
  };

  // ==========================================================================
  // ÉCRAN DE SÉLECTION DE LA CLASSE (OBLIGATOIRE SI CLASSE === NULL / INDÉFINIE)
  // Optimisé Mobile : Aucune coupure d'overflow, boutons compacts, bouton "Suivant" en haut à droite
  // ==========================================================================
  if (userNeedingClass) {
    return (
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl flex flex-col h-[90dvh] sm:h-auto sm:max-h-[88vh] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
          
          {/* Bandeau d'en-tête avec bouton "Suivant" bien visible au coin supérieur droit */}
          <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-[#1A237E] px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-white flex items-center justify-between gap-2.5 shrink-0 border-b border-indigo-800 shadow-sm">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-[#1A237E] flex items-center justify-center shadow-md shrink-0 font-black">
                <GraduationCap size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white truncate">
                  Choisir votre classe
                </h2>
                <p className="text-[10px] sm:text-xs text-indigo-200 truncate font-medium">
                  {userNeedingClass.displayName ? `Bonjour ${userNeedingClass.displayName.split(" ")[0]}` : "Étape obligatoire"} • GMA
                </p>
              </div>
            </div>

            {/* Bouton "Suivant" repositionné en haut à droite (toujours visible) */}
            <button
              type="button"
              id="btn-valider-classe-top"
              onClick={() => handleValidateClassSubmit()}
              disabled={!selectedClass || isSavingClass}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-black text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shrink-0 active:scale-95 ${
                selectedClass
                  ? "bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300/80 shadow-amber-400/25"
                  : "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"
              }`}
              title={selectedClass ? "Valider la classe et continuer" : "Sélectionnez d'abord votre classe"}
            >
              <span>{isSavingClass ? "..." : "Suivant"}</span>
              {isSavingClass ? (
                <RefreshCw size={13} className="animate-spin text-slate-950" />
              ) : (
                <ArrowRight size={14} className={selectedClass ? "text-slate-950" : "text-white/40"} />
              )}
            </button>
          </div>

          {/* Sous-barre récapitulative & statut de sélection */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              {userNeedingClass.photoUrl ? (
                <img
                  src={userNeedingClass.photoUrl}
                  alt={userNeedingClass.displayName}
                  className="w-5 h-5 rounded-full object-cover border border-indigo-400 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-indigo-900 text-amber-300 text-[9px] font-black flex items-center justify-center shrink-0">
                  {(userNeedingClass.displayName || "E").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-slate-700 font-bold truncate text-[10px] sm:text-xs">
                {userNeedingClass.email}
              </span>
            </div>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                selectedClass
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
              }`}
            >
              {selectedClass ? `Classe : ${selectedClass}` : "Sélection requise *"}
            </span>
          </div>

          {/* Message d'erreur éventuel */}
          {classError && (
            <div className="mx-3 mt-2 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center space-x-2 shrink-0">
              <AlertCircle size={14} className="shrink-0" />
              <span>{classError}</span>
            </div>
          )}

          {/* Corps défilant : boutons compacts avec texte réduit pour mobile */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
            {/* Section Collège */}
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1A237E] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  Collège (Moyen)
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {COLLEGE_LEVELS.map((lvl) => {
                  const isSelected = selectedClass === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setSelectedClass(lvl);
                        setClassError("");
                      }}
                      className={`py-2 px-1.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center active:scale-95 ${
                        isSelected
                          ? "border-[#1A237E] bg-gradient-to-br from-indigo-900 to-[#1A237E] text-white shadow-md ring-2 ring-indigo-400/40"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-800 shadow-2xs"
                      }`}
                    >
                      <span className={`text-[8px] sm:text-[9px] font-extrabold uppercase leading-none mb-0.5 ${isSelected ? "text-amber-300" : "text-amber-600"}`}>
                        Collège
                      </span>
                      <span className="text-[11px] sm:text-xs font-black tracking-tight leading-tight">
                        {getLevelLabel(lvl)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Lycée */}
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1A237E] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  Lycée (Secondaire)
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {LYCEE_LEVELS.map((lvl) => {
                  const isSelected = selectedClass === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setSelectedClass(lvl);
                        setClassError("");
                      }}
                      className={`py-2 px-1.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center active:scale-95 ${
                        isSelected
                          ? "border-[#1A237E] bg-gradient-to-br from-indigo-900 to-[#1A237E] text-white shadow-md ring-2 ring-indigo-400/40"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-800 shadow-2xs"
                      }`}
                    >
                      <span className={`text-[8px] sm:text-[9px] font-extrabold uppercase leading-none mb-0.5 ${isSelected ? "text-amber-300" : "text-slate-400"}`}>
                        Niveau
                      </span>
                      <span className="text-[11px] sm:text-xs font-black tracking-tight leading-tight">
                        {getLevelLabel(lvl)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pied de page avec bouton principal et option retour */}
          <div className="p-2.5 sm:p-4 bg-slate-50 border-t border-slate-200/80 shrink-0 space-y-1.5">
            <button
              type="button"
              id="btn-valider-classe-bottom"
              onClick={() => handleValidateClassSubmit()}
              disabled={!selectedClass || isSavingClass}
              className="w-full py-2.5 sm:py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
            >
              {isSavingClass ? (
                <RefreshCw size={15} className="animate-spin text-amber-300" />
              ) : (
                <CheckCircle2 size={15} className="text-amber-300" />
              )}
              <span>
                {isSavingClass
                  ? "Enregistrement..."
                  : selectedClass
                  ? `Valider la classe de ${selectedClass}`
                  : "Sélectionnez votre classe pour valider"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCancelClassSelection}
              className="w-full py-1 text-slate-500 hover:text-slate-800 text-[11px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
            >
              <ArrowLeft size={12} />
              <span>Changer de compte / Retour</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl my-auto max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer z-20"
            title="Fermer et continuer en mode invité"
          >
            <X size={20} />
          </button>
        )}
        
        {/* Header Branding */}
        <div className="text-center space-y-1.5 shrink-0 pb-2.5 border-b border-slate-100">
          <AppLogo
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-amber-400 shadow-md mx-auto"
            alt="Génie Mentor Académie Logo"
          />
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A237E]">Génie Mentor Académie</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Plateforme Éducative Offline-First • GMA
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-4">

          {/* ================================================================ */}
          {/* ÉCRAN D'INFORMATION : CONFIRMATION PAR E-MAIL SUPABASE            */}
          {/* ================================================================ */}
          {isEmailConfirmationPending ? (
            <div className="space-y-4 animate-in fade-in py-1">
              <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-5 text-center space-y-3">
                <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-full mx-auto flex items-center justify-center shadow-inner">
                  <Mail size={28} />
                </div>
                
                <h3 className="font-black text-[#1A237E] text-base">
                  Vérifiez votre boîte de réception
                </h3>

                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Un e-mail de confirmation a été envoyé à votre adresse. Veuillez cliquer sur le lien reçu pour confirmer votre e-mail et rejoindre Génie Mentor Académie.
                </p>

                <div className="bg-white border border-amber-200 py-2 px-3 rounded-xl inline-block shadow-2xs">
                  <span className="font-extrabold text-xs text-[#1A237E]">
                    {registeredEmail}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-snug">
                  L'accès à la plateforme sera disponible dès que vous aurez validé ce lien de confirmation.
                </p>
              </div>

              {resendStatus && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold text-center">
                  {resendStatus}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEmailConfirmationPending(false);
                    setAuthTab("login");
                    setLoginEmail(registeredEmail);
                    setLoginPassword("");
                    setLoginError("");
                  }}
                  className="w-full py-3.5 bg-[#1A237E] hover:bg-indigo-900 text-white font-black text-xs rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <LogIn size={16} className="text-amber-300" />
                  <span>J'ai confirmé mon e-mail / Se connecter</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendConfirmationEmail}
                  disabled={isResending}
                  className="w-full py-2.5 text-indigo-700 hover:text-indigo-950 font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} className={isResending ? "animate-pulse" : ""} />
                  <span>{isResending ? "Envoi en cours..." : "Renvoyer l'e-mail de confirmation"}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Onglets */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAuthTab("login")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    authTab === "login"
                      ? "bg-[#1A237E] text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LogIn size={15} />
                  <span>Se connecter</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthTab("register")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    authTab === "register"
                      ? "bg-[#1A237E] text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserPlus size={15} />
                  <span>Créer un compte</span>
                </button>
              </div>

              {/* ============================================================ */}
              {/* ONGLET 1 : SE CONNECTER                                      */}
              {/* ============================================================ */}
              {authTab === "login" && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
                  {loginError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center space-x-1.5">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Adresse Email :</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="votre.email@senegal.sn"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-slate-800 font-medium focus:outline-hidden focus:border-[#1A237E]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700 block">Mot de passe :</label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginEmail.trim());
                          setForgotResetError("");
                          setForgotResetSuccess(false);
                          setIsForgotPasswordModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer flex items-center space-x-1"
                      >
                        <KeyRound size={12} />
                        <span>Mot de passe oublié ?</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-slate-800 font-medium focus:outline-hidden focus:border-[#1A237E]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showLoginPassword ? "Masquer" : "Afficher"}
                      >
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5 cursor-pointer mt-2 disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <RefreshCw size={16} className="animate-spin text-amber-300" />
                    ) : (
                      <LogIn size={16} />
                    )}
                    <span>{isLoggingIn ? "Connexion en cours..." : "Se Connecter à GMA"}</span>
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="shrink-0 mx-2 text-[10px] text-slate-400 font-bold uppercase">
                      Ou se connecter avec
                    </span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button
                    type="button"
                    disabled={isGoogleLoading}
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGoogleLoading ? (
                      <RefreshCw size={16} className="animate-spin text-indigo-700 shrink-0" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>
                      {isGoogleLoading ? "Connexion Google en cours..." : "Continuer avec Google"}
                    </span>
                  </button>

                  {/* Lien Mot de passe oublié sous le formulaire de connexion */}
                  <div className="text-center pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail.trim());
                        setForgotResetError("");
                        setForgotResetSuccess(false);
                        setIsForgotPasswordModalOpen(true);
                      }}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-950 hover:underline cursor-pointer inline-flex items-center space-x-1.5 py-1"
                    >
                      <KeyRound size={13} className="text-amber-500" />
                      <span>Mot de passe oublié ?</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ============================================================ */}
              {/* ONGLET 2 : CRÉER UN COMPTE (Validation Mot de passe & E-mail) */}
              {/* ============================================================ */}
              {authTab === "register" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                  {regError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center space-x-1.5">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nom et Prénom :</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: Babacar Ndiaye"
                        value={regName}
                        onChange={(e) => {
                          setRegName(e.target.value);
                          if (regError) setRegError("");
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-slate-800 font-medium focus:outline-hidden focus:border-[#1A237E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Adresse Email :</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="babacar.ndiaye@senegal.sn"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          if (regError) setRegError("");
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-slate-800 font-medium focus:outline-hidden focus:border-[#1A237E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Créer un Mot de passe :</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        placeholder="6 caractères min (minuscule, MAJUSCULE, chiffre)"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (regError) setRegError("");
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-slate-800 font-medium focus:outline-hidden focus:border-[#1A237E]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showRegPassword ? "Masquer" : "Afficher"}
                      >
                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Indicateurs visuels en temps réel de complexité du mot de passe */}
                    <PasswordValidationCard password={regPassword} showAlways={true} />
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5 cursor-pointer mt-2 disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <RefreshCw size={16} className="animate-spin text-amber-300" />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    <span>
                      {isRegistering ? "Création du compte..." : "S'inscrire (Validation par E-mail)"}
                    </span>
                  </button>
                </form>
              )}
            </>
          )}

        </div>

        {(onClose || onContinueAsGuest) && (
          <div className="pt-2.5 pb-1 text-center border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onContinueAsGuest || onClose}
              className="text-xs text-slate-500 hover:text-[#1A237E] font-bold py-1.5 px-3 rounded-xl hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center space-x-1"
            >
              <span>Continuer en Mode Invité sans connexion</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODALE DÉDIÉE : MOT DE PASSE OUBLIÉ (Flux Supabase Auth)      */}
      {/* ============================================================ */}
      {isForgotPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-[60] flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative border border-slate-100 animate-in zoom-in-95">
            {/* Bouton fermer */}
            <button
              type="button"
              onClick={() => setIsForgotPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* En-tête */}
            <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 shadow-xs">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-[#1A237E] text-base">Mot de passe oublié ?</h3>
                <p className="text-[11px] text-slate-500 font-medium">Réinitialisation par e-mail via Supabase</p>
              </div>
            </div>

            {forgotResetSuccess ? (
              <div className="space-y-4 py-2">
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-extrabold text-emerald-900 text-sm">Lien de réinitialisation envoyé !</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Un e-mail contenant votre lien sécurisé de réinitialisation a été envoyé à :
                  </p>
                  <p className="text-xs font-black text-[#1A237E] bg-white py-1.5 px-3 rounded-lg border border-emerald-200 inline-block">
                    {forgotEmail}
                  </p>

                  {/* Compte à rebours dynamique de 5 minutes (300s) */}
                  <div className="pt-2">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-mono font-bold">
                      <Clock size={13} className="text-amber-700 animate-pulse" />
                      <span>
                        {forgotResetCountdown > 0
                          ? `Ce lien expire dans ${formatForgotCountdown(forgotResetCountdown)}`
                          : "Délai de 5 min dépassé (Expiré)"}
                      </span>
                    </div>
                  </div>

                  {forgotResetCountdown === 0 ? (
                    <div className="pt-2">
                      <p className="text-xs text-rose-700 font-bold mb-2">
                        ⚠️ Le délai de validité de 5 minutes est écoulé. Le lien envoyé a expiré.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleResetPassword(forgotEmail)}
                        disabled={isSendingResetEmail}
                        className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <RefreshCw size={13} className={isSendingResetEmail ? "animate-spin" : ""} />
                        <span>Renvoyer un nouveau lien de réinitialisation</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 pt-1">
                      Consultez votre boîte de réception ainsi que vos courriers indésirables (spams), puis cliquez sur le lien avant la fin du décompte pour définir votre nouveau mot de passe.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(false)}
                  className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Fermer et retourner à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendResetPassword} className="space-y-3.5 text-xs">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Saisissez l'adresse e-mail associée à votre compte Génie Mentor Académie. Nous vous enverrons un lien pour réinitialiser votre mot de passe en toute sécurité.
                </p>

                {forgotResetError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center space-x-1.5">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{forgotResetError}</span>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Votre Adresse Email :</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="votre.email@senegal.sn"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-slate-800 font-medium focus:outline-hidden focus:border-[#1A237E]"
                    />
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSendingResetEmail}
                    className="flex-1 py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingResetEmail ? (
                      <>
                        <RefreshCw size={15} className="animate-spin text-amber-300" />
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Envoyer le lien</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordModalOpen(false)}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
