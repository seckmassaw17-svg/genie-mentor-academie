import React, { useState } from "react";
import { KOTLIN_SOURCE_FILES } from "../data/kotlinCode";
import { Code2, Copy, Check, X, FileCode, Layers, FileJson, ShieldCheck } from "lucide-react";

interface KotlinCodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KotlinCodeViewer: React.FC<KotlinCodeViewerProps> = ({ isOpen, onClose }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const activeFile = KOTLIN_SOURCE_FILES[selectedFileIndex] || KOTLIN_SOURCE_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopiedIndex(selectedFileIndex);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getFileBadge = (filename: string) => {
    if (filename.endsWith(".json")) return { text: "JSON", bg: "bg-amber-400/20 text-amber-300 border-amber-500/30" };
    if (filename.endsWith(".rules")) return { text: "RULES", bg: "bg-emerald-400/20 text-emerald-300 border-emerald-500/30" };
    if (filename.endsWith(".xml")) return { text: "XML", bg: "bg-cyan-400/20 text-cyan-300 border-cyan-500/30" };
    if (filename.endsWith(".ts")) return { text: "TS / NODE", bg: "bg-blue-400/20 text-blue-300 border-blue-500/30" };
    if (filename.endsWith(".js")) return { text: "JS / NODE", bg: "bg-yellow-400/20 text-yellow-300 border-yellow-500/30" };
    return { text: "KOTLIN", bg: "bg-indigo-400/20 text-indigo-300 border-indigo-500/30" };
  };

  const getFileIcon = (filename: string, isSelected: boolean) => {
    if (filename.endsWith(".json")) {
      return <FileJson size={16} className={isSelected ? "text-amber-300" : "text-amber-400/70"} />;
    }
    if (filename.endsWith(".rules")) {
      return <ShieldCheck size={16} className={isSelected ? "text-emerald-300" : "text-emerald-400/70"} />;
    }
    return <FileCode size={16} className={isSelected ? "text-indigo-300" : "text-slate-500"} />;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-4xl w-full h-[88vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              <Code2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Inspecteur de Code & Configuration (Firebase & Android)
              </h3>
              <p className="text-xs text-slate-400">
                Configurations Firebase Cloud, Room Database, WorkManager et FLAG_SECURE
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex flex-1 overflow-hidden">
          {/* File Selector Sidebar */}
          <div className="w-56 sm:w-68 bg-slate-950/70 border-r border-slate-800 p-3 overflow-y-auto space-y-1.5 flex-shrink-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
              Fichiers du Projet ({KOTLIN_SOURCE_FILES.length})
            </p>

            {KOTLIN_SOURCE_FILES.map((file, idx) => {
              const isSelected = selectedFileIndex === idx;
              const badge = getFileBadge(file.filename);
              return (
                <button
                  key={file.filename}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between text-xs font-semibold cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {getFileIcon(file.filename, isSelected)}
                    <div className="truncate">
                      <span className="block truncate">{file.filename}</span>
                      <span className="text-[9px] opacity-70 block truncate font-mono">
                        {file.packagePath}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${badge.bg}`}>
                    {badge.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Code View Area */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            {/* File Info Bar */}
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-mono text-amber-300 text-[11px] block">
                  {activeFile.filename} • {activeFile.packagePath}
                </span>
                <p className="text-slate-300 font-semibold">{activeFile.description}</p>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow transition-colors cursor-pointer"
              >
                {copiedIndex === selectedFileIndex ? (
                  <>
                    <Check size={14} className="text-emerald-300" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copier le Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Text Area */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-amber-100 bg-slate-950/90 leading-relaxed scrollbar-thin selection:bg-indigo-700 selection:text-white">
              <pre className="whitespace-pre">{activeFile.code}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Layers size={14} className="text-amber-400" />
            <span>Synchronisation Firestore & Architecture Android Complète</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
