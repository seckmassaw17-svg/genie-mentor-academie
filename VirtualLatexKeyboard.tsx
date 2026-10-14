import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  Sparkles,
  X,
  ChevronDown,
  Keyboard,
  Delete,
  CornerDownLeft,
  Eye,
  Check,
  Smartphone,
  Maximize2,
  Minimize2
} from "lucide-react";
import { MathRenderer } from "./MathRenderer";

export interface LatexInputTarget {
  id?: string;
  name?: string;
  element: HTMLInputElement | HTMLTextAreaElement | null;
  value: string;
  onChange: (val: string) => void;
  title?: string;
}

interface VirtualLatexKeyboardContextType {
  activeTarget: LatexInputTarget | null;
  isKeyboardOpen: boolean;
  useVirtualKeyboardOnly: boolean;
  openKeyboardFor: (target: LatexInputTarget) => void;
  closeKeyboard: () => void;
  toggleVirtualKeyboardMode: () => void;
  registerFocus: (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement> | React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: string,
    onChange: (val: string) => void,
    title?: string
  ) => void;
  getInputProps: (
    value: string,
    onChange: (val: string) => void,
    title?: string,
    customProps?: React.InputHTMLAttributes<HTMLInputElement>
  ) => any;
  getTextareaProps: (
    value: string,
    onChange: (val: string) => void,
    title?: string,
    customProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>
  ) => any;
}

const VirtualLatexKeyboardContext = createContext<VirtualLatexKeyboardContextType | null>(null);

export const useVirtualLatexKeyboard = (): VirtualLatexKeyboardContextType => {
  const context = useContext(VirtualLatexKeyboardContext);
  if (!context) {
    return {
      activeTarget: null,
      isKeyboardOpen: false,
      useVirtualKeyboardOnly: false,
      openKeyboardFor: () => {},
      closeKeyboard: () => {},
      toggleVirtualKeyboardMode: () => {},
      registerFocus: () => {},
      getInputProps: (value, onChange, _title, customProps) => ({
        value,
        onChange: (e: any) => onChange(e.target.value),
        ...customProps,
      }),
      getTextareaProps: (value, onChange, _title, customProps) => ({
        value,
        onChange: (e: any) => onChange(e.target.value),
        ...customProps,
      }),
    };
  }
  return context;
};

// Common math snippets
const QUICK_SYMBOLS = [
  { label: "\\frac{a}{b}", code: "\\frac{a}{b}", display: "\\frac{a}{b}" },
  { label: "\\sqrt{x}", code: "\\sqrt{x}", display: "\\sqrt{x}" },
  { label: "x^2", code: "x^{2}", display: "x^2" },
  { label: "x^n", code: "x^{n}", display: "x^n" },
  { label: "\\vec{u}", code: "\\vec{u}", display: "\\vec{u}" },
  { label: "\\lim", code: "\\lim_{x \\to \\infty}", display: "\\lim" },
  { label: "\\int", code: "\\int_{a}^{b} f(x)\\,dx", display: "\\int" },
  { label: "\\pi", code: "\\pi", display: "\\pi" },
  { label: "\\alpha", code: "\\alpha", display: "\\alpha" },
  { label: "\\beta", code: "\\beta", display: "\\beta" },
  { label: "\\le", code: "\\le", display: "\\le" },
  { label: "\\ge", code: "\\ge", display: "\\ge" },
  { label: "\\neq", code: "\\neq", display: "\\neq" },
  { label: "\\pm", code: "\\pm", display: "\\pm" },
  { label: "\\times", code: "\\times", display: "\\times" },
];

