import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { UserCheck, ShieldAlert, CreditCard, Users, LogOut, CheckCircle, XCircle } from 'lucide-react';
import AdminServiceCatalogTab from '@/components/admin/AdminServiceCatalogTab';
import AdminMarketplaceTab from '@/components/admin/AdminMarketplaceTab';

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
  date: string;
  time: string;
  advanceTransactionId: string;
  paymentStatus: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'providers' | 'payments' | 'catalog' | 'marketplace'>('providers');
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
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
      setProviders(providerList);
      setPayments(paymentList);
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

  const handleTogglePaymentStatus = async (id: string, type: 'provider' | 'materials', currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
      const payload = type === 'provider' 
        ? { providerStatus: newStatus } 
        : { materialsStatus: newStatus };
        
      await api.admin.payments.updateStatus(id, payload);
      toast({ title: 'Payment Status Updated', description: `Marked as ${newStatus}` });
      setPayments(prev => prev.map(p => p.id === id ? { 
        ...p, 
        paymentStatus: type === 'provider' ? newStatus : p.paymentStatus,
        materialsPaymentStatus: type === 'materials' ? newStatus : p.materialsPaymentStatus
      } : p));
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
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
  const totalAdvanceFeesCollected = payments.length * 50;

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
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold block text-warning">{pendingProviders}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Pending Approval</span>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-lg bg-info/10 text-info">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-bold block text-info">₹{totalAdvanceFeesCollected}</span>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Admin Advance Fees</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border overflow-x-auto no-scrollbar">
          {([
            { key: 'providers', label: '👷 Provider Profiles', badge: pendingProviders },
            { key: 'payments', label: '💰 Payments Ledger', badge: 0 },
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

        {/* ── PAYMENTS TAB ── */}
        {activeTab === 'payments' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Payments &amp; Bookings Ledger</h3>
              <p className="text-xs text-muted-foreground">List of customer bookings showing Razorpay advance payments and direct service provider payments.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-medium text-xs uppercase">
                    <th className="px-6 py-3.5">Booking Details</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Provider / Service</th>
                    <th className="px-6 py-3.5">Advance Paid (Admin)</th>
                    <th className="px-6 py-3.5">Final Status (Provider)</th>
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
                          <span className="text-sm font-bold text-success">₹50.00</span>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Ref: {pm.advanceTransactionId || 'Mock / Offline'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-semibold text-foreground">Fee: ₹{pm.priceBreakdown?.subtotal || pm.price.replace(/\D/g, '')}</span>
                          <button 
                            onClick={() => handleTogglePaymentStatus(pm.id, 'provider', pm.paymentStatus)}
                            className="hover:opacity-80 transition-opacity"
                            title="Click to toggle payment status"
                          >
                            {pm.paymentStatus === 'Paid' ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-success font-semibold px-1.5 py-0.5 rounded bg-success/10 border border-success/20 cursor-pointer">
                                <CheckCircle className="w-3 h-3" /> PAID
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted border border-border cursor-pointer">
                                <XCircle className="w-3 h-3" /> UNPAID
                              </span>
                            )}
                          </button>
                        </div>
                        {pm.materialsRequired && (
                          <div className="flex flex-col items-start gap-1 mt-3 border-t border-border/50 pt-2">
                            <span className="text-xs font-semibold text-foreground text-primary">Materials: ₹{pm.materialsTotal || 0}</span>
                            <button 
                              onClick={() => handleTogglePaymentStatus(pm.id, 'materials', pm.materialsPaymentStatus || 'Unpaid')}
                              className="hover:opacity-80 transition-opacity"
                              title="Click to toggle materials payment status"
                            >
                              {(pm.materialsPaymentStatus || 'Unpaid') === 'Paid' ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-success font-semibold px-1.5 py-0.5 rounded bg-success/10 border border-success/20 cursor-pointer">
                                  <CheckCircle className="w-3 h-3" /> PAID
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted border border-border cursor-pointer">
                                  <XCircle className="w-3 h-3" /> UNPAID
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}
