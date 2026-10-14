import React, { useState, useRef } from "react";
import { Asset, Course } from "../types";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize, 
  Download, 
  CheckCircle, 
  FileText, 
  Eye, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sparkles,
  ExternalLink,
  BookOpen
} from "lucide-react";

interface DocumentViewerModalProps {
  asset?: Asset | null;
  course?: Course | null;
  videoUrl?: string | null;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  onToggleCacheAsset?: (assetId: string) => void;
  isCached?: boolean;
  onToggleCache?: () => void;
  onToggleOfflineCache?: (ast: Asset) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  asset,
  course,
  videoUrl,
  title,
  isOpen,
  onClose,
  onToggleCacheAsset,
  isCached,
  onToggleCache,
  onToggleOfflineCache,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewMode, setViewMode] = useState<"reader" | "text" | "video">(() => 
    videoUrl ? "video" : "reader"
  );
  
  // Video player controls state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  if (!isOpen) return null;

  const docName = title || asset?.name || course?.title || "Document";
  const fileType = asset?.type || "pdf";
  const fileUrl = asset?.downloadUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  const currentVideoUrl = videoUrl || (fileType === "video" ? fileUrl : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const toggleFullScreen = () => {
    const modalElem = document.getElementById("media-modal-container");
    if (modalElem) {
      if (!document.fullscreenElement) {
        modalElem.requestFullscreen().catch((err) => console.log(err));
      } else {
        document.exitFullscreen().catch((err) => console.log(err));
      }
    }
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <div 
        id="media-modal-container"
        className="bg-slate-900 text-slate-100 rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header Toolbar */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1A237E] text-amber-300 font-extrabold flex items-center justify-center uppercase shadow flex-shrink-0">
              {videoUrl ? <Play size={20} /> : fileType}
            </div>

            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                {docName}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center space-x-2">
                {asset && <span>Taille : {asset.size}</span>}
                {asset && <span>•</span>}
                <span className="text-amber-300 font-semibold uppercase">
                  {videoUrl ? "Capsule Vidéo de Cours" : `Format ${fileType.toUpperCase()}`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* View Mode Switcher if course exists */}
            {course && (
              <div className="hidden sm:flex rounded-xl bg-slate-800 p-1 border border-slate-700">
                <button
                  onClick={() => setViewMode("reader")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    viewMode === "reader" ? "bg-[#1A237E] text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Document
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    viewMode === "text" ? "bg-[#1A237E] text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Texte Cours
                </button>
              </div>
            )}

            {/* Offline Cache Toggle */}
            {asset && onToggleCacheAsset && (
              <button
                onClick={() => onToggleCacheAsset(asset.assetId)}
                className={`hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-bold items-center space-x-1.5 transition-colors ${
                  asset.isCachedOffline
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                }`}
              >
                {asset.isCachedOffline ? <CheckCircle size={14} /> : <Download size={14} />}
                <span>{asset.isCachedOffline ? "En cache Room" : "Mettre en cache"}</span>
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullScreen}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Plein écran"
            >
              <Maximize2 size={16} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Control Sub-bar for PDF / Zoom */}
        {viewMode === "reader" && !videoUrl && (
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Zoom Arrière"
              >
                <ZoomOut size={16} />
              </button>
              <span className="font-mono text-amber-300 font-bold min-w-[45px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Zoom Avant"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Réinitialiser"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg flex items-center space-x-1 transition-colors"
              >
                <ExternalLink size={12} />
                <span>Ouvrir dans un nouvel onglet</span>
              </a>
            </div>
          </div>
        )}

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-3 relative">
          {videoUrl || viewMode === "video" ? (
            /* Video Capsule Player */
            <div className="w-full h-full flex flex-col items-center justify-center max-w-3xl mx-auto space-y-4">
              <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800 group">
                <video
                  ref={videoRef}
                  src={currentVideoUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[60vh] object-contain mx-auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>

              {/* Video Speed Selector */}
              <div className="flex items-center space-x-2 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Vitesse de lecture :</span>
                {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all ${
                      playbackRate === speed
                        ? "bg-amber-400 text-slate-950 shadow"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          ) : viewMode === "text" && course ? (
            /* Text Article View */
            <div className="w-full max-w-2xl bg-white text-slate-800 p-6 rounded-2xl shadow-xl overflow-y-auto max-h-[75vh] space-y-4 leading-relaxed text-xs sm:text-sm">
              <div className="border-b border-slate-200 pb-3">
                <span className="px-2.5 py-0.5 bg-[#1A237E] text-white font-bold text-xs rounded-md">
                  {course.subject} • {course.level}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-2">{course.title}</h2>
                <p className="text-xs text-slate-500">{course.chapter}</p>
              </div>

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 font-medium text-indigo-900 text-xs">
                <strong>Résumé : </strong> {course.summary}
              </div>

              <div className="space-y-3 font-sans">
                {course.content.split("\n\n").map((para, i) => (
                  <p key={i} className="whitespace-pre-line text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ) : fileType === "image" ? (
            /* Interactive Image Lightbox */
            <div 
              className="transition-transform duration-200 ease-out flex items-center justify-center h-full w-full"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <img
                src={fileUrl}
                alt={docName}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            </div>
          ) : (
            /* Interactive PDF / Document Embedded Iframe / Render View */
            <div 
              className="w-full h-full transition-transform duration-200 ease-out flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
            >
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0`}
                title={docName}
                className="w-full h-full min-h-[65vh] rounded-2xl bg-white border border-slate-800 shadow-2xl"
              />
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span>Visualiseur de Documents & Media GMA Sénégal</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
          >
            Fermer le visualiseur
          </button>
        </div>
      </div>
    </div>
  );
};
