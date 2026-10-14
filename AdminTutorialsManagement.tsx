import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Plus,
  Upload,
  Link as LinkIcon,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
  GraduationCap,
  HardDrive,
  RefreshCw,
  Search,
  Smartphone,
  Eye,
  FileVideo,
} from "lucide-react";
import { TutorialVideo, SecondaryLevel, Subject, TutorialCategory } from "../types";
import { ALL_LEVELS, ALL_SUBJECTS, getSubjectsForLevel, normalizeLevel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { uploadCourseVideoToSupabase } from "../data/supabaseStorage";
import { supabase } from "../lib/supabaseClient";
import { TutorialVideoPlayerModal } from "./TutorialVideoPlayerModal";
import { MathLiveEditor } from "./MathLiveEditor";

interface AdminTutorialsManagementProps {
  onSuccessMessage?: (msg: string) => void;
}

export const AdminTutorialsManagement: React.FC<AdminTutorialsManagementProps> = ({
  onSuccessMessage,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Existing Tutorials List
  const [tutorials, setTutorials] = useState<TutorialVideo[]>(() => roomRepo.getAllTutorials());

  // Form State
  const [title, setTitle] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<SecondaryLevel>("3ème");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("Maths");
  const [category, setCategory] = useState<TutorialCategory>("Exercices corrigés");
  const [description, setDescription] = useState("");
  const [videoSourceType, setVideoSourceType] = useState<"file" | "url">("file");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string>("");
  const [durationStr, setDurationStr] = useState("");

  // Upload Progress & Submitting
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setLocalSuccessMessage] = useState("");

  // Preview Modal
  const [previewTutorial, setPreviewTutorial] = useState<TutorialVideo | null>(null);

  // Search & Filter in list
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Subscribe to changes
  useEffect(() => {
    const unsub = roomRepo.subscribe(() => {
      setTutorials(roomRepo.getAllTutorials());
    });
    return () => unsub();
  }, []);

  // Update available subjects when level changes
  const availableSubjects = getSubjectsForLevel(selectedLevel);
  useEffect(() => {
    if (!availableSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0] || "Maths");
    }
  }, [selectedLevel]);

  // Handle Video File Selection (from phone gallery or camera)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMessage("");
    if (!file) return;

    // Check 2GB Limit (2 * 1024 * 1024 * 1024 bytes = 2,147,483,648 bytes)
    const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const msg = `Fichier trop volumineux ! La taille maximale autorisée est de 2 Go. Votre fichier pèse ${(file.size / (1024 * 1024 * 1024)).toFixed(2)} Go.`;
      setErrorMessage(msg);
      alert(msg);
      setSelectedFile(null);
      setFileSizeFormatted("");
      if (e.target) e.target.value = "";
      return;
    }

    setSelectedFile(file);

    // Format human-readable size
    let sizeStr = "";
    if (file.size >= 1024 * 1024 * 1024) {
      sizeStr = `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} Go`;
    } else {
      sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} Mo`;
    }
    setFileSizeFormatted(sizeStr);

    // Create local preview blob URL if URL field is empty
    const localBlobUrl = URL.createObjectURL(file);
    setVideoUrl(localBlobUrl);

    // Auto-detect video duration if possible
    try {
      const tempVideo = document.createElement("video");
      tempVideo.preload = "metadata";
      tempVideo.src = localBlobUrl;
      tempVideo.onloadedmetadata = () => {
        const secs = Math.round(tempVideo.duration);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        setDurationStr(`${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`);
      };
    } catch {}
  };

  // Submit and save new tutorial
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLocalSuccessMessage("");

    if (!title.trim()) {
      setErrorMessage("Veuillez renseigner un titre pour le tutoriel.");
      return;
    }

    if (!videoUrl.trim() && !selectedFile) {
      setErrorMessage("Veuillez sélectionner un fichier vidéo ou saisir une URL valide.");
      return;
    }

    // Validation de taille avant l'envoi
    if (selectedFile) {
      const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024;
      if (selectedFile.size > MAX_SIZE_BYTES) {
        const msg = `Le fichier vidéo (${fileSizeFormatted}) dépasse la taille maximale autorisée de 2 Go.`;
        setErrorMessage(msg);
        alert(msg);
        setUploadPercent(0);
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(true);
    setUploadPercent(5);

    try {
      let finalVideoUrl = videoUrl.trim();

      // Si un fichier vidéo local est sélectionné, téléverser vers Supabase Storage dans le bucket 'videos'
      if (selectedFile) {
        setUploadPercent(15);

        if (!supabase) {
          throw new Error("Le client Supabase n'est pas configuré. Vérifiez vos variables d'environnement.");
        }

        const rawName = selectedFile.name || "video.mp4";
        const fileExt = rawName.split(".").pop() || "mp4";
        const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
        const cleanBaseName = rawName
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 35);
        const filePath = `videos/video_${Date.now()}_${cleanBaseName}.${cleanExt}`;

        setUploadPercent(25);

        // Téléversement direct dans le bucket 'videos' de Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("videos")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          let detailedMsg = uploadError.message;
          const lowerMsg = (uploadError.message || "").toLowerCase();

          if (lowerMsg.includes("payload too large") || lowerMsg.includes("exceeded") || lowerMsg.includes("entity too large") || lowerMsg.includes("413")) {
            detailedMsg = `La taille du fichier (${fileSizeFormatted}) dépasse la limite configurée sur le bucket Supabase Storage : ${uploadError.message}`;
          } else if (lowerMsg.includes("row-level security") || lowerMsg.includes("rls") || lowerMsg.includes("policy") || lowerMsg.includes("permission") || lowerMsg.includes("unauthorized") || lowerMsg.includes("403")) {
            detailedMsg = `Droits RLS manquants ou non autorisés sur le bucket 'videos' : ${uploadError.message}. Veuillez vérifier les politiques de Supabase Storage.`;
          } else if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out") || lowerMsg.includes("network") || lowerMsg.includes("failed to fetch")) {
            detailedMsg = `Délai d'attente dépassé (timeout) ou problème de connexion réseau : ${uploadError.message}`;
          } else if (lowerMsg.includes("bucket not found") || lowerMsg.includes("does not exist")) {
            detailedMsg = `Le bucket de stockage 'videos' est introuvable sur Supabase : ${uploadError.message}`;
          }

          throw new Error(detailedMsg);
        }

        setUploadPercent(85);

        // Obtenir l'URL publique de la vidéo
        const { data: urlData } = supabase.storage
          .from("videos")
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          throw new Error("Impossible de générer l'URL publique pour la vidéo téléversée.");
        }

        finalVideoUrl = urlData.publicUrl;
      }

      setUploadPercent(95);

      const now = Date.now();
      const dateFormatted = new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date());

      const newTutorial: TutorialVideo = {
        id: `tut_${now}_${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim(),
        level: selectedLevel,
        subject: selectedSubject,
        category,
        description: description.trim(),
        videoUrl: finalVideoUrl,
        videoFileName: selectedFile?.name || undefined,
        videoSize: fileSizeFormatted || undefined,
        duration: durationStr.trim() || undefined,
        createdAt: now,
        dateFormatted,
      };

      // Save locally & synchronize
      roomRepo.insertTutorial(newTutorial);

      setUploadPercent(100);
      setLocalSuccessMessage("Tutoriel vidéo publié avec succès !");
      if (onSuccessMessage) {
        onSuccessMessage(`Tutoriel "${newTutorial.title}" inséré avec succès !`);
      }

      // Reset form
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      setVideoUrl("");
      setFileSizeFormatted("");
      setDurationStr("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("[Supabase Storage] Error creating tutorial video:", err);
      // Réinitialiser la barre de progression à 0% en cas d'erreur
      setUploadPercent(0);
      const errMsg = err?.message || "Une erreur est survenue lors de l'enregistrement de la vidéo.";
      setErrorMessage(errMsg);
      alert(`Erreur de téléversement : ${errMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete tutorial
  const handleDelete = (id: string, tutTitle: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le tutoriel "${tutTitle}" ?`)) {
      roomRepo.deleteTutorial(id);
    }
  };

  // Filtered list of tutorials for admin view
  const filteredTutorials = tutorials.filter((t) => {
    if (filterClass !== "ALL" && normalizeLevel(t.level) !== normalizeLevel(filterClass)) {
      return false;
    }
    if (filterSubject !== "ALL" && t.subject !== filterSubject) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with smartphone emphasis */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1A237E] rounded-3xl p-4 sm:p-6 text-white border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-black text-amber-400 uppercase tracking-wider">
              <Smartphone size={15} />
              <span>Insertion Mobile & Web (Vidéos jusqu'à 2 Go)</span>
            </div>
            <h2 className="text-xl font-black text-white">Gestionnaire des Tutoriels Vidéos</h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Insérez facilement vos capsules vidéos depuis votre téléphone ou ordinateur :
              sélectionnez la classe, la matière, la catégorie et la description.
            </p>
          </div>

          <span className="px-3 py-1.5 bg-amber-400 text-slate-950 rounded-xl text-xs font-black shrink-0">
            {tutorials.length} vidéo(s) en ligne
          </span>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-3 sm:p-4 text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-3 sm:p-4 text-rose-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <AlertCircle size={18} className="text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* FORMULAIRE D'INSERTION DE VIDÉO (OPTIMISÉ MOBILE) */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5 text-white"
      >
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
            <Plus size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">
              Ajouter une Nouvelle Vidéo Tutoriel
            </h3>
            <p className="text-[11px] text-slate-400">
              Compatible smartphone : sélectionnez directement une vidéo depuis votre galerie.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Titre du tutoriel */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-black text-slate-200 block">
              Titre du tutoriel vidéo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Correction détaillée : Étude de fonctions et limites - BAC S2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          {/* Classe à choisir (Sélection tactile rapide) */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-200 flex items-center space-x-1.5">
              <GraduationCap size={14} className="text-amber-400" />
              <span>Classe à choisir *</span>
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as SecondaryLevel)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            >
              {ALL_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Matière */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-200 flex items-center space-x-1.5">
              <BookOpen size={14} className="text-indigo-400" />
              <span>Matière *</span>
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value as Subject)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            >
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Catégorie : Ressources complémentaires vs Exercices corrigés */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-black text-slate-200 block">
              Type de ressource vidéo *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory("Exercices corrigés")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  category === "Exercices corrigés"
                    ? "bg-amber-400 text-slate-950 border-amber-400 font-black shadow-sm"
                    : "bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-600"
                }`}
              >
                <Sparkles size={16} className={category === "Exercices corrigés" ? "text-slate-950" : "text-amber-400"} />
                <div className="text-left">
                  <div>✍️ Exercices corrigés</div>
                  <div className="text-[10px] opacity-80 font-normal">
                    Résolution pas à pas d'exercices types et sujets d'examen
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCategory("Ressources complémentaires")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  category === "Ressources complémentaires"
                    ? "bg-emerald-500 text-slate-950 border-emerald-500 font-black shadow-sm"
                    : "bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-600"
                }`}
              >
                <BookOpen size={16} className={category === "Ressources complémentaires" ? "text-slate-950" : "text-emerald-400"} />
                <div className="text-left">
                  <div>📚 Ressources complémentaires</div>
                  <div className="text-[10px] opacity-80 font-normal">
                    Explications approfondies de leçons et notions théoriques
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Durée estimée (Optionnel) */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-200 flex items-center space-x-1.5">
              <Clock size={14} className="text-slate-400" />
              <span>Durée de la vidéo (ex: 15:30)</span>
            </label>
            <input
              type="text"
              placeholder="15:30"
              value={durationStr}
              onChange={(e) => setDurationStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          {/* Indicateur de taille maximale */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-200 flex items-center space-x-1.5">
              <HardDrive size={14} className="text-amber-400" />
              <span>Taille maximale autorisée</span>
            </label>
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-300 font-mono flex items-center justify-between">
              <span>Jusqu'à 2 Go (2048 Mo)</span>
              {fileSizeFormatted && (
                <span className="px-2 py-0.5 bg-slate-800 text-white rounded font-bold">
                  Sélectionné : {fileSizeFormatted}
                </span>
              )}
            </div>
          </div>

          {/* Description détaillée */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-200 block">
                Description pédagogique & Notions abordées *
              </label>
              <span className="text-[10px] text-slate-400">Supporte les formules et texte</span>
            </div>
            <textarea
              rows={4}
              required
              placeholder="Expliquez ce qui est démontré dans cette vidéo, les prérequis et les étapes clés de la résolution..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400 resize-y"
            />
          </div>

          {/* INSERTION DE LA VIDÉO (FICHIER OU LIEN) */}
          <div className="sm:col-span-2 space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white flex items-center space-x-1.5">
                <FileVideo size={16} className="text-amber-400" />
                <span>Vidéo à insérer (taille maximale 2 Go) *</span>
              </label>

              {/* Source Switcher */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setVideoSourceType("file")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    videoSourceType === "file"
                      ? "bg-amber-400 text-slate-950 font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Depuis mon téléphone / PC
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSourceType("url")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    videoSourceType === "url"
                      ? "bg-amber-400 text-slate-950 font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Lien URL direct
                </button>
              </div>
            </div>

            {videoSourceType === "file" ? (
              /* DIRECT FILE UPLOAD (PHONE GALLERY / CAMERA / PC) */
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors bg-slate-950/60 flex flex-col items-center justify-center space-y-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-white">
                      {selectedFile
                        ? selectedFile.name
                        : "Appuyez pour sélectionner la vidéo depuis votre téléphone"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Formats acceptés : MP4, WebM, MOV, MKV (taille jusqu'à 2 Go)
                    </p>
                  </div>

                  {fileSizeFormatted && (
                    <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-black shadow-xs">
                      Taille du fichier : {fileSizeFormatted}
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* URL INPUT FIELD */
              <div className="space-y-1.5">
                <div className="relative">
                  <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://... (URL directe MP4, Supabase, YouTube, Google Drive, Vimeo)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Collez le lien direct vers le fichier MP4 ou le lien de partage d'une vidéo déjà hébergée.
                </p>
              </div>
            )}

            {/* Video preview if available */}
            {videoUrl && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Play size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {selectedFile?.name || "Vidéo prête à la diffusion"}
                    </p>
                    <p className="text-[10px] text-emerald-400">
                      Lecteur avec sélecteur de qualité 1080p/720p/480p/360p actif
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewTutorial({
                      id: "preview",
                      title: title || "Aperçu de la vidéo",
                      level: selectedLevel,
                      subject: selectedSubject,
                      category,
                      description,
                      videoUrl,
                      videoSize: fileSizeFormatted,
                      duration: durationStr,
                      createdAt: Date.now(),
                    })
                  }
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0 transition-colors"
                >
                  <Eye size={13} />
                  <span>Tester lecture</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* UPLOAD PROGRESS BAR */}
        {isUploading && (
          <div className="space-y-1.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400 flex items-center space-x-1.5">
                <RefreshCw size={13} className="animate-spin" />
                <span>Téléversement du fichier vidéo en cours...</span>
              </span>
              <span className="font-mono text-white">{uploadPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Veuillez patienter pendant l'envoi de la vidéo vers le stockage cloud.
            </p>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-transform active:scale-98 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>Publication en cours ({uploadPercent}%)...</span>
            </>
          ) : (
            <>
              <Upload size={18} />
              <span>Publier le tutoriel vidéo</span>
            </>
          )}
        </button>
      </form>

      {/* LISTE DES VIDÉOS PUBLIÉES */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
            <Video size={16} className="text-[#1A237E]" />
            <span>Tutoriels Vidéos Publiés ({filteredTutorials.length})</span>
          </h3>

          {/* Quick filters */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700"
            >
              <option value="ALL">Toutes les classes</option>
              {ALL_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700"
            >
              <option value="ALL">Toutes matières</option>
              {ALL_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredTutorials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTutorials.map((tut) => (
              <div
                key={tut.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between space-y-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          tut.category === "Exercices corrigés"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {tut.category}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                        {tut.level}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-[#1A237E] rounded text-[10px] font-bold">
                        {tut.subject}
                      </span>
                    </div>

                    {tut.videoSize && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {tut.videoSize}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                    {tut.title}
                  </h4>

                  {tut.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {tut.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPreviewTutorial(tut)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#1A237E] rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Tester le lecteur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(tut.id, tut.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Supprimer la vidéo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
            Aucun tutoriel vidéo enregistré pour le moment.
          </div>
        )}
      </div>

      {/* PREVIEW VIDEO MODAL WITH QUALITY CONTROLS */}
      {previewTutorial && (
        <TutorialVideoPlayerModal
          tutorial={previewTutorial}
          onClose={() => setPreviewTutorial(null)}
        />
      )}
    </div>
  );
};
