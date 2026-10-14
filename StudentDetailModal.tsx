import React, { useState, useMemo, useEffect } from "react";
import {
  StudentRecord,
  SecondaryLevel,
  PaymentTransaction,
  ClassChangeRequest,
  VIPPaymentRequest,
  HomeworkSubmission,
  QuizResultRecord,
  UserNotification,
} from "../types";
import { ALL_LEVELS, STUDENT_LEVELS } from "../data/mockData";
import { RoomDatabaseRepository } from "../data/roomStorage";
import { getUserStudentId, getStudentPresenceStatus } from "../utils/userUtils";
import { getDistinctQuizResults } from "../utils/quizUtils";
import { supabase } from "../lib/supabaseClient";
import {
  subscribeToUserQuizResultsSupabase,
  subscribeToUserHomeworksSupabase,
  subscribeToAllTransactionsSupabase,
  subscribeToVIPPaymentRequestsSupabase,
  subscribeToClassChangeRequestsSupabase,
  subscribeToUserProfileSupabase,
  setUserVIPStatusSupabase,
  updateStudentLevelSupabase,
} from "../data/supabaseStorage";
import { formatVipCountdown, getVipStatusInfo } from "../utils/vipUtils";
import {
  X,
  User,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  Award,
  BookOpen,
  CreditCard,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  RotateCcw,
} from "lucide-react";

