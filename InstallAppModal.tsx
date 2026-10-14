import React, { useState, useEffect } from "react";
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Share, 
  PlusSquare, 
  ExternalLink,
  ShieldCheck,
  Zap,
  WifiOff
} from "lucide-react";
import { AppLogo } from "./AppLogo";
import { promptPwaInstall, canPromptDirectInstall, isAppInstalled, subscribeToInstallStatus } from "../utils/pwaInstall";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [downloadedPackage, setDownloadedPackage] = useState(false);

  useEffect(() => {
    setCanPrompt(canPromptDirectInstall());
    setInstalled(isAppInstalled());
    const unsub = subscribeToInstallStatus((can) => {
      setCanPrompt(can);
      setInstalled(isAppInstalled());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (canPrompt) {
      setIsInstalling(true);
      const res = await promptPwaInstall();
      setIsInstalling(false);
      if (res === "accepted") {
        setStatusMessage("🎉 Installation réussie ! L'icône Génie Mentor Académie a été ajoutée dans le menu de votre téléphone.");
        setTimeout(() => {
          onClose();
        }, 2500);
      }
    }
  };

  const handleDownloadPwaPackage = () => {
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      const packageData = {
        name: "Génie Mentor Académie (GMA)",
        short_name: "GMA",
        description: "Plateforme éducative d'excellence du Sénégal - Cours, Quiz, Annales et Tuteur IA 100% Hors-Ligne",
        version: "1.0.2",
        author: "Massaw Seck",
        start_url: window.location.origin + "/",
        display: "standalone",
        theme_color: "#1A237E",
        background_color: "#0F172A",
        package_type: "PWA_OFFLINE_BUNDLE",
        install_guide: {
          android_chrome: "Ouvrir dans Chrome > Menu ⋮ > Installer l'application ou Ajouter à l'écran d'accueil",
          ios_safari: "Ouvrir dans Safari > Bouton Partager ⎋ > Sur l'écran d'accueil",
          samsung: "Ouvrir dans Samsung Internet > Menu ≡ > Ajouter la page à > Écran d'accueil",
        },
        service_worker: "/sw.js",
        manifest: manifestLink?.href || "/manifest.json",
        export_date: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(packageData, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gma-app-package.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloadedPackage(true);
      setStatusMessage("✅ Package de l'application PWA téléchargé avec succès ! Suivez les étapes ci-dessous pour l'installer dans votre menu.");
    } catch (err) {
      console.warn("Download package error:", err);
    }
  };

  const isIos = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1A237E] to-indigo-900 text-white p-5 relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <AppLogo
                className="w-12 h-12 rounded-2xl border-2 border-amber-300 shadow-md shrink-0"
                alt="Génie Mentor Académie Logo"
              />
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-lg font-black tracking-tight">Installer l'application GMA</h3>
                  <span className="bg-amber-400 text-[#1A237E] text-[10px] font-black px-2 py-0.5 rounded-full">
                    Menu & PWA
                  </span>
                </div>
                <p className="text-xs text-indigo-200">Dans le menu de votre téléphone (Android & iOS)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 text-slate-800 text-xs">
          {installed ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-extrabold text-emerald-900 text-sm">Application déjà installée !</h4>
              <p className="text-emerald-800 text-xs leading-relaxed">
                Génie Mentor Académie (GMA) est déjà présente dans le menu de votre téléphone. Vous pouvez y accéder directement comme n'importe quelle application native.
              </p>
            </div>
          ) : (
            <>
              {/* Value propositions */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                  <WifiOff size={18} className="mx-auto text-[#1A237E] mb-1" />
                  <span className="font-bold text-[11px] text-slate-800 block">100% Hors-ligne</span>
                  <span className="text-[9px] text-slate-500">Zéro forfait</span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                  <Zap size={18} className="mx-auto text-amber-700 mb-1" />
                  <span className="font-bold text-[11px] text-slate-800 block">Dans le menu</span>
                  <span className="text-[9px] text-slate-500">Icône native</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  <ShieldCheck size={18} className="mx-auto text-emerald-700 mb-1" />
                  <span className="font-bold text-[11px] text-slate-800 block">Sécurisé</span>
                  <span className="text-[9px] text-slate-500">Pas de pub</span>
                </div>
              </div>

              {statusMessage && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 font-bold text-center animate-in fade-in leading-relaxed">
                  {statusMessage}
                </div>
              )}

              {/* Direct Install Button if supported */}
              {canPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Download size={18} className="animate-bounce" />
                  <span>Ajouter au menu du téléphone (1 Clic)</span>
                </button>
              ) : null}

              {/* Step-by-step instructions for Android & iOS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-black text-slate-900 text-xs flex items-center space-x-1.5">
                  <Smartphone size={15} className="text-[#1A237E]" />
                  <span>Installation rapide dans le menu du téléphone :</span>
                </h4>

                {isIos ? (
                  <ol className="space-y-2 text-[11px] text-slate-700 list-decimal list-inside font-medium leading-relaxed">
                    <li>
                      Sur Safari iPhone, appuyez sur le bouton <strong>Partager</strong> <Share size={13} className="inline text-indigo-600 mx-1" /> en bas de votre écran.
                    </li>
                    <li>
                      Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong> <PlusSquare size={13} className="inline text-indigo-600 mx-1" />.
                    </li>
                    <li>
                      Appuyez sur <strong>Ajouter</strong> : l'icône <strong>GMA</strong> apparaît instantanément dans vos applications !
                    </li>
                  </ol>
                ) : (
                  <ol className="space-y-2 text-[11px] text-slate-700 list-decimal list-inside font-medium leading-relaxed">
                    <li>
                      Appuyez sur les <strong>3 points ⋮</strong> en haut à droite de votre navigateur (Chrome / Samsung Internet).
                    </li>
                    <li>
                      Sélectionnez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>.
                    </li>
                    <li>
                      Validez : <strong>Génie Mentor Académie (GMA)</strong> est installée directement dans le menu de votre téléphone sans passer par le store !
                    </li>
                  </ol>
                )}
              </div>

              {/* Download PWA Offline Package Button (Blob, zero cookie error) */}
              <button
                type="button"
                onClick={handleDownloadPwaPackage}
                className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download size={15} className="text-amber-300" />
                <span>Télécharger le Package PWA Hors-ligne</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-center"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
