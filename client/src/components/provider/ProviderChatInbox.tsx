import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  MessageSquare, Search, Clock, CheckCircle, ShieldCheck, 
  Send, Phone, ArrowLeft, Sparkles, CheckCheck, RefreshCw 
} from 'lucide-react';
import BookingChatModal from '../chat/BookingChatModal';

export default function ProviderChatInbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const fetchConversations = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.chat.getProviderConversations();
      setConversations(data || []);
    } catch (err: any) {
      if (!silent) {
        toast({
          title: 'Could not load messages',
          description: err.message || 'Failed to fetch provider inbox.',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.bookingId || '').toLowerCase().includes(q) ||
      (c.serviceType || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-foreground">Booking Messages</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Securely mapped to verified booking IDs and protected under ServiceHub guarantee.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer or #ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <span className="w-7 h-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading booking chats...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center text-muted-foreground space-y-2">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-sm font-bold text-foreground">No booking conversations yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            When customers book your services, their inquiries, arrival confirmations, and service details will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(c => {
            const hasUnread = (c.providerUnreadCount || 0) > 0;
            return (
              <div
                key={c.id || c._id}
                onClick={() => setSelectedBookingId(c.bookingId)}
                className={`bg-card border-2 rounded-2xl sm:rounded-3xl p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 active:scale-[0.98] ${
                  hasUnread ? 'border-primary shadow-sm ring-1 ring-primary/30' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-extrabold text-foreground block truncate">
                        {c.customerName}
                      </span>
                      <span className="text-[11px] font-bold text-primary block truncate">
                        {c.serviceType}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-foreground uppercase tracking-wider">
                        #{c.bookingId}
                      </span>
                      {hasUnread && (
                        <span className="text-[10px] font-black bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full animate-pulse">
                          {c.providerUnreadCount} New
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last message snippet */}
                  <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50 text-xs text-foreground/90 line-clamp-2">
                    {c.lastMessage || 'No messages yet.'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : 'Active'}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBookingId(c.bookingId);
                    }}
                    className="px-3 py-1.5 gradient-primary text-primary-foreground font-bold rounded-xl text-xs shadow-sm hover:opacity-90 transition-opacity"
                  >
                    Open Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Chat Modal Popup */}
      {selectedBookingId && (
        <BookingChatModal
          bookingId={selectedBookingId}
          onClose={() => {
            setSelectedBookingId(null);
            fetchConversations(true);
          }}
        />
      )}
    </div>
  );
}
