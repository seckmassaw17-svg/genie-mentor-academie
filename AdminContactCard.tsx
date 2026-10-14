import React from "react";
import { MessageCircle, Mail, ShieldCheck, Award, ExternalLink, Sparkles } from "lucide-react";

export const AdminContactCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-indigo-900 via-[#1A237E] to-slate-900 text-white rounded-3xl p-5 border border-indigo-700/60 shadow-lg space-y-4">
      {/* Founder & Direction Info Header */}
      <div className="flex items-start space-x-3.5">
        <div className="relative shrink-0">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
            alt="Massaw Seck - Fondateur Génie Mentor Académie"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 bg-amber-400 text-[#1A237E] p-1 rounded-lg font-black" title="Fondateur & Direction Pédagogique">
            <ShieldCheck size={12} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h3 className="font-extrabold text-sm sm:text-base text-white">Massaw Seck</h3>
            <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-black rounded-full border border-amber-400/40">
              Fondateur & Ingénieur
            </span>
          </div>
          <p className="text-[11px] text-indigo-200 leading-relaxed font-medium">
            Licencié en Mathématiques Appliquées et Informatique • Ingénieur Logiciel & Développeur Web/Natif • Encadreur Pédagogique spécialisé en Mathématiques, Sciences Physiques & Expérimentales.
          </p>
        </div>
      </div>

      <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1">
        <p className="text-xs text-indigo-100/90 leading-relaxed">
          Notre équipe pédagogique et notre direction sont à votre entière disposition pour vous accompagner vers l'excellence scolaire et la réussite aux examens et concours nationaux (BFEM, BAC, Concours Général) :
        </p>
      </div>

      {/* Official Direct Contact Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {/* WhatsApp Direct Click Link */}
        <a
          href="https://wa.me/221783769584"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs flex items-center justify-between shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center text-white shrink-0">
              <MessageCircle size={18} />
            </div>
            <div className="min-w-0">
              <span className="block font-extrabold text-xs">WhatsApp Direction</span>
              <span className="block text-[10px] text-emerald-100 font-mono">+221 78 376 95 84</span>
            </div>
          </div>
          <ExternalLink size={14} className="opacity-80 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </a>

        {/* Email Direct Click Link */}
        <a
          href="mailto:Massaw.seck@unchk.edu.sn"
          className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs flex items-center justify-between shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-700/80 flex items-center justify-center text-white shrink-0">
              <Mail size={18} />
            </div>
            <div className="min-w-0">
              <span className="block font-extrabold text-xs">Email Pédagogique</span>
              <span className="block text-[10px] text-indigo-100 font-mono truncate">
                Massaw.seck@unchk.edu.sn
              </span>
            </div>
          </div>
          <ExternalLink size={14} className="opacity-80 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </a>
      </div>
    </div>
  );
};
