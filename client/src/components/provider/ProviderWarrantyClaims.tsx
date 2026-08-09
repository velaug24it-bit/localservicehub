import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  ShieldCheck, ShieldAlert, Wrench, CheckCircle2, Clock, 
  Phone, AlertCircle, RefreshCw, Send, Sparkles, User, MapPin
} from 'lucide-react';

interface ProviderWarrantyDoc {
  id: string;
  _id?: string;
  warrantyNumber: string;
  bookingId: string;
  trackingId: string;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  category: string;
  status: string;
  claims: Array<{
    id: string;
    claimDate: string;
    issueDescription: string;
    status: string;
    resolutionNotes?: string;
    assignedProviderName?: string;
  }>;
}

export default function ProviderWarrantyClaims() {
  const [claims, setClaims] = useState<ProviderWarrantyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'resolved'>('active');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadClaims = async () => {
    try {
      setLoading(true);
      const res = await api.providerWarranty.list();
      setClaims(res || []);
    } catch (err: any) {
      toast({
        title: 'Failed to load warranty rework dispatches',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleResolve = async (warrantyId: string) => {
    const notes = resolutionNotes[warrantyId] || 'Inspection and rework completed with 100% quality check.';
    setActionLoading(prev => ({ ...prev, [warrantyId]: true }));
    try {
      await api.providerWarranty.resolve(warrantyId, notes);
      toast({
        title: '✅ Rework Completed & Resolved!',
        description: 'Customer notified that zero-cost warranty rework is resolved and fulfilled.'
      });
      setResolvingId(null);
      await loadClaims();
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [warrantyId]: false }));
    }
  };

  const activeClaims = claims.filter(w => {
    const lastClaim = w.claims?.[w.claims.length - 1];
    return lastClaim?.status !== 'Resolved' && w.status !== 'Fulfilled';
  });

  const resolvedClaims = claims.filter(w => {
    const lastClaim = w.claims?.[w.claims.length - 1];
    return lastClaim?.status === 'Resolved' || w.status === 'Fulfilled';
  });

  const currentList = tab === 'active' ? activeClaims : resolvedClaims;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-500/20 p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <h3 className="font-bold text-base sm:text-lg text-foreground">Zero-Cost Warranty Rework Dispatches</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Claims assigned to you by admin for inspection and free rework protection under ServiceHub Workmanship Warranty.
          </p>
        </div>
        <button
          onClick={loadClaims}
          className="px-3 py-1.5 bg-card border border-border hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            tab === 'active'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted border border-border'
          }`}
        >
          <span>⚡ Active Rework Queue</span>
          <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
            {activeClaims.length}
          </span>
        </button>

        <button
          onClick={() => setTab('resolved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            tab === 'resolved'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-muted border border-border'
          }`}
        >
          <span>✅ Resolved Reworks History</span>
          <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
            {resolvedClaims.length}
          </span>
        </button>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading rework assignments...</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl p-12 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-500/50 mx-auto" />
          <h4 className="font-bold text-base text-foreground">
            {tab === 'active' ? 'No Active Rework Claims' : 'No Resolved Rework History'}
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {tab === 'active' 
              ? 'Great job! You have zero pending rework dispatches. All completed jobs meet top quality standards.'
              : 'Your completed and fulfilled warranty reworks will be recorded here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map(w => {
            const lastClaim = w.claims?.[w.claims.length - 1];
            const claimId = w.id || w._id;
            const isResolved = lastClaim?.status === 'Resolved' || w.status === 'Fulfilled';
            const isActionLoading = actionLoading[claimId];

            return (
              <div
                key={claimId}
                className={`bg-card border-2 rounded-2xl p-5 shadow-sm space-y-4 transition-all ${
                  isResolved ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/40 bg-card'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                        {w.warrantyNumber}
                      </span>
                      <h4 className="font-bold text-base text-foreground">{w.serviceName}</h4>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {w.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customer: <strong className="text-foreground">{w.customerName}</strong> {w.customerPhone ? `(📞 ${w.customerPhone})` : ''} · Booking: <span className="font-mono">{w.trackingId || w.bookingId}</span>
                    </p>
                  </div>

                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full border self-start sm:self-auto ${
                      isResolved
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isResolved ? '✅ Rework Resolved & Fulfilled' : '⚡ Rework Assigned to You'}
                  </span>
                </div>

                {/* Defect Description */}
                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    Customer Reported Defect:
                  </div>
                  <p className="text-foreground font-medium pl-5 leading-relaxed">
                    "{lastClaim?.issueDescription || 'No description provided'}"
                  </p>
                  {lastClaim?.resolutionNotes && (
                    <div className="pt-2 text-[11px] text-muted-foreground pl-5 border-t border-amber-500/20">
                      <strong>Resolution Notes:</strong> {lastClaim.resolutionNotes}
                    </div>
                  )}
                </div>

                {/* Rework Resolution Form */}
                {!isResolved && (
                  <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-primary" /> Mark Rework Completed
                      </span>
                      {w.customerPhone && (
                        <a 
                          href={`tel:${w.customerPhone}`}
                          className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg font-bold flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3 h-3" /> Call Customer
                        </a>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Describe inspection finding and resolution (e.g. replaced washer, pressure re-balanced)..."
                      value={resolutionNotes[claimId] || ''}
                      onChange={e => setResolutionNotes(prev => ({ ...prev, [claimId]: e.target.value }))}
                      className="w-full p-2.5 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />

                    <button
                      disabled={isActionLoading}
                      onClick={() => handleResolve(claimId)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isActionLoading ? 'Resolving Rework...' : 'Mark Rework Completed & Resolved'}</span>
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
