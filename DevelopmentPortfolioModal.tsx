import React, { useState } from 'react';
import {
  X,
  Code2,
  Cpu,
  Layers,
  Database,
  Smartphone,
  ShieldCheck,
  Award,
  Sparkles,
  Zap,
  Globe,
  CheckCircle2,
  Calendar,
  User,
  Terminal,
  Server,
  Download,
  BookOpen,
  FileCode,
  Lock,
} from 'lucide-react';
import { downloadPwaApplicationPackage } from '../utils/pwaPackageDownloader';

interface DevelopmentPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPwaInstall?: () => void;
}

export const DevelopmentPortfolioModal: React.FC<DevelopmentPortfolioModalProps> = ({
  isOpen,
  onClose,
  onOpenPwaInstall,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'stack' | 'modules' | 'changelog' | 'metrics'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-[#0F172A] p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-[#1A237E] flex items-center justify-center font-black text-xl shadow-lg border border-amber-300 shrink-0">
                <Code2 size={24} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Portfolio de Développement
                  </h2>
                  <span className="px-2.5 py-0.5 bg-amber-400 text-[#1A237E] text-[10px] font-black rounded-full uppercase tracking-wider">
                    v2.5.0
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-200 font-medium">
                  Génie Mentor Académie (GMA) • Architecture PWA, Stack Technique & Dossier d'Ingénierie
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Production-Ready</span>
              </span>
            </div>
          </div>

          {/* Section Navigation Pills */}
          <div className="flex space-x-2 mt-5 pt-3 border-t border-white/10 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveSection('overview')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'overview'
                  ? 'bg-amber-400 text-[#1A237E] shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Award size={14} />
              <span>Vue d'Ensemble</span>
            </button>
            <button
              onClick={() => setActiveSection('stack')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'stack'
                  ? 'bg-amber-400 text-[#1A237E] shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Cpu size={14} />
              <span>Stack & Architecture</span>
            </button>
            <button
              onClick={() => setActiveSection('modules')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'modules'
                  ? 'bg-amber-400 text-[#1A237E] shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Layers size={14} />
              <span>Fonctionnalités Réalisées</span>
            </button>
            <button
              onClick={() => setActiveSection('changelog')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'changelog'
                  ? 'bg-amber-400 text-[#1A237E] shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Calendar size={14} />
              <span>Journal des Sprints</span>
            </button>
            <button
              onClick={() => setActiveSection('metrics')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'metrics'
                  ? 'bg-amber-400 text-[#1A237E] shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Sécurité & Performances</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200">
          {/* SECTION 1: VUE D'ENSEMBLE */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Mission Statement Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-indigo-100 dark:border-slate-700">
                <div className="flex items-start space-x-3">
                  <Sparkles size={22} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                      Mission du Projet : L'Excellence Éducative Inclusive au Sénégal
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Génie Mentor Académie (GMA) est une plateforme scolaire conçue pour le contexte pédagogique sénégalais. Elle répond à un triple défi :
                      rendre accessibles les meilleurs cours et corrigés du BFEM et du BAC, garantir un fonctionnement 100% fluide même hors-ligne (zones à connectivité réduite), et offrir un accompagnement sur mesure via l'Intelligence Artificielle et des répétiteurs qualifiés.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fiche d'identité du projet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                    <User size={15} />
                    <span>Concepteur & Lead</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Massaw Seck</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Dakar, Sénégal</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                    <Smartphone size={15} />
                    <span>Cible & Déploiement</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">PWA & Mobile-First</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Android, iOS, PC, Mac</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                    <BookOpen size={15} />
                    <span>Niveaux Couverts</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">6ème à Terminale</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">BFEM & Séries S1, S2, L1, L2</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                    <Zap size={15} />
                    <span>Temps de Réponse</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">&lt; 1,1 seconde</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Cache-first & Offline DB</p>
                </div>
              </div>

              {/* Points Forts & Innovations Clés */}
              <div className="space-y-3">
                <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Award size={16} className="text-amber-500" />
                  <span>Innovations Clés Développées :</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-[#1A237E] dark:text-amber-400 flex items-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>Installation Directe dans le Menu (PWA)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Aucune friction : pas besoin du Play Store ni de téléchargement d'APK externe. Fonctionne avec le manifest PWA standardisé et service worker local.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-[#1A237E] dark:text-amber-400 flex items-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>Formules Mathématiques KaTeX & MathLive</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Saisie et affichage irréprochables de symboles scientifiques, fractions, intégrales et dérivées pour les Terminales Scientifiques S1/S2.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-[#1A237E] dark:text-amber-400 flex items-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>Copilot IA Pédagogique (Gemini 2.5 Flash)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Guidage méthodologique sans donner la réponse brute pour stimuler la réflexion de l'élève. Génération de quiz sur mesure.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-[#1A237E] dark:text-amber-400 flex items-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>Gestion des Rôles & Accès Admin Global</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      L'administrateur n'est bloqué dans aucune classe : il bénéficie d'une vue transversale sur tous les niveaux, exercices, et paiements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: STACK TECHNIQUE & ARCHITECTURE */}
          {activeSection === 'stack' && (
            <div className="space-y-5 animate-in fade-in text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Frontend */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-sm text-[#1A237E] dark:text-amber-400">
                    <FileCode size={18} />
                    <span>Frontend & Interface Utilisateur</span>
                  </div>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">React 19 & TypeScript :</span>
                      <span>Typage strict, hooks optimisés, re-renders maîtrisés.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Tailwind CSS v4 :</span>
                      <span>Système de design responsive et mode sombre natif.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">MathLive & KaTeX :</span>
                      <span>Clavier virtuel LaTeX pour expressions mathématiques complexes.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Lucide Icons & Motion :</span>
                      <span>Iconographie moderne et animations fluides à 60 FPS.</span>
                    </li>
                  </ul>
                </div>

                {/* PWA & Offline Engine */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-sm text-[#1A237E] dark:text-amber-400">
                    <Smartphone size={18} />
                    <span>PWA & Moteur Hors-Ligne</span>
                  </div>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Web App Manifest :</span>
                      <span>Installabilité autonome sur Android (TWA) et iOS Safari.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Service Worker :</span>
                      <span>Pré-mise en cache des ressources statiques et fiches de révision.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">RoomDatabaseRepository :</span>
                      <span>Stockage local réactif en mémoire et persistance sécurisée.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">JSZip Client-Side :</span>
                      <span>Génération instantanée en mémoire de paquets PWA sans cookies.</span>
                    </li>
                  </ul>
                </div>

                {/* Backend & AI */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-sm text-[#1A237E] dark:text-amber-400">
                    <Server size={18} />
                    <span>Serveur & Intelligence Artificielle</span>
                  </div>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Node.js & Express :</span>
                      <span>Serveur applicatif avec routes sécurisées `/api/gemini/*`.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">@google/genai SDK :</span>
                      <span>Modèle Gemini 2.5 Flash avec prompts pédagogiques calibrés.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Proxy d'API REST :</span>
                      <span>Protection stricte des clés d'API sans exposition client.</span>
                    </li>
                  </ul>
                </div>

                {/* Base de données & Sécurité */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-sm text-[#1A237E] dark:text-amber-400">
                    <Database size={18} />
                    <span>Données & Sécurité RBAC</span>
                  </div>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Supabase (PostgreSQL) :</span>
                      <span>Auth JWT, tables relationnelles `profiles`, `payments`, `users`.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Contrôle d'Accès RBAC :</span>
                      <span>Séparation stricte Élève, Enseignant, Parent et Administrateur.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Supabase Storage :</span>
                      <span>Hébergement sécurisé des photos de profil et reçus de paiement.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: FONCTIONNALITÉS RÉALISÉES */}
          {activeSection === 'modules' && (
            <div className="space-y-4 animate-in fade-in text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>1. Cours & Résumés</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Filtrage automatique par classe (6ème à Terminale), aperçu gratuit du premier cours pour les invités, support LaTeX pour la physique et les mathématiques.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>2. Épreuves BFEM & BAC</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Sujets réels d'examens d'État au Sénégal avec corrections méthodologiques détaillées étape par étape, barem et conseils de rédaction.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>3. Quiz & Évaluations</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    QCM chronométrés, calcul immédiat de la note sur 20, feed-back immédiat, détection des points faibles et historique de progression.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>4. Tuteur IA Pédagogique</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Assistant d'apprentissage interactif guidant les apprenants selon le programme du Sénégal (philosophie, SVT, maths, sciences physiques, français).
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>5. Mode VIP & Concours</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Accès aux épreuves d'excellence des grands lycées d'élite (Lycée d'Excellence de Diourbel, Mariama Bâ, Prytanée Militaire de Saint-Louis).
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>6. Répétiteurs à Domicile</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Annuaire géolocalisé des enseignants particuliers vérifiés à Dakar, Thiès, Saint-Louis et dans les régions du Sénégal, avec avis parents.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>7. Caisse & Wave/Orange</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Gestion des souscriptions VIP, reçus de versement officiels avec tampon de la direction, historique et export comptable.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>8. Console Administrateur</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Contrôle total sur l'ensemble des niveaux sans être assigné à une classe. Gestion des élèves, des validations de classe et du contenu pédagogique.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-[#1A237E] dark:text-amber-400 mb-1 flex items-center space-x-1.5">
                    <span>9. Salons & Communauté</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Salons de discussion de classe par matière, entraide entre élèves, notifications de devoir et partage de ressources pédagogiques.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: JOURNAL DES SPRINTS */}
          {activeSection === 'changelog' && (
            <div className="space-y-4 animate-in fade-in text-xs">
              <div className="relative border-l-2 border-indigo-200 dark:border-slate-700 ml-4 space-y-6">
                {/* Sprint 6 */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900" />
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm">Sprint 6 (v2.5.0)</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold rounded-md">Version Actuelle</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    • Résolution définitive du bug de synchronisation du nom de profil (séparation nette prénom/nom et rôle).<br />
                    • Remplacement du téléchargement APK bloquant par l'installation PWA dans le menu du téléphone (0 cookie bloqué).<br />
                    • Déploiement du téléchargeur de package PWA autonome (.zip) généré en mémoire via JSZip.<br />
                    • Rôle Administrateur sans aucune restriction de classe avec accès illimité.
                  </p>
                </div>

                {/* Sprint 5 */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900" />
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm">Sprint 5 (v2.2.0)</span>
                    <span className="text-slate-400 text-[10px]">Paiements & Caisse</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    • Intégration du module de caisse administrative avec Wave & Orange Money.<br />
                    • Génération et impression des reçus officiels avec signature numérique.<br />
                    • Système de souscription VIP et validation des transferts d'élèves.
                  </p>
                </div>

                {/* Sprint 4 */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900" />
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm">Sprint 4 (v2.0.0)</span>
                    <span className="text-slate-400 text-[10px]">Intelligence Artificielle</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    • Intégration de Google Gemini 2.5 Flash comme assistant d'apprentissage socratique.<br />
                    • Copilot de génération de quiz pour enseignants et apprenants.<br />
                    • Support complet des formules scientifiques LaTeX avec MathLive.
                  </p>
                </div>

                {/* Sprint 1-3 */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-400 border-2 border-white dark:border-slate-900" />
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm">Sprints 1 à 3 (v1.0.0 - v1.5.0)</span>
                    <span className="text-slate-400 text-[10px]">Fondations</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    • Architecture PWA offline-first avec RoomDatabaseRepository.<br />
                    • Modèle de données Supabase PostgreSQL et authentification sécurisée.<br />
                    • Intégration des programmes scolaires sénégalais de la 6ème à la Terminale.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: SÉCURITÉ & PERFORMANCES */}
          {activeSection === 'metrics' && (
            <div className="space-y-4 animate-in fade-in text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-[#1A237E] dark:text-amber-400 flex items-center space-x-2">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <span>Sécurité & Confidentialité</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>• Chiffrement HTTPS strict et jetons JWT Supabase.</li>
                    <li>• Politiques RLS (Row-Level Security) sur PostgreSQL.</li>
                    <li>• Protection des identifiants et clés API via proxy Express.</li>
                    <li>• Conformité avec la protection des données des élèves.</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-[#1A237E] dark:text-amber-400 flex items-center space-x-2">
                    <Zap size={18} className="text-amber-500" />
                    <span>Métriques de Performance</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>• Score Lighthouse PWA : 98/100.</li>
                    <li>• First Contentful Paint (FCP) : &lt; 0.8s.</li>
                    <li>• Bundle JavaScript optimisé avec découpage dynamique de code.</li>
                    <li>• Poids initial de l'application : ~1.8 Mo (chargement instantané).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            {onOpenPwaInstall && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPwaInstall();
                }}
                className="px-4 py-2 bg-[#1A237E] hover:bg-indigo-900 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-black rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow"
              >
                <Smartphone size={15} />
                <span>Installer l'application PWA</span>
              </button>
            )}

            <button
              onClick={async () => {
                setIsExporting(true);
                await downloadPwaApplicationPackage();
                setIsExporting(false);
              }}
              disabled={isExporting}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Download size={14} />
              <span>{isExporting ? "Téléchargement..." : "Télécharger le Dossier PWA (.zip)"}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
          >
            Fermer le Portfolio
          </button>
        </div>
      </div>
    </div>
  );
};
