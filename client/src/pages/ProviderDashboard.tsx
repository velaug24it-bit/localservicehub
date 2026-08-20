import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import ProviderProfileTab from '@/components/provider/ProviderProfileTab';
import ProviderCalendar from '@/components/provider/ProviderCalendar';
import ProviderPricingTab from '@/components/provider/ProviderPricingTab';
import ProviderBusinessCenter from '@/components/provider/ProviderBusinessCenter';
import ProviderChatInbox from '@/components/provider/ProviderChatInbox';
import AIBusinessCoach from '@/components/provider/AIBusinessCoach';
import ProviderAgreementRequests from '@/components/provider/ProviderAgreementRequests';
import ProviderWarrantyClaims from '@/components/provider/ProviderWarrantyClaims';
import BookingChatModal from '@/components/chat/BookingChatModal';
import NotificationBell from '@/components/NotificationBell';
import Footer from '@/components/Footer';
import { trackingSteps } from '@/data/providers';
import { 
  Calendar, DollarSign, ShieldAlert, Award, ArrowUpRight, CheckCircle2, 
  ChevronDown, ChevronUp, Package, Wrench, Menu, X, ChevronRight, 
  ClipboardList, Zap, MessageSquare, TrendingUp, Tag, CreditCard, 
  Sparkles, FileText, User, ShieldCheck, Phone, LogOut 
} from 'lucide-react';

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
  payout_status?: string;
  materials_payment_status?: string;
  current_step: number;
  created_at: string;
  providerName?: string;
  materialsRequired?: boolean;
  materialsTotal?: number;
  materialsList?: any[];
  deliveryMethod?: 'Pickup' | 'Delivery';
  marketplaceOrder?: any;
  priceBreakdown?: any;
}

interface BillingStatus {
  isActive: boolean;
  lastActivationDate: string;
  earnings: number;
  daysRemaining: number;
  amountDue: number;
}

const parsePrice = (price: string): number => {
  const numbers = price.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 0;
  return parseInt(numbers[0]);
};

const getProviderLabourPrice = (b: ProviderBooking): number => {
  if (b.priceBreakdown && typeof b.priceBreakdown.subtotal === 'number') {
    return b.priceBreakdown.subtotal;
  }
  return parsePrice(b.price);
};

const ProviderDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [activeTab, setActiveTab] = useState<
    | 'bookings'
    | 'queue'
    | 'calendar'
    | 'warranty-rework'
    | 'messages'
    | 'business'
    | 'earnings'
    | 'pricing'
    | 'subscription'
    | 'ai-coach'
    | 'agreement-requests'
    | 'profile'
  >('bookings');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [warrantyReworkCount, setWarrantyReworkCount] = useState<number>(0);
  const [openMaterialsId, setOpenMaterialsId] = useState<string | null>(null);
  const [activeChatBookingId, setActiveChatBookingId] = useState<string | null>(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);
  const [filter, setFilter] = useState<'all' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled'>('all');
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.chat.getUnreadSummary();
      if (res && typeof res.unreadCount === 'number') {
        setUnreadMsgCount(res.unreadCount);
      }
    } catch {}
  };

  const fetchWarrantyCount = async () => {
    try {
      const res = await api.providerWarranty.list();
      const active = (res || []).filter((w: any) => {
        const last = w.claims?.[w.claims.length - 1];
        return last?.status !== 'Resolved';
      }).length;
      setWarrantyReworkCount(active);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      fetchProviderBookings();
      fetchBillingStatus();
      fetchUnreadCount();
      fetchWarrantyCount();
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchWarrantyCount();
      }, 6000);
      return () => clearInterval(interval);
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
          payout_status: b.payoutStatus || 'Unpaid',
          materials_payment_status: b.materialsPaymentStatus || 'Unpaid',
          current_step: b.currentStep,
          created_at: b.createdAt,
          providerName: b.providerName,
          materialsRequired: b.materialsRequired,
          materialsTotal: b.materialsTotal,
          materialsList: b.materialsList,
          deliveryMethod: b.deliveryMethod,
          marketplaceOrder: b.marketplaceOrder,
          priceBreakdown: b.priceBreakdown
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

  const isSubscriptionPlan = (user as any)?.revenueModel === 'subscription' && (user as any)?.subscriptionActive;
  const subExpiresAt = (user as any)?.subscriptionExpiresAt ? new Date((user as any).subscriptionExpiresAt) : null;
  const subStartAt = (user as any)?.subscriptionStartDate ? new Date((user as any).subscriptionStartDate) : null;

  const subDaysRemaining = (() => {
    if (!subExpiresAt) return 0;
    const diffMs = subExpiresAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  })();

  const isSubExpiringSoon = isSubscriptionPlan && subDaysRemaining <= 2;

  const [subSubmitting, setSubSubmitting] = useState(false);

  const handleSubscribePlan499 = async () => {
    setSubSubmitting(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({ title: 'Payment SDK Error', description: 'Failed to load Razorpay.', variant: 'destructive' });
        setSubSubmitting(false);
        return;
      }

      const order = await api.payments.createOrder(499);

      if (order.mock) {
        setTimeout(async () => {
          try {
            await api.auth.updateProfile({
              revenueModel: 'subscription',
              subscriptionActive: true,
              subscriptionPlan: 'monthly_499'
            });
            toast({ title: '🎉 Subscription Activated!', description: 'You now enjoy 0% commission on all completed bookings for 30 days.' });
            window.location.reload();
          } catch (err: any) {
            toast({ title: 'Activation failed', description: err.message, variant: 'destructive' });
          } finally {
            setSubSubmitting(false);
          }
        }, 1200);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'ServiceHub Subscription Plan',
        description: 'Monthly ₹499 Subscription Plan (0% Commission)',
        order_id: order.id,
        handler: async () => {
          try {
            await api.auth.updateProfile({
              revenueModel: 'subscription',
              subscriptionActive: true,
              subscriptionPlan: 'monthly_499'
            });
            toast({ title: '🎉 Subscription Activated!', description: 'You now enjoy 0% commission on all completed bookings for 30 days.' });
            window.location.reload();
          } catch (err: any) {
            toast({ title: 'Subscription update failed', description: err.message, variant: 'destructive' });
          } finally {
            setSubSubmitting(false);
          }
        },
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: '#6366f1' }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        toast({ title: 'Payment Failed', description: resp.error?.description || 'Declined', variant: 'destructive' });
        setSubSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Subscription initiation failed', description: err.message, variant: 'destructive' });
      setSubSubmitting(false);
    }
  };

  const handleSwitchToCommission = async () => {
    setBillingLoading(true);
    try {
      // Update profile model first
      await api.auth.updateProfile({
        revenueModel: 'commission',
        subscriptionActive: false
      });
      // Always reactivate so profile becomes visible and 30-day cycle resets
      await api.providers.reactivate({});
      toast({ title: '✅ Profile Reactivated!', description: 'You are now on the 5% Per-Work Commission plan and visible to clients.' });
      await fetchBillingStatus();
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Failed to reactivate with commission plan', description: err.message, variant: 'destructive' });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleActivateCommissionPlan = async () => {
    // Called when profile is already on commission model but inactive (30-day cycle expired)
    setBillingLoading(true);
    try {
      const order = await api.payments.createReactivationOrder();

      if (order.free || order.mock) {
        await api.providers.reactivate({ razorpayOrderId: order.id });
        toast({ title: '✅ Profile Reactivated!', description: 'Your 5% commission profile is now active and visible to clients for the next 30 days.' });
        await fetchBillingStatus();
        setBillingLoading(false);
        return;
      }

      // Real Razorpay for when earnings threshold exceeded
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
        description: `5% commission on earnings (₹${order.amountDue})`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await api.providers.reactivate({
              razorpayOrderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            toast({ title: '✅ Profile Reactivated!', description: 'Your profile is now active and visible to clients.' });
            await fetchBillingStatus();
          } catch (err: any) {
            toast({ title: 'Reactivation failed', description: err.message, variant: 'destructive' });
          } finally {
            setBillingLoading(false);
          }
        },
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#6366f1' }
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


  const totalEarnings = bookings
    .filter(b => b.payment_status === 'Paid' || b.payout_status === 'Paid')
    .reduce((sum, b) => sum + getProviderLabourPrice(b), 0);

  const pendingPayment = bookings
    .filter(b => b.status !== 'Cancelled' && b.payment_status !== 'Paid' && b.payout_status !== 'Paid')
    .reduce((sum, b) => sum + getProviderLabourPrice(b), 0);

  const stats = {
    total: bookings.length,
    active: bookings.filter(b => b.status === 'Confirmed' || b.status === 'In Progress').length,
    completed: bookings.filter(b => b.status === 'Completed').length,
    cancelled: bookings.filter(b => b.status === 'Cancelled').length,
  };

  const navItems = [
    { 
      key: 'bookings' as const, 
      label: 'Bookings', 
      icon: ClipboardList, 
      emoji: '📋', 
      badge: bookings.filter(b => b.status === 'Confirmed' || b.status === 'In Progress').length || null, 
      badgeColor: 'bg-primary text-primary-foreground' 
    },
    { 
      key: 'queue' as const, 
      label: 'Queue', 
      icon: Zap, 
      emoji: '⚡', 
      badge: waitingQueue.length || null,
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
    },
    { 
      key: 'calendar' as const, 
      label: 'Calendar', 
      icon: Calendar, 
      emoji: '📅', 
      badge: null,
      badgeColor: '' 
    },
    { 
      key: 'warranty-rework' as const, 
      label: 'Warranty Reworks', 
      icon: Wrench, 
      emoji: '🛡️', 
      badge: warrantyReworkCount || null, 
      badgeColor: 'bg-destructive text-destructive-foreground animate-pulse font-extrabold' 
    },
    { 
      key: 'messages' as const, 
      label: 'Messages', 
      icon: MessageSquare, 
      emoji: '💬', 
      badge: unreadMsgCount || null, 
      badgeColor: 'bg-destructive text-destructive-foreground animate-pulse font-extrabold' 
    },
    { 
      key: 'business' as const, 
      label: 'Business Center', 
      icon: TrendingUp, 
      emoji: '📊', 
      badge: null,
      badgeColor: '' 
    },
    { 
      key: 'earnings' as const, 
      label: 'Earnings', 
      icon: DollarSign, 
      emoji: '💰', 
      badge: null,
      badgeColor: '' 
    },
    { 
      key: 'pricing' as const, 
      label: 'Pricing', 
      icon: Tag, 
      emoji: '🏷️', 
      badge: null,
      badgeColor: '' 
    },
    { 
      key: 'subscription' as const, 
      label: 'Subscription', 
      icon: CreditCard, 
      emoji: '💳', 
      badge: isSubExpiringSoon ? 'Renew' : null, 
      badgeColor: 'bg-warning text-warning-foreground animate-pulse' 
    },
    { 
      key: 'ai-coach' as const, 
      label: 'AI Business Coach', 
      icon: Sparkles, 
      emoji: '🤖', 
      badge: '✨ AI', 
      badgeColor: 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold' 
    },
    { 
      key: 'agreement-requests' as const, 
      label: 'Agreements', 
      icon: FileText, 
      emoji: '📜', 
      badge: null,
      badgeColor: '' 
    },
    { 
      key: 'profile' as const, 
      label: 'Profile', 
      icon: User, 
      emoji: '👤', 
      badge: null,
      badgeColor: '' 
    },
  ];

  const currentNav = navItems.find(item => item.key === activeTab) || navItems[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors flex items-center justify-center shrink-0 border border-border"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-display font-bold gradient-text truncate">
                ServiceHub Provider
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <span>{currentNav.emoji}</span>
                <span>{currentNav.label}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-foreground hidden md:block truncate max-w-[130px]">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-xl text-xs sm:text-sm text-destructive hover:bg-destructive/10 transition-colors font-semibold flex items-center gap-1 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Subscription Active Warning Alert */}
      {billing && !billing.isActive && (
        <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
            <span>
              <strong>Profile Inactive:</strong> Your 30-day active period has expired. Your profile is currently <strong>hidden from clients</strong> in searches and AI matches. 
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button 
              disabled={billingLoading}
              onClick={handleActivateCommissionPlan}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1.5"
            >
              {billingLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
              ) : '⚡'}
              {billingLoading ? 'Reactivating...' : 'Reactivate (5% Commission)'}
            </button>
            <button 
              onClick={() => setActiveTab('subscription')}
              className="bg-card border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-xs font-semibold hover:bg-destructive/10 transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      {/* 2-Day Subscription Expiration Warning Alert */}
      {isSubExpiringSoon && (
        <div className="bg-warning/15 border-b border-warning/30 text-warning px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-semibold animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-warning shrink-0" />
            <span>
              <strong>Subscription Expiring Soon:</strong> Your ₹499/month subscription ends in <strong>{subDaysRemaining} day(s)</strong> ({subExpiresAt?.toLocaleDateString()}). Renew now to maintain 0% commission per job!
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('subscription')}
            className="bg-warning text-warning-foreground px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shrink-0 shadow-sm"
          >
            Renew Plan (₹499)
          </button>
        </div>
      )}

      {/* Mobile Drawer Navigation (When Hamburger Clicked) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border p-4 sm:p-5 flex flex-col shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Top Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-foreground truncate">{user?.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{(user as any)?.category || 'Certified Specialist'}</div>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation List in exact user-requested order */}
            <div className="py-3.5 space-y-1 flex-1">
              {navItems.map(item => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2.5 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base leading-none">{item.emoji}</span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-muted text-muted-foreground'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-border space-y-1.5 text-xs">
              <a
                href="tel:+919840994649"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors font-medium"
              >
                <Phone className="w-4 h-4 text-emerald-500" />
                <span>Help: +91 9840994649</span>
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-destructive hover:bg-destructive/10 p-2 rounded-xl font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container: Sideway Sidebar (Desktop) + Content (Right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Desktop Sideway Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 bg-card border border-border rounded-3xl p-4 shadow-sm sticky top-20 space-y-4">
          {/* Provider Mini Card */}
          <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-extrabold shadow-sm shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-foreground truncate flex items-center gap-1">
                <span className="truncate">{user?.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{(user as any)?.category || 'Service Specialist'}</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                ● Verified Specialist
              </div>
            </div>
          </div>

          {/* Navigation Menu in Exact Requested Order */}
          <nav className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar pr-0.5">
            {navItems.map(item => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full px-3 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-2 text-left group active:scale-98 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-extrabold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base leading-none shrink-0">{item.emoji}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.badge && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-muted text-muted-foreground'}`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Quick Helpline Box */}
          <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl text-xs space-y-1">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-500" /> Helpline
            </div>
            <a href="tel:+919840994649" className="text-[11px] text-muted-foreground hover:text-primary font-semibold block">
              +91 9840994649
            </a>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {[
              { label: 'Total Bookings', value: stats.total, icon: '📋', color: 'bg-primary/10 text-primary' },
              { label: 'Active', value: stats.active, icon: '🔄', color: 'bg-warning/10 text-warning' },
              { label: 'Completed', value: stats.completed, icon: '✅', color: 'bg-success/10 text-success' },
              { label: 'Earnings', value: `₹${totalEarnings.toLocaleString()}`, icon: '💰', color: 'bg-info/10 text-info' },
              { label: 'Pending Pay', value: `₹${pendingPayment.toLocaleString()}`, icon: '⏳', color: 'bg-accent text-accent-foreground' },
            ].map(s => (
              <div key={s.label} className={`bg-card rounded-2xl border border-border p-4 hover:shadow-card transition-all ${
                s.label === 'Pending Pay' ? 'col-span-2 sm:col-span-2 lg:col-span-1' : ''
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl sm:text-2xl">{s.icon}</span>
                  <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                </div>
                <div className="text-xl sm:text-2xl font-display font-bold text-foreground">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Active Feature View Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentNav.emoji}</span>
              <h2 className="text-base sm:text-lg font-display font-bold text-foreground">
                {currentNav.label}
              </h2>
            </div>
            {currentNav.badge && (
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${currentNav.badgeColor || 'bg-muted text-muted-foreground'}`}>
                {currentNav.badge}
              </span>
            )}
          </div>

          {/* Warranty Rework Dispatches Tab */}
          {activeTab === 'warranty-rework' && (
            <div>
              <ProviderWarrantyClaims />
            </div>
          )}

        {/* AI Business Coach Tab */}
        {activeTab === 'ai-coach' && (
          <div>
            <AIBusinessCoach />
          </div>
        )}

        {/* Assigned Agreement Requests Tab */}
        {activeTab === 'agreement-requests' && (
          <div>
            <ProviderAgreementRequests />
          </div>
        )}

        {/* Messages Tab (Booking Chats) */}
        {activeTab === 'messages' && (
          <div>
            <ProviderChatInbox />
          </div>
        )}

        {/* Business Center Tab */}
        {activeTab === 'business' && (
          <div>
            <ProviderBusinessCenter />
          </div>
        )}

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

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <ProviderCalendar bookings={bookings} />
        )}

        {/* Pricing Management Tab */}
        {activeTab === 'pricing' && (
          <div>
            <h3 className="text-lg font-display font-semibold text-foreground mb-5 flex items-center gap-2">
              💰 Pricing Management
              <span className="text-xs font-normal text-muted-foreground">Set your prices for each service you offer</span>
            </h3>
            <ProviderPricingTab />
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
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-sm font-semibold text-foreground">Labour: ₹{getProviderLabourPrice(b).toLocaleString()}</div>
                            {b.materialsRequired && (
                              <button
                                onClick={() => setOpenMaterialsId(openMaterialsId === b.id ? null : b.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
                              >
                                <Package className="w-3 h-3" />
                                🛒 Materials to Buy
                                {openMaterialsId === b.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
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

                        {/* Materials Panel */}
                        {b.materialsRequired && openMaterialsId === b.id && (() => {
                          const itemsToDisplay = (b.materialsList && b.materialsList.length > 0)
                            ? b.materialsList
                            : (b.marketplaceOrder?.products || []).map((p: any) => ({
                                brandName: p.brandName,
                                productName: p.productName,
                                quantity: p.quantity,
                                subtotal: p.subtotal,
                                finalUnitPrice: p.finalUnitPrice || p.price,
                                shopName: b.marketplaceOrder?.shopName,
                                deliveryMethod: b.marketplaceOrder?.deliveryMethod
                              }));
                          const displayDeliveryMethod = b.deliveryMethod || b.marketplaceOrder?.deliveryMethod;

                          return (
                            <div className="mb-3 rounded-xl border border-teal-500/20 bg-teal-500/5 overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2.5 bg-teal-500/10 border-b border-teal-500/20">
                                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">🛒 Materials You Need to Procure</span>
                                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">₹{(b.materialsTotal || 0).toLocaleString()} total</span>
                              </div>
                              <div className="divide-y divide-teal-500/10">
                                {itemsToDisplay.length > 0 ? (
                                  itemsToDisplay.map((item: any, i: number) => (
                                    <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-foreground">{item.brandName} — {item.productName}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          {item.shopName && <span className="mr-2">🏪 {item.shopName}</span>}
                                          <span>Qty: {item.quantity}</span>
                                          {item.deliveryMethod && <span className="ml-2">🚚 {item.deliveryMethod === 'Delivery' ? 'Delivery' : 'Pickup from shop'}</span>}
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="text-sm font-bold text-foreground">₹{(item.subtotal || 0).toLocaleString()}</div>
                                        <div className="text-[10px] text-muted-foreground">₹{(item.finalUnitPrice || item.price || 0).toLocaleString()} each</div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-xs text-muted-foreground">No item details found. Check marketplace order.</div>
                                )}
                              </div>
                              {displayDeliveryMethod && (
                                <div className="px-4 py-2 bg-teal-500/10 border-t border-teal-500/20 text-xs text-teal-700 dark:text-teal-400 font-medium">
                                  Delivery Method: <strong>{displayDeliveryMethod === 'Delivery' ? '🚚 Delivery to job site' : '🏪 Pickup from shop'}</strong>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => setActiveChatBookingId(b.tracking_id || b.id)}
                            className="px-3.5 py-1.5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5 active:scale-95"
                          >
                            <span>💬 Open Customer Chat</span>
                          </button>

                          <button onClick={() => updateBookingStatus(b.id, 'In Progress', 1)}
                            className="px-3 py-1.5 rounded-xl bg-warning/10 text-warning text-xs font-semibold hover:bg-warning/20 transition-colors">
                            ▶ Start Job
                          </button>
                          <button onClick={() => updateBookingStatus(b.id, 'Cancelled', -1)}
                            className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors">
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
              <h3 className="font-display font-semibold text-foreground mb-4">Labour Payment Settlement</h3>
              {bookings.filter(b => b.status !== 'Cancelled' && (b.status === 'Completed' || b.status === 'In Progress' || b.payment_status === 'Paid' || b.payout_status === 'Paid')).length === 0 ? (
                <p className="text-muted-foreground text-sm">No labour payment records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 text-muted-foreground font-medium">Customer</th>
                        <th className="pb-3 text-muted-foreground font-medium">Service</th>
                        <th className="pb-3 text-muted-foreground font-medium">Date</th>
                        <th className="pb-3 text-muted-foreground font-medium">Labour Amount</th>
                        <th className="pb-3 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings
                        .filter(b => b.status !== 'Cancelled' && (b.status === 'Completed' || b.status === 'In Progress' || b.payment_status === 'Paid' || b.payout_status === 'Paid'))
                        .sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
                        .map(b => (
                          <tr key={b.id} className="border-b border-border last:border-0">
                            <td className="py-3 text-foreground">{b.customer_name}</td>
                            <td className="py-3 text-muted-foreground">{b.service_type}</td>
                            <td className="py-3 text-muted-foreground">{b.date}</td>
                            <td className="py-3 font-semibold text-foreground">₹{getProviderLabourPrice(b).toLocaleString()}</td>
                            <td className="py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                b.payment_status === 'Paid' || b.payout_status === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                              }`}>
                                {b.payment_status === 'Paid' || b.payout_status === 'Paid' ? '✅ Paid' : '⏳ Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>🛒</span> Materials Orders Breakdown
              </h3>
              {bookings.filter(b => b.materialsRequired && (b.materialsList?.length > 0 || b.marketplaceOrder?.products?.length > 0)).length === 0 ? (
                <p className="text-muted-foreground text-sm">No materials orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 text-muted-foreground font-medium">Client (Customer)</th>
                        <th className="pb-3 text-muted-foreground font-medium">Store (Partner Shop)</th>
                        <th className="pb-3 text-muted-foreground font-medium">Product / Quantity</th>
                        <th className="pb-3 text-muted-foreground font-medium">Materials Cost</th>
                        <th className="pb-3 text-muted-foreground font-medium">Delivery Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings
                        .filter(b => b.materialsRequired && (b.materialsList?.length > 0 || b.marketplaceOrder?.products?.length > 0))
                        .map(b => {
                          const items = b.materialsList || b.marketplaceOrder?.products || [];
                          return (
                            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/5 transition-colors">
                              <td className="py-3 text-foreground font-medium">
                                <div>{b.customer_name}</div>
                                <div className="text-[10px] text-muted-foreground">{b.customer_email}</div>
                              </td>
                              <td className="py-3 text-muted-foreground font-semibold">
                                {b.marketplaceOrder?.shopName || 'Partner Shop'}
                              </td>
                              <td className="py-3 text-muted-foreground">
                                <ul className="space-y-1">
                                  {items.map((item: any, idx: number) => (
                                    <li key={idx} className="text-xs">
                                      <span className="font-medium text-foreground">{item.brandName} - {item.productName}</span> 
                                      <span className="text-muted-foreground"> (x{item.quantity} @ ₹{(item.finalUnitPrice || item.price || 0).toLocaleString()})</span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td className="py-3 font-semibold text-foreground">
                                <div>₹{(b.materialsTotal || 0).toLocaleString()}</div>
                                <div className="text-[9px] text-muted-foreground font-normal">
                                  (Labour: ₹{getProviderLabourPrice(b).toLocaleString()})
                                </div>
                              </td>
                              <td className="py-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  b.deliveryMethod === 'Delivery' ? 'bg-info/10 text-info' : 'bg-primary/10 text-primary'
                                }`}>
                                  {b.deliveryMethod || 'Pickup'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
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
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="gradient-primary p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-display font-bold">Platform Revenue & Subscription Management</h3>
                    <p className="text-sm text-primary-foreground/75">Select how platform fee commission is calculated for your service bookings.</p>
                  </div>
                  {isSubscriptionPlan ? (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-success text-success-foreground shadow-sm">
                      ★ Active Subscriber (0% Fee)
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-warning text-warning-foreground shadow-sm">
                      📊 5% Commission Model (Active)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Revenue Plan Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1: 5% Per-Work Commission */}
                  <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    !isSubscriptionPlan 
                      ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' 
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-lg">5% Per-Work Commission</span>
                        {!isSubscriptionPlan && (
                          <span className="text-xs bg-primary/10 text-primary font-extrabold px-2.5 py-0.5 rounded-full border border-primary/20">
                            Active Model
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pay a standard <strong>5% platform fee</strong> on each completed booking. No upfront monthly cost. Pay only when you earn.
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/60 space-y-2">
                      {isSubscriptionPlan ? (
                        <button
                          type="button"
                          disabled={billingLoading}
                          onClick={handleSwitchToCommission}
                          className="w-full py-2.5 rounded-xl border border-border text-foreground font-semibold text-xs hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          {billingLoading ? 'Switching...' : 'Switch to 5% Commission Model'}
                        </button>
                      ) : billing && !billing.isActive ? (
                        // Profile expired — need to reactivate
                        <button
                          type="button"
                          disabled={billingLoading}
                          onClick={handleActivateCommissionPlan}
                          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                        >
                          {billingLoading ? (
                            <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          ) : (
                            '⚡ Reactivate Profile with 5% Commission'
                          )}
                        </button>
                      ) : (
                        <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                          ✓ Currently active — 5% commission applies per completed job
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Monthly Subscription Plan (₹499) */}
                  <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    isSubscriptionPlan 
                      ? 'border-success bg-success/5 shadow-md ring-2 ring-success/20' 
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-lg">Monthly Subscription Plan</span>
                        {isSubscriptionPlan && (
                          <span className="text-xs bg-success/15 text-success font-extrabold px-2.5 py-0.5 rounded-full border border-success/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Subscribe for <strong>₹499/month</strong> via Razorpay. Keep <strong>100% of your earnings</strong> (0% commission deducted per job).
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/60 space-y-3">
                      <button
                        type="button"
                        disabled={subSubmitting}
                        onClick={handleSubscribePlan499}
                        className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {subSubmitting ? (
                          <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : isSubscriptionPlan ? (
                          '💳 Renew Subscription for ₹499 (30 Days)'
                        ) : (
                          '💳 Subscribe Now for ₹499/Month'
                        )}
                      </button>

                      {/* Subscription Dates and Days Remaining below */}
                      {isSubscriptionPlan && (
                        <div className="p-3 bg-card border border-border rounded-xl text-xs space-y-1.5">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subscription Period:</span>
                            <span className="font-bold text-foreground">
                              {subStartAt?.toLocaleDateString() || 'Active'} – {subExpiresAt?.toLocaleDateString() || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-dashed border-border">
                            <span className="text-muted-foreground">Days Remaining:</span>
                            <span className={`font-extrabold px-2 py-0.5 rounded text-[11px] ${
                              isSubExpiringSoon ? 'bg-warning/15 text-warning animate-pulse' : 'bg-success/10 text-success'
                            }`}>
                              {subDaysRemaining} days
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expiration Warning Notice */}
                {isSubExpiringSoon && (
                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-warning uppercase tracking-wider block">⚠️ Ending Subscription Alert</span>
                    <p className="text-muted-foreground leading-relaxed">
                      Your subscription will end in <strong>{subDaysRemaining} day(s)</strong> on <strong>{subExpiresAt?.toLocaleDateString()}</strong>. If you do not renew, your account will automatically revert to the <strong>5% Per-Work Commission</strong> model.
                    </p>
                  </div>
                )}

                {/* Terms Summary */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border text-xs space-y-2">
                  <div className="font-bold text-foreground">ℹ️ Revenue Model Guidelines:</div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Subscriptions run for <strong>30 consecutive days</strong> from payment date.</li>
                    <li>Subscribers pay <strong>₹0 commission</strong> per job for all completed services.</li>
                    <li>If a subscription expires, your profile automatically falls back to <strong>5% commission per job</strong> without hiding your listing.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>

      {/* Booking Chat Modal */}
      {activeChatBookingId && (
        <BookingChatModal
          bookingId={activeChatBookingId}
          onClose={() => {
            setActiveChatBookingId(null);
            fetchUnreadCount();
          }}
        />
      )}

      <Footer />
    </div>
  );
};

// Extracted booking card component
function BookingCard({ booking: b, onUpdateStatus, highlight }: {
  booking: ProviderBooking;
  onUpdateStatus: (id: string, status: string, step: number) => void;
  highlight?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const { user } = useAuth();
  const [warrantyDays, setWarrantyDays] = useState<number>(30);
  const [coverageTerms, setCoverageTerms] = useState<string>('');
  const [warrantyInfo, setWarrantyInfo] = useState<any>(null);
  const [loadingWarranty, setLoadingWarranty] = useState(false);
  const [savingWarranty, setSavingWarranty] = useState(false);

  const steps = trackingSteps[b.category] || trackingSteps.plumbing;
  const currentStep = b.current_step ?? 0;
  const progress = b.status === 'Completed'
    ? 100
    : b.status === 'Cancelled'
    ? 0
    : Math.round(((currentStep + 1) / steps.length) * 100);

  const isActive = b.status !== 'Cancelled' && b.status !== 'Completed';

  useEffect(() => {
    if (b.status === 'Completed') {
      loadBookingWarranty();
    }
  }, [b.id, b.status]);

  const loadBookingWarranty = async () => {
    try {
      setLoadingWarranty(true);
      const wrn = await api.providerWarranty.getByBooking(b.id || b.tracking_id);
      if (wrn) {
        setWarrantyInfo(wrn);
        if (wrn.durationDays) setWarrantyDays(wrn.durationDays);
        if (wrn.coverageTerms) setCoverageTerms(wrn.coverageTerms);
      }
    } catch {} finally {
      setLoadingWarranty(false);
    }
  };

  const handleSaveWarranty = async () => {
    if (!warrantyDays || warrantyDays <= 0) {
      toast({ title: 'Invalid Duration', description: 'Please enter valid warranty days (e.g. 30, 60, 90).', variant: 'destructive' });
      return;
    }
    try {
      setSavingWarranty(true);
      const res = await api.providerWarranty.setBookingWarranty(b.id, {
        durationDays: warrantyDays,
        coverageTerms: coverageTerms.trim() || undefined
      });
      setWarrantyInfo(res.warranty);
      toast({
        title: '🛡️ Warranty Updated & Issued!',
        description: `${warrantyDays}-day warranty protection issued to client (${b.customer_name}) and recorded for Admin.`
      });
    } catch (err: any) {
      toast({
        title: 'Warranty Update Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSavingWarranty(false);
    }
  };

  const getCalculatedExpiry = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

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
          <div className="font-semibold text-foreground">
            Labour: ₹{getProviderLabourPrice(b).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{b.date} at {b.time}</div>
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
            <div className="pt-2.5 border-t border-border space-y-2">
              <div className="text-center text-xs text-success font-semibold">
                🎉 Job completed successfully!
              </div>
              {(b as any).review && (
                <div className="bg-card border border-success/15 rounded-lg p-3 space-y-1.5 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Customer Feedback</span>
                    <div className="flex items-center gap-0.5 text-warning font-bold">
                      <span>★ {(b as any).review.rating}</span>
                    </div>
                  </div>
                  {(b as any).review.comment && (
                    <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded leading-relaxed border border-border/40">
                      "{(b as any).review.comment}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Workmanship Warranty Protection (Editable by Provider) ── */}
      {b.status === 'Completed' && (
        <div className="mt-3.5 border-2 border-indigo-500/25 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-purple-500/5 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <span>Workmanship Warranty Protection</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Provider Configurable)</span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Set custom warranty days for {b.customer_name}. Automatically synced to Client & Admin dashboard.
                </p>
              </div>
            </div>

            {warrantyInfo?.status === 'Active' ? (
              <span className="text-[11px] font-extrabold px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full self-start sm:self-auto shrink-0 shadow-sm">
                🛡️ {warrantyInfo.durationDays}-Day Active Protection
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg self-start sm:self-auto shrink-0">
                ⏳ Set Warranty Below
              </span>
            )}
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
              <span>Choose Warranty Days:</span>
              <span className="text-[10px] text-muted-foreground font-normal">Click preset or enter custom</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[15, 30, 60, 90, 180, 365].map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setWarrantyDays(days)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    warrantyDays === days
                      ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {days === 180 ? '180 Days (6 Mo)' : days === 365 ? '365 Days (1 Yr)' : `${days} Days`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 font-semibold">Exact Warranty Days:</label>
              <input
                type="number"
                min="1"
                max="730"
                value={warrantyDays}
                onChange={e => setWarrantyDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 font-semibold">Valid Protection Period:</label>
              <div className="px-3 py-2 bg-muted/60 border border-border rounded-xl text-xs font-bold text-foreground truncate">
                📅 Valid until {getCalculatedExpiry(warrantyDays)}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground block mb-1 font-semibold">Coverage Notes (Optional):</label>
            <input
              type="text"
              placeholder="e.g. 100% free rework on plumbing joints, leak test & spare parts."
              value={coverageTerms}
              onChange={e => setCoverageTerms(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={savingWarranty || loadingWarranty}
              onClick={handleSaveWarranty}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{savingWarranty ? 'Saving Warranty...' : warrantyInfo ? 'Update Warranty Days' : 'Issue Warranty to Client'}</span>
            </button>

            {warrantyInfo?.warrantyNumber && (
              <span className="text-[10px] text-muted-foreground font-mono self-center sm:self-auto">
                Cert #{warrantyInfo.warrantyNumber}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Provider Materials Pickups & Invoices */}
      {b.materialsRequired && (
        <div className="mt-3 p-4 bg-muted/40 border border-border rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-bold text-foreground inline-flex items-center gap-1">
              📦 Materials Marketplace Pickup
            </span>
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
              {b.deliveryMethod === 'Pickup' ? '🏪 Self Pickup Required' : '🚚 Direct Shop Delivery'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <div className="font-semibold text-foreground">
                🏪 Store: {b.marketplaceOrder?.shopName || 'Partner Shop'}
              </div>
              {b.marketplaceOrder?.shopId?.address && (
                <div className="text-muted-foreground text-[11px]">
                  📍 Address: {b.marketplaceOrder.shopId.address}
                </div>
              )}
              {b.marketplaceOrder?.shopId?.phone && (
                <div className="text-muted-foreground text-[11px]">
                  📞 Store Contact: {b.marketplaceOrder.shopId.phone}
                </div>
              )}
            </div>

            <div className="bg-card border border-border/50 rounded-lg p-2.5">
              <span className="font-semibold text-muted-foreground text-[10px] uppercase block mb-1">Items &amp; Pricing</span>
              <ul className="space-y-1.5 text-[11px]">
                {(b.materialsList || b.marketplaceOrder?.products || []).map((prod: any, idx: number) => (
                  <li key={idx} className="text-muted-foreground flex justify-between items-center">
                    <div>
                      <span className="text-foreground font-medium">{prod.brandName} - {prod.productName}</span>
                      <span className="text-[10px] block">Qty: {prod.quantity} @ ₹{(prod.finalUnitPrice || prod.price || 0).toLocaleString()} each</span>
                    </div>
                    <span className="font-semibold text-foreground">₹{((prod.finalUnitPrice || prod.price || 0) * prod.quantity).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-dashed border-border/60 mt-2 pt-2 flex justify-between font-bold text-foreground">
                <span>Materials Total</span>
                <span>₹{(b.materialsTotal || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {b.deliveryMethod === 'Pickup' && b.marketplaceOrder?.shopId?.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    (b.marketplaceOrder?.shopName || '') + ' ' + (b.marketplaceOrder?.shopId?.address || '')
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-info/10 text-info font-bold text-[10px] hover:bg-info/20 transition-all flex items-center gap-1"
                >
                  📍 Navigate (GPS)
                </a>
              )}
              {b.deliveryMethod === 'Pickup' && (
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-[10px] hover:bg-primary/20 transition-all"
                >
                  🔑 View Pickup QR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Labour Invoice Download */}
      <div className="mt-3 flex justify-between items-center bg-muted/20 border border-border/40 p-2.5 rounded-xl">
        <span className="text-[11px] font-semibold text-muted-foreground">Labour Invoice:</span>
        <button
          type="button"
          onClick={() => {
            const title = 'Provider Service Labour Invoice';
            const fromInfo = `
              <strong>Provider Name:</strong> ${user?.name || b.providerName || 'ServiceHub Provider'}<br/>
              <strong>Service Category:</strong> ${b.category}<br/>
              <strong>Service Type:</strong> ${b.service_type}<br/>
            `;
            const labourVal = b.priceBreakdown?.subtotal || parseInt(String(b.price).replace(/\D/g, '')) || 500;
            const itemsHtml = `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">Service Labour charges (Completed by ${user?.name || b.providerName || 'ServiceHub Provider'})</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">1</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${labourVal}</td>
              </tr>
            `;
            const summaryHtml = `
              <div style="text-align: right; margin-top: 20px;">
                <p><strong>Labour Subtotal:</strong> ₹${labourVal}</p>
                <p style="font-size: 16px; color: #4f46e5;"><strong>Total Payable to Provider:</strong> ₹${labourVal}</p>
              </div>
            `;

            const invoiceHtml = `
              <html>
              <head>
                <title>Invoice - ${b.tracking_id}</title>
                <style>
                  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
                  .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); border-radius: 10px; }
                  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
                  .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
                  .details-table { width: 100%; margin-top: 20px; text-align: left; border-collapse: collapse; }
                </style>
              </head>
              <body>
                <div class="invoice-box">
                  <div class="header">
                    <div class="logo">ServiceHub</div>
                    <div>
                      <h2 style="margin: 0; color: #111827;">${title}</h2>
                      <p style="margin: 5px 0 0 0; font-size: 12px; text-align: right; color: #6b7280;">Date: ${b.date}</p>
                    </div>
                  </div>
                  <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 13px; line-height: 1.6;">
                    <div>
                      <h4 style="margin: 0 0 10px 0; color: #4f46e5; text-transform: uppercase; font-size: 11px;">Billing Details</h4>
                      ${fromInfo}
                    </div>
                    <div>
                      <h4 style="margin: 0 0 10px 0; color: #4f46e5; text-transform: uppercase; font-size: 11px;">Customer Info</h4>
                      <strong>Name:</strong> ${b.customer_name}<br/>
                      <strong>Email:</strong> ${b.customer_email || ''}<br/>
                      <strong>Location:</strong> ${b.location}<br/>
                    </div>
                  </div>
                  <table class="details-table" style="font-size: 13px;">
                    <thead>
                      <tr style="background: #f9fafb; color: #4b5563;">
                        <th style="padding: 12px;">Description</th>
                        <th style="padding: 12px; text-align: right; width: 80px;">Qty</th>
                        <th style="padding: 12px; text-align: right; width: 100px;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                  ${summaryHtml}
                  <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #9ca3af; text-align: center;">
                    Thank you for choosing ServiceHub. This is a computer generated invoice and does not require signature.
                  </div>
                </div>
                <script>
                  window.onload = function() { window.print(); }
                </script>
              </body>
              </html>
            `;

            const blob = new Blob([invoiceHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_LABOUR_${b.tracking_id}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
          className="px-2.5 py-1 rounded-lg bg-card border border-border text-[10px] font-bold text-foreground hover:bg-muted transition-all"
        >
          📄 Download Labour Invoice
        </button>
      </div>

      {/* Pickup QR Modal display */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowQr(false)}>
          <div className="bg-card p-5 rounded-2xl max-w-xs w-full text-center space-y-4 border border-border" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-sm text-foreground">Pickup Verification QR Code</h4>
            <div className="flex justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(b.marketplaceOrder?.pickupQrCode || `QR_SH_${b.id.slice(-6).toUpperCase()}`)}`} 
                alt="Pickup QR Code" 
                className="w-36 h-36 border border-border rounded-xl bg-white p-2"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Store keeper will scan this to release items.</p>
            <button onClick={() => setShowQr(false)} className="w-full py-1.5 bg-muted text-foreground text-xs font-semibold rounded-lg hover:bg-muted/80">
              Close
            </button>
          </div>
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
