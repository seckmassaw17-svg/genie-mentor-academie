import React from "react";
import { PaymentTransaction } from "../types";
import { X, Printer, Download } from "lucide-react";
import { getAppLogo, useOfficialSignature } from "../utils/assetImages";
import { AppLogo } from "./AppLogo";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PaymentTransaction | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const reactiveOfficialSignature = useOfficialSignature();
  if (!isOpen || !transaction) return null;

  const receiptNum = `SVP-REC-${transaction.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
  const signatureImageSrc = reactiveOfficialSignature || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 75" width="140" height="48"><path d="M12 45 C35 15, 45 60, 65 25 C80 10, 90 55, 110 30 C130 15, 145 40, 165 20 C180 10, 195 35, 205 25" stroke="%231a237e" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M 22 52 Q 95 58 195 42" stroke="%231a237e" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="170" cy="22" r="3.5" fill="%231a237e"/><g transform="rotate(-12 140 30)"><rect x="115" y="10" width="70" height="24" rx="4" fill="none" stroke="%23059669" stroke-width="1.5" stroke-dasharray="3,1"/><text x="120" y="26" font-family="sans-serif" font-size="10" font-weight="900" fill="%23059669">VALIDÉ S+</text></g></svg>`;

  const serviceText =
    transaction.type === "renforcement"
      ? "Renforcement Pédagogique (Au Centre)"
      : "Cours à Domicile";

  const motifText =
    transaction.paymentType === "inscription"
      ? "Frais d'inscription"
      : `Mensualité ${transaction.selectedMonth || "Novembre"}`;

  const statusText =
    transaction.status === "approved"
      ? "PAIEMENT VALIDÉ PAR L'ADMINISTRATION SAVOIR+"
      : transaction.status === "pending"
      ? "PAIEMENT EN COURS DE VÉRIFICATION"
      : "PAIEMENT REJETÉ";

  const statusBg =
    transaction.status === "approved"
      ? "#05966915"
      : transaction.status === "pending"
      ? "#d9770615"
      : "#dc262615";

  const statusColor =
    transaction.status === "approved"
      ? "#059669"
      : transaction.status === "pending"
      ? "#d97706"
      : "#dc2626";

  const statusBorder =
    transaction.status === "approved"
      ? "#05966940"
      : transaction.status === "pending"
      ? "#d9770640"
      : "#dc262640";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu - ${receiptNum}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
    .receipt-card { max-width: 500px; margin: 0 auto; background: #ffffff; border: 2px solid #e0e7ff; border-radius: 20px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); position: relative; }
    .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px; }
    .logo { font-size: 24px; font-weight: 900; color: #1a237e; }
    .subtitle { font-size: 12px; color: #64748b; }
    .status-badge { background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; padding: 10px; border-radius: 12px; text-align: center; font-weight: 800; font-size: 13px; margin-bottom: 16px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .label { color: #64748b; }
    .value { font-weight: 700; color: #0f172a; text-align: right; }
    .total-row { display: flex; justify-content: space-between; padding: 14px 0; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 900; color: #1a237e; margin-top: 12px; }
    
    /* Zone de Signature */
    .signature-section { text-align: right; margin-top: 25px; padding-right: 10px; position: relative; }
    .signature-label { font-size: 11px; color: #64748b; margin-bottom: 5px; }
    .signature-image { max-width: 130px; height: auto; display: block; margin-left: auto; margin-right: 0; }
    .signature-name { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 5px; }

    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; }
  </style>
</head>
<body onload="window.print();">
  <div class="receipt-card">
    <div class="header">
      <img src="${getAppLogo()}" alt="Génie Mentor Académie Logo" style="width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 8px auto; display: block; object-fit: cover; border: 1.5px solid #cbd5e1;">
      <div class="logo">Génie Mentor Académie (GMA)</div>
      <div class="subtitle">Encadrement Pédagogique & Réussite Scolaire</div>
      <p style="font-size: 11px; margin-top: 4px; color: #475569;">Reçu N° <strong>${receiptNum}</strong> • Date : ${transaction.dateFormatted}</p>
    </div>
    
    <div class="status-badge">${statusText}</div>

    <div class="row"><span class="label">Payeur :</span><span class="value">${transaction.userName}</span></div>
    <div class="row"><span class="label">Apprenant :</span><span class="value">${transaction.learnerName}</span></div>
    <div class="row"><span class="label">Service :</span><span class="value">${serviceText}</span></div>
    <div class="row"><span class="label">Motif :</span><span class="value">${motifText}</span></div>
    <div class="row"><span class="label">Niveau :</span><span class="value">Classe de ${transaction.level}</span></div>
    <div class="row"><span class="label">Matières :</span><span class="value">${transaction.subjects.join(", ")}</span></div>
    <div class="row"><span class="label">Opérateur :</span><span class="value">${transaction.operator.toUpperCase()} Money (${transaction.phoneNumber})</span></div>

    <div class="total-row">
      <span>MONTANT RÉGLÉ :</span>
      <span>${transaction.amount.toLocaleString("fr-FR")} FCFA</span>
    </div>

    <!-- NOUVELLE SECTION : Signature Officielle -->
    <div class="signature-section">
      <div class="signature-label">Pour l'administration,</div>
      <img src="${signatureImageSrc}" alt="Signature Officielle" class="signature-image">
      <div class="signature-name">Mentor Perpendiculaire / Massaw Seck</div>
    </div>

    <div class="footer">
      <p><strong>Direction Pédagogique GMA Dakar</strong></p>
      <p>Support : +221 78 376 95 84</p>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-auto relative animate-in zoom-in-95 border border-slate-200">
        {/* Modal Header Controls */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-800 text-sm">
              Reçu Officiel de Paiement Numérique
            </h3>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
              title="Télécharger le reçu directement dans vos fichiers"
            >
              <Download size={14} />
              <span>Télécharger</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#1A237E] font-bold text-xs rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimer</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT CARD CONTENT matching user HTML & CSS */}
        <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-md space-y-4 font-sans text-slate-800 relative">
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-4">
            <AppLogo
              className="w-12 h-12 rounded-xl border-2 border-amber-400 shadow-xs mx-auto mb-1.5"
              alt="Génie Mentor Académie Logo"
            />
            <div className="text-2xl font-black text-[#1a237e]">Génie Mentor Académie (GMA)</div>
            <div className="text-xs text-slate-500">Encadrement Pédagogique & Réussite Scolaire</div>
            <p className="text-[11px] mt-1 text-slate-600">
              Reçu N° <strong>{receiptNum}</strong> • Date : {transaction.dateFormatted}
            </p>
          </div>

          <div
            className="p-2.5 rounded-xl text-center font-extrabold text-xs tracking-wide"
            style={{
              backgroundColor: statusBg,
              color: statusColor,
              border: `1px solid ${statusBorder}`,
            }}
          >
            {statusText}
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Payeur :</span>
              <span className="font-bold text-slate-900">{transaction.userName}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Apprenant :</span>
              <span className="font-bold text-slate-900">{transaction.learnerName}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Service :</span>
              <span className="font-bold text-slate-900">{serviceText}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Motif :</span>
              <span className="font-bold text-slate-900">{motifText}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Niveau :</span>
              <span className="font-bold text-slate-900">Classe de {transaction.level}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Matières :</span>
              <span className="font-bold text-slate-900">{transaction.subjects.join(", ")}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Opérateur :</span>
              <span className="font-bold text-slate-900">
                {transaction.operator.toUpperCase()} Money ({transaction.phoneNumber})
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-3 border-t-2 border-slate-900 text-sm font-black text-[#1a237e]">
            <span>MONTANT RÉGLÉ :</span>
            <span className="text-base">{transaction.amount.toLocaleString("fr-FR")} FCFA</span>
          </div>

          {/* Zone de Signature Officielle */}
          <div className="text-right pt-2">
            <div className="text-[11px] text-slate-500 mb-1">Pour l'administration,</div>
            <img
              src={signatureImageSrc}
              alt="Signature Officielle"
              className="max-w-[130px] h-auto block ml-auto mr-0"
            />
            <div className="text-xs font-bold text-slate-900 mt-1">
              Mentor Perpendiculaire / Massaw Seck
            </div>
          </div>

          <div className="text-center pt-3 text-[11px] text-slate-400 border-t border-slate-100 space-y-0.5">
            <p className="font-bold">Direction Pédagogique GMA Dakar</p>
            <p>Support : +221 78 376 95 84</p>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 print:hidden">
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Download size={16} />
            <span>Télécharger le Reçu</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="py-3 px-4 bg-[#1A237E] hover:bg-indigo-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Printer size={16} />
            <span>Imprimer</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