const EXTENDED_CATEGORIES = {
  algebra: [
    { label: "Fraction", code: "\\frac{a}{b}", preview: "\\frac{a}{b}" },
    { label: "Racine carrée", code: "\\sqrt{x}", preview: "\\sqrt{x}" },
    { label: "Racine n-ième", code: "\\sqrt[n]{x}", preview: "\\sqrt[n]{x}" },
    { label: "Puissance", code: "x^{2}", preview: "x^{2}" },
    { label: "Puissance n", code: "x^{n}", preview: "x^{n}" },
    { label: "Indice", code: "x_{n}", preview: "x_{n}" },
    { label: "Parenthèses", code: "\\left( x \\right)", preview: "(x)" },
    { label: "Valeur absolue", code: "|x|", preview: "|x|" },
    { label: "Plus ou moins", code: "\\pm", preview: "\\pm" },
    { label: "Multiplication", code: "\\times", preview: "\\times" },
    { label: "Point produit", code: "\\cdot", preview: "\\cdot" },
    { label: "Système", code: "\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}", preview: "\\begin{cases} a \\\\ b \\end{cases}" },
  ],
  analysis: [
    { label: "Fonction f(x)", code: "f(x)", preview: "f(x)" },
    { label: "Limite infini", code: "\\lim_{x \\to +\\infty} f(x)", preview: "\\lim_{x \\to +\\infty}" },
    { label: "Limite en x0", code: "\\lim_{x \\to x_0} f(x)", preview: "\\lim_{x \\to x_0}" },
    { label: "Dérivée", code: "f'(x)", preview: "f'(x)" },
    { label: "Dérivée seconde", code: "f''(x)", preview: "f''(x)" },
    { label: "Intégrale définie", code: "\\int_{a}^{b} f(x)\\,dx", preview: "\\int_a^b" },
    { label: "Intégrale simple", code: "\\int f(x)\\,dx", preview: "\\int" },
    { label: "Somme", code: "\\sum_{i=1}^{n}", preview: "\\sum" },
    { label: "Vecteur u", code: "\\vec{u}", preview: "\\vec{u}" },
    { label: "Vecteur AB", code: "\\vec{AB}", preview: "\\vec{AB}" },
    { label: "Norme vecteur", code: "\\|\\vec{u}\\|", preview: "\\|\\vec{u}\\|" },
    { label: "Angle chapeau", code: "\\widehat{ABC}", preview: "\\widehat{ABC}" },
    { label: "Infini", code: "\\infty", preview: "\\infty" },
    { label: "Plus infini", code: "+\\infty", preview: "+\\infty" },
    { label: "Moins infini", code: "-\\infty", preview: "-\\infty" },
  ],
  relations: [
    { label: "Inférieur ou égal", code: "\\le", preview: "\\le" },
    { label: "Supérieur ou égal", code: "\\ge", preview: "\\ge" },
    { label: "Différent", code: "\\neq", preview: "\\neq" },
    { label: "Équivalent", code: "\\Leftrightarrow", preview: "\\Leftrightarrow" },
    { label: "Implique", code: "\\Rightarrow", preview: "\\Rightarrow" },
    { label: "Appartient", code: "\\in", preview: "\\in" },
    { label: "N'appartient pas", code: "\\notin", preview: "\\notin" },
    { label: "Inclus", code: "\\subset", preview: "\\subset" },
    { label: "Union", code: "\\cup", preview: "\\cup" },
    { label: "Intersection", code: "\\cap", preview: "\\cap" },
    { label: "Pour tout", code: "\\forall", preview: "\\forall" },
    { label: "Il existe", code: "\\exists", preview: "\\exists" },
    { label: "Approximatif", code: "\\approx", preview: "\\approx" },
  ],
  greek: [
    { label: "Delta (discriminant)", code: "\\Delta", preview: "\\Delta" },
    { label: "Alpha", code: "\\alpha", preview: "\\alpha" },
    { label: "Beta", code: "\\beta", preview: "\\beta" },
    { label: "Gamma", code: "\\gamma", preview: "\\gamma" },
    { label: "Thêta", code: "\\theta", preview: "\\theta" },
    { label: "Pi", code: "\\pi", preview: "\\pi" },
    { label: "Lambda", code: "\\lambda", preview: "\\lambda" },
    { label: "Sigma", code: "\\sigma", preview: "\\sigma" },
    { label: "Oméga", code: "\\omega", preview: "\\omega" },
    { label: "Grand Oméga", code: "\\Omega", preview: "\\Omega" },
    { label: "Réels R", code: "\\mathbb{R}", preview: "\\mathbb{R}" },
    { label: "Entiers N", code: "\\mathbb{N}", preview: "\\mathbb{N}" },
    { label: "Relatifs Z", code: "\\mathbb{Z}", preview: "\\mathbb{Z}" },
    { label: "Rationnels Q", code: "\\mathbb{Q}", preview: "\\mathbb{Q}" },
    { label: "Complexes C", code: "\\mathbb{C}", preview: "\\mathbb{C}" },
  ],
  pad: [
    { label: "7", code: "7" },
    { label: "8", code: "8" },
    { label: "9", code: "9" },
    { label: "+", code: "+" },
    { label: "x", code: "x" },
    { label: "4", code: "4" },
    { label: "5", code: "5" },
    { label: "6", code: "6" },
    { label: "-", code: "-" },
    { label: "y", code: "y" },
    { label: "1", code: "1" },
    { label: "2", code: "2" },
    { label: "3", code: "3" },
    { label: "=", code: "=" },
    { label: "n", code: "n" },
    { label: "0", code: "0" },
    { label: ",", code: "," },
    { label: ".", code: "." },
    { label: "/", code: "/" },
    { label: "t", code: "t" },
  ],
};

