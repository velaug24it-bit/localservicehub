import { Booking } from '@/contexts/AuthContext';
import { trackingSteps } from '@/data/providers';

interface LiveTrackingModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function LiveTrackingModal({ booking, onClose }: LiveTrackingModalProps) {
  const steps = trackingSteps[booking.category] || trackingSteps.plumbing;
  const currentStep = booking.currentStep;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const remainingSteps = steps.length - currentStep - 1;
  const eta = `~${remainingSteps * 15} min`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-card-hover max-w-md w-full mx-4 animate-slide-up overflow-hidden max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="gradient-primary p-5 text-primary-foreground">
          <h3 className="text-lg font-display font-bold">Live Tracking</h3>
          <p className="text-sm text-primary-foreground/70">{booking.providerName} • {booking.serviceType}</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-foreground">{Math.round(progress)}% Complete</div>
            <div className="text-sm text-muted-foreground">ETA: {eta}</div>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden mb-6">
            <div className="h-full rounded-full gradient-primary transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>

          <div className="space-y-1">
            {steps.map((step, i) => {
              const completed = i < currentStep;
              const current = i === currentStep;
              const pending = i > currentStep;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      completed ? 'bg-success text-success-foreground' :
                      current ? 'bg-warning text-warning-foreground animate-pulse' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {completed ? '✓' : current ? '⟳' : i + 1}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-0.5 h-8 ${completed ? 'bg-success' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="pt-1 pb-3">
                    <div className={`text-sm font-medium ${pending ? 'text-muted-foreground' : 'text-foreground'}`}>{step.name}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={onClose} className="w-full mt-4 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
