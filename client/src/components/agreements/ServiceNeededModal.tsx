import React, { useState } from 'react';
import { 
  X, Wrench, Upload, Image as ImageIcon, Send, 
  AlertCircle, CheckCircle2, ShieldCheck, Camera 
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface ServiceNeededModalProps {
  agreement: any;
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted: (newRequest: any) => void;
}

export default function ServiceNeededModal({ agreement, isOpen, onClose, onRequestSubmitted }: ServiceNeededModalProps) {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !agreement) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 5MB limit.`,
          variant: 'destructive'
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setPhotos(prev => [...prev, uploadEvent.target!.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please describe what service you need.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.agreements.createServiceRequest(agreement.agreementId, {
        description: description.trim(),
        attachments: photos
      });

      toast({
        title: '✅ Service Request Created',
        description: `Request ${res.requestId} has been submitted for Admin provider assignment.`
      });
      onRequestSubmitted(res);
      setDescription('');
      setPhotos([]);
      onClose();
    } catch (err: any) {
      toast({
        title: 'Submission failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Request Service Under Agreement</h3>
              <p className="text-xs text-muted-foreground">ID: {agreement.agreementId} • {agreement.serviceType}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
          {/* Agreement Badge */}
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Active Agreement Protection Valid
            </div>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {agreement.category || agreement.serviceType}
            </span>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              What service or issue do you need assistance with? *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. AC cooling unit needs gas refill inspection, slight water leakage from the indoor drain pipe..."
              className="w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/60"
            />
            <p className="text-[11px] text-muted-foreground">
              Be as specific as possible so admin can assign the best-matched specialist.
            </p>
          </div>

          {/* Photo Attachments */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Optional Photos of the Issue (Max 3)</span>
              <span className="text-[11px] text-muted-foreground">{photos.length}/3 photos</span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              {photos.map((p, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl border overflow-hidden group">
                  <img src={p} alt="Attachment" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photos.length < 3 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-muted-foreground hover:text-primary">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Dispatch Notice */}
          <div className="p-3 bg-muted/40 rounded-xl border text-xs text-muted-foreground space-y-1">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Admin Assignment & Scheduling
            </div>
            <p className="leading-relaxed text-[11px]">
              Upon submission, ServiceHub admins will review your request and assign a qualified provider in your area. You can track progress and chat with your assigned provider once accepted.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-95 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting...' : 'Submit Service Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
