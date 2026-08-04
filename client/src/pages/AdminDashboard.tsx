import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { UserCheck, ShieldAlert, CreditCard, Users, LogOut, CheckCircle, XCircle } from 'lucide-react';
import AdminServiceCatalogTab from '@/components/admin/AdminServiceCatalogTab';
import AdminMarketplaceTab from '@/components/admin/AdminMarketplaceTab';
import Footer from '@/components/Footer';

interface ProviderProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  userType: string;
  approved: boolean;
  upiId?: string;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  trackingId: string;
  customerName: string;
  customerEmail: string;
  providerName: string;
  serviceType: string;
  price: string;
  priceBreakdown?: any;
  materialsRequired?: boolean;
  materialsTotal?: number;
  materialsPaymentStatus?: string;
  payoutStatus?: string;
  date: string;
  time: string;
  advanceTransactionId: string;
  paymentStatus: string;
  createdAt: string;
}

interface DailyPayoutRecord {
  key: string;
  date: string;
  providerId: string;
  providerName: string;
  providerPhone: string;
  providerEmail: string;
  providerUpiId: string;
  revenueModel: string;
  subscriptionActive: boolean;
  totalCollectedByWebsite: number;
  platformRevenue: number;
  netPayoutOwed: number;
  payoutStatus: string;
  bookingCount: number;
  bookingIds: string[];
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'providers' | 'payments' | 'catalog' | 'marketplace'>('providers');
  const [paymentSubTab, setPaymentSubTab] = useState<'dailyPayouts' | 'transactions'>('dailyPayouts');
  const [payoutModelFilter, setPayoutModelFilter] = useState<'all' | 'commission' | 'subscription'>('all');
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [dailyPayouts, setDailyPayouts] = useState<DailyPayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.userType !== 'admin') {
      navigate('/login', { replace: true });
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const providerList = await api.admin.providers.list();
      const paymentList = await api.admin.payments.list();
      const dailyList = await api.admin.payments.getDailyPayouts();
      setProviders(providerList);
      setPayments(paymentList);
      setDailyPayouts(dailyList);
    } catch (err: any) {
      toast({ title: 'Failed to load data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      await api.admin.providers.approve(id, !currentStatus);
      toast({
        title: !currentStatus ? 'Provider Approved' : 'Approval Revoked',
        description: `Successfully updated provider status.`
      });
      setProviders(prev => prev.map(p => p.id === id ? { ...p, approved: !currentStatus } : p));
    } catch (err: any) {
      toast({ title: 'Approval update failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleTogglePaymentStatus = async (id: string, type: 'provider' | 'materials' | 'payout', currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
      const payload = type === 'provider' 
        ? { providerStatus: newStatus } 
        : type === 'materials'
        ? { materialsStatus: newStatus }
        : { payoutStatus: newStatus };
        
      await api.admin.payments.updateStatus(id, payload);
      toast({ title: 'Status Updated', description: `Marked as ${newStatus}` });
      setPayments(prev => prev.map(p => p.id === id ? { 
        ...p, 
        paymentStatus: type === 'provider' ? newStatus : p.paymentStatus,
        materialsPaymentStatus: type === 'materials' ? newStatus : (p.materialsPaymentStatus || 'Unpaid'),
        payoutStatus: type === 'payout' ? newStatus : (p.payoutStatus || 'Unpaid')
      } : p));
      loadData();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleDailyPayout = async (record: DailyPayoutRecord) => {
    try {
      const newStatus = record.payoutStatus === 'Paid' ? 'Unpaid' : 'Paid';
      await api.admin.payments.updatePayoutStatus(record.bookingIds, newStatus);
      toast({
        title: `Daily Payout Updated (${record.date})`,
        description: `Marked payout to ${record.providerName} as ${newStatus}`
      });
      setDailyPayouts(prev => prev.map(p => p.key === record.key ? { ...p, payoutStatus: newStatus } : p));
    } catch (err: any) {
      toast({ title: 'Payout status update failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      navigate('/login', { replace: true });
    }
  };

  const totalProviders = providers.length;
  const approvedProviders = providers.filter(p => p.approved).length;
  const pendingProviders = providers.filter(p => !p.approved).length;
  const totalPlatformRevenue = dailyPayouts.reduce((sum, d) => sum + d.platformRevenue, 0);
  const totalPayoutOwed = dailyPayouts.reduce((sum, d) => sum + (d.payoutStatus === 'Unpaid' ? d.netPayoutOwed : 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin block mx-auto" />
          <span className="text-sm text-muted-foreground font-medium animate-pulse">Loading Admin Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight text-foreground">ServiceHub Admin</h1>
            <p className="text-xs text-muted-foreground">System Control &amp; Payments Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Quick Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold block">{totalProviders}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Total Workers</span>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold block text-success">{approvedProviders}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Approved Profiles</span>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-lg bg-info/10 text-info">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold block text-info">₹{totalPlatformRevenue.toLocaleString('en-IN')}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Platform Revenue</span>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold block text-warning">₹{totalPayoutOwed.toLocaleString('en-IN')}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Pending Provider Payouts</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border overflow-x-auto no-scrollbar">
          {([
            { key: 'providers', label: '👷 Provider Profiles', badge: pendingProviders },
            { key: 'payments', label: '💰 Daily Payouts & Ledger', badge: 0 },
            { key: 'catalog', label: '📋 Service Catalog', badge: 0 },
            { key: 'marketplace', label: '🏪 Materials Marketplace', badge: 0 },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 font-display font-medium text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-warning text-warning-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── PROVIDERS TAB ── */}
        {activeTab === 'providers' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Worker Approvals</h3>
              <p className="text-xs text-muted-foreground">Approve or revoke worker access to sign-ins and client bookings.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-medium text-xs uppercase">
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">District</th>
                    <th className="px-6 py-3.5">Contact Details</th>
                    <th className="px-6 py-3.5">UPI Details</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {providers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No service providers registered yet.</td>
                    </tr>
                  ) : providers.map(p => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">Registered: {new Date(p.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded text-xs font-semibold">{p.location}</span>
                      </td>
                      <td className="px-6 py-4 text-xs space-y-0.5">
                        <div className="text-foreground">{p.email}</div>
                        <div className="text-muted-foreground">{p.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded font-mono">{p.upiId || 'Not Configured'}</code>
                      </td>
                      <td className="px-6 py-4">
                        {p.approved ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success font-semibold px-2 py-0.5 rounded bg-success/10 border border-success/20">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-warning font-semibold px-2 py-0.5 rounded bg-warning/10 border border-warning/20 animate-pulse">
                            <ShieldAlert className="w-3.5 h-3.5" /> Pending Approval
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleApproval(p.id, p.approved)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            p.approved
                              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20'
                              : 'bg-success text-success-foreground hover:opacity-90 shadow-sm'
                          }`}
                        >
                          {p.approved ? 'Revoke' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAYMENTS & DAILY PAYOUTS TAB ── */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {/* Sub-tab Navigation */}
            <div className="flex gap-2 border-b border-border pb-2">
              <button
                onClick={() => setPaymentSubTab('dailyPayouts')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  paymentSubTab === 'dailyPayouts'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                📅 Daily Provider Payout Ledger ({dailyPayouts.length})
              </button>
              <button
                onClick={() => setPaymentSubTab('transactions')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  paymentSubTab === 'transactions'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                📋 Customer Transactions ({payments.length})
              </button>
            </div>

            {/* Sub-tab 1: Daily Provider Payout Breakdown */}
            {paymentSubTab === 'dailyPayouts' && (() => {
              const filteredDailyPayouts = dailyPayouts.filter(rec => {
                if (payoutModelFilter === 'commission') {
                  return rec.revenueModel === 'commission' || !rec.subscriptionActive;
                }
                if (payoutModelFilter === 'subscription') {
                  return rec.revenueModel === 'subscription' && rec.subscriptionActive;
                }
                return true;
              });

              return (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">Daily Provider Payout Calculation</h3>
                      <p className="text-xs text-muted-foreground">
                        Reflects exact Rupees collected by website, platform revenue percentage taken, and payout amount owed to each provider per day.
                      </p>
                    </div>

                    {/* Revenue Model Filter Buttons */}
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg text-xs font-semibold shrink-0">
                      <button
                        onClick={() => setPayoutModelFilter('all')}
                        className={`px-3 py-1.5 rounded-md transition-all ${
                          payoutModelFilter === 'all'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        All ({dailyPayouts.length})
                      </button>
                      <button
                        onClick={() => setPayoutModelFilter('commission')}
                        className={`px-3 py-1.5 rounded-md transition-all ${
                          payoutModelFilter === 'commission'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        📊 5% Commission ({dailyPayouts.filter(r => r.revenueModel === 'commission' || !r.subscriptionActive).length})
                      </button>
                      <button
                        onClick={() => setPayoutModelFilter('subscription')}
                        className={`px-3 py-1.5 rounded-md transition-all ${
                          payoutModelFilter === 'subscription'
                            ? 'bg-success text-success-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        ★ Subscription ({dailyPayouts.filter(r => r.revenueModel === 'subscription' && r.subscriptionActive).length})
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border text-muted-foreground font-medium text-xs uppercase">
                          <th className="px-6 py-3.5">Date</th>
                          <th className="px-6 py-3.5">Provider &amp; Contact</th>
                          <th className="px-6 py-3.5">Revenue Model</th>
                          <th className="px-6 py-3.5">Total Paid to Website</th>
                          <th className="px-6 py-3.5">Platform Revenue (Fee)</th>
                          <th className="px-6 py-3.5">Net Owed to Provider</th>
                          <th className="px-6 py-3.5 text-right">Payout Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredDailyPayouts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">No provider payout records matching selected filter.</td>
                          </tr>
                        ) : filteredDailyPayouts.map(rec => (
                          <tr key={rec.key} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-foreground">{rec.date}</div>
                              <div className="text-[11px] text-muted-foreground">{rec.bookingCount} Booking{rec.bookingCount > 1 ? 's' : ''}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{rec.providerName}</div>
                              <div className="text-xs text-muted-foreground">{rec.providerPhone || rec.providerEmail}</div>
                              <div className="text-[11px] text-primary font-mono mt-0.5">UPI: {rec.providerUpiId || 'Not Configured'}</div>
                            </td>
                            <td className="px-6 py-4">
                              {rec.revenueModel === 'subscription' && rec.subscriptionActive ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-success font-bold px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
                                  ★ Subscription (0% Fee)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                  📊 5% Commission
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-bold text-foreground">
                              ₹{rec.totalCollectedByWebsite.toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 font-bold text-info">
                              ₹{rec.platformRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-base font-extrabold text-success">
                                ₹{rec.netPayoutOwed.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-muted-foreground">Amount to pay provider</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleToggleDailyPayout(rec)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                  rec.payoutStatus === 'Paid'
                                    ? 'bg-success/15 text-success hover:bg-success/25 border border-success/30'
                                    : 'bg-warning text-warning-foreground hover:opacity-90'
                                }`}
                              >
                                {rec.payoutStatus === 'Paid' ? '✓ PAID TO PROVIDER' : 'PAY PROVIDER (MARK PAID)'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Sub-tab 2: Detailed Customer Transactions */}
            {paymentSubTab === 'transactions' && (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Customer Payments &amp; Bookings Ledger</h3>
                  <p className="text-xs text-muted-foreground">List of all bookings paid by customers directly to ServiceHub website online.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground font-medium text-xs uppercase">
                        <th className="px-6 py-3.5">Booking Details</th>
                        <th className="px-6 py-3.5">Customer</th>
                        <th className="px-6 py-3.5">Provider / Service</th>
                        <th className="px-6 py-3.5">Paid to Website</th>
                        <th className="px-6 py-3.5">Provider Payout Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No transactions registered yet.</td>
                        </tr>
                      ) : payments.map(pm => (
                        <tr key={pm.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">ID: {pm.trackingId}</div>
                            <div className="text-xs text-muted-foreground">{pm.date} at {pm.time}</div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="font-semibold text-foreground">{pm.customerName}</div>
                            <div className="text-muted-foreground">{pm.customerEmail}</div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="font-semibold text-foreground">{pm.providerName}</div>
                            <div className="text-primary font-medium">{pm.serviceType}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-success">
                                ₹{pm.priceBreakdown?.grandTotal || pm.priceBreakdown?.subtotal || pm.price.replace(/\D/g, '')}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Ref: {pm.advanceTransactionId || 'Mock Online Gateway'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <button 
                                onClick={() => handleTogglePaymentStatus(pm.id, 'payout', pm.payoutStatus || 'Unpaid')}
                                className="hover:opacity-80 transition-opacity"
                                title="Click to toggle provider payout status"
                              >
                                {(pm.payoutStatus || 'Unpaid') === 'Paid' ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-success font-semibold px-2 py-1 rounded bg-success/10 border border-success/20 cursor-pointer">
                                    <CheckCircle className="w-3 h-3" /> PAID TO PROVIDER
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-warning font-semibold px-2 py-1 rounded bg-warning/10 border border-warning/20 cursor-pointer">
                                    <XCircle className="w-3 h-3" /> PAYOUT PENDING
                                  </span>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SERVICE CATALOG TAB ── */}
        {activeTab === 'catalog' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Service Catalog Management</h3>
              <p className="text-xs text-muted-foreground">Manage categories, service items, and work types. Changes take effect immediately for all users.</p>
            </div>
            <div className="p-6">
              <AdminServiceCatalogTab />
            </div>
          </div>
        )}

        {/* ── MATERIALS MARKETPLACE TAB ── */}
        {activeTab === 'marketplace' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Materials Marketplace Administration</h3>
              <p className="text-xs text-muted-foreground">Manage verified shops, inventory catalogs, prices, and track material purchases.</p>
            </div>
            <div className="p-6">
              <AdminMarketplaceTab />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
