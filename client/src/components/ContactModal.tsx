import { Provider } from '@/data/providers';
import { Booking } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ContactModalProps {
  provider: Provider;
  booking?: Booking | null;
  onClose: () => void;
}

export default function ContactModal({ provider, booking, onClose }: ContactModalProps) {
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: text });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-card-hover max-w-md w-full mx-4 animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="gradient-primary p-5 text-primary-foreground text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary-foreground/20 flex items-center justify-center text-3xl">
            {provider.avatar}
          </div>
          <h3 className="text-lg font-display font-bold">{provider.name}</h3>
          <span className="inline-block px-3 py-1 mt-1 rounded-full bg-primary-foreground/15 text-xs capitalize">{provider.category}</span>
        </div>
        <div className="p-6 space-y-4">
          {/* Phone */}
          <div className="border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">📞 Phone</div>
            <div className="font-medium text-foreground mb-2">{provider.phone}</div>
            <div className="flex gap-2">
              <a href={`tel:${provider.phone}`} className="flex-1 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity">
                Call Now
              </a>
              <button onClick={() => copy(provider.phone)} className="px-3 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-muted transition-colors">
                Copy
              </button>
              <a href={`https://wa.me/${provider.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                WhatsApp
              </a>
            </div>
          </div>

          {/* Email */}
          {provider.email && (
          <div className="border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">✉️ Email</div>
            <div className="font-medium text-foreground mb-2 text-sm break-all">{provider.email}</div>
            <div className="flex gap-2">
              <a href={`mailto:${provider.email}`} className="flex-1 py-2 rounded-lg bg-info text-info-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity">
                Send Email
              </a>
              <button onClick={() => copy(provider.email)} className="px-3 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-muted transition-colors">
                Copy
              </button>
            </div>
          </div>
          )}

          {booking && (
            <div className="border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-2">📋 Booking Details</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Date:</span> <span className="text-foreground font-medium">{booking.date}</span></div>
                <div><span className="text-muted-foreground">Time:</span> <span className="text-foreground font-medium">{booking.time}</span></div>
                <div><span className="text-muted-foreground">Service:</span> <span className="text-foreground font-medium">{booking.serviceType}</span></div>
                <div><span className="text-muted-foreground">Price:</span> <span className="text-foreground font-medium">{booking.price}</span></div>
              </div>
            </div>
          )}

          <button onClick={onClose} className="w-full py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
