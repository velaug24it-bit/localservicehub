import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, ShieldCheck, FileText, PenTool, Type, 
  AlertCircle, Lock, Sparkles, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface AgreementSignModalProps {
  agreement: any;
  isOpen: boolean;
  onClose: () => void;
  onSignedSuccess: (signedAgreement: any) => void;
}

export default function AgreementSignModal({ agreement, isOpen, onClose, onSignedSuccess }: AgreementSignModalProps) {
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed'>('drawn');
  const [typedName, setTypedName] = useState(agreement?.customerName || '');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && agreement?.customerName) {
      setTypedName(agreement.customerName);
    }
  }, [isOpen, agreement]);

  // Canvas setup
  useEffect(() => {
    if (!isOpen || signatureType !== 'drawn') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e1b4b'; // dark indigo
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOpen, signatureType]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e) e.stopPropagation();
    setIsDrawing(false);
  };

  const clearCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!consent) {
      toast({
        title: 'Consent Required',
        description: 'Please review and accept the agreement terms to proceed.',
        variant: 'destructive'
      });
      return;
    }

    let signatureData = '';
    if (signatureType === 'drawn') {
      if (!hasDrawn || !canvasRef.current) {
        toast({
          title: 'Signature Missing',
          description: 'Please draw your signature in the signature box.',
          variant: 'destructive'
        });
        return;
      }
      signatureData = canvasRef.current.toDataURL('image/png');
    } else {
      if (!typedName.trim()) {
        toast({
          title: 'Name Required',
          description: 'Please type your full legal name.',
          variant: 'destructive'
        });
        return;
      }
      signatureData = typedName.trim();
    }

    try {
      setIsSubmitting(true);
      const res = await api.agreements.sign(agreement.agreementId, {
        fullName: typedName.trim() || agreement.customerName,
        signatureType,
        signatureData,
        consent: true
      });

      toast({
        title: '🎉 Agreement Activated!',
        description: `Service Agreement ${agreement.agreementId} is now active for 12 months.`
      });
      onSignedSuccess(res.agreement);
      onClose();
    } catch (err: any) {
      toast({
        title: 'Signing failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !agreement) return null;

  const snapshot = agreement.templateSnapshot || {};

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-card border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Sign Service Agreement
              </h3>
              <p className="text-xs text-muted-foreground">ID: {agreement.agreementId} • 12-Month Coverage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Agreement Scope Summary */}
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                Agreement Scope
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                Category: {agreement.category || agreement.serviceType}
              </span>
            </div>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
              {snapshot.terms || 'This agreement entitles the customer to submit service requests for this category over the next 12 months with verified specialist assignment and guaranteed dispute arbitration.'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-indigo-900 dark:text-indigo-200">
              <div><strong>Customer:</strong> {agreement.customerName}</div>
              <div><strong>Original Provider:</strong> {agreement.providerName}</div>
              <div><strong>Service Type:</strong> {agreement.serviceType}</div>
              <div><strong>Duration:</strong> {agreement.durationMonths || 12} Months</div>
            </div>
          </div>

          {/* Key Legal Terms Snapshot */}
          <div className="space-y-2 text-xs text-muted-foreground border rounded-xl p-4 bg-muted/20">
            <h5 className="font-bold text-foreground">Summary of Terms & Obligations:</h5>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Customer Rights:</strong> Submit on-demand "Service Needed" requests anytime during the 12-month active period.</li>
              <li><strong>Provider Assignment:</strong> ServiceHub admin assigns certified specialists per request based on location & availability.</li>
              <li><strong>Workmanship Warranty:</strong> Every completed request under this agreement includes quality assurance rework coverage.</li>
              <li><strong>Cancellation:</strong> Either party may cancel with 7 days written notice with zero penalty fees.</li>
            </ul>
          </div>

          {/* Signature Capture Pad */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" /> Digital Legal Signature
              </label>
              <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSignatureType('drawn');
                  }}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                    signatureType === 'drawn' ? 'bg-card shadow-sm text-foreground font-bold' : 'text-muted-foreground'
                  }`}
                >
                  <PenTool className="w-3 h-3" /> Draw Signature
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSignatureType('typed');
                  }}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                    signatureType === 'typed' ? 'bg-card shadow-sm text-foreground font-bold' : 'text-muted-foreground'
                  }`}
                >
                  <Type className="w-3 h-3" /> Type Full Name
                </button>
              </div>
            </div>

            {signatureType === 'drawn' ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="relative border-2 border-dashed border-primary/40 rounded-xl bg-white overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[140px] cursor-crosshair touch-none select-none block"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
                      ✍️ Draw your signature here using mouse or finger
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Sign with mouse or touch screen</span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Clear & Redraw
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Type your full legal name"
                  className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                />
                {typedName && (
                  <div className="p-4 bg-muted/40 rounded-xl border text-center">
                    <span className="text-2xl font-serif italic text-indigo-950 dark:text-indigo-300 font-bold tracking-wider">
                      {typedName}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Consent Checkbox */}
          <label 
            className="flex items-start gap-3 p-3 rounded-xl border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
            />
            <span className="text-xs text-foreground leading-relaxed">
              I, <strong>{typedName || agreement.customerName}</strong>, hereby agree and consent to the ServiceHub Post-Booking Service Agreement terms. I certify that this electronic signature is binding and legally authorized by me.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSign}
            disabled={!consent || isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-95 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Verifying & Activating...' : 'Legally Sign & Activate Agreement'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
