import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Camera,
  FileText,
  X,
  RotateCcw,
  BookOpen,
  Copy,
  Check,
  GraduationCap,
  Lightbulb,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Eye,
  SlidersHorizontal,
  UploadCloud,
  CheckCircle2,
  HelpCircle,
  Lock,
  LogIn,
  Maximize2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { UserProfile } from "../types";
import { supabase } from "../lib/supabaseClient";

export interface AttachedFile {
  name: string;
  mimeType: string;
  base64: string;
  size: number;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachment?: {
    name: string;
    mimeType: string;
    base64: string;
    size?: number;
  };
}

interface AITutorTabProps {
  user: UserProfile | null;
  onOpenLogin?: () => void;
  onNavigateHome?: () => void;
}

const SUBJECT_SUGGESTIONS: Record<string, string[]> = {
  "Mathématiques": [
    "Aide-moi sur le théorème de Pythagore",
    "Comment factoriser avec les identités remarquables ?",
    "Résolution d'équation du 2nd degré avec le discriminant Δ",
    "Calculer les coordonnées du milieu d'un segment",
  ],
  "Physique-Chimie": [
    "Différence entre le poids et la masse ?",
    "Explique-moi la formule de la loi d'Ohm : U = R × I",
    "Comment équilibrer une équation chimique ?",
    "Qu'est-ce que l'énergie cinétique Ec = 1/2 m v² ?",
  ],
  "SVT": [
    "Différence entre mitose et méiose",
    "Qu'est-ce que la photosynthèse et ses étapes ?",
    "Transmission des caractères héréditaires (génétique)",
    "Rôle des globules blancs dans l'immunité",
  ],
  "Français": [
    "Introduction de dissertation pas à pas",
    "Figures de style incontournables (BFEM / BAC)",
    "Méthode pour réussir le commentaire composé",
    "Accord du participe passé avec l'auxiliaire avoir",
  ],
  "Histoire-Géo": [
    "Causes de la Seconde Guerre mondiale",
    "Méthode pour commenter une carte géographique",
    "Étapes de la décolonisation en Afrique de l'Ouest",
    "Enjeux de la mondialisation au Sénégal",
  ],
};

const SUBJECT_LIST = [
  "Mathématiques",
  "Physique-Chimie",
  "SVT",
  "Français",
  "Histoire-Géo",
  "Anglais",
  "Philosophie",
];

