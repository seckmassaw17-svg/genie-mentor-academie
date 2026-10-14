import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { VIPPaymentRequest } from '../types';
import { Check, Clock, RefreshCw, X, ShieldCheck, User, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { markAdminNotificationAsProcessed, safeUpdateProfile, safeUpdateSupabaseTable, saveNotificationToSupabase } from '../data/supabaseStorage';
import { computeExpirationTimestamp, VIP_PLANS } from '../utils/vipUtils';

export default function AdminVipRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Charger les demandes
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vip_payment_requests')
        .select('*');

      if (error) throw error;
      if (data) {
        data.sort((a: any, b: any) => Number(b.requested_at || b.created_at || Date.now()) - Number(a.requested_at || a.created_at || Date.now()));
      }
      setRequests(data || []);
    } catch (err: any) {
      console.error("Erreur lors du chargement des demandes VIP :", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('vip_requests_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vip_payment_requests' },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Validation d'une demande VIP
  const handleApproveVip = async (request: any) => {
    try {
      setProcessingId(request.id);
      const studentUid = request.student_uid || request.user_uid || request.userUid;
      const planId = request.plan_id || request.planId || '3mois';
      const planLabel = VIP_PLANS.find((p) => p.id === planId)?.durationLabel || planId;
      const computedExpiresAt = computeExpirationTimestamp(planId);

      // Étape A : Mettre à jour définitivement la demande dans vip_payment_requests (status = 'APPROVED')
      await supabase.from('vip_payment_requests').update({ status: 'APPROVED' }).eq('id', request.id);
      await safeUpdateSupabaseTable('vip_payment_requests', request.id, { 
        status: 'approved',
        updated_at: Date.now()
      });

      // Étape B : Activer le statut VIP dans la table profiles de l'élève
      if (studentUid) {
        await safeUpdateProfile(studentUid, { 
          is_vip: true, 
          vip_plan: planLabel,
          vip_expires_at: computedExpiresAt || null,
          updated_at: Date.now()
        });
      }

      // Étape C : Envoyer une notification ciblée à l'élève
      const now = Date.now();
      const notifId = `notif_vip_appr_${request.id}`;
      if (studentUid) {
        await saveNotificationToSupabase({
          id: notifId,
          recipient: studentUid,
          target_uid: studentUid,
          user_id: studentUid,
          user_uid: studentUid,
          recipient_id: studentUid,
          targetRole: 'student',
          title: "🎉 Pass VIP Activé !",
          message: `Félicitations ! Votre demande de Pass VIP (${planLabel}) a été validée avec succès.`,
          type: 'VIP_PASS',
          status: 'UNREAD',
          is_read: false,
          createdAt: now,
          dateFormatted: `Aujourd'hui à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
        });

        await markAdminNotificationAsProcessed(studentUid, "vip_request");
      }

      alert("Paiement VIP validé avec succès !");
      await fetchRequests();

    } catch (error: any) {
      console.error("Erreur lors de la validation :", error.message || error);
      alert("Erreur : " + (error.message || error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectVip = async (request: any) => {
    const reason = prompt("Motif du rejet (optionnel) :", "Référence introuvable");
    if (reason === null) return;

    try {
      setProcessingId(request.id);
      const studentUid = request.student_uid || request.user_uid || request.userUid;

      // Étape A : Mettre à jour définitivement la demande dans vip_payment_requests (status = 'REJECTED')
      await supabase.from('vip_payment_requests').update({ status: 'REJECTED' }).eq('id', request.id);
      await safeUpdateSupabaseTable('vip_payment_requests', request.id, { 
        status: 'rejected',
        rejection_reason: reason || null,
        updated_at: Date.now()
      });

      // Étape B : Envoyer la notification de refus à l'élève
      const notifId = `notif_vip_rej_${request.id}`;
      if (studentUid) {
        await saveNotificationToSupabase({
          id: notifId,
          recipient: studentUid,
          target_uid: studentUid,
          user_id: studentUid,
          user_uid: studentUid,
          recipient_id: studentUid,
          targetRole: 'student',
          title: "❌ Demande Pass VIP non validée",
          message: `Votre demande de Pass VIP n'a pas été acceptée.${reason ? ` Motif : ${reason}` : ''}`,
          type: 'VIP_PASS',
          status: 'UNREAD',
          is_read: false,
          createdAt: Date.now(),
          dateFormatted: `Aujourd'hui à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
        });

        await markAdminNotificationAsProcessed(studentUid, "vip_request");
      }

      alert("Demande rejetée avec notification envoyée.");
      await fetchRequests();
    } catch (err: any) {
      console.error("Erreur lors du rejet :", err.message || err);
      alert("Erreur : " + (err.message || err));
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter((r) => {
    const st = String(r.status || '').toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'pending') return st === 'pending';
    if (filter === 'approved') return st === 'approved';
    if (filter === 'rejected') return st === 'rejected';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* En-tête et filtres */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Validation des Pass VIP</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
            {requests.filter(r => String(r.status || '').toLowerCase() === 'pending').length} en attente
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'pending' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'approved' ? 'bg-emerald-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Validés
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'rejected' ? 'bg-rose-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Refusés
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'all' ? 'bg-slate-700 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous
            </button>
          </div>

          <button
            onClick={fetchRequests}
            title="Rafraîchir"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Liste des demandes */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span>Chargement des demandes VIP...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
          <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p>Aucune demande trouvée pour ce filtre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((request) => {
            const status = String(request.status || '').toLowerCase();
            const isPending = status === 'pending';
            const isApproved = status === 'approved';
            const isProcessing = processingId === request.id;

            return (
              <div
                key={request.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-white text-sm">
                          {request.student_name || 'Élève'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {request.student_phone || 'Sans numéro'} • {request.level || '3ème'}
                      </span>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isApproved ? 'Validé' : status === 'rejected' ? 'Refusé' : 'En attente'}
                    </span>
                  </div>

                  <div className="bg-slate-800/60 rounded-xl p-2.5 space-y-1 text-xs border border-slate-700/50">
                    <div className="flex justify-between text-slate-300">
                      <span>Formule :</span>
                      <span className="font-semibold text-amber-400">{request.plan_id || '3mois'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Montant :</span>
                      <span className="font-bold text-white">{request.amount ? `${request.amount} FCFA` : '—'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Opérateur :</span>
                      <span className="font-semibold uppercase text-cyan-400">{request.operator || 'Wave'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Réf. Transaction :</span>
                      <span className="font-mono text-emerald-300 select-all">{request.transaction_ref || '—'}</span>
                    </div>
                  </div>
                </div>

                {isPending && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApproveVip(request)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Valider le Pass VIP</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRejectVip(request)}
                      className="py-2 px-3 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Refuser</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
