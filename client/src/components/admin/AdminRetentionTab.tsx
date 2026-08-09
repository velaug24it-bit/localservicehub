import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { ShieldCheck, Award, Wallet, CheckCircle, Clock, AlertCircle, Save, Send } from 'lucide-react';

import BookingChatModal from '../chat/BookingChatModal';
import AdminWarrantyClaimsTab from './AdminWarrantyClaimsTab';

export default function AdminRetentionTab() {
  const [subTab, setSubTab] = useState<'overview' | 'top_providers' | 'warranties' | 'rewards' | 'payouts' | 'chats'>('overview');
  const [loading, setLoading] = useState(true);

  // States
  const [overview, setOverview] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [topProviders, setTopProviders] = useState<any[]>([]);
  const [customBonusAmount, setCustomBonusAmount] = useState<Record<string, string>>({});
  const [awardingBonus, setAwardingBonus] = useState<Record<string, boolean>>({});
  const [rules, setRules] = useState<any>({
    pointsPerHundredRupees: 1,
    redemptionRate: 1,
    welcomeBonusPoints: 50,
    referralBonusRupees: 50,
    emergencySurcharge: 150,
    activeCampaignName: 'Festival Service Rewards Extravaganza'
  });
  const [payouts, setPayouts] = useState<any[]>([]);
  const [adminConversations, setAdminConversations] = useState<any[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [selectedAuditBookingId, setSelectedAuditBookingId] = useState<string | null>(null);

  // Claim edit
  const [claimStatus, setClaimStatus] = useState<Record<string, string>>({});
  const [claimNotes, setClaimNotes] = useState<Record<string, string>>({});

  // Payout transfer state
  const [transferRef, setTransferRef] = useState<Record<string, string>>({});
  const [savingRules, setSavingRules] = useState(false);

  const loadRetentionData = async () => {
    try {
      setLoading(true);
      const [overviewRes, claimsRes, rulesRes, payoutsRes, chatsRes, topProvidersRes] = await Promise.all([
        api.admin.retention.getOverview().catch(() => null),
        api.admin.retention.getWarrantyClaims().catch(() => []),
        api.admin.retention.getRules().catch(() => null),
        api.admin.retention.getPayoutRequests().catch(() => []),
        api.chat.getAdminConversations(chatSearch).catch(() => []),
        api.admin.retention.getTopProviders().catch(() => ({ topProviders: [] }))
      ]);

      setOverview(overviewRes);
      setClaims(claimsRes || []);
      if (rulesRes) setRules(rulesRes);
      setPayouts(payoutsRes || []);
      setAdminConversations(chatsRes || []);
      setTopProviders(topProvidersRes?.topProviders || []);
    } catch (err: any) {
      toast({ title: 'Error loading retention data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAwardBonus = async (provider: any) => {
    const amt = parseInt(customBonusAmount[provider.providerId] || String(provider.recommendedBonus || 500), 10);
    if (!amt || amt <= 0) return toast({ title: 'Invalid Bonus', description: 'Please enter a valid bonus amount', variant: 'destructive' });

    setAwardingBonus(prev => ({ ...prev, [provider.providerId]: true }));
    try {
      await api.admin.retention.awardTopProviderBonus({
        providerId: provider.providerId,
        bonusAmount: amt,
        bonusTitle: provider.bonusTitle,
        rank: provider.rank
      });
      toast({
        title: `🏆 Top #${provider.rank} Bonus Granted!`,
        description: `₹${amt.toLocaleString()} credited directly to ${provider.providerName}'s wallet.`
      });
      loadRetentionData();
    } catch (err: any) {
      toast({ title: 'Award Failed', description: err.message, variant: 'destructive' });
    } finally {
      setAwardingBonus(prev => ({ ...prev, [provider.providerId]: false }));
    }
  };

  useEffect(() => {
    loadRetentionData();
  }, []);

  const handleSearchChats = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.chat.getAdminConversations(chatSearch);
      setAdminConversations(res || []);
    } catch (err: any) {
      toast({ title: 'Search failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    try {
      await api.admin.retention.updateRules(rules);
      toast({ title: '💾 Loyalty & Emergency Rules Saved', description: 'Changes are live across customer bookings.' });
      loadRetentionData();
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingRules(false);
    }
  };

  const handleUpdateClaim = async (warrantyId: string) => {
    const status = claimStatus[warrantyId] || 'Specialist Assigned';
    const resolutionNotes = claimNotes[warrantyId] || 'Quality team assigned specialist for free inspection.';
    try {
      await api.admin.retention.updateWarrantyClaim(warrantyId, { status, resolutionNotes });
      toast({ title: '🛡️ Claim Status Updated', description: `Warranty claim marked as "${status}".` });
      loadRetentionData();
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdatePayout = async (requestId: string, status: string) => {
    const referenceId = transferRef[requestId] || `NEFT-${Date.now().toString().slice(-6)}`;
    try {
      await api.admin.retention.updatePayoutRequest(requestId, {
        status,
        referenceId,
        adminNotes: status === 'Transferred' ? `Settled via bank IMPS/UPI ref: ${referenceId}` : 'Payout rejected by admin'
      });
      toast({ title: '💸 Payout Request Updated', description: `Status changed to ${status}.` });
      loadRetentionData();
    } catch (err: any) {
      toast({ title: 'Payout Update Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sub Tabs — horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-3 min-w-max sm:min-w-0 sm:flex-wrap">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'top_providers', label: `🏆 Top 5 Providers (${topProviders.length})` },
            { id: 'warranties', label: `🛡️ Claims (${claims.length})` },
            { id: 'rewards', label: '🎁 Loyalty Rules' },
            { id: 'payouts', label: `💰 Payouts (${payouts.length})` },
            { id: 'chats', label: `💬 Chat Audits (${adminConversations.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                subTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <span className="w-7 h-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs">Loading Retention Management data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* ── SUB TAB 1: OVERVIEW ── */}
          {subTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Active Warranties</span>
                  <div className="text-2xl font-black text-emerald-500">{overview?.activeWarranties || 0}</div>
                  <span className="text-[10px] text-muted-foreground">Certified Digital Certificates</span>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Warranty Claims</span>
                  <div className="text-2xl font-black text-amber-500">{overview?.claimedWarranties || 0}</div>
                  <span className="text-[10px] text-muted-foreground">Free rework inspection requests</span>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Paid Memberships</span>
                  <div className="text-2xl font-black text-primary">{overview?.activeMemberships || 0}</div>
                  <span className="text-[10px] text-muted-foreground">Silver / Gold / Platinum</span>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Pending Wallet Payouts</span>
                  <div className="text-2xl font-black text-foreground">₹{overview?.pendingPayoutsTotal?.toLocaleString() || 0}</div>
                  <span className="text-[10px] text-muted-foreground">Owed to service specialists</span>
                </div>
              </div>
            </div>
          )}

          {/* ── SUB TAB: TOP 5 PROVIDERS LEADERBOARD & PERFORMANCE BONUSES ── */}
          {subTab === 'top_providers' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-500/20 p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Top 5 Providers Performance Leaderboard</h3>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                    Automated platform ranking based on <strong>Verified Work Completed</strong> and <strong>Customer Rating Stars</strong>. Award star bonuses directly to the top 5 specialists to encourage quality retention!
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0 bg-card/80 border border-border p-3 sm:p-4 rounded-2xl">
                  <div className="text-xl sm:text-2xl font-black text-amber-500">{topProviders.length} Ranked</div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Top Specialists</span>
                </div>
              </div>

              {topProviders.length === 0 ? (
                <div className="bg-card border border-border rounded-3xl p-12 text-center text-muted-foreground space-y-2">
                  <div className="text-4xl mb-2">⭐</div>
                  <h4 className="font-bold text-foreground text-sm">No provider performance records yet</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    When providers complete customer bookings and earn 5-star reviews, their ranking will calculate here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topProviders.map((p: any) => {
                    const rankMedals = ['🥇 #1', '🥈 #2', '🥉 #3', '⭐ #4', '🌟 #5'];
                    const rankColors = [
                      'border-amber-500/50 bg-gradient-to-r from-amber-500/5 to-transparent',
                      'border-slate-400/50 bg-gradient-to-r from-slate-500/5 to-transparent',
                      'border-amber-700/50 bg-gradient-to-r from-amber-800/5 to-transparent',
                      'border-indigo-500/50 bg-gradient-to-r from-indigo-500/5 to-transparent',
                      'border-emerald-500/50 bg-gradient-to-r from-emerald-500/5 to-transparent'
                    ];

                    const isAwarding = awardingBonus[p.providerId];
                    const bonusVal = customBonusAmount[p.providerId] ?? String(p.recommendedBonus || 500);

                    return (
                      <div
                        key={p.providerId}
                        className={`bg-card border-2 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all ${
                          rankColors[p.rank - 1] || 'border-border'
                        }`}
                      >
                        <div className="space-y-3 min-w-0 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm sm:text-base font-black px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {rankMedals[p.rank - 1] || `#${p.rank}`}
                            </span>
                            <h4 className="font-bold text-base sm:text-lg text-foreground">{p.providerName}</h4>
                            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                              {p.category}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              📞 {p.providerPhone}
                            </span>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
                              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Jobs Completed</span>
                              <strong className="text-sm font-extrabold text-foreground">{p.completedJobs} Jobs</strong>
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
                              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Customer Rating</span>
                              <strong className="text-sm font-extrabold text-amber-500">⭐ {p.customerRating} / 5.0</strong>
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
                              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Milestone Points</span>
                              <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                                🎯 {p.milestonePoints}/100 pts
                              </strong>
                              <span className="text-[9px] text-muted-foreground block">({p.milestoneCycles || 0} cycles achieved)</span>
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
                              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Work Volume</span>
                              <strong className="text-sm font-extrabold text-foreground">₹{(p.totalRevenue || 0).toLocaleString()}</strong>
                            </div>
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>Award Tier: <strong className="text-foreground">{p.bonusTitle}</strong></span>
                            {p.topBonusEarned > 0 && (
                              <span className="text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Total Star Bonuses Received: ₹{p.topBonusEarned.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Panel: Award Cash Bonus */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">Bonus (₹):</span>
                            <input
                              type="number"
                              min="100"
                              step="50"
                              value={bonusVal}
                              onChange={e => setCustomBonusAmount({ ...customBonusAmount, [p.providerId]: e.target.value })}
                              className="px-3 py-1.5 bg-muted border border-border rounded-xl text-xs font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 w-28 text-right"
                            />
                          </div>

                          <button
                            onClick={() => handleAwardBonus(p)}
                            disabled={isAwarding}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 whitespace-nowrap"
                          >
                            <span>🏆</span>
                            <span>{isAwarding ? 'Crediting Wallet...' : `Award ₹${parseInt(bonusVal, 10) || p.recommendedBonus} Bonus`}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SUB TAB 2: WARRANTY CLAIMS ── */}
          {subTab === 'warranties' && (
            <AdminWarrantyClaimsTab />
          )}

          {/* ── SUB TAB 3: REWARD & EMERGENCY RULES ── */}
          {subTab === 'rewards' && (
            <div className="bg-card border border-border p-6 rounded-3xl space-y-6 shadow-sm max-w-3xl">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-base text-foreground">Platform Loyalty Rewards & Emergency Dispatch Settings</h4>
              </div>

              <form onSubmit={handleSaveRules} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Reward Points per ₹100 Spent</label>
                  <input
                    type="number"
                    value={rules.pointsPerHundredRupees || 5}
                    onChange={e => setRules({ ...rules, pointsPerHundredRupees: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Redemption Rate (1 Point = ₹ Rupee)</label>
                  <input
                    type="number"
                    value={rules.redemptionRate || 1}
                    onChange={e => setRules({ ...rules, redemptionRate: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Welcome Bonus Points (New Users)</label>
                  <input
                    type="number"
                    value={rules.welcomeBonusPoints || 100}
                    onChange={e => setRules({ ...rules, welcomeBonusPoints: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Referral Bonus (₹ to Wallet)</label>
                  <input
                    type="number"
                    value={rules.referralBonusRupees || 150}
                    onChange={e => setRules({ ...rules, referralBonusRupees: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Emergency Rapid Dispatch Surcharge (₹)</label>
                  <input
                    type="number"
                    value={rules.emergencySurcharge || 150}
                    onChange={e => setRules({ ...rules, emergencySurcharge: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Active Promotional Campaign Title</label>
                  <input
                    type="text"
                    value={rules.activeCampaignName || ''}
                    onChange={e => setRules({ ...rules, activeCampaignName: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingRules}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> {savingRules ? 'Saving Settings...' : 'Save Loyalty & Emergency Rules'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── SUB TAB 4: PROVIDER WALLET PAYOUTS ── */}
          {subTab === 'payouts' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border font-bold text-xs uppercase text-muted-foreground">
                Provider Wallet Payout Requests & Bank Settlements
              </div>
              <div className="divide-y divide-border/60">
                {payouts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">No provider withdrawal requests pending.</p>
                ) : (
                  payouts.map(r => (
                    <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">₹{r.amount} → {r.upiId}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'Transferred' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Specialist: <strong>{r.providerName}</strong> ({r.providerPhone}) · Requested: {new Date(r.requestDate).toLocaleDateString()}
                        </p>
                      </div>

                      {r.status === 'Pending' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Bank IMPS/NEFT ref..."
                            value={transferRef[r.id] || ''}
                            onChange={e => setTransferRef({ ...transferRef, [r.id]: e.target.value })}
                            className="px-3 py-1.5 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-40"
                          />
                          <button
                            onClick={() => handleUpdatePayout(r.id, 'Transferred')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                          >
                            Mark Transferred
                          </button>
                          <button
                            onClick={() => handleUpdatePayout(r.id, 'Rejected')}
                            className="px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── SUB TAB 5: SUPPORT & CHAT AUDITS ── */}
          {subTab === 'chats' && (
            <div className="space-y-6">
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Support & In-App Chat Audits</h3>
                  <p className="text-xs text-muted-foreground">
                    Inspect booking conversations for warranty disputes, customer complaints, and quality assurance.
                  </p>
                </div>

                {/* Search */}
                <form onSubmit={handleSearchChats} className="flex gap-2 max-w-sm w-full">
                  <input
                    type="text"
                    placeholder="Search by #Booking ID or name..."
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Search
                  </button>
                </form>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border font-bold text-xs uppercase text-muted-foreground">
                  Recorded Booking Conversations Ledger
                </div>
                <div className="divide-y divide-border/60">
                  {adminConversations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-10">No chat conversations match your search.</p>
                  ) : (
                    adminConversations.map(c => (
                      <div key={c.id || c._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-sm text-foreground truncate">#{c.bookingId} — {c.serviceType}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              c.status === 'open' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                            }`}>
                              {c.status?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Customer: <strong className="text-foreground">{c.customerName}</strong> · Specialist: <strong className="text-foreground">{c.providerName}</strong>
                          </p>
                          <div className="text-xs bg-muted/40 p-2 rounded-xl text-foreground/80 truncate">
                            <strong>Last:</strong> "{c.lastMessage || 'No messages recorded'}"
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSelectedAuditBookingId(c.bookingId)}
                            className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                          >
                            Inspect Chat
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Audit Modal */}
      {selectedAuditBookingId && (
        <BookingChatModal
          bookingId={selectedAuditBookingId}
          onClose={() => setSelectedAuditBookingId(null)}
        />
      )}
    </div>
  );
}
