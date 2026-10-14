import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Check, Eye, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { MathRenderer } from "./MathRenderer";

export interface LatexToolbarProps {
  onInsert: (latexCode: string) => void;
  targetInputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  className?: string;
  buttonSize?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

interface LatexSnippet {
  label: string;
  snippet: string;
  preview: string;
  category: "algebra" | "analysis" | "symbols" | "greek" | "sets";
}

const LATEX_SHORTCUTS: LatexSnippet[] = [
  // Algèbre & Bases
  { label: "Fraction", snippet: "\\frac{a}{b}", preview: "\\frac{a}{b}", category: "algebra" },
  { label: "Racine carrée", snippet: "\\sqrt{x}", preview: "\\sqrt{x}", category: "algebra" },
  { label: "Racine n-ième", snippet: "\\sqrt[n]{x}", preview: "\\sqrt[n]{x}", category: "algebra" },
  { label: "Puissance", snippet: "x^{2}", preview: "x^{2}", category: "algebra" },
  { label: "Indice", snippet: "x_{n}", preview: "x_{n}", category: "algebra" },
  { label: "Plus ou moins", snippet: "\\pm", preview: "\\pm", category: "algebra" },
  { label: "Parenthèses", snippet: "\\left( x \\right)", preview: "\\left( x \\right)", category: "algebra" },
  { label: "Valeur absolue", snippet: "|x|", preview: "|x|", category: "algebra" },
  { label: "Multiplier", snippet: "\\times", preview: "\\times", category: "algebra" },
  { label: "Produit scalaire", snippet: "\\cdot", preview: "\\cdot", category: "algebra" },

  // Analyse & Géométrie
  { label: "Fonction f(x)", snippet: "f(x) = ", preview: "f(x)", category: "analysis" },
  { label: "Limite", snippet: "\\lim_{x \\to x_0} f(x)", preview: "\\lim_{x \\to x_0}", category: "analysis" },
  { label: "Dérivée", snippet: "f'(x)", preview: "f'(x)", category: "analysis" },
  { label: "Intégrale", snippet: "\\int_{a}^{b} f(x)\\,dx", preview: "\\int_{a}^{b}", category: "analysis" },
  { label: "Somme", snippet: "\\sum_{i=1}^{n} x_i", preview: "\\sum_{i=1}^{n}", category: "analysis" },
  { label: "Vecteur u", snippet: "\\vec{u}", preview: "\\vec{u}", category: "analysis" },
  { label: "Vecteur AB", snippet: "\\vec{AB}", preview: "\\vec{AB}", category: "analysis" },
  { label: "Norme vecteur", snippet: "\\|\\vec{u}\\|", preview: "\\|\\vec{u}\\|", category: "analysis" },
  { label: "Angle chapeau", snippet: "\\widehat{ABC}", preview: "\\widehat{ABC}", category: "analysis" },
  { label: "Infini", snippet: "\\infty", preview: "\\infty", category: "analysis" },

  // Relations & Symboles
  { label: "Inférieur ou égal", snippet: "\\le", preview: "\\le", category: "symbols" },
  { label: "Supérieur ou égal", snippet: "\\ge", preview: "\\ge", category: "symbols" },
  { label: "Différent", snippet: "\\neq", preview: "\\neq", category: "symbols" },
  { label: "Approximatif", snippet: "\\approx", preview: "\\approx", category: "symbols" },
  { label: "Appartient", snippet: "\\in", preview: "\\in", category: "symbols" },
  { label: "N'appartient pas", snippet: "\\notin", preview: "\\notin", category: "symbols" },
  { label: "Inclus dans", snippet: "\\subset", preview: "\\subset", category: "symbols" },
  { label: "Union", snippet: "\\cup", preview: "\\cup", category: "symbols" },
  { label: "Intersection", snippet: "\\cap", preview: "\\cap", category: "symbols" },
  { label: "Implique", snippet: "\\Rightarrow", preview: "\\Rightarrow", category: "symbols" },
  { label: "Équivalent", snippet: "\\Leftrightarrow", preview: "\\Leftrightarrow", category: "symbols" },
  { label: "Pour tout (quel que soit)", snippet: "\\forall", preview: "\\forall", category: "symbols" },
  { label: "Il existe", snippet: "\\exists", preview: "\\exists", category: "symbols" },

  // Lettres Grecques & Constantes
  { label: "Delta (discriminant)", snippet: "\\Delta", preview: "\\Delta", category: "greek" },
  { label: "Alpha", snippet: "\\alpha", preview: "\\alpha", category: "greek" },
  { label: "Beta", snippet: "\\beta", preview: "\\beta", category: "greek" },
  { label: "Gamma", snippet: "\\gamma", preview: "\\gamma", category: "greek" },
  { label: "Thêta (angle)", snippet: "\\theta", preview: "\\theta", category: "greek" },
  { label: "Pi", snippet: "\\pi", preview: "\\pi", category: "greek" },
  { label: "Lambda", snippet: "\\lambda", preview: "\\lambda", category: "greek" },
  { label: "Sigma (somme/écart)", snippet: "\\sigma", preview: "\\sigma", category: "greek" },
  { label: "Oméga", snippet: "\\omega", preview: "\\omega", category: "greek" },
  { label: "Grand Oméga", snippet: "\\Omega", preview: "\\Omega", category: "greek" },

  // Ensembles de Nombres
  { label: "Réels (R)", snippet: "\\mathbb{R}", preview: "\\mathbb{R}", category: "sets" },
  { label: "Entiers naturels (N)", snippet: "\\mathbb{N}", preview: "\\mathbb{N}", category: "sets" },
  { label: "Entiers relatifs (Z)", snippet: "\\mathbb{Z}", preview: "\\mathbb{Z}", category: "sets" },
  { label: "Décimaux (D)", snippet: "\\mathbb{D}", preview: "\\mathbb{D}", category: "sets" },
  { label: "Rationnels (Q)", snippet: "\\mathbb{Q}", preview: "\\mathbb{Q}", category: "sets" },
  { label: "Complexes (C)", snippet: "\\mathbb{C}", preview: "\\mathbb{C}", category: "sets" },
];

export const LatexToolbar: React.FC<LatexToolbarProps> = ({
  onInsert,
  targetInputRef,
  className = "",
  buttonSize = "xs",
  showLabel = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"algebra" | "analysis" | "symbols" | "greek" | "sets">("algebra");
  const [wrapInMathDelimiters, setWrapInMathDelimiters] = useState(true);
  const [previewFormula, setPreviewFormula] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSnippetClick = (snippet: string) => {
    const codeToInsert = wrapInMathDelimiters ? `$${snippet}$` : snippet;

    if (targetInputRef?.current) {
      const el = targetInputRef.current;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const currentVal = el.value || "";
      
      const before = currentVal.substring(0, start);
      const after = currentVal.substring(end);
      const newVal = before + (before.length > 0 && !before.endsWith(" ") ? " " : "") + codeToInsert + (after.length > 0 && !after.startsWith(" ") ? " " : "") + after;
      
      // Trigger input change
      onInsert(newVal);
      
      // Re-focus and update cursor
      setTimeout(() => {
        el.focus();
        const newCursorPos = start + codeToInsert.length + (before.length > 0 && !before.endsWith(" ") ? 1 : 0);
        el.setSelectionRange(newCursorPos, newCursorPos);
      }, 50);
    } else {
      onInsert(codeToInsert);
    }
  };

  const filteredShortcuts = LATEX_SHORTCUTS.filter((s) => s.category === activeCategory);

  return (
    <div className={`relative inline-block ${className}`} ref={toolbarRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center space-x-1 font-bold rounded-lg transition-all cursor-pointer border ${
          isOpen
            ? "bg-[#1A237E] text-amber-300 border-amber-400 shadow-xs"
            : "bg-indigo-50 hover:bg-indigo-100 text-[#1A237E] border-indigo-200 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700"
        } ${
          buttonSize === "xs"
            ? "px-2 py-0.5 text-[10px]"
            : buttonSize === "sm"
            ? "px-2.5 py-1 text-xs"
            : "px-3 py-1.5 text-xs"
        }`}
        title="Ouvrir le Clavier Mathématique LaTeX (Formules & Symboles)"
      >
        <span className="font-serif italic font-black text-xs text-amber-500">fx</span>
        {showLabel && <span className="font-sans font-bold">LaTeX</span>}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Floating Toolbar Popup / Mobile Bottom Docked Drawer */}
      {isOpen && (
        <div className="fixed sm:absolute bottom-0 sm:bottom-auto sm:top-full inset-x-0 sm:inset-x-auto sm:left-0 sm:mt-1.5 z-[9999] w-full max-w-md mx-auto sm:w-84 bg-slate-900 border-t-2 sm:border-2 border-indigo-500 rounded-t-3xl sm:rounded-2xl shadow-2xl p-3.5 space-y-2.5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 text-xs text-white pb-safe">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-md bg-amber-400 text-[#1A237E] flex items-center justify-center font-black font-serif italic text-xs">
                fx
              </span>
              <h5 className="font-black text-slate-900 dark:text-white text-xs">
                Assistant & Clavier LaTeX
              </h5>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1 text-[10px] text-slate-600 dark:text-slate-300 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={wrapInMathDelimiters}
                  onChange={(e) => setWrapInMathDelimiters(e.target.checked)}
                  className="rounded text-[#1A237E] w-3.5 h-3.5"
                />
                <span>Balises $...$</span>
              </label>
              
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveCategory("algebra")}
              className={`py-1 rounded-lg text-center transition-colors truncate cursor-pointer ${
                activeCategory === "algebra"
                  ? "bg-[#1A237E] text-amber-300 font-black shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              Algèbre
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("analysis")}
              className={`py-1 rounded-lg text-center transition-colors truncate cursor-pointer ${
                activeCategory === "analysis"
                  ? "bg-[#1A237E] text-amber-300 font-black shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              Analyse
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("symbols")}
              className={`py-1 rounded-lg text-center transition-colors truncate cursor-pointer ${
                activeCategory === "symbols"
                  ? "bg-[#1A237E] text-amber-300 font-black shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              Symboles
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("greek")}
              className={`py-1 rounded-lg text-center transition-colors truncate cursor-pointer ${
                activeCategory === "greek"
                  ? "bg-[#1A237E] text-amber-300 font-black shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              Grec
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("sets")}
              className={`py-1 rounded-lg text-center transition-colors truncate cursor-pointer ${
                activeCategory === "sets"
                  ? "bg-[#1A237E] text-amber-300 font-black shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              Ensembles
            </button>
          </div>

          {/* Key Buttons Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredShortcuts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSnippetClick(item.snippet)}
                onMouseEnter={() => setPreviewFormula(`$${item.preview}$`)}
                onMouseLeave={() => setPreviewFormula(null)}
                className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 border border-slate-200 dark:border-slate-700 hover:border-[#1A237E] dark:hover:border-amber-400 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer group shadow-2xs"
                title={item.label}
              >
                <div className="text-slate-900 dark:text-white font-medium text-center pointer-events-none group-hover:scale-105 transition-transform">
                  <MathRenderer content={`$${item.preview}$`} />
                </div>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-full font-bold">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Live Preview of Hovered Formula */}
          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-bold text-[10px]">Aperçu :</span>
            <div className="font-bold text-[#1A237E] dark:text-amber-300">
              {previewFormula ? (
                <MathRenderer content={previewFormula} />
              ) : (
                <span className="text-slate-400 text-[10px] italic">Cliquez sur un bouton pour insérer</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
