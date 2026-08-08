import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  BarChart3, Award, Star, ShieldCheck, TrendingUp, DollarSign, Wallet,
  FileText, Sparkles, Package, GraduationCap, Building2, Download, CheckCircle,
  Clock, ArrowUpRight, ArrowDownRight, Zap, RefreshCw, Send, AlertCircle
} from 'lucide-react';

interface ProviderBusinessCenterProps {
  initialSection?: 'analytics' | 'reputation' | 'levels' | 'reports' | 'wallet' | 'insights' | 'marketplace_perks' | 'training' | 'finance';
}

export default function ProviderBusinessCenter({ initialSection = 'analytics' }: ProviderBusinessCenterProps) {
  const [section, setSection] = useState(initialSection);
  const [loading, setLoading] = useState(true);

  // States
  const [analytics, setAnalytics] = useState<any>(null);
  const [reputation, setReputation] = useState<any>(null);
  const [levels, setLevels] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [marketplace, setMarketplace] = useState<any>(null);
  const [training, setTraining] = useState<any>(null);

  // Withdrawal form
  const [withdrawAmt, setWithdrawAmt] = useState('500');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Training complete state
  const [completingCourseId, setCompletingCourseId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        analyticsRes, reputationRes, levelsRes, reportsRes, 
        walletRes, insightsRes, marketplaceRes, trainingRes
      ] = await Promise.all([
        api.providerBusiness.getAnalytics().catch(() => null),
        api.providerBusiness.getReputation().catch(() => null),
        api.providerBusiness.getLevels().catch(() => null),
        api.providerBusiness.getReports().catch(() => null),
        api.providerBusiness.getWallet().catch(() => null),
        api.providerBusiness.getInsights().catch(() => null),
        api.providerBusiness.getMarketplaceBenefits().catch(() => null),
        api.providerBusiness.getTraining().catch(() => null)
      ]);

      setAnalytics(analyticsRes);
      setReputation(reputationRes);
      setLevels(levelsRes);
      setReports(reportsRes);
      setWallet(walletRes);
      setInsights(insightsRes);
      setMarketplace(marketplaceRes);
      setTraining(trainingRes);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not load business metrics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(withdrawAmt) || 0;
    if (amt < 100) {
      toast({ title: 'Invalid Amount', description: 'Minimum withdrawal amount is ₹100', variant: 'destructive' });
      return;
    }
    setWithdrawLoading(true);
    try {
      await api.providerBusiness.withdraw(amt, withdrawUpi);
      toast({ title: '💸 Withdrawal Request Sent', description: `₹${amt} payout is queued for bank settlement.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Withdrawal Failed', description: err.message, variant: 'destructive' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleCompleteCourse = async (courseId: string) => {
    setCompletingCourseId(courseId);
    try {
      const res = await api.providerBusiness.completeCourse(courseId);
      toast({ title: '🎓 Certificate Awarded!', description: `Verified certificate issued! Your Trust Score increased to ${res.newTrustScore}/100.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Failed to Complete', description: err.message, variant: 'destructive' });
    } finally {
      setCompletingCourseId(null);
    }
  };

  const navItems = [
    { id: 'analytics', label: '📊 Business Analytics', badge: analytics?.growthRate || '+24%' },
    { id: 'reputation', label: '🏆 Trust & Reputation', badge: `${reputation?.trustScore || 96}/100` },
    { id: 'levels', label: '⭐ Provider Levels', badge: levels?.currentTier || 'Silver' },
    { id: 'reports', label: '📑 Business Reports', badge: 'PDF/Export' },
    { id: 'wallet', label: '🎯 Milestone Points & Bonus', badge: `${wallet?.milestonePoints || 0}/100 pts` },
    { id: 'insights', label: '🤖 AI Insights', badge: 'Smart' },
    { id: 'marketplace_perks', label: '📦 Marketplace Perks', badge: '12% Off' },
    { id: 'training', label: '🎓 Learning Center', badge: `${training?.courses?.length || 4} Courses` },
    { id: 'finance', label: '🏦 Future Financials', badge: 'Coming Soon' }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-nav Bar */}
      <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-2xl overflow-x-auto no-scrollbar shadow-sm">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setSection(item.id as any)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              section === item.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>{item.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              section === item.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {item.badge}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <span className="w-7 h-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading Business Center analytics...</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          
          {/* ── 1. BUSINESS ANALYTICS ── */}
          {section === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Today's Earnings</span>
                  <div className="text-2xl font-black text-foreground">₹{analytics?.todayEarnings?.toLocaleString() || 0}</div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" /> +18% vs yesterday
                  </div>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Monthly Earnings</span>
                  <div className="text-2xl font-black text-primary">₹{analytics?.monthlyEarnings?.toLocaleString() || 0}</div>
                  <div className="text-[11px] text-muted-foreground">30-Day Cumulative Net</div>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Repeat Customers</span>
                  <div className="text-2xl font-black text-foreground">{analytics?.repeatCustomers || 6} Clients</div>
                  <div className="text-[11px] text-emerald-500 font-semibold">★ 42% retention rate</div>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Avg Customer Rating</span>
                  <div className="text-2xl font-black text-amber-500 flex items-center gap-1">
                    ★ {analytics?.averageRating || 4.9}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Based on verified reviews</div>
                </div>
              </div>

              {/* Popular Services & Growth Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-card border border-border p-6 rounded-3xl space-y-4 shadow-sm">
                  <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Popular Services & Revenue Share
                  </h4>
                  <div className="space-y-3">
                    {(!analytics?.popularServices || analytics.popularServices.length === 0) ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">Complete bookings to populate your revenue breakdown.</p>
                    ) : (
                      analytics.popularServices.map((srv: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-foreground">{srv.name}</span>
                            <span className="text-muted-foreground">{srv.count} jobs ({srv.percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" style={{ width: `${Math.max(15, srv.percentage)}%` }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-card border border-indigo-500/20 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-bold text-base text-foreground">Continuous Client Lead Engine</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By keeping your job completion rate above 95% and offering 90-day digital warranty certificates, ServiceHub boosts your dispatch priority by <strong>1.5x</strong> across Tamil Nadu.
                  </p>
                  <div className="p-3.5 bg-card/80 border border-border rounded-2xl text-xs space-y-1">
                    <div className="font-bold text-foreground">Completed Jobs: {analytics?.totalCompleted || 0}</div>
                    <div className="text-muted-foreground">Cancelled: {analytics?.totalCancelled || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 2. REPUTATION & TRUST SCORE ── */}
          {section === 'reputation' && (
            <div className="space-y-6">
              <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
                    {reputation?.trustScore || 96}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground">Verified Service Specialist</h3>
                      <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">Authenticated by Government ID · Trust Score calculated from customer reviews</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-border/60">
                  <div>
                    <div className="text-lg sm:text-xl font-extrabold text-foreground">{reputation?.onTimePercentage || 98}%</div>
                    <span className="text-[11px] text-muted-foreground">On-Time Arrival</span>
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-extrabold text-foreground">{reputation?.responseRatePercentage || 99}%</div>
                    <span className="text-[11px] text-muted-foreground">Response Rate</span>
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-extrabold text-amber-500">⭐ {reputation?.averageRating || 5.0}</div>
                    <span className="text-[11px] text-muted-foreground">{reputation?.totalReviewsCount || 0} Reviews</span>
                  </div>
                </div>
              </div>

              {/* Verified Customer Reviews from Booked Customers */}
              <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Real Customer Reviews & Ratings</span>
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {reputation?.recentReviews?.length || 0} Verified Feedback Submissions
                  </span>
                </div>

                {(!reputation?.recentReviews || reputation.recentReviews.length === 0) ? (
                  <div className="p-10 text-center border border-dashed border-border rounded-2xl space-y-2">
                    <div className="text-3xl">⭐</div>
                    <h5 className="font-bold text-sm text-foreground">No customer reviews submitted yet</h5>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      When customers who booked your services leave their authentic star ratings and feedback upon job completion, their verified reviews will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reputation.recentReviews.map((rev: any, idx: number) => (
                      <div key={rev.id || idx} className="bg-muted/30 border border-border p-4 rounded-2xl space-y-2.5 text-xs hover:border-amber-500/40 transition-all flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-foreground block truncate">{rev.customerName}</span>
                              <span className="text-[10px] text-primary font-semibold block truncate">
                                {rev.serviceType}
                              </span>
                            </div>
                            <div className="flex text-amber-500 shrink-0 text-sm">
                              {'★'.repeat(rev.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (rev.rating || 5)))}
                            </div>
                          </div>

                          <p className="text-muted-foreground italic leading-relaxed bg-card/60 p-2.5 rounded-xl border border-border/40">
                            "{rev.comment || 'Great service completed on time.'}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>Verified Booking</span>
                          <span>{rev.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 3. PROVIDER LEVELS ── */}
          {section === 'levels' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-card border border-indigo-500/20 p-6 rounded-3xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Current Membership Tier</span>
                  <h3 className="text-2xl font-black text-foreground mt-1">{levels?.currentTier || 'Silver'} Specialist</h3>
                  <p className="text-xs text-muted-foreground mt-1">Unlock lower platform commissions and 2x top lead priority.</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-emerald-500">1% Commission Off</div>
                  <span className="text-[11px] text-muted-foreground">Active Benefit</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(levels?.tiers || []).map((t: any) => {
                  const isCurrent = (levels?.currentTier || 'Silver') === t.name;
                  return (
                    <div
                      key={t.name}
                      className={`bg-card border-2 rounded-3xl p-5 flex flex-col justify-between transition-all ${
                        isCurrent ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">{t.name}</span>
                          {isCurrent && <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE</span>}
                        </div>
                        <div className="text-lg font-bold text-primary">{t.commissionDiscount} Commission</div>
                        <p className="text-[11px] text-muted-foreground">Requires {t.minJobs}+ completed jobs</p>

                        <ul className="space-y-1.5 pt-2 text-xs text-muted-foreground border-t border-border">
                          {t.perks?.map((p: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 4. BUSINESS REPORTS ── */}
          {section === 'reports' && (
            <div className="space-y-6">
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Monthly & Annual Income Statements</h3>
                  <p className="text-xs text-muted-foreground">Official tax receipts, GST summaries, and exportable business records.</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export PDF / Print Statement
                </button>
              </div>

              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Completed Booking Revenue Ledger
                </div>
                <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {(!reports?.bookingsList || reports.bookingsList.length === 0) ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No completed bookings recorded in this reporting period.</p>
                  ) : (
                    reports.bookingsList.map((b: any) => (
                      <div key={b.id} className="p-4 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                        <div>
                          <div className="font-bold text-foreground">{b.service} (#{b.trackingId})</div>
                          <span className="text-[11px] text-muted-foreground">Client: {b.customer} · {b.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-600 block">+₹{b.earnings}</span>
                          <span className="text-[10px] text-muted-foreground">Fee: ₹{b.commission}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── 5. MILESTONE POINTS & PROVIDER BONUS REWARDS CENTER ── */}
          {section === 'wallet' && (
            <div className="space-y-6">
              {/* Milestone Progress Bar Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-500/25 p-5 sm:p-6 rounded-3xl space-y-3.5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      <h4 className="font-bold text-base text-foreground">Milestone Points &amp; Performance Bonus</h4>
                      <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                        ₹100 Earned = 1 Point
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      For every <strong>₹100 of payment you earn from completed jobs</strong>, you receive <strong>1 Milestone Point</strong>. Only after collecting <strong>100 Points</strong> (₹10,000 in completed work), you receive an instant <strong>₹1,000 Cash Bonus</strong> into your wallet — then your points restart from 0 for the next 100-point cycle!
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0 bg-card/80 border border-border p-3.5 rounded-2xl">
                    <div className="text-2xl font-black text-amber-500">
                      {wallet?.milestonePoints || 0} <span className="text-xs font-normal text-muted-foreground">/ 100 pts</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                      {wallet?.milestoneCyclesCompleted || 0} Cycles Completed (₹{((wallet?.milestoneCyclesCompleted || 0) * 1000).toLocaleString()} Bonus Won)
                    </span>
                  </div>
                </div>

                {/* Progress Bar towards 100 points */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-3.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border/60">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full transition-all duration-700 shadow-sm"
                      style={{ width: `${Math.min(100, Math.max(3, wallet?.milestonePoints || 0))}%` }}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between text-[11px] text-muted-foreground font-medium gap-1">
                    <span>Active Cycle: <strong className="text-foreground">{wallet?.milestonePoints || 0} pts</strong> earned from completed work</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {Math.max(0, 100 - (wallet?.milestonePoints || 0))} pts remaining to unlock ₹1,000 Bonus!
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallet Balances */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 sm:p-6 rounded-3xl shadow-xl space-y-2 relative overflow-hidden">
                  <div className="absolute right-[-15px] bottom-[-15px] w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">Available Balance</span>
                  <div className="text-3xl font-black">₹{wallet?.availableBalance || 0}</div>
                  <span className="text-[11px] text-emerald-100 block">Instant NEFT / UPI settlement</span>
                </div>

                <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Milestone Points</span>
                  <div className="text-3xl font-black text-amber-500">{wallet?.milestonePoints || 0} <span className="text-xs font-normal text-muted-foreground">pts</span></div>
                  <span className="text-[11px] text-muted-foreground block">1 point per ₹100 earned</span>
                </div>

                <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Milestone Cash Won</span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">₹{wallet?.milestoneBonusEarned || 0}</div>
                  <span className="text-[11px] text-muted-foreground block">From 100-pt cycles (₹1,000 each)</span>
                </div>

                <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Pending In-Flight</span>
                  <div className="text-3xl font-black text-foreground">₹{wallet?.pendingSettlement || 0}</div>
                  <span className="text-[11px] text-muted-foreground block">Processing bank transfer</span>
                </div>
              </div>

              {/* Withdrawal Form & Payouts Ledger */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Withdraw Form */}
                <div className="lg:col-span-5 bg-card border border-border p-6 rounded-3xl space-y-4 shadow-sm">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-500" /> Request Payout / Bank Transfer
                  </h4>

                  {(wallet?.availableBalance || 0) === 0 ? (
                    <div className="bg-muted/40 p-4 rounded-2xl border border-border/50 text-xs space-y-1.5 text-muted-foreground">
                      <p className="font-bold text-foreground">💡 How to unlock withdrawal funds:</p>
                      <p className="leading-relaxed text-[11px]">
                        Complete customer bookings to earn Milestone Points (1 pt per ₹100). Once you reach <strong>100 Points</strong>, your <strong>₹1,000 Milestone Cash Bonus</strong> will be instantly credited to your available balance and ready for bank transfer!
                      </p>
                    </div>
                  ) : null}

                  <form onSubmit={handleWithdraw} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Withdrawal Amount (₹)</label>
                      <input
                        type="number"
                        min="100"
                        max={wallet?.availableBalance || 5000}
                        value={withdrawAmt}
                        onChange={e => setWithdrawAmt(e.target.value)}
                        className="w-full p-2.5 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Amount to withdraw"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Your Bank UPI ID</label>
                      <input
                        type="text"
                        value={withdrawUpi}
                        onChange={e => setWithdrawUpi(e.target.value)}
                        placeholder="e.g. yourname@okhdfcbank"
                        className="w-full p-2.5 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={withdrawLoading || (wallet?.availableBalance || 0) < 100}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                      {withdrawLoading ? 'Processing Request...' : `Withdraw ₹${withdrawAmt} to Bank`}
                    </button>
                  </form>
                </div>

                {/* Ledger */}
                <div className="lg:col-span-7 bg-card border border-border p-6 rounded-3xl space-y-3 shadow-sm">
                  <h4 className="font-bold text-sm text-foreground">Withdrawals & Payout Requests</h4>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {(!wallet?.payoutRequests || wallet.payoutRequests.length === 0) ? (
                      <p className="text-xs text-muted-foreground text-center py-8">No withdrawal requests filed yet.</p>
                    ) : (
                      wallet.payoutRequests.map((r: any) => (
                        <div key={r.id} className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-foreground">₹{r.amount} → {r.upiId}</span>
                            <span className="text-[10px] text-muted-foreground block">{new Date(r.requestDate).toLocaleDateString()} · {r.adminNotes || 'Processing'}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'Transferred' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 6. AI BUSINESS INSIGHTS ── */}
          {section === 'insights' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-card border border-purple-500/20 p-6 rounded-3xl space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-bold text-foreground">AI Predictive Dispatch & Demand Insights</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Smart machine learning recommendations calibrated for Tamil Nadu service demand patterns.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(insights?.highDemandServices || []).map((s: any, idx: number) => (
                  <div key={idx} className="bg-card border border-border p-5 rounded-3xl space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-purple-500/10 text-purple-500 px-2.5 py-0.5 rounded-full">
                        {s.demandScore}% Demand Surge
                      </span>
                      <span className="text-xs font-black text-foreground">{s.avgTicket}</span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground">{s.service}</h4>
                    <div className="text-xs text-muted-foreground">
                      <strong>Peak Surge:</strong> {s.surgeHours}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border p-6 rounded-3xl space-y-3 shadow-sm">
                <h4 className="font-bold text-sm text-foreground">Seasonal Trend Analysis & Pro Tips</h4>
                <p className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded-2xl">
                  "{insights?.seasonalTrends}"
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {(insights?.businessTips || []).map((tip: string, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/20 border border-border/60 rounded-2xl text-xs text-foreground flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 7. MARKETPLACE PERKS ── */}
          {section === 'marketplace_perks' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-card border border-amber-500/20 p-6 rounded-3xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Provider Exclusive Benefit</span>
                  <h3 className="text-2xl font-black text-foreground mt-1">12% Wholesale Spares Discount</h3>
                  <p className="text-xs text-muted-foreground mt-1">Instant counter pickup & 30-min job-site delivery from verified hardware stores.</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-amber-500">+5% Cashback</div>
                  <span className="text-[11px] text-muted-foreground">Credited to Wallet</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(marketplace?.benefits || []).map((b: string, idx: number) => (
                  <div key={idx} className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm text-xs font-medium text-foreground">
                    <Package className="w-5 h-5 text-amber-500 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 8. TRAINING & CERTIFICATION CENTER ── */}
          {section === 'training' && (
            <div className="space-y-6">
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Provider Skill & Safety Certification Center</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Complete technical courses to earn certified digital badges, increase your Trust Score, and unlock Platinum dispatch priority.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(training?.courses || []).map((c: any) => {
                  const isDone = (training?.myCertificates || []).some((cert: any) => cert.courseId === c.id || cert.courseTitle === c.title);
                  return (
                    <div key={c.id || c._id} className="bg-card border border-border p-5 rounded-3xl flex flex-col justify-between space-y-4 shadow-sm">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">{c.level} Level</span>
                          <span className="text-xs text-muted-foreground">⏱️ {c.durationHours} Hours</span>
                        </div>
                        <h4 className="font-bold text-base text-foreground">{c.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(c.topicsCovered || []).map((t: string, idx: number) => (
                            <span key={idx} className="text-[10px] bg-muted px-2 py-0.5 rounded-lg text-foreground font-medium">
                              ✓ {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCompleteCourse(c.id || c._id)}
                        disabled={isDone || completingCourseId === (c.id || c._id)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default'
                            : 'bg-primary hover:bg-primary/90 text-white shadow-md'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-500" /> Certified Badge Active
                          </>
                        ) : completingCourseId === (c.id || c._id) ? (
                          'Issuing Certificate...'
                        ) : (
                          'Complete Exam & Claim Certificate'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 9. FUTURE FINANCIAL SERVICES ── */}
          {section === 'finance' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-card border border-blue-500/20 p-6 rounded-3xl space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-bold text-foreground">Future Provider Financial Services</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Partnering with licensed NBFCs and nationalized banks to provide low-interest business growth financing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: 'Tool & Equipment Financing', desc: 'Get modern digital multimeters, jet pumps, and power tools at 0% EMI.', badge: 'Coming Soon' },
                  { title: 'Commercial Vehicle Loans', desc: 'Low-interest two-wheeler and utility van financing for certified technicians.', badge: 'Coming Soon' },
                  { title: 'Specialist Health & Accident Cover', desc: 'Comprehensive ₹5 Lakh accidental and hospitalization coverage on client sites.', badge: 'Coming Soon' },
                  { title: 'Working Capital Credit Line', desc: 'Instant micro-credit overdraft up to ₹50,000 for purchasing marketplace spares.', badge: 'Coming Soon' }
                ].map((f, idx) => (
                  <div key={idx} className="bg-card border border-border p-5 rounded-3xl space-y-3 shadow-sm opacity-80 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{f.badge}</span>
                      <h4 className="font-bold text-sm text-foreground">{f.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                    <button disabled className="w-full py-2 bg-muted text-muted-foreground text-xs font-semibold rounded-xl cursor-not-allowed">
                      Notify Me at Launch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
