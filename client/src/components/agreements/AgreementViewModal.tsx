import React from 'react';
import { 
  X, Printer, Download, ShieldCheck, CheckCircle2, 
  Calendar, FileText, Lock, Building2, UserCheck, AlertCircle 
} from 'lucide-react';

interface AgreementViewModalProps {
  agreement: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function AgreementViewModal({ agreement, isOpen, onClose }: AgreementViewModalProps) {
  if (!isOpen || !agreement) return null;

  const snapshot = agreement.templateSnapshot || {};

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'PENDING_SIGNATURE':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'EXPIRED':
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/40 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-bold text-base text-foreground">Service Agreement Certificate</h3>
              <p className="text-xs text-muted-foreground">Agreement ID: {agreement.agreementId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formal Printable Document Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-sm bg-white text-slate-900 font-sans print:p-0">
          {/* Header Banner */}
          <div className="border-b-2 border-indigo-950 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="text-xl font-extrabold text-indigo-950 tracking-tight flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-600" /> SERVICEHUB CONNECT
              </div>
              <p className="text-xs text-slate-500 font-medium">Post-Booking Service Agreement Certificate</p>
            </div>
            <div className="text-right sm:text-right">
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getStatusBadge(agreement.status)}`}>
                STATUS: {agreement.status}
              </span>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {agreement.agreementId}
              </div>
            </div>
          </div>

          {/* Party Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Party A • Customer</div>
              <div className="font-bold text-slate-900 text-sm">{agreement.customerName}</div>
              <div className="text-slate-600">Email: {agreement.customerEmail || 'Registered Customer'}</div>
              <div className="text-slate-600">Location: {agreement.location || 'Tamil Nadu'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Party B • Certified Service Provider</div>
              <div className="font-bold text-slate-900 text-sm">{agreement.providerName}</div>
              <div className="text-slate-600">Service Category: {agreement.category || agreement.serviceType}</div>
              <div className="text-slate-600">Original Job ID: {agreement.trackingId || agreement.bookingId}</div>
            </div>
          </div>

          {/* Agreement Terms Section */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-indigo-950 border-b pb-1">1. Scope of Coverage & Terms</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              {snapshot.terms || 'This agreement entitles the customer to submit on-demand service requests for the designated service category for 12 months. All service requests are reviewed by ServiceHub administrative dispatch to ensure qualified provider matching, guaranteed pricing fidelity, and full quality audit logging.'}
            </p>

            <h4 className="font-bold text-sm text-indigo-950 border-b pb-1 pt-2">2. Term & Validity</h4>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">Agreement Start:</span>
                <span className="font-bold">{agreement.startDate ? new Date(agreement.startDate).toLocaleDateString() : 'Upon Signature'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Agreement End:</span>
                <span className="font-bold">{agreement.endDate ? new Date(agreement.endDate).toLocaleDateString() : '12 Months'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Duration:</span>
                <span className="font-bold">{agreement.durationMonths || 12} Months</span>
              </div>
            </div>

            <h4 className="font-bold text-sm text-indigo-950 border-b pb-1 pt-2">3. Dispute Arbitration & Quality Guarantee</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              ServiceHub functions as the platform mediator. Any defects reported under this agreement are covered by complimentary rework inspection. In the event of provider unavailability, ServiceHub reassigns an equally certified alternate technician at no additional dispatch premium.
            </p>
          </div>

          {/* Verification & Signature Seal */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-6 items-end">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Digital Signature</div>
              <div className="p-3 bg-slate-50 border rounded-lg text-center">
                <span className="text-lg font-serif italic text-indigo-950 font-bold">
                  {agreement.customerName}
                </span>
                <div className="text-[10px] text-slate-400 mt-1">
                  Signed: {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString() : 'Pending'}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform Authentication Seal</div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                <div className="text-xs font-bold text-indigo-900 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified Cryptographic Audit
                </div>
                <div className="text-[10px] text-indigo-600 mt-0.5 font-mono">
                  VERIFIED • SERVICEHUB SYSTEM
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
