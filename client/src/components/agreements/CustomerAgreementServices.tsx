import React, { useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, Wrench, MessageSquare, CheckCircle2, 
  Clock, AlertCircle, Sparkles, ArrowRight, Eye, RefreshCw, 
  Send, ChevronRight, UserCheck 
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import AgreementSignModal from './AgreementSignModal';
import AgreementViewModal from './AgreementViewModal';
import ServiceNeededModal from './ServiceNeededModal';
import BookingChatModal from '@/components/chat/BookingChatModal';

export default function CustomerAgreementServices() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected modals
  const [signingAgreement, setSigningAgreement] = useState<any>(null);
  const [viewingAgreement, setViewingAgreement] = useState<any>(null);
  const [serviceNeededAgreement, setServiceNeededAgreement] = useState<any>(null);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);

  // Request lists per agreement
  const [expandedAgreementId, setExpandedAgreementId] = useState<string | null>(null);
  const [agreementRequests, setAgreementRequests] = useState<{ [id: string]: any[] }>({});
  const [loadingRequests, setLoadingRequests] = useState(false);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      const res = await api.agreements.getMy();
      setAgreements(res || []);
      if (res && res.length > 0 && !expandedAgreementId) {
        setExpandedAgreementId(res[0].agreementId);
        fetchRequests(res[0].agreementId);
      }
    } catch (err: any) {
      toast({
        title: 'Error loading agreements',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async (agreementId: string) => {
    try {
      setLoadingRequests(true);
      const res = await api.agreements.getServiceRequests(agreementId);
      setAgreementRequests(prev => ({ ...prev, [agreementId]: res || [] }));
    } catch (err: any) {
      console.error('Error fetching service requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  const handleConfirmCompletion = async (requestId: string, agreementId: string) => {
    try {
      await api.agreements.confirmCompletion(requestId);
      toast({
        title: '🎉 Service Confirmed!',
        description: 'Thank you for confirming completion of this service request.'
      });
      fetchRequests(agreementId);
    } catch (err: any) {
      toast({
        title: 'Confirmation failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'PENDING_SIGNATURE':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'EXPIRED':
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getRequestStepStatus = (status: string) => {
    switch (status) {
      case 'PENDING_ADMIN_ASSIGNMENT':
        return { label: 'Admin Dispatching Specialist', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'PROVIDER_ASSIGNED':
        return { label: 'Provider Assigned • Pending Acceptance', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
      case 'PROVIDER_ACCEPTED':
        return { label: 'Provider Accepted • Scheduled', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
      case 'PROVIDER_DECLINED':
        return { label: 'Provider Declined • Reassigning', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
      case 'SERVICE_IN_PROGRESS':
        return { label: 'Service In Progress', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
      case 'SERVICE_COMPLETED':
        return { label: 'Completed • Awaiting Your Confirmation', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 animate-pulse' };
      case 'COMPLETED':
      case 'CUSTOMER_CONFIRMED':
        return { label: 'Completed & Confirmed', color: 'text-emerald-600 bg-emerald-500/15 border-emerald-500/30' };
      default:
        return { label: status, color: 'text-muted-foreground bg-muted' };
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border shadow-sm min-h-[250px] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-muted-foreground text-xs font-medium">Loading your post-service agreements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-500/30 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-400/20 uppercase tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" /> 12-Month Post-Service Agreements
          </div>
          <h2 className="text-xl md:text-2xl font-bold">Your Agreement Coverage & Services</h2>
          <p className="text-xs text-indigo-200/80 max-w-xl">
            Submit 1-click on-demand service requests under your active agreements with certified admin specialist dispatch.
          </p>
        </div>

        <button
          onClick={fetchAgreements}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Agreements
        </button>
      </div>

      {agreements.length === 0 ? (
        <div className="p-10 text-center bg-card border rounded-2xl shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">No Service Agreements Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            When you complete a booking on ServiceHub, you can activate a 12-month post-booking service agreement to unlock guaranteed priority dispatch and ongoing coverage.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agreement List Sidebar */}
          <div className="space-y-3 lg:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Active Agreements ({agreements.length})
            </h3>

            {agreements.map((agr) => {
              const isSelected = expandedAgreementId === agr.agreementId;
              const isActive = agr.status === 'ACTIVE';
              return (
                <div
                  key={agr.agreementId}
                  onClick={() => {
                    setExpandedAgreementId(agr.agreementId);
                    fetchRequests(agr.agreementId);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-card border-primary shadow-md ring-1 ring-primary'
                      : 'bg-card/60 hover:bg-card border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-muted-foreground">
                      {agr.agreementId}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(agr.status)}`}>
                      {agr.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-foreground">{agr.serviceType}</h4>
                    <p className="text-xs text-muted-foreground">{agr.category} • Provider: {agr.providerName}</p>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t">
                    <span>
                      {agr.endDate ? `Valid till ${new Date(agr.endDate).toLocaleDateString()}` : 'Pending Signature'}
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-primary' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agreement Details & Requests Panel */}
          <div className="lg:col-span-2 space-y-6">
            {expandedAgreementId && (() => {
              const currentAgr = agreements.find(a => a.agreementId === expandedAgreementId);
              if (!currentAgr) return null;
              const reqs = agreementRequests[currentAgr.agreementId] || [];
              const isActive = currentAgr.status === 'ACTIVE';
              const isPendingSign = currentAgr.status === 'PENDING_SIGNATURE';

              return (
                <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Banner */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-foreground">{currentAgr.serviceType}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(currentAgr.status)}`}>
                          {currentAgr.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {currentAgr.agreementId} • Original Booking: {currentAgr.trackingId || currentAgr.bookingId}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setViewingAgreement(currentAgr)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Certificate
                      </button>

                      {isPendingSign && (
                        <button
                          onClick={() => setSigningAgreement(currentAgr)}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow hover:opacity-95 flex items-center gap-1.5 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> Sign Agreement Now
                        </button>
                      )}

                      {isActive && (
                        <button
                          onClick={() => setServiceNeededAgreement(currentAgr)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow hover:opacity-95 flex items-center gap-1.5 transition-all"
                        >
                          <Wrench className="w-3.5 h-3.5" /> Request Service Needed
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Coverage Details Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Duration</span>
                      <span className="font-bold text-foreground">{currentAgr.durationMonths || 12} Months</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Assigned Specialist</span>
                      <span className="font-bold text-foreground">{currentAgr.providerName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Valid Until</span>
                      <span className="font-bold text-foreground">
                        {currentAgr.endDate ? new Date(currentAgr.endDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Requests Submitted</span>
                      <span className="font-bold text-foreground">{reqs.length}</span>
                    </div>
                  </div>

                  {/* Service Requests Under This Agreement */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-primary" /> Service Requests Under This Agreement
                      </h4>
                      {isActive && (
                        <button
                          onClick={() => setServiceNeededAgreement(currentAgr)}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          + New Request
                        </button>
                      )}
                    </div>

                    {loadingRequests ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">Loading service requests...</div>
                    ) : reqs.length === 0 ? (
                      <div className="p-6 text-center border-2 border-dashed rounded-xl space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          No service requests submitted yet under this agreement.
                        </p>
                        {isActive && (
                          <button
                            onClick={() => setServiceNeededAgreement(currentAgr)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                          >
                            Submit First Service Request
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reqs.map((sr: any) => {
                          const step = getRequestStepStatus(sr.status);
                          return (
                            <div key={sr.requestId} className="p-4 rounded-xl border bg-card space-y-3 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-primary">{sr.requestId}</span>
                                    <span className="text-xs text-muted-foreground">• {new Date(sr.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="text-xs font-semibold text-foreground">{sr.serviceType}</div>
                                </div>
                                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${step.color} self-start sm:self-auto`}>
                                  {step.label}
                                </span>
                              </div>

                              <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                                {sr.description}
                              </p>

                              {/* Photo attachments */}
                              {sr.attachments && sr.attachments.length > 0 && (
                                <div className="flex items-center gap-2 pt-1">
                                  {sr.attachments.map((img: string, idx: number) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt="Issue attachment"
                                      className="w-12 h-12 rounded-lg object-cover border"
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Assigned Provider info */}
                              {sr.assignedProviderName && (
                                <div className="text-xs flex items-center justify-between text-muted-foreground pt-1 border-t">
                                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    Assigned Specialist: {sr.assignedProviderName}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    {sr.chatConversationId && (
                                      <button
                                        onClick={() => setChatRequestId(sr.requestId)}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                                      >
                                        <MessageSquare className="w-3 h-3" /> Chat
                                      </button>
                                    )}

                                    {sr.status === 'SERVICE_COMPLETED' && (
                                      <button
                                        onClick={() => handleConfirmCompletion(sr.requestId, currentAgr.agreementId)}
                                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Done
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modals */}
      {signingAgreement && (
        <AgreementSignModal
          agreement={signingAgreement}
          isOpen={!!signingAgreement}
          onClose={() => setSigningAgreement(null)}
          onSignedSuccess={(updated) => {
            fetchAgreements();
            setSigningAgreement(null);
          }}
        />
      )}

      {viewingAgreement && (
        <AgreementViewModal
          agreement={viewingAgreement}
          isOpen={!!viewingAgreement}
          onClose={() => setViewingAgreement(null)}
        />
      )}

      {serviceNeededAgreement && (
        <ServiceNeededModal
          agreement={serviceNeededAgreement}
          isOpen={!!serviceNeededAgreement}
          onClose={() => setServiceNeededAgreement(null)}
          onRequestSubmitted={(newReq) => {
            if (expandedAgreementId) {
              fetchRequests(expandedAgreementId);
            }
          }}
        />
      )}

      {chatRequestId && (
        <BookingChatModal
          bookingId={chatRequestId}
          isOpen={!!chatRequestId}
          onClose={() => setChatRequestId(null)}
        />
      )}
    </div>
  );
}
