import React, { useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, Wrench, UserCheck, CheckCircle2, 
  XCircle, Clock, AlertCircle, RefreshCw, Send, Eye, 
  Settings, Filter, Plus, Search, ChevronRight 
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import AgreementViewModal from '@/components/agreements/AgreementViewModal';

export default function AdminAgreementsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'agreements' | 'templates'>('requests');
  const [loading, setLoading] = useState(true);

  // Data states
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  // Assign modal state
  const [assigningRequest, setAssigningRequest] = useState<any>(null);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Template editor modal state
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    serviceCategory: '',
    durationMonths: 12,
    terms: '',
    warrantyRules: '',
    cancellationRules: '',
    paymentModel: 'additional_charge',
    isDefault: false
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Agreement viewer
  const [viewingAgreement, setViewingAgreement] = useState<any>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [reqsRes, agrsRes, tmplRes, provRes] = await Promise.all([
        api.agreementAdmin.listServiceRequests(),
        api.agreementAdmin.listAgreements(),
        api.agreementAdmin.listTemplates(),
        api.admin.providers.list()
      ]);
      setServiceRequests(reqsRes || []);
      setAgreements(agrsRes || []);
      setTemplates(tmplRes || []);
      setProviders(provRes || []);
    } catch (err: any) {
      toast({
        title: 'Error loading agreements data',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAssignProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || !assigningRequest) return;

    try {
      setAssignLoading(true);
      await api.agreementAdmin.assignProvider(assigningRequest.requestId, {
        providerId: selectedProviderId
      });
      toast({
        title: '✅ Provider Assigned',
        description: `Specialist assigned to request ${assigningRequest.requestId}. Provider and customer have been notified.`
      });
      setAssigningRequest(null);
      setSelectedProviderId('');
      loadAll();
    } catch (err: any) {
      toast({
        title: 'Assignment failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingTemplate(true);
      if (editingTemplate && editingTemplate._id) {
        await api.agreementAdmin.updateTemplate(editingTemplate._id, templateForm);
        toast({ title: 'Template Updated', description: 'Agreement template versioned successfully.' });
      } else {
        await api.agreementAdmin.createTemplate(templateForm);
        toast({ title: 'Template Created', description: 'New agreement template saved.' });
      }
      setEditingTemplate(null);
      loadAll();
    } catch (err: any) {
      toast({
        title: 'Failed to save template',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const openTemplateModal = (tmpl?: any) => {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setTemplateForm({
        name: tmpl.name || '',
        serviceCategory: tmpl.serviceCategory || '',
        durationMonths: tmpl.durationMonths || 12,
        terms: tmpl.terms || '',
        warrantyRules: tmpl.warrantyRules || '',
        cancellationRules: tmpl.cancellationRules || '',
        paymentModel: tmpl.paymentModel || 'additional_charge',
        isDefault: !!tmpl.isDefault
      });
    } else {
      setEditingTemplate({});
      setTemplateForm({
        name: '',
        serviceCategory: '',
        durationMonths: 12,
        terms: 'Standard 12-month post-booking service agreement with priority admin dispatch.',
        warrantyRules: 'Standard ServiceHub rework coverage applies.',
        cancellationRules: '7 days written notice with zero penalties.',
        paymentModel: 'additional_charge',
        isDefault: templates.length === 0
      });
    }
  };

  const pendingRequests = serviceRequests.filter(
    r => ['PENDING_ADMIN_ASSIGNMENT', 'PROVIDER_DECLINED'].includes(r.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Post-Booking Agreement & Dispatch Control
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin oversight for customer agreements, manual provider assignments, and agreement templates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Data
          </button>
        </div>
      </div>

      {/* Sub-nav Tabs */}
      <div className="flex rounded-xl bg-muted p-1 max-w-xl">
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'requests' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-amber-500" />
          <span>Pending Dispatch</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 bg-destructive text-destructive-foreground text-[10px] font-black rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('agreements')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'agreements' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-indigo-500" />
          <span>All Agreements ({agreements.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'templates' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-primary" />
          <span>Agreement Templates ({templates.length})</span>
        </button>
      </div>

      {/* ── 1. PENDING DISPATCH / SERVICE REQUESTS ── */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Service Requests Awaiting Admin Assignment ({serviceRequests.length})
            </h3>
          </div>

          {serviceRequests.length === 0 ? (
            <div className="p-12 text-center bg-card border rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-sm text-foreground">No Pending Service Requests</p>
              <p className="text-xs text-muted-foreground mt-1">
                All customer agreement requests have been assigned to certified specialists.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {serviceRequests.map((sr) => {
                const isPending = ['PENDING_ADMIN_ASSIGNMENT', 'PROVIDER_DECLINED'].includes(sr.status);
                return (
                  <div key={sr.requestId} className="p-5 rounded-2xl border bg-card space-y-3 shadow-sm hover:border-primary/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-primary">{sr.requestId}</span>
                        <span className="text-xs text-muted-foreground">• Agreement: {sr.agreementId}</span>
                        <span className="text-xs text-muted-foreground">• {new Date(sr.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                          isPending ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        }`}>
                          {sr.status}
                        </span>

                        {isPending && (
                          <button
                            onClick={() => {
                              setAssigningRequest(sr);
                              setSelectedProviderId(sr.originalProviderId || '');
                            }}
                            className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-95 flex items-center gap-1"
                          >
                            <UserCheck className="w-3 h-3" /> Assign Provider
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-muted/30 p-3 rounded-xl">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Customer</span>
                        <span className="font-semibold text-foreground">{sr.customerName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Service Type</span>
                        <span className="font-semibold text-foreground">{sr.serviceType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Assigned Provider</span>
                        <span className="font-semibold text-foreground">{sr.assignedProviderName || 'None (Pending Admin)'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-foreground bg-muted/20 p-3 rounded-xl border leading-relaxed">
                      <strong>Issue Details:</strong> {sr.description}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 2. ALL AGREEMENTS ── */}
      {activeSubTab === 'agreements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">
              Customer Service Agreements Database ({agreements.length})
            </h3>
          </div>

          <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-4 py-3">Agreement ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service / Category</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {agreements.map((agr) => (
                  <tr key={agr.agreementId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{agr.agreementId}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{agr.customerName}</td>
                    <td className="px-4 py-3">{agr.serviceType}</td>
                    <td className="px-4 py-3 text-muted-foreground">{agr.providerName}</td>
                    <td className="px-4 py-3">{agr.durationMonths || 12} Mos</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        agr.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {agr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewingAgreement(agr)}
                        className="px-2.5 py-1 rounded-md border text-[11px] font-semibold hover:bg-muted inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. AGREEMENT TEMPLATES ── */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">
              Configurable Agreement Templates ({templates.length})
            </h3>
            <button
              onClick={() => openTemplateModal()}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div key={tmpl._id} className="p-5 rounded-2xl border bg-card space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{tmpl.name}</h4>
                    <p className="text-xs text-muted-foreground">Version {tmpl.version || 1} • {tmpl.durationMonths || 12} Months</p>
                  </div>
                  {tmpl.isDefault && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                      Default Template
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/20 p-2.5 rounded-lg">
                  {tmpl.terms}
                </p>

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-muted-foreground">
                    Model: <strong>{tmpl.paymentModel}</strong>
                  </span>
                  <button
                    onClick={() => openTemplateModal(tmpl)}
                    className="text-primary font-bold hover:underline"
                  >
                    Edit Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Provider Modal */}
      {assigningRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" /> Assign Certified Specialist
            </h3>
            <p className="text-xs text-muted-foreground">
              Assign a provider to service request <strong>{assigningRequest.requestId}</strong> ({assigningRequest.serviceType}).
            </p>

            <form onSubmit={handleAssignProvider} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Select Service Provider</label>
                <select
                  required
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- Choose Provider --</option>
                  {providers
                    .filter((p: any) => p.userType === 'provider')
                    .map((p: any) => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.name} ({p.location || 'Tamil Nadu'}) • {p.phone || 'No phone'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningRequest(null)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedProviderId || assignLoading}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow disabled:opacity-50"
                >
                  {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <h3 className="font-bold text-base text-foreground">
              {editingTemplate._id ? 'Edit Agreement Template' : 'Create New Agreement Template'}
            </h3>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Template Name</label>
                <input
                  type="text"
                  required
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Standard 12-Month AC Care Agreement"
                  className="w-full px-3 py-2 bg-background border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Service Category</label>
                  <input
                    type="text"
                    value={templateForm.serviceCategory}
                    onChange={(e) => setTemplateForm({ ...templateForm, serviceCategory: e.target.value })}
                    placeholder="e.g. Electrical / All"
                    className="w-full px-3 py-2 bg-background border rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={templateForm.durationMonths}
                    onChange={(e) => setTemplateForm({ ...templateForm, durationMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Terms & Conditions</label>
                <textarea
                  rows={4}
                  required
                  value={templateForm.terms}
                  onChange={(e) => setTemplateForm({ ...templateForm, terms: e.target.value })}
                  className="w-full px-3 py-2 bg-background border rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Payment Model</label>
                <select
                  value={templateForm.paymentModel}
                  onChange={(e) => setTemplateForm({ ...templateForm, paymentModel: e.target.value })}
                  className="w-full px-3 py-2 bg-background border rounded-lg"
                >
                  <option value="additional_charge">Standard Service Charge Per Request</option>
                  <option value="covered">100% Free / Fully Covered by Agreement</option>
                  <option value="inspection_fee">Inspection Fee Only</option>
                  <option value="material_charge">Materials Only (Labor Covered)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={templateForm.isDefault}
                  onChange={(e) => setTemplateForm({ ...templateForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="font-bold text-foreground">Set as default template for all new agreements</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 font-medium text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow disabled:opacity-50"
                >
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {viewingAgreement && (
        <AgreementViewModal
          agreement={viewingAgreement}
          isOpen={!!viewingAgreement}
          onClose={() => setViewingAgreement(null)}
        />
      )}
    </div>
  );
}