// Markdown & KaTeX Math Renderer for live message bubbles
const MathMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-sm prose-invert max-w-none text-slate-100 text-xs sm:text-[13px] leading-relaxed select-text">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          h1: ({ children }) => (
            <h3 className="font-black text-sm sm:text-base text-amber-300 mt-2 mb-1 border-b border-slate-700/80 pb-1">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="font-extrabold text-xs sm:text-sm text-indigo-300 mt-2 mb-1">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="font-bold text-xs text-slate-200 mt-1.5 mb-1">
              {children}
            </h5>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-4 sm:pl-5 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 sm:pl-5 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="my-0.5 leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-bold text-amber-300">
              {children}
            </strong>
          ),
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code
                className="px-1.5 py-0.5 bg-slate-900 text-amber-300 rounded font-mono text-[11px] border border-slate-700"
                {...props}
              >
                {children}
              </code>
            ) : (
              <pre className="p-3 bg-slate-950 text-slate-100 rounded-xl overflow-x-auto my-2 text-[11px] font-mono border border-slate-800">
                <code>{children}</code>
              </pre>
            ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-amber-400 pl-3 my-2 text-slate-300 italic bg-slate-900/60 py-1 rounded-r-lg">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Progressive Typewriter message with instant click-to-complete
const TypewriterMessage: React.FC<{
  content: string;
  isLatest: boolean;
  onScrollRequested?: () => void;
}> = ({ content, isLatest, onScrollRequested }) => {
  const [displayedText, setDisplayedText] = useState(isLatest ? "" : content);
  const [isTyping, setIsTyping] = useState(isLatest);

  useEffect(() => {
    if (!isLatest) {
      setDisplayedText(content);
      setIsTyping(false);
      return;
    }

    let index = 0;
    setDisplayedText("");
    setIsTyping(true);

    const step = Math.max(3, Math.ceil(content.length / 50));
    const interval = setInterval(() => {
      index += step;
      if (index >= content.length) {
        setDisplayedText(content);
        setIsTyping(false);
        clearInterval(interval);
      } else {
        setDisplayedText(content.slice(0, index));
      }
      onScrollRequested?.();
    }, 15);

    return () => clearInterval(interval);
  }, [content, isLatest]);

  return (
    <div
      onClick={() => {
        if (isTyping) {
          setDisplayedText(content);
          setIsTyping(false);
        }
      }}
      className={isTyping ? "cursor-pointer group relative" : ""}
      title={isTyping ? "Cliquer pour afficher tout le texte immédiatement" : undefined}
    >
      <MathMarkdownRenderer content={displayedText} />
      {isTyping && (
        <span className="inline-flex items-center space-x-1 mt-1.5 text-[10px] text-amber-400 font-mono animate-pulse">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          <span>Génération pédagogique en cours...</span>
        </span>
      )}
    </div>
  );
};

export const AITutorTab: React.FC<AITutorTabProps> = ({ 
  user,
  onOpenLogin,
  onNavigateHome,
}) => {
  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans max-w-xl mx-auto my-auto animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 space-y-5 w-full">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center mx-auto text-[#1A237E] shadow-inner relative">
            <Sparkles size={36} className="text-[#1A237E] animate-pulse" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
              <Lock size={13} />
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 rounded-full border border-amber-300">
              Espace Protégé • Compte Gratuit
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Tuteur IA Pédagogique 24h/24
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Le Tuteur IA analyse vos photos d'exercices, résout des équations mathématiques en LaTeX et vous guide pas à pas. Pour mémoriser vos échanges et adapter les explications à votre classe, la connexion est requise.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Explications adaptées au programme officiel du Sénégal</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Reconnaissance d'images d'exercices et dictée vocale</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>Historique de révision sauvegardé sur votre compte</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-400/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              <LogIn size={18} />
              <span>Se connecter ou Créer un compte</span>
            </button>
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
              >
                Retourner à l'Accueil libre
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const userLevel = user.level || "3ème";
  const studentName = user.displayName || "Élève";

  const [selectedSubject, setSelectedSubject] = useState("Mathématiques");
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Attachment state (image / PDF)
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Fullscreen Math Formula Modal State
  const [fullscreenFormulaContent, setFullscreenFormulaContent] = useState<string | null>(null);
  const [formulaZoom, setFormulaZoom] = useState<number>(1);

  const hasMathContent = (text: string) => {
    return (
      text.includes("$") ||
      text.includes("\\(") ||
      text.includes("\\[") ||
      text.includes("\\frac") ||
      text.includes("\\sqrt") ||
      text.includes("\\Delta") ||
      text.includes("\\sum") ||
      text.includes("\\int") ||
      text.includes("=")
    );
  };

  // Permissions Center Modal
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("savoir_tutor_messages_" + user.uid);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: "welcome_1",
        role: "assistant",
        content: `Bonjour **${studentName}** ! 👋 Je suis ton **Tuteur IA Génie Mentor Académie (GMA)**, ton assistant d'excellence pour la classe de **${userLevel}** au Sénégal.\n\nJe t'aide à comprendre tes leçons, résoudre tes problèmes et corriger tes devoirs :\n* 📸 **Envoie la photo d'un exercice** (ou un fichier PDF) grâce aux boutons ci-dessous pour que je vérifie tes calculs.\n* 🎙️ **Pose ta question à l'oral** avec la dictée vocale en un clic.\n* 📐 **Formules et équations** ($x^2$, $\\Delta$, fractions) sont résolues étape par étape selon les programmes officiels (BFEM & BAC).\n\nQuelle matière ou notion souhaites-tu travailler aujourd'hui ?`,
        timestamp: Date.now(),
      },
    ];
  });

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Check if user has started chatting
  const hasStartedChatting = messages.some((m) => m.role === "user");

  // Check microphone permission state on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((permissionStatus) => {
          setHasMicPermission(permissionStatus.state === "granted");
          permissionStatus.onchange = () => {
            setHasMicPermission(permissionStatus.state === "granted");
          };
        })
        .catch(() => {
          setHasMicPermission(null);
        });
    }
  }, []);

  // Auto-scroll to bottom function
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isLoading, attachedFile]);

  // Persist conversation
  useEffect(() => {
    try {
      if (user?.uid) {
        localStorage.setItem(
          "savoir_tutor_messages_" + user.uid,
          JSON.stringify(messages)
        );
      }
    } catch {}
  }, [messages, user?.uid]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [inputMessage]);

  // Handle Image Selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("La photo est trop volumineuse (maximum 10 Mo).");
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachedFile({
        name: file.name || "photo_exercice.jpg",
        mimeType: file.type || "image/jpeg",
        base64,
        size: file.size,
        previewUrl: base64,
      });
      setInfoNotice(`Photo "${file.name}" chargée avec succès ! Cliquez sur Envoyer.`);
      setTimeout(() => setInfoNotice(null), 4000);
    };
    reader.readAsDataURL(file);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Handle PDF Selection
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Le document PDF est trop volumineux (maximum 10 Mo).");
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachedFile({
        name: file.name || "document.pdf",
        mimeType: "application/pdf",
        base64,
        size: file.size,
        previewUrl: undefined,
      });
      setInfoNotice(`Document PDF "${file.name}" chargé avec succès !`);
      setTimeout(() => setInfoNotice(null), 4000);
    };
    reader.readAsDataURL(file);

    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  };

  // Trigger Native Permission Check / Request
  const requestMicrophonePermission = async () => {
    setErrorMessage(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setErrorMessage("L'accès micro n'est pas supporté par ce navigateur.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      setInfoNotice("Microphone autorisé avec succès ! 🎙️");
      setTimeout(() => setInfoNotice(null), 3000);
      stream.getTracks().forEach((track) => track.stop());
      setIsPermissionsModalOpen(false);
    } catch {
      setHasMicPermission(false);
      setErrorMessage("Autorisation du micro refusée. Veuillez l'activer dans les paramètres de votre navigateur.");
    }
  };

  // Start Voice Recording with Web Speech API + Gemini Audio Fallback
  const startRecording = async () => {
    setErrorMessage(null);

    // 1. Try Web Speech API for instant client-side French speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let hasSpeechRecognition = false;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "fr-FR";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let liveTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            liveTranscript += event.results[i][0].transcript;
          }
          if (liveTranscript) {
            setInputMessage((prev) => {
              const base = prev.trim();
              return base ? `${base} ${liveTranscript}` : liveTranscript;
            });
          }
        };

        recognition.onerror = () => {
          // Fallback seamlessly to MediaRecorder
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
        hasSpeechRecognition = true;
      } catch {
        hasSpeechRecognition = false;
      }
    }

    // 2. Start MediaRecorder for backup high-fidelity Gemini transcription
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        if (!hasSpeechRecognition) {
          setErrorMessage("La dictée vocale n'est pas supportée sur ce navigateur.");
        }
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);

      // Determine supported mimeType on device
      let selectedMime = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          selectedMime = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          selectedMime = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/aac")) {
          selectedMime = "audio/aac";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMime });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMime });
        stream.getTracks().forEach((track) => track.stop());

        // If Web Speech didn't add text during this recording, send audio blob to Gemini
        await processAudioTranscription(audioBlob, selectedMime);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      if (!hasSpeechRecognition) {
        setIsPermissionsModalOpen(true);
        setErrorMessage("Veuillez autoriser le microphone pour utiliser la dictée vocale.");
      }
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const processAudioTranscription = async (audioBlob: Blob, mimeType: string) => {
    if (audioBlob.size < 200) return;
    setIsTranscribing(true);
    setErrorMessage(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const res = await fetch("/api/gemini/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType,
          }),
        });

        const data = await res.json();
        if (data.text) {
          setInputMessage((prev) => {
            const trimmed = prev.trim();
            const transcription = data.text.trim();
            if (!trimmed) return transcription;
            if (trimmed.includes(transcription)) return trimmed;
            return `${trimmed} ${transcription}`;
          });
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch {
      // Quiet error fallback
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend !== undefined ? textToSend : inputMessage).trim();
    const currentAttachment = attachedFile;

    if ((!messageText && !currentAttachment) || isLoading) return;

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: `msg_usr_${Date.now()}`,
      role: "user",
      content: messageText || (currentAttachment ? `[Pièce jointe : ${currentAttachment.name}]` : ""),
      timestamp: Date.now(),
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            mimeType: currentAttachment.mimeType,
            base64: currentAttachment.base64,
            size: currentAttachment.size,
          }
        : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    try {
      const historyToSend = [...messages, userMsg].filter((m) => m.id !== "welcome_1");
      const payloadMessages = (historyToSend.length > 0 ? historyToSend : [userMsg]).map(
        (m) => ({
          role: m.role,
          content: m.content,
          attachment: m.attachment,
        })
      );

      // Source d'autorité : extraction de l'UID et du token depuis la session active
      let authUid = user?.uid || user?.id || "";
      let authToken = "";
      if (supabase) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            authToken = sessionData.session.access_token || "";
            if (sessionData.session.user?.id) {
              authUid = sessionData.session.user.id;
            }
          }
        } catch {}
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      if (authUid) headers["X-User-UID"] = authUid;

      const response = await fetch("/api/gemini/tutor", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: payloadMessages,
          subject: selectedSubject,
          level: userLevel,
          studentName,
          userId: authUid,
          userUid: authUid,
        }),
      });

      const data = await response.json();

      if (data.text) {
        const botMsg: ChatMessage = {
          id: `msg_bot_${Date.now()}`,
          role: "assistant",
          content: data.text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(data.details || data.error || "Erreur de réponse");
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content:
          "Désolé, je rencontre une petite difficulté de connexion. Peux-tu reformuler ta question ou vérifier ta connexion internet ?",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const resetWelcome: ChatMessage = {
      id: `welcome_${Date.now()}`,
      role: "assistant",
      content: `Nouvelle discussion commencée pour **${studentName}** (${userLevel}) en **${selectedSubject}** !\n\nPose ta question, joins une photo d'exercice ou dicte ta question au micro.`,
      timestamp: Date.now(),
    };
    setMessages([resetWelcome]);
    setAttachedFile(null);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatTimeHHMM = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const currentSuggestions =
    SUBJECT_SUGGESTIONS[selectedSubject] || SUBJECT_SUGGESTIONS["Mathématiques"];

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden bg-slate-950 text-slate-100 relative rounded-none sm:rounded-3xl border-0 sm:border border-slate-800 shadow-2xl">
      {/* Hidden File Inputs for Camera / Photos and PDF Documents */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={pdfInputRef}
        onChange={handlePdfFileChange}
        accept="application/pdf"
        className="hidden"
      />

      {/* 1. HERO BANNER & HEADER (STYLE PAGE DE COURS / EXERCICES) */}
      <header className="shrink-0 bg-gradient-to-r from-[#1A237E] via-indigo-950 to-slate-900 border-b border-indigo-500/30 text-white z-10 shadow-lg">
        {/* Ligne 1 : Titre + Niveau + Actions globales */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 border-b border-white/10">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Avatar IA animé */}
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0 ring-2 ring-amber-300/50">
                <Sparkles size={22} className="text-[#1A237E] animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#1A237E] rounded-full animate-ping" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#1A237E] rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-sm sm:text-base text-white tracking-tight truncate">
                  Tuteur IA Pédagogique
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-wider shrink-0">
                  En direct
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-200 truncate flex items-center space-x-1.5 font-medium">
                <span className="text-amber-300 font-bold">{userLevel}</span>
                <span>•</span>
                <span>Correction d'exercices & Formules LaTeX</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Bouton Centre des Autorisations */}
            <button
              type="button"
              onClick={() => setIsPermissionsModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-indigo-100 hover:text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 border border-white/15 active:scale-95 shadow-xs"
              title="Gérer les autorisations (Micro & Photos)"
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="hidden md:inline">Autorisations</span>
            </button>

            {/* Bouton Nouveau Chat */}
            <button
              type="button"
              onClick={handleClearHistory}
              className="px-2.5 sm:px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center space-x-1.5 border border-amber-400/40 active:scale-95 shadow-xs"
              title="Nouvelle conversation"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Nouveau chat</span>
            </button>
          </div>
        </div>

      {/* Ligne 2 : Sélecteur horizontal de matière (visible sur mobile et tablette < lg) */}
        <div className="lg:hidden px-3.5 sm:px-5 py-2 flex items-center space-x-1.5 overflow-x-auto scrollbar-none bg-slate-900/60 backdrop-blur">
          <span className="text-[11px] font-extrabold text-amber-300 shrink-0 mr-1 flex items-center space-x-1">
            <BookOpen size={13} />
            <span>Matière :</span>
          </span>
          {SUBJECT_LIST.map((subj) => {
            const isSelected = selectedSubject === subj;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 font-black shadow-md scale-[1.02] ring-2 ring-amber-300/40"
                    : "bg-white/10 hover:bg-white/20 text-indigo-100 border border-white/10 hover:border-white/25"
                }`}
              >
                {subj}
              </button>
            );
          })}
        </div>
      </header>

      {/* DESKTOP 2-COLUMN WRAPPER (Barre latérale sur grand écran + Zone de Chat fluide) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* PANNEAU LATÉRAL DESKTOP (Affiché uniquement sur PC / Écrans larges lg+) */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 bg-slate-900 border-r border-slate-800 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center space-x-1 mb-2">
              <BookOpen size={13} />
              <span>Matières ({userLevel})</span>
            </span>
            <div className="space-y-1">
              {SUBJECT_LIST.map((subj) => {
                const isSelected = selectedSubject === subj;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubject(subj)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-400 text-slate-950 font-black shadow-md"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <span>{subj}</span>
                    {isSelected && <Sparkles size={13} className="text-[#1A237E]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suggestions fréquentes pour la matière active sur Desktop */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center space-x-1 mb-2">
              <Lightbulb size={13} />
              <span>Questions Types ({selectedSubject})</span>
            </span>
            <div className="space-y-1.5">
              {currentSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(sug)}
                  disabled={isLoading}
                  className="w-full p-2 bg-slate-800/80 hover:bg-indigo-900/60 text-slate-300 hover:text-white rounded-xl text-[11px] font-medium text-left border border-slate-700 hover:border-amber-400 transition-all cursor-pointer leading-snug flex items-center justify-between gap-1 group active:scale-98"
                >
                  <span className="truncate">{sug}</span>
                  <ArrowRight size={11} className="text-amber-400 opacity-60 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Badge Profil Encadreur Massaw Seck */}
          <div className="mt-auto pt-3 border-t border-slate-800">
            <div className="p-3 bg-gradient-to-br from-[#1A237E] to-slate-900 rounded-2xl border border-indigo-500/40 text-left space-y-1 shadow-sm">
              <div className="flex items-center space-x-1.5">
                <GraduationCap size={14} className="text-amber-400" />
                <span className="text-xs font-black text-white">M. Massaw Seck</span>
              </div>
              <p className="text-[10px] text-indigo-200 leading-tight">
                Licencié Maths & Info • Encadreur Pédagogique Polymathe
              </p>
            </div>
          </div>
        </aside>

        {/* COLONNE PRINCIPALE DE DISCUSSION */}
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-slate-950">
          {/* Bannière d'information ou notification */}
          {infoNotice && (
            <div className="shrink-0 px-4 py-2 bg-emerald-950/80 border-b border-emerald-800 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{infoNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setInfoNotice(null)}
                className="text-emerald-400 font-bold ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Alerte d'erreur éventuelle */}
          {errorMessage && (
            <div className="shrink-0 px-4 py-2 bg-rose-950/80 border-b border-rose-800 text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-200 font-bold ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

      {/* 2. ZONE CENTRALE DES MESSAGES (OCCUPE TOUT L'ESPACE ET DÉFILE) */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4 bg-gradient-to-b from-slate-950 via-slate-900/70 to-slate-950 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        {/* Liste des bulles de discussion */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`w-full flex ${
                isUser ? "justify-end" : "justify-start"
              } animate-in fade-in duration-200`}
            >
              {/* Message de l'Élève : Alignement à DROITE, bleu/indigo */}
              {isUser ? (
                <div className="flex flex-col items-end max-w-[88%] sm:max-w-[80%] self-end">
                  <div className="rounded-2xl rounded-br-sm bg-gradient-to-r from-indigo-600 via-indigo-700 to-[#1A237E] text-white p-3.5 sm:p-4 shadow-lg border border-indigo-400/40 text-xs sm:text-[13px] leading-relaxed break-words space-y-2">
                    {/* Render attachment if present */}
                    {msg.attachment && (
                      <div className="rounded-xl overflow-hidden bg-indigo-950/70 border border-indigo-400/50 p-1.5 shadow-xs">
                        {msg.attachment.mimeType.startsWith("image/") ? (
                          <div
                            onClick={() => setLightboxImage(msg.attachment!.base64)}
                            className="relative group cursor-pointer overflow-hidden rounded-lg max-h-56 bg-slate-950 flex items-center justify-center"
                          >
                            <img
                              src={msg.attachment.base64}
                              alt={msg.attachment.name}
                              className="max-h-56 object-contain group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 text-white font-bold text-xs backdrop-blur-xs">
                              <Eye size={16} className="text-amber-400" />
                              <span>Cliquer pour agrandir la photo</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2.5 p-2.5 bg-slate-900/90 rounded-lg text-xs text-indigo-200">
                            <FileText size={22} className="text-amber-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold truncate text-white">{msg.attachment.name}</p>
                              <span className="text-[10px] text-indigo-300">Document PDF • {formatFileSize(msg.attachment.size)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text content */}
                    {msg.content && msg.content !== `[Pièce jointe : ${msg.attachment?.name}]` && (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center space-x-1 font-medium">
                    <span>{formatTimeHHMM(msg.timestamp)}</span>
                    <span className="text-indigo-400 font-black">✓✓</span>
                  </span>
                </div>
              ) : (
                /* Réponses du Tuteur IA : Alignement à GAUCHE avec avatar doré */
                <div className="flex items-start space-x-2.5 sm:space-x-3 max-w-[94%] sm:max-w-[86%] self-start">
                  {/* Petit avatar d'IA */}
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md mt-0.5 ring-1 ring-amber-300/40">
                    <Sparkles size={17} className="text-[#1A237E]" />
                  </div>

                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <div className="rounded-2xl rounded-bl-sm bg-slate-800/95 border border-slate-700/80 text-slate-100 shadow-lg p-3.5 sm:p-4 text-xs sm:text-[13px] leading-relaxed break-words w-full">
                      {/* Entête dans la bulle tuteur */}
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2 text-[10px] text-slate-400">
                        <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                          <GraduationCap size={14} className="text-amber-400" />
                          <span>Tuteur GMA</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-indigo-900/60 text-indigo-300 rounded font-mono">
                            {selectedSubject}
                          </span>
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {hasMathContent(msg.content) && (
                            <button
                              type="button"
                              onClick={() => {
                                setFullscreenFormulaContent(msg.content);
                                setFormulaZoom(1);
                              }}
                              className="px-2 py-0.5 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-md transition-colors cursor-pointer flex items-center space-x-1 font-semibold"
                              title="Afficher les formules et calculs mathématiques en plein écran"
                            >
                              <Maximize2 size={11} />
                              <span className="hidden xs:inline">Plein Écran</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="px-2 py-0.5 hover:bg-slate-700 rounded-md transition-colors cursor-pointer flex items-center space-x-1 text-slate-400 hover:text-slate-200"
                            title="Copier la réponse"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400 font-bold">Copié</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copier</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Contenu rendu avec Typewriter + Markdown + LaTeX */}
                      <TypewriterMessage
                        content={msg.content}
                        isLatest={idx === messages.length - 1}
                        onScrollRequested={() => scrollToBottom("smooth")}
                      />
                    </div>

                    <span className="text-[10px] text-slate-500 mt-1 px-1 font-medium">
                      {formatTimeHHMM(msg.timestamp)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Indicateur de saisie en direct du tuteur */}
        {isLoading && (
          <div className="flex items-start space-x-2.5 sm:space-x-3 self-start max-w-[85%] animate-in fade-in">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles size={17} className="text-[#1A237E] animate-spin" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-slate-800/90 border border-slate-700/80 p-3.5 shadow-lg flex items-center space-x-2.5 text-xs text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
              <span className="font-bold text-slate-200 ml-1 text-xs">
                Le Tuteur analyse et rédige sa réponse pédagogique...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. SUGGESTIONS RAPIDES : DISPARAISSENT DÈS QUE LA DISCUSSION COMMENCE */}
      {!hasStartedChatting && (
        <div className="shrink-0 px-3.5 sm:px-5 py-2 bg-slate-900/95 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto scrollbar-none z-10 animate-in fade-in duration-200">
          <span className="text-[10px] font-extrabold text-amber-400 shrink-0 flex items-center space-x-1">
            <Lightbulb size={13} className="text-amber-400" />
            <span>Suggestions :</span>
          </span>
          {currentSuggestions.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(sug)}
              className="px-3 py-1 bg-slate-800 hover:bg-indigo-900 text-slate-200 hover:text-white rounded-full text-[11px] font-medium border border-slate-700 hover:border-amber-400 transition-all whitespace-nowrap active:scale-95 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <span>{sug}</span>
              <ArrowRight size={11} className="text-amber-400 opacity-80" />
            </button>
          ))}
        </div>
      )}

      {/* 4. PRÉVISUALISATION DE LA PIÈCE JOINTE AVANT ENVOI */}
      {attachedFile && (
        <div className="shrink-0 px-4 py-2.5 bg-indigo-950/90 border-t border-indigo-800/80 flex items-center justify-between z-10 animate-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-3 min-w-0">
            {attachedFile.previewUrl ? (
              <img
                src={attachedFile.previewUrl}
                alt="Preview"
                className="w-11 h-11 object-cover rounded-xl border-2 border-amber-400 shrink-0 shadow-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-indigo-900 text-amber-300 flex items-center justify-center shrink-0 border border-indigo-600 shadow-md">
                <FileText size={22} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-xs">
                {attachedFile.name}
              </p>
              <span className="text-[10px] text-amber-300 font-semibold">
                {attachedFile.mimeType.startsWith("image/") ? "Photo d'exercice" : "Document PDF"} • {formatFileSize(attachedFile.size)} • Prêt à l'analyse
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="p-1.5 bg-indigo-900 hover:bg-rose-900 text-indigo-200 hover:text-white rounded-full transition-colors cursor-pointer border border-indigo-700"
            title="Supprimer la pièce jointe"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 5. BARRE DE COMMANDE & SAISIE ULTRA-ÉPURÉE POUR MOBILE */}
      <footer className="shrink-0 p-2 sm:p-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-10 space-y-1.5">
        {/* BANDEAU COMPACT : BOUTONS PHOTO & PDF */}
        <div className="flex items-center justify-between gap-1.5 px-0.5">
          <div className="flex items-center space-x-1.5">
            {/* Bouton PHOTO */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isLoading || isRecording}
              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center space-x-1 shadow-xs active:scale-95 shrink-0"
              title="Prendre une photo ou choisir dans la galerie"
            >
              <Camera size={14} className="text-[#1A237E]" />
              <span>Photo</span>
            </button>

            {/* Bouton PDF */}
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isLoading || isRecording}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 border border-slate-700 active:scale-95 shrink-0 shadow-xs"
              title="Importer un fichier PDF"
            >
              <FileText size={13} className="text-amber-400" />
              <span>PDF</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-500 hidden sm:block">
            GMA • Appareil photo & LaTeX
          </div>
        </div>

        {/* Bandeau d'enregistrement vocal actif avec onde animée */}
        {isRecording && (
          <div className="px-3 py-1.5 bg-rose-950/90 border border-rose-700 rounded-xl flex items-center justify-between text-xs text-rose-100 animate-pulse shadow-md">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono font-bold text-amber-300 text-[11px]">
                Parlez au micro... ({formatTimer(recordingTime)})
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
            >
              Terminer
            </button>
          </div>
        )}

        {/* Bandeau de transcription en cours */}
        {isTranscribing && (
          <div className="px-3 py-1 bg-indigo-950/90 border border-indigo-700 rounded-xl flex items-center space-x-2 text-[11px] text-indigo-300">
            <span className="w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Transcription en cours...</span>
          </div>
        )}

        {/* Formulaire d'envoi mobile compact (Microphone symbole seul + Textarea + Envoyer) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end space-x-1.5"
        >
          {/* Bouton Microphone (Symbole seul, sans texte pour éviter l'encombrement) */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || isTranscribing}
            className={`p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer shrink-0 active:scale-95 flex items-center justify-center ${
              isRecording
                ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            }`}
            title={isRecording ? "Arrêter l'enregistrement" : "Microphone"}
            aria-label="Microphone"
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} className="text-amber-400" />}
          </button>

          {/* Champ de texte multi-lignes */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                attachedFile
                  ? `Question sur "${attachedFile.name}"...`
                  : `Pose ta question en ${selectedSubject}...`
              }
              disabled={isLoading || isRecording}
              className="w-full resize-none p-2.5 sm:p-3 max-h-28 bg-slate-800/95 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 focus:outline-none rounded-2xl text-xs sm:text-[13px] text-white leading-relaxed placeholder:text-slate-400 shadow-inner"
            />
          </div>

          {/* Bouton Envoyer compact */}
          <button
            type="submit"
            disabled={(!inputMessage.trim() && !attachedFile) || isLoading || isRecording}
            className={`p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer shrink-0 active:scale-95 flex items-center justify-center ${
              (inputMessage.trim() || attachedFile) && !isLoading && !isRecording
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-400/25 ring-1 ring-amber-300/40 scale-102"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60"
            }`}
            title="Envoyer"
            aria-label="Envoyer"
          >
            <Send size={18} className={inputMessage.trim() || attachedFile ? "text-[#1A237E]" : ""} />
          </button>
        </form>
      </footer>
        </div>
      </div>

      {/* MODAL DU CENTRE DES AUTORISATIONS (MICRO, CAMÉRA, GALERIE) */}
      {isPermissionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">Centre des Autorisations</h3>
                  <p className="text-[11px] text-slate-400">Pour le Tuteur IA & vos révisions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPermissionsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1 : Microphone */}
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center shrink-0">
                    <Mic size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Microphone</p>
                    <p className="text-[10px] text-slate-400 truncate">Pour poser vos questions à la voix</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={requestMicrophonePermission}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                    hasMicPermission
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                  }`}
                >
                  {hasMicPermission ? "Autorisé ✅" : "Autoriser"}
                </button>
              </div>

              {/* Option 2 : Appareil photo & Galerie */}
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                    <Camera size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Caméra & Galerie (Photos)</p>
                    <p className="text-[10px] text-slate-400 truncate">Pour scanner ou importer vos exercices</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsPermissionsModalOpen(false);
                    imageInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  Tester 📷
                </button>
              </div>

              {/* Option 3 : Documents PDF */}
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Documents PDF (Devoirs)</p>
                    <p className="text-[10px] text-slate-400 truncate">Pour faire corriger vos sujets complets</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsPermissionsModalOpen(false);
                    pdfInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0"
                >
                  Choisir 📄
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Vos fichiers et audios sont traités en toute sécurité et ne sont jamais partagés avec des tiers.
            </p>

            <button
              type="button"
              onClick={() => setIsPermissionsModalOpen(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-indigo-600/25"
            >
              Fermer et retourner au Tuteur
            </button>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX POUR AGRANDIR LES IMAGES JOINTES */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImage}
              alt="Agrandissement exercice"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-700"
            />
          </div>
        </div>
      )}

      {/* MODAL PLEIN ÉCRAN POUR LES FORMULES ET CALCULS MATHÉMATIQUES */}
      {fullscreenFormulaContent && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Affichage Plein Écran des Formules & Démonstrations
                  </h3>
                  <p className="text-[11px] text-amber-300">
                    Rendu haute résolution KaTeX • {selectedSubject} ({userLevel})
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setFormulaZoom((prev) => Math.max(0.8, prev - 0.15))}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  title="Diminuer la taille"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFormulaZoom(1)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  title="Taille normale (100%)"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setFormulaZoom((prev) => Math.min(2, prev + 0.15))}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  title="Agrandir la taille"
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenFormulaContent(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer ml-1"
                  title="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body taking 100% full width and height */}
            <div className="p-4 sm:p-8 flex-1 overflow-y-auto overflow-x-auto select-text fullscreen-formula-view bg-slate-950/60">
              <div style={{ transform: `scale(${formulaZoom})`, transformOrigin: "top left", width: formulaZoom > 1 ? `${100 * formulaZoom}%` : "100%" }}>
                <MathMarkdownRenderer content={fullscreenFormulaContent} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
