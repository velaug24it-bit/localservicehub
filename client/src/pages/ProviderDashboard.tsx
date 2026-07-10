import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import ProviderProfileTab from '@/components/provider/ProviderProfileTab';
import NotificationBell from '@/components/NotificationBell';
import { trackingSteps } from '@/data/providers';
import { Calendar, DollarSign, ShieldAlert, Award, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface ProviderBooking {
  id: string;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  service_type: string;
  category: string;
  date: string;
  time: string;
  description: string | null;
  phone: string;
  location: string;
  price: string;
  status: string;
  payment_status: string;
  current_step: number;
  created_at: string;
}

interface BillingStatus {
  isActive: boolean;
  lastActivationDate: string;
  earnings: number;
  daysRemaining: number;
  amountDue: number;
}

const ProviderDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'queue' | 'earnings' | 'profile' | 'subscription'>('bookings');
  const [filter, setFilter] = useState<'all' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled'>('all');
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProviderBookings();
      fetchBillingStatus();
    }
  }, [user]);

  const fetchProviderBookings = async () => {
    if (!user) return;
    try {
      const data = await api.bookings.list();
      if (data) {
        const mapped = data.map((b: any) => ({
          id: b.id,
          tracking_id: b.trackingId,
          customer_name: b.customerName,
          customer_email: b.customerEmail,
          service_type: b.serviceType,
          category: b.category,
          date: b.date,
          time: b.time,
          description: b.description || '',
          phone: b.phone,
          location: b.location,
          price: b.price,
          status: b.status,
          payment_status: b.paymentStatus || 'Unpaid',
          current_step: b.currentStep,
          created_at: b.createdAt
        }));
        setBookings(mapped);
      }
    } catch (err: any) {
      toast({ title: 'Fetch failed', description: err.message, variant: 'destructive' });
    }
  };

  const fetchBillingStatus = async () => {
    setBillingLoading(true);
    try {
      const data = await api.providers.getBillingStatus();
      setBilling(data);
    } catch (err: any) {
      console.warn('Failed to load subscription status:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProviderBookings();
      fetchBillingStatus();
    }
  }, [user, activeTab]);

  const updateBookingStatus = async (id: string, status: string, step: number) => {
    try {
      const updated = await api.bookings.update(id, { status, currentStep: step });
      setBookings(prev => prev.map(b => b.id === id ? {
        ...b,
        status: updated.status,
        current_step: updated.currentStep
      } : b));
      toast({ title: `Booking ${status}` });
      // Refresh billing status since earnings might change
      await fetchBillingStatus();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login', { replace: true });
    }
  };

  // Helper to load Razorpay Script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleReactivate = async () => {
    if (!billing) return;
    setBillingLoading(true);
    try {
      const order = await api.payments.createReactivationOrder();

      // Free Activation
      if (order.free) {
        await api.providers.reactivate({});
        toast({ title: 'Reactivated!', description: 'Profile is now active and visible to clients.' });
        await fetchBillingStatus();
        setBillingLoading(false);
        return;
      }

      // Mock checkout fallback
      if (order.mock) {
        toast({ title: 'Mock Payment Portal', description: 'Simulating reactivation settlement...' });
        setTimeout(async () => {
          try {
            await api.providers.reactivate({ razorpayOrderId: order.id });
            toast({ title: 'Reactivated!', description: 'Subscription renewed successfully.' });
            await fetchBillingStatus();
            setBillingLoading(false);
          } catch (err: any) {
            toast({ title: 'Reactivation failed', description: err.message, variant: 'destructive' });
            setBillingLoading(false);
          }
        }, 1500);
        return;
      }

      // Real Razorpay integration
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({ title: 'Payment SDK Error', description: 'Failed to load Razorpay.', variant: 'destructive' });
        setBillingLoading(false);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'ServiceHub Commission',
        description: `10% commission on earnings (₹${order.amountDue})`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await api.providers.reactivate({
              razorpayOrderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            toast({ title: 'Payment Confirmed', description: 'Your profile has been reactivated successfully!' });
            await fetchBillingStatus();
          } catch (err: any) {
            toast({ title: 'Reactivation signature mismatch', description: err.message, variant: 'destructive' });
          } finally {
            setBillingLoading(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Reactivation failed', description: err.message, variant: 'destructive' });
      setBillingLoading(false);
    }
  };

  const filteredBookings = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const waitingQueue = bookings
    .filter(b => b.status === 'Confirmed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const activeWork = bookings.filter(b => b.status === 'In Progress');

  const parsePrice = (price: string): number => {
    const numbers = price.match(/\d+/g);
    if (!numbers || numbers.length === 0) return 0;
    return parseInt(numbers[0]);
  };

  const totalEarnings = bookings
    .filter(b => b.payment_status === 'Paid')
    .reduce((sum, b) => sum + parsePrice(b.price), 0);

  const pendingPayment = bookings
    .filter(b => b.status !== 'Cancelled' && b.payment_status !== 'Paid')
    .reduce((sum, b) => sum + parsePrice(b.price), 0);

  const stats = {
    total: bookings.length,
    active: bookings.filter(b => b.status === 'Confirmed' || b.status === 'In Progress').length,
    completed: bookings.filter(b => b.status === 'Completed').length,
    cancelled: bookings.filter(b => b.status === 'Cancelled').length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold gradient-text">ServiceHub Provider</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">{user?.name}</span>
            <button onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium flex items-center gap-1 shrink-0">
              <span>🚪</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Subscription Active Warning Alert */}
      {billing && !billing.isActive && (
        <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
            <span>
              <strong>Profile Inactive:</strong> Your 30-day active period has expired. Your profile is currently <strong>hidden from clients</strong> in searches and AI matches. 
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('subscription')}
            className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shrink-0"
          >
            Reactivate Profile
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Bookings', value: stats.total, icon: '📋', color: 'bg-primary/10 text-primary' },
            { label: 'Active', value: stats.active, icon: '🔄', color: 'bg-warning/10 text-warning' },
            { label: 'Completed', value: stats.completed, icon: '✅', color: 'bg-success/10 text-success' },
            { label: 'Earnings', value: `₹${totalEarnings.toLocaleString()}`, icon: '💰', color: 'bg-info/10 text-info' },
            { label: 'Pending Pay', value: `₹${pendingPayment.toLocaleString()}`, icon: '⏳', color: 'bg-accent text-accent-foreground' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-5 hover:shadow-card transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{s.icon}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
              </div>
              <div className="text-2xl font-display font-bold text-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-6 max-w-xl overflow-x-auto">
          {(['bookings', 'queue', 'earnings', 'profile', 'subscription'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-md text-sm font-semibold capitalize transition-all whitespace-nowrap px-3 ${
                activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              }`}>
              {tab === 'queue' ? 'Queue' : tab === 'subscription' ? 'Subscription 💳' : tab}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div>
            {activeWork.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  🔧 Currently In Progress
                </h3>
                <div className="space-y-4">
                  {activeWork.map(b => (
                    <BookingCard key={b.id} booking={b} onUpdateStatus={updateBookingStatus} highlight />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {(['all', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-3">📭</div>
                <p>No bookings found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map(b => (
                  <BookingCard key={b.id} booking={b} onUpdateStatus={updateBookingStatus} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div>
            <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              📋 Waiting Queue ({waitingQueue.length} upcoming)
            </h3>
            {waitingQueue.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-3">✨</div>
                <p>No upcoming bookings in queue.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingQueue.map((b, idx) => (
                  <div key={b.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-card transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div>
                            <span className="font-display font-semibold text-foreground">{b.customer_name}</span>
                            <span className="text-xs text-muted-foreground ml-2">#{b.tracking_id}</span>
                          </div>
                          <div className="text-sm font-semibold text-foreground">{b.price}</div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                          <span>🔧 {b.service_type}</span>
                          <span>📅 {b.date} at {b.time}</span>
                          <span>📍 {b.location}</span>
                          <span>📞 {b.phone}</span>
                        </div>
                        {b.description && (
                          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mb-2">{b.description}</p>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => updateBookingStatus(b.id, 'In Progress', 1)}
                            className="px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-semibold hover:bg-warning/20 transition-colors">
                            ▶ Start Job
                          </button>
                          <button onClick={() => updateBookingStatus(b.id, 'Cancelled', -1)}
                            className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors">
                            ✖ Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-2xl font-display font-bold text-foreground">₹{totalEarnings.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Earned</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="text-3xl mb-2">⏳</div>
                <div className="text-2xl font-display font-bold text-foreground">₹{pendingPayment.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Pending (In Progress)</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-display font-bold text-foreground">{stats.completed}</div>
                <div className="text-sm text-muted-foreground">Jobs Completed</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="text-3xl mb-2">📈</div>
                <div className="text-2xl font-display font-bold text-foreground">
                  ₹{stats.completed ? Math.round(totalEarnings / stats.completed).toLocaleString() : 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg per Job</div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Payment Settlement</h3>
              {bookings.filter(b => b.status === 'Completed' || b.status === 'In Progress').length === 0 ? (
                <p className="text-muted-foreground text-sm">No payment records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 text-muted-foreground font-medium">Customer</th>
                        <th className="pb-3 text-muted-foreground font-medium">Service</th>
                        <th className="pb-3 text-muted-foreground font-medium">Date</th>
                        <th className="pb-3 text-muted-foreground font-medium">Amount</th>
                        <th className="pb-3 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings
                        .filter(b => b.status === 'Completed' || b.status === 'In Progress')
                        .map(b => (
                          <tr key={b.id} className="border-b border-border last:border-0">
                            <td className="py-3 text-foreground">{b.customer_name}</td>
                            <td className="py-3 text-muted-foreground">{b.service_type}</td>
                            <td className="py-3 text-muted-foreground">{b.date}</td>
                            <td className="py-3 font-semibold text-foreground">{b.price}</td>
                            <td className="py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                b.payment_status === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                              }`}>
                                {b.payment_status === 'Paid' ? '✅ Paid' : '⏳ Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && user && (
          <ProviderProfileTab user={user} />
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          billingLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground font-medium animate-pulse">Checking activation status...</span>
            </div>
          ) : billing ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="gradient-primary p-6 text-primary-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-display font-bold">Subscription & Activation</h3>
                      <p className="text-sm text-primary-foreground/75">Manage your monthly profile activation status.</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      billing.isActive 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-destructive text-destructive-foreground animate-pulse'
                    }`}>
                      {billing.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Billing details grid */}
                  <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl text-sm border border-border">
                    <div>
                      <span className="text-muted-foreground block">Last Activated:</span>
                      <span className="font-semibold text-foreground">{new Date(billing.lastActivationDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Active Cycle Ends:</span>
                      <span className="font-semibold text-foreground">
                        {new Date(new Date(billing.lastActivationDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Earnings this cycle:</span>
                      <span className="font-semibold text-foreground">₹{billing.earnings}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Days remaining:</span>
                      <span className="font-semibold text-foreground">{billing.daysRemaining} days</span>
                    </div>
                  </div>

                  {/* Info summary */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-primary">
                      <Award className="w-4 h-4" /> Commission & Activation Terms
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Provider profiles are active for <strong>30 days</strong>.</li>
                      <li>If you earned <strong>less than ₹2,000</strong> this cycle (or had no jobs), renewal is completely <strong>FREE</strong>.</li>
                      <li>If your completed earnings were <strong>₹2,000 or more</strong>, a <strong>10% commission fee</strong> is required to renew.</li>
                      <li>While inactive, your profile is hidden from all client search directories and AI matching lists.</li>
                    </ul>
                  </div>

                  {/* Reactivation Action */}
                  <div className="pt-2 text-center space-y-3">
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <span className="text-sm text-muted-foreground font-medium">Reactivation Fee Due:</span>
                      <span className="text-xl font-bold text-foreground">
                        {billing.amountDue > 0 ? `₹${billing.amountDue} (10% of ₹${billing.earnings})` : '₹0.00 (Free)'}
                      </span>
                    </div>

                    <button
                      onClick={handleReactivate}
                      disabled={billingLoading}
                      className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
                    >
                      {billingLoading ? (
                        <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : billing.amountDue > 0 ? (
                        <>Pay ₹{billing.amountDue} & Reactivate</>
                      ) : (
                        <>Reactivate Account (Free)</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 space-y-3 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground text-sm">Failed to retrieve activation details.</p>
              <button 
                onClick={fetchBillingStatus}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

// Extracted booking card component
function BookingCard({ booking: b, onUpdateStatus, highlight }: {
  booking: ProviderBooking;
  onUpdateStatus: (id: string, status: string, step: number) => void;
  highlight?: boolean;
}) {
  const steps = trackingSteps[b.category] || trackingSteps.plumbing;
  const currentStep = b.current_step ?? 0;
  const progress = b.status === 'Completed'
    ? 100
    : b.status === 'Cancelled'
    ? 0
    : Math.round(((currentStep + 1) / steps.length) * 100);

  const isActive = b.status !== 'Cancelled' && b.status !== 'Completed';

  const handleStepClick = (stepIndex: number) => {
    if (!isActive) return;
    // Determine what status to set
    let newStatus = 'In Progress';
    if (stepIndex === 0) newStatus = 'Confirmed';
    if (stepIndex >= steps.length - 1) newStatus = 'Completed';
    onUpdateStatus(b.id, newStatus, stepIndex);
  };

  return (
    <div className={`bg-card rounded-xl border p-5 hover:shadow-card transition-all ${
      highlight ? 'border-warning/50 ring-1 ring-warning/20' : 'border-border'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-semibold text-foreground">{b.customer_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              b.status === 'Confirmed' ? 'bg-primary/10 text-primary' :
              b.status === 'In Progress' ? 'bg-warning/10 text-warning' :
              b.status === 'Completed' ? 'bg-success/10 text-success' :
              'bg-destructive/10 text-destructive'
            }`}>{b.status}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            #{b.tracking_id} • {b.service_type} • {b.category}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold text-foreground">{b.price}</div>
          <div className="text-xs text-muted-foreground">{b.date} at {b.time}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
        <span>📍 {b.location}</span>
        <span>📞 {b.phone}</span>
        <span>📧 {b.customer_email}</span>
      </div>

      {b.description && (
        <p className="text-sm text-muted-foreground mb-3 bg-muted/50 rounded-lg p-2">{b.description}</p>
      )}

      {/* ── Step Progress Bar ── */}
      {b.status !== 'Cancelled' && (
        <div className="mt-3 border border-border rounded-xl p-4 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">📊 Job Progress</span>
            <span className="text-muted-foreground font-medium">{progress}% · Step {Math.min(currentStep + 1, steps.length)}/{steps.length}</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                b.status === 'Completed' ? 'bg-success' : 'gradient-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step buttons */}
          <div className="grid gap-1.5">
            {steps.map((step, i) => {
              const done = b.status === 'Completed' ? true : i < currentStep;
              const active = b.status !== 'Completed' && i === currentStep;
              const next = b.status !== 'Completed' && i === currentStep + 1;
              const pending = !done && !active;

              return (
                <button
                  key={i}
                  disabled={!isActive || done || (i > currentStep + 1)}
                  onClick={() => handleStepClick(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                    done
                      ? 'bg-success/10 text-success cursor-default'
                      : active
                      ? 'bg-warning/10 text-warning border border-warning/30 ring-1 ring-warning/20 font-semibold animate-pulse'
                      : next && isActive
                      ? 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 cursor-pointer font-medium'
                      : 'text-muted-foreground cursor-default opacity-50'
                  }`}
                >
                  {/* Step indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold border ${
                    done
                      ? 'bg-success border-success text-white'
                      : active
                      ? 'bg-warning border-warning text-white'
                      : next && isActive
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>

                  {/* Step name & description */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{step.name}</div>
                    <div className="text-[10px] opacity-70 truncate">{step.description}</div>
                  </div>

                  {/* Action label */}
                  {done && <span className="text-[10px] shrink-0">✅ Done</span>}
                  {active && <span className="text-[10px] shrink-0 bg-warning/20 px-1.5 py-0.5 rounded">In Progress</span>}
                  {next && isActive && (
                    <span className="text-[10px] shrink-0 bg-primary/10 px-1.5 py-0.5 rounded text-primary">▶ Next</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick action row */}
          {isActive && (
            <div className="flex gap-2 pt-1 border-t border-border">
              {b.status === 'Confirmed' && (
                <button
                  onClick={() => onUpdateStatus(b.id, 'In Progress', 1)}
                  className="flex-1 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-semibold hover:bg-warning/20 transition-colors text-center"
                >
                  ▶ Start Job
                </button>
              )}
              {b.status === 'In Progress' && currentStep < steps.length - 1 && (
                <button
                  onClick={() => onUpdateStatus(b.id, 'In Progress', currentStep + 1)}
                  className="flex-1 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors text-center"
                >
                  ⏭ Next Step: {steps[currentStep + 1]?.name || 'Complete'}
                </button>
              )}
              {b.status === 'In Progress' && currentStep >= steps.length - 2 && (
                <button
                  onClick={() => onUpdateStatus(b.id, 'Completed', steps.length - 1)}
                  className="flex-1 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-colors text-center"
                >
                  ✅ Mark Complete
                </button>
              )}
              <button
                onClick={() => onUpdateStatus(b.id, 'Cancelled', -1)}
                className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
              >
                ✖ Cancel
              </button>
            </div>
          )}

          {b.status === 'Completed' && (
            <div className="text-center text-xs text-success font-semibold pt-1 border-t border-border">
              🎉 Job completed successfully!
            </div>
          )}
        </div>
      )}

      {/* Cancelled state */}
      {b.status === 'Cancelled' && (
        <div className="mt-3 text-center text-xs text-destructive bg-destructive/5 border border-destructive/10 rounded-lg py-2">
          ✕ This booking was cancelled
        </div>
      )}
    </div>
  );
}

export default ProviderDashboard;
