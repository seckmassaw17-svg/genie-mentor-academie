import React, { useState, useEffect } from "react";
import { SecondaryLevel, Subject, PaymentTransaction } from "../types";
import { STUDENT_LEVELS, getSubjectsForLevel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { saveTransactionToSupabase, logSupabaseError } from "../data/supabaseStorage";
import { supabase } from "../supabaseClient";
import { AppLogo } from "./AppLogo";
import { WaveLogo, OrangeMoneyLogo } from "./PaymentLogos";
import { getRegistrationFeeForLevel } from "../data/pricingConfig";
import { notifyCoursePaymentSubmitted, getUserStudentId } from "../utils/userUtils";
import { scrollToTopGlobal } from "./ScrollToTop";
import { 
  Home, 
  X, 
  Check, 
  CreditCard, 
  Calendar, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Clock, 
  FileText, 
  MapPin, 
  Phone, 
  Building, 
  GraduationCap, 
  ArrowRight, 
  ArrowLeft, 
  Send,
  Tag 
} from "lucide-react";

export interface DomicileModalProps {
  isOpen?: boolean;
  onClose: () => void;
  userLevel: SecondaryLevel;
  userName: string;
  userUid?: string;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  inline?: boolean;
}

type SerieType = "Enseignement Général" | "Série L" | "Série S";
type HoursType = "2h/semaine" | "4h/semaine" | "6h/semaine";

const MONTHS = [
  "Octobre",
  "Novembre",
  "Décembre",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
];

export const DomicileModal: React.FC<DomicileModalProps> = ({
  isOpen = true,
  onClose,
  userLevel,
  userName,
  userUid,
  onOpenReceipt,
  inline = false,
}) => {
  // Stepper state (1 -> 2 -> 3 -> 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Étape 1: Identification Élève & Tuteur
  const [studentName, setStudentName] = useState<string>(userName || "");
  const [address, setAddress] = useState<string>("");
  const [parentName, setParentName] = useState<string>("");
  const [parentPhone, setParentPhone] = useState<string>("");

  // Étape 2: Choix de l'Offre & Profil Scolaire
  const [paymentType, setPaymentType] = useState<"inscription" | "mensualite">("inscription");
  const [level, setLevel] = useState<SecondaryLevel>(userLevel || "3ème");
  const [serie, setSerie] = useState<SerieType>("Enseignement Général");

  // Étape 3: Spécifications de l'Offre (Volume horaire, Matières si Inscription OR Mois de paiement si Mensualité)
  const [weeklyHours, setWeeklyHours] = useState<HoursType>("2h/semaine");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("Octobre");

  // Étape 4: Paiement
  const [paymentOperator, setPaymentOperator] = useState<"wave" | "orange">("wave");
  const [transactionRef, setTransactionRef] = useState<string>("");

  // UI status
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTx, setCreatedTx] = useState<PaymentTransaction | null>(null);

  const checkIsLycee = (lvl?: SecondaryLevel | string | null) => {
    const l = String(lvl || "");
    return (
      l.startsWith("Seconde") ||
      l.startsWith("Première") ||
      l.startsWith("Terminale") ||
      l === "2nde" ||
      l === "1ère" ||
      l === "Terminale"
    );
  };

  useEffect(() => {
    const safeLevel = userLevel || "3ème";
    setLevel(safeLevel);
    if (!studentName) {
      setStudentName(userName || "");
    }
    const defaultSubjs = getSubjectsForLevel(safeLevel).slice(0, 2);
    if (defaultSubjs.length > 0) {
      setSelectedSubjects(defaultSubjs);
    }

    if (checkIsLycee(safeLevel)) {
      if (
        safeLevel === "Seconde L" ||
        (safeLevel && safeLevel.startsWith("Première L")) ||
        (safeLevel && safeLevel.startsWith("Terminale L"))
      ) {
        setSerie("Série L");
      } else {
        setSerie("Série S");
      }
    } else {
      setSerie("Enseignement Général");
    }
  }, [userLevel, userName, isOpen]);

  // Réinitialisation immédiate du défilement au sommet lors de l'ouverture et à chaque étape
  useEffect(() => {
    scrollToTopGlobal("instant");
  }, [currentStep, isOpen]);

  if (!isOpen && !inline) return null;

  const isLycee = checkIsLycee(level);
  const availableSubjects = getSubjectsForLevel(level || "3ème");

  const handleLevelChange = (newLvl: SecondaryLevel) => {
    const safeLvl = newLvl || "3ème";
    setLevel(safeLvl);
    const valid = getSubjectsForLevel(safeLvl);
    setSelectedSubjects(selectedSubjects.filter((s) => valid.includes(s)));

    if (checkIsLycee(safeLvl)) {
      if (
        safeLvl === "Seconde L" ||
        (safeLvl && safeLvl.startsWith("Première L")) ||
        (safeLvl && safeLvl.startsWith("Terminale L"))
      ) {
        setSerie("Série L");
      } else if (
        safeLvl === "Seconde S" ||
        (safeLvl && safeLvl.startsWith("Première S")) ||
        (safeLvl && safeLvl.startsWith("Terminale S"))
      ) {
        setSerie("Série S");
      } else {
        setSerie("Série S");
      }
    } else {
      setSerie("Enseignement Général");
    }
  };

  const handleSubjectToggle = (subj: Subject) => {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length === 1) return;
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  // CALCULS & MAJORATIONS DES TARIFS À DOMICILE
  // Frais d'inscription : Selon la classe (ex: Terminale S: 10 000F, Terminale L: 7 000F, Autres: 5 000F)
  // Mensualité de base :
  // - 2h / semaine = 10 000 FCFA
  // - 4h / semaine = 20 000 FCFA
  // - 6h / semaine = 30 000 FCFA
  // Majoration Lycée : +30% (Série L) ou +50% (Série S)
  const calculatePricing = () => {
    const registrationFee = getRegistrationFeeForLevel(level);

    let baseMonthly = 10000;
    if (weeklyHours === "4h/semaine") baseMonthly = 20000;
    if (weeklyHours === "6h/semaine") baseMonthly = 30000;

    let markupPercent = 0;
    if (isLycee) {
      if (
        serie === "Série L" ||
        level === "Seconde L" ||
        (level && level.startsWith("Première L")) ||
        (level && level.startsWith("Terminale L"))
      ) {
        markupPercent = 30;
      } else {
        markupPercent = 50;
      }
    }

    const monthlyFee = Math.round(baseMonthly * (1 + markupPercent / 100));

    // Si Offre Inscription -> Payer Frais d'Inscription uniquement
    // Si Offre Mensualité -> Payer la Mensualité calculée uniquement
    const totalAmount = paymentType === "inscription" ? registrationFee : monthlyFee;

    return { registrationFee, monthlyFee, totalAmount };
  };

  const { registrationFee, monthlyFee, totalAmount } = calculatePricing();

  // Navigation Steps Validation
  const handleNextStep = () => {
    setErrorMsg("");

    if (currentStep === 1) {
      if (!studentName.trim()) {
        setErrorMsg("Veuillez saisir le nom et prénom de l'élève.");
        return;
      }
      if (!address.trim()) {
        setErrorMsg("Veuillez fournir l'adresse exacte du domicile.");
        return;
      }
      if (!parentName.trim()) {
        setErrorMsg("Veuillez indiquer le nom du parent ou tuteur responsable.");
        return;
      }
      if (!parentPhone.trim() || parentPhone.trim().length < 8) {
        setErrorMsg("Veuillez saisir un numéro de téléphone valide pour le tuteur.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!paymentType) {
        setErrorMsg("Veuillez sélectionner le type d'offre (Inscription ou Mensualité).");
        return;
      }
      if (!level) {
        setErrorMsg("Veuillez sélectionner la classe de l'élève.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (paymentType === "inscription") {
        if (!weeklyHours) {
          setErrorMsg("Veuillez sélectionner un volume horaire hebdomadaire.");
          return;
        }
        if (selectedSubjects.length === 0) {
          setErrorMsg("Pour l'inscription, veuillez sélectionner au moins une matière à encadrer.");
          return;
        }
      } else {
        if (!weeklyHours) {
          setErrorMsg("Veuillez sélectionner le volume horaire de la mensualité.");
          return;
        }
        if (!selectedMonth) {
          setErrorMsg("Pour la mensualité, veuillez sélectionner le mois de paiement.");
          return;
        }
      }
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  // Submit Payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (paymentOperator === "orange" && !transactionRef.trim()) {
      setErrorMsg("Veuillez saisir le code ID de transaction Orange Money.");
      return;
    }

    const roomRepo = RoomDatabaseRepository.getInstance();

    // Check duplicate monthly payment
    if (paymentType === "mensualite") {
      const isDuplicate = roomRepo.checkDuplicateMensualite(studentName, selectedMonth);
      if (isDuplicate) {
        setErrorMsg(
          `Attention : L'apprenant "${studentName.trim()}" a déjà un paiement enregistré pour le mois de ${selectedMonth}.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    const effectiveRef = transactionRef.trim() || (paymentOperator === "wave" ? `WAVE-${Date.now().toString().slice(-6)}` : "DIRECT");

    const studentMatricule = getUserStudentId({ uid: userUid, level });

    const newTx: PaymentTransaction = {
      id: "tx_dom_" + Date.now(),
      userUid: userUid || "user_guest_" + Date.now(),
      studentMatricule,
      userName: parentName.trim() || userName || "Tuteur / Élève",
      learnerName: studentName.trim(),
      type: "domicile",
      paymentType: paymentType,
      selectedMonth: paymentType === "mensualite" ? selectedMonth : undefined,
      level: level,
      subjects: paymentType === "inscription" ? selectedSubjects : [],
      weeklyHours: weeklyHours,
      amount: totalAmount,
      operator: paymentOperator,
      phoneNumber: "78 376 95 84",
      status: "pending",
      createdAt: Date.now(),
      dateFormatted: `Le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    };

    try {
      roomRepo.insertTransaction(newTx);

      // Envoi vers Supabase avec les colonnes essentielles conformes au schéma
      const operatorFormatted: "WAVE" | "ORANGE_MONEY" = (paymentOperator === "orange" || paymentOperator?.toString().toUpperCase().includes("ORANGE")) ? "ORANGE_MONEY" : "WAVE";
      
      const essentialDbPayload = {
        user_id: userUid || "user_guest_" + Date.now(),
        student_name: studentName.trim(),
        class_name: level,
        operator: operatorFormatted,
        transaction_id: effectiveRef,
        amount: Number(totalAmount),
        status: "PENDING",
      };

      if (supabase) {
        const { error: insertError } = await supabase.from("transactions").insert([essentialDbPayload]);
        if (insertError) {
          logSupabaseError("inserting domicile payment to 'transactions'", insertError);
        }
      }

      await saveTransactionToSupabase(newTx);
      
      notifyCoursePaymentSubmitted(
        {
          uid: userUid || "user_guest_" + Date.now(),
          displayName: parentName.trim() || userName || "Tuteur / Élève",
          email: "",
          level: level,
          isAdmin: false,
          isVIP: false,
          photoUrl: "",
        },
        studentName.trim(),
        "domicile",
        totalAmount,
        paymentOperator,
        parentPhone.trim() || "78 376 95 84"
      ).catch(console.warn);

      setCreatedTx(newTx);
      setIsSuccess(true);
    } catch (err) {
      console.error("Error saving domicile transaction:", err);
      setErrorMsg("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setCurrentStep(1);
    setCreatedTx(null);
    setTransactionRef("");
    setErrorMsg("");
    onClose();
  };

  return (
    <div
      className={
        inline
          ? "w-full max-w-3xl mx-auto py-1 animate-in fade-in duration-200"
          : "fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
      }
    >
      <div
        className={
          inline
            ? "bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl w-full p-5 sm:p-7 shadow-xl relative flex flex-col space-y-4"
            : "bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden space-y-4"
        }
      >
        {/* Top Decorative Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-[#1A237E] rounded-t-3xl" />

        {/* Modal Close Button */}
        {!inline && (
          <button
            onClick={handleReset}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
          >
            <X size={20} />
          </button>
        )}

        {/* HEADER WITH ALWAYS VISIBLE LOGO */}
        <div className="flex items-center space-x-3 shrink-0 pr-8">
          <AppLogo
            className="w-12 h-12 rounded-2xl border-2 border-amber-400 shadow shrink-0"
            alt="Génie Mentor Académie Logo"
          />
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-[10px] font-black rounded-full border border-amber-300">
              <Home size={11} className="text-amber-700 dark:text-amber-400" />
              <span>Génie Mentor Académie • Répétiteurs Particuliers</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Cours Particuliers à Domicile 🏠
            </h3>
          </div>
        </div>

        {/* STEPPER PROGRESS BAR */}
        {!isSuccess && (
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-extrabold mb-2">
              <span className="text-[#1A237E] dark:text-amber-300">
                Étape {currentStep} sur 4 :{" "}
                {currentStep === 1 && "1. Identification Élève & Tuteur"}
                {currentStep === 2 && "2. Choix de l'Offre & Niveau"}
                {currentStep === 3 && (paymentType === "inscription" ? "3. Horaire & Choix des Matières" : "3. Horaire & Mois de Paiement")}
                {currentStep === 4 && "4. Récapitulatif & Paiement Cashless"}
              </span>
              <span className="text-slate-400">{Math.round((currentStep / 4) * 100)}%</span>
            </div>

            <div className="grid grid-cols-4 gap-1 sm:gap-2 relative">
              {[
                { step: 1, label: "Identification" },
                { step: 2, label: "Offre & Niveau" },
                { step: 3, label: paymentType === "inscription" ? "Matières" : "Mois" },
                { step: 4, label: "Paiement" },
              ].map((item) => {
                const isCompleted = currentStep > item.step;
                const isCurrent = currentStep === item.step;
                return (
                  <div key={item.step} className="flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-white shadow-xs"
                          : isCurrent
                          ? "bg-[#1A237E] text-amber-300 border-2 border-amber-400 shadow-md scale-105"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                      }`}
                    >
                      {isCompleted ? <Check size={14} /> : item.step}
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold mt-1 truncate max-w-[65px] sm:max-w-none ${
                        isCurrent
                          ? "text-[#1A237E] dark:text-amber-300"
                          : isCompleted
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-extrabold flex items-center space-x-2 shrink-0 animate-in fade-in">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEPPER CONTENT BODY */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          
          {/* CONFIRMATION / TRAITEMENT EN COURS */}
          {isSuccess ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 rounded-2xl p-6 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Clock size={36} className="animate-spin text-amber-600" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 bg-amber-200 text-amber-950 font-black text-xs rounded-full border border-amber-400 inline-block">
                  Statut : En attente de validation
                </span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white pt-1">
                  Demande de Traitement en Cours !
                </h4>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-900/40 p-3 rounded-2xl border border-amber-300 max-w-md mx-auto">
                  "Paiement en cours de vérification par l'administration. Un professeur répétiteur vous sera affecté après validation."
                </p>
              </div>

              {/* Summary details */}
              <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-800 dark:text-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Apprenant :</span>
                  <span className="font-bold text-[#1A237E] dark:text-indigo-300">{studentName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Parent / Tuteur :</span>
                  <span className="font-bold">{parentName} ({parentPhone})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Adresse :</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{address}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Offre Domicile :</span>
                  <span className="font-extrabold text-amber-700 uppercase">
                    {paymentType === "inscription" ? "Inscription / Frais de Dossier" : `Mensualité de ${selectedMonth}`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Volume Horaire & Niveau :</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {weeklyHours} (Classe de {level} {isLycee ? `- ${serie}` : ""})
                  </span>
                </div>
                {paymentType === "inscription" && selectedSubjects.length > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Matières à encadrer :</span>
                    <span className="font-bold text-amber-700">{selectedSubjects.join(", ")}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 pt-1 font-black text-sm text-[#1A237E] dark:text-amber-400">
                  <span>Montant Transféré :</span>
                  <span>{totalAmount.toLocaleString("fr-FR")} FCFA</span>
                </div>
              </div>

              <div className="space-y-2">
                {createdTx && onOpenReceipt && (
                  <button
                    type="button"
                    onClick={() => onOpenReceipt(createdTx)}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#1A237E] font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 border border-indigo-200 cursor-pointer"
                  >
                    <FileText size={16} />
                    <span>Voir / Imprimer le Reçu Numérique</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3 bg-[#1A237E] hover:bg-indigo-900 text-amber-300 font-black text-xs rounded-xl shadow cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ÉTAPE 1 : Identification de l'Élève & Tuteur */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-amber-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-amber-200 dark:border-slate-700">
                    <h4 className="font-black text-amber-950 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <User size={15} />
                      <span>Étape 1 : Coordonnées de l'Élève & du Tuteur à Domicile</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Informations de résidence indispensables pour l'affectation du professeur répétiteur.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                        <User size={14} className="text-[#1A237E] dark:text-indigo-400" />
                        <span>Nom et Prénom de l'Élève *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Ex: Cheikh Tidiane Seck"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                      />
                    </div>

                    <div>
                      <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                        <MapPin size={14} className="text-rose-600" />
                        <span>Adresse Exacte du Domicile *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ex: Mermoz Extension, Villa N° 45"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                      />
                    </div>

                    <div>
                      <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                        <User size={14} className="text-amber-600" />
                        <span>Nom du Parent / Tuteur Responsable *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Ex: Dr. Mamadou Seck"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                      />
                    </div>

                    <div>
                      <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                        <Phone size={14} className="text-emerald-600" />
                        <span>Téléphone du Tuteur *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="Ex: 77 654 32 10"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : Choix de l'Offre & Profil Scolaire */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-amber-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-amber-200 dark:border-slate-700">
                    <h4 className="font-black text-amber-950 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <Tag size={16} />
                      <span>Étape 2 : Choix de l'Offre & Niveau d'Études</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Choisissez si vous réglez les Frais d'Inscription ou une Mensualité de cours particuliers.
                    </p>
                  </div>

                  {/* SELECTION OFFRE : INSCRIPTION VS MENSUALITE COMPACT */}
                  <div className="space-y-1 text-xs">
                    <label className="block font-extrabold text-slate-800 dark:text-slate-200">
                      Formule à régler * :
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentType("inscription")}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          paymentType === "inscription"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 shadow-sm"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-black text-xs">📝 Inscription</span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded-md">
                            {registrationFee.toLocaleString("fr-FR")} F
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Frais dossier répétiteur
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentType("mensualite")}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          paymentType === "mensualite"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 shadow-sm"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-black text-xs">🗓️ Mensualité</span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-500 text-white rounded-md">
                            Dès {monthlyFee.toLocaleString("fr-FR")} F
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Règlement mensuel
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Classe de l'Élève * :
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        {STUDENT_LEVELS.map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleLevelChange(lvl)}
                            className={`py-1.5 px-2 rounded-lg border font-bold text-center transition-all cursor-pointer text-xs ${
                              level === lvl
                                ? "border-amber-500 bg-amber-500 text-slate-950 font-black shadow-xs"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300"
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isLycee && (
                      <div>
                        <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                          Série Pédagogique (Lycée) :
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSerie("Série L")}
                            className={`py-1.5 px-2 rounded-xl border-2 font-extrabold text-center transition-all cursor-pointer text-xs ${
                              serie === "Série L"
                                ? "border-amber-500 bg-amber-100 text-amber-950 shadow-xs"
                                : "border-slate-200 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            📖 Série L (+30%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSerie("Série S")}
                            className={`py-1.5 px-2 rounded-xl border-2 font-extrabold text-center transition-all cursor-pointer text-xs ${
                              serie === "Série S"
                                ? "border-indigo-600 bg-indigo-100 text-indigo-950 shadow-xs"
                                : "border-slate-200 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            🧪 Série S (+50%)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : Spécifications selon l'Offre */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  
                  {/* SI INSCRIPTION : CHOIX DU VOLUME HORAIRE ET DES MATIÈRES (PAS DE SELECTION DU MOIS) */}
                  {paymentType === "inscription" ? (
                    <>
                      <div className="bg-amber-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-amber-200 dark:border-slate-700">
                        <h4 className="font-black text-amber-950 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <BookOpen size={16} />
                          <span>Étape 3 : Volume Horaire & Choix des Matières à Encadrer</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Définissez le rythme de travail et les matières souhaitées pour l'organisation du cours à domicile.
                        </p>
                      </div>

                      {/* Volume horaire */}
                      <div className="space-y-1.5 text-xs">
                        <label className="block font-extrabold text-slate-800 dark:text-slate-200">
                          Volume Horaire Hebdomadaire souhaité * :
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["2h/semaine", "4h/semaine", "6h/semaine"] as HoursType[]).map((hrs) => (
                            <button
                              key={hrs}
                              type="button"
                              onClick={() => setWeeklyHours(hrs)}
                              className={`p-2.5 rounded-2xl border-2 text-center font-black transition-all cursor-pointer ${
                                weeklyHours === hrs
                                  ? "border-amber-500 bg-amber-400 text-[#1A237E] shadow-md scale-102"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300"
                              }`}
                            >
                              <span className="block text-xs sm:text-sm">{hrs}</span>
                              <span className="text-[9px] font-bold block mt-0.5 opacity-90">
                                {hrs === "2h/semaine" ? "1 Séance / sem" : hrs === "4h/semaine" ? "2 Séances / sem" : "3 Séances / sem"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Matières */}
                      <div className="space-y-1.5 text-xs">
                        <label className="block font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Sélection des Matières à Encadrer * :</span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                            ({selectedSubjects.length} sélectionnée{selectedSubjects.length > 1 ? "s" : ""})
                          </span>
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableSubjects.map((subj) => {
                            const isSelected = selectedSubjects.includes(subj);
                            return (
                              <button
                                key={subj}
                                type="button"
                                onClick={() => handleSubjectToggle(subj)}
                                className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <span className="truncate">{subj}</span>
                                <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${isSelected ? "bg-slate-950 text-amber-400 border-slate-950" : "border-slate-300"}`}>
                                  {isSelected && <Check size={12} strokeWidth={3} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* SI MENSUALITÉ : CHOIX DU VOLUME HORAIRE ET SÉLECTION DU MOIS (PAS DE CHOIX DE MATIÈRES) */
                    <>
                      <div className="bg-amber-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-amber-200 dark:border-slate-700">
                        <h4 className="font-black text-amber-950 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <Calendar size={16} />
                          <span>Étape 3 : Volume Horaire & Sélection du Mois de Paiement</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Sélectionnez le volume horaire du répétiteur et le mois d'étude concerné.
                        </p>
                      </div>

                      {/* Volume horaire pour la mensualité */}
                      <div className="space-y-1.5 text-xs">
                        <label className="block font-extrabold text-slate-800 dark:text-slate-200">
                          Volume Horaire de la Mensualité * :
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["2h/semaine", "4h/semaine", "6h/semaine"] as HoursType[]).map((hrs) => (
                            <button
                              key={hrs}
                              type="button"
                              onClick={() => setWeeklyHours(hrs)}
                              className={`p-2.5 rounded-2xl border-2 text-center font-black transition-all cursor-pointer ${
                                weeklyHours === hrs
                                  ? "border-amber-500 bg-amber-400 text-[#1A237E] shadow-md scale-102"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300"
                              }`}
                            >
                              <span className="block text-xs sm:text-sm">{hrs}</span>
                              <span className="text-[9px] font-bold block mt-0.5 opacity-90">
                                {hrs === "2h/semaine" ? "1 Séance / sem" : hrs === "4h/semaine" ? "2 Séances / sem" : "3 Séances / sem"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Choix du Mois */}
                      <div className="space-y-2 text-xs">
                        <label className="block font-extrabold text-amber-950 dark:text-amber-300 flex items-center space-x-1">
                          <Calendar size={14} className="text-amber-700" />
                          <span>Mois de la Mensualité à Domicile * :</span>
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1">
                          {MONTHS.map((m) => {
                            const isSelected = selectedMonth === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setSelectedMonth(m)}
                                className={`p-3 rounded-xl border-2 font-extrabold text-center transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-amber-500 bg-amber-400 text-[#1A237E] shadow-md scale-[1.02]"
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300"
                                }`}
                              >
                                <span className="block text-xs">Mois de {m}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ÉTAPE 4 : Récapitulatif & Paiement Cashless */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-amber-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-amber-200 dark:border-slate-700">
                    <h4 className="font-black text-amber-950 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <CreditCard size={16} />
                      <span>Étape 4 : Récapitulatif & Règlement Cashless</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Synthèse de la commande à domicile avec calcul des tarifs et majorations.
                    </p>
                  </div>

                  {/* RÉCAPITULATIF TRANSPARENT */}
                  <div className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs space-y-2 text-slate-800 dark:text-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-slate-400 font-bold block text-[10px]">ÉLÈVE & TUTEUR :</span>
                        <span className="font-extrabold text-[#1A237E] dark:text-indigo-300 block">{studentName}</span>
                        <span className="text-slate-500 block text-[11px]">{parentName} • {parentPhone}</span>
                        <span className="text-slate-400 block text-[10px]">{address}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold block text-[10px]">FORMULE DOMICILE :</span>
                        <span className="font-extrabold text-amber-700 block">Volume : {weeklyHours}</span>
                        <span className="font-bold text-slate-900 dark:text-white block">Classe de {level} {isLycee ? `(${serie})` : ""}</span>
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-extrabold text-[10px] rounded-full inline-block mt-1">
                          Offre : {paymentType === "inscription" ? "Inscription / Frais de Dossier" : `Mensualité de ${selectedMonth}`}
                        </span>
                      </div>
                    </div>

                    {/* MATIÈRES SÉLECTIONNÉES SI INSCRIPTION */}
                    {paymentType === "inscription" && selectedSubjects.length > 0 && (
                      <div className="pt-1">
                        <span className="text-slate-400 font-bold block text-[10px] mb-1">MATIÈRES À ENCADRER :</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedSubjects.map((subj) => (
                            <span
                              key={subj}
                              className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-300 font-bold text-[10px] rounded-lg border border-amber-300 dark:border-amber-800"
                            >
                              ✓ {subj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CALCUL TRANSPARENT DU MONTANT TOTAL */}
                    <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl p-3 space-y-1 mt-2">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                        <span>Montant de l'Offre ({paymentType === "inscription" ? "Frais d'inscription dossier" : `Mensualité ${weeklyHours} - ${selectedMonth}`}) :</span>
                        <span className="font-extrabold">{totalAmount.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-[#1A237E] dark:text-amber-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>TOTAL A PAYER :</span>
                        <span>{totalAmount.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    </div>
                  </div>

                  {/* PAIEMENT CASHLESS */}
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-3.5 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#1A237E] dark:text-amber-300">
                        Mode de Transfert Cashless :
                      </span>
                      <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                        {totalAmount.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentOperator("wave")}
                        className={`p-3 rounded-2xl border-2 font-black transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                          paymentOperator === "wave"
                            ? "bg-cyan-50 border-[#1EA5FC] ring-2 ring-[#1EA5FC]/30 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 hover:border-cyan-300"
                        }`}
                      >
                        <WaveLogo size={24} showLabel={true} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentOperator("orange")}
                        className={`p-3 rounded-2xl border-2 font-black transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                          paymentOperator === "orange"
                            ? "bg-orange-50 border-[#FF7900] ring-2 ring-[#FF7900]/30 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 hover:border-orange-300"
                        }`}
                      >
                        <OrangeMoneyLogo size={24} showLabel={true} />
                      </button>
                    </div>

                    {paymentOperator === "wave" ? (
                      <div className="space-y-2.5 pt-1">
                        {/* Direct Wave App Payment Link Button */}
                        <a
                          href="https://pay.wave.com/m/M_sn_yU5uzEBaEB9o/c/sn/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 bg-[#1EA5FC] hover:bg-[#158ddb] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-center"
                        >
                          <WaveLogo size={20} showLabel={false} />
                          <span>Payer {totalAmount.toLocaleString("fr-FR")} FCFA sur Wave ➔</span>
                        </a>

                        <div className="bg-cyan-50/90 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 rounded-xl p-2.5 text-[11px] text-cyan-950 dark:text-cyan-200 space-y-1">
                          <p className="font-extrabold flex items-center space-x-1 text-cyan-900 dark:text-cyan-300">
                            <span>🌊 Instructions Wave :</span>
                          </p>
                          <p>1. Cliquez sur le bouton bleu ci-dessus pour ouvrir Wave et régler <strong>{totalAmount.toLocaleString("fr-FR")} FCFA</strong>.</p>
                          <p>2. Revenez ici et cliquez sur <strong>« Valider et Envoyer l'Inscription »</strong>. L'administrateur (Massaw Seck) validera votre demande dès confirmation de la réception.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5 pt-1">
                        <div className="bg-white dark:bg-slate-900 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">Numéro Récepteur OM :</span>
                          <span className="text-sm font-black text-[#1A237E] dark:text-amber-400 font-mono tracking-wider whitespace-nowrap">
                            78 376 95 84
                          </span>
                        </div>

                        <div>
                          <label className="block font-extrabold text-slate-800 dark:text-slate-200 mb-1 flex items-center space-x-1">
                            <FileText size={14} className="text-[#1A237E] dark:text-amber-400" />
                            <span>ID de Transaction Orange Money *</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            placeholder="Ex: OM-829103 ou MP240815.1923"
                            className="w-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-[#1A237E]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* STEPPER FOOTER BUTTONS */}
        {!isSuccess && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
              >
                <ArrowLeft size={16} />
                <span>Précédent</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="py-3 px-5 bg-[#1A237E] hover:bg-indigo-900 text-amber-300 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5 border border-amber-400/40"
              >
                <span>Étape Suivante</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="py-3 px-6 bg-gradient-to-r from-[#1A237E] via-indigo-900 to-slate-900 hover:from-indigo-900 hover:to-[#1A237E] text-amber-300 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2 border border-amber-400"
              >
                {isSubmitting ? (
                  <span>Transmission...</span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Valider et Payer</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const HomeCoursePayment = DomicileModal;
export const FormulaireDomicile = DomicileModal;
