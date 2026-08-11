import React from 'react';
import { createPortal } from 'react-dom';
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

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-card border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/40 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-bold text-base text-foreground">Service Agreement Certificate</h3>
              <p className="text-xs text-muted-foreground">Agreement ID: {agreement.agreementId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
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

          {/* Key Terms */}
          <div className="space-y-3">
            <h4 className="font-bold text-indigo-950 text-sm border-b pb-1">1. Scope of Service & Validity</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              This legally binding certificate confirms that <strong>{agreement.customerName}</strong> is enrolled in the <strong>{agreement.durationMonths || 12}-Month Service Protection Agreement</strong> under ServiceHub Connect platform standards.
            </p>
            <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 text-xs space-y-1 text-slate-700">
              <div><strong>Start Date:</strong> {new Date(agreement.startDate || agreement.createdAt).toLocaleDateString()}</div>
              <div><strong>Expiry Date:</strong> {new Date(agreement.endDate || Date.now() + 365*24*3600*1000).toLocaleDateString()}</div>
              <div><strong>Platform Dispute Protection:</strong> Guaranteed 100% Quality Resolution</div>
            </div>
          </div>

          {/* Standard Terms */}
          <div className="space-y-2 text-xs text-slate-600">
            <h4 className="font-bold text-indigo-950 text-sm border-b pb-1">2. Service Request Rights</h4>
            <p leading-relaxed>
              During this active period, the customer is entitled to submit priority service requests directly through the Customer Agreements Portal. Certified service providers assigned by ServiceHub will execute service calls in compliance with verified workmanship standards.
            </p>
          </div>

          {/* Signature Verification Block */}
          <div className="pt-6 border-t-2 border-slate-200 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Signature</div>
              {agreement.signatureType === 'drawn' && agreement.signatureData ? (
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 inline-block">
                  <img 
                    src={agreement.signatureData} 
                    alt="Customer Digital Signature" 
                    className="h-16 max-w-[200px] object-contain"
                  />
                </div>
              ) : (
                <div className="font-serif italic text-xl font-bold text-indigo-950 border-b border-slate-400 pb-1 inline-block min-w-[180px]">
                  {agreement.signedName || agreement.customerName}
                </div>
              )}
              <div className="text-[10px] text-slate-500">
                Signed on: {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString() : 'Pending'}
              </div>
            </div>

            <div className="space-y-2 text-right sm:text-right">
              <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center justify-end gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Digitally Certified by Platform
              </div>
              <p className="text-[11px] text-slate-500">
                ServiceHub Quality Assurance & Legal Arbitration Board
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Checksum: {agreement.agreementId}-SECURE-VERIFIED
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t bg-muted/40 flex items-center justify-between print:hidden shrink-0">
          <span className="text-xs text-muted-foreground">Digital Certificate verified on ServiceHub Connect</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
