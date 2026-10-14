import React, { useState } from "react";
import { 
  Share2, 
  X, 
  Copy, 
  Check, 
  MessageCircle, 
  Send, 
  Sparkles,
  ExternalLink,
  Users
} from "lucide-react";
import { AppLogo } from "./AppLogo";

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://geniementoracademie.ai.studio";
  const shareTitle = "Génie Mentor Académie (GMA) — Soutien Scolaire, Concours & Examens";
  const shareText = "Rejoins Génie Mentor Académie (GMA) pour réviser tous les cours du collège au lycée (BFEM & BAC), faire des exercices corrigés et des quiz QCM ! 🇸🇳📚";

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${appUrl}`);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: appUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`*${shareTitle}*\n\n${shareText}\n\n👉 Accéder à la plateforme : ${appUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(appUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(`${shareTitle}\n${shareText}`);
    const url = encodeURIComponent(appUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${shareTitle} - ${shareText}`);
    const url = encodeURIComponent(appUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-[#1A237E] text-white p-5 relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <AppLogo
                className="w-12 h-12 rounded-2xl border-2 border-amber-300 shadow-md shrink-0"
                alt="Génie Mentor Académie Logo"
              />
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-lg font-black tracking-tight">Partager GMA</h3>
                  <span className="bg-amber-400 text-[#1A237E] text-[10px] font-black px-2 py-0.5 rounded-full">
                    Sénégal
                  </span>
                </div>
                <p className="text-xs text-indigo-200">Invitez vos camarades & élèves</p>
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
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center space-x-2 text-[#1A237E] font-bold">
              <Sparkles size={16} className="text-amber-500 shrink-0" />
              <span className="text-xs font-black">Faites découvrir Génie Mentor Académie autour de vous</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Partagez l'application avec vos camarades de classe, amis et tuteurs pour les aider à progresser en Maths, Physique-Chimie, SVT, Français, Philo et préparer le BFEM et le BAC.
            </p>
          </div>

          {/* Social Share Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center space-x-2.5 transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <MessageCircle size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 text-xs group-hover:text-emerald-800">WhatsApp</p>
                <p className="text-[10px] text-slate-500 truncate">Groupes & Contacts</p>
              </div>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebookShare}
              className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl flex items-center space-x-2.5 transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 text-xs group-hover:text-blue-800">Facebook</p>
                <p className="text-[10px] text-slate-500 truncate">Fil & Messagerie</p>
              </div>
            </button>

            {/* Telegram */}
            <button
              type="button"
              onClick={handleTelegramShare}
              className="p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-2xl flex items-center space-x-2.5 transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Send size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 text-xs group-hover:text-sky-800">Telegram</p>
                <p className="text-[10px] text-slate-500 truncate">Canaux & Salons</p>
              </div>
            </button>

            {/* Twitter / X */}
            <button
              type="button"
              onClick={handleTwitterShare}
              className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl flex items-center space-x-2.5 transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Share2 size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 text-xs group-hover:text-slate-900">X (Twitter)</p>
                <p className="text-[10px] text-slate-500 truncate">Post & Partage</p>
              </div>
            </button>
          </div>

          {/* Direct System Share (if mobile supported) */}
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Share2 size={16} className="text-amber-300" />
              <span>Partager via toutes les applications (Instagram, SMS...)</span>
            </button>
          )}

          {/* Copy Link Input Bar */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Copier le lien direct de la plateforme :
            </label>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg font-extrabold text-xs flex items-center space-x-1 transition-all cursor-pointer ${
                  copied
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-[#1A237E] hover:bg-indigo-900 text-white shadow-xs"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copié !" : "Copier"}</span>
              </button>
            </div>
          </div>

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
