import React, { useState, useEffect } from "react";
import {
  PricingConfig,
  getStoredPricingConfig,
  saveStoredPricingConfig,
  DEFAULT_PRICING_CONFIG,
} from "../data/pricingConfig";
import { ALL_LEVELS } from "../data/mockData";
import {
  Coins,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Phone,
  CreditCard,
  Crown,
} from "lucide-react";

export const AdminPricingManagement: React.FC = () => {
  const [config, setConfig] = useState<PricingConfig>(() => getStoredPricingConfig());
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const relevantLevels = ALL_LEVELS.filter(
    (lvl) =>
      lvl !== "Savoir+" &&
      lvl !== "GMA" &&
      lvl !== "Génie Mentor Académie" &&
      lvl !== "Concours" &&
      lvl !== "Examens" &&
      lvl !== "Exercices Avancés"
  );

  const handleInscriptionChange = (level: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      inscriptionFees: {
        ...prev.inscriptionFees,
        [level]: value,
      },
    }));
  };

  const handleMonthlyChange = (level: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      monthlyFees: {
        ...prev.monthlyFees,
        [level]: value,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      saveStoredPricingConfig(config);
      setSuccessMsg("Grille tarifaire (Inscriptions et Mensualités) mise à jour avec succès ! Tous les formulaires élèves appliquent désormais ces montants.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Error saving pricing config:", err);
      setErrorMsg("Impossible d'enregistrer la configuration tarifaire.");
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Voulez-vous réinitialiser tous les tarifs aux valeurs officielles par défaut (Terminale S : 10 000F, Terminale L : 7 000F, etc.) ?")) {
      setConfig(DEFAULT_PRICING_CONFIG);
      saveStoredPricingConfig(DEFAULT_PRICING_CONFIG);
      setSuccessMsg("Tarifs réinitialisés aux valeurs standards.");
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  return (
    <div className="space-y-6 text-xs animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#1A237E] via-indigo-900 to-slate-900 border border-amber-400 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-400 text-[#1A237E] rounded-xl font-black shadow">
              <Coins size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Configuration des Tarifs & Frais Scolaires
              </h3>
              <p className="text-xs text-amber-300 font-bold">
                Personnalisation des Inscriptions et Mensualités par Classe
              </p>
            </div>
          </div>
          <p className="text-[11px] text-indigo-200 pt-1">
            Définissez librement les montants exacts des droits d'inscription et des mensualités. Vos modifications s'appliquent en direct sur toute l'application.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Tarifs par défaut</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl font-bold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl font-bold flex items-center space-x-2">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Paramètres de Paiement & Contact Officiel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-[#1A237E] dark:text-amber-400 flex items-center space-x-2">
            <CreditCard size={18} />
            <span>Coordonnées de Réception des Paiements</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                Lien de Paiement Marchand Wave (URL directe) :
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  required
                  value={config.wavePaymentUrl}
                  onChange={(e) => setConfig({ ...config, wavePaymentUrl: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
                <a
                  href={config.wavePaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-cyan-100 text-cyan-800 rounded-xl hover:bg-cyan-200 shrink-0"
                  title="Tester le lien Wave"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Redirige les élèves directement vers leur compte Wave pour validation.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                Numéro Orange Money & Contact Officiel (Une seule ligne) :
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  required
                  value={config.officialPhone}
                  onChange={(e) => setConfig({ ...config, officialPhone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
                <div className="p-2 bg-orange-100 text-orange-800 rounded-xl shrink-0">
                  <Phone size={16} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Affiché sur les reçus, formulaires et instructions sans coupure de ligne.
              </p>
            </div>
          </div>
        </div>

        {/* Grille Inscription & Mensualités par Classe */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Coins size={18} className="text-amber-500" />
                <span>Grille des Tarifs par Classe (FCFA)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Ajustez les montants de l'inscription et des cours du soir / renforcement.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-[#1A237E] dark:text-amber-300 font-black text-[11px] rounded-full border border-amber-300">
              Terminale S : {config.inscriptionFees["Terminale S1"] || 10000} F • Terminale L : {config.inscriptionFees["Terminale L1"] || 7000} F
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-extrabold text-[11px]">
                  <th className="py-2.5 px-3 rounded-l-xl">Niveau / Classe</th>
                  <th className="py-2.5 px-3">Frais d'Inscription (FCFA)</th>
                  <th className="py-2.5 px-3 rounded-r-xl">Mensualité Cours (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {relevantLevels.map((lvl) => {
                  const insFee =
                    config.inscriptionFees[lvl] !== undefined
                      ? config.inscriptionFees[lvl]
                      : lvl.includes("Terminale S")
                      ? 10000
                      : lvl.includes("Terminale L")
                      ? 7000
                      : 5000;

                  const monFee =
                    config.monthlyFees[lvl] !== undefined
                      ? config.monthlyFees[lvl]
                      : lvl === "6ème" || lvl === "5ème"
                      ? 4000
                      : lvl.includes("Terminale S")
                      ? 7000
                      : lvl.includes("Terminale L")
                      ? 6000
                      : 5000;

                  const isTerminalS = lvl.includes("Terminale S");
                  const isTerminalL = lvl.includes("Terminale L");

                  return (
                    <tr
                      key={lvl}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isTerminalS
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                          : isTerminalL
                          ? "bg-amber-50/40 dark:bg-amber-950/20"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <span>{lvl}</span>
                          {isTerminalS && (
                            <span className="px-1.5 py-0.5 bg-[#1A237E] text-white text-[9px] font-black rounded">
                              Bac S
                            </span>
                          )}
                          {isTerminalL && (
                            <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded">
                              Bac L
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1 max-w-[180px]">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={insFee}
                            onChange={(e) =>
                              handleInscriptionChange(lvl, parseInt(e.target.value) || 0)
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#1A237E] dark:text-amber-300"
                          />
                          <span className="text-slate-400 text-[10px] font-bold">F</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1 max-w-[180px]">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={monFee}
                            onChange={(e) =>
                              handleMonthlyChange(lvl, parseInt(e.target.value) || 0)
                            }
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                          />
                          <span className="text-slate-400 text-[10px] font-bold">F</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bouton de Sauvegarde */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-[#1A237E] hover:bg-indigo-900 text-amber-300 font-black text-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center space-x-2 border border-amber-400/40"
          >
            <Save size={18} />
            <span>Enregistrer Tous les Tarifs & Paramètres</span>
          </button>
        </div>
      </form>
    </div>
  );
};
