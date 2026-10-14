import React, { useState, useEffect } from "react";
import { Download, Sparkles, X, RefreshCw, CheckCircle2, Check } from "lucide-react";
import { AppLogo } from "./AppLogo";
import { applyServiceWorkerUpdate } from "../utils/swUpdate";
import { APP_VERSION } from "../constants/version";

interface UpdateModalProps {
  isOpen: boolean;
  latestVersion: string;
  currentVersion?: string;
  apkUrl?: string;
  message?: string;
  autoStart?: boolean;
  onClose: () => void;
  onUpdate?: () => Promise<void> | void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  latestVersion,
  currentVersion = APP_VERSION,
  apkUrl = "",
  message,
  autoStart = false,
  onClose,
  onUpdate,
}) => {
  const [step, setStep] = useState<"available" | "progress" | "complete">("available");
  const [progress, setProgress] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

  const activeCurrentVersion = currentVersion || APP_VERSION;

  // Reset or initialize step whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setIsApplying(false);
      if (autoStart) {
        setStep("progress");
        setProgress(0);
      } else {
        setStep("available");
        setProgress(0);
      }
    }
  }, [isOpen, autoStart]);

  // Handle simulated progress animation from 0% to 100%
  useEffect(() => {
    if (!isOpen || step !== "progress") return;

    setProgress(5);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep("complete");
          return 100;
        }
        const inc = Math.floor(Math.random() * 14) + 8;
        const next = Math.min(100, prev + inc);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setStep("complete");
          }, 350);
          return 100;
        }
        return next;
      });
    }, 160);

    return () => clearInterval(interval);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleApplyUpdate = async () => {
    setIsApplying(true);
    try {
      if (onUpdate) {
        await onUpdate();
      } else {
        await applyServiceWorkerUpdate();
      }
    } catch (err) {
      console.warn("Update application notice:", err);
      if (apkUrl) {
        window.open(apkUrl, "_blank");
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden space-y-5 transform transition-all scale-100">
        
        {/* Top Decorative Gradient Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-[#1A237E]" />

        {/* Close Button */}
        {step !== "progress" && !isApplying && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X size={20} />
          </button>
        )}

        {/* STEP 1: AVAILABLE */}
        {step === "available" && (
          <>
            <div className="text-center space-y-3 pt-2">
              <div className="relative inline-block">
                <AppLogo
                  className="w-16 h-16 rounded-2xl border-2 border-amber-400 shadow-md mx-auto"
                  alt="Génie Mentor Académie Logo"
                />
                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-[#1A237E] p-1 rounded-full shadow-md">
                  <Sparkles size={16} className="animate-pulse" />
                </span>
              </div>

              <div>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-[#1A237E] dark:text-amber-300 text-xs font-black rounded-full border border-amber-300 dark:border-amber-700">
                  <Sparkles size={12} />
                  <span>Version {latestVersion} disponible !</span>
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                  Nouvelle version disponible !
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Génie Mentor Académie • Version actuelle v{activeCurrentVersion} → v{latestVersion}
                </p>
              </div>
            </div>

            {/* Message Body */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {message || "Une nouvelle version de l'application Génie Mentor Académie (GMA) est disponible avec de nouvelles améliorations et corrections."}
              </p>
            </div>

            {/* Actions Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Plus tard
              </button>

              <button
                type="button"
                onClick={() => setStep("progress")}
                className="py-3 px-4 bg-gradient-to-r from-[#1A237E] to-indigo-800 hover:from-indigo-900 hover:to-[#1A237E] text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-900/20 hover:shadow-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-2 border border-amber-400/40"
              >
                <Download size={16} className="animate-bounce text-amber-300" />
                <span>Mettre à jour</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 2: PROGRESS BAR (0% à 100%) */}
        {step === "progress" && (
          <div className="text-center space-y-4 py-2 animate-in fade-in duration-200">
            <div className="relative inline-block">
              <AppLogo
                className="w-16 h-16 rounded-2xl border-2 border-amber-400 shadow-md mx-auto animate-pulse"
                alt="Génie Mentor Académie Logo"
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-[#1A237E] p-1 rounded-full shadow-md">
                <RefreshCw size={15} className="animate-spin text-[#1A237E]" />
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Téléchargement de la mise à jour...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Installation des modules GMA v{latestVersion}
              </p>
            </div>

            {/* Progress Bar Container */}
            <div className="space-y-2 px-2 pt-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 transition-all duration-200 ease-out shadow-xs"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs px-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {progress < 40
                    ? "Téléchargement des ressources..."
                    : progress < 85
                    ? "Mise en cache des composants..."
                    : "Finalisation des fichiers..."}
                </span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                  {progress}%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Veuillez patienter un instant pendant la préparation des fichiers.
            </p>
          </div>
        )}

        {/* STEP 3: MISE À JOUR COMPLÈTE & BOUTON OK */}
        {step === "complete" && (
          <div className="text-center space-y-4 py-2 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 size={36} className="animate-in zoom-in" />
            </div>

            <div>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-black rounded-full border border-emerald-300 dark:border-emerald-700">
                <Check size={12} />
                <span>Téléchargement terminé</span>
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                Mise à jour complète !
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                La nouvelle version <strong>v{latestVersion}</strong> a été téléchargée avec succès.
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 text-xs text-emerald-900 dark:text-emerald-200 font-medium leading-snug">
              Cliquez sur <strong>OK</strong> pour appliquer la mise à jour et actualiser l'application. Vos données et votre session restent parfaitement conservées.
            </div>

            {/* Bouton OK */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleApplyUpdate}
                disabled={isApplying}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-[#1A237E] hover:from-emerald-700 hover:to-indigo-900 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-900/20 hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center space-x-2 border border-emerald-400/40"
              >
                {isApplying ? (
                  <>
                    <RefreshCw size={16} className="animate-spin text-amber-300" />
                    <span>Application en cours...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} className="text-amber-300" />
                    <span>OK</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
