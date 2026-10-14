import React, { useState } from "react";
import { 
  X, 
  Code2, 
  Layers, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  Smartphone, 
  CheckCircle2, 
  Globe, 
  Mail, 
  Award, 
  BookOpen, 
  Zap, 
  Terminal, 
  ExternalLink,
  Laptop,
  Flame,
  Binary
} from "lucide-react";
import { AppLogo } from "./AppLogo";

interface DeveloperPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperPortfolioModal: React.FC<DeveloperPortfolioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"presentation" | "stack" | "features" | "architecture">("presentation");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
        
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-slate-900 text-white p-5 sm:p-6 relative overflow-hidden shrink-0 border-b border-indigo-500/20">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <Code2 size={180} />
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center space-x-3.5">
              <AppLogo className="w-13 h-13 rounded-2xl border-2 border-amber-300 shadow-md shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-amber-400 text-[#1A237E] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Portfolio Technique
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">v1.0.2 Stable</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  Portfolio du Développement
                </h2>
                <p className="text-xs text-indigo-200">
                  Conception, architecture logicielle et ingénierie de la plateforme Génie Mentor Académie (GMA)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center space-x-1.5 mt-5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "presentation", label: "Développeur & Vision", icon: <Award size={14} /> },
              { id: "stack", label: "Stack Technologique", icon: <Layers size={14} /> },
              { id: "architecture", label: "Architecture Offline-First", icon: <Cpu size={14} /> },
              { id: "features", label: "Modules Pédagogiques", icon: <Sparkles size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-amber-400 text-slate-950 font-black shadow-md scale-[1.02]"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-100 flex-1">
          
          {/* TAB 1: PRESENTATION DU DEVELOPPEUR & VISION */}
          {activeTab === "presentation" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Dev Profile Card */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-amber-50/50 dark:from-slate-800 dark:to-slate-800/60 p-5 rounded-2xl border border-indigo-100 dark:border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-700 dark:text-indigo-400">
                      Concepteur & Développeur Principal
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Massaw Seck</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Architecte Logiciel Fullstack & Spécialiste Technologies Éducatives (EdTech Sénégal)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href="mailto:massperpendiculaire@gmail.com"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 shadow-2xs transition-colors"
                    >
                      <Mail size={13} className="text-indigo-600 dark:text-indigo-400" />
                      <span>massperpendiculaire@gmail.com</span>
                    </a>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Passionné par l'innovation pédagogique et l'impact social des technologies, j'ai conçu et développé 
                  <strong> Génie Mentor Académie (GMA)</strong> comme une solution d'envergure nationale pour démocratiser l'excellence scolaire. 
                  L'objectif est d'offrir à chaque apprenant sénégalais, du collège au lycée, des outils d'apprentissage de classe mondiale 
                  fonctionnant sans aucune dépendance continue à une connexion internet.
                </p>
              </div>

              {/* Mission & Key Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <Globe size={18} />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">Programme Sénégalais Conforme</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Cours, chapitres, devoirs et annales strictement alignés sur le curriculum officiel du Ministère de l'Éducation Nationale (de la 6ème à la Terminale).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                    <Zap size={18} />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">Mode 100% Hors-Ligne (Offline-First)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Moteur de base de données locale (Room DB) garantissant un accès instantané aux cours et exercices sans dépense de forfait data mobile.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                    <Sparkles size={18} />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">Tuteur IA Spécialisé 24h/24</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Modèle de langage Gemini avec rendu KaTeX/LaTeX natif pour les formules de mathématiques, physique-chimie et sciences de la vie et de la terre.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold">
                    <ShieldCheck size={18} />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">Sécurité & Rôle Administrateur Dédié</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Architecture RBAC sécurisée avec gestion multi-rôles, validation stricte des sessions, reçus numériques de paiement et supervision pédagogique.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STACK TECHNOLOGIQUE */}
          {activeTab === "stack" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                La plateforme est conçue selon les standards industriels les plus modernes pour garantir réactivité, sécurité et portabilité mobile multiplateforme.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Frontend */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 font-black text-xs uppercase tracking-wide">
                    <Laptop size={16} />
                    <span>Frontend & Interface Utilisateur</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <li>• <strong>React 19 & TypeScript 5.8</strong> : Composants fonctionnels et typage strict</li>
                    <li>• <strong>Tailwind CSS v4</strong> : Design system fluide et responsive</li>
                    <li>• <strong>Vite 6</strong> : Compilation et bundling optimisé</li>
                    <li>• <strong>MathLive & KaTeX</strong> : Rendu mathématique et scientifique</li>
                    <li>• <strong>Lucide React & Motion</strong> : Micro-animations et ergonomie intuitive</li>
                  </ul>
                </div>

                {/* Backend & Cloud */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                    <Database size={16} />
                    <span>Backend, Base de Données & Cloud</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <li>• <strong>Node.js & Express</strong> : API REST et proxy serveur</li>
                    <li>• <strong>Supabase (PostgreSQL)</strong> : Tables relationnelles (profiles, courses, assets, quizzes)</li>
                    <li>• <strong>Firebase Firestore</strong> : Persistance temps réel et règles de sécurité</li>
                    <li>• <strong>Supabase Auth & Session</strong> : Authentification e-mail / mot de passe & tokens</li>
                  </ul>
                </div>

                {/* Offline & PWA */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-wide">
                    <Smartphone size={16} />
                    <span>Mobile & Packaging PWA</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <li>• <strong>Progressive Web App (PWA)</strong> : Installable directement dans le menu du téléphone</li>
                    <li>• <strong>Service Worker (sw.js)</strong> : Stratégie Cache-First pour les assets et documents</li>
                    <li>• <strong>Web App Manifest</strong> : Icônes haute résolution et mode standalone plein écran</li>
                    <li>• <strong>Support TWA / APK</strong> : Compatible Trusted Web Activity Android</li>
                  </ul>
                </div>

                {/* Intelligence Artificielle */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400 font-black text-xs uppercase tracking-wide">
                    <Sparkles size={16} />
                    <span>Moteur d'Intelligence Artificielle</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <li>• <strong>SDK @google/genai</strong> : Modèles Gemini 2.5 Flash haute précision</li>
                    <li>• <strong>Prompts Pédagogiques</strong> : Calibrés sur la pédagogie sénégalaise</li>
                    <li>• <strong>Traitement Multimodal</strong> : Analyse d'images d'exercices et devoirs manuscrits</li>
                    <li>• <strong>Co-pilote Quiz IA</strong> : Génération instantanée de brouillons d'évaluations</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARCHITECTURE OFFLINE-FIRST */}
          {activeTab === "architecture" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] leading-relaxed border border-slate-800">
                <div className="text-amber-400 font-bold mb-2"># Schéma d'Architecture de Données GMA :</div>
                <div>[Client UI (React 19)] ⇄ [RoomDatabaseRepository (Cache Local)] ⇄ [Sync Worker]</div>
                <div className="text-slate-400">       │                                                 │</div>
                <div className="text-slate-400">       ▼ (Mode Déconnecté)                              ▼ (En ligne)</div>
                <div>[IndexedDB / LocalStorage]                  [Supabase PostgreSQL & Firebase]</div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Principes Fondamentaux de l'Architecture :
                </h4>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Résilience Zéro Connexion</strong> : Toutes les données essentielles (cours, profils, exercices, quiz téléchargés) sont sauvegardées localement via la couche Room.
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Synchronisation Delta Asynchrone</strong> : Dès le retour d'une connexion internet, le worker de synchronisation compare les horodatages et synchronise les notes, paiements et résultats sans bloquer l'interface.
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Absence de Déconnexion Involontaire</strong> : Préservation stricte de la session utilisateur et de son profil lors des bascules réseau ou fermetures d'onglets.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MODULES PEDAGOGIQUES REALISES */}
          {activeTab === "features" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h5 className="font-black text-slate-900 dark:text-white flex items-center space-x-1.5 mb-1">
                    <BookOpen size={15} className="text-[#1A237E] dark:text-indigo-400" />
                    <span>Module Cours & Leçons</span>
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    Navigation organisée par matières et niveaux, visualisation plein écran, fiches de synthèse et téléchargement hors-ligne des documents.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h5 className="font-black text-slate-900 dark:text-white flex items-center space-x-1.5 mb-1">
                    <Award size={15} className="text-amber-600" />
                    <span>Concours d'Élite & VIP</span>
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    Préparation aux concours de prestige (Prytanée Militaire de Saint-Louis, Mariama Bâ, Concours Général) et annales corrigées.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h5 className="font-black text-slate-900 dark:text-white flex items-center space-x-1.5 mb-1">
                    <Terminal size={15} className="text-emerald-600" />
                    <span>Quiz & Évaluations</span>
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    Quiz QCM interactifs chronométrés, calcul des mentions, historique des notes et corrigés pédagogiques instantanés.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h5 className="font-black text-slate-900 dark:text-white flex items-center space-x-1.5 mb-1">
                    <ShieldCheck size={15} className="text-indigo-600" />
                    <span>Tableau de Bord Administrateur</span>
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    Supervision complète sans restriction de classe, gestion du catalogue de cours, validation des requêtes et caisse financière.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Conçu & développé par <strong>Massaw Seck</strong> • Génie Mentor Académie &copy; {new Date().getFullYear()}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#1A237E] hover:bg-indigo-900 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
          >
            Fermer le Portfolio
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeveloperPortfolioModal;
