import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  CheckCircle2,
  X,
  Sparkles,
  HelpCircle,
  FileArchive,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { downloadPwaApplicationPackage } from '../utils/pwaPackageDownloader';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPortfolio?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onOpenPortfolio,
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'install' | 'android' | 'ios' | 'package'>('install');
  const [isDownloadingPackage, setIsDownloadingPackage] = useState(false);
  const [downloadStatusText, setDownloadStatusText] = useState<string | null>(null);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setInstallFeedback("Ouverture du menu d'installation du téléphone...");
    const outcome = await install();
    if (outcome === 'accepted') {
      setInstallFeedback("Installation confirmée ! L'icône GMA a été ajoutée à votre téléphone.");
      setTimeout(() => {
        onClose();
      }, 2500);
    } else if (outcome === 'dismissed') {
      setInstallFeedback("Installation annulée.");
      setTimeout(() => setInstallFeedback(null), 3000);
    } else {
      // unsupported, switch to visual guide
      setActiveTab(isIOS ? 'ios' : 'android');
      setInstallFeedback("Suivez les 2 étapes simples ci-dessous pour ajouter l'application :");
    }
  };

  const handleDownloadZipPackage = async () => {
    setIsDownloadingPackage(true);
    setDownloadStatusText("Génération du package PWA hors-ligne...");
    const success = await downloadPwaApplicationPackage((msg) => {
      setDownloadStatusText(msg);
    });
    setIsDownloadingPackage(false);
    if (success) {
      setDownloadStatusText("✅ Dossier PWA téléchargé avec succès !");
      setTimeout(() => setDownloadStatusText(null), 4000);
    } else {
      setDownloadStatusText("⚠️ Erreur lors de la compression.");
      setTimeout(() => setDownloadStatusText(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with vibrant branding */}
        <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-[#0D47A1] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black text-xl shadow-lg border border-amber-300">
              GMA
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Installer Génie Mentor Académie (GMA)
                </h3>
                <span className="px-2 py-0.5 bg-amber-400 text-[#1A237E] text-[10px] font-black rounded-full uppercase">
                  PWA Mobile
                </span>
              </div>
              <p className="text-xs text-indigo-200 font-medium">
                Accès direct depuis le menu de votre téléphone, sans passer par un store
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1.5 mt-4 pt-2 border-t border-white/10 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('install')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'install'
                  ? 'bg-amber-400 text-[#1A237E] shadow'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              ⚡ Installation Directe
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-amber-400 text-[#1A237E] shadow'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              🤖 Guide Android
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-amber-400 text-[#1A237E] shadow'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              🍏 Guide iPhone
            </button>
            <button
              onClick={() => setActiveTab('package')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'package'
                  ? 'bg-amber-400 text-[#1A237E] shadow'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              📦 Dossier PWA (.zip)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-200 text-sm">
          {/* Status feedback */}
          {installFeedback && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-2">
              <Sparkles size={16} className="text-amber-500 shrink-0" />
              <span>{installFeedback}</span>
            </div>
          )}

          {/* TAB 1: Direct Installation */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              {isStandalone || isInstalled ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-start space-x-3">
                  <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      Application déjà installée !
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Vous utilisez déjà Génie Mentor Académie (GMA) en mode autonome (PWA). L'application est accessible directement dans votre menu d'applications.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center space-x-2">
                  <Zap size={18} className="text-amber-500" />
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Avantages de la PWA GMA :
                  </span>
                </div>
                <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span><strong>1 Clic dans le menu :</strong> Se lance comme une vraie application sans ouvrir de navigateur.</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span><strong>Mode Hors-Ligne :</strong> Accès aux cours et résumés même sans connexion internet active.</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span><strong>Zéro espace gaspillé :</strong> Moins de 2 Mo, aucune mise à jour manuelle requise.</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span><strong>100% Sécurisé :</strong> Pas de blocage de cookie, compatible tout smartphone.</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {isInstallable ? (
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-3.5 px-4 bg-[#1A237E] hover:bg-indigo-900 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-black rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center space-x-2 text-sm"
                  >
                    <Smartphone size={18} />
                    <span>Ajouter à l'écran d'accueil du téléphone</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab(isIOS ? 'ios' : 'android')}
                    className="w-full py-3.5 px-4 bg-[#1A237E] hover:bg-indigo-900 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-black rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 text-sm"
                  >
                    <Smartphone size={18} />
                    <span>Installer sur mon téléphone ({isIOS ? 'iPhone / iOS' : 'Android'})</span>
                    <ChevronRight size={16} />
                  </button>
                )}

                <button
                  onClick={handleDownloadZipPackage}
                  disabled={isDownloadingPackage}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-2xl transition-colors cursor-pointer flex items-center justify-center space-x-2 text-xs border border-slate-200 dark:border-slate-700"
                >
                  <FileArchive size={16} className="text-amber-500" />
                  <span>{isDownloadingPackage ? "Compression en cours..." : "Télécharger le Dossier PWA Complet (.zip)"}</span>
                </button>
              </div>

              {downloadStatusText && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-center text-xs font-bold text-amber-800 dark:text-amber-300 animate-in fade-in">
                  {downloadStatusText}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Guide Android */}
          {activeTab === 'android' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-indigo-50 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-slate-700">
                <h4 className="font-bold text-xs text-[#1A237E] dark:text-amber-400 uppercase tracking-wider mb-1">
                  Sur Android (Google Chrome / Samsung Internet) :
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Ajoutez l'icône directement à votre lanceur d'applications en 2 clics :
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#1A237E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Ouvrez le menu du navigateur
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Touchez les <strong>trois points verticaux (⋮)</strong> en haut à droite de Chrome.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#1A237E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Appuyez sur « Installer l'application » ou « Ajouter à l'écran d'accueil »
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Confirmez en cliquant sur <strong>Installer</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-start space-x-3">
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900 dark:text-emerald-200">
                      C'est prêt !
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                      L'icône GMA figure désormais parmi vos applications avec toutes ses fonctionnalités hors-ligne.
                    </p>
                  </div>
                </div>
              </div>

              {isInstallable && (
                <button
                  onClick={handleNativeInstall}
                  className="w-full py-3 px-4 bg-[#1A237E] dark:bg-amber-400 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Smartphone size={16} />
                  <span>Déclencher l'installation automatique Android</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: Guide iPhone */}
          {activeTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-indigo-50 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-slate-700">
                <h4 className="font-bold text-xs text-[#1A237E] dark:text-amber-400 uppercase tracking-wider mb-1">
                  Sur iPhone & iPad (Navigateur Safari) :
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Sur iOS, Apple exige de passer par le bouton de partage de Safari :
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1">
                      <span>Touchez le bouton Partager</span>
                      <Share2 size={13} className="text-blue-500 inline" />
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Il s'agit de l'icône du carré avec une flèche vers le haut située au bas de votre écran Safari.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Sélectionnez « Sur l'écran d'accueil »
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Faites défiler le menu d'actions vers le bas puis touchez <strong>Sur l'écran d'accueil</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Touchez « Ajouter »
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      En haut à droite de l'écran pour valider. L'application est installée sur votre iPhone !
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Package PWA Download */}
          {activeTab === 'package' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-indigo-50 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-slate-700">
                <h4 className="font-bold text-xs text-[#1A237E] dark:text-amber-400 uppercase tracking-wider mb-1">
                  📦 Dossier Package PWA Autonome :
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Téléchargez l'ensemble du dossier de l'application compressé (.zip). Il contient le manifest, le lanceur HTML autonome, le service worker et le guide d'installation.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>Génération directe en mémoire (Zéro cookie requis)</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Contrairement aux liens externes pouvant être bloqués par les restrictions de cookies ou d'iframes dans certains navigateurs, ce package est généré instantanément par votre navigateur via un Blob sécurisé.
                </p>
              </div>

              <button
                onClick={handleDownloadZipPackage}
                disabled={isDownloadingPackage}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 text-sm"
              >
                <Download size={18} />
                <span>{isDownloadingPackage ? "Génération du package..." : "Télécharger le Package GMA (.zip)"}</span>
              </button>

              {downloadStatusText && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                  {downloadStatusText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Portfolio link */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          {onOpenPortfolio && (
            <button
              onClick={() => {
                onClose();
                onOpenPortfolio();
              }}
              className="text-[#1A237E] dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
            >
              <HelpCircle size={14} />
              <span>Voir le Portfolio du Développement</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
