import React, { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Download, FileText, Image as ImageIcon, Sparkles } from "lucide-react";

interface FullscreenDocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileData: string;
  fileName: string;
  fileType?: string;
  title?: string;
  subtitle?: string;
}

export const FullscreenDocumentViewerModal: React.FC<FullscreenDocumentViewerModalProps> = ({
  isOpen,
  onClose,
  fileData,
  fileName,
  fileType = "",
  title = "Visualisation du Document",
  subtitle,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setRotation(0);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !fileData) return null;

  const isImage =
    fileType.startsWith("image/") ||
    fileData.startsWith("data:image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);

  const isPdf =
    fileType.includes("pdf") ||
    fileData.startsWith("data:application/pdf") ||
    /\.pdf$/i.test(fileName);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3.0));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Controls Bar */}
      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800 text-white rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-2xl shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-bold shrink-0">
            {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold truncate text-white">
              {title || fileName}
            </h3>
            <p className="text-[10px] text-slate-400 truncate">
              {subtitle ? `${subtitle} • ` : ""}
              {fileName} ({Math.round(zoomLevel * 100)}%)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {isImage && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                title="Zoom arrière"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Réinitialiser"
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                100%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.0}
                title="Zoom avant"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Pivoter 90°"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}

          <a
            href={fileData}
            download={fileName || "document_savoirplus"}
            className="px-2.5 sm:px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition-colors flex items-center space-x-1"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Télécharger</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            title="Fermer (Échap)"
            className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer ml-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Document Viewer Canvas */}
      <div className="w-full flex-1 max-w-5xl my-2 sm:my-3 rounded-2xl overflow-auto bg-slate-900/60 border border-slate-800 flex items-center justify-center p-2 sm:p-4">
        {isImage ? (
          <div
            className="transition-transform duration-150 ease-out flex items-center justify-center min-h-full"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
          >
            <img
              src={fileData}
              alt={fileName}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : isPdf ? (
          <div className="w-full h-full min-h-[70vh] rounded-xl overflow-hidden bg-white">
            <iframe
              src={fileData}
              title={fileName}
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="text-center p-8 space-y-3 bg-slate-800 rounded-2xl border border-slate-700 max-w-md">
            <FileText size={48} className="text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">{fileName}</h4>
            <p className="text-xs text-slate-300">
              Format de fichier : {fileType || "Document"}
            </p>
            <a
              href={fileData}
              download={fileName}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow"
            >
              <Download size={15} />
              <span>Télécharger pour visualiser</span>
            </a>
          </div>
        )}
      </div>

      {/* Bottom helper info */}
      <div className="text-center text-[11px] text-slate-400 py-1">
        Génie Mentor Académie (GMA) • Appuyez sur <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px]">Échap</kbd> ou cliquez sur le bouton rouge pour fermer.
      </div>
    </div>
  );
};
