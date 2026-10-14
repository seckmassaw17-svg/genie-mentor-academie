import React from "react";
import { Download, X, CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { AppLogo } from "./AppLogo";

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  apkDownloadUrl?: string;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({
  isOpen,
  onClose,
  apkDownloadUrl = "/gma.apk",
}) => {
  if (!isOpen) return null;

  const effectiveUrl = apkDownloadUrl && apkDownloadUrl.trim() !== "" ? apkDownloadUrl : "/gma.apk";

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 p-6 text-center space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          title="Fermer"
        >
          <X size={18} />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
          <Download size={32} className="animate-bounce" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-slate-900">Télécharger GMA ?</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Obtenez l'application officielle Android (.apk) de Génie Mentor Académie pour réviser tous vos cours et exercices 100% hors-ligne sans dépenser de données mobiles.
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>Fichier APK Officiel • Gratuit & Sécurisé</span>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Annuler
          </button>
          <a
            href={effectiveUrl}
            download="Genie_Mentor_Academie_GMA.apk"
            onClick={() => {
              setTimeout(() => {
                onClose();
              }, 400);
            }}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center space-x-1.5 no-underline"
          >
            <Download size={16} />
            <span>Télécharger</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApkDownloadModal;
