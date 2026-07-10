import { useState, useEffect } from 'react';
import { Booking } from '@/contexts/AuthContext';
import { trackingSteps } from '@/data/providers';
import { api } from '@/lib/api';

interface LiveGPSTrackingModalProps {
  booking: Booking;
  onClose: () => void;
}

// Category icons for each step type
const stepIcons: Record<string, string[]> = {
  plumbing:     ['✅', '🚗', '🔍', '🛠️', '🔧', '🧹', '🎉'],
  electrical:   ['✅', '🚗', '⚠️', '🔍', '⚡', '🧪', '🎉'],
  cleaning:     ['✅', '🚗', '🧴', '🧽', '✨', '🔎', '🎉'],
  hvac:         ['✅', '🚗', '🔍', '🧐', '❄️', '🧪', '🎉'],
  handyman:     ['✅', '🚗', '📋', '🧰', '🔨', '✅', '🎉'],
  landscaping:  ['✅', '🚗', '🌳', '⚙️', '🌿', '🧹', '🎉'],
};

const categoryColors: Record<string, string> = {
  plumbing:    'from-blue-600 to-blue-700',
  electrical:  'from-yellow-600 to-amber-700',
  cleaning:    'from-teal-600 to-teal-700',
  hvac:        'from-cyan-600 to-sky-700',
  handyman:    'from-orange-600 to-orange-700',
  landscaping: 'from-green-600 to-green-700',
};

const categoryEmoji: Record<string, string> = {
  plumbing: '🔧', electrical: '⚡', cleaning: '🧹',
  hvac: '❄️', handyman: '🔨', landscaping: '🌿',
};

function formatElapsed(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export default function LiveGPSTrackingModal({ booking, onClose }: LiveGPSTrackingModalProps) {
  const steps = trackingSteps[booking.category] || trackingSteps.plumbing;
  const icons = stepIcons[booking.category] || stepIcons.plumbing;
  const gradColor = categoryColors[booking.category] || 'from-indigo-600 to-purple-700';
  const catEmoji = categoryEmoji[booking.category] || '🔧';

  const [currentStep, setCurrentStep] = useState(booking.currentStep ?? 0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const progress = Math.min(100, Math.round(((currentStep + 1) / steps.length) * 100));
  const remainingSteps = steps.length - currentStep - 1;
  const eta = remainingSteps > 0 ? `~${remainingSteps * 10}–${remainingSteps * 20} min` : 'Almost done!';
  const isCompleted = currentStep >= steps.length - 1;

  // Auto-refresh booking status every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        setRefreshing(true);
        const data = await api.bookings.list();
        const updated = data?.find((b: any) => b.id === booking.id || b._id === booking.id);
        if (updated && updated.currentStep !== undefined) {
          setCurrentStep(updated.currentStep);
        }
        setLastRefreshed(new Date());
      } catch (_) {
        // silently fail
      } finally {
        setRefreshing(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [booking.id]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.bookings.list();
      const updated = data?.find((b: any) => b.id === booking.id || b._id === booking.id);
      if (updated && updated.currentStep !== undefined) {
        setCurrentStep(updated.currentStep);
      }
      setLastRefreshed(new Date());
    } catch (_) {}
    finally { setRefreshing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-card-hover max-w-md w-full mx-4 animate-slide-up overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradColor} p-5 text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{catEmoji}</span>
                <h3 className="text-lg font-bold">Service Tracker</h3>
                {!isCompleted && (
                  <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-sm text-white/80">{booking.providerName} • {booking.serviceType}</p>
              <p className="text-xs text-white/60 mt-0.5">📍 {booking.location} • 📅 {booking.date} at {booking.time}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-white/80 mb-1.5">
              <span>{isCompleted ? '🎉 Service Complete!' : `Step ${currentStep + 1} of ${steps.length}`}</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ETA cards */}
          {!isCompleted && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-xl p-3 text-center border border-border">
                <div className="text-lg font-bold text-foreground">{currentStep + 1}/{steps.length}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Current Step</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center border border-border">
                <div className="text-sm font-bold text-foreground">{eta}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Est. Time</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center border border-border">
                <div className="text-lg font-bold text-foreground">{remainingSteps}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Steps Left</div>
              </div>
            </div>
          )}

          {/* Completed banner */}
          {isCompleted && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center space-y-1">
              <div className="text-3xl">🎉</div>
              <p className="font-bold text-success text-sm">Service Successfully Completed!</p>
              <p className="text-xs text-muted-foreground">Your booking has been completed. Please proceed to payment.</p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Service Progress Timeline</p>
            <div className="space-y-0">
              {steps.map((step, i) => {
                const completed = i < currentStep;
                const current = i === currentStep;
                const pending = i > currentStep;
                return (
                  <div key={i} className="flex gap-3">
                    {/* Connector column */}
                    <div className="flex flex-col items-center" style={{ minWidth: 40 }}>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 border-2 transition-all duration-500 ${
                          completed
                            ? 'bg-success border-success text-white shadow-sm'
                            : current
                            ? 'bg-warning border-warning text-white shadow-md ring-4 ring-warning/20 animate-pulse'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {completed ? '✓' : (icons[i] || String(i + 1))}
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={`w-0.5 h-8 transition-colors duration-500 ${
                            completed ? 'bg-success' : 'bg-border'
                          }`}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`pt-1.5 pb-4 flex-1 ${pending ? 'opacity-50' : ''}`}>
                      <div className={`text-sm font-semibold ${current ? 'text-foreground' : pending ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {step.name}
                        {current && (
                          <span className="ml-2 text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full font-medium">
                            In Progress
                          </span>
                        )}
                        {completed && (
                          <span className="ml-2 text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-medium">
                            Done
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking details */}
          <div className="bg-muted/40 border border-border rounded-xl p-4 text-xs space-y-2">
            <p className="font-semibold text-foreground text-sm mb-1">📋 Booking Details</p>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <div><span className="text-muted-foreground">Tracking ID:</span> <span className="font-mono text-foreground font-medium">{booking.trackingId}</span></div>
              <div><span className="text-muted-foreground">Price:</span> <span className="text-foreground font-medium">{booking.price}</span></div>
              <div><span className="text-muted-foreground">Category:</span> <span className="text-foreground font-medium capitalize">{booking.category}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="text-foreground font-medium">{booking.status}</span></div>
            </div>
          </div>

          {/* Refresh status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium transition-colors disabled:opacity-50"
            >
              {refreshing ? (
                <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : '🔄'}
              Refresh
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2">
              🚨 Emergency SOS
            </button>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors text-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