interface StudentDetailModalProps {
  student: StudentRecord;
  isOpen?: boolean;
  onClose: () => void;
  onStudentUpdated?: (updated: any) => void;
  onUpdateLevel?: (studentUid: string, newLevel: SecondaryLevel) => void;
  onToggleVIP?: (studentUid: string, isVIP: boolean) => void;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  fetchStudents?: () => Promise<void> | void;
  refetch?: () => Promise<void> | void;
  onRefreshStudents?: () => Promise<void> | void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen = true,
  onClose,
  onStudentUpdated,
  onUpdateLevel,
  onToggleVIP,
  onOpenReceipt,
  fetchStudents,
  refetch,
  onRefreshStudents,
}) => {
  if (isOpen === false || !student) return null;

  const roomRepo = RoomDatabaseRepository.getInstance();
  const [activeTab, setActiveTab] = useState<"grades" | "requests" | "payments" | "message">("grades");
  const [copiedId, setCopiedId] = useState(false);
  const [customMsgTitle, setCustomMsgTitle] = useState("");
  const [customMsgContent, setCustomMsgContent] = useState("");
  const [msgSentNotice, setMsgSentNotice] = useState(false);
  const [selectedClassLevel, setSelectedClassLevel] = useState<SecondaryLevel>(student.level || "3ème");
  const [isClassUpdating, setIsClassUpdating] = useState(false);
  const [classUpdateNotice, setClassUpdateNotice] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);
  const [customVipDays, setCustomVipDays] = useState<string>("30");
  const [isUpdatingVip, setIsUpdatingVip] = useState(false);
  const [vipSuccessNotice, setVipSuccessNotice] = useState("");

  // Live Student Real-Time State
  const [liveStudent, setLiveStudent] = useState<StudentRecord>(student);

  useEffect(() => {
    setLiveStudent(student);
    if (student.level) {
      setSelectedClassLevel(student.level);
    }
  }, [student]);

  const [liveQuizResults, setLiveQuizResults] = useState<QuizResultRecord[]>(() => student.quizResults || []);
  const [liveHomeworks, setLiveHomeworks] = useState<HomeworkSubmission[]>(() => {
    return roomRepo.getAllHomeworks().filter(
      (h) => h.userUid === student.uid || (student.email && h.studentEmail?.toLowerCase() === student.email.toLowerCase())
    );
  });
  const [liveTransactions, setLiveTransactions] = useState<PaymentTransaction[]>(() => {
    return roomRepo.getAllTransactions().filter(
      (t) =>
        t.userUid === student.uid ||
        (student.email && t.userEmail?.toLowerCase() === student.email.toLowerCase()) ||
        (student.displayName && t.learnerName.toLowerCase().includes(student.displayName.toLowerCase()))
    );
  });
  const [liveClassRequests, setLiveClassRequests] = useState<ClassChangeRequest[]>(() => {
    return roomRepo.getAllClassChangeRequests().filter(
      (r) => r.userUid === student.uid || (student.email && r.userEmail?.toLowerCase() === student.email.toLowerCase())
    );
  });
  const [liveVipRequests, setLiveVipRequests] = useState<VIPPaymentRequest[]>(() => {
    return roomRepo.getAllVIPPaymentRequests().filter(
      (v) => v.userUid === student.uid || (student.email && v.userEmail?.toLowerCase() === student.email.toLowerCase())
    );
  });

  // Active Realtime Subscriptions for this specific student
  useEffect(() => {
    const studentUid = student.uid;
    const studentEmail = student.email?.toLowerCase();
    const studentName = student.displayName?.toLowerCase();

    // 1. Quizzes
    const unsubQuiz = subscribeToUserQuizResultsSupabase(studentUid, (results) => {
      if (results && results.length > 0) {
        setLiveQuizResults(results);
      }
    });

    // 2. Homeworks
    const unsubHw = subscribeToUserHomeworksSupabase(studentUid, (hwList) => {
      if (hwList) {
        setLiveHomeworks(hwList);
      }
    });

    // 3. Transactions
    const unsubTx = subscribeToAllTransactionsSupabase((allTx) => {
      if (allTx) {
        const filtered = allTx.filter(
          (t) =>
            t.userUid === studentUid ||
            (studentEmail && t.userEmail?.toLowerCase() === studentEmail) ||
            (studentName && t.learnerName?.toLowerCase().includes(studentName))
        );
        setLiveTransactions(filtered);
      }
    });

    // 4. VIP Requests
    const unsubVip = subscribeToVIPPaymentRequestsSupabase((allVip) => {
      if (allVip) {
        const filtered = allVip.filter(
          (v) => v.userUid === studentUid || (studentEmail && v.userEmail?.toLowerCase() === studentEmail)
        );
        setLiveVipRequests(filtered);
      }
    });

    // 5. Class Change Requests
    const unsubClass = subscribeToClassChangeRequestsSupabase((allClass) => {
      if (allClass) {
        const filtered = allClass.filter(
          (r) => r.userUid === studentUid || (studentEmail && r.userEmail?.toLowerCase() === studentEmail)
        );
        setLiveClassRequests(filtered);
      }
    });

    // 6. Profile Live Updates
    const unsubProfile = subscribeToUserProfileSupabase(studentUid, (profile) => {
      if (profile) {
        setLiveStudent((prev) => ({
          ...prev,
          displayName: profile.displayName || prev.displayName,
          level: profile.level || prev.level,
          phone: profile.phone || prev.phone,
          avatarUrl: profile.avatarUrl || profile.photoURL || prev.avatarUrl,
          photoURL: profile.photoURL || profile.avatarUrl || prev.photoURL,
          isVIP: profile.isVIP !== undefined ? profile.isVIP : prev.isVIP,
        }));
      }
    });

    // 7. Room fallback subscription
    const unsubRoom = roomRepo.subscribe(() => {
      setLiveHomeworks(
        roomRepo.getAllHomeworks().filter(
          (h) => h.userUid === studentUid || (studentEmail && h.studentEmail?.toLowerCase() === studentEmail)
        )
      );
      setLiveTransactions(
        roomRepo.getAllTransactions().filter(
          (t) =>
            t.userUid === studentUid ||
            (studentEmail && t.userEmail?.toLowerCase() === studentEmail) ||
            (studentName && t.learnerName?.toLowerCase().includes(studentName))
        )
      );
      setLiveClassRequests(
        roomRepo.getAllClassChangeRequests().filter(
          (r) => r.userUid === studentUid || (studentEmail && r.userEmail?.toLowerCase() === studentEmail)
        )
      );
      setLiveVipRequests(
        roomRepo.getAllVIPPaymentRequests().filter(
          (v) => v.userUid === studentUid || (studentEmail && v.userEmail?.toLowerCase() === studentEmail)
        )
      );
    });

    return () => {
      unsubQuiz();
      unsubHw();
      unsubTx();
      unsubVip();
      unsubClass();
      unsubProfile();
      unsubRoom();
    };
  }, [student.uid, student.email, student.displayName]);

  const activeStudent = liveStudent;
  const matricule = activeStudent.matricule || activeStudent.studentId || getUserStudentId(activeStudent);
  const presence = getStudentPresenceStatus(activeStudent.lastSeen, activeStudent.createdAt);

  const studentHomeworks = liveHomeworks;
  const studentTransactions = liveTransactions;
  const studentClassRequests = liveClassRequests;
  const studentVipRequests = liveVipRequests;

  const rawQuizResults: QuizResultRecord[] = liveQuizResults.length > 0 ? liveQuizResults : (activeStudent.quizResults || []);
  const quizResults: QuizResultRecord[] = useMemo(() => getDistinctQuizResults(rawQuizResults), [rawQuizResults]);

  // Average calculations based on distinct quiz evaluations
  const averageQuizScore = useMemo(() => {
    if (quizResults.length === 0) return null;
    const total = quizResults.reduce((acc, q) => acc + (q.score20 ?? (q.scorePercentage ? q.scorePercentage / 5 : 0)), 0);
    return (total / quizResults.length).toFixed(1);
  }, [quizResults]);

  const gradedHomeworks = studentHomeworks.filter((h) => h.status === "graded" && h.grade20 !== undefined);
  const averageHomeworkScore = useMemo(() => {
    if (gradedHomeworks.length === 0) return null;
    const total = gradedHomeworks.reduce((acc, h) => acc + (h.grade20 || 0), 0);
    return (total / gradedHomeworks.length).toFixed(1);
  }, [gradedHomeworks]);

  const handleResetQuizAttempt = (quizId: string, quizTitle: string) => {
    if (!quizId) return;
    if (
      window.confirm(
        `Voulez-vous autoriser ${activeStudent.displayName} à repasser le quiz « ${quizTitle} » ?\n\nSa tentative précédente sera effacée et il pourra refaire le quiz une nouvelle fois.`
      )
    ) {
      roomRepo.resetStudentQuizAttempt(activeStudent.uid, quizId);
      setLiveQuizResults((prev) =>
        prev.filter((r) => r.quizId !== quizId && (r as any).quiz_id !== quizId && r.id !== `res_${activeStudent.uid}_${quizId}`)
      );
      if (onStudentUpdated) {
        onStudentUpdated({
          ...activeStudent,
          quizResults: (activeStudent.quizResults || []).filter(
            (r) => r.quizId !== quizId && (r as any).quiz_id !== quizId && r.id !== `res_${activeStudent.uid}_${quizId}`
          ),
        });
      }
    }
  };

  const handleCopyMatricule = () => {
    navigator.clipboard.writeText(matricule);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSendCustomNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsgContent.trim()) return;

    const notif: UserNotification = {
      id: `notif_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userUid: student.uid,
      userId: student.uid,
      userName: student.displayName,
      userEmail: student.email,
      recipientId: student.uid,
      targetRole: "student",
      title: customMsgTitle.trim() || "📩 Message de la Direction (Massaw Seck)",
      message: customMsgContent.trim(),
      type: "info",
      status: "unread",
      createdAt: Date.now(),
      dateFormatted: `Aujourd'hui à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    };

    roomRepo.addNotification(notif);
    setCustomMsgTitle("");
    setCustomMsgContent("");
    setMsgSentNotice(true);
    setTimeout(() => setMsgSentNotice(false), 4000);
  };

  const handleApplyClassChange = async () => {
    const currentLvl = liveStudent.classe || liveStudent.level || student.classe || student.level;
    if (selectedClassLevel === currentLvl) {
      setClassUpdateNotice({
        type: "info",
        text: `L'élève est déjà inscrit en classe de ${selectedClassLevel}. Choisissez une classe différente dans la liste ci-dessus pour la modifier.`,
      });
      setTimeout(() => setClassUpdateNotice(null), 5000);
      return;
    }

    const targetStudentId = student.id || student.uid;
    const selectedClass = selectedClassLevel;

    try {
      setIsClassUpdating(true);
      setClassUpdateNotice(null);

      // 3. Maintiens l'interface à jour immédiatement en modifiant le state local de la liste des élèves dès la validation
      setLiveStudent((prev) => ({
        ...prev,
        classe: selectedClass,
        level: selectedClass,
      }));

      const updatedStudent: StudentRecord = {
        ...liveStudent,
        id: targetStudentId,
        uid: targetStudentId,
        level: selectedClass,
        classe: selectedClass,
      };

      if (onStudentUpdated) {
        onStudentUpdated(updatedStudent);
      }
      if (onUpdateLevel) {
        onUpdateLevel(targetStudentId, selectedClass);
      }
      roomRepo.updateStudentLevel(targetStudentId, selectedClass);

      // 2. Si le bouton appelle Supabase RPC, entoure le bloc avec un try/catch pour éviter tout crash de l'application
      try {
        const { error } = await supabase.rpc('admin_change_student_class', {
          target_student_id: student.id || targetStudentId,
          new_class_name: selectedClass
        });

        if (error) {
          console.warn("[RPC admin_change_student_class notice]", error);
          // Fallback : mise à jour directe dans la table profiles si RPC échoue
          await supabase
            .from('profiles')
            .update({ classe: selectedClass, level: selectedClass })
            .eq('id', student.id || targetStudentId);

          if (student.uid && student.uid !== (student.id || targetStudentId)) {
            await supabase
              .from('profiles')
              .update({ classe: selectedClass, level: selectedClass })
              .eq('id', student.uid);
          }
        }
      } catch (rpcErr) {
        console.error("Erreur lors du changement de classe (RPC):", rpcErr);
        // Fallback immédiat dans la table profiles
        try {
          await supabase
            .from('profiles')
            .update({ classe: selectedClass, level: selectedClass })
            .eq('id', student.id || targetStudentId);
        } catch (fbErr) {
          console.error("Erreur fallback profiles:", fbErr);
        }
      }

      // Synchronisation supplémentaire dans Supabase
      await updateStudentLevelSupabase(targetStudentId, selectedClass).catch((err) => console.warn(err?.message || err));

      // Recharger la liste d'administration
      if (fetchStudents) {
        await fetchStudents();
      } else if (refetch) {
        await refetch();
      } else if (onRefreshStudents) {
        await onRefreshStudents();
      }

      // Fermer le modal de modification
      onClose();
    } catch (err: any) {
      console.error("Erreur lors du changement de classe:", err);
      setClassUpdateNotice({
        type: "error",
        text: "Une erreur est survenue lors de l'application de la nouvelle classe : " + (err?.message || "Erreur"),
      });
      setIsClassUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full text-slate-100 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header Profile Section */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar with Presence Dot */}
            <div className="relative shrink-0">
              <img
                src={
                  activeStudent.avatarUrl ||
                  activeStudent.photoUrl ||
                  `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200`
                }
                alt={activeStudent.displayName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md bg-slate-800"
                referrerPolicy="no-referrer"
              />
              <span
                className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${presence.badgeClass}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    presence.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                  }`}
                />
                {presence.statusLabel}
              </span>
            </div>

            {/* Student Bio & Badges */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                  {activeStudent.displayName}
                </h3>
                {activeStudent.isVIP && (
                  <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 shadow-xs">
                    <Sparkles size={13} className="fill-slate-950" />
                    PASS VIP ACTIF
                  </span>
                )}
                {activeStudent.isAdmin && (
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-lg">
                    Admin
                  </span>
                )}
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-lg shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Direct Supabase</span>
                </span>
              </div>

              {/* Contact & Identifiers */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Mail size={14} className="text-indigo-400" />
                  <span>{activeStudent.email}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-amber-400" />
                  <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    Classe : {activeStudent.level || "Non assignée"}
                  </span>
                </div>

                {/* Matricule with copy button */}
                <div className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-500/40 px-2.5 py-0.5 rounded-lg text-indigo-300">
                  <ShieldCheck size={14} className="text-indigo-400" />
                  <span className="font-mono font-bold">Matricule: #{matricule}</span>
                  <button
                    type="button"
                    onClick={handleCopyMatricule}
                    className="p-0.5 hover:text-white transition-colors ml-1 cursor-pointer"
                    title="Copier le matricule"
                  >
                    {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock size={14} className="text-slate-400" />
                  <span>Dernière connexion : {presence.lastSeenFormatted}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-[11px] text-slate-400 font-medium">Moyenne Quiz QCM</span>
              <p className="text-lg font-black text-amber-400">
                {averageQuizScore ? `${averageQuizScore} / 20` : "Aucun quiz"}
              </p>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-[11px] text-slate-400 font-medium">Moyenne Devoirs & TD</span>
              <p className="text-lg font-black text-indigo-400">
                {averageHomeworkScore ? `${averageHomeworkScore} / 20` : "Aucun TD noté"}
              </p>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-[11px] text-slate-400 font-medium">Paiements & Reçus</span>
              <p className="text-lg font-black text-emerald-400">
                {studentTransactions.length} transaction(s)
              </p>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-[11px] text-slate-400 font-medium">Demandes Formulaires</span>
              <p className="text-lg font-black text-cyan-400">
                {studentClassRequests.length + studentVipRequests.length} demande(s)
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("grades")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "grades"
                ? "border-amber-400 text-amber-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Award size={15} />
            <span>Notes & Évaluations ({quizResults.length + studentHomeworks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "requests"
                ? "border-cyan-400 text-cyan-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen size={15} />
            <span>Demandes Effectuées ({studentClassRequests.length + studentVipRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "payments"
                ? "border-emerald-400 text-emerald-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard size={15} />
            <span>Transactions & Paiements ({studentTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("message")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "message"
                ? "border-indigo-400 text-indigo-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare size={15} />
            <span>Actions & Message Direct</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: NOTES ET ÉVALUATIONS (QUIZ ET DEVOIRS) */}
          {activeTab === "grades" && (
            <div className="space-y-6">
              {/* QUIZ SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                    <Award size={16} />
                    Résultats des Quiz QCM Interactifs
                  </h4>
                  <span className="text-xs text-slate-400">
                    {quizResults.length} quiz complété(s)
                  </span>
                </div>

                {quizResults.length === 0 ? (
                  <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                    Cet élève n'a pas encore passé de quiz QCM.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quizResults.map((q, idx) => {
                      const note20 = q.score20 ?? (q.scorePercentage ? (q.scorePercentage / 5) : 0);
                      const isPassing = note20 >= 10;
                      return (
                        <div
                          key={q.id || `quiz_${idx}`}
                          className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-3.5 space-y-2 hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h5 className="font-bold text-white text-xs truncate">
                                {q.quizTitle}
                              </h5>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="text-indigo-300 font-semibold">{q.subject}</span>
                                <span>•</span>
                                <span>{q.level}</span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-1 rounded-xl text-xs font-black shrink-0 ${
                                isPassing
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {note20.toFixed(1)} / 20
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                            <span>
                              {q.correctAnswers} / {q.totalQuestions} réponses correctes ({q.scorePercentage}%)
                            </span>
                            <div className="flex items-center gap-2">
                              <span>{q.date}</span>
                              <button
                                type="button"
                                onClick={() => handleResetQuizAttempt(q.quizId || (q as any).quiz_id, q.quizTitle || "Quiz")}
                                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Autoriser l'élève à repasser ce quiz"
                              >
                                <RotateCcw size={11} />
                                <span>Réinitialiser passage</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DEVOIRS & TD SECTION */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-indigo-300 flex items-center gap-2">
                    <FileText size={16} />
                    Devoirs, Exercices et TD Déposés
                  </h4>
                  <span className="text-xs text-slate-400">
                    {studentHomeworks.length} devoir(s) soumis
                  </span>
                </div>

                {studentHomeworks.length === 0 ? (
                  <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                    Aucun devoir ou exercice n'a été déposé par cet élève.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {studentHomeworks.map((hw) => {
                      const isGraded = hw.status === "graded";
                      return (
                        <div
                          key={hw.id}
                          className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-extrabold text-white text-sm">{hw.title}</h5>
                                <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded-md">
                                  {hw.subject} • {hw.level}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Déposé le {hw.dateFormatted || new Date(hw.submittedAt).toLocaleDateString("fr-FR")}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {isGraded ? (
                                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-sm rounded-xl">
                                  Note : {hw.grade20} / 20
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1">
                                  <Clock size={12} className="animate-spin" />
                                  En attente de correction
                                </span>
                              )}
                            </div>
                          </div>

                          {hw.comment && (
                            <p className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 italic">
                              « {hw.comment} »
                            </p>
                          )}

                          {/* Feedback de Massaw Seck si corrigé */}
                          {isGraded && hw.feedback && (
                            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                              <span className="text-[11px] font-bold text-emerald-400">
                                👨‍🏫 Appréciation du Professeur (Massaw Seck) :
                              </span>
                              <p className="text-xs text-slate-200">{hw.feedback}</p>
                            </div>
                          )}

                          {/* View original file */}
                          {hw.fileData && (
                            <div className="pt-1 flex items-center justify-between text-xs">
                              <span className="text-slate-400 truncate max-w-[200px]">
                                Fichier : {hw.fileName}
                              </span>
                              <a
                                href={hw.fileData}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline"
                              >
                                <ExternalLink size={13} />
                                <span>Consulter la copie</span>
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DEMANDES EFFECTUÉES */}
          {activeTab === "requests" && (
            <div className="space-y-6">
              {/* DEMANDES DE CHANGEMENT DE CLASSE */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-cyan-300 flex items-center gap-2">
                  <GraduationCap size={16} />
                  Demandes de Changement de Classe
                </h4>

                {studentClassRequests.length === 0 ? (
                  <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                    Aucune demande de changement de classe effectuée par cet élève.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {studentClassRequests.map((req) => {
                      const isApproved = req.status === "approved";
                      const isRejected = req.status === "rejected";

                      return (
                        <div
                          key={req.id}
                          className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-300">
                                  Classe actuelle : <span className="text-white">{req.currentLevel}</span>
                                </span>
                                <ChevronRight size={14} className="text-slate-500" />
                                <span className="text-xs font-black text-cyan-300">
                                  Demandée : {req.requestedLevel}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{req.dateFormatted}</p>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                isApproved
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : isRejected
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {isApproved && <CheckCircle2 size={13} />}
                              {isRejected && <XCircle size={13} />}
                              {!isApproved && !isRejected && <Clock size={13} />}
                              <span>
                                {isApproved
                                  ? "Validée"
                                  : isRejected
                                  ? "Refusée"
                                  : "En attente"}
                              </span>
                            </span>
                          </div>

                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300">
                            <span className="text-slate-400 font-semibold block mb-0.5">Motif fourni :</span>
                            « {req.reason} »
                          </div>

                          {isRejected && req.rejectionReason && (
                            <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl text-xs text-rose-200">
                              <span className="font-bold block mb-0.5">Motif du refus par la Direction :</span>
                              {req.rejectionReason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DEMANDES DE PASS VIP */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                  <Sparkles size={16} />
                  Demandes d'Activation Pass VIP
                </h4>

                {studentVipRequests.length === 0 ? (
                  <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                    Aucune demande de Pass VIP enregistrée.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {studentVipRequests.map((vip) => {
                      const isApproved = vip.status === "APPROVED";
                      const isRejected = vip.status === "REJECTED";

                      return (
                        <div
                          key={vip.id}
                          className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-extrabold text-amber-400 text-sm">
                                  {vip.planDuration || "Formule VIP"} ({vip.amount?.toLocaleString("fr-FR")} FCFA)
                                </h5>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Réf: <span className="font-mono text-white">{vip.transactionRef}</span> • Tél: {vip.userPhone} • {vip.dateFormatted}
                              </p>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                isApproved
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : isRejected
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {isApproved && <CheckCircle2 size={13} />}
                              {isRejected && <XCircle size={13} />}
                              {!isApproved && !isRejected && <Clock size={13} />}
                              <span>
                                {isApproved
                                  ? "Validée"
                                  : isRejected
                                  ? "Refusée"
                                  : "En attente"}
                              </span>
                            </span>
                          </div>

                          {isRejected && vip.rejectionReason && (
                            <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl text-xs text-rose-200">
                              <span className="font-bold block mb-0.5">Motif du rejet :</span>
                              {vip.rejectionReason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTIONS & PAIEMENTS */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-emerald-300 flex items-center gap-2">
                  <CreditCard size={16} />
                  Historique Complet des Transactions & Reçus
                </h4>
                <span className="text-xs text-slate-400">
                  {studentTransactions.length} transaction(s)
                </span>
              </div>

              {studentTransactions.length === 0 ? (
                <div className="p-6 bg-slate-800/40 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                  Aucune transaction enregistrée pour cet élève.
                </div>
              ) : (
                <div className="space-y-3">
                  {studentTransactions.map((tx) => {
                    const isApproved = tx.status === "approved";
                    const isRejected = tx.status === "rejected";
                    const typeLabel =
                      tx.type === "domicile"
                        ? "Cours à Domicile"
                        : tx.type === "VIP" || tx.type === "pass_vip"
                        ? "Pass VIP"
                        : "Cours de Renforcement";

                    return (
                      <div
                        key={tx.id}
                        className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-sm">
                                {tx.amount?.toLocaleString("fr-FR")} FCFA
                              </span>
                              <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold rounded-md">
                                {typeLabel} • {tx.operator?.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Apprenant : <span className="text-slate-200 font-semibold">{tx.learnerName}</span> ({tx.level}) • Tél : {tx.phoneNumber} • {tx.dateFormatted}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                isApproved
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : isRejected
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {isApproved && <CheckCircle2 size={13} />}
                              {isRejected && <XCircle size={13} />}
                              {!isApproved && !isRejected && <Clock size={13} />}
                              <span>
                                {isApproved
                                  ? "Validé ✅"
                                  : isRejected
                                  ? "Rejeté ❌"
                                  : "En attente ⏳"}
                              </span>
                            </span>

                            {onOpenReceipt && (
                              <button
                                type="button"
                                onClick={() => onOpenReceipt(tx)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <FileText size={12} />
                                <span>Reçu</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Matières sélectionnées */}
                        {tx.subjects && tx.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tx.subjects.map((sub, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-slate-900/80 border border-slate-700 text-indigo-300 text-[10px] rounded-md font-medium"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}

                        {isRejected && tx.rejectionReason && (
                          <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl text-xs text-rose-200">
                            <span className="font-bold block mb-0.5">Motif du refus :</span>
                            {tx.rejectionReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTIONS & MESSAGE DIRECT */}
          {activeTab === "message" && (
            <div className="space-y-6">
              {/* QUICK ADMIN ACTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Change Class Action */}
                <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap size={15} />
                      Changer la Classe de l'Élève
                    </h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Actuelle : {liveStudent.level || student.level || "3ème"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Sélectionnez la nouvelle classe. L'ancienne classe sera automatiquement remplacée et l'élève n'aura accès qu'aux cours de sa nouvelle classe.
                  </p>

                  <div className="space-y-2">
                    <select
                      value={selectedClassLevel}
                      onChange={(e) => {
                        setSelectedClassLevel(e.target.value as SecondaryLevel);
                        setClassUpdateNotice(null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    >
                      {STUDENT_LEVELS.map((lvl) => {
                        const isCurrent = lvl === (liveStudent.level || student.level);
                        return (
                          <option key={lvl} value={lvl}>
                            {lvl} {isCurrent ? "(Classe actuelle)" : ""}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      onClick={handleApplyClassChange}
                      disabled={isClassUpdating}
                      className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                        isClassUpdating
                          ? "bg-indigo-800 text-indigo-200 cursor-wait opacity-80"
                          : selectedClassLevel === (liveStudent.level || student.level)
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 ring-2 ring-indigo-500/20"
                      }`}
                    >
                      {isClassUpdating ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin" />
                          <span>Application de la nouvelle classe...</span>
                        </>
                      ) : (
                        <>
                          <GraduationCap size={15} />
                          <span>Appliquer la nouvelle classe</span>
                        </>
                      )}
                    </button>

                    {classUpdateNotice && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-semibold animate-in fade-in flex items-start gap-2 ${
                          classUpdateNotice.type === "success"
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                            : classUpdateNotice.type === "error"
                            ? "bg-red-500/15 border border-red-500/30 text-red-300"
                            : "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                        }`}
                      >
                        <span className="shrink-0 text-sm">
                          {classUpdateNotice.type === "success"
                            ? "✅"
                            : classUpdateNotice.type === "error"
                            ? "⚠️"
                            : "ℹ️"}
                        </span>
                        <div className="flex-1 leading-relaxed">{classUpdateNotice.text}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* VIP Status Action & Duration Management */}
                <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={15} />
                      Abonnement & Durée Concours VIP
                    </h4>
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      liveStudent.isVIP
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-700 text-slate-400"
                    }`}>
                      {liveStudent.isVIP ? "VIP ACTIF ⭐" : "STANDARD"}
                    </span>
                  </div>

                  {liveStudent.isVIP && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-200">
                        <span>Formule : {liveStudent.vipPlan || "Pass Concours VIP"}</span>
                        <span>{formatVipCountdown(liveStudent.vipExpiresAt).formattedText}</span>
                      </div>
                      {liveStudent.vipExpiresAt && liveStudent.vipExpiresAt > 0 && (
                        <p className="text-[11px] text-amber-300/70">
                          Date d'expiration : {new Date(liveStudent.vipExpiresAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {vipSuccessNotice && (
                    <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>{vipSuccessNotice}</span>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Attribuer ou prolonger la durée d'accès :
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      {[
                        { label: "1 Mois", days: 30, plan: "1 mois (Concours VIP)" },
                        { label: "3 Mois", days: 90, plan: "3 mois (Concours VIP)" },
                        { label: "6 Mois", days: 180, plan: "6 mois (Concours VIP)" },
                        { label: "1 An", days: 365, plan: "1 an (Concours VIP)" },
                        { label: "Illimité", days: "lifetime" as const, plan: "Accès VIP Illimité" },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={isUpdatingVip}
                          onClick={async () => {
                            setIsUpdatingVip(true);
                            try {
                              const expiresAt = preset.days === "lifetime" ? -1 : Date.now() + preset.days * 24 * 60 * 60 * 1000;
                              await setUserVIPStatusSupabase(student.uid, true, preset.plan, expiresAt);
                              roomRepo.setUserVIPStatus(student.uid, true, preset.plan, expiresAt);
                              const updated: StudentRecord = {
                                ...liveStudent,
                                isVIP: true,
                                vipPlan: preset.plan,
                                vipExpiresAt: expiresAt,
                              };
                              setLiveStudent(updated);
                              if (onStudentUpdated) onStudentUpdated(updated);
                              setVipSuccessNotice(`Accès ${preset.label} attribué avec succès !`);
                              setTimeout(() => setVipSuccessNotice(""), 3000);
                            } catch (err) {
                              console.error("Error setting VIP preset:", err);
                            } finally {
                              setIsUpdatingVip(false);
                            }
                          }}
                          className="px-2 py-1.5 bg-slate-700/70 hover:bg-amber-500/20 hover:border-amber-500/40 border border-slate-600 rounded-lg text-slate-200 hover:text-amber-300 font-bold transition-all text-center cursor-pointer disabled:opacity-50"
                        >
                          +{preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom days input */}
                    <div className="flex items-center gap-2 pt-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          max="3650"
                          value={customVipDays}
                          onChange={(e) => setCustomVipDays(e.target.value)}
                          placeholder="Jours"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-amber-400 focus:outline-hidden"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                          jours
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isUpdatingVip || !customVipDays}
                        onClick={async () => {
                          const days = parseInt(customVipDays, 10);
                          if (!days || days <= 0) return;
                          setIsUpdatingVip(true);
                          try {
                            const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
                            const planName = `${days} jours (Concours VIP)`;
                            await setUserVIPStatusSupabase(student.uid, true, planName, expiresAt);
                            roomRepo.setUserVIPStatus(student.uid, true, planName, expiresAt);
                            const updated: StudentRecord = {
                              ...liveStudent,
                              isVIP: true,
                              vipPlan: planName,
                              vipExpiresAt: expiresAt,
                            };
                            setLiveStudent(updated);
                            if (onStudentUpdated) onStudentUpdated(updated);
                            setVipSuccessNotice(`Durée personnalisée de ${days} jours appliquée !`);
                            setTimeout(() => setVipSuccessNotice(""), 3000);
                          } catch (err) {
                            console.error("Error setting custom VIP days:", err);
                          } finally {
                            setIsUpdatingVip(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Appliquer
                      </button>
                    </div>

                    {/* Revoke / Disable VIP */}
                    {liveStudent.isVIP && (
                      <button
                        type="button"
                        disabled={isUpdatingVip}
                        onClick={async () => {
                          if (window.confirm("Désactiver immédiatement l'accès VIP de cet élève ?")) {
                            setIsUpdatingVip(true);
                            try {
                              await setUserVIPStatusSupabase(student.uid, false);
                              roomRepo.setUserVIPStatus(student.uid, false);
                              const updated: StudentRecord = {
                                ...liveStudent,
                                isVIP: false,
                                vipPlan: undefined,
                                vipExpiresAt: undefined,
                              };
                              setLiveStudent(updated);
                              if (onStudentUpdated) onStudentUpdated(updated);
                              setVipSuccessNotice("Accès VIP désactivé pour cet élève.");
                              setTimeout(() => setVipSuccessNotice(""), 3000);
                            } catch (err) {
                              console.error("Error revoking VIP:", err);
                            } finally {
                              setIsUpdatingVip(false);
                            }
                          }
                        }}
                        className="w-full mt-2 py-1.5 bg-rose-950/40 hover:bg-rose-950 border border-rose-800/60 rounded-xl text-rose-300 hover:text-rose-100 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Désactiver l'accès VIP
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* DIRECT NOTIFICATION FORM */}
              <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Send size={15} />
                  Envoyer une Notification Directe à cet Élève
                </h4>
                <p className="text-xs text-slate-400">
                  Le message apparaîtra instantanément dans le Centre de Notification de l'élève (Matricule #{matricule}).
                </p>

                {msgSentNotice && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 size={16} />
                    <span>Notification envoyée avec succès à {student.displayName} !</span>
                  </div>
                )}

                <form onSubmit={handleSendCustomNotification} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Titre de l'alerte
                    </label>
                    <input
                      type="text"
                      value={customMsgTitle}
                      onChange={(e) => setCustomMsgTitle(e.target.value)}
                      placeholder="Ex: 📢 Consigne importante de Massaw Seck"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Message personnalisé
                    </label>
                    <textarea
                      rows={3}
                      value={customMsgContent}
                      onChange={(e) => setCustomMsgContent(e.target.value)}
                      placeholder={`Bonjour ${student.displayName}, ...`}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Transmettre la notification</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>ID Élève : #{matricule}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
