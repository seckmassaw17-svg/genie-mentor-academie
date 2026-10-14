import React from "react";
import katex from "katex";
import "katex/contrib/mhchem";

export const KATEX_MACROS: Record<string, string> = {
  "\\exponentialE": "e",
  "\\differentialD": "d",
  "\\imaginaryI": "i",
  "\\degree": "^\\circ",
};

/**
 * Normalizes common MathLive or raw LaTeX macros not natively supported by KaTeX
 */
export const normalizeLatex = (str: string): string => {
  if (!str) return "";
  return str
    .replaceAll("\\exponentialE", "e")
    .replaceAll("\\exponentiale", "e")
    .replaceAll("\\differentialD", "d")
    .replaceAll("\\imaginaryI", "i")
    .replaceAll("\\placeholder{}", "...")
    .replaceAll("\\placeholder", "...")
    .replaceAll("{#?}", "")
    .replaceAll("#?", "");
};

/**
 * Ensures a mathematical string (especially from MathLive without delimiters)
 * is wrapped with $...$ or $$...$$ delimiters for standard KaTeX / MathJax parsers.
 */
export const ensureMathDelimiters = (str: string): string => {
  if (!str) return "";
  const clean = normalizeLatex(str).trim();
  if (!clean) return "";

  // Already has math delimiters
  if (
    (clean.startsWith("$") && clean.endsWith("$")) ||
    (clean.startsWith("\\[") && clean.endsWith("\\]")) ||
    (clean.startsWith("\\(") && clean.endsWith("\\)"))
  ) {
    return clean;
  }

  // Already contains embedded math delimiters
  if (clean.includes("$")) {
    return clean;
  }

  // Detect if string contains LaTeX commands or mathematical constructs
  const hasLatex =
    clean.startsWith("\\") ||
    /\\(?:frac|sqrt|int|sum|prod|lim|vec|times|pm|div|neq|le|ge|approx|infty|alpha|beta|gamma|delta|Delta|omega|Omega|theta|lambda|mu|rho|pi|ce|left|right|mathbb|mathbf|ln|log|sin|cos|tan)\b/.test(clean) ||
    /(\^\{|_\{|\^[0-9a-zA-Z]|_[0-9a-zA-Z])/.test(clean);

  if (hasLatex) {
    if (clean.includes("\n") || clean.length > 80) {
      return `$$\n${clean}\n$$`;
    }
    return `$ ${clean} $`;
  }

  return clean;
};

interface MathRendererProps {
  content?: string;
  text?: string;
  className?: string;
}

/**
 * Parses text containing LaTeX math formulas:
 * - Block math: $$ ... $$ or \[ ... \]
 * - Inline math: $ ... $ or \( ... \)
 * - Raw LaTeX commands like \frac, \sqrt, \int, etc.
 * Also renders basic markdown formatting (paragraphs, line breaks, bold, italics, lists, headings).
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, text, className = "" }) => {
  const rawContent = content ?? text ?? "";
  if (!rawContent) return null;

  // Normalize special macros first
  const targetContent = normalizeLatex(rawContent);

  // Function to render a formula safely
  const renderFormula = (formula: string, displayMode: boolean): string => {
    try {
      const clean = normalizeLatex(formula.trim());
      return katex.renderToString(clean, {
        displayMode,
        throwOnError: false,
        output: "htmlAndMathml",
        macros: KATEX_MACROS,
      });
    } catch (err) {
      console.warn("KaTeX render error:", err);
      return `<span class="text-amber-500 font-mono text-xs">${formula}</span>`;
    }
  };

  // Helper to test if a raw string is a LaTeX formula or contains LaTeX commands
  const isLikelyRawLatex = (str: string): boolean => {
    const trimmed = str.trim();
    return /\\(?:frac|sqrt|int|sum|prod|lim|vec|overrightarrow|times|pm|div|neq|le|ge|approx|infty|alpha|beta|gamma|delta|Delta|omega|Omega|theta|Theta|lambda|Lambda|mu|rho|sigma|Sigma|pi|Pi|ce|text|left|right|mathbb|mathbf|mathcal|ln|log|exp|sin|cos|tan|cot|arcsin|arccos|arctan|cdot|forall|exists|in|notin|subset|subseteq|cup|cap|to|rightarrow|rightleftharpoons|longrightarrow|implies|iff|degree|partial|nabla)\b|\\ce\{|\^\{|_\{|\^[0-9a-zA-Z]|_[0-9a-zA-Z]/.test(trimmed);
  };

  // Helper to parse inline math $...$, \(...\), or raw LaTeX commands
  const renderInlineMath = (textToRender: string) => {
    const trimmed = textToRender.trim();

    // If the entire text is a raw LaTeX formula (even with spaces and no $ delimiters)
    if (
      (trimmed.startsWith("\\") || isLikelyRawLatex(trimmed)) &&
      !trimmed.includes("$") &&
      !trimmed.includes("\n")
    ) {
      const directHtml = renderFormula(trimmed, false);
      if (!directHtml.includes("text-amber-500")) {
        return (
          <span
            className="inline-block px-1 align-baseline"
            dangerouslySetInnerHTML={{ __html: directHtml }}
          />
        );
      }
    }

    // Match inline $...$, \(...\), or raw LaTeX / chemistry expressions embedded in plain text
    const inlineMathRegex = /(\$(?:\\\$|[^\$])+\$|\\\((?:[\s\S]*?)\\\)|\\ce\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\\(?:frac|sqrt|int|sum|prod|lim|vec)\b(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\]]*\])*|\\(?:alpha|beta|gamma|delta|Delta|omega|Omega|theta|lambda|mu|rho|times|pm|div|neq|le|ge|approx|infty|pi|rightleftharpoons|longrightarrow)\b|(?:[a-zA-Z0-9]+)?(?:_\{[^{}]+\}|\^\{[^{}]+\}|\^[0-9a-zA-Z]|_[0-9a-zA-Z]))/g;
    const segments = textToRender.split(inlineMathRegex);

    return segments.map((seg, sIdx) => {
      if (!seg) return null;

      if (seg.startsWith("$") && seg.endsWith("$") && seg.length > 2) {
        const formula = seg.slice(1, -1);
        const html = renderFormula(formula, false);
        return (
          <span
            key={`inline-math-${sIdx}`}
            className="inline-block px-1 align-baseline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (seg.startsWith("\\(") && seg.endsWith("\\)") && seg.length > 4) {
        const formula = seg.slice(2, -2);
        const html = renderFormula(formula, false);
        return (
          <span
            key={`inline-math-bracket-${sIdx}`}
            className="inline-block px-1 align-baseline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // Check if this segment contains raw LaTeX commands that were not enclosed in $
      if (isLikelyRawLatex(seg)) {
        const html = renderFormula(seg, false);
        return (
          <span
            key={`raw-latex-${sIdx}`}
            className="inline-block px-1 align-baseline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // Handle simple formatting like **bold** and *italic*
      return <React.Fragment key={`plain-${sIdx}`}>{formatInlineMarkdown(seg)}</React.Fragment>;
    });
  };

  // Simple inline markdown parsing (**bold**, *italic*, `code`)
  const formatInlineMarkdown = (text: string) => {
    const boldRegex = /(\*\*[^*]+\*\*)/g;
    const parts = text.split(boldRegex);

    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} className="font-extrabold text-inherit">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Process text line by line or section by section
  const renderFormattedText = (rawText: string) => {
    // 1. First extract and protect display math blocks $$...$$ or \[...\]
    const blockMathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g;
    const parts = rawText.split(blockMathRegex);

    return parts.map((part, pIdx) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const math = part.slice(2, -2);
        const html = renderFormula(math, true);
        return (
          <div
            key={`block-math-${pIdx}`}
            className="my-3 py-2 px-3 bg-slate-800/40 rounded-xl overflow-x-auto text-center border border-slate-700/50 text-inherit"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (part.startsWith("\\[") && part.endsWith("\\]")) {
        const math = part.slice(2, -2);
        const html = renderFormula(math, true);
        return (
          <div
            key={`block-math-bracket-${pIdx}`}
            className="my-3 py-2 px-3 bg-slate-800/40 rounded-xl overflow-x-auto text-center border border-slate-700/50 text-inherit"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // For non-block text, split into paragraphs
      const paragraphs = part.split(/\n\s*\n/);

      return (
        <div key={`text-part-${pIdx}`} className="space-y-3">
          {paragraphs.map((para, pIndex) => {
            if (!para.trim()) return null;

            // Handle headings
            if (para.startsWith("### ")) {
              return (
                <h4 key={pIndex} className="text-sm font-extrabold text-inherit mt-4 mb-1">
                  {renderInlineMath(para.replace("### ", ""))}
                </h4>
              );
            }
            if (para.startsWith("## ")) {
              return (
                <h3 key={pIndex} className="text-base font-black text-inherit mt-4 mb-1 border-b border-slate-700/40 pb-1">
                  {renderInlineMath(para.replace("## ", ""))}
                </h3>
              );
            }
            if (para.startsWith("# ")) {
              return (
                <h2 key={pIndex} className="text-lg font-black text-inherit mt-4 mb-2">
                  {renderInlineMath(para.replace("# ", ""))}
                </h2>
              );
            }

            // Handle bullet points
            const lines = para.split("\n");
            const isBulletList = lines.every((l) => l.trim().startsWith("- ") || l.trim().startsWith("* ") || !l.trim());

            if (isBulletList && lines.length > 0) {
              return (
                <ul key={pIndex} className="list-disc list-inside space-y-1.5 my-2 pl-2">
                  {lines.map((line, lIdx) => {
                    const clean = line.trim().replace(/^[-*]\s*/, "");
                    if (!clean) return null;
                    return (
                      <li key={lIdx} className="leading-relaxed">
                        {renderInlineMath(clean)}
                      </li>
                    );
                  })}
                </ul>
              );
            }

            return (
              <p key={pIndex} className="leading-relaxed whitespace-pre-wrap">
                {renderInlineMath(para)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return <div className={`math-rendered-content ${className}`}>{renderFormattedText(targetContent)}</div>;
};

/**
 * Math Toolbar for quick insertion of LaTeX symbols and expressions into textareas
 */
interface MathToolbarProps {
  onInsert: (snippet: string) => void;
  className?: string;
}

export const MathToolbar: React.FC<MathToolbarProps> = ({ onInsert, className = "" }) => {
  const [activeCategory, setActiveCategory] = React.useState<"general" | "analyse" | "geometrie" | "physique" | "grec">("general");

  const categories = [
    { id: "general" as const, label: "Général & Algèbre" },
    { id: "analyse" as const, label: "Analyse / Intégrales" },
    { id: "geometrie" as const, label: "Géométrie & Vecteurs" },
    { id: "physique" as const, label: "Physique-Chimie" },
    { id: "grec" as const, label: "Lettres Grecques" },
  ];

  const categorySnippets = {
    general: [
      { label: "Fraction", code: "\\frac{a}{b}", desc: "a/b" },
      { label: "Racine carrée", code: "\\sqrt{x}", desc: "√x" },
      { label: "Racine n-ième", code: "\\sqrt[n]{x}", desc: "ⁿ√x" },
      { label: "Puissance", code: "x^{2}", desc: "x²" },
      { label: "Indice", code: "x_{n}", desc: "xₙ" },
      { label: "Valeur absolue", code: "|x|", desc: "|x|" },
      { label: "Plus ou moins", code: "\\pm", desc: "±" },
      { label: "Multiplication", code: "\\times", desc: "×" },
      { label: "Différent de", code: "\\neq", desc: "≠" },
      { label: "Inférieur ou égal", code: "\\le", desc: "≤" },
      { label: "Supérieur ou égal", code: "\\ge", desc: "≥" },
      { label: "Appartient à", code: "\\in", desc: "∈" },
      { label: "Ensemble R", code: "\\mathbb{R}", desc: "ℝ" },
      { label: "Ensemble N", code: "\\mathbb{N}", desc: "ℕ" },
      { label: "Équivaut à", code: "\\iff", desc: "⟺" },
      { label: "Implique", code: "\\implies", desc: "⟹" },
      { label: "Formule Bloc", code: "$$\n\\frac{-b \\pm \\sqrt{\\Delta}}{2a}\n$$", desc: "$$ Formule $$" },
    ],
    analyse: [
      { label: "Intégrale simple", code: "\\int_{a}^{b} f(x) dx", desc: "∫ f(x)dx" },
      { label: "Primitive", code: "\\int f(x) dx", desc: "∫" },
      { label: "Somme", code: "\\sum_{i=1}^{n} x_i", desc: "∑" },
      { label: "Produit", code: "\\prod_{k=1}^{n} a_k", desc: "∏" },
      { label: "Limite en un point", code: "\\lim_{x \\to x_0} f(x)", desc: "lim x→x₀" },
      { label: "Limite à l'infini", code: "\\lim_{x \\to +\\infty} f(x)", desc: "lim +∞" },
      { label: "Infini", code: "\\infty", desc: "∞" },
      { label: "Dérivée", code: "f'(x)", desc: "f'(x)" },
      { label: "Dérivée seconde", code: "f''(x)", desc: "f''(x)" },
      { label: "Exponentielle", code: "e^{x}", desc: "eˣ" },
      { label: "Logarithme népérien", code: "\\ln(x)", desc: "ln(x)" },
      { label: "Système / Accolade", code: "\\begin{cases} x + y = 1 \\\\ 2x - y = 3 \\end{cases}", desc: "{ Système" },
    ],
    geometrie: [
      { label: "Vecteur AB", code: "\\vec{AB}", desc: "AB→" },
      { label: "Vecteur u", code: "\\vec{u}", desc: "u→" },
      { label: "Norme de vecteur", code: "\\|\\vec{u}\\|", desc: "‖u→‖" },
      { label: "Produit scalaire", code: "\\vec{u} \\cdot \\vec{v}", desc: "u→ · v→" },
      { label: "Angle géométrique", code: "\\widehat{ABC}", desc: "ABĈ" },
      { label: "Perpendiculaire", code: "\\perp", desc: "⟂" },
      { label: "Parallèle", code: "\\parallel", desc: "∥" },
      { label: "Degré", code: "^{\\circ}", desc: "°" },
      { label: "Triangle", code: "\\Delta", desc: "Δ" },
      { label: "Segment", code: "[AB]", desc: "[AB]" },
    ],
    physique: [
      { label: "Formule chimique C2H2", code: "\\ce{C2H2}", desc: "\\ce{C2H2}" },
      { label: "Eau H2O", code: "\\ce{H2O}", desc: "\\ce{H2O}" },
      { label: "Ion Sulfate", code: "\\ce{SO4^{2-}}", desc: "\\ce{SO4^{2-}}" },
      { label: "Acide Chlorhydrique", code: "\\ce{HCl}", desc: "\\ce{HCl}" },
      { label: "Équation bilan", code: "\\ce{2H2 + O2 -> 2H2O}", desc: "2H₂ + O₂ → 2H₂O" },
      { label: "Masse volumique (rho)", code: "\\rho = \\frac{m}{V}", desc: "ρ = m/V" },
      { label: "Vitesse", code: "v = \\frac{d}{t}", desc: "v = d/t" },
      { label: "Quantité de matière", code: "n = \\frac{m}{M}", desc: "n = m/M" },
      { label: "Concentration", code: "C = \\frac{n}{V}", desc: "C = n/V" },
      { label: "Deuxième loi de Newton", code: "\\sum \\vec{F}_{ext} = m \\vec{a}", desc: "∑F = ma" },
      { label: "Énergie cinétique", code: "E_c = \\frac{1}{2} m v^2", desc: "Ec = ½mv²" },
      { label: "Loi d'Ohm", code: "U = R \\cdot I", desc: "U = R·I" },
      { label: "Flèche réaction chimique", code: "\\longrightarrow", desc: "⟶" },
      { label: "Équilibre chimique", code: "\\rightleftharpoons", desc: "⇌" },
      { label: "Micro (µ)", code: "\\mu", desc: "µ" },
      { label: "Ohm (Ω)", code: "\\Omega", desc: "Ω" },
    ],
    grec: [
      { label: "Alpha", code: "\\alpha", desc: "α" },
      { label: "Bêta", code: "\\beta", desc: "β" },
      { label: "Gamma", code: "\\gamma", desc: "γ" },
      { label: "Delta min", code: "\\delta", desc: "δ" },
      { label: "Delta Maj", code: "\\Delta", desc: "Δ" },
      { label: "Thêta", code: "\\theta", desc: "θ" },
      { label: "Lambda", code: "\\lambda", desc: "λ" },
      { label: "Pi", code: "\\pi", desc: "π" },
      { label: "Sigma Maj", code: "\\Sigma", desc: "Σ" },
      { label: "Oméga", code: "\\omega", desc: "ω" },
      { label: "Oméga Maj", code: "\\Omega", desc: "Ω" },
    ],
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2 ${className}`}>
      {/* Category Pills - Simplified 3 Categories */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat.id
                ? "bg-amber-400 text-slate-950 shadow-xs font-black"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Snippet Buttons Grid */}
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
        {categorySnippets[activeCategory].map((snip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onInsert(snip.code)}
            title={`${snip.label} : ${snip.code}`}
            className="px-2 py-1 bg-slate-800/90 hover:bg-amber-400 hover:text-slate-950 text-slate-100 border border-slate-700 hover:border-amber-400 rounded-lg text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            {snip.desc || snip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
