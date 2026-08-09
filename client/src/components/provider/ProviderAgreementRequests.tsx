import React, { useState, useEffect } from 'react';
import { 
  Wrench, CheckCircle2, XCircle, Clock, MessageSquare, 
  AlertCircle, ShieldCheck, Play, CheckCheck, RefreshCw 
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import BookingChatModal from '@/components/chat/BookingChatModal';

export default function ProviderAgreementRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Decline modal state
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.agreementProvider.listRequests();
      setRequests(res || []);
    } catch (err: any) {
      toast({
        title: 'Error loading requests',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      await api.agreementProvider.acceptRequest(requestId);
      toast({
        title: '✅ Request Accepted',
        description: 'You have accepted this agreement service request. You can now chat with the customer and start service.'
      });
      fetchRequests();
    } catch (err: any) {
      toast({
        title: 'Accept failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningId) return;

    try {
      setActionLoading(decliningId);
      await api.agreementProvider.declineRequest(decliningId, declineReason);
      toast({
        title: 'Request Declined',
        description: 'Admin will reassign this service request to another specialist.'
      });
      setDecliningId(null);
      setDeclineReason('');
      fetchRequests();
    } catch (err: any) {
      toast({
        title: 'Decline failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusUpdate = async (requestId: string, status: string) => {
    try {
      setActionLoading(requestId);
      await api.agreementProvider.updateStatus(requestId, status);
      toast({
        title: status === 'SERVICE_COMPLETED' ? '🎉 Service Completed' : 'Status Updated',
        description: `Service request status updated to ${status}. Customer has been notified.`
      });
      fetchRequests();
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border shadow-sm min-h-[200px] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-muted-foreground text-xs font-medium">Checking assigned agreement requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" /> Assigned Agreement Service Orders ({requests.length})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            On-demand service requests assigned to you by Admin under active customer agreements
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:bg-muted flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="p-12 text-center bg-card border rounded-2xl space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h4 className="font-bold text-sm text-foreground">No Pending Agreement Service Requests</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            When an admin assigns an agreement service request to your profile, it will appear here with 1-click acceptance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((sr) => {
            const isAssigned = sr.status === 'PROVIDER_ASSIGNED';
            const isAccepted = sr.status === 'PROVIDER_ACCEPTED';
            const isInProgress = sr.status === 'SERVICE_IN_PROGRESS';
            const isCompleted = ['SERVICE_COMPLETED', 'CUSTOMER_CONFIRMED', 'COMPLETED'].includes(sr.status);

            return (
              <div key={sr.requestId} className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm hover:border-primary/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-primary">{sr.requestId}</span>
                    <span className="text-xs text-muted-foreground">• Agreement: {sr.agreementId}</span>
                    <span className="text-xs text-muted-foreground">• {new Date(sr.createdAt).toLocaleDateString()}</span>
                  </div>

                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border self-start sm:self-auto ${
                    isAssigned ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse' :
                    isInProgress ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                    isCompleted ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                  }`}>
                    {sr.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-muted/30 p-3 rounded-xl">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Customer</span>
                    <span className="font-semibold text-foreground">{sr.customerName} ({sr.customerPhone || 'Contact available in Chat'})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Service Type</span>
                    <span className="font-semibold text-foreground">{sr.serviceType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Location</span>
                    <span className="font-semibold text-foreground">{sr.location || 'Tamil Nadu'}</span>
                  </div>
                </div>

                <p className="text-xs text-foreground bg-muted/20 p-3 rounded-xl border leading-relaxed">
                  <strong>Issue Description:</strong> {sr.description}
                </p>

                {sr.attachments && sr.attachments.length > 0 && (
                  <div className="flex items-center gap-2">
                    {sr.attachments.map((img: string, idx: number) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Attachment"
                        className="w-14 h-14 rounded-lg object-cover border"
                      />
                    ))}
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {sr.chatConversationId && (
                      <button
                        onClick={() => setActiveChatId(sr.requestId)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat with Customer
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isAssigned && (
                      <>
                        <button
                          onClick={() => setDecliningId(sr.requestId)}
                          disabled={actionLoading === sr.requestId}
                          className="px-3 py-1.5 rounded-lg border text-rose-600 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(sr.requestId)}
                          disabled={actionLoading === sr.requestId}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accept Request
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <button
                        onClick={() => handleStatusUpdate(sr.requestId, 'SERVICE_IN_PROGRESS')}
                        disabled={actionLoading === sr.requestId}
                        className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Start Service Work
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        onClick={() => handleStatusUpdate(sr.requestId, 'SERVICE_COMPLETED')}
                        disabled={actionLoading === sr.requestId}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-colors flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark Service Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Reason Modal */}
      {decliningId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h4 className="font-bold text-base text-foreground">Decline Service Request</h4>
            <p className="text-xs text-muted-foreground">
              Please state why you cannot fulfill this request so Admin can reassign appropriately.
            </p>

            <form onSubmit={handleDecline} className="space-y-4">
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Schedule conflict, out of service territory..."
                className="w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDecliningId(null)}
                  className="px-4 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeChatId && (
        <BookingChatModal
          bookingId={activeChatId}
          isOpen={!!activeChatId}
          onClose={() => setActiveChatId(null)}
        />
      )}
    </div>
  );
}
