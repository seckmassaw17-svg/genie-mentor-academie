import React from "react";
import { Check, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { validatePasswordComplexity } from "../utils/passwordValidation";

interface PasswordValidationCardProps {
  password: string;
  className?: string;
  showAlways?: boolean;
}

export const PasswordValidationCard: React.FC<PasswordValidationCardProps> = ({
  password,
  className = "",
  showAlways = false,
}) => {
  if (!password && !showAlways) return null;

  const result = validatePasswordComplexity(password);
  const items = [
    { label: "Au moins 6 caractères", valid: result.hasMinLength },
    { label: "Une lettre majuscule (A-Z)", valid: result.hasUpper },
    { label: "Une lettre minuscule (a-z)", valid: result.hasLower },
    { label: "Au moins un chiffre (0-9)", valid: result.hasDigit },
  ];

  const validCount = items.filter((i) => i.valid).length;

  return (
    <div
      className={`mt-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 space-y-2 text-xs transition-all ${className}`}
    >
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1.5 font-extrabold text-slate-700 dark:text-slate-200">
          {result.isValid ? (
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ShieldAlert size={14} className="text-amber-500" />
          )}
          <span>Sécurité du mot de passe ({validCount}/4) :</span>
        </div>
        <span
          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            result.isValid
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
              : validCount >= 2
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
          }`}
        >
          {result.isValid ? "Conforme" : "Requis"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center space-x-1.5 text-[11px] font-medium transition-colors ${
              item.valid
                ? "text-emerald-700 dark:text-emerald-300"
                : password.length > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-all ${
                item.valid
                  ? "bg-emerald-500 text-white shadow-xs"
                  : password.length > 0
                  ? "bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-950 dark:text-rose-400"
                  : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {item.valid ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={2.5} />}
            </span>
            <span className={item.valid ? "font-semibold" : ""}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
