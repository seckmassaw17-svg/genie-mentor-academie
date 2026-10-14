import React, { useState, useEffect } from "react";
import { AdminAuditLog } from "../types";
import { fetchAuditLogsSupabase } from "../data/supabaseStorage";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  AlertTriangle,
  RotateCcw,
  Trash2,
  CheckCircle2,
  FileText,
} from "lucide-react";

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogsSupabase();
      setLogs(data);
    } catch (err) {
      console.error("[Audit Logs Fetch Error]:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filterAction === "ALL" || log.actionType === filterAction;
    const matchesSearch =
      (log.adminEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.adminName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.actionType || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "REMISE_A_ZERO_CAISSE":
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-black text-[10px] inline-flex items-center space-x-1">
            <RotateCcw size={12} />
            <span>Remise à 0 F Caisse</span>
          </span>
        );
      case "VIDER_HISTORIQUE_CAISSE":
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg font-black text-[10px] inline-flex items-center space-x-1">
            <Trash2 size={12} />
            <span>Vidage Historique Caisse</span>
          </span>
        );
      case "VALIDATE_PAYMENT":
      case "VALIDATE_VIP":
      case "VALIDATE_CLASS_CHANGE":
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-black text-[10px] inline-flex items-center space-x-1">
            <CheckCircle2 size={12} />
            <span>Validation Administration</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-indigo-50 text-[#1A237E] border border-indigo-200 rounded-lg font-black text-[10px] inline-flex items-center space-x-1">
            <Activity size={12} />
            <span>{actionType}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-[#1A237E] dark:text-indigo-300 rounded-2xl font-black">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Journal de Sécurité & Audit Administrateur</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-[#1A237E] text-[10px] font-black rounded-full">
                  {logs.length} journalisé(s)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Traces de sécurité des actions sensibles effectuées (remise à zéro, suppressions, validations).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAuditLogs}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterAction("ALL")}
              className={`px-3 py-1 rounded-xl text-[11px] font-extrabold cursor-pointer transition-all ${
                filterAction === "ALL"
                  ? "bg-[#1A237E] text-amber-300 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Tous les événements
            </button>
            <button
              type="button"
              onClick={() => setFilterAction("REMISE_A_ZERO_CAISSE")}
              className={`px-3 py-1 rounded-xl text-[11px] font-extrabold cursor-pointer transition-all ${
                filterAction === "REMISE_A_ZERO_CAISSE"
                  ? "bg-[#1A237E] text-amber-300 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Remise à 0 F Caisse
            </button>
            <button
              type="button"
              onClick={() => setFilterAction("VIDER_HISTORIQUE_CAISSE")}
              className={`px-3 py-1 rounded-xl text-[11px] font-extrabold cursor-pointer transition-all ${
                filterAction === "VIDER_HISTORIQUE_CAISSE"
                  ? "bg-[#1A237E] text-amber-300 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Vidage Historique
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher action, admin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 pl-8 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Logs Table / Cards */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
          <ShieldCheck size={36} className="mx-auto text-slate-400" />
          <p className="font-black text-sm text-slate-700 dark:text-slate-200">
            Aucun événement d'audit enregistré.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xs hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    {getActionBadge(log.actionType)}
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                      {log.adminName}
                    </span>
                    <span className="text-[10px] text-slate-400">({log.adminEmail})</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 pt-1">
                    {log.details}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold block flex items-center space-x-1">
                    <Clock size={12} className="inline mr-1" />
                    <span>{log.dateFormatted}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
