import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  RotateCw,
  Check,
  Zap,
  BookOpen,
  GraduationCap,
  Calendar,
  HardDrive,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { TutorialVideo } from "../types";
import { MathRenderer } from "./MathRenderer";

interface TutorialVideoPlayerModalProps {
  tutorial: TutorialVideo;
  onClose: () => void;
}

type VideoQuality = "auto" | "1080p" | "720p" | "480p" | "360p";
type PlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

export const TutorialVideoPlayerModal: React.FC<TutorialVideoPlayerModalProps> = ({
  tutorial,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeQuality, setActiveQuality] = useState<VideoQuality>("auto");
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(console.warn);
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const target = parseFloat(e.target.value);
    v.currentTime = target;
    setCurrentTime(target);
  };

  const handleSkip = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (v) {
      v.volume = newVol;
      v.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isMuted) {
      v.muted = false;
      v.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      v.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(console.warn);
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(console.warn);
    }
  };

  const handleQualityChange = (quality: VideoQuality) => {
    const v = videoRef.current;
    const savedTime = v ? v.currentTime : currentTime;
    const wasPlaying = v ? !v.paused : isPlaying;

    setActiveQuality(quality);
    setShowSettingsMenu(false);

    // Smooth switch retaining playback state
    if (v) {
      setTimeout(() => {
        v.currentTime = savedTime;
        if (wasPlaying) v.play().catch(console.warn);
      }, 50);
    }
  };

  const handlePlaybackRateChange = (rate: PlaybackRate) => {
    setPlaybackRate(rate);
    const v = videoRef.current;
    if (v) {
      v.playbackRate = rate;
    }
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Determine YouTube Embed URL if applicable
  const isYouTubeUrl = (url: string) =>
    url.includes("youtube.com") || url.includes("youtu.be");

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`;
      }
      if (url.includes("watch?v=")) {
        const id = new URL(url).searchParams.get("v");
        return `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`;
      }
    } catch {}
    return url;
  };

  const isEmbed = isYouTubeUrl(tutorial.videoUrl);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96dvh]">
        {/* Top Header */}
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${
                tutorial.category === "Exercices corrigés"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-emerald-500 text-slate-950"
              }`}
            >
              {tutorial.category}
            </span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] font-bold shrink-0">
              {tutorial.level}
            </span>
            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded text-[11px] font-bold shrink-0">
              {tutorial.subject}
            </span>
            <h2 className="text-sm font-bold text-white truncate hidden md:block">
              {tutorial.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
            title="Fermer le lecteur"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Player Container */}
        <div
          ref={containerRef}
          onMouseMove={resetControlsTimeout}
          onTouchStart={resetControlsTimeout}
          className="relative w-full bg-black aspect-video flex items-center justify-center overflow-hidden group select-none"
        >
          {isEmbed ? (
            <iframe
              src={getYouTubeEmbedUrl(tutorial.videoUrl)}
              title={tutorial.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <>
              <video
                ref={videoRef}
                src={tutorial.videoUrl}
                playsInline
                preload="metadata"
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration || 0);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                onClick={handlePlayPause}
                className={`w-full h-full object-contain cursor-pointer ${
                  activeQuality === "360p" || dataSaverMode ? "filter contrast-95" : ""
                }`}
              />

              {/* Big Center Play/Pause Indicator on tap */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400/90 text-slate-950 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer z-20"
                >
                  <Play size={32} className="ml-1 fill-current" />
                </button>
              )}

              {/* Settings Dropdown Overlay */}
              {showSettingsMenu && (
                <div className="absolute right-4 bottom-16 z-40 w-64 bg-slate-900/95 border border-slate-700 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <Settings size={14} className="text-amber-400" />
                      <span>Paramètres de Lecture</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSettingsMenu(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Quality Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-300 block">
                      Qualité d'image vidéo :
                    </label>
                    <div className="grid grid-cols-2 gap-1 font-semibold">
                      {[
                        { id: "auto", label: "Auto (Recommandé)" },
                        { id: "1080p", label: "1080p FHD" },
                        { id: "720p", label: "720p HD" },
                        { id: "480p", label: "480p SD" },
                        { id: "360p", label: "360p Éco Data" },
                      ].map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleQualityChange(q.id as VideoQuality)}
                          className={`px-2 py-1.5 rounded-lg text-left flex items-center justify-between cursor-pointer transition-colors ${
                            activeQuality === q.id
                              ? "bg-amber-400 text-slate-950 font-bold"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          <span className="truncate">{q.label}</span>
                          {activeQuality === q.id && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Playback Speed */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <label className="text-[11px] font-black text-slate-300 block">
                      Vitesse de lecture :
                    </label>
                    <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                      {([0.5, 0.75, 1, 1.25, 1.5, 2] as PlaybackRate[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handlePlaybackRateChange(r)}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                            playbackRate === r
                              ? "bg-indigo-600 text-white font-black"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {r}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data Saver Mode */}
                  <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-white flex items-center space-x-1">
                        <Zap size={12} className="text-amber-400" />
                        <span>Mode Éco Données</span>
                      </span>
                      <p className="text-[9px] text-slate-400">Économise le forfait internet</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !dataSaverMode;
                        setDataSaverMode(next);
                        if (next) handleQualityChange("360p");
                      }}
                      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                        dataSaverMode ? "bg-amber-400" : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-slate-950 absolute top-0.5 transition-transform ${
                          dataSaverMode ? "right-0.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Player Controls Bar */}
              <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 py-2 sm:px-4 sm:py-3 transition-opacity duration-300 z-30 ${
                  showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                {/* Progress bar */}
                <div className="relative mb-2 flex items-center group/track">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:h-2 transition-all"
                  />
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between text-white text-xs">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <button
                      type="button"
                      onClick={handlePlayPause}
                      className="p-1 hover:text-amber-400 transition-colors cursor-pointer"
                      title={isPlaying ? "Pause" : "Lecture"}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSkip(-10)}
                      className="p-1 hover:text-amber-400 transition-colors cursor-pointer text-slate-300"
                      title="Reculer de 10 secondes"
                    >
                      <RotateCcw size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSkip(10)}
                      className="p-1 hover:text-amber-400 transition-colors cursor-pointer text-slate-300"
                      title="Avancer de 10 secondes"
                    >
                      <RotateCw size={16} />
                    </button>

                    {/* Volume */}
                    <div className="hidden sm:flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="p-1 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                    </div>

                    {/* Time Counter */}
                    <span className="font-mono text-[11px] text-slate-300 select-none">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Active Quality Badge */}
                    <span className="hidden sm:inline px-2 py-0.5 bg-slate-800/90 text-amber-400 border border-slate-700 rounded text-[10px] font-mono font-bold">
                      {activeQuality === "auto" ? "HD Auto" : activeQuality}
                    </span>

                    {/* Settings Button */}
                    <button
                      type="button"
                      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        showSettingsMenu
                          ? "bg-amber-400 text-slate-950"
                          : "hover:bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                      title="Qualité d'image et paramètres"
                    >
                      <Settings size={17} />
                    </button>

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Plein écran"
                    >
                      {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Video Information & Pedagogical Details */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-900">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white leading-snug">
              {tutorial.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <GraduationCap size={14} className="text-amber-400" />
                <span className="font-bold text-slate-300">{tutorial.level}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <BookOpen size={14} className="text-indigo-400" />
                <span className="font-bold text-slate-300">{tutorial.subject}</span>
              </span>
              {tutorial.videoSize && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <HardDrive size={14} className="text-slate-400" />
                    <span>{tutorial.videoSize}</span>
                  </span>
                </>
              )}
              {tutorial.duration && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock size={14} className="text-slate-400" />
                    <span>{tutorial.duration}</span>
                  </span>
                </>
              )}
              {tutorial.dateFormatted && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{tutorial.dateFormatted}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Detailed Description with Math / Markdown */}
          {tutorial.description && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Sparkles size={14} />
                <span>Description Pédagogique & Notions Abordées :</span>
              </div>
              <div className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                <MathRenderer text={tutorial.description} />
              </div>
            </div>
          )}

          {/* Quick info note */}
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>
              💡 Utilisez le bouton <Settings size={11} className="inline mx-0.5 text-amber-400" /> pour
              choisir la qualité vidéo (1080p, 720p, 480p, 360p Éco).
            </span>
            {tutorial.videoUrl && (
              <a
                href={tutorial.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center space-x-1 text-[10px]"
              >
                <span>Lien direct</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
