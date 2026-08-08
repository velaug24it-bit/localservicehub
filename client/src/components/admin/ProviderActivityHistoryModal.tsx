import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  X, Briefcase, Wallet, Star, ShieldCheck, Clock, CheckCircle, 
  AlertCircle, Phone, Mail, MapPin, Award, ArrowUpRight, Search 
} from 'lucide-react';

interface ProviderActivityHistoryModalProps {
  providerId: string;
  onClose: () => void;
}

export default function ProviderActivityHistoryModal({ providerId, onClose }: ProviderActivityHistoryModalProps) {
  const [subTab, setSubTab] = useState<'bookings' | 'wallet' | 'reviews' | 'warranties'>('bookings');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.admin.providers.getActivityHistory(providerId);
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Failed to load provider history',
        description: err.message || 'Could not fetch provider activity records.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [providerId]);

  const provider = data?.provider;
  const stats = data?.stats;
  const bookings = data?.bookings || [];
  const wallet = data?.wallet;
  const reviews = data?.reviews || [];
  const warranties = data?.warranties || [];

  const filteredBookings = bookings.filter((b: any) => {
    const q = searchQuery.toLowerCase();
    return (
      (b.trackingId || '').toLowerCase().includes(q) ||
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.serviceType || '').toLowerCase().includes(q) ||
      (b.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
              {provider?.name ? provider.name.charAt(0).toUpperCase() : '👷'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {provider?.name || 'Service Specialist'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  provider?.approved 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {provider?.approved ? '✓ Approved Specialist' : '⚠ Pending Approval'}
                </span>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                  {provider?.category || 'Specialist'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {provider?.phone || 'N/A'}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {provider?.email || 'N/A'}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {provider?.location || 'Tamil Nadu'}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="px-5 py-3 border-b border-border bg-card grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 shrink-0 text-xs">
          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Jobs</span>
            <strong className="text-sm font-extrabold text-foreground">{stats?.totalAssignedBookings || 0} Assigned</strong>
            <span className="text-[10px] text-emerald-600 block">{stats?.completedJobs || 0} Finished</span>
          </div>

          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Work Volume</span>
            <strong className="text-sm font-extrabold text-foreground">₹{(stats?.totalWorkVolume || 0).toLocaleString('en-IN')}</strong>
            <span className="text-[10px] text-muted-foreground block">Customer Gross</span>
          </div>

          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Earnings Settled</span>
            <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              ₹{(stats?.totalProviderEarnings || 0).toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-muted-foreground block">Net to Worker</span>
          </div>

          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Milestone Points</span>
            <strong className="text-sm font-extrabold text-amber-500">🎯 {stats?.milestonePoints || 0}/100 pts</strong>
            <span className="text-[10px] text-muted-foreground block">{stats?.milestoneCyclesCompleted || 0} ₹1,000 cycles</span>
          </div>

          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Wallet Available</span>
            <strong className="text-sm font-extrabold text-primary">₹{(stats?.availableBalance || 0).toLocaleString('en-IN')}</strong>
            <span className="text-[10px] text-muted-foreground block">₹{stats?.totalWithdrawn || 0} Withdrawn</span>
          </div>

          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Customer Rating</span>
            <strong className="text-sm font-extrabold text-amber-500">⭐ {stats?.avgCustomerRating || 5.0} / 5.0</strong>
            <span className="text-[10px] text-muted-foreground block">{stats?.totalReviewsCount || 0} Reviews</span>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="px-5 border-b border-border bg-card flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
          {[
            { id: 'bookings' as const, label: `💼 Work & Jobs (${bookings.length})` },
            { id: 'wallet' as const, label: `💰 Wallet & Payouts (${wallet?.transactions?.length || 0})` },
            { id: 'reviews' as const, label: `⭐ Customer Reviews (${reviews.length})` },
            { id: 'warranties' as const, label: `🛡️ Warranties & Claims (${warranties.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`py-2.5 px-3.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
                subTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <span className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-medium">Fetching provider work history & ledger...</p>
            </div>
          ) : (
            <>
              {/* ── TAB 1: WORK COMPLETED & ASSIGNED BOOKINGS ── */}
              {subTab === 'bookings' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by ID, customer or service..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      Showing {filteredBookings.length} of {bookings.length} assignments
                    </span>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div className="bg-muted/20 border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground space-y-1">
                      <p className="text-xs font-bold text-foreground">No bookings found for this specialist</p>
                      <p className="text-[11px]">When customers place bookings assigned to this worker, they will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                            <th className="px-4 py-3">Tracking ID</th>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Service & Schedule</th>
                            <th className="px-4 py-3 text-right">Job Price</th>
                            <th className="px-4 py-3 text-right">Worker Earnings</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredBookings.map((b: any) => {
                            const rawPrice = b.priceBreakdown?.subtotal || (typeof b.price === 'number' ? b.price : parseInt(String(b.price || 0).replace(/[^\d]/g, ''), 10)) || 0;
                            const workerEarnings = b.priceBreakdown?.providerEarnings || Math.round(rawPrice * 0.85);

                            return (
                              <tr key={b.id || b._id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-foreground">
                                  #{b.trackingId || b.id?.slice(-6) || 'JOB'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-bold text-foreground block">{b.customerName}</span>
                                  <span className="text-[10px] text-muted-foreground">{b.customerPhone}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-bold text-foreground block">{b.serviceType}</span>
                                  <span className="text-[10px] text-muted-foreground">{b.date} at {b.time}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-foreground">
                                  ₹{rawPrice.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                                  ₹{workerEarnings.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    b.status === 'Completed'
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : b.status === 'Confirmed'
                                      ? 'bg-primary/10 text-primary'
                                      : b.status === 'Cancelled'
                                      ? 'bg-destructive/10 text-destructive'
                                      : 'bg-amber-500/10 text-amber-600'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    b.paymentStatus === 'Paid'
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {b.paymentStatus || 'Unpaid'}
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
              )}

              {/* ── TAB 2: WALLET & PAYOUTS LEDGER ── */}
              {subTab === 'wallet' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Available Liquid Balance</span>
                      <div className="text-2xl font-black">₹{wallet?.availableBalance || 0}</div>
                      <span className="text-[10px] text-emerald-100 block">Ready for UPI payout</span>
                    </div>

                    <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Pending In-Flight</span>
                      <div className="text-2xl font-black text-amber-500">₹{wallet?.pendingSettlement || 0}</div>
                      <span className="text-[10px] text-muted-foreground block">Queueing bank transfer</span>
                    </div>

                    <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Lifetime Withdrawn</span>
                      <div className="text-2xl font-black text-foreground">₹{wallet?.totalWithdrawn || 0}</div>
                      <span className="text-[10px] text-muted-foreground block">Successfully transferred</span>
                    </div>
                  </div>

                  {/* Transactions Ledger */}
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                      Wallet Transactions & Earnings Ledger ({wallet?.transactions?.length || 0})
                    </h4>

                    {(!wallet?.transactions || wallet.transactions.length === 0) ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No wallet transactions logged yet.</p>
                    ) : (
                      <div className="divide-y divide-border/60 max-h-72 overflow-y-auto pr-1">
                        {wallet.transactions.map((tx: any, idx: number) => (
                          <div key={tx.id || idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground block truncate">{tx.description}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Type: <strong className="capitalize">{tx.type?.replace('_', ' ')}</strong>
                              </span>
                            </div>
                            <span className={`font-extrabold shrink-0 text-sm ${
                              tx.type === 'withdrawal' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {tx.type === 'withdrawal' ? '-' : '+'}₹{tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 3: CUSTOMER REVIEWS & TESTIMONIALS ── */}
              {subTab === 'reviews' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>Customer Star Ratings & Reviews ({reviews.length})</span>
                    </h4>
                    <span className="text-xs font-extrabold text-amber-500">
                      Average: ⭐ {stats?.avgCustomerRating || 5.0} / 5.0
                    </span>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="bg-muted/20 border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground space-y-1">
                      <p className="text-xs font-bold text-foreground">No customer reviews submitted yet</p>
                      <p className="text-[11px]">When customers complete a service with this specialist, their ratings will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reviews.map((r: any) => (
                        <div key={r.id || r._id} className="bg-muted/30 border border-border p-3.5 rounded-2xl space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-foreground block truncate">{r.customerName || 'Verified Client'}</span>
                              <span className="text-[10px] text-primary font-semibold block truncate">{r.serviceType}</span>
                            </div>
                            <div className="flex text-amber-500 shrink-0">
                              {'★'.repeat(r.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (r.rating || 5)))}
                            </div>
                          </div>

                          <p className="text-muted-foreground italic bg-card/60 p-2 rounded-xl border border-border/40 text-[11px]">
                            "{r.comment || 'Quality job completed on time.'}"
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                            <span>Booking: #{r.bookingId?.slice(-6) || 'JOB'}</span>
                            <span>{new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: WARRANTIES & CLAIMS ── */}
              {subTab === 'warranties' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Digital Warranty Certificates Issued ({warranties.length})</span>
                  </h4>

                  {warranties.length === 0 ? (
                    <div className="bg-muted/20 border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground space-y-1">
                      <p className="text-xs font-bold text-foreground">No warranty certificates issued yet</p>
                      <p className="text-[11px]">When bookings are completed, 90-day certificates are automatically registered.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {warranties.map((w: any) => (
                        <div key={w.id || w._id} className="bg-muted/30 border border-border p-3.5 rounded-2xl space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                                {w.warrantyNumber}
                              </span>
                              <h5 className="font-bold text-foreground text-xs mt-1">{w.serviceName}</h5>
                              <p className="text-[10px] text-muted-foreground">Customer: {w.customerName}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              w.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {w.status}
                            </span>
                          </div>

                          <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                            <span>Issued: {new Date(w.startDate).toLocaleDateString()}</span>
                            <span>Expires: {new Date(w.expiryDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
