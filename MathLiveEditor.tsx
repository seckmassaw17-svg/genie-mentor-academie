import React, { useEffect, useRef, useState } from "react";
import "mathlive";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem";
import { MathRenderer, KATEX_MACROS, normalizeLatex } from "./MathRenderer";
import {
  Sparkles,
  FlaskConical,
  Keyboard,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  PlusCircle,
  FileText,
} from "lucide-react";

// TypeScript declarations for math-field custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": any;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": any;
    }
  }
}

export type MathCategory = "general" | "analyse" | "geometrie" | "chimie" | "physique" | "grec";

export interface MathLiveEditorProps {
  value: string;
  onChange: (latex: string) => void;
  onInsert?: (snippet: string) => void;
  onInsertToContent?: (formula: string, displayMode?: "inline" | "block") => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  className?: string;
  showPreview?: boolean;
  allowCodeToggle?: boolean;
}

export const MathLiveEditor: React.FC<MathLiveEditorProps> = ({
  value,
  onChange,
  onInsert,
  onInsertToContent,
  label,
  placeholder = "Saisissez ou construisez votre formule visuelle...",
  helperText,
  className = "",
  showPreview = true,
}) => {
  const mfRef = useRef<HTMLElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<MathCategory>("general");
  const [showLivePreview, setShowLivePreview] = useState(showPreview);
  const [copied, setCopied] = useState(false);

  // Synchronize external value changes to math-field without disturbing cursor
  useEffect(() => {
    const mf = mfRef.current as any;
    if (mf && mf.value !== value) {
      mf.value = value || "";
    }
  }, [value]);

  // Setup input event listener on <math-field>
  useEffect(() => {
    const mf = mfRef.current as any;
    if (!mf) return;

    const handleInput = () => {
      const latex = mf.value || "";
      onChange(latex);
    };

    mf.addEventListener("input", handleInput);
    return () => {
      mf.removeEventListener("input", handleInput);
    };
  }, [onChange]);

  // Helper to render KaTeX formula visually on buttons without raw code
  const renderVisualButton = (btn: { label: string; snippet: string; renderLatex?: string; renderHtml?: React.ReactNode; btnType?: string }) => {
    if (btn.renderHtml) {
      return (
        <span className="inline-flex items-center justify-center pointer-events-none text-xs sm:text-sm font-semibold select-none leading-none">
          {btn.renderHtml}
        </span>
      );
    }
    const rawLatex = btn.renderLatex || btn.snippet;
    try {
      const clean = normalizeLatex(rawLatex)
        .replace(/\{#\?\}/g, "{x}")
        .replace(/#\?/g, "x");
      const html = katex.renderToString(clean, {
        displayMode: false,
        throwOnError: false,
        output: "htmlAndMathml",
        macros: KATEX_MACROS,
      });

      // If KaTeX generated a katex-error, fall back to clean text instead of showing red error
      if (html.includes("katex-error")) {
        return <span className="font-bold text-xs font-mono">{btn.label.split(" ")[0]}</span>;
      }

      return (
        <span
          dangerouslySetInnerHTML={{ __html: html }}
          className="inline-flex items-center justify-center pointer-events-none text-xs sm:text-sm font-normal select-none"
        />
      );
    } catch {
      return <span className="font-semibold text-xs">{btn.label.split(" ")[0]}</span>;
    }
  };

  // Insert command into MathLive field with smart nesting and placeholder substitution
  const handleInsert = (snippet: string, btnType?: string) => {
    const mf = mfRef.current as any;
    if (mf) {
      try {
        mf.focus?.();
        let toInsert = snippet;
        const hasSelection = mf.selection && !mf.selectionIsCollapsed;

        // If user already selected an expression, wrap it cleanly
        if (hasSelection) {
          const sel = mf.getValue?.(mf.selection) || "";
          if (btnType === "power2") toInsert = `{${sel}}^{2}`;
          else if (btnType === "powerN") toInsert = `{${sel}}^{#?}`;
          else if (btnType === "subN") toInsert = `{${sel}}_{#?}`;
          else if (btnType === "sub0") toInsert = `{${sel}}_{0}`;
          else if (btnType === "sqrt") toInsert = `\\sqrt{${sel}}`;
          else if (btnType === "nthroot") toInsert = `\\sqrt[#?]{${sel}}`;
          else if (btnType === "frac") toInsert = `\\frac{${sel}}{#?}`;
          else if (btnType === "abs") toInsert = `|${sel}|`;
          else if (btnType === "paren") toInsert = `\\left(${sel}\\right)`;
          else if (btnType === "brackets") toInsert = `\\left[${sel}\\right]`;
          else if (btnType === "vec") toInsert = `\\vec{${sel}}`;
        } else {
          toInsert = snippet;
        }

        if (typeof mf.insert === "function") {
          mf.insert(toInsert, {
            mode: "math",
            format: "latex",
            selectionMode: "placeholder",
            focus: true,
          });
        } else if (typeof mf.executeCommand === "function") {
          mf.executeCommand(["insert", toInsert]);
          mf.focus?.();
        }

        const newVal = mf.value || "";
        onChange(newVal);
      } catch (err) {
        console.warn("MathLive insert error:", err);
        const newVal = (value ? value + " " : "") + snippet;
        onChange(newVal);
      }
    } else {
      const newVal = (value ? value + " " : "") + snippet;
      onChange(newVal);
    }

    if (onInsert) {
      onInsert(snippet);
    }
  };

  const handleToggleKeyboard = () => {
    const vkb = typeof window !== "undefined" ? (window as any).mathVirtualKeyboard : null;
    if (vkb) {
      if (typeof vkb.toggle === "function") {
        vkb.toggle();
      } else if (vkb.visible) {
        vkb.hide?.();
      } else {
        vkb.show?.();
      }
    } else {
      const mf = mfRef.current as any;
      if (mf) {
        mf.focus();
      }
    }
  };

  const handleClear = () => {
    const mf = mfRef.current as any;
    if (mf) {
      mf.value = "";
    }
    onChange("");
  };

  // Subdivided categories with rich visual math symbols
  const categorySnippets: Record<MathCategory, Array<{ label: string; snippet: string; renderLatex?: string; renderHtml?: React.ReactNode; btnType?: string }>> = {
    // 1. Algèbre & Général
    general: [
      {
        label: "Fraction",
        snippet: "\\frac{#?}{#?}",
        renderHtml: (
          <span className="inline-flex flex-col items-center justify-center leading-none text-[11px]">
            <span className="border-b border-current px-0.5 leading-none">a</span>
            <span className="leading-none pt-0.5">b</span>
          </span>
        ),
        btnType: "frac",
      },
      { label: "Racine carrée", snippet: "\\sqrt{#?}", renderHtml: <span>√<i>x</i></span>, btnType: "sqrt" },
      { label: "Racine de x²", snippet: "\\sqrt{x^2}", renderHtml: <span>√<i>x</i>²</span> },
      { label: "Racine n-ième", snippet: "\\sqrt[#?]{#?}", renderHtml: <span><sup><i>n</i></sup>√<i>x</i></span>, btnType: "nthroot" },
      { label: "Racine a²+b²", snippet: "\\sqrt{a^2 + b^2}", renderHtml: <span>√(<i>a</i>²+<i>b</i>²)</span> },
      { label: "Racine de fraction", snippet: "\\sqrt{\\frac{a}{b}}", renderHtml: <span>√(<i>a</i>/<i>b</i>)</span> },
      { label: "Carré x²", snippet: "x^2", renderHtml: <span><i>x</i>²</span>, btnType: "power2" },
      { label: "Puissance xⁿ", snippet: "x^{#?}", renderHtml: <span><i>x</i><sup><i>n</i></sup></span>, btnType: "powerN" },
      { label: "Exposant direct ²", snippet: "^{2}", renderHtml: <span>( )²</span>, btnType: "power2" },
      { label: "Exposant direct ⁿ", snippet: "^{#?}", renderHtml: <span>( )<sup><i>n</i></sup></span>, btnType: "powerN" },
      { label: "Indice direct ₙ", snippet: "_{#?}", renderHtml: <span>( )<sub><i>n</i></sub></span>, btnType: "subN" },
      { label: "Indice xₙ", snippet: "x_{#?}", renderHtml: <span><i>x</i><sub><i>n</i></sub></span>, btnType: "subN" },
      { label: "Indice x₀", snippet: "x_0", renderHtml: <span><i>x</i><sub>0</sub></span>, btnType: "sub0" },
      { label: "Formule quadratique", snippet: "\\frac{-b \\pm \\sqrt{\\Delta}}{2a}", renderHtml: <span className="text-[10px] font-bold">(-b±√Δ)/2a</span> },
      { label: "Parenthèses (x)", snippet: "\\left(#?\\right)", renderHtml: <span>(<i>x</i>)</span>, btnType: "paren" },
      { label: "Crochets [x]", snippet: "\\left[#?\\right]", renderHtml: <span>[<i>x</i>]</span>, btnType: "brackets" },
      { label: "Valeur absolue |x|", snippet: "|#?|", renderHtml: <span>|<i>x</i>|</span>, btnType: "abs" },
      { label: "Plus ou moins ±", snippet: "\\pm", renderHtml: <span>±</span> },
      { label: "Multiplication ×", snippet: "\\times", renderHtml: <span>×</span> },
      { label: "Division ÷", snippet: "\\div", renderHtml: <span>÷</span> },
      { label: "Différent ≠", snippet: "\\neq", renderHtml: <span>≠</span> },
      { label: "Inférieur ou égal ≤", snippet: "\\le", renderHtml: <span>≤</span> },
      { label: "Supérieur ou égal ≥", snippet: "\\ge", renderHtml: <span>≥</span> },
      { label: "Environ égal ≈", snippet: "\\approx", renderHtml: <span>≈</span> },
      { label: "Appartient ∈", snippet: "\\in", renderHtml: <span>∈</span> },
      { label: "N'appartient pas ∉", snippet: "\\notin", renderHtml: <span>∉</span> },
      { label: "Inclus ⊂", snippet: "\\subset", renderHtml: <span>⊂</span> },
      { label: "Ensemble ℝ", snippet: "\\mathbb{R}", renderHtml: <span className="font-serif font-black">ℝ</span> },
      { label: "Ensemble ℕ", snippet: "\\mathbb{N}", renderHtml: <span className="font-serif font-black">ℕ</span> },
      { label: "Ensemble ℤ", snippet: "\\mathbb{Z}", renderHtml: <span className="font-serif font-black">ℤ</span> },
      { label: "Ensemble ℂ", snippet: "\\mathbb{C}", renderHtml: <span className="font-serif font-black">ℂ</span> },
      { label: "Implique ⟹", snippet: "\\implies", renderHtml: <span>⟹</span> },
      { label: "Équivaut ⟺", snippet: "\\iff", renderHtml: <span>⟺</span> },
    ],

    // 2. Analyse & Fonctions
    analyse: [
      { label: "Intégrale définie", snippet: "\\int_{#?}^{#?} #? \\, dx", renderHtml: <span>∫<sub>a</sub><sup>b</sup></span> },
      { label: "Primitive", snippet: "\\int #? \\, dx", renderHtml: <span>∫ <i>f</i>(<i>x</i>)<i>dx</i></span> },
      { label: "Somme ∑", snippet: "\\sum_{#?}^{#?} #?", renderHtml: <span>∑ <i>x<sub>i</sub></i></span> },
      { label: "Produit ∏", snippet: "\\prod_{#?}^{#?} #?", renderHtml: <span>∏ <i>a<sub>k</sub></i></span> },
      { label: "Limite en x₀", snippet: "\\lim_{x \\to #?} #?", renderHtml: <span>lim <i>x</i>→<i>x</i>₀</span> },
      { label: "Limite en +∞", snippet: "\\lim_{x \\to +\\infty} #?", renderHtml: <span>lim <i>x</i>→+∞</span> },
      { label: "Infini ∞", snippet: "\\infty", renderHtml: <span>∞</span> },
      { label: "Dérivée f'(x)", snippet: "f'(x)", renderHtml: <span><i>f'</i>(<i>x</i>)</span> },
      { label: "Dérivée seconde f''(x)", snippet: "f''(x)", renderHtml: <span><i>f''</i>(<i>x</i>)</span> },
      { label: "Exponentielle eˣ", snippet: "e^{#?}", renderHtml: <span>e<sup><i>x</i></sup></span> },
      { label: "Logarithme népérien ln(x)", snippet: "\\ln\\left(#?\\right)", renderHtml: <span>ln(<i>x</i>)</span> },
      { label: "Logarithme log(x)", snippet: "\\log\\left(#?\\right)", renderHtml: <span>log(<i>x</i>)</span> },
      { label: "Sinus sin(x)", snippet: "\\sin\\left(#?\\right)", renderHtml: <span>sin(<i>x</i>)</span> },
      { label: "Cosinus cos(x)", snippet: "\\cos\\left(#?\\right)", renderHtml: <span>cos(<i>x</i>)</span> },
      { label: "Tangente tan(x)", snippet: "\\tan\\left(#?\\right)", renderHtml: <span>tan(<i>x</i>)</span> },
      { label: "Système 2 équations", snippet: "\\begin{cases} #? \\\\ #? \\end{cases}", renderLatex: "\\begin{cases} x+y=1 \\\\ 2x-y=3 \\end{cases}" },
    ],

    // 3. Géométrie & Vecteurs
    geometrie: [
      { label: "Vecteur u→", snippet: "\\vec{u}", renderHtml: <span><i>u</i>→</span>, btnType: "vec" },
      { label: "Vecteur AB→", snippet: "\\vec{AB}", renderHtml: <span><span className="overline font-bold">AB</span>→</span>, btnType: "vec" },
      { label: "Norme ||u→||", snippet: "\\|\\vec{u}\\|", renderHtml: <span>‖<i>u</i>→‖</span> },
      { label: "Produit scalaire u→ · v→", snippet: "\\vec{u} \\cdot \\vec{v}", renderHtml: <span><i>u</i>→ · <i>v</i>→</span> },
      { label: "Angle géométrique ABĈ", snippet: "\\widehat{ABC}", renderHtml: <span>ABĈ</span> },
      { label: "Perpendiculaire ⟂", snippet: "\\perp", renderHtml: <span>⟂</span> },
      { label: "Parallèle ∥", snippet: "\\parallel", renderHtml: <span>∥</span> },
      { label: "Degré °", snippet: "^{\\circ}", renderHtml: <span>°</span> },
      { label: "Triangle Δ", snippet: "\\Delta", renderHtml: <span>Δ</span> },
      { label: "Segment [AB]", snippet: "[AB]", renderHtml: <span>[AB]</span> },
      { label: "Distance AB", snippet: "AB", renderHtml: <span>AB</span> },
      { label: "Coordonnées (x; y)", snippet: "\\left(#? ; #?\\right)", renderHtml: <span>(<i>x</i> ; <i>y</i>)</span> },
    ],

    // 4. Chimie (mhchem)
    chimie: [
      { label: "Acétylène C2H2", snippet: "\\ce{C2H2}", renderLatex: "\\ce{C2H2}" },
      { label: "Eau H2O", snippet: "\\ce{H2O}", renderLatex: "\\ce{H2O}" },
      { label: "Dioxyde de carbone CO2", snippet: "\\ce{CO2}", renderLatex: "\\ce{CO2}" },
      { label: "Ion Sulfate SO4 2-", snippet: "\\ce{SO4^{2-}}", renderLatex: "\\ce{SO4^{2-}}" },
      { label: "Ion Hydronium H3O+", snippet: "\\ce{H3O+}", renderLatex: "\\ce{H3O+}" },
      { label: "Acide chlorhydrique HCl", snippet: "\\ce{HCl}", renderLatex: "\\ce{HCl}" },
      { label: "Hydroxyde de sodium NaOH", snippet: "\\ce{NaOH}", renderLatex: "\\ce{NaOH}" },
      { label: "Ion Cuivre Cu2+", snippet: "\\ce{Cu^{2+}}", renderLatex: "\\ce{Cu^{2+}}" },
      { label: "Ion Chlorure Cl-", snippet: "\\ce{Cl-}", renderLatex: "\\ce{Cl-}" },
      { label: "Ion Argent Ag+", snippet: "\\ce{Ag+}", renderLatex: "\\ce{Ag+}" },
      { label: "Ion Fer Fe2+", snippet: "\\ce{Fe^{2+}}", renderLatex: "\\ce{Fe^{2+}}" },
      { label: "Ion Fer Fe3+", snippet: "\\ce{Fe^{3+}}", renderLatex: "\\ce{Fe^{3+}}" },
      { label: "Équation bilan 2H2 + O2 -> 2H2O", snippet: "\\ce{2H2 + O2 -> 2H2O}", renderLatex: "\\ce{2H2 + O2 -> 2H2O}" },
      { label: "Alcane C_nH_{2n+2}", snippet: "\\ce{C_nH_{2n+2}}", renderLatex: "\\ce{C_nH_{2n+2}}" },
      { label: "Flèche réaction ⟶", snippet: "\\longrightarrow", renderLatex: "\\longrightarrow" },
      { label: "Équilibre chimique ⇌", snippet: "\\rightleftharpoons", renderLatex: "\\rightleftharpoons" },
      { label: "Molécule générale \\ce{...}", snippet: "\\ce{#?}", renderLatex: "\\ce{A + B}" },
      { label: "Aqueux (aq)", snippet: "\\text{(aq)}", renderLatex: "\\text{(aq)}" },
      { label: "Solide (s)", snippet: "\\text{(s)}", renderLatex: "\\text{(s)}" },
      { label: "Gazeux (g)", snippet: "\\text{(g)}", renderLatex: "\\text{(g)}" },
      { label: "Liquide (l)", snippet: "\\text{(l)}", renderLatex: "\\text{(l)}" },
    ],

    // 5. Physique & Lois
    physique: [
      { label: "Masse volumique ρ = m/V", snippet: "\\rho = \\frac{m}{V}", renderLatex: "\\rho = \\frac{m}{V}" },
      { label: "Vitesse v = d/t", snippet: "v = \\frac{d}{t}", renderLatex: "v = \\frac{d}{t}" },
      { label: "Quantité n = m/M", snippet: "n = \\frac{m}{M}", renderLatex: "n = \\frac{m}{M}" },
      { label: "Concentration C = n/V", snippet: "C = \\frac{n}{V}", renderLatex: "C = \\frac{n}{V}" },
      { label: "Loi de Newton ∑F = ma", snippet: "\\sum \\vec{F}_{ext} = m \\vec{a}", renderLatex: "\\sum \\vec{F} = m\\vec{a}" },
      { label: "Énergie cinétique Ec = 1/2 m v²", snippet: "E_c = \\frac{1}{2} m v^2", renderLatex: "E_c = \\frac{1}{2}mv^2" },
      { label: "Loi d'Ohm U = R · I", snippet: "U = R \\cdot I", renderLatex: "U = R \\cdot I" },
      { label: "Poids P = m · g", snippet: "P = m \\cdot g", renderLatex: "P = m \\cdot g" },
      { label: "Période T = 1/f", snippet: "T = \\frac{1}{f}", renderLatex: "T = \\frac{1}{f}" },
      { label: "mol/L", snippet: "\\text{mol/L}", renderLatex: "\\text{mol/L}" },
      { label: "g/mol", snippet: "\\text{g/mol}", renderLatex: "\\text{g/mol}" },
      { label: "m/s", snippet: "\\text{m/s}", renderLatex: "\\text{m/s}" },
      { label: "kg/m³", snippet: "\\text{kg/m}^3", renderLatex: "\\text{kg/m}^3" },
      { label: "Joule (J)", snippet: "\\text{J}", renderLatex: "\\text{J}" },
      { label: "Volt (V)", snippet: "\\text{V}", renderLatex: "\\text{V}" },
      { label: "Ampère (A)", snippet: "\\text{A}", renderLatex: "\\text{A}" },
      { label: "Hertz (Hz)", snippet: "\\text{Hz}", renderLatex: "\\text{Hz}" },
      { label: "Newton (N)", snippet: "\\text{N}", renderLatex: "\\text{N}" },
      { label: "Watt (W)", snippet: "\\text{W}", renderLatex: "\\text{W}" },
    ],

    // 6. Symboles Grecs & Ensembles
    grec: [
      { label: "Alpha α", snippet: "\\alpha", renderLatex: "\\alpha" },
      { label: "Bêta β", snippet: "\\beta", renderLatex: "\\beta" },
      { label: "Gamma γ", snippet: "\\gamma", renderLatex: "\\gamma" },
      { label: "Delta min δ", snippet: "\\delta", renderLatex: "\\delta" },
      { label: "Delta Maj Δ", snippet: "\\Delta", renderLatex: "\\Delta" },
      { label: "Thêta θ", snippet: "\\theta", renderLatex: "\\theta" },
      { label: "Lambda λ", snippet: "\\lambda", renderLatex: "\\lambda" },
      { label: "Micro µ", snippet: "\\mu", renderLatex: "\\mu" },
      { label: "Pi π", snippet: "\\pi", renderLatex: "\\pi" },
      { label: "Rho ρ", snippet: "\\rho", renderLatex: "\\rho" },
      { label: "Sigma min σ", snippet: "\\sigma", renderLatex: "\\sigma" },
      { label: "Sigma Maj Σ", snippet: "\\Sigma", renderLatex: "\\Sigma" },
      { label: "Tau τ", snippet: "\\tau", renderLatex: "\\tau" },
      { label: "Phi φ", snippet: "\\phi", renderLatex: "\\phi" },
      { label: "Oméga min ω", snippet: "\\omega", renderLatex: "\\omega" },
      { label: "Oméga Maj Ω (Ohm)", snippet: "\\Omega", renderLatex: "\\Omega" },
    ],
  };

  const categories: Array<{ id: MathCategory; label: string }> = [
    { id: "general", label: "📐 Algèbre & Général" },
    { id: "analyse", label: "📈 Analyse & Fonctions" },
    { id: "geometrie", label: "📏 Géométrie & Vecteurs" },
    { id: "chimie", label: "🧪 Chimie (mhchem)" },
    { id: "physique", label: "⚡ Physique & Lois" },
    { id: "grec", label: "🔤 Symboles Grecs" },
  ];

  const currentButtons = categorySnippets[activeCategory] || categorySnippets.general;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {label ? (
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <label className="text-xs font-black text-slate-200">{label}</label>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-amber-300 font-black">
            <Sparkles size={14} className="text-amber-400" />
            <span>Clavier Scientifique WYSIWYG Unique (Maths & Chimie)</span>
          </div>
        )}

        <div className="flex items-center space-x-1.5 text-xs">
          {/* Virtual Keyboard Toggle */}
          <button
            type="button"
            onClick={handleToggleKeyboard}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
            title="Ouvrir le clavier virtuel MathLive"
          >
            <Keyboard size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Clavier virtuel</span>
          </button>

          {/* Toggle Preview */}
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
            title="Basculer l'aperçu rendu élève"
          >
            {showLivePreview ? <EyeOff size={13} /> : <Eye size={13} />}
            <span className="hidden sm:inline">{showLivePreview ? "Masquer rendu" : "Voir rendu"}</span>
          </button>

          {/* Clear Button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Effacer le contenu"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Subdivided Category Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeCategory === cat.id
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-sm scale-102"
                : "bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Visual Insertion Buttons Bar - Renders Real Mathematical Symbols */}
      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/95 border border-slate-800 rounded-xl max-h-36 overflow-y-auto scrollbar-thin shadow-inner">
        {currentButtons.map((btn, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleInsert(btn.snippet, btn.btnType)}
            title={`${btn.label} (Cliquez pour insérer)`}
            className="min-h-[34px] min-w-[36px] px-2.5 py-1 bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 border border-slate-700/80 hover:border-amber-400 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 flex items-center justify-center space-x-1"
          >
            {renderVisualButton(btn)}
          </button>
        ))}
      </div>

      {/* WYSIWYG MathLive Input Field */}
      <div className="relative">
        <math-field
          ref={mfRef as any}
          virtual-keyboard-mode="manual"
          className="w-full text-base sm:text-lg focus:border-amber-400 focus:outline-hidden bg-slate-950/70 border border-slate-700 rounded-xl p-2.5 text-white"
          placeholder={placeholder}
        >
          {value}
        </math-field>
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
          <span>💡 Saisie visuelle directe WYSIWYG : les formules se combinent sans afficher de code brut.</span>
          <span className="font-mono text-amber-400/90 font-bold">MathLive Unifié</span>
        </div>
      </div>

      {/* Quick Insertion into Course Content (when onInsertToContent is passed) */}
      {onInsertToContent && value && (
        <div className="flex items-center space-x-2 pt-1">
          <button
            type="button"
            onClick={() => onInsertToContent(`$${value}$`, "inline")}
            className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/80 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
            title="Insérer dans la leçon en ligne dans le texte : $...$"
          >
            <PlusCircle size={14} className="text-indigo-400" />
            <span>Insérer en ligne ($formule$)</span>
          </button>
          <button
            type="button"
            onClick={() => onInsertToContent(`\n$$\n${value}\n$$\n`, "block")}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 cursor-pointer transition-transform active:scale-95 shadow-xs"
            title="Insérer dans la leçon en grand bloc centré : $$...$$"
          >
            <FileText size={14} />
            <span>Insérer en grand bloc ($$...$$)</span>
          </button>
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-slate-400 leading-tight">{helperText}</p>
      )}

      {/* Live KaTeX / mhchem Rendu Preview (Vue Élève) */}
      {showLivePreview && value && (
        <div className="bg-slate-950/90 border border-indigo-900/60 rounded-xl p-3 space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center space-x-1.5 text-[10px] font-black text-amber-300 uppercase tracking-wide">
              <FlaskConical size={12} className="text-amber-400" />
              <span>Aperçu Rendu KaTeX & mhchem (Vue Élève) :</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span className="text-emerald-400">Copié</span>
                </>
              ) : (
                <span>Copier LaTeX</span>
              )}
            </button>
          </div>
          <div className="text-slate-100 text-sm py-1 overflow-x-auto">
            <MathRenderer text={value} />
          </div>
        </div>
      )}
    </div>
  );
};
