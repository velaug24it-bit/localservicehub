import React, { useState } from 'react';
import { ShieldCheck, FileText, ArrowRight, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface AgreementOfferCardProps {
  booking: any;
  onOpenSignModal: (agreement: any) => void;
  onDismiss?: () => void;
}

export default function AgreementOfferCard({ booking, onOpenSignModal, onDismiss }: AgreementOfferCardProps) {
  const [loading, setLoading] = useState(false);

  const handleCreateAgreement = async () => {
    try {
      setLoading(true);
      const res = await api.agreements.create({ bookingId: booking.id || booking._id });
      toast({
        title: '📄 Agreement Draft Prepared',
        description: 'Review the terms and digitally sign to activate your 12-month coverage.'
      });
      onOpenSignModal(res);
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        // Fetch existing
        try {
          const myAgreements = await api.agreements.getMy();
          const existing = myAgreements.find((a: any) => a.bookingId === (booking.id || booking._id));
          if (existing) {
            onOpenSignModal(existing);
            return;
          }
        } catch (_) {}
      }
      toast({
        title: 'Could not create agreement',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 sm:p-6 border border-indigo-500/30 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-400/20 uppercase tracking-wide">
            <Sparkles className="w-3 h-3" /> Post-Service Protection
          </div>
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Activate 12-Month Service Agreement for {booking.serviceType}?
          </h4>
          <p className="text-xs text-indigo-200/80 leading-relaxed">
            Lock in guaranteed priority provider matching, 1-click on-demand service dispatch, and verified workmanship coverage for 12 months.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-indigo-200/90 font-medium">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1-Click Service Requests</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Admin Assigned Specialists</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero Upfront Deposit</span>
          </div>
        </div>

        <div className="flex sm:flex-col items-center gap-2 sm:self-center shrink-0">
          <button
            onClick={handleCreateAgreement}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {loading ? 'Preparing...' : 'Review & Sign Agreement'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs text-white/60 hover:text-white transition-colors py-1"
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
