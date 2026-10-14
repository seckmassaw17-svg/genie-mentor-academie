import React from "react";
import { 
  Download, 
  Globe, 
  Smartphone, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  WifiOff, 
  HelpCircle, 
  ArrowRight, 
  Share2, 
  PlusSquare, 
  LogIn,
  ShieldCheck,
  Award,
  ChevronRight,
  Code2
} from "lucide-react";
import { AppLogo } from "./AppLogo";
import { getLocalAppConfig } from "../utils/versionUtils";
import { PwaInstallModal } from "./PwaInstallModal";

interface LandingPageProps {
  onExploreWeb: () => void;
  onOpenLogin: () => void;
  onOpenPortfolio?: () => void;
  apkDownloadUrl?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onExploreWeb,
  onOpenLogin,
  onOpenPortfolio,
  apkDownloadUrl,
}) => {
  const localCfg = getLocalAppConfig();
  const effectiveApkUrl = apkDownloadUrl || localCfg?.apk_url || "/gma.apk";
  const [isPwaModalOpen, setIsPwaModalOpen] = React.useState(false);

  const handleOpenInstall = () => {
    setIsPwaModalOpen(true);
  };

  const features = [
    {
      icon: <BookOpen className="text-amber-500" size={24} />,
      title: "Programme Sénégalais Officiel",
      desc: "Cours structurés, synthèses claires et exercices conformes au programme du Ministère de l'Éducation Nationale (de la 6ème à la Terminale).",
      badge: "6e à Tle",
    },
    {
      icon: <Award className="text-emerald-500" size={24} />,
      title: "Annales BFEM & BAC Corrigées",
      desc: "Des centaines de sujets d'examens officiels avec corrections pas à pas, barèmes et conseils méthodologiques rédigés par des professeurs émérites.",
      badge: "Examens & Concours",
    },
    {
      icon: <Sparkles className="text-indigo-500" size={24} />,
      title: "Tuteur IA Pédagogique 24h/24",
      desc: "Un professeur particulier virtuel intelligent pour poser vos questions, débloquer les exercices de maths, physique et SVT, avec rendu formules LaTeX.",
      badge: "IA Intelligente",
    },
    {
      icon: <WifiOff className="text-rose-500" size={24} />,
      title: "Mode 100% Hors-Ligne (Offline-First)",
      desc: "Téléchargez vos leçons et fiches d'exercices dans la mémoire locale (Room DB) pour réviser partout sans dépenser de données mobiles.",
      badge: "Zéro Forfait Requis",
    },
    {
      icon: <CheckCircle2 className="text-cyan-500" size={24} />,
      title: "Quiz QCM & Suivi de Progression",
      desc: "Testez vos connaissances en direct avec des chronomètres, des explications immédiates et mesurez votre progression vers la mention.",
      badge: "Interactif",
    },
    {
      icon: <ShieldCheck className="text-amber-600" size={24} />,
      title: "Concours d'Excellence",
      desc: "Préparation spécifique aux concours d'élite : Prytanée Militaire de Saint-Louis, Mariama Bâ de Gorée, Concours Général Sénégalais.",
      badge: "Élite Nationale",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onExploreWeb}>
            <AppLogo className="w-10 h-10 rounded-xl border-2 border-amber-400 shadow-md shadow-amber-400/20" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-tight text-white">Génie Mentor Académie</span>
                <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  GMA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Excellence Éducative & Concours
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {onOpenPortfolio && (
              <button
                type="button"
                onClick={onOpenPortfolio}
                className="px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5 border border-amber-400/30"
              >
                <Code2 size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Portfolio</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExploreWeb}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5 border border-slate-700/60"
            >
              <Globe size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Mode Invité</span>
              <span className="sm:hidden">Invité</span>
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/20 transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              <LogIn size={15} />
              <span>Se connecter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center overflow-hidden">
        {/* Glow elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1A237E]/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-amber-300 text-xs font-bold mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Plateforme Éducative N°1 au Sénégal • Collège & Lycée</span>
        </div>

        {/* Big Catchy Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          Réussissez le <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">BFEM</span>, le <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">BAC</span> et vos Concours avec <span className="text-white underline decoration-amber-400 decoration-wavy decoration-2">Génie Mentor Académie</span>
        </h1>

        <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Accédez aux cours complets conformes au programme sénégalais, des épreuves corrigées, des quiz chrono et un Tuteur IA disponible 24h/24, accessible en ligne ou 100% hors-ligne !
        </p>

        {/* Action Buttons: Télécharger APK (Vert) & Explorer le Web (Jaune) */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-5 max-w-md mx-auto">
          {/* Bouton Vert Installer / Télécharger l'application Génie Mentor Académie (GMA) */}
          <button
            type="button"
            onClick={handleOpenInstall}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/30 border border-emerald-400/40 transition-all flex items-center justify-center space-x-3 cursor-pointer group"
          >
            <Smartphone size={20} className="group-hover:-translate-y-0.5 transition-transform" />
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider text-emerald-200 font-bold leading-none">PWA Mobile & Tablette</div>
              <div className="text-sm sm:text-base font-black leading-tight">Télécharger l'application GMA</div>
            </div>
          </button>

          {/* Bouton Jaune Explorer le Web */}
          <button
            type="button"
            onClick={onExploreWeb}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-400/30 border border-amber-300/80 transition-all flex items-center justify-center space-x-3 cursor-pointer group"
          >
            <Globe size={20} className="text-slate-950 group-hover:rotate-12 transition-transform" />
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider text-amber-900 font-black leading-none">Mode Invité</div>
              <div className="text-sm sm:text-base font-black leading-tight">Explorer le Web</div>
            </div>
            <ArrowRight size={18} className="text-slate-950 ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Small trust badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 font-semibold">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Accès gratuit immédiat</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Installation PWA instantanée</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Mode Hors-Ligne sans connexion</span>
          </span>
        </div>
      </section>

      {/* Résumé des Fonctionnalités */}
      <section className="py-12 sm:py-16 bg-slate-950/60 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">Fonctionnalités Clés</h2>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">Tout pour exceller dans vos études</p>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Conçu spécialement pour les réalités des collégiens et lycéens du Sénégal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 relative group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {feat.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bloc d'Instruction d'Installation PWA pour iOS (iPhone & iPad) */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Apple gradient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                <Smartphone size={26} />
              </div>
              <div>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-300 rounded-full border border-slate-700">
                  Guide Apple iOS
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  Installer l'application sur iPhone & iPad (Safari)
                </h3>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 self-start sm:self-auto">
              Sans passer par l'App Store
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            Grâce à la technologie PWA (Progressive Web App), vous pouvez installer Génie Mentor Académie directement sur votre écran d'accueil iOS avec un rendu plein écran et un fonctionnement fluide même hors-ligne.
          </p>

          {/* 4 Steps Visual Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-start space-x-3">
              <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h4 className="text-xs font-bold text-white">Ouvrez dans Safari</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Accédez à la plateforme <span className="text-amber-300 font-semibold">Génie Mentor Académie</span> depuis le navigateur Safari de votre iPhone ou iPad.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-start space-x-3">
              <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-bold text-white">Touchez le bouton Partager</h4>
                  <Share2 size={13} className="text-blue-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Appuyez sur l'icône de partage carrée avec une flèche vers le haut au centre de la barre en bas de Safari.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-start space-x-3">
              <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-bold text-white">« Sur l'écran d'accueil »</h4>
                  <PlusSquare size={13} className="text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Faites défiler les options de la feuille de partage et sélectionnez <strong className="text-white font-bold">« Sur l'écran d'accueil »</strong>.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-start space-x-3">
              <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <h4 className="text-xs font-bold text-white">Touchez « Ajouter »</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Confirmez en touchant <strong className="text-white font-bold">« Ajouter »</strong> en haut à droite. L'icône GMA s'installe sur votre écran !
                </p>
              </div>
            </div>
          </div>

          {/* Quick CTA to explore directly */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <span className="text-xs text-slate-400">
              Vous êtes déjà sur Safari ? Vous pouvez aussi explorer directement l'application :
            </span>
            <button
              type="button"
              onClick={onExploreWeb}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
            >
              <span>Accéder à l'application web</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <AppLogo className="w-6 h-6 rounded-md border border-amber-400/40" />
            <span className="font-bold text-slate-300">Génie Mentor Académie</span>
            <span>• Tous droits réservés &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center space-x-4">
            <button type="button" onClick={onExploreWeb} className="hover:text-amber-300 transition-colors cursor-pointer">
              Accueil Web
            </button>
            {onOpenPortfolio && (
              <button type="button" onClick={onOpenPortfolio} className="hover:text-amber-300 text-amber-400 font-bold transition-colors cursor-pointer">
                Portfolio
              </button>
            )}
            <button type="button" onClick={handleOpenInstall} className="hover:text-emerald-400 transition-colors cursor-pointer">
              Télécharger l'application GMA
            </button>
            <button type="button" onClick={onOpenLogin} className="hover:text-white transition-colors cursor-pointer">
              Espace Connexion
            </button>
          </div>
        </div>
      </footer>
      {/* PWA Mobile Installation Modal */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        onOpenPortfolio={onOpenPortfolio}
      />
    </div>
  );
};
