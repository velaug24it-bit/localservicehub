import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  ShieldCheck, Wallet, Award, Clock, ArrowRight, RotateCcw, 
  Sparkles, CheckCircle, AlertCircle, Copy, Zap, History, X, Search 
} from 'lucide-react';

interface CustomerRetentionModalProps {
  onClose: () => void;
  onRebook: (serviceData: any) => void;
}

export default function CustomerRetentionModal({ onClose, onRebook }: CustomerRetentionModalProps) {
  const [activeTab, setActiveTab] = useState<'warranties' | 'wallet' | 'rewards' | 'membership' | 'history' | 'emergency'>('warranties');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Search in History
  const [historySearch, setHistorySearch] = useState('');

  // Top-up amount state
  const [topupAmount, setTopupAmount] = useState('500');
  const [topupLoading, setTopupLoading] = useState(false);

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

  const handleTopup = async () => {
    setTopupLoading(true);
    try {
      const amt = parseFloat(topupAmount);
      if (!amt || amt <= 0) throw new Error('Enter a valid amount');
      await api.retention.topupWallet(amt);
      toast({
        title: '🎉 Wallet Top-up Successful',
        description: `₹${amt} credited instantly to your ServiceHub wallet balance.`
      });
      loadRetentionData();
    } catch (err: any) {
      toast({
        title: 'Top-up Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setTopupLoading(false);
    }
  };

  const handleRedeemPoints = async () => {
    setRedeemingPoints(true);
    try {
      const pts = parseInt(pointsInput);
      if (!pts || pts <= 0) throw new Error('Enter valid points');
      await api.retention.redeemRewardPoints(pts);
      toast({
        title: '🎁 Loyalty Points Converted',
        description: `${pts} points redeemed for ₹${pts} wallet platform cash.`
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

  const handleSubscribePlan = async (planType: string) => {
    try {
      await api.retention.subscribeMembership(planType);
      toast({
        title: '⭐ Membership Activated!',
        description: `Upgraded to ${planType.toUpperCase()} Shield. Enjoy zero emergency fees & extended warranties!`
      });
      loadRetentionData();
    } catch (err: any) {
      toast({
        title: 'Upgrade Failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingWarranty) return;
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

  const plans = [
    {
      id: 'free',
      name: 'Free Basic Shield',
      price: 0,
      badge: 'Current Standard',
      discount: '0% off',
      warranty: '90-Day Standard Warranty',
      features: ['Standard Booking Flow', 'Digital Invoice Records', 'In-App Support Chat']
    },
    {
      id: 'silver',
      name: 'Silver Shield',
      price: 199,
      badge: 'Popular',
      discount: '5% Off Services',
      warranty: '120-Day Extended Warranty',
      features: ['5% Instant Bill Discount', '120-Day Workmanship Warranty', 'Priority Chat Assistance', '₹50 Monthly Wallet Cashback']
    },
    {
      id: 'gold',
      name: 'Gold Shield',
      price: 499,
      badge: 'Best Value',
      discount: '10% Off Services',
      warranty: '180-Day Double Warranty',
      features: ['10% Instant Bill Discount', '180-Day Workmanship Warranty', 'Zero Emergency Surcharge (Save ₹150)', 'Priority SLA Dispatch', 'Dedicated Service Manager']
    },
    {
      id: 'platinum',
      name: 'Platinum Family Shield',
      price: 999,
      badge: 'VIP Elite',
      discount: '15% Off Everything',
      warranty: '365-Day Complete Annual Warranty',
      features: ['15% Platform-Wide Discount', '1-Year Full Guarantee on Spares & Labor', 'Unlimited 24/7 Rapid 30-Min Dispatch', 'Free Annual Plumbing & Electrical Safety Inspection', 'Zero Cancellation Fees']
    }
  ];

  const tabList = [
    { id: 'warranties' as const, emoji: '🛡️', label: 'Warranties', badge: data?.activeWarranties?.length || 0 },
    { id: 'wallet' as const, emoji: '💳', label: 'Wallet', badge: `₹${data?.wallet?.balance || 0}` },
    { id: 'rewards' as const, emoji: '🎁', label: 'Rewards', badge: `${data?.wallet?.rewardPoints || 0} pts` },
    { id: 'membership' as const, emoji: '⭐', label: 'Membership', badge: data?.membership?.planType?.toUpperCase() || 'FREE' },
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
                  {data?.membership?.planName || 'Free Shield'}
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

                  {(!data?.activeWarranties || data.activeWarranties.length === 0) ? (
                    <div className="p-8 sm:p-12 text-center border border-dashed border-border rounded-2xl space-y-2 sm:space-y-3">
                      <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto opacity-40" />
                      <h4 className="font-bold text-sm sm:text-base text-foreground">No Active Warranties Yet</h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Once your service specialist completes a booking, your official 90-day digital warranty certificate will automatically appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {data.activeWarranties.map((w: any) => {
                        const daysLeft = Math.max(0, Math.ceil((new Date(w.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                        const totalDays = w.durationDays || 90;
                        const pct = Math.min(100, Math.round((daysLeft / totalDays) * 100));

                        return (
                          <div key={w.id || w._id} className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4 hover:border-emerald-500/40 transition-all">
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
                                <span className="text-xs sm:text-sm font-extrabold text-foreground">{daysLeft} Days</span>
                                <span className="block text-[10px] text-muted-foreground">Remaining</span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Issued: {new Date(w.startDate).toLocaleDateString()}</span>
                                <span>Expires: {new Date(w.expiryDate).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 sm:p-2.5 rounded-xl border border-border/50 line-clamp-2">
                              "{w.coverageTerms}"
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <button
                                onClick={() => setClaimingWarranty(w)}
                                className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <AlertCircle className="w-3.5 h-3.5" /> Claim Rework
                              </button>
                              <button
                                onClick={() => {
                                  toast({ title: '📥 Certificate Downloaded', description: `Warranty certificate ${w.warrantyNumber} exported.` });
                                }}
                                className="px-2.5 sm:px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
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

                  {/* Wallet Top-up & Ledger */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    <div className="lg:col-span-5 bg-muted/30 border border-border p-4 sm:p-5 rounded-2xl space-y-3 sm:space-y-4">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Instant Wallet Top-up
                      </h4>
                      <p className="text-xs text-muted-foreground">Pre-fund your ServiceHub wallet for frictionless 1-click checkout.</p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {['250', '500', '1000'].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTopupAmount(amt)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                              topupAmount === amt ? 'bg-primary text-white border-primary' : 'bg-card border-border text-foreground hover:bg-muted'
                            }`}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleTopup}
                        disabled={topupLoading}
                        className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
                      >
                        {topupLoading ? 'Adding Credits...' : `Top-up ₹${topupAmount} Now`}
                      </button>
                    </div>

                    <div className="lg:col-span-7 bg-card border border-border p-4 sm:p-5 rounded-2xl space-y-3">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" /> Wallet Activity Ledger
                      </h4>
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {(!data?.wallet?.transactions || data.wallet.transactions.length === 0) ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No wallet transactions recorded yet.</p>
                        ) : (
                          data.wallet.transactions.map((tx: any, idx: number) => (
                            <div key={tx.id || idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/50 text-xs">
                              <div className="min-w-0 pr-2">
                                <span className="font-semibold text-foreground block truncate">{tx.description}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</span>
                              </div>
                              <span className={`font-extrabold shrink-0 ${tx.type === 'booking_payment' ? 'text-destructive' : 'text-emerald-500'}`}>
                                {tx.type === 'booking_payment' ? '-' : '+'}₹{tx.amount}
                              </span>
                            </div>
                          ))
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

              {/* ── TAB 4: MEMBERSHIP PLANS ── */}
              {activeTab === 'membership' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center max-w-2xl mx-auto space-y-1">
                    <h3 className="text-base sm:text-xl font-bold font-display text-foreground">ServiceHub Shield Membership Tiers</h3>
                    <p className="text-xs text-muted-foreground">
                      Upgrade for instant bill discounts, extended warranties, and 30-min priority dispatch.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {plans.map((p: any) => {
                      const isCurrent = data?.membership?.planType === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`bg-card border-2 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                            isCurrent
                              ? 'border-primary shadow-xl ring-2 ring-primary/20'
                              : 'border-border hover:border-border/80'
                          }`}
                        >
                          <div className="space-y-2.5 sm:space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">{p.badge}</span>
                              {isCurrent && (
                                <span className="bg-primary text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
                              )}
                            </div>
                            <h4 className="font-extrabold text-sm sm:text-base text-foreground">{p.name}</h4>
                            <div className="text-xl sm:text-2xl font-black text-foreground">
                              ₹{p.price} <span className="text-xs font-normal text-muted-foreground">/ {p.id === 'silver' ? '6 mo' : p.id === 'free' ? 'life' : 'yr'}</span>
                            </div>
                            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                              {p.discount} · {p.warranty}
                            </div>

                            <ul className="space-y-1.5 sm:space-y-2 pt-2 text-xs text-muted-foreground border-t border-border">
                              {p.features?.map((f: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button
                            onClick={() => handleSubscribePlan(p.id)}
                            disabled={isCurrent}
                            className={`w-full mt-4 sm:mt-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                              isCurrent
                                ? 'bg-muted text-muted-foreground cursor-default'
                                : 'bg-primary hover:bg-primary/90 text-white shadow-md'
                            }`}
                          >
                            {isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TAB 5: DIGITAL SERVICE HISTORY & REBOOKING ── */}
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
