import React, { useState } from "react";
import { 
  Sparkles, 
  Lock, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Phone, 
  FileText, 
  Send, 
  User, 
  GraduationCap, 
  BookOpen, 
  CreditCard, 
  Check, 
  AlertCircle,
  Crown,
  Trophy,
  Award,
  Zap
} from "lucide-react";
import { AppLogo } from "./AppLogo";
import { SecondaryLevel, VIPPaymentRequest, UserProfile } from "../types";
import { STUDENT_LEVELS } from "../data/mockData";
import { saveVIPPaymentRequestToSupabase } from "../data/supabaseStorage";
import { WaveLogo, OrangeMoneyLogo } from "./PaymentLogos";
import { VIP_PLANS, VIPPlanOption, computeExpirationTimestamp } from "../utils/vipUtils";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { notifyVIPPaymentSubmitted, getUserStudentId } from "../utils/userUtils";
import { supabase } from "../lib/supabaseClient";

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  userUid?: string;
  userName?: string;
  userPhone?: string;
  userLevel?: SecondaryLevel;
}

type PaymentOperator = "wave" | "orange";

export const VipModal: React.FC<VipModalProps> = ({
  isOpen,
  onClose,
  user,
  userUid,
  userName = "",
  userPhone: initialPhone = "",
  userLevel = "3ème",
}) => {
  const effectiveUid = userUid || user?.uid;
  const effectiveName = userName || user?.displayName || "";
  const effectivePhone = initialPhone || user?.phoneNumber || user?.phone || "";
  const effectiveLevel = userLevel || user?.level || "3ème";

  const [studentName, setStudentName] = useState(effectiveName);
  const [phoneNumber, setPhoneNumber] = useState(effectivePhone);
  const [selectedLevel, setSelectedLevel] = useState<SecondaryLevel>(effectiveLevel);
  const [selectedPlanId, setSelectedPlanId] = useState<"1mois" | "3mois" | "6mois" | "1an" | "illimite">("3mois");
  const [paymentOperator, setPaymentOperator] = useState<PaymentOperator>("wave");
  const [transactionRef, setTransactionRef] = useState("");
  const [stepError, setStepError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const currentPlan = VIP_PLANS.find((p) => p.id === selectedPlanId) || VIP_PLANS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError("");

    if (!studentName.trim()) {
      setStepError("Veuillez saisir votre nom et prénom.");
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) {
      setStepError("Veuillez renseigner un numéro de téléphone valide (Wave ou OM).");
      return;
    }

    if (paymentOperator === "orange" && !transactionRef.trim()) {
      setStepError("Veuillez saisir le code ID de transaction Orange Money.");
      return;
    }

    setIsSubmitting(true);

    const effectiveRef = transactionRef.trim() || (paymentOperator === "wave" ? `WAVE-${Date.now().toString().slice(-6)}` : "OM-DIRECT");
    const reqId = "vip_req_" + Date.now();

    try {
      // Helper check for UUID format (8-4-4-4-12 hex)
      const isUuid = (val?: string | null) =>
        Boolean(val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim()));

      const { data: authData } = await supabase.auth.getUser();
      const sessionUid = authData?.user?.id;
      const candidateUid = sessionUid || effectiveUid || userUid || user?.uid || user?.id;

      if (!isUuid(candidateUid)) {
        throw new Error(
          "Identifiant de session invalide : Vous devez être connecté avec un compte Supabase (UUID) valide pour souscrire un Pass VIP."
        );
      }

      const currentStudentUid = candidateUid!;
      const studentMatricule = getUserStudentId({ uid: currentStudentUid, level: selectedLevel });
      const planId = currentPlan.id;
      const amount = currentPlan.priceFCFA;

      const newReq: VIPPaymentRequest = {
        id: reqId,
        userUid: currentStudentUid,
        student_uid: currentStudentUid,
        studentMatricule,
        studentName: studentName.trim(),
        userPhone: phoneNumber.trim(),
        level: selectedLevel,
        transactionRef: effectiveRef.toUpperCase(),
        amount: amount,
        status: "PENDING",
        planId: planId,
        plan_id: planId,
        planDuration: currentPlan.durationLabel,
        createdAt: Date.now(),
        dateFormatted: `Le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
      };

      // 1. Envoyer les champs exacts de la table vip_payment_requests avec capture d'erreur détaillée
      const { error: reqError } = await supabase
        .from("vip_payment_requests")
        .upsert({
          id: reqId,
          student_uid: currentStudentUid,
          student_name: studentName.trim(),
          student_phone: phoneNumber.trim(),
          level: selectedLevel,
          plan_id: planId,
          amount: amount,
          status: "PENDING",
          requested_at: Date.now(),
          operator: paymentOperator,
          transaction_ref: effectiveRef.toUpperCase(),
        });

      if (reqError) {
        console.error("[Supabase Error] Insertion vip_payment_requests échouée:", reqError);
        const detailedMessage = reqError.message || reqError.details || reqError.hint || JSON.stringify(reqError);
        throw new Error(`Erreur Supabase (${reqError.code || "DB/RLS"}) : ${detailedMessage}`);
      }

      // Synchronisation locale pour mode hors-ligne
      const roomRepo = RoomDatabaseRepository.getInstance();
      roomRepo.syncVIPPaymentRequest(newReq);
      
      notifyVIPPaymentSubmitted(
        {
          uid: currentStudentUid,
          displayName: studentName.trim(),
          email: user?.email || "",
          level: selectedLevel,
          isAdmin: false,
          isVIP: false,
          photoUrl: "",
        },
        currentPlan.durationLabel,
        currentPlan.priceFCFA,
        effectiveRef,
        phoneNumber.trim()
      ).catch(console.warn);

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Erreur soumission demande VIP:", err);
      setStepError(err?.message || "Une erreur est survenue lors de l'enregistrement de votre demande VIP. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setTransactionRef("");
    setStepError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden space-y-4">
        
        {/* Top Decorative Gold Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-[#1A237E]" />

        {/* Modal Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* Header with App Logo & Title */}
        <div className="flex items-center space-x-3 shrink-0 pr-8">
          <AppLogo
            className="w-12 h-12 rounded-2xl border-2 border-amber-400 shadow-md shrink-0"
            alt="Génie Mentor Académie Logo"
          />
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-[#1A237E] dark:text-amber-300 text-[10px] font-black rounded-full border border-amber-300">
              <Crown size={11} className="text-amber-500 fill-amber-500" />
              <span>Génie Mentor Académie (GMA) • Pass VIP Numérique</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Activer le Pass VIP
            </h3>
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
              <Sparkles size={12} />
              <span>Examens, Concours National, Exercice D'élite</span>
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {stepError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-extrabold flex items-center space-x-2 shrink-0 animate-in fade-in">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{stepError}</span>
          </div>
        )}

        {/* Form or Success Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {isSuccess ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-800 rounded-2xl p-6 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={38} />
              </div>

              <div>
                <span className="px-3 py-1 bg-amber-100 text-[#1A237E] font-black text-xs rounded-full border border-amber-300 inline-block mb-2">
                  Demande Transmise • En Attente de Validation
                </span>
                <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                  Demande de Pass VIP Enregistrée !
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium mt-1 leading-relaxed max-w-md mx-auto">
                  Votre demande pour le forfait <strong>Pass VIP {currentPlan.durationLabel}</strong> ({currentPlan.priceFCFA.toLocaleString("fr-FR")} FCFA) a été transmise à l'administrateur (Massaw Seck). Dès validation de votre transfert, votre mode VIP sera activé instantanément.
                </p>
              </div>

              {/* Summary details */}
              <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Élève :</span>
                  <span className="font-bold text-[#1A237E] dark:text-indigo-300">{studentName} ({selectedLevel})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Téléphone de contact :</span>
                  <span className="font-bold">{phoneNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Offre souscrite :</span>
                  <span className="font-extrabold text-amber-600">Pass VIP {currentPlan.durationLabel}</span>
                </div>
                <div className="flex justify-between py-1 pt-1 font-black text-sm text-[#1A237E] dark:text-amber-400">
                  <span>Montant Total :</span>
                  <span>{currentPlan.priceFCFA.toLocaleString("fr-FR")} FCFA</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3.5 bg-[#1A237E] hover:bg-indigo-900 text-amber-300 font-black text-xs rounded-xl shadow cursor-pointer transition-colors"
              >
                Compris, merci !
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* VIP Value proposition banner */}
              <div className="bg-gradient-to-r from-[#1A237E] to-indigo-900 text-white rounded-2xl p-3.5 border border-amber-400/40 shadow-sm space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Crown size={18} className="text-amber-400 fill-amber-400" />
                  <span className="font-black text-xs sm:text-sm text-amber-300">
                    Débloquez l'Intégralité des Épreuves & Concours VIP
                  </span>
                </div>
                <p className="text-[11px] text-indigo-100 leading-snug">
                  Accédez à tous les sujets de <strong>Concours Nationaux</strong>, annales corrigées <strong>BFEM & BAC</strong>, fascicules et séries d'<strong>Exercices d'Élite</strong> avec corrigés détaillés.
                </p>
              </div>

              {/* IDENTIFICATION FIELDS */}
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
                    placeholder="Ex: Babacar Seck"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                    <Phone size={14} className="text-emerald-600" />
                    <span>Numéro de Téléphone (Wave / OM) *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: 77 123 45 67 ou 78 901 23 45"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1A237E]"
                  />
                </div>
              </div>

              {/* VIP DURATION OPTIONS (EXACT RATES) */}
              <div className="space-y-2 text-xs">
                <label className="block font-black text-[#1A237E] dark:text-amber-300 uppercase tracking-wide flex items-center justify-between">
                  <span>Choisissez la Durée de votre Pass VIP * :</span>
                  <span className="text-[10px] text-slate-500 font-normal">Tarifs officiels</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VIP_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                          isSelected
                            ? "border-amber-400 bg-[#1A237E] text-white shadow-md scale-[1.02] ring-2 ring-amber-400/40"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-amber-300"
                        }`}
                      >
                        {plan.badge && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full self-start mb-1 ${
                            isSelected ? "bg-amber-400 text-[#1A237E]" : "bg-amber-100 text-amber-900"
                          }`}>
                            {plan.badge}
                          </span>
                        )}
                        <div>
                          <h5 className="font-black text-xs sm:text-sm">{plan.durationLabel}</h5>
                          <div className={`text-xs font-black mt-1 ${isSelected ? "text-amber-300" : "text-[#1A237E] dark:text-amber-400"}`}>
                            {plan.priceFCFA.toLocaleString("fr-FR")} F
                          </div>
                          <p className={`text-[9px] mt-0.5 leading-tight ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                            {plan.periodText}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-end">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                            isSelected ? "bg-amber-400 text-[#1A237E] border-amber-400" : "border-slate-300"
                          }`}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PAYMENT SECTION (WAVE & ORANGE MONEY) */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#1A237E] dark:text-amber-300 flex items-center space-x-1">
                    <CreditCard size={15} />
                    <span>Mode de Transfert Cashless :</span>
                  </span>
                  <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                    {currentPlan.priceFCFA.toLocaleString("fr-FR")} FCFA
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
                    <a
                      href="https://pay.wave.com/m/M_sn_yU5uzEBaEB9o/c/sn/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-[#1EA5FC] hover:bg-[#158ddb] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-center cursor-pointer"
                    >
                      <WaveLogo size={20} showLabel={false} />
                      <span>Payer {currentPlan.priceFCFA.toLocaleString("fr-FR")} FCFA sur Wave ➔</span>
                    </a>

                    <div className="bg-cyan-50/90 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 rounded-xl p-2.5 text-[11px] text-cyan-950 dark:text-cyan-200 space-y-1">
                      <p className="font-extrabold text-cyan-900 dark:text-cyan-300">
                        🌊 Instructions Wave Sénégal :
                      </p>
                      <p>1. Cliquez sur le bouton bleu ci-dessus pour transférer <strong>{currentPlan.priceFCFA.toLocaleString("fr-FR")} FCFA</strong> vers le <strong>78 376 95 84</strong>.</p>
                      <p>2. Cliquez ensuite sur <strong>« Activer Mon Pass VIP »</strong> ci-dessous. L'administrateur (Massaw Seck) approuvera l'accès en quelques instants.</p>
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
                        placeholder="Ex: OM-382910 ou MP240815.1923"
                        className="w-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-[#1A237E]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#1A237E] via-indigo-900 to-slate-900 hover:from-indigo-900 hover:to-[#1A237E] text-amber-300 font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 border border-amber-400"
                >
                  {isSubmitting ? (
                    <span>Transmission en cours...</span>
                  ) : (
                    <>
                      <Zap size={16} className="fill-amber-300" />
                      <span>Activer Mon Pass VIP ({currentPlan.priceFCFA.toLocaleString("fr-FR")} FCFA)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
