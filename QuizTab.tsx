import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Quiz, QuizQuestion, SecondaryLevel, QuizResultRecord, Subject, QuestionType } from "../types";
import { ALL_LEVELS, STUDENT_LEVELS, getSubjectsForLevel, getLevelLabel, normalizeLevel } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { EditQuizModal } from "./EditQuizModal";
import { AIQuizModifierModal } from "./AIQuizModifierModal";
import { MathRenderer } from "./MathRenderer";
import { getUserStudentId } from "../utils/userUtils";
import { 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Award, 
  RotateCcw, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  BookOpen, 
  Edit3, 
  Trash2, 
  Layers, 
  ArrowLeft, 
  ChevronRight, 
  Calculator, 
  Atom, 
  Compass, 
  BookMarked, 
  Globe2, 
  Languages, 
  GraduationCap,
  CheckSquare,
  CircleDot,
  Save,
  RefreshCw,
  SlidersHorizontal,
  Search,
  X,
  Lock,
  Eye,
} from "lucide-react";

interface QuizTabProps {
  userLevel: SecondaryLevel;
  quizzes: Quiz[];
  isAdmin?: boolean;
  initialSubject?: Subject | null;
  initialSelectedLevel?: SecondaryLevel | "ALL";
}

export const QuizTab: React.FC<QuizTabProps> = ({ 
  userLevel, 
  quizzes, 
  isAdmin, 
  initialSubject = null,
  initialSelectedLevel,
}) => {
  const roomRepo = RoomDatabaseRepository.getInstance();
  const currentUser = roomRepo.getUserProfile();
  const studentUid = currentUser?.uid || "guest";

  // Dynamic level selector (synchronized with external class filter)
  const [adminSelectedLevel, setAdminSelectedLevel] = useState<SecondaryLevel | "ALL">(
    isAdmin ? (initialSelectedLevel || "ALL") : userLevel
  );
  const activeLevel = isAdmin ? (initialSelectedLevel !== undefined ? initialSelectedLevel : adminSelectedLevel) : userLevel;

  // Sync when initialSelectedLevel changes externally
  useEffect(() => {
    if (isAdmin && initialSelectedLevel) {
      setAdminSelectedLevel(initialSelectedLevel);
    }
  }, [initialSelectedLevel, isAdmin]);

  let routeQuizId: string | undefined = undefined;
  let routerNavigate: ((path: string) => void) | null = null;
  try {
    const params = useParams<{ id?: string }>();
    routeQuizId = params.id;
    const nav = useNavigate();
    routerNavigate = (path: string) => nav(path);
  } catch {
    // Non-router fallback
  }

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [aiEditingQuiz, setAiEditingQuiz] = useState<Quiz | null>(null);
  const [activeViewSubject, setActiveViewSubject] = useState<Subject | "ALL" | null>(initialSubject);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Single attempt tracking: student quiz results
  const [studentQuizResults, setStudentQuizResults] = useState<QuizResultRecord[]>(() => {
    return roomRepo.getQuizResultsByStudent(studentUid);
  });

  useEffect(() => {
    setStudentQuizResults(roomRepo.getQuizResultsByStudent(studentUid));
    const unsub = roomRepo.subscribe(() => {
      setStudentQuizResults(roomRepo.getQuizResultsByStudent(studentUid));
    });
    return unsub;
  }, [studentUid, roomRepo]);

  const getExistingResult = (quizId: string): QuizResultRecord | undefined => {
    return studentQuizResults.find((r) => r.quizId === quizId || (r as any).quiz_id === quizId);
  };

  // Selected answers: Record<questionIndex, array of optionIndices>
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  // Auto-start quiz if opened directly via URL /evaluations/quiz/:id
  useEffect(() => {
    if (routeQuizId) {
      const allQ = quizzes.length > 0 ? quizzes : roomRepo.getAllQuizzes();
      const found = allQ.find((q) => q.id === routeQuizId);
      if (found && (!activeQuiz || activeQuiz.id !== routeQuizId)) {
        startQuiz(found, true);
      }
    }
  }, [routeQuizId, quizzes]);

  // Countdown timer state (persisted with fixed target end timestamp)
  const DEFAULT_QUIZ_DURATION_SECONDS = 15 * 60;
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_QUIZ_DURATION_SECONDS);
  const targetEndTimeRef = useRef<number | null>(null);
  const handleSubmitQuizRef = useRef<() => void>(() => {});

  const formatQuizTime = (seconds: number): string => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper functions for question types
  const getQuestionCorrectIndices = (q: QuizQuestion): number[] => {
    if (Array.isArray(q.correctIndices) && q.correctIndices.length > 0) {
      return q.correctIndices;
    }
    if (typeof q.correctIndex === "number" && q.correctIndex >= 0) {
      return [q.correctIndex];
    }
    return [0];
  };

  const isQuestionMultipleChoice = (q: QuizQuestion): boolean => {
    if (q.type === "multiple") return true;
    if (Array.isArray(q.correctIndices) && q.correctIndices.length > 1) return true;
    return false;
  };

  // Restore active quiz from localStorage on mount if student refreshed during an ongoing quiz
  useEffect(() => {
    const savedActiveQuizId = localStorage.getItem(`savoirplus_active_quiz_id_${studentUid}`);
    if (savedActiveQuizId && !activeQuiz) {
      const found = quizzes.find((q) => q.id === savedActiveQuizId);
      if (found) {
        startQuiz(found, true);
      }
    }
  }, [quizzes, studentUid]);

  // Real-time Auto-Save of quiz progress and exact deadline
  useEffect(() => {
    if (activeQuiz && !isSubmitted) {
      const targetEnd = targetEndTimeRef.current || (Date.now() + timeLeft * 1000);
      const draft = {
        quizId: activeQuiz.id,
        currentQuestionIndex,
        selectedAnswers,
        updatedAt: Date.now(),
      };
      try {
        localStorage.setItem(`savoirplus_quiz_draft_${studentUid}_${activeQuiz.id}`, JSON.stringify(draft));
        localStorage.setItem(`savoirplus_active_quiz_id_${studentUid}`, activeQuiz.id);
        const sessionData = {
          timeLeft,
          endTime: targetEnd,
          currentQuestionIndex,
          selectedAnswers,
          updatedAt: Date.now(),
        };
        localStorage.setItem(`savoirplus_quiz_timer_${studentUid}_${activeQuiz.id}`, JSON.stringify(sessionData));
        roomRepo.saveQuizActiveSession(studentUid, activeQuiz.id, sessionData);
      } catch (err) {
        console.warn("Quiz auto-save notice:", err);
      }
    }
  }, [activeQuiz, currentQuestionIndex, selectedAnswers, isSubmitted, studentUid, timeLeft, roomRepo]);

  // Keep handleSubmitQuizRef updated for timer callback
  useEffect(() => {
    handleSubmitQuizRef.current = handleSubmitQuiz;
  });

  // Countdown timer effect: calculates difference against fixed end timestamp every second
  useEffect(() => {
    if (!activeQuiz || isSubmitted) return;

    const timerKey = `savoirplus_quiz_timer_${studentUid}_${activeQuiz.id}`;

    const checkAndTick = () => {
      const targetEnd = targetEndTimeRef.current;
      if (!targetEnd) return;

      const remaining = Math.max(0, Math.floor((targetEnd - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        try {
          localStorage.removeItem(timerKey);
          localStorage.removeItem(`savoirplus_active_quiz_id_${studentUid}`);
          roomRepo.clearQuizActiveSession(studentUid, activeQuiz.id);
        } catch {}
        if (!isSubmittingRef.current && !isSubmitted) {
          setRestoredNotice("⏰ Temps officiel écoulé (00:00) ! Quiz validé et soumis automatiquement.");
          handleSubmitQuizRef.current();
        }
      }
    };

    // Run immediate check
    checkAndTick();

    const timerInterval = setInterval(checkAndTick, 1000);

    return () => clearInterval(timerInterval);
  }, [activeQuiz, isSubmitted, studentUid, roomRepo]);

  // Security / Anti-Cheat: Auto-submit and lock session if student leaves page, switches tab, or closes window
  useEffect(() => {
    if (!activeQuiz || isSubmitted || isAdmin) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current && !isSubmitted) {
        handleSubmitQuizRef.current();
      }
      e.preventDefault();
      e.returnValue = "Attention : quitter cette page validera et bloquera définitivement votre quiz.";
      return e.returnValue;
    };

    const handlePageHide = () => {
      if (!isSubmittingRef.current && !isSubmitted) {
        handleSubmitQuizRef.current();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (!isSubmittingRef.current && !isSubmitted) {
          handleSubmitQuizRef.current();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeQuiz, isSubmitted, isAdmin]);

  const getQuizTotalDurationSeconds = (quiz: Quiz): number => {
    if (quiz.durationSeconds && quiz.durationSeconds > 0) {
      return quiz.durationSeconds;
    }
    const durationMinutes = Math.max(
      1,
      Number(quiz.durationMinutes) ||
        Number((quiz as any).duration_minutes) ||
        (quiz.duration ? parseInt(quiz.duration, 10) : 0) ||
        15
    );
    return durationMinutes * 60;
  };

  // Open a previously completed quiz in read-only review mode
  const openCompletedQuizReview = (quiz: Quiz, result: QuizResultRecord) => {
    setActiveQuiz(quiz);
    setIsSubmitted(true);
    setIsSubmitting(false);
    isSubmittingRef.current = false;

    const reconstructedAnswers: Record<number, number[]> = {};
    if (Array.isArray(result.questionReviews)) {
      result.questionReviews.forEach((review, idx) => {
        if (Array.isArray(review.userAnswerIndices) && review.userAnswerIndices.length > 0) {
          reconstructedAnswers[idx] = review.userAnswerIndices;
        } else if (typeof review.userAnswerIndex === "number" && review.userAnswerIndex >= 0) {
          reconstructedAnswers[idx] = [review.userAnswerIndex];
        } else {
          reconstructedAnswers[idx] = [];
        }
      });
    }
    setSelectedAnswers(reconstructedAnswers);
    setCurrentQuestionIndex(0);
  };

  const startQuiz = (quiz: Quiz, attemptRestore = true) => {
    // Unique Attempt Check: if not admin and already completed, show review directly
    const existing = getExistingResult(quiz.id);
    if (existing && !isAdmin) {
      openCompletedQuizReview(quiz, existing);
      return;
    }

    setActiveQuiz(quiz);
    setIsSubmitted(false);
    setIsSubmitting(false);
    isSubmittingRef.current = false;

    const totalDurationSeconds = getQuizTotalDurationSeconds(quiz);

    if (attemptRestore) {
      const draftKey = `savoirplus_quiz_draft_${studentUid}_${quiz.id}`;
      const timerKey = `savoirplus_quiz_timer_${studentUid}_${quiz.id}`;

      // 1. Attempt to restore timer state (persisted real-time with absolute endTime)
      let savedTimer: any = null;
      const sessionFromRepo = roomRepo.getQuizActiveSession(studentUid, quiz.id);
      if (sessionFromRepo) {
        savedTimer = sessionFromRepo;
      } else {
        const savedTimerRaw = localStorage.getItem(timerKey);
        if (savedTimerRaw) {
          try {
            savedTimer = JSON.parse(savedTimerRaw);
          } catch {}
        }
      }

      if (savedTimer && savedTimer.endTime && typeof savedTimer.endTime === "number") {
        const remainingFromEnd = Math.floor((savedTimer.endTime - Date.now()) / 1000);
        if (remainingFromEnd <= 0) {
          targetEndTimeRef.current = savedTimer.endTime;
          setTimeLeft(0);
        } else {
          targetEndTimeRef.current = savedTimer.endTime;
          setTimeLeft(remainingFromEnd);
        }
      } else {
        const newEndTime = Date.now() + totalDurationSeconds * 1000;
        targetEndTimeRef.current = newEndTime;
        setTimeLeft(totalDurationSeconds);
      }

      // 2. Attempt to restore draft responses
      const savedRaw = localStorage.getItem(draftKey);
      if (savedRaw || sessionFromRepo) {
        try {
          const draft = savedRaw ? JSON.parse(savedRaw) : sessionFromRepo;
          if (draft.quizId === quiz.id || sessionFromRepo) {
            const restoredIndex = Math.min(Math.max(0, draft.currentQuestionIndex || 0), quiz.questions.length - 1);
            setCurrentQuestionIndex(restoredIndex);
            setSelectedAnswers(draft.selectedAnswers || {});
            setRestoredNotice(`Progression restaurée en temps réel (Question ${restoredIndex + 1}/${quiz.questions.length}) 💾`);
            setTimeout(() => setRestoredNotice(null), 4000);
            return;
          }
        } catch (e) {
          console.warn("Quiz progress restore notice:", e);
        }
      }
    } else {
      const newEndTime = Date.now() + totalDurationSeconds * 1000;
      targetEndTimeRef.current = newEndTime;
      setTimeLeft(totalDurationSeconds);
    }

    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
  };

  // Restart from Question #1 WITHOUT resetting timer
  const handleRestartQuizFromBeginning = () => {
    if (!activeQuiz || isSubmitted) return;
    setCurrentQuestionIndex(0);
    setRestoredNotice("Retour à la question #1. Le chronomètre continue de tourner !");
    setTimeout(() => setRestoredNotice(null), 3000);
  };

  const handleSelectOption = (questionIdx: number, optionIdx: number, isMultiple: boolean) => {
    if (isSubmitted || timeLeft <= 0) return;
    if (isMultiple) {
      // Toggle checkbox
      const current = selectedAnswers[questionIdx] || [];
      const next = current.includes(optionIdx)
        ? current.filter((idx) => idx !== optionIdx)
        : [...current, optionIdx].sort();
      setSelectedAnswers((prev) => ({ ...prev, [questionIdx]: next }));
    } else {
      // Single radio button
      setSelectedAnswers((prev) => ({ ...prev, [questionIdx]: [optionIdx] }));
    }
  };

  const isQuestionAnswerCorrect = (q: QuizQuestion, qIdx: number): boolean => {
    const chosen = (selectedAnswers[qIdx] || []).slice().sort();
    const correct = getQuestionCorrectIndices(q).slice().sort();
    if (chosen.length !== correct.length) return false;
    return chosen.every((val, i) => val === correct[i]);
  };

  const calculateScore = () => {
    if (!activeQuiz) return 0;
    let correctCount = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (isQuestionAnswerCorrect(q, idx)) {
        correctCount++;
      }
    });
    return Math.round((correctCount / activeQuiz.questions.length) * 100);
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    // Anti-Double-Click & Concurrency Guard: Lock immediately on first trigger
    if (isSubmittingRef.current || isSubmitted) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setIsSubmitted(true);

    // Clear local auto-save draft and timer on final submission
    localStorage.removeItem(`savoirplus_quiz_draft_${studentUid}_${activeQuiz.id}`);
    localStorage.removeItem(`savoirplus_quiz_timer_${studentUid}_${activeQuiz.id}`);
    localStorage.removeItem(`savoirplus_active_quiz_id_${studentUid}`);
    roomRepo.clearQuizActiveSession(studentUid, activeQuiz.id);

    let correctCount = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (isQuestionAnswerCorrect(q, idx)) {
        correctCount++;
      }
    });

    const scorePct = Math.round((correctCount / activeQuiz.questions.length) * 100);
    const score20 = Math.round((correctCount / activeQuiz.questions.length) * 20 * 10) / 10;

    const user = roomRepo.getUserProfile();
    const studentId = user?.uid || "user_guest";
    const studentName = user?.displayName || "Élève";

    const questionReviews = activeQuiz.questions.map((q, idx) => {
      const userAnsIndices = selectedAnswers[idx] || [];
      const correctIndices = getQuestionCorrectIndices(q);
      const isCorrect = isQuestionAnswerCorrect(q, idx);

      return {
        questionId: q.id,
        question: q.question,
        options: q.options,
        type: isQuestionMultipleChoice(q) ? ("multiple" as QuestionType) : ("single" as QuestionType),
        userAnswerIndex: userAnsIndices.length > 0 ? userAnsIndices[0] : -1,
        userAnswerIndices: userAnsIndices,
        correctIndex: correctIndices[0] || 0,
        correctIndices: correctIndices,
        explanation: q.explanation,
        isCorrect,
      };
    });

    const studentMatricule = getUserStudentId(user);

    // Idempotent deterministic record ID per user & quiz to strictly prevent duplicates
    const resultRecord: QuizResultRecord = {
      id: `res_${studentId}_${activeQuiz.id}`,
      studentId,
      studentMatricule,
      matricule: studentMatricule,
      studentName,
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      subject: activeQuiz.subject,
      level: activeQuiz.level,
      scorePercentage: scorePct,
      score20,
      totalQuestions: activeQuiz.questions.length,
      correctAnswers: correctCount,
      date: new Date().toLocaleDateString("fr-FR"),
      timestamp: Date.now(),
      questionReviews,
    };

    roomRepo.addQuizResult(studentId, resultRecord);
    setTimeout(() => {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }, 1000);
  };

  const handleQuitQuiz = () => {
    if (!activeQuiz) return;
    if (!isSubmitted && !isAdmin) {
      if (
        confirm(
          "⚠️ Attention : Quitter le quiz entraînera la soumission et le verrouillage immédiat de votre tentative avec vos réponses enregistrées à cet instant.\n\nVoulez-vous vraiment quitter et valider ?"
        )
      ) {
        handleSubmitQuiz();
      }
    } else {
      resetActiveQuiz();
    }
  };

  const resetActiveQuiz = () => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    if (activeQuiz && !isSubmitted) {
      // Keep draft in case user returns later, but clear active display
      localStorage.removeItem(`savoirplus_active_quiz_id_${studentUid}`);
    }
    setActiveQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    if (routeQuizId && routerNavigate) {
      routerNavigate("/evaluations");
    }
  };

  const handleDeleteQuiz = (quiz: Quiz) => {
    if (confirm(`Voulez-vous supprimer le quiz "${quiz.title}" ?`)) {
      roomRepo.deleteQuiz(quiz.id);
      if (activeQuiz?.id === quiz.id) {
        resetActiveQuiz();
      }
    }
  };

  // Filter quizzes by active level and allowed subjects
  const availableSubjects = activeLevel === "ALL" 
    ? ["Maths", "Physique-Chimie", "SVT", "Français", "Histoire-Géo", "Anglais", "Philo"] as Subject[]
    : getSubjectsForLevel(activeLevel);

  const levelQuizzes = (isAdmin ? (roomRepo.getAllQuizzes() || quizzes) : quizzes).filter((q) => {
    const matchesLevel = activeLevel === "ALL" || q.level === activeLevel || normalizeLevel(q.level) === normalizeLevel(activeLevel);
    const matchesSubject = activeLevel === "ALL" || availableSubjects.includes(q.subject);
    return matchesLevel && matchesSubject;
  });

  // Count quizzes per subject
  const getSubjectQuizCount = (subj: Subject) => {
    return levelQuizzes.filter((q) => q.subject === subj).length;
  };

  const getSubjectIcon = (subj: Subject) => {
    switch (subj) {
      case "Maths":
      case "Mathématiques":
        return <Calculator size={22} className="text-[#1A237E]" />;
      case "Physique-Chimie":
        return <Atom size={22} className="text-[#1A237E]" />;
      case "SVT":
        return <Compass size={22} className="text-[#1A237E]" />;
      case "Français":
        return <BookMarked size={22} className="text-[#1A237E]" />;
      case "Histoire-Géo":
        return <Globe2 size={22} className="text-[#1A237E]" />;
      case "Anglais":
        return <Languages size={22} className="text-[#1A237E]" />;
      case "Philo":
        return <GraduationCap size={22} className="text-[#1A237E]" />;
      default:
        return <BookOpen size={22} className="text-[#1A237E]" />;
    }
  };

  // Filtered quizzes for the selected subject view with fluid 2-filter system (Matière + Recherche)
  const displayedQuizzes = levelQuizzes.filter((q) => {
    const matchesSubject = activeViewSubject === "ALL" || q.subject === activeViewSubject;
    const matchesSearch = !searchQuery.trim() ||
      (q.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.subject || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="w-full max-w-full space-y-4 pb-20 min-w-0 animate-in fade-in duration-200">
      {/* Quiz Mode: 1. Subject Hub or 2. Subject Quizzes List or 3. Active Quiz */}
      {!activeQuiz ? (
        <div className="space-y-4">
          {/* VIEW 1: SUBJECT SELECTION HUB */}
          {activeViewSubject === null ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                    <Layers size={18} className="text-[#1A237E]" />
                    <span>Choisissez une matière pour accéder aux Quiz QCM :</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cliquez sur une matière ci-dessous pour voir ses séries de questions et débuter votre test.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveViewSubject("ALL")}
                  className="px-3 py-1.5 text-xs font-bold text-[#1A237E] bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl transition-colors shrink-0 cursor-pointer shadow-2xs"
                >
                  Voir tous les quiz ({levelQuizzes.length})
                </button>
              </div>

              {/* Grid of Clickable Subject Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableSubjects.map((subj) => {
                  const count = getSubjectQuizCount(subj);
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setActiveViewSubject(subj)}
                      className="bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-[#1A237E] p-4 rounded-2xl transition-all shadow-2xs hover:shadow-md text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {getSubjectIcon(subj)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-[#1A237E] transition-colors truncate">
                            {subj}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {count > 0 ? `${count} quiz disponible${count > 1 ? "s" : ""}` : "Quiz bientôt disponible"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-indigo-50 text-[#1A237E] border border-indigo-200 group-hover:bg-[#1A237E] group-hover:text-white transition-all flex items-center space-x-1">
                          <span>Accéder</span>
                          <ChevronRight size={14} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VIEW 2: QUIZZES FOR SELECTED SUBJECT */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveViewSubject(null)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all flex items-center space-x-1.5 text-xs font-bold shrink-0 cursor-pointer"
                    title="Revenir au choix des matières"
                  >
                    <ArrowLeft size={16} />
                    <span>Matières</span>
                  </button>

                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center space-x-2 truncate">
                      <span>Quiz QCM :</span>
                      <span className="text-[#1A237E] bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200 truncate">
                        {activeViewSubject === "ALL" ? "Toutes les matières" : activeViewSubject}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {activeLevel === "ALL" ? "Toutes les classes" : `Classe de ${getLevelLabel(activeLevel)}`} • {displayedQuizzes.length} quiz disponible(s)
                    </p>
                  </div>
                </div>

                {/* Quick Switch Subject Chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveViewSubject("ALL")}
                    className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeViewSubject === "ALL"
                        ? "bg-[#1A237E] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Tous
                  </button>
                  {availableSubjects.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setActiveViewSubject(subj)}
                      className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                        activeViewSubject === subj
                          ? "bg-[#1A237E] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre 2: Barre de recherche rapide de quiz */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
                <input
                  type="text"
                  placeholder={`Rechercher un quiz (${activeViewSubject === "ALL" ? "Toutes matières" : activeViewSubject})...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E] text-slate-800 placeholder-slate-400 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {displayedQuizzes.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
                  <HelpCircle size={36} className="mx-auto text-slate-300 mb-1" />
                  <h3 className="font-bold text-slate-700 text-sm">Aucun quiz disponible pour cette matière</h3>
                  <p className="text-xs text-slate-500">
                    Aucun quiz enregistré pour {activeViewSubject} {activeLevel === "ALL" ? "" : `en classe de ${getLevelLabel(activeLevel)}`}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveViewSubject(null)}
                    className="mt-2 px-3 py-1.5 bg-indigo-50 text-[#1A237E] hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1"
                  >
                    <ArrowLeft size={14} />
                    <span>Choisir une autre matière</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {displayedQuizzes.map((quiz) => {
                    const existingResult = getExistingResult(quiz.id);
                    const isLocked = !isAdmin && !!existingResult;

                    return (
                      <div
                        key={quiz.id}
                        className={`bg-white rounded-2xl p-4 border transition-all flex items-center justify-between gap-3 shadow-xs ${
                          isLocked ? "border-amber-200/80 bg-amber-50/20" : "border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-[#1A237E] font-bold text-xs rounded-md border border-indigo-100">
                              {quiz.subject}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-md">
                              {getLevelLabel(quiz.level)}
                            </span>
                            <span className="text-xs text-slate-500 font-medium flex items-center space-x-1">
                              <Clock size={12} />
                              <span>
                                {quiz.questions.length} question(s) • {quiz.durationMinutes || (quiz.durationSeconds ? Math.ceil(quiz.durationSeconds / 60) : 0) || (quiz.duration ? parseInt(quiz.duration, 10) : 0) || 15} min
                              </span>
                            </span>
                            {isLocked && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] rounded-md flex items-center space-x-1">
                                <Lock size={11} className="text-amber-700" />
                                <span>
                                  Verrouillé 🔒 (Note : {existingResult.score20 !== undefined ? `${existingResult.score20}/20` : `${existingResult.scorePercentage}%`})
                                </span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm truncate">{quiz.title}</h3>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {isAdmin && (
                            <div className="flex items-center space-x-1.5 bg-amber-50 p-1 rounded-xl border border-amber-200">
                              <button
                                type="button"
                                onClick={() => setAiEditingQuiz(quiz)}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-[#1A237E] to-indigo-800 hover:from-indigo-900 hover:to-[#1A237E] text-amber-300 font-black text-xs rounded-lg flex items-center space-x-1 transition-all shadow-xs border border-amber-400/40 cursor-pointer"
                                title="Modifier ce quiz avec le Co-pilote IA"
                              >
                                <Sparkles size={13} className="text-amber-400" />
                                <span>✨ Modifier avec l'IA</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingQuiz(quiz)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-lg flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                                title="Modifier manuellement ce Quiz QCM"
                              >
                                <Edit3 size={14} />
                                <span className="hidden sm:inline">Modifier</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuiz(quiz)}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                                title="Supprimer ce Quiz"
                              >
                                <Trash2 size={14} />
                                <span className="hidden sm:inline">Supprimer</span>
                              </button>
                            </div>
                          )}

                          {isLocked ? (
                            <button
                              type="button"
                              onClick={() => openCompletedQuizReview(quiz, existingResult)}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                              title="Consulter vos réponses et explications"
                            >
                              <Eye size={14} />
                              <span>Voir mon corrigé & note</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (routerNavigate) {
                                  routerNavigate(`/evaluations/quiz/${quiz.id}`);
                                } else {
                                  startQuiz(quiz);
                                }
                              }}
                              className="px-4 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                            >
                              <span>Démarrer le Quiz</span>
                              <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE QUIZ INTERFACE */
        <div className="space-y-4">
          {/* Active Quiz Header & Session Status */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between flex-wrap gap-2 shadow-xs">
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-indigo-50 text-[#1A237E] font-bold text-xs rounded-md border border-indigo-100">
                  {activeQuiz.subject}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Classe de {getLevelLabel(activeQuiz.level)}
                </span>
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <Save size={10} className="text-emerald-600" />
                  <span>Auto-save actif</span>
                </span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 mt-1 truncate">
                {activeQuiz.title}
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              {/* Interactive Countdown Timer */}
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 transition-all ${
                  timeLeft < 120
                    ? "bg-rose-50 border-2 border-rose-500 text-rose-600 animate-pulse font-black shadow-xs"
                    : "bg-indigo-50 border-indigo-200 text-[#1A237E] font-bold"
                }`}
                title="Chronomètre du Quiz (15 min) - Soumission automatique dès 00:00"
              >
                <Clock size={16} className={timeLeft < 120 ? "animate-spin text-rose-600 shrink-0" : "text-[#1A237E] shrink-0"} />
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold hidden xs:inline">
                    {timeLeft < 120 ? "Temps critique :" : "Temps restant :"}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black tracking-wider">
                    {formatQuizTime(timeLeft)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRestartQuizFromBeginning}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                title="Revenir à la question 1 (le chronomètre continue de tourner)"
              >
                <RefreshCw size={13} />
                <span className="hidden sm:inline">Recommencer</span>
              </button>
              <button
                onClick={handleQuitQuiz}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Quitter
              </button>
            </div>
          </div>

          {/* Restored notification banner */}
          {restoredNotice && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 flex items-center space-x-2 animate-in fade-in">
              <Save size={16} className="text-indigo-600 shrink-0" />
              <span>{restoredNotice}</span>
            </div>
          )}

          {!isSubmitted ? (
            /* Quiz Questions Carousel / Stepper */
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} sur {activeQuiz.questions.length}
                </span>
                <div className="w-28 sm:w-36 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#1A237E] h-2 transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {(() => {
                const question = activeQuiz.questions[currentQuestionIndex];
                const isMultiple = isQuestionMultipleChoice(question);
                const selectedList = selectedAnswers[currentQuestionIndex] || [];

                return (
                  <div className="space-y-4">
                    {/* Question Type Indicator */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-black text-[#1A237E]">
                        Question #{currentQuestionIndex + 1}
                      </span>
                      {isMultiple ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold flex items-center space-x-1.5 shadow-2xs">
                          <CheckSquare size={13} className="text-amber-600" />
                          <span>Choix Multiple (Cochez toutes les bonnes réponses)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-extrabold flex items-center space-x-1.5 shadow-2xs">
                          <CircleDot size={13} className="text-indigo-600" />
                          <span>Choix Unique (1 seule réponse possible)</span>
                        </span>
                      )}
                    </div>

                    {/* Question Statement with KaTeX LaTeX Support */}
                    <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      <MathRenderer content={question.question} />
                    </div>

                    {/* Question Figure / Image if present */}
                    {(question.image_url || question.imageUrl) && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50/60 p-2.5 flex justify-center">
                        <img
                          src={question.image_url || question.imageUrl || ""}
                          alt={`Figure question #${currentQuestionIndex + 1}`}
                          className="max-h-64 sm:max-h-80 w-auto object-contain rounded-lg shadow-2xs bg-white"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Options List */}
                    <div className="space-y-2.5">
                      {question.options.map((option, optIdx) => {
                        const isSelected = selectedList.includes(optIdx);

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isSubmitted || timeLeft <= 0}
                            onClick={() => handleSelectOption(currentQuestionIndex, optIdx, isMultiple)}
                            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-medium text-left transition-all flex items-center justify-between border cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                              isSelected
                                ? "bg-indigo-50/90 border-[#1A237E] text-[#1A237E] font-bold ring-2 ring-indigo-200 shadow-xs"
                                : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/80"
                            }`}
                          >
                            <div className="flex items-start space-x-3 min-w-0 flex-1 pr-2">
                              {/* Checkbox (multiple) or Radio (single) marker */}
                              <div
                                className={`w-5 h-5 mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                                  isMultiple
                                    ? `rounded-md border ${isSelected ? "border-amber-600 bg-amber-500 text-slate-950 font-black" : "border-slate-300 bg-white"}`
                                    : `rounded-full border ${isSelected ? "border-[#1A237E] bg-[#1A237E] text-white" : "border-slate-300 bg-white"}`
                                }`}
                              >
                                {isMultiple ? (
                                  isSelected && <CheckCircle2 size={14} className="text-white" />
                                ) : (
                                  isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                              </div>

                              <div className="flex-1 space-y-2">
                                {option && option.trim() && (
                                  <div className="leading-relaxed">
                                    <MathRenderer content={option} />
                                  </div>
                                )}
                                {(question.optionImages?.[optIdx] || question.option_images?.[optIdx]) && (
                                  <div className="pt-1">
                                    <img
                                      src={question.optionImages?.[optIdx] || question.option_images?.[optIdx] || ""}
                                      alt={`Illustration Proposition ${String.fromCharCode(65 + optIdx)}`}
                                      className="max-h-48 max-w-full object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-2xs"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                                isSelected
                                  ? "bg-[#1A237E] text-white border-[#1A237E]"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer transition-colors"
                >
                  ← Précédente
                </button>

                {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="px-5 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center space-x-1"
                  >
                    <span>Suivante</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={isSubmitting || isSubmitted}
                    className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow transition-all flex items-center space-x-1.5 ${
                      isSubmitting || isSubmitted ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Valider le Quiz & Voir le Score</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Results & Explanations Screen */
            <div className="space-y-5">
              {/* Score Banner */}
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-md space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-inner">
                  <Award size={32} />
                </div>

                <div>
                  <h4 className="text-2xl font-black text-slate-900">
                    Résultat : {calculateScore()}%
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {calculateScore() >= 80
                      ? "Félicitations ! Excellente maîtrise de cette leçon."
                      : calculateScore() >= 50
                      ? "Bon travail ! Relisez la correction expliquée ci-dessous pour vous perfectionner."
                      : "Continuez de réviser le cours associé pour progresser."}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  {isAdmin ? (
                    <button
                      onClick={() => startQuiz(activeQuiz, false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw size={14} />
                      <span>Recommencer ce quiz (Mode Admin)</span>
                    </button>
                  ) : (
                    <div className="px-3.5 py-2 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center space-x-1.5 shadow-2xs">
                      <Lock size={13} className="text-amber-700 shrink-0" />
                      <span>Tentative unique enregistrée • Seul l'administrateur peut réinitialiser votre passage</span>
                    </div>
                  )}
                  <button
                    onClick={resetActiveQuiz}
                    className="px-4 py-2 bg-[#1A237E] hover:bg-indigo-900 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <ArrowLeft size={14} />
                    <span>Retour à la liste des Quiz</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Corrections */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  Correction Expliquée Étape par Étape :
                </h4>

                {activeQuiz.questions.map((q, idx) => {
                  const isCorrect = isQuestionAnswerCorrect(q, idx);
                  const isMultiple = isQuestionMultipleChoice(q);
                  const userChosenIndices = selectedAnswers[idx] || [];
                  const correctIndices = getQuestionCorrectIndices(q);

                  return (
                    <div
                      key={q.id}
                      className={`p-4 sm:p-5 rounded-2xl border bg-white space-y-3 ${
                        isCorrect ? "border-emerald-200 shadow-2xs" : "border-rose-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="space-y-1 flex-1 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-xs text-slate-500">
                              Question #{idx + 1}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-600">
                              {isMultiple ? "Choix Multiple" : "Choix Unique"}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            <MathRenderer content={q.question} />
                          </div>
                          {(q.image_url || q.imageUrl) && (
                            <div className="pt-2">
                              <img
                                src={q.image_url || q.imageUrl || ""}
                                alt="Figure de la question"
                                className="max-h-48 w-auto object-contain rounded-lg border border-slate-200 bg-white"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>

                        {isCorrect ? (
                          <span className="flex items-center space-x-1 text-emerald-600 font-extrabold text-xs bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                            <CheckCircle2 size={16} />
                            <span>Correct (+1 pt)</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-rose-600 font-extrabold text-xs bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 shrink-0">
                            <XCircle size={16} />
                            <span>Inexact (0 pt)</span>
                          </span>
                        )}
                      </div>

                      {/* Answers Comparison */}
                      <div className="text-xs space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-500 font-bold block mb-1">Votre réponse :</span>
                          {userChosenIndices.length === 0 ? (
                            <span className="italic text-slate-400">Aucune réponse sélectionnée</span>
                          ) : (
                            <div className="space-y-1.5">
                              {userChosenIndices.map((ci) => {
                                const optImg = q.optionImages?.[ci] || q.option_images?.[ci];
                                return (
                                  <div
                                    key={ci}
                                    className={`inline-flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg font-semibold mr-1.5 mb-1 ${
                                      correctIndices.includes(ci)
                                        ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                        : "bg-rose-100 text-rose-900 border border-rose-200"
                                    }`}
                                  >
                                    <span className="font-mono text-[10px] font-bold">{String.fromCharCode(65 + ci)}.</span>
                                    {q.options[ci] && <MathRenderer content={q.options[ci]} />}
                                    {optImg && (
                                      <img
                                        src={optImg}
                                        alt={`Option ${String.fromCharCode(65 + ci)}`}
                                        className="h-10 w-auto object-contain rounded border border-slate-300/50 bg-white"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="pt-1.5 border-t border-slate-200/60">
                          <span className="text-emerald-800 font-bold block mb-1">Bonne(s) réponse(s) attendue(s) :</span>
                          <div className="space-y-1.5">
                            {correctIndices.map((ci) => {
                              const optImg = q.optionImages?.[ci] || q.option_images?.[ci];
                              return (
                                <div
                                  key={ci}
                                  className="inline-flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 mr-1.5 mb-1"
                                >
                                  <span className="font-mono text-[10px] font-bold">{String.fromCharCode(65 + ci)}.</span>
                                  {q.options[ci] && <MathRenderer content={q.options[ci]} />}
                                  {optImg && (
                                    <img
                                      src={optImg}
                                      alt={`Option ${String.fromCharCode(65 + ci)}`}
                                      className="h-10 w-auto object-contain rounded border border-emerald-300/50 bg-white"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Explanation with KaTeX */}
                      {q.explanation && (
                        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-950 space-y-1">
                          <strong className="text-amber-900 flex items-center space-x-1">
                            <Sparkles size={13} />
                            <span>Explication pédagogique :</span>
                          </strong>
                          <div className="italic leading-relaxed">
                            <MathRenderer content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Quiz Modal for Admin (Manual) */}
      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          isOpen={true}
          onClose={() => setEditingQuiz(null)}
        />
      )}

      {/* AI Quiz Modifier Modal for Admin */}
      {aiEditingQuiz && (
        <AIQuizModifierModal
          quiz={aiEditingQuiz}
          isOpen={true}
          onClose={() => setAiEditingQuiz(null)}
          onQuizUpdated={(updatedQuiz) => {
            setAiEditingQuiz(null);
          }}
        />
      )}
    </div>
  );
};
