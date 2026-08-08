import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Send, Phone, ShieldCheck, Clock, CheckCheck, 
  Sparkles, MessageSquare, AlertCircle, ArrowLeft, RefreshCw, X
} from 'lucide-react';

interface BookingChatModalProps {
  bookingId: string; // trackingId or Mongo _id
  onClose: () => void;
}

export default function BookingChatModal({ bookingId, onClose }: BookingChatModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.chat.getBookingChat(bookingId);
      if (res) {
        setConversation(res.conversation);
        setMessages(res.messages || []);
        setBooking(res.booking);
      }
    } catch (err: any) {
      if (!silent) {
        toast({
          title: 'Chat Load Failed',
          description: err.message || 'Could not load conversation for this booking.',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchChat();
    // Real-time polling every 3 seconds while chat window is active
    const timer = setInterval(() => {
      fetchChat(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if (!textToSend || sending) return;

    setSending(true);
    try {
      const res = await api.chat.sendMessage(bookingId, {
        message: textToSend,
        messageType: 'text'
      });
      if (res?.message) {
        setMessages(prev => [...prev, res.message]);
        if (res.conversation) setConversation(res.conversation);
        setInputText('');
      }
    } catch (err: any) {
      toast({
        title: 'Message Not Sent',
        description: err.message || 'Failed to deliver message.',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const isCustomer = user?.userType === 'customer' || (booking && user?.id === booking.userId);
  const otherPartyName = isCustomer ? booking?.providerName : booking?.customerName;

  const quickChips = isCustomer ? [
    'Can you arrive at 5 PM?',
    'I am at the service location.',
    'Please inspect the spare parts.',
    'Service completed, thank you!'
  ] : [
    'On my way to your location!',
    'Will arrive in 15 minutes.',
    'Inspecting the issue now.',
    'Work completed, please inspect.'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div 
        className="bg-card border border-border sm:rounded-3xl rounded-t-3xl shadow-card-hover w-full sm:max-w-xl flex flex-col h-[95vh] sm:h-[90vh] sm:max-h-[750px] overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="gradient-primary px-4 py-3.5 text-primary-foreground shrink-0 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-primary-foreground/20 text-primary-foreground transition-colors shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-display font-bold text-sm sm:text-base leading-tight truncate">
                  {otherPartyName || 'Service Specialist'}
                </h3>
                <span className="text-[10px] bg-primary-foreground/25 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  #{booking?.trackingId || 'Chat'}
                </span>
              </div>
              <p className="text-[11px] text-primary-foreground/80 mt-0.5 truncate">
                {booking?.serviceType} · {booking?.date || 'Scheduled'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="tel:+919840994649"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground text-xs font-bold transition-all border border-primary-foreground/20"
              title="Call ServiceHub Support"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Support: 9840994649</span>
              <span className="md:hidden">Support</span>
            </a>
            <a
              href="tel:+919840994649"
              className="sm:hidden p-1.5 rounded-full bg-primary-foreground/15 text-primary-foreground"
            >
              <Phone className="w-4 h-4" />
            </a>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-primary-foreground/20 text-primary-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Support & Security Trust Banner */}
        <div className="bg-primary/5 border-b border-border/80 px-3 py-2 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
            <span className="truncate">Encrypted Booking Channel · 180-Day Warranty</span>
          </div>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
              <span className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Connecting to secure booking chat...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-12 h-12 rounded-2xl gradient-primary mx-auto flex items-center justify-center text-primary-foreground text-xl shadow-md">
                💬
              </div>
              <p className="text-sm font-bold text-foreground">Start Conversation</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Send instructions, confirm arrival time, or discuss service requirements directly.
              </p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMine = m.senderId === user?.id || (isCustomer && m.senderRole === 'customer') || (!isCustomer && m.senderRole === 'provider');
              const isSystem = m.senderRole === 'system';
              const isAdmin = m.senderRole === 'admin';

              if (isSystem) {
                return (
                  <div key={m.id || idx} className="text-center my-3">
                    <div className="inline-block bg-primary/10 border border-primary/20 text-primary rounded-2xl px-3.5 py-1.5 text-[11px] font-medium max-w-md shadow-sm">
                      {m.message}
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={m.id || idx}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {isAdmin ? '🛡️ ServiceHub Support' : isMine ? 'You' : m.senderName || otherPartyName}
                    </span>
                    <span className="text-[9px] text-muted-foreground/70">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                      isMine 
                        ? 'gradient-primary text-primary-foreground rounded-tr-sm font-medium' 
                        : isAdmin
                          ? 'bg-amber-500/15 border border-amber-500/30 text-foreground rounded-tl-sm'
                          : 'bg-card border border-border text-foreground rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                      isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {isMine && (
                        <CheckCheck className={`w-3 h-3 ${m.read ? 'text-emerald-300' : 'opacity-60'}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Chips */}
        <div className="px-3 py-2 bg-card border-t border-border flex items-center gap-1.5 overflow-x-auto shrink-0" style={{scrollbarWidth:'none'}}>
          <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="hidden sm:inline">Quick:</span>
          </span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(undefined, chip)}
              disabled={sending || conversation?.isReadOnly}
              className="text-[10px] sm:text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border border-border/60 shrink-0 font-medium active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="px-3 py-2.5 sm:p-3 bg-card border-t border-border shrink-0 safe-area-pb">
          {conversation?.isReadOnly ? (
            <div className="p-2.5 bg-muted/60 rounded-2xl text-center text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Chat concluded its warranty window and is now read-only.</span>
            </div>
          ) : (
            <form onSubmit={e => handleSend(e)} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`Message ${otherPartyName || 'specialist'}...`}
                disabled={sending}
                autoComplete="off"
                className="flex-1 px-3 py-2.5 sm:px-4 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="gradient-primary text-primary-foreground p-2.5 sm:px-4 sm:py-2.5 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Send</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
