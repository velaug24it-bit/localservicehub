import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  Bot, TrendingUp, TrendingDown, Target, Award, Star, Users, 
  Calendar, CheckCircle2, AlertTriangle, Sparkles, RefreshCw, 
  ArrowUpRight, ArrowDownRight, DollarSign, Activity, Zap, 
  ShieldCheck, HelpCircle, Save, BarChart3
} from 'lucide-react';

export default function AIBusinessCoach() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);

  // Editable goals state
  const [revenueTarget, setRevenueTarget] = useState<number>(0);
  const [bookingTarget, setBookingTarget] = useState<number>(0);
  const [ratingTarget, setRatingTarget] = useState<number>(5.0);
  const [repeatTarget, setRepeatTarget] = useState<number>(0);

  const fetchCoachData = async () => {
    try {
      setLoading(true);
      const res = await api.aiCoach.getCoachData();
      setData(res);
      if (res?.goals) {
        setRevenueTarget(res.goals.monthlyRevenueTarget || 0);
        setBookingTarget(res.goals.monthlyBookingTarget || 0);
        setRatingTarget(res.goals.ratingTarget || 5.0);
        setRepeatTarget(res.goals.repeatCustomerTarget || 0);
      }
    } catch (err: any) {
      toast({
        title: 'Error loading AI Coach',
        description: err.message || 'Failed to load business analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoachData();
  }, []);

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGoals(true);
      await api.aiCoach.saveGoals({
        monthlyRevenueTarget: Number(revenueTarget),
        monthlyBookingTarget: Number(bookingTarget),
        ratingTarget: Number(ratingTarget),
        repeatCustomerTarget: Number(repeatTarget)
      });
      toast({
        title: '🎯 Goals Updated',
        description: 'Your monthly business targets have been saved successfully.'
      });
      fetchCoachData();
    } catch (err: any) {
      toast({
        title: 'Failed to save goals',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSavingGoals(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border shadow-sm min-h-[300px] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Analyzing real-time business telemetry & performance...</p>
      </div>
    );
  }

  const revenueMoMGrowth = data?.lastMonthRevenue > 0
    ? Math.round(((data.thisMonthRevenue - data.lastMonthRevenue) / data.lastMonthRevenue) * 100)
    : data?.thisMonthRevenue > 0 ? 100 : 0;

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: 'Elite Tier', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    if (score >= 60) return { label: 'Strong Growth', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    if (score >= 40) return { label: 'Building Momentum', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    return { label: 'Early Stage', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
  };

  const scoreBadge = getScoreBadge(data?.healthScore || 0);

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-6 md:p-8 border border-indigo-900/50 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI Business Coach • Live Telemetry
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Smart Growth & Performance Engine
            </h2>
            <p className="text-indigo-200/80 text-sm max-w-2xl">
              Real data aggregated from your bookings, customer reviews, completed transactions, and peak customer demand hours.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCoachData}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-2 border border-white/10 transition-all backdrop-blur-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Data
            </button>
          </div>
        </div>

        {/* Health Score Gauge Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-xs text-indigo-200 font-medium">Business Health Score</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">{data?.healthScore || 0}</span>
              <span className="text-xs text-white/50">/ 100</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${scoreBadge.color}`}>
                {scoreBadge.label}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-400 transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(5, data?.healthScore || 0))}%` }}
              />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-xs text-indigo-200 font-medium">This Month Net Earnings</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">₹{data?.thisMonthRevenue?.toLocaleString() || 0}</span>
              {revenueMoMGrowth !== 0 && (
                <span className={`text-xs font-bold flex items-center ${revenueMoMGrowth > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {revenueMoMGrowth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(revenueMoMGrowth)}%
                </span>
              )}
            </div>
            <div className="text-[11px] text-indigo-200/60 mt-1">
              Last month: ₹{data?.lastMonthRevenue?.toLocaleString() || 0}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-xs text-indigo-200 font-medium">Completed Jobs</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{data?.completedBookings || 0}</span>
              <span className="text-xs text-indigo-200/70 font-normal">of {data?.totalBookings || 0} total</span>
            </div>
            <div className="text-[11px] text-indigo-200/60 mt-1">
              Cancellation rate: {data?.cancellationRate || 0}%
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-xs text-indigo-200 font-medium">Customer Rating</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {data?.avgRating ? data.avgRating : 'N/A'}
              </span>
              <div className="flex text-amber-400 text-xs">
                {'★'.repeat(Math.round(data?.avgRating || 0))}
              </div>
            </div>
            <div className="text-[11px] text-indigo-200/60 mt-1">
              Based on {data?.totalReviews || 0} verified customer reviews
            </div>
          </div>
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Repeat Customers */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Retention</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data?.repeatCustomers || 0}
            <span className="text-xs font-normal text-muted-foreground ml-2">Repeat Clients</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground">Retention Rate:</span>
            <span className="font-bold text-indigo-600">{data?.repeatCustomerRate || 0}%</span>
          </div>
        </div>

        {/* Peak Demand Day */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peak Demand Day</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data?.peakDay || 'Not enough data'}
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            Highest customer booking volume day
          </div>
        </div>

        {/* Total Lifetime Volume */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lifetime Volume</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            ₹{data?.totalRevenue?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            Total completed work processed
          </div>
        </div>

        {/* Quality Standing */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cancellation Ratio</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data?.cancellationRate || 0}%
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            {Number(data?.cancellationRate || 0) <= 5 ? '🟢 Excellent completion reliability' : '🟡 Maintain low cancellation'}
          </div>
        </div>
      </div>

      {/* ── 6-MONTH REVENUE & BOOKINGS TREND ── */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> 6-Month Work & Revenue Velocity
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical monthly trends calculated from your completed service orders
            </p>
          </div>
        </div>

        {data?.revenueTrend && data.revenueTrend.length > 0 ? (
          <div className="grid grid-cols-6 gap-2 md:gap-4 pt-4">
            {data.revenueTrend.map((m: any, idx: number) => {
              const maxRev = Math.max(...data.revenueTrend.map((t: any) => t.revenue || 0), 1000);
              const heightPct = Math.max(12, Math.round((m.revenue / maxRev) * 100));
              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-foreground">₹{m.revenue >= 1000 ? `${(m.revenue / 1000).toFixed(1)}k` : m.revenue}</div>
                  <div className="w-full bg-muted rounded-xl h-36 flex items-end p-1 overflow-hidden">
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-lg transition-all duration-700 hover:brightness-110 flex items-center justify-center text-[10px] text-white font-bold"
                      style={{ height: `${heightPct}%` }}
                      title={`${m.month}: ₹${m.revenue} (${m.bookings} jobs)`}
                    >
                      {m.bookings > 0 && <span className="hidden sm:inline">{m.bookings}</span>}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium text-center truncate w-full">
                    {m.month.split(' ')[0]}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Complete bookings to view your monthly earnings trend graph.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── TOP SERVICES BREAKDOWN ── */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Top Revenue Service Categories
            </h3>
            <span className="text-xs text-muted-foreground">By Volume</span>
          </div>

          {data?.topServices && data.topServices.length > 0 ? (
            <div className="space-y-3 pt-2">
              {data.topServices.map((srv: any, idx: number) => {
                const total = data.completedBookings || 1;
                const pct = Math.round((srv.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground font-semibold flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {srv.name}
                      </span>
                      <span className="text-muted-foreground">{srv.count} jobs ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No completed services yet. Completed bookings will appear ranked here.
            </div>
          )}
        </div>

        {/* ── AI STRATEGIC RECOMMENDATIONS ── */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500" /> Actionable AI Growth Directives
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
              Personalized
            </span>
          </div>

          <div className="space-y-2.5 pt-2">
            {data?.recommendations && data.recommendations.length > 0 ? (
              data.recommendations.map((rec: any, idx: number) => {
                const isPositive = rec.type === 'positive';
                const isWarning = rec.type === 'warning';
                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-all ${
                      isPositive 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-200' 
                        : isWarning 
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200' 
                        : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-900 dark:text-indigo-200'
                    }`}
                  >
                    {isPositive && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                    {!isPositive && !isWarning && <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />}
                    <span className="leading-relaxed font-medium">{rec.text}</span>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                AI Coach is monitoring your activity. Complete more jobs to generate tailored strategies.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── GOAL SETTING & TARGET TRACKER ── */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-rose-500" /> Monthly Growth Targets & Accountability Tracker
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set and track this month's milestones. AI Coach measures your progress in real time.
            </p>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full self-start sm:self-auto">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <form onSubmit={handleSaveGoals} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue Target */}
            <div className="space-y-2 bg-muted/40 p-4 rounded-xl border">
              <label className="text-xs font-bold text-foreground">Monthly Revenue Target (₹)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={revenueTarget}
                onChange={(e) => setRevenueTarget(Number(e.target.value))}
                placeholder="e.g. 25000"
                className="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>Current: ₹{data?.thisMonthRevenue || 0}</span>
                <span className="font-bold text-primary">
                  {revenueTarget > 0 ? `${Math.min(100, Math.round(((data?.thisMonthRevenue || 0) / revenueTarget) * 100))}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${revenueTarget > 0 ? Math.min(100, ((data?.thisMonthRevenue || 0) / revenueTarget) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Bookings Target */}
            <div className="space-y-2 bg-muted/40 p-4 rounded-xl border">
              <label className="text-xs font-bold text-foreground">Monthly Jobs Target</label>
              <input
                type="number"
                min="0"
                step="1"
                value={bookingTarget}
                onChange={(e) => setBookingTarget(Number(e.target.value))}
                placeholder="e.g. 20"
                className="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>Current: {data?.thisMonthBookings || 0}</span>
                <span className="font-bold text-primary">
                  {bookingTarget > 0 ? `${Math.min(100, Math.round(((data?.thisMonthBookings || 0) / bookingTarget) * 100))}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${bookingTarget > 0 ? Math.min(100, ((data?.thisMonthBookings || 0) / bookingTarget) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Rating Target */}
            <div className="space-y-2 bg-muted/40 p-4 rounded-xl border">
              <label className="text-xs font-bold text-foreground">Rating Quality Target (★)</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={ratingTarget}
                onChange={(e) => setRatingTarget(Number(e.target.value))}
                placeholder="e.g. 4.8"
                className="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>Current: {data?.avgRating || 'N/A'}</span>
                <span className="font-bold text-amber-500">
                  Target: {ratingTarget} ★
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${data?.avgRating ? Math.min(100, (data.avgRating / 5) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Repeat Customer Target */}
            <div className="space-y-2 bg-muted/40 p-4 rounded-xl border">
              <label className="text-xs font-bold text-foreground">Repeat Clients Target</label>
              <input
                type="number"
                min="0"
                step="1"
                value={repeatTarget}
                onChange={(e) => setRepeatTarget(Number(e.target.value))}
                placeholder="e.g. 5"
                className="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>Current: {data?.repeatCustomers || 0}</span>
                <span className="font-bold text-primary">
                  {repeatTarget > 0 ? `${Math.min(100, Math.round(((data?.repeatCustomers || 0) / repeatTarget) * 100))}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full"
                  style={{ width: `${repeatTarget > 0 ? Math.min(100, ((data?.repeatCustomers || 0) / repeatTarget) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingGoals}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingGoals ? 'Saving Targets...' : 'Save Monthly Targets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
