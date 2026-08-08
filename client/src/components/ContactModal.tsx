import { useState } from 'react';
import { Provider } from '@/data/providers';
import { Booking } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Phone, ShieldCheck, Mail, Headset } from 'lucide-react';
import BookingChatModal from './chat/BookingChatModal';

interface ContactModalProps {
  provider: Provider;
  booking?: Booking | null;
  onClose: () => void;
}

export default function ContactModal({ provider, booking, onClose }: ContactModalProps) {
  const [openChat, setOpenChat] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: text });
  };

  const bookingIdentifier = booking?.id || booking?.trackingId || provider.id;

  if (openChat) {
    return (
      <BookingChatModal
        bookingId={bookingIdentifier}
        onClose={() => {
          setOpenChat(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-card-hover max-w-md w-full mx-4 animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="gradient-primary p-5 text-primary-foreground text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary-foreground/20 flex items-center justify-center text-3xl">
            {provider.avatar || '👷'}
          </div>
          <h3 className="text-lg font-display font-bold">{provider.name}</h3>
          <span className="inline-block px-3 py-1 mt-1 rounded-full bg-primary-foreground/15 text-xs capitalize">
            {provider.category || booking?.category || 'Service Specialist'}
          </span>
        </div>

        <div className="p-6 space-y-4">
          {/* 1. Chat with Provider (In-App Booking Chat) */}
          <div className="border-2 border-primary/30 bg-primary/5 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" /> Booking In-App Chat
              </span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                Protected Channel
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Communicate securely with {provider.name} regarding service instructions, arrival times, and warranty support.
            </p>
            <button
              type="button"
              onClick={() => setOpenChat(true)}
              className="w-full py-2.5 gradient-primary text-primary-foreground text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat with Provider</span>
            </button>
          </div>

          {/* 2. ServiceHub Central Support (9840994649) */}
          <div className="border border-border rounded-2xl p-4 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Headset className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">ServiceHub Support</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold">9 AM - 7 PM</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Phone: <strong className="text-foreground text-sm">9840994649</strong>
            </div>

            <div className="flex gap-2 pt-1">
              <a
                href="tel:+919840994649"
                className="flex-1 py-2 rounded-xl bg-success text-success-foreground text-xs font-bold text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Contact ServiceHub Support</span>
              </a>
              <button
                type="button"
                onClick={() => copy('9840994649')}
                className="px-3 py-2 rounded-xl border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* 3. Booking Details Summary */}
          {booking && (
            <div className="border border-border rounded-2xl p-3.5 bg-card text-xs space-y-1.5">
              <div className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                Booking Reference #{booking.trackingId || booking.id}
              </div>
              <div className="grid grid-cols-2 gap-2 text-foreground">
                <div><span className="text-muted-foreground">Service:</span> <strong>{booking.serviceType}</strong></div>
                <div><span className="text-muted-foreground">Schedule:</span> <strong>{booking.date} · {booking.time}</strong></div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>180-day workmanship warranty backed by ServiceHub</span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
