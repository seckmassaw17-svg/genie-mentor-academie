import React, { useState, useEffect } from "react";
import { Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Check, RefreshCw, ShieldCheck, Clock, Send } from "lucide-react";
import { AppLogo } from "../components/AppLogo";
import { supabase } from "../lib/supabaseClient";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { UserProfile } from "../types";
import { PasswordValidationCard } from "../components/PasswordValidationCard";
import { validatePasswordComplexity } from "../utils/passwordValidation";

interface ResetPasswordPageProps {
  onNavigateHome: () => void;
  onLogin?: (user: UserProfile) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigateHome,
  onLogin,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string>(() => {
    try {
      return localStorage.getItem("savoir_reset_email") || "";
    } catch {
      return "";
    }
  });
  const [isRecoveryActive, setIsRecoveryActive] = useState(false);
  const [isInitialChecking, setIsInitialChecking] = useState(true);

  // Compte à rebours dynamique de 5 minutes (exactement 300 secondes)
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    try {
      const requestedAtStr = localStorage.getItem("savoir_reset_requested_at");
      if (requestedAtStr) {
        const elapsed = Math.floor((Date.now() - Number(requestedAtStr)) / 1000);
        return Math.max(0, 300 - elapsed);
      }
    } catch {}
    return 300;
  });

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Décompte de la minuterie chaque seconde
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const isExpired = timeLeft <= 0;

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Renvoyer un nouveau lien de réinitialisation si le délai est dépassé
  const handleResendLink = async () => {
    let emailToUse = userEmail.trim();
    if (!emailToUse) {
      const entered = window.prompt("Veuillez saisir votre adresse e-mail pour renvoyer le lien :");
      if (!entered || !entered.includes("@")) return;
      emailToUse = entered.trim().toLowerCase();
      setUserEmail(emailToUse);
    }

    setIsResending(true);
    setErrorMessage("");
    try {
      if (!supabase) throw new Error("Supabase n'est pas initialisé.");
      const redirectUrl = typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}/reset-password`
        : "https://votre-app.com/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;

      try {
        localStorage.setItem("savoir_reset_requested_at", Date.now().toString());
        localStorage.setItem("savoir_reset_email", emailToUse);
      } catch {}

      setTimeLeft(300);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Erreur lors du renvoi de l'e-mail de réinitialisation.");
    } finally {
      setIsResending(false);
    }
  };

  // Vérification de la session de récupération ou du hash d'URL Supabase
  useEffect(() => {
    let isMounted = true;

    const checkRecoveryState = async () => {
      // 1. Vérifier si l'URL contient une erreur Supabase (ex: lien expiré)
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      const params = new URLSearchParams(hash.replace(/^#/, "?") || search);

      const urlError = params.get("error_description") || params.get("error");
      if (urlError) {
        if (isMounted) {
          setTimeLeft(0);
          setErrorMessage(
            "Le lien de réinitialisation est invalide ou a expiré (délai de 5 minutes dépassé). Veuillez faire une nouvelle demande."
          );
          setIsInitialChecking(false);
        }
        return;
      }

      if (!supabase) {
        if (isMounted) setIsInitialChecking(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (isMounted) {
            setIsRecoveryActive(true);
            setUserEmail(session.user.email || "");
          }
        }
      } catch (err) {
        console.warn("ResetPassword check session notice:", err);
      } finally {
        if (isMounted) setIsInitialChecking(false);
      }
    };

    checkRecoveryState();

    if (supabase) {
      const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" || (session?.user && (event === "SIGNED_IN" || event === "USER_UPDATED"))) {
          if (isMounted) {
            setIsRecoveryActive(true);
            if (session?.user?.email) {
              setUserEmail(session.user.email);
            }
          }
        }
      });

      return () => {
        isMounted = false;
        authSub?.subscription?.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const complexity = validatePasswordComplexity(newPassword);
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isFormValid = complexity.isValid && isMatch && !isExpired;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (isExpired) {
      setErrorMessage("Le délai de 5 minutes est dépassé. Ce lien a expiré. Veuillez renvoyer un nouveau lien.");
      return;
    }

    if (!complexity.isValid) {
      setErrorMessage("Le mot de passe doit comporter au moins 6 caractères, une majuscule, une minuscule et un chiffre.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!supabase) {
        throw new Error("Supabase n'est pas initialisé.");
      }

      const cleanPassword = newPassword.trim();
      const { data, error } = await supabase.auth.updateUser({
        password: cleanPassword,
      });

      if (error) {
        throw error;
      }

      // Nettoyer le timestamp de réinitialisation
      try {
        localStorage.removeItem("savoir_reset_requested_at");
      } catch {}

      // Synchronisation avec la base locale Room si l'utilisateur existe
      if (data?.user) {
        const userId = data.user.id;
        const student = roomRepo.getStudentByUid(userId);
        if (student) {
          const updated = { ...student, password: cleanPassword, authProvider: "email" as const };
          roomRepo.registerOrUpdateStudent(updated);
          roomRepo.setUserProfile(updated);
          if (onLogin) onLogin(updated);
        } else {
          const currentProfile = roomRepo.getUserProfile();
          if (currentProfile && currentProfile.uid === userId) {
            const updated = { ...currentProfile, password: cleanPassword, authProvider: "email" as const };
            roomRepo.setUserProfile(updated);
            if (onLogin) onLogin(updated);
          }
        }
      }

      setIsSuccess(true);

      // Redirection automatique vers le tableau de bord
      setTimeout(() => {
        onNavigateHome();
      }, 2200);
    } catch (err: any) {
      console.error("Erreur réinitialisation mot de passe :", err);
      const msg = err?.message || "";
      if (msg.includes("Auth session missing") || msg.includes("recovery") || msg.includes("expired")) {
        setTimeLeft(0);
        setErrorMessage(
          "La session de récupération est expirée ou manquante (délai de 5 minutes dépassé). Veuillez refaire une demande de réinitialisation."
        );
      } else {
        setErrorMessage(msg || "Impossible de réinitialiser le mot de passe. Veuillez réessayer.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <AppLogo className="w-16 h-16 rounded-2xl shadow-lg" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold mb-2">
              <KeyRound size={13} />
              <span>Sécurité du Compte</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Réinitialiser votre mot de passe
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {userEmail
                ? `Définissez un nouveau mot de passe pour ${userEmail}`
                : "Créez un nouveau mot de passe sécurisé pour accéder à Génie Mentor Académie"}
            </p>
          </div>
        </div>

        {/* Message de succès vert clair */}
        {isSuccess ? (
          <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-5 text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full mx-auto flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-emerald-300 text-base">
                Mot de passe mis à jour avec succès !
              </h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Votre nouveau mot de passe a bien été enregistré. Vous allez être redirigé vers le tableau de bord...
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateHome}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Accéder au tableau de bord</span>
              </button>
            </div>
          </div>
        ) : (
          /* Formulaire de nouveau mot de passe */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bannière de compte à rebours dynamique de 5 minutes */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs transition-all ${
                isExpired
                  ? "bg-rose-950/80 border-rose-500/60 text-rose-300"
                  : "bg-indigo-950/70 border-indigo-500/40 text-indigo-200"
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <Clock size={16} className={isExpired ? "text-rose-400 shrink-0" : "text-amber-400 animate-pulse shrink-0"} />
                <div className="min-w-0">
                  <p className="font-extrabold text-white text-xs truncate">
                    {isExpired ? "Délai de validité dépassé" : "Validité du lien (5 minutes)"}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {isExpired
                      ? "Le lien a expiré. La saisie est bloquée."
                      : "Validez votre mot de passe avant la fin du temps imparti."}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs border shrink-0 ${
                  isExpired
                    ? "bg-rose-900/80 text-rose-200 border-rose-400/50"
                    : "bg-amber-400/20 text-amber-300 border-amber-400/40"
                }`}
              >
                {formatCountdown(timeLeft)}
              </span>
            </div>

            {resendSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs rounded-xl font-medium flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>Nouveau lien envoyé ! Un e-mail de réinitialisation valable 5 minutes vous a été adressé.</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-300 text-xs rounded-xl font-medium flex items-start space-x-2 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Blocage et proposition de renvoi si expiré */}
            {isExpired && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl space-y-2 text-center animate-in fade-in">
                <p className="text-xs text-rose-300 font-bold leading-relaxed">
                  ⚠️ Pour des raisons de sécurité, les liens et codes de réinitialisation expirent après exactement 5 minutes.
                </p>
                <button
                  type="button"
                  onClick={handleResendLink}
                  disabled={isResending}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <RefreshCw size={14} className={isResending ? "animate-spin" : ""} />
                  <span>{isResending ? "Envoi en cours..." : "Renvoyer un nouveau lien de réinitialisation"}</span>
                </button>
              </div>
            )}

            {/* Champ Nouveau mot de passe */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 text-xs block">
                Nouveau mot de passe :
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  disabled={isSubmitting || isExpired}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-white text-xs font-medium placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isExpired}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-40"
                  title={showNewPassword ? "Masquer" : "Afficher"}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Champ Confirmation */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 text-xs block">
                Confirmer le nouveau mot de passe :
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe"
                  disabled={isSubmitting || isExpired}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-white text-xs font-medium placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isExpired}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-40"
                  title={showConfirmPassword ? "Masquer" : "Afficher"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Carte de validation de complexité en temps réel */}
            <PasswordValidationCard password={newPassword} showAlways={true} />

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin text-slate-950" />
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Enregistrer le nouveau mot de passe</span>
                </>
              )}
            </button>

            {/* Bouton retour */}
            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full py-2 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Retour à l'accueil / Connexion</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
