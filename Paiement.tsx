import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Users, Home, ArrowLeft, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { UserProfile, PaymentTransaction } from "../types";
import { FormulaireRenforcement } from "./RenforcementModal";
import { FormulaireDomicile } from "./DomicileModal";
import { scrollToTopGlobal } from "./ScrollToTop";

export interface PaiementProps {
  user?: UserProfile | null;
  onNavigateHome?: () => void;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  initialType?: "renforcement" | "domicile";
}

export const Paiement: React.FC<PaiementProps> = ({
  user,
  onNavigateHome,
  onOpenReceipt,
  initialType = "renforcement",
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const typeParam = searchParams.get("type");

  const [activeForm, setActiveForm] = useState<"renforcement" | "domicile">(() => {
    if (typeParam === "domicile") return "domicile";
    if (typeParam === "renforcement") return "renforcement";
    return initialType;
  });

  // Synchronisation avec les paramètres URL
  useEffect(() => {
    if (typeParam === "domicile" && activeForm !== "domicile") {
      setActiveForm("domicile");
    } else if (typeParam === "renforcement" && activeForm !== "renforcement") {
      setActiveForm("renforcement");
    }
  }, [typeParam]);

  // Défilement automatique vers le haut au chargement de la vue (Consigne UX & Global Fix)
  useEffect(() => {
    scrollToTopGlobal("instant");
  }, []);

  const handleSelectForm = (formType: "renforcement" | "domicile") => {
    setActiveForm(formType);
    setSearchParams({ type: formType });
    // Consigne UX : Défilement immédiat vers le haut pour afficher le formulaire dès le sommet (0px)
    scrollToTopGlobal("instant");
  };

  const handleBack = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-full pb-16 space-y-6 animate-in fade-in duration-200">
      {/* Barre Supérieure d'Accès & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#1A237E] dark:hover:text-amber-400 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Retour à l'accueil</span>
        </button>

        <div className="flex items-center space-x-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full w-fit">
          <ShieldCheck size={14} />
          <span>Paiements Cashless Sécurisés (Wave & Orange Money)</span>
        </div>
      </div>

      {/* Hero Header de la section Paiement */}
      <div className="text-center max-w-2xl mx-auto space-y-2 px-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-800">
          <Sparkles size={13} className="text-amber-600" />
          <span>Génie Mentor Académie (GMA) • Inscriptions & Mensualités</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Portail des Inscriptions & Paiements
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Sélectionnez votre formule ci-dessous pour remplir le formulaire officiel et valider votre paiement en toute simplicité.
        </p>
      </div>

      {/* 2 BOUTONS PRINCIPAUX AU SOMMET (Consigne UX) */}
      <div className="max-w-2xl mx-auto px-1">
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-inner">
          {/* Bouton 1: Renforcements */}
          <button
            type="button"
            onClick={() => handleSelectForm("renforcement")}
            className={`flex items-center justify-center space-x-2.5 py-3.5 sm:py-4 px-3 sm:px-6 rounded-2xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              activeForm === "renforcement"
                ? "bg-[#1A237E] text-white border-2 border-amber-400 shadow-lg scale-[1.01]"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-[#1A237E] dark:hover:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80"
            }`}
          >
            <Users
              size={18}
              className={activeForm === "renforcement" ? "text-amber-300 shrink-0" : "text-[#1A237E] dark:text-amber-400 shrink-0"}
            />
            <div className="text-left">
              <span className="block leading-tight">Renforcements</span>
              <span className={`text-[10px] font-medium hidden sm:block ${
                activeForm === "renforcement" ? "text-indigo-200" : "text-slate-400"
              }`}>
                Au centre de cours
              </span>
            </div>
            {activeForm === "renforcement" && (
              <CheckCircle2 size={16} className="text-amber-300 ml-auto hidden sm:block shrink-0" />
            )}
          </button>

          {/* Bouton 2: Cours à Domicile */}
          <button
            type="button"
            onClick={() => handleSelectForm("domicile")}
            className={`flex items-center justify-center space-x-2.5 py-3.5 sm:py-4 px-3 sm:px-6 rounded-2xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              activeForm === "domicile"
                ? "bg-amber-600 text-white border-2 border-amber-300 shadow-lg scale-[1.01]"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80"
            }`}
          >
            <Home
              size={18}
              className={activeForm === "domicile" ? "text-white shrink-0" : "text-amber-600 dark:text-amber-400 shrink-0"}
            />
            <div className="text-left">
              <span className="block leading-tight">Cours à Domicile</span>
              <span className={`text-[10px] font-medium hidden sm:block ${
                activeForm === "domicile" ? "text-amber-100" : "text-slate-400"
              }`}>
                Suivi chez l'élève
              </span>
            </div>
            {activeForm === "domicile" && (
              <CheckCircle2 size={16} className="text-amber-200 ml-auto hidden sm:block shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Zone d'affichage du Formulaire Actif (Plein écran / En ligne dès le haut) */}
      <div className="w-full pt-1">
        {activeForm === "renforcement" ? (
          <FormulaireRenforcement
            inline={true}
            isOpen={true}
            onClose={handleBack}
            userLevel={user?.level || "3ème"}
            userName={user?.displayName || ""}
            userUid={user?.uid || ""}
            onOpenReceipt={onOpenReceipt}
          />
        ) : (
          <FormulaireDomicile
            inline={true}
            isOpen={true}
            onClose={handleBack}
            userLevel={user?.level || "3ème"}
            userName={user?.displayName || ""}
            userUid={user?.uid || ""}
            onOpenReceipt={onOpenReceipt}
          />
        )}
      </div>
    </div>
  );
};

export default Paiement;
