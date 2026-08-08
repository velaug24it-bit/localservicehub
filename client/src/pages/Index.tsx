import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { providers, serviceCategories, districts, Provider } from '@/data/providers';
import { useDbProviders } from '@/hooks/useDbProviders';
import BookingModal from '@/components/BookingModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import MyBookingsModal from '@/components/MyBookingsModal';
import ContactModal from '@/components/ContactModal';
import BookingChatModal from '@/components/chat/BookingChatModal';
import AIDiagnosisModal from '@/components/AIDiagnosisModal';
import NotificationBell from '@/components/NotificationBell';
import CustomerRetentionModal from '@/components/CustomerRetentionModal';
import ProviderReviewsModal from '@/components/ProviderReviewsModal';
import ReviewsSection from '@/components/sections/ReviewsSection';
import ContactSection from '@/components/sections/ContactSection';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import FAQSection from '@/components/sections/FAQSection';
import NewsletterSection from '@/components/sections/NewsletterSection';
import TrustBadgesSection from '@/components/sections/TrustBadgesSection';
import { Booking } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { dbProviders } = useDbProviders();

  const [searchCategory, setSearchCategory] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [showCount, setShowCount] = useState(12);
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [showBookings, setShowBookings] = useState(false);
  const [contactProvider, setContactProvider] = useState<Provider | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAIDiagnosis, setShowAIDiagnosis] = useState(false);
  const [showRetentionHub, setShowRetentionHub] = useState(false);
  const [activeChatBookingId, setActiveChatBookingId] = useState<string | null>(null);
  const [retentionTab, setRetentionTab] = useState<'warranties' | 'wallet' | 'rewards' | 'membership' | 'history' | 'emergency'>('warranties');
  const [reviewsProvider, setReviewsProvider] = useState<{ id: string; name: string } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // PWA install prompt capture
  useEffect(() => {
    // Check if already running as standalone (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      toast({ title: '🎉 ServiceHub Installed!', description: 'You can now access the app from your home screen.' });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showUserMenu]);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      // Native browser install prompt is available
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({ title: '✅ Installing ServiceHub...', description: 'The app will be added to your home screen.' });
      }
      setDeferredPrompt(null);
    } else {
      // Fallback: guide the user based on their browser/device
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isChrome = /chrome/i.test(navigator.userAgent) && !/edge/i.test(navigator.userAgent);

      if (isIOS || isSafari) {
        toast({
          title: '📱 Install on iOS',
          description: 'Tap the Share button (⎋) in Safari, then choose "Add to Home Screen".',
        });
      } else if (isChrome) {
        toast({
          title: '💻 Install ServiceHub',
          description: 'Click the install icon (⊕) in the browser address bar, or open Chrome menu → "Install ServiceHub".',
        });
      } else {
        toast({
          title: '📲 Install ServiceHub',
          description: 'Open your browser menu and look for "Install app" or "Add to Home Screen" to install.',
        });
      }
    }
    setShowUserMenu(false);
  };

  const allProviders = useMemo(() => {
    // DB providers first, then static ones (exclude duplicates by id)
    const dbIds = new Set(dbProviders.map(p => p.id));
    return [...dbProviders, ...providers.filter(p => !dbIds.has(p.id))];
  }, [dbProviders]);

  const filtered = useMemo(() => {
    let result = allProviders;
    const cat = activeCategory || searchCategory;
    if (cat) result = result.filter(p => p.category === cat);
    if (searchLocation) result = result.filter(p => p.location === searchLocation);
    return result;
  }, [allProviders, searchCategory, searchLocation, activeCategory]);

  const displayed = filtered.slice(0, showCount);

  const handleBook = (provider: Provider) => {
    if (!user) { toast({ title: 'Please login first', variant: 'destructive' }); navigate('/login'); return; }
    setBookingProvider(provider);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold gradient-text">ServiceHub</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#home" className="hover:text-foreground transition-colors">Home</a>
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#providers" className="hover:text-foreground transition-colors">Providers</a>
            <a href="#reviews" className="hover:text-foreground transition-colors">Reviews</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
            
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <button
                  onClick={() => { setRetentionTab('wallet'); setShowRetentionHub(true); }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                  title="View Customer Benefits, Warranties & Wallet"
                >
                  <span>🛡️ Wallet & Rewards</span>
                </button>
                <button onClick={() => setShowBookings(true)} className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                  My Bookings
                </button>
                <div className="relative" ref={userMenuRef}>
                  <button
                    id="user-profile-menu-btn"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    aria-haspopup="true"
                    aria-expanded={showUserMenu}
                  >
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold ring-2 ring-primary/30 hover:ring-primary/60 transition-all">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground hidden sm:block">{user.name}</span>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl shadow-card-hover border border-border py-2 animate-slide-up z-50">
                      <div className="px-4 py-2.5 border-b border-border">
                        <div className="text-sm font-semibold text-foreground truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                      <button
                        onClick={() => { setRetentionTab('warranties'); setShowRetentionHub(true); setShowUserMenu(false); }}
                        className="w-full px-4 py-2 text-xs text-foreground text-left hover:bg-muted transition-colors flex items-center gap-2 font-medium"
                      >
                        🛡️ Active Warranties
                      </button>
                      <button
                        onClick={() => { setRetentionTab('wallet'); setShowRetentionHub(true); setShowUserMenu(false); }}
                        className="w-full px-4 py-2 text-xs text-foreground text-left hover:bg-muted transition-colors flex items-center gap-2 font-medium"
                      >
                        💳 Wallet & Cashback
                      </button>
                      <button
                        onClick={() => { setRetentionTab('membership'); setShowRetentionHub(true); setShowUserMenu(false); }}
                        className="w-full px-4 py-2 text-xs text-foreground text-left hover:bg-muted transition-colors flex items-center gap-2 font-medium"
                      >
                        ⭐ Membership Shield
                      </button>
                      <button
                        id="menu-my-bookings"
                        onClick={() => { setShowBookings(true); setShowUserMenu(false); }}
                        className="w-full px-4 py-2 text-xs text-foreground text-left hover:bg-muted transition-colors flex items-center gap-2 font-medium"
                      >
                        📋 My Bookings
                      </button>
                      {!isAppInstalled && (
                        <button
                          id="menu-install-app"
                          onClick={handleInstallApp}
                          className="w-full px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2 text-primary font-medium"
                        >
                          <span>📥</span>
                          <span>Install App</span>
                          <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">FREE</span>
                        </button>
                      )}
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          id="menu-logout"
                          onClick={() => { logout(); setShowUserMenu(false); }}
                          className="w-full px-4 py-2.5 text-sm text-destructive text-left hover:bg-muted transition-colors flex items-center gap-2"
                        >
                          🚪 Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="gradient-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden py-16 sm:py-24" style={{ background: 'var(--gradient-hero)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-5xl font-display font-bold text-foreground mb-4 animate-slide-up">
            Find <span className="gradient-text">Trusted</span> Local Service Providers
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Connect with verified professionals across Tamil Nadu for all your home service needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <select value={searchCategory} onChange={e => { setSearchCategory(e.target.value); setActiveCategory(''); }}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary outline-none">
              <option value="">All Services</option>
              {serviceCategories.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
            <select value={searchLocation} onChange={e => setSearchLocation(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary outline-none">
              <option value="">All Locations</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={() => { setActiveCategory(''); setShowCount(12); }}
              className="gradient-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
              Search
            </button>
          </div>
          {/* AI Diagnosis CTA */}
          <div className="mt-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => {
                if (!user) { toast({ title: 'Please login first', variant: 'destructive' }); navigate('/login'); return; }
                setShowAIDiagnosis(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border text-foreground font-semibold hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
            >
              <span className="text-xl">📸</span>
              <span>AI Problem Detection — Upload a photo</span>
              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-bold">NEW</span>
            </button>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">Service Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {serviceCategories.map(cat => (
            <button key={cat.key} onClick={() => { setActiveCategory(cat.key === activeCategory ? '' : cat.key); setSearchCategory(''); setShowCount(12); }}
              className={`p-5 rounded-xl border text-center transition-all hover:-translate-y-1 hover:shadow-card ${
                activeCategory === cat.key ? 'border-primary bg-accent shadow-card' : 'border-border bg-card hover:border-primary/50'
              }`}>
              <div className="text-3xl mb-2">{cat.icon}</div>
              <div className="font-semibold text-foreground text-sm">{cat.name}</div>
              <div className="text-xs text-muted-foreground mt-1 hidden sm:block">{cat.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Providers */}
      <section id="providers" className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold text-foreground">
            {activeCategory || searchCategory ? `${serviceCategories.find(c => c.key === (activeCategory || searchCategory))?.name || ''} Providers` : 'Featured Providers'}
          </h2>
          <span className="text-sm text-muted-foreground">{filtered.length} providers found</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayed.map(provider => (
            <div key={provider.id} className="bg-card rounded-xl border border-border overflow-hidden hover:-translate-y-1 hover:shadow-card-hover transition-all group">
              <div className="gradient-primary p-4 flex items-center gap-3 relative">
                {provider.verified && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-xs bg-success/90 px-2 py-0.5 rounded-full text-success-foreground font-semibold">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Verified
                  </div>
                )}
                <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center text-2xl shrink-0">
                  {provider.avatar}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-primary-foreground text-sm truncate">{provider.name}</div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setReviewsProvider({ id: provider.id, name: provider.name });
                    }}
                    className="flex items-center gap-1 text-xs text-primary-foreground/75 hover:text-primary-foreground hover:underline transition-colors focus:outline-none"
                    title="Click to view provider reviews"
                  >
                    <span className="text-warning">★</span> {provider.rating} ({provider.reviews})
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {provider.services.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px] font-medium">{s}</span>
                  ))}
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  <div className="flex justify-between"><span>💰 {provider.priceRange}</span><span className="text-primary font-medium">⚡ Smart Price</span></div>
                  <div className="flex justify-between"><span>📍 {provider.location}</span><span>🕐 {provider.experience}</span></div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{provider.description}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleBook(provider)}
                    className="flex-1 gradient-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                    Book Now
                  </button>
                  <button onClick={() => setContactProvider(provider)}
                    className="px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm">
                    💬
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length > showCount && (
          <div className="text-center mt-8">
            <button onClick={() => setShowCount(prev => prev + 12)}
              className="px-8 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
              Show More ({filtered.length - showCount} remaining)
            </button>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-4xl mb-3">🔍</div>
            <p>No providers found. Try different filters.</p>
          </div>
        )}
      </section>

      {/* How It Works */}
      <HowItWorksSection />

      {/* Trust Badges */}
      <TrustBadgesSection />

      {/* Features */}
      <section className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-display font-bold text-foreground mb-8 text-center">Why Choose ServiceHub?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🛡️', title: 'Verified Providers', desc: 'All professionals are background checked and verified.' },
              { icon: '💰', title: 'Transparent Pricing', desc: 'No hidden fees. Know the cost before you book.' },
              { icon: '📱', title: 'Real-Time Tracking', desc: 'Track your service provider live with step-by-step updates.' },
              { icon: '⭐', title: 'Trusted Reviews', desc: 'Read genuine reviews from verified customers.' },
            ].map(f => (
              <div key={f.title} className="bg-card rounded-xl p-6 text-center border border-border hover:-translate-y-1 hover:shadow-card transition-all">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <div id="reviews">
        <ReviewsSection />
      </div>

      {/* FAQ */}
      <FAQSection />

      {/* Newsletter */}
      <NewsletterSection />

      {/* Contact */}
      <ContactSection />


      {/* Footer */}
      <footer className="bg-foreground text-primary-foreground/70 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-display font-bold text-primary-foreground text-lg mb-3">ServiceHub</h3>
              <p className="text-sm">Connecting you with trusted professionals across Tamil Nadu.</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">For Customers</h4>
              <ul className="space-y-2 text-sm"><li>Find Services</li><li>Track Bookings</li><li>Write Reviews</li></ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">For Providers</h4>
              <ul className="space-y-2 text-sm"><li>Join as Provider</li><li>Provider Dashboard</li><li>Manage Bookings</li></ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/contact" className="hover:underline hover:text-primary-foreground transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:underline hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:underline hover:text-primary-foreground transition-colors">Terms &amp; Conditions</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/10 pt-6 text-center text-sm">
            © {new Date().getFullYear()} ServiceHub. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modals */}
      {bookingProvider && (
        <BookingModal provider={bookingProvider} onClose={() => setBookingProvider(null)}
          onConfirm={(booking) => { setBookingProvider(null); setConfirmedBooking(booking); }} />
      )}
      {confirmedBooking && (
        <ConfirmationModal booking={confirmedBooking} onClose={() => setConfirmedBooking(null)}
          onViewBookings={() => { setConfirmedBooking(null); setShowBookings(true); }} />
      )}
      {showBookings && <MyBookingsModal onClose={() => setShowBookings(false)} />}
      {showRetentionHub && (
        <CustomerRetentionModal
          initialTab={retentionTab}
          onClose={() => setShowRetentionHub(false)}
          onRebook={(prov) => {
            const match = allProviders.find(p => p.id === prov.providerId || p.name === prov.providerName);
            if (match) setBookingProvider(match);
            else if (allProviders.length > 0) setBookingProvider(allProviders[0]);
          }}
        />
      )}
      {activeChatBookingId && (
        <BookingChatModal
          bookingId={activeChatBookingId}
          onClose={() => setActiveChatBookingId(null)}
        />
      )}
      {contactProvider && <ContactModal provider={contactProvider} onClose={() => setContactProvider(null)} />}
      {showAIDiagnosis && (
        <AIDiagnosisModal
          onClose={() => setShowAIDiagnosis(false)}
          onBookProvider={(provider) => { setShowAIDiagnosis(false); setBookingProvider(provider); }}
          allProviders={allProviders}
          userLocation={user?.location || 'Chennai'}
        />
      )}
      {reviewsProvider && (
        <ProviderReviewsModal
          providerId={reviewsProvider.id}
          providerName={reviewsProvider.name}
          onClose={() => setReviewsProvider(null)}
        />
      )}
    </div>
  );
};

export default Index;
