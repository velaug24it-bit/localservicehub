import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  ShieldAlert, ShieldCheck, UserCheck, Clock, CheckCircle2, 
  AlertCircle, Phone, MessageSquare, Search, RefreshCw, Send, Sparkles, User, Wrench
} from 'lucide-react';
import BookingChatModal from '../chat/BookingChatModal';

interface WarrantyClaimDoc {
  id: string;
  _id?: string;
  warrantyNumber: string;
  bookingId: string;
  trackingId: string;
  userId: string;
  customerName: string;
  customerPhone?: string;
  providerId: string;
  providerName: string;
  serviceName: string;
  category: string;
  serviceAmount: number;
  startDate: string;
  expiryDate: string;
  status: 'Active' | 'Claimed' | 'Expired';
  coverageTerms?: string;
  claims: Array<{
    id: string;
    claimDate: string;
    issueDescription: string;
    status: 'Pending' | 'Approved' | 'Specialist Assigned' | 'Resolved' | 'Rejected';
    resolutionNotes?: string;
    assignedProviderId?: string;
    assignedProviderName?: string;
  }>;
}

export default function AdminWarrantyClaimsTab() {
  const [warranties, setWarranties] = useState<WarrantyClaimDoc[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChatBookingId, setActiveChatBookingId] = useState<string | null>(null);

  // Edit / assignment state per claim
  const [selectedProvider, setSelectedProvider] = useState<Record<string, { id: string; name: string }>>({});
  const [claimStatus, setClaimStatus] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [savingClaimId, setSavingClaimId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [claimsRes, provList] = await Promise.all([
        api.admin.retention.getWarrantyClaims().catch(() => []),
        api.admin.providers.list().catch(() => [])
      ]);
      setWarranties(claimsRes || []);
      setProviders(provList || []);
    } catch (err: any) {
      toast({
        title: 'Failed to load warranty claims',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick 1-Click: Approve & Assign Original Provider
  const handleApproveAndAssignOriginal = async (w: WarrantyClaimDoc) => {
    const claimId = w.id || w._id;
    if (!claimId) return;

    setSavingClaimId(claimId);
    try {
      const defaultNote = `Approved by Admin. Original specialist ${w.providerName} assigned for zero-cost inspection and rework.`;
      await api.admin.retention.updateWarrantyClaim(claimId, {
        status: 'Specialist Assigned',
        assignedProviderId: w.providerId,
        assignedProviderName: w.providerName,
        resolutionNotes: defaultNote
      });

      toast({
        title: '🛡️ Provider Assigned & Dispatched!',
        description: `${w.providerName} has been assigned for warranty rework on ${w.serviceName}. Customer & provider notified.`
      });

      await loadData();
    } catch (err: any) {
      toast({
        title: 'Assignment Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSavingClaimId(null);
    }
  };

  // Custom Save & Dispatch
  const handleSaveClaim = async (w: WarrantyClaimDoc) => {
    const claimId = w.id || w._id;
    if (!claimId) return;

    const lastClaim = w.claims?.[w.claims.length - 1];
    const newStatus = claimStatus[claimId] || lastClaim?.status || 'Specialist Assigned';
    const notes = resolutionNotes[claimId] !== undefined ? resolutionNotes[claimId] : (lastClaim?.resolutionNotes || '');
    const provChoice = selectedProvider[claimId] || {
      id: lastClaim?.assignedProviderId || w.providerId,
      name: lastClaim?.assignedProviderName || w.providerName
    };

    setSavingClaimId(claimId);
    try {
      await api.admin.retention.updateWarrantyClaim(claimId, {
        status: newStatus,
        assignedProviderId: provChoice.id,
        assignedProviderName: provChoice.name,
        resolutionNotes: notes
      });

      toast({
        title: 'Claim Updated Successfully',
        description: `Status updated to ${newStatus}. Assigned: ${provChoice.name}.`
      });

      await loadData();
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSavingClaimId(null);
    }
  };

  // Filtered claims
  const filteredClaims = warranties.filter(w => {
    const lastClaim = w.claims?.[w.claims.length - 1];
    const status = lastClaim?.status || 'Pending';

    if (filterStatus !== 'all' && status.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = w.customerName?.toLowerCase().includes(q);
      const matchProv = w.providerName?.toLowerCase().includes(q);
      const matchService = w.serviceName?.toLowerCase().includes(q);
      const matchWrn = w.warrantyNumber?.toLowerCase().includes(q);
      const matchDefect = lastClaim?.issueDescription?.toLowerCase().includes(q);
      return matchName || matchProv || matchService || matchWrn || matchDefect;
    }

    return true;
  });

  // Metrics
  const pendingCount = warranties.filter(w => {
    const last = w.claims?.[w.claims.length - 1];
    return !last?.status || last?.status === 'Pending';
  }).length;

  const assignedCount = warranties.filter(w => {
    const last = w.claims?.[w.claims.length - 1];
    return last?.status === 'Specialist Assigned' || last?.status === 'Approved';
  }).length;

  const resolvedCount = warranties.filter(w => {
    const last = w.claims?.[w.claims.length - 1];
    return last?.status === 'Resolved';
  }).length;

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-amber-500 block">{pendingCount}</span>
            <span className="text-xs text-muted-foreground font-semibold">Pending Approval</span>
          </div>
        </div>

        <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-primary block">{assignedCount}</span>
            <span className="text-xs text-muted-foreground font-semibold">In Rework Progress</span>
          </div>
        </div>

        <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-emerald-500 block">{resolvedCount}</span>
            <span className="text-xs text-muted-foreground font-semibold">Resolved Reworks</span>
          </div>
        </div>

        <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-foreground block">{warranties.length}</span>
            <span className="text-xs text-muted-foreground font-semibold">Total Claims Logged</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All Claims', count: warranties.length },
            { key: 'pending', label: '⏳ Pending Approval', count: pendingCount },
            { key: 'specialist assigned', label: '👷 Assigned / In Progress', count: assignedCount },
            { key: 'resolved', label: '✅ Resolved', count: resolvedCount }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterStatus === f.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>{f.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/30">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customer, provider, defect..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={loadData}
            className="p-2 border border-border bg-card hover:bg-muted text-foreground rounded-xl transition-colors shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Warranty Claims List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs font-semibold">Loading warranty claims...</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-3xl p-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h4 className="font-bold text-base text-foreground">No Warranty Claims Found</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {filterStatus === 'all'
                ? 'When a customer reports an issue or requests a warranty rework, it will appear here for admin approval and provider assignment.'
                : `No claims currently matching the "${filterStatus}" filter.`}
            </p>
          </div>
        ) : (
          filteredClaims.map(w => {
            const lastClaim = w.claims?.[w.claims.length - 1];
            const claimId = w.id || w._id;
            const currentStatus = claimStatus[claimId] || lastClaim?.status || 'Pending';
            const isPending = !lastClaim?.status || lastClaim?.status === 'Pending';
            const isAssigned = lastClaim?.status === 'Specialist Assigned' || lastClaim?.status === 'Approved';
            const isResolved = lastClaim?.status === 'Resolved';
            const isSaving = savingClaimId === claimId;

            const assignedProvName = lastClaim?.assignedProviderName || w.providerName;
            const assignedProvId = lastClaim?.assignedProviderId || w.providerId;

            return (
              <div
                key={claimId}
                className={`bg-card border-2 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 transition-all ${
                  isPending
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : isResolved
                    ? 'border-emerald-500/30'
                    : 'border-border'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                        {w.warrantyNumber}
                      </span>
                      <h3 className="font-bold text-base text-foreground">{w.serviceName}</h3>
                      <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {w.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Claim Filed: <strong>{new Date(lastClaim?.claimDate || w.startDate).toLocaleDateString()}</strong> · Booking ID: <span className="font-mono">{w.trackingId || w.bookingId}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                        isPending
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
                          : isAssigned
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : isResolved
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {isPending ? '⏳ Pending Admin Approval' : `Status: ${lastClaim?.status}`}
                    </span>
                  </div>
                </div>

                {/* Customer & Original Provider Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
                  {/* Customer Information */}
                  <div className="bg-muted/40 p-3.5 sm:p-4 rounded-xl border border-border/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Customer Details
                    </span>
                    <div className="font-bold text-sm text-foreground">{w.customerName}</div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <span>📞 {w.customerPhone || 'Phone available on booking'}</span>
                      {w.customerPhone && (
                        <a href={`tel:${w.customerPhone}`} className="text-primary hover:underline font-semibold">
                          Call
                        </a>
                      )}
                    </div>
                    <div className="text-muted-foreground pt-1">
                      Warranty Expiry: <strong className="text-foreground">{new Date(w.expiryDate).toLocaleDateString()}</strong> ({w.durationDays || 90} Days Protection)
                    </div>
                  </div>

                  {/* Original Provider who did the work */}
                  <div className="bg-muted/40 p-3.5 sm:p-4 rounded-xl border border-border/60 space-y-1.5 relative overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-500" /> Original Worker / Specialist
                    </span>
                    <div className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>{w.providerName}</span>
                      <span className="text-[10px] bg-amber-500/15 text-amber-600 font-bold px-2 py-0.2 rounded-full">
                        Original Specialist
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Completed original service. Recommended to assign for zero-cost inspection & rework.
                    </p>
                    {assignedProvName && assignedProvName !== w.providerName && (
                      <div className="pt-1 text-[11px] text-primary font-semibold">
                        Currently Re-assigned to: <strong>{assignedProvName}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Defect Description from Customer */}
                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 sm:p-4 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    Customer Reported Defect / Issue:
                  </div>
                  <p className="text-foreground font-medium pl-5 leading-relaxed">
                    "{lastClaim?.issueDescription || 'No description provided'}"
                  </p>
                </div>

                {/* 1-Click Action & Admin Assignment Controls */}
                <div className="bg-card border border-border p-4 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-bold text-xs uppercase text-muted-foreground">
                      Admin Rework Assignment & Status
                    </h4>

                    {/* Prominent 1-Click: Approve & Assign Same Provider */}
                    {isPending && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleApproveAndAssignOriginal(w)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>⚡ Approve & Assign Same Provider ({w.providerName})</span>
                      </button>
                    )}
                  </div>

                  {/* Manual Assignment Options & Resolution Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="font-bold text-foreground block">Assign Specialist</label>
                      <select
                        value={selectedProvider[claimId]?.id || assignedProvId || w.providerId}
                        onChange={e => {
                          const p = providers.find(prov => (prov.id || prov._id) === e.target.value);
                          if (p) {
                            setSelectedProvider({
                              ...selectedProvider,
                              [claimId]: { id: p.id || p._id, name: p.name }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={w.providerId}>👷 {w.providerName} (Original Provider)</option>
                        {providers
                          .filter(p => (p.id || p._id) !== w.providerId)
                          .map(p => (
                            <option key={p.id || p._id} value={p.id || p._id}>
                              {p.name} ({p.category || 'Specialist'})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="font-bold text-foreground block">Claim Status</label>
                      <select
                        value={currentStatus}
                        onChange={e => setClaimStatus({ ...claimStatus, [claimId]: e.target.value })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Pending">⏳ Pending Approval</option>
                        <option value="Specialist Assigned">👷 Specialist Assigned</option>
                        <option value="Approved">👍 Approved (Ready)</option>
                        <option value="Resolved">✅ Resolved (Completed)</option>
                        <option value="Rejected">❌ Rejected (Invalid)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-5 space-y-1">
                      <label className="font-bold text-foreground block">Resolution Notes / Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. Assigned for free inspection tomorrow 10 AM..."
                        value={resolutionNotes[claimId] !== undefined ? resolutionNotes[claimId] : (lastClaim?.resolutionNotes || '')}
                        onChange={e => setResolutionNotes({ ...resolutionNotes, [claimId]: e.target.value })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveChatBookingId(w.bookingId || w.trackingId)}
                      className="px-3 py-2 border border-border bg-card hover:bg-muted text-foreground rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      <span>Chat with Parties</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveClaim(w)}
                      className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving & Dispatching...' : 'Save & Dispatch Rework'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Modal for Audit/Support */}
      {activeChatBookingId && (
        <BookingChatModal
          bookingId={activeChatBookingId}
          onClose={() => setActiveChatBookingId(null)}
        />
      )}
    </div>
  );
}