export const VirtualLatexKeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTarget, setActiveTarget] = useState<LatexInputTarget | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const [useVirtualKeyboardOnly, setUseVirtualKeyboardOnly] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"quick" | "algebra" | "analysis" | "relations" | "greek" | "pad">("quick");
  const [autoWrapMath, setAutoWrapMath] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const openKeyboardFor = (target: LatexInputTarget) => {
    setActiveTarget(target);
    setIsKeyboardOpen(true);
    setIsMinimized(false);

    // Auto-scroll the focused element into the center of the viewport smoothly
    if (target.element) {
      setTimeout(() => {
        try {
          target.element?.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {
          // Fallback
        }
      }, 100);
    }
  };

  const closeKeyboard = () => {
    setIsKeyboardOpen(false);
  };

  const toggleVirtualKeyboardMode = () => {
    setUseVirtualKeyboardOnly((prev) => !prev);
  };

  const registerFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement> | React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: string,
    onChange: (val: string) => void,
    title?: string
  ) => {
    const el = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    openKeyboardFor({
      element: el,
      value,
      onChange,
      title: title || el.getAttribute("placeholder") || "Champ actif",
    });
  };

  const getInputProps = (
    value: string,
    onChange: (val: string) => void,
    title?: string,
    customProps?: React.InputHTMLAttributes<HTMLInputElement>
  ) => {
    return {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        registerFocus(e, value, onChange, title);
        if (customProps?.onFocus) customProps.onFocus(e);
      },
      onClick: (e: React.MouseEvent<HTMLInputElement>) => {
        registerFocus(e, value, onChange, title);
        if (customProps?.onClick) customProps.onClick(e);
      },
      // Anti-duplication on smartphones
      autoCorrect: "off",
      autoCapitalize: "none",
      spellCheck: false,
      autoComplete: "off",
      // Prevent native keyboard popup when virtual LaTeX keyboard is selected
      inputMode: useVirtualKeyboardOnly ? ("none" as const) : undefined,
      ...customProps,
    };
  };

  const getTextareaProps = (
    value: string,
    onChange: (val: string) => void,
    title?: string,
    customProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>
  ) => {
    return {
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
      onFocus: (e: React.FocusEvent<HTMLTextAreaElement>) => {
        registerFocus(e, value, onChange, title);
        if (customProps?.onFocus) customProps.onFocus(e);
      },
      onClick: (e: React.MouseEvent<HTMLTextAreaElement>) => {
        registerFocus(e, value, onChange, title);
        if (customProps?.onClick) customProps.onClick(e);
      },
      // Anti-duplication on smartphones
      autoCorrect: "off",
      autoCapitalize: "none",
      spellCheck: false,
      autoComplete: "off",
      // Prevent native keyboard popup when virtual LaTeX keyboard is selected
      inputMode: useVirtualKeyboardOnly ? ("none" as const) : undefined,
      ...customProps,
    };
  };

  // Insert code at current cursor position
  const handleInsert = (snippet: string) => {
    if (!activeTarget) return;

    const el = activeTarget.element;
    const currentVal = activeTarget.value || "";
    const codeToInsert = autoWrapMath && !snippet.startsWith("$") && !/^[0-9+\-=,\./xyn]$/.test(snippet)
      ? `$${snippet}$`
      : snippet;

    let newVal = "";
    let newCursorPos = 0;

    if (el) {
      const start = el.selectionStart ?? currentVal.length;
      const end = el.selectionEnd ?? currentVal.length;

      const before = currentVal.substring(0, start);
      const after = currentVal.substring(end);

      // Add neat spacing if needed around math tags
      const needsLeadingSpace = before.length > 0 && !before.endsWith(" ") && !before.endsWith("$") && codeToInsert.startsWith("$");
      const needsTrailingSpace = after.length > 0 && !after.startsWith(" ") && !after.startsWith("$") && codeToInsert.endsWith("$");

      const insertStr = (needsLeadingSpace ? " " : "") + codeToInsert + (needsTrailingSpace ? " " : "");
      newVal = before + insertStr + after;
      newCursorPos = start + insertStr.length;

      activeTarget.onChange(newVal);
      setActiveTarget({ ...activeTarget, value: newVal });

      // Restore focus and cursor location
      requestAnimationFrame(() => {
        if (el) {
          el.focus();
          el.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    } else {
      newVal = currentVal + (currentVal.length > 0 ? " " : "") + codeToInsert;
      activeTarget.onChange(newVal);
      setActiveTarget({ ...activeTarget, value: newVal });
    }
  };

  // Backspace at cursor position
  const handleBackspace = () => {
    if (!activeTarget) return;
    const el = activeTarget.element;
    const currentVal = activeTarget.value || "";

    if (el) {
      const start = el.selectionStart ?? currentVal.length;
      const end = el.selectionEnd ?? currentVal.length;

      if (start === 0 && end === 0) return;

      let newVal = "";
      let newCursorPos = start;

      if (start !== end) {
        newVal = currentVal.substring(0, start) + currentVal.substring(end);
        newCursorPos = start;
      } else {
        newVal = currentVal.substring(0, start - 1) + currentVal.substring(start);
        newCursorPos = start - 1;
      }

      activeTarget.onChange(newVal);
      setActiveTarget({ ...activeTarget, value: newVal });

      requestAnimationFrame(() => {
        if (el) {
          el.focus();
          el.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    } else {
      const newVal = currentVal.slice(0, -1);
      activeTarget.onChange(newVal);
      setActiveTarget({ ...activeTarget, value: newVal });
    }
  };

  // Insert space
  const handleSpace = () => {
    handleInsert(" ");
  };

  return (
    <VirtualLatexKeyboardContext.Provider
      value={{
        activeTarget,
        isKeyboardOpen,
        useVirtualKeyboardOnly,
        openKeyboardFor,
        closeKeyboard,
        toggleVirtualKeyboardMode,
        registerFocus,
        getInputProps,
        getTextareaProps,
      }}
    >
      {children}

      {/* Floating / Bottom-Docked Virtual LaTeX Keyboard */}
      {isKeyboardOpen && activeTarget && (
        <div className="fixed bottom-0 inset-x-0 z-[9999] w-full max-w-lg mx-auto bg-slate-900 border-t-2 border-indigo-500/80 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] text-white rounded-t-3xl animate-in slide-in-from-bottom-5 duration-200 select-none pb-safe">
          {/* Header Bar */}
          <div className="bg-slate-950/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="w-5 h-5 rounded-md bg-amber-400 text-[#1A237E] font-serif italic font-black text-xs flex items-center justify-center shrink-0">
                fx
              </span>
              <div className="flex items-center space-x-1.5 truncate">
                <span className="font-bold text-amber-300 text-[11px] truncate">
                  🎯 {activeTarget.title || "Champ de formule LaTeX"}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Toggle Math Delimiters */}
              <label className="flex items-center space-x-1 text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 cursor-pointer text-slate-300 font-bold">
                <input
                  type="checkbox"
                  checked={autoWrapMath}
                  onChange={(e) => setAutoWrapMath(e.target.checked)}
                  className="rounded text-[#1A237E] w-3 h-3"
                />
                <span>$..$</span>
              </label>

              {/* Toggle Virtual vs Native Keyboard */}
              <button
                type="button"
                onClick={toggleVirtualKeyboardMode}
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                  useVirtualKeyboardOnly
                    ? "bg-indigo-950 text-indigo-300 border-indigo-700"
                    : "bg-emerald-950 text-emerald-300 border-emerald-700"
                }`}
                title={
                  useVirtualKeyboardOnly
                    ? "Mode Clavier Virtuel LaTeX exclusif (clavier téléphone masqué)"
                    : "Mode Clavier Natif téléphone activé"
                }
              >
                <Smartphone size={11} />
                <span>{useVirtualKeyboardOnly ? "LaTeX seul" : "Clavier Natif"}</span>
              </button>

              {/* Minimize / Maximize */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                title={isMinimized ? "Agrandir" : "Réduire"}
              >
                {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeKeyboard}
                className="p-1 hover:bg-rose-950 rounded-lg text-rose-400 hover:text-rose-200 cursor-pointer"
                title="Fermer le clavier"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="p-2 space-y-2">
              {/* Row 1: Frequent Quick LaTeX Symbols (Always accessible at a touch) */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-indigo-600">
                {QUICK_SYMBOLS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInsert(s.code)}
                    className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-indigo-700 active:scale-95 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 shadow-xs cursor-pointer flex items-center justify-center min-w-[42px] transition-all"
                  >
                    <MathRenderer content={`$${s.display}$`} />
                  </button>
                ))}
              </div>

              {/* Category Selector Tabs */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-bold border-b border-slate-800 pb-1.5">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("quick")}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      activeTab === "quick" ? "bg-indigo-600 text-white font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    🚀 Essentiels
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("algebra")}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      activeTab === "algebra" ? "bg-indigo-600 text-white font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    √ Fractions & Racines
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("analysis")}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      activeTab === "analysis" ? "bg-indigo-600 text-white font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    ∫ Analyse & Vecteurs
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("relations")}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      activeTab === "relations" ? "bg-indigo-600 text-white font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    ≤ Relations
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("greek")}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      activeTab === "greek" ? "bg-indigo-600 text-white font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    α Grec & Ensembles
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pad")}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      activeTab === "pad" ? "bg-indigo-600 text-white font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    🔢 Clavier Chiffres & Variables
                  </button>
                </div>

                {/* Backspace & Spacebar */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleSpace}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 flex items-center space-x-1"
                    title="Insérer un espace"
                  >
                    <span>␣ Espace</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 active:bg-rose-700 text-rose-100 text-[10px] font-black rounded-lg border border-rose-700 flex items-center space-x-1"
                    title="Effacer (Backspace)"
                  >
                    <Delete size={12} />
                    <span>Effacer</span>
                  </button>
                </div>
              </div>

              {/* Grid of keys based on selected activeTab */}
              <div className="max-h-36 overflow-y-auto pr-1">
                {activeTab === "quick" && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                    {QUICK_SYMBOLS.concat([
                      { label: "x_n", code: "x_{n}", display: "x_n" },
                      { label: "\\sqrt[n]{x}", code: "\\sqrt[n]{x}", display: "\\sqrt[n]{x}" },
                      { label: "\\vec{AB}", code: "\\vec{AB}", display: "\\vec{AB}" },
                      { label: "\\Delta", code: "\\Delta", display: "\\Delta" },
                      { label: "\\Leftrightarrow", code: "\\Leftrightarrow", display: "\\Leftrightarrow" },
                      { label: "\\Rightarrow", code: "\\Rightarrow", display: "\\Rightarrow" },
                      { label: "\\in", code: "\\in", display: "\\in" },
                      { label: "\\mathbb{R}", code: "\\mathbb{R}", display: "\\mathbb{R}" },
                    ]).map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsert(item.code)}
                        className="p-2 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-xs flex flex-col items-center justify-center transition-all min-h-[38px]"
                      >
                        <MathRenderer content={`$${item.display}$`} />
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "algebra" && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                    {EXTENDED_CATEGORIES.algebra.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsert(item.code)}
                        className="p-2 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white rounded-xl border border-slate-700 flex flex-col items-center justify-center space-y-1 transition-all"
                      >
                        <div className="text-amber-300 font-bold text-xs">
                          <MathRenderer content={`$${item.preview}$`} />
                        </div>
                        <span className="text-[9px] text-slate-400 truncate max-w-full">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "analysis" && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                    {EXTENDED_CATEGORIES.analysis.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsert(item.code)}
                        className="p-2 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white rounded-xl border border-slate-700 flex flex-col items-center justify-center space-y-1 transition-all"
                      >
                        <div className="text-amber-300 font-bold text-xs">
                          <MathRenderer content={`$${item.preview}$`} />
                        </div>
                        <span className="text-[9px] text-slate-400 truncate max-w-full">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "relations" && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                    {EXTENDED_CATEGORIES.relations.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsert(item.code)}
                        className="p-2 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white rounded-xl border border-slate-700 flex flex-col items-center justify-center space-y-1 transition-all"
                      >
                        <div className="text-amber-300 font-bold text-xs">
                          <MathRenderer content={`$${item.preview}$`} />
                        </div>
                        <span className="text-[9px] text-slate-400 truncate max-w-full">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "greek" && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-1.5">
                    {EXTENDED_CATEGORIES.greek.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsert(item.code)}
                        className="p-2 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white rounded-xl border border-slate-700 flex flex-col items-center justify-center space-y-1 transition-all"
                      >
                        <div className="text-amber-300 font-bold text-xs">
                          <MathRenderer content={`$${item.preview}$`} />
                        </div>
                        <span className="text-[9px] text-slate-400 truncate max-w-full">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "pad" && (
                  <div className="grid grid-cols-5 gap-1.5 max-w-md mx-auto">
                    {EXTENDED_CATEGORIES.pad.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsert(item.code)}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white font-black text-sm rounded-xl border border-slate-700 text-center shadow-xs transition-all"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </VirtualLatexKeyboardContext.Provider>
  );
};
