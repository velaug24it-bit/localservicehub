import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  ShieldCheck, Wallet, Award, Clock, ArrowRight, RotateCcw, 
  Sparkles, CheckCircle, AlertCircle, Copy, Zap, History, X, Search 
} from 'lucide-react';

interface CustomerRetentionModalProps {
  initialTab?: 'warranties' | 'wallet' | 'rewards' | 'history' | 'emergency';
  onClose: () => void;
  onRebook: (serviceData: any) => void;
}

export default function CustomerRetentionModal({ initialTab = 'warranties', onClose, onRebook }: CustomerRetentionModalProps) {
  const [activeTab, setActiveTab] = useState<'warranties' | 'wallet' | 'rewards' | 'history' | 'emergency'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Search in History
  const [historySearch, setHistorySearch] = useState('');

  // Withdrawal / Transfer to UPI state
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Reward points state
  const [pointsInput, setPointsInput] = useState('100');
  const [redeemingPoints, setRedeemingPoints] = useState(false);

  // Warranty claim state
  const [claimingWarranty, setClaimingWarranty] = useState<any>(null);
  const [claimIssue, setClaimIssue] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const loadRetentionData = async () => {
    try {
      setLoading(true);
      const res = await api.retention.getCustomerRetention();
      setData(res);
      if (res?.wallet?.balance && (!withdrawAmount || parseFloat(withdrawAmount) > res.wallet.balance)) {
        setWithdrawAmount(String(Math.min(100, res.wallet.balance)));
      }
    } catch (err: any) {
      toast({
        title: 'Error loading retention data',
        description: err.message || 'Failed to fetch customer benefits.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRetentionData();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid amount.', variant: 'destructive' });
      return;
    }
    if (amount > (data?.wallet?.balance || 0)) {
      toast({ title: 'Insufficient Balance', description: `You only have ₹${data?.wallet?.balance || 0} in your wallet.`, variant: 'destructive' });
      return;
    }
    if (!withdrawUpiId || !withdrawUpiId.includes('@')) {
      toast({ title: 'Invalid UPI ID', description: 'Please enter a valid UPI ID (e.g. yourname@oksbi / 9876543210@paytm).', variant: 'destructive' });
      return;
    }

    try {
      setWithdrawLoading(true);
      const res = await api.retention.withdrawWallet(amount, withdrawUpiId.trim());
      toast({
        title: '✅ Payout Deposited Successfully!',
        description: `₹${amount} transferred to UPI: ${withdrawUpiId}. New balance: ₹${res.newBalance || 0}`
      });
      setWithdrawUpiId('');
      loadRetentionData();
    } catch (err: any) {
      toast({
        title: 'Withdrawal Failed',
        description: err.message || 'Unable to process bank payout.',
        variant: 'destructive'
      });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleRedeemPoints = async () => {
    const pts = parseInt(pointsInput);
    if (!pts || pts <= 0) {
      toast({ title: 'Invalid Points', description: 'Enter at least 1 point to redeem.', variant: 'destructive' });
      return;
    }
    if (pts > (data?.wallet?.rewardPoints || 0)) {
      toast({ title: 'Insufficient Points', description: `You have ${data?.wallet?.rewardPoints || 0} reward points.`, variant: 'destructive' });
      return;
    }

    try {
      setRedeemingPoints(true);
      const res = await api.retention.redeemRewardPoints(pts);
      toast({
        title: '🎉 Points Converted to Cash!',
        description: `Converted ${pts} pts to ₹${res.cashbackAdded} wallet cash.`
      });
      loadRetentionData();
    } catch (err: any) {
      toast({
        title: 'Redemption Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setRedeemingPoints(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingWarranty) return;
    if (!claimIssue.trim()) {
      toast({ title: 'Description Required', description: 'Please describe the defect or reason for warranty rework.', variant: 'destructive' });
      return;
    }

    setClaimSubmitting(true);
    try {
      await api.retention.claimWarranty(claimingWarranty.id || claimingWarranty._id, claimIssue);
      toast({
        title: '🛡️ Free Rework Request Dispatched',
        description: 'Our Quality Assurance team will review and assign your specialist shortly.'
      });
      setClaimingWarranty(null);
      setClaimIssue('');
      loadRetentionData();
    } catch (err: any) {
      toast({
        title: 'Claim Registration Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setClaimSubmitting(false);
    }
  };

  const copyReferralCode = () => {
    if (data?.wallet?.referralCode) {
      navigator.clipboard.writeText(data.wallet.referralCode);
      toast({
        title: '📋 Referral Code Copied',
        description: `Share "${data.wallet.referralCode}" with friends for ₹150 wallet bonus on their first booking!`
      });
    }
  };

  const filteredHistory = (data?.serviceHistory || []).filter((b: any) => {
    const q = historySearch.toLowerCase();
    return (
      (b.serviceType || '').toLowerCase().includes(q) ||
      (b.providerName || '').toLowerCase().includes(q) ||
      (b.trackingId || '').toLowerCase().includes(q) ||
      (b.location || '').toLowerCase().includes(q)
    );
  });

  const tabList = [
    { id: 'warranties' as const, emoji: '🛡️', label: 'Warranties', badge: data?.activeWarranties?.length || 0 },
    { id: 'wallet' as const, emoji: '💳', label: 'Wallet', badge: `₹${data?.wallet?.balance || 0}` },
    { id: 'rewards' as const, emoji: '🎁', label: 'Rewards', badge: `${data?.wallet?.rewardPoints || 0} pts` },
    { id: 'history' as const, emoji: '📜', label: 'Service Records', badge: data?.serviceHistory?.length || 0 },
    { id: 'emergency' as const, emoji: '🚨', label: 'Emergency', badge: '30-Min' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-5xl h-[92vh] sm:h-[90vh] sm:max-h-[850px] flex flex-col shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header — compact, sticky, responsive */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-muted/40 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold font-display text-foreground truncate">
                  <span className="sm:hidden">Benefits Hub</span>
                  <span className="hidden sm:inline">Customer Benefits & Retention Hub</span>
                </h2>
                <span className="bg-primary/10 text-primary text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
                  Verified Quality Shield
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden md:block">
                Digital Warranties, Wallet Cashback, Loyalty Rewards & 1-Click Rebooking
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar — horizontally scrollable with smooth touch */}
        <div 
          className="border-b border-border bg-card flex items-center gap-1 sm:gap-2 px-2 sm:px-4 overflow-x-auto shrink-0 no-scrollbar"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {tabList.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 sm:py-3 px-2.5 sm:px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all text-xs font-semibold shrink-0 active:scale-95 ${
                  isActive
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-sm sm:text-base leading-none">{tab.emoji}</span>
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full hidden sm:inline ${
                  isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area — smoothly scrollable vertically */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs sm:text-sm font-medium">Loading your ServiceHub benefits...</p>
            </div>
          ) : (
            <>
              {/* ── TAB 1: ACTIVE WARRANTIES ── */}
              {activeTab === 'warranties' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                        <h3 className="font-bold text-sm sm:text-base text-foreground">100% Workmanship Warranty Guarantee</h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Every completed job comes with up to 180-day free rework protection covering labor defects & certified spares.
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <div className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {data?.activeWarranties?.length || 0} Protected
                      </div>
                      <span className="text-[10px] text-muted-foreground">Active Certificates</span>
                    </div>
                  </div>

                  {(!data?.allWarranties || data.allWarranties.length === 0) ? (
                    <div className="p-8 sm:p-12 text-center border border-dashed border-border rounded-2xl space-y-2 sm:space-y-3">
                      <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto opacity-40" />
                      <h4 className="font-bold text-sm sm:text-base text-foreground">No Active Warranties Yet</h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Once your service specialist completes a booking, your official digital warranty certificate will automatically appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {data.allWarranties.map((w: any) => {
                        const daysLeft = Math.max(0, Math.ceil((new Date(w.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                        const totalDays = w.durationDays || 90;
                        const pct = Math.min(100, Math.round((daysLeft / totalDays) * 100));

                        const lastClaim = w.claims?.[w.claims.length - 1];
                        const isFulfilled = w.status === 'Fulfilled' || w.isUsed || lastClaim?.status === 'Resolved';
                        const isClaimPending = w.status === 'Claimed' || lastClaim?.status === 'Pending' || lastClaim?.status === 'Specialist Assigned';

                        return (
                          <div key={w.id || w._id} className={`bg-card border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4 transition-all ${
                            isFulfilled ? 'border-emerald-500/30 bg-emerald-500/5' : isClaimPending ? 'border-amber-500/30 bg-amber-500/5' : 'border-border hover:border-emerald-500/40'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                                  {w.warrantyNumber}
                                </span>
                                <h4 className="font-bold text-sm sm:text-base text-foreground mt-1 truncate">{w.serviceName}</h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  Specialist: <span className="font-semibold text-foreground">{w.providerName}</span>
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                {isFulfilled ? (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">Fulfilled</span>
                                ) : (
                                  <>
                                    <span className="text-xs sm:text-sm font-extrabold text-foreground">{daysLeft} Days</span>
                                    <span className="block text-[10px] text-muted-foreground">Remaining</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isFulfilled ? 'bg-emerald-500/40' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${isFulfilled ? 100 : pct}%` }} />
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Issued: {new Date(w.startDate).toLocaleDateString()}</span>
                                <span>Expires: {new Date(w.expiryDate).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 sm:p-2.5 rounded-xl border border-border/50 line-clamp-2">
                              "{w.coverageTerms}"
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                              {isFulfilled ? (
                                <span className="px-3 py-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold rounded-xl text-xs flex items-center gap-1.5 border border-emerald-500/30">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Rework Fulfilled & Completed
                                </span>
                              ) : isClaimPending ? (
                                <span className="px-3 py-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-amber-500/30">
                                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Rework In Progress
                                </span>
                              ) : (
                                <button
                                  onClick={() => setClaimingWarranty(w)}
                                  className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" /> Claim Rework
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  toast({ title: '📥 Certificate Downloaded', description: `Warranty certificate ${w.warrantyNumber} exported.` });
                                }}
                                className="px-2.5 sm:px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors ml-auto"
                              >
                                View Terms
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: CUSTOMER WALLET ── */}
              {activeTab === 'wallet' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl space-y-3 sm:space-y-4 relative overflow-hidden">
                      <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Available Balance</span>
                        <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-200" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">₹{data?.wallet?.balance || 0}</div>
                      <div className="flex items-center gap-2 pt-2 border-t border-white/15 text-xs text-indigo-100">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate">Usable automatically at checkout</span>
                      </div>
                    </div>

                    <div className="bg-card border border-border p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
                        <span>Cashback Balance</span>
                        <Award className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-foreground">₹{data?.wallet?.cashbackBalance || 0}</div>
                      <p className="text-[11px] text-muted-foreground">Earn 5% cashback on all completed services and spares.</p>
                    </div>

                    <div className="bg-card border border-border p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col justify-between space-y-3 sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
                        <span>Referral Bonus</span>
                        <Copy className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-extrabold text-foreground tracking-wider bg-muted px-3 py-1 rounded-xl truncate">
                          {data?.wallet?.referralCode || 'SH-SPECIAL'}
                        </span>
                        <button onClick={copyReferralCode} className="p-2 hover:bg-muted rounded-xl text-primary transition-colors shrink-0" title="Copy code">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Give ₹100, get ₹150 wallet credits for every friend who books.</p>
                    </div>
                  </div>

                  {/* Wallet Deposit to Account (UPI) & Ledger */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    <div className="lg:col-span-5 bg-gradient-to-br from-card to-muted/40 border border-border p-4 sm:p-5 rounded-2xl space-y-3 sm:space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-500" /> Transfer Balance to Account (UPI)
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Instant Payout
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Transfer your available wallet balance directly to your bank account via UPI.
                      </p>
                      
                      <form onSubmit={handleWithdraw} className="space-y-3 pt-1">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <label className="font-bold text-foreground">Withdrawal Amount (₹)</label>
                            <span className="text-muted-foreground text-[11px]">
                              Available: <strong className="text-foreground">₹{data?.wallet?.balance || 0}</strong>
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">₹</span>
                            <input
                              type="number"
                              min="1"
                              max={data?.wallet?.balance || 10000}
                              required
                              value={withdrawAmount}
                              onChange={(e) => setWithdrawAmount(e.target.value)}
                              placeholder="Enter amount"
                              className="w-full pl-7 pr-3 py-2 text-sm bg-background border border-border rounded-xl font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Quick Amount Selectors */}
                        <div className="grid grid-cols-4 gap-1.5 text-xs">
                          {['50', '100', '250'].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setWithdrawAmount(amt)}
                              className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                withdrawAmount === amt ? 'bg-primary text-primary-foreground border-primary font-bold' : 'bg-muted/50 border-border text-foreground hover:bg-muted'
                              }`}
                            >
                              ₹{amt}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setWithdrawAmount(String(data?.wallet?.balance || 0))}
                            className="py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all truncate"
                          >
                            All (₹{data?.wallet?.balance || 0})
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">Your Bank UPI ID</label>
                          <input
                            type="text"
                            required
                            value={withdrawUpiId}
                            onChange={(e) => setWithdrawUpiId(e.target.value)}
                            placeholder="e.g. name@okhdfcbank or 9840994649@paytm"
                            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={withdrawLoading || !data?.wallet?.balance || data?.wallet?.balance <= 0}
                          className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          {withdrawLoading ? 'Processing Transfer...' : `Transfer ₹${withdrawAmount || 0} to UPI Account`}
                        </button>
                      </form>
                    </div>

                    <div className="lg:col-span-7 bg-card border border-border p-4 sm:p-5 rounded-2xl space-y-3">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" /> Wallet Activity Ledger
                      </h4>
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {(!data?.wallet?.transactions || data.wallet.transactions.length === 0) ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No wallet transactions recorded yet.</p>
                        ) : (
                          data.wallet.transactions.map((tx: any, idx: number) => {
                            const isDebit = tx.type === 'booking_payment' || tx.type === 'withdrawal';
                            return (
                              <div key={tx.id || idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/50 text-xs">
                                <div className="min-w-0 pr-2">
                                  <span className="font-semibold text-foreground block truncate">{tx.description}</span>
                                  <span className="text-[10px] text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</span>
                                </div>
                                <span className={`font-extrabold shrink-0 ${isDebit ? 'text-destructive' : 'text-emerald-500'}`}>
                                  {isDebit ? '-' : '+'}₹{tx.amount}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: LOYALTY REWARDS ── */}
              {activeTab === 'rewards' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-500/20 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                        {data?.rules?.activeCampaignName || 'Monsoon Rewards'} (1.5x)
                      </span>
                      <h3 className="text-base sm:text-xl font-bold text-foreground">Earn 5 Points on Every ₹100 Spent</h3>
                      <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                        Convert loyalty points instantly into wallet cashback. 1 Reward Point = ₹1 Rupee real platform credit.
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <div className="text-2xl sm:text-3xl font-extrabold text-amber-500">{data?.wallet?.rewardPoints || 0}</div>
                      <span className="text-xs font-bold text-muted-foreground">Available Points</span>
                    </div>
                  </div>

                  <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4">
                    <h4 className="font-bold text-sm sm:text-base text-foreground">Redeem Points to Wallet Balance</h4>
                    <p className="text-xs text-muted-foreground">Choose how many points to convert into instant rupee discount credits:</p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 max-w-md">
                      <input
                        type="number"
                        min="10"
                        max={data?.wallet?.rewardPoints || 1000}
                        value={pointsInput}
                        onChange={e => setPointsInput(e.target.value)}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Points to redeem"
                      />
                      <button
                        onClick={handleRedeemPoints}
                        disabled={redeemingPoints || (parseInt(pointsInput) > (data?.wallet?.rewardPoints || 0))}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all whitespace-nowrap disabled:opacity-50 active:scale-95"
                      >
                        {redeemingPoints ? 'Redeeming...' : `Convert to ₹${pointsInput || 0}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: DIGITAL SERVICE HISTORY & REBOOKING ── */}
              {activeTab === 'history' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1 max-w-sm w-full">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search service, specialist or ID..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{filteredHistory.length} Recorded Services</span>
                  </div>

                  {filteredHistory.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center border border-dashed border-border rounded-2xl space-y-2">
                      <p className="text-xs text-muted-foreground">No service history matching your query.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 sm:space-y-3">
                      {filteredHistory.map((b: any) => (
                        <div 
                          key={b.id || b._id} 
                          className="bg-card border border-border p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary/40 transition-all shadow-sm"
                        >
                          <div className="space-y-1 min-w-0 w-full sm:w-auto">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{b.serviceType}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                              }`}>
                                {b.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Specialist: <span className="font-medium text-foreground">{b.providerName}</span> · {b.date} at {b.time}
                            </p>
                            <div className="text-[11px] text-muted-foreground">
                              Location: {b.location} · Total: <span className="font-bold text-foreground">₹{b.priceBreakdown?.subtotal || b.price}</span>
                            </div>
                          </div>

                          <div className="w-full sm:w-auto flex items-center justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
                            <button
                              onClick={() => {
                                onRebook({
                                  providerId: b.providerId,
                                  providerName: b.providerName,
                                  category: b.category,
                                  location: b.location,
                                  serviceType: b.serviceType
                                });
                                onClose();
                              }}
                              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Rebook Specialist
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 6: EMERGENCY PRIORITY DISPATCH ── */}
              {activeTab === 'emergency' && (
                <div className="bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-500/20 p-5 sm:p-8 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                      <Zap className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-xl font-bold text-foreground">24/7 Emergency Rapid Dispatch (30-Min SLA)</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                        Experiencing an active pipe burst, electrical short circuit, or security lock malfunction? Trigger our highest-priority dispatch algorithm to reach the nearest certified technician immediately.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
                    <div className="bg-card/80 border border-border p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs space-y-1">
                      <div className="font-bold text-foreground">⏱️ 30-Min Response</div>
                      <div className="text-muted-foreground leading-relaxed">Direct cellular dispatch alert to the top 3 nearest specialists.</div>
                    </div>
                    <div className="bg-card/80 border border-border p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs space-y-1">
                      <div className="font-bold text-foreground">🛡️ Priority Warranty</div>
                      <div className="text-muted-foreground leading-relaxed">Emergency fixes automatically receive 180-day double warranty protection.</div>
                    </div>
                    <div className="bg-card/80 border border-border p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs space-y-1">
                      <div className="font-bold text-foreground">💰 Flat ₹150 Surcharge</div>
                      <div className="text-muted-foreground leading-relaxed">Transparent emergency fee waived for Gold & Platinum Shield members.</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        toast({ title: '🚨 Emergency Mode Active', description: 'Select your service specialist to initiate 30-min priority dispatch.' });
                        onClose();
                      }}
                      className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Zap className="w-4 h-4" /> Book Emergency Service Now
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Claim Warranty Modal */}
        {claimingWarranty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setClaimingWarranty(null)}>
            <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm sm:text-base text-foreground">File Warranty Rework Claim</h4>
                  <p className="text-xs text-muted-foreground truncate">Certificate: {claimingWarranty.warrantyNumber}</p>
                </div>
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Describe the Workmanship / Spare Defect</label>
                  <textarea
                    rows={3}
                    required
                    value={claimIssue}
                    onChange={e => setClaimIssue(e.target.value)}
                    placeholder="e.g. Minor tap dripping or switch looseness..."
                    className="w-full p-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setClaimingWarranty(null)}
                    className="px-3.5 py-2 bg-muted text-foreground text-xs font-semibold rounded-xl hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={claimSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {claimSubmitting ? 'Registering...' : 'Dispatch Specialist'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
