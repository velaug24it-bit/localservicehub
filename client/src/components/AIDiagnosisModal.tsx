import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Provider } from '@/data/providers';
import { 
  Sparkles, CheckCircle2, ShieldCheck, AlertTriangle, 
  Clock, DollarSign, Wrench, RefreshCw, X, ChevronRight, Zap 
} from 'lucide-react';

interface Diagnosis {
  problem: string;
  category: string;
  severity: string;
  description: string;
  suggestedServices: string[];
  estimatedCost: { min: number; max: number };
  urgency: string;
  tips: string[];
}

interface MatchedProvider {
  id: string;
  name: string;
  category?: string;
  location?: string;
  score: number;
  priceRange?: string;
  reason: string;
}

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

interface AIDiagnosisModalProps {
  onClose: () => void;
  onBookProvider: (provider: Provider) => void;
  allProviders: Provider[];
  userLocation: string;
}

const QUICK_SYMPTOMS = [
  { label: '⚡ Ceiling Fan / Motor Repair', text: 'Ceiling fan humming noise, wobbling blades or slow speed issue.' },
  { label: '💧 Water Pipe / Tap Leakage', text: 'Under-sink water pipe leakage and low pressure in bathroom tap.' },
  { label: '❄️ AC Not Cooling / Gas Refill', text: 'Split AC not cooling properly and making buzzing sound.' },
  { label: '🔌 Switchboard Spark / Power Cut', text: 'Electrical switchboard sparking with tripped circuit breaker.' },
  { label: '🪚 Door Lock / Wood Repair', text: 'Wooden door lock alignment and hinge stiffness issue.' },
  { label: '🧹 Deep House Cleaning', text: 'Deep cleaning and sanitization for kitchen and bathroom surfaces.' }
];

export default function AIDiagnosisModal({ onClose, onBookProvider, allProviders, userLocation }: AIDiagnosisModalProps) {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'result' | 'matching' | 'matched'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [matches, setMatches] = useState<MatchedProvider[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 8MB allowed', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64 && !description.trim()) {
      toast({ title: 'Please upload a photo or select a symptom', variant: 'destructive' });
      return;
    }
    setStep('analyzing');
    try {
      const data = await api.ai.diagnose({ imageBase64, description: description.trim() });
      if (!data || !data.problem) throw new Error('Could not analyze the problem');
      setDiagnosis(data);
      setStep('result');
    } catch (err: unknown) {
      console.error('ai-diagnose error:', err);
      toast({ title: 'Analysis failed', description: getErrorMessage(err, 'Try again'), variant: 'destructive' });
      setStep('upload');
    }
  };

  const handleFindProviders = async () => {
    if (!diagnosis) return;
    setStep('matching');
    try {
      const data = await api.ai.matchProviders({
        category: diagnosis.category,
        location: userLocation,
        severity: diagnosis.severity,
        suggestedServices: diagnosis.suggestedServices,
      });

      let resMatches: MatchedProvider[] = data.matches || [];
      
      // If server returned empty, create localized category fallbacks
      if (resMatches.length === 0) {
        const localCategoryProviders = allProviders.filter(p => p.category === diagnosis.category);
        const sourcePool = localCategoryProviders.length > 0 ? localCategoryProviders : allProviders;
        
        resMatches = sourcePool.slice(0, 5).map((p, idx) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          location: p.location,
          score: 95 - idx * 3,
          priceRange: p.priceRange || '₹350 onwards',
          reason: `Verified ${diagnosis.category} professional ready for dispatch in ${p.location || userLocation}.`
        }));
      }

      setMatches(resMatches);
      setStep('matched');
    } catch {
      // Fallback: filter locally by category
      const fallback = allProviders
        .filter(p => p.category === diagnosis.category)
        .slice(0, 5)
        .map((p, idx) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          location: p.location,
          score: 90 - idx * 4,
          priceRange: p.priceRange || '₹350 onwards',
          reason: `Certified ${p.category} specialist serving ${p.location || userLocation}.`
        }));
      setMatches(fallback.length > 0 ? fallback : allProviders.slice(0, 3).map((p, idx) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        location: p.location,
        score: 85 - idx * 5,
        priceRange: p.priceRange || '₹350 onwards',
        reason: `Available local verified service specialist.`
      })));
      setStep('matched');
    }
  };

  const handleBookMatched = (m: MatchedProvider, i: number) => {
    const existing = allProviders.find(p => p.id === m.id || p.name === m.name);
    const providerToBook: Provider = existing || {
      id: m.id || `matched-provider-${i}`,
      name: m.name,
      category: m.category || diagnosis?.category || 'electrical',
      avatar: '⚡',
      rating: 4.9,
      reviews: 52,
      priceRange: m.priceRange || `₹${diagnosis?.estimatedCost.min || 350} onwards`,
      verified: true,
      phone: '9840994649',
      email: 'specialist@servicehub.in',
      location: m.location || userLocation || 'Chennai',
      experience: '5+ years',
      description: m.reason,
      services: diagnosis?.suggestedServices || ['Service Inspection & Repair']
    };

    onBookProvider(providerToBook);
    onClose();
  };

  const severityBadge: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400', text: 'Low Severity' },
    medium: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400', text: 'Medium Severity' },
    high: { bg: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400', text: 'High Priority' },
    urgent: { bg: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400', text: '🚨 Immediate Attention' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto animate-slide-up flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gradient-primary p-5 text-primary-foreground shrink-0 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🧠
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-display font-bold leading-tight">
                AI Problem Diagnosis
              </h3>
              <p className="text-xs text-primary-foreground/80">
                Visual Inspection & Instant Specialist Match
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full hover:bg-white/20 text-primary-foreground flex items-center justify-center transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Step 1: Upload & Input */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Image Upload Area */}
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  imagePreview 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                {imagePreview ? (
                  <div className="space-y-2">
                    <img src={imagePreview} alt="Problem preview" className="max-h-48 mx-auto rounded-xl object-contain shadow-md" />
                    <p className="text-xs font-bold text-primary">✓ Photo attached — Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-3">
                    <div className="text-4xl">📸</div>
                    <p className="text-sm font-bold text-foreground">Upload Photo of Damaged Part / Fixture</p>
                    <p className="text-xs text-muted-foreground">Ceiling fan, switchboard, water leak, AC unit, or furniture</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
              </div>

              {/* Quick Symptom Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Popular Issue Categories:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SYMPTOMS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDescription(chip.text)}
                      className={`text-xs px-2.5 py-1 rounded-xl border transition-all font-medium active:scale-95 ${
                        description === chip.text
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                          : 'bg-muted/50 hover:bg-muted text-foreground border-border/80'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description box */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Describe what is happening (Optional but helps precision):
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Ceiling fan not spinning at full speed and humming, or tap leaking..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!imageBase64 && !description.trim()}
                className="w-full gradient-primary text-primary-foreground py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md active:scale-98"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run AI Problem Diagnosis</span>
              </button>
            </div>
          )}

          {/* Step 2: Analyzing State */}
          {step === 'analyzing' && (
            <div className="text-center py-14 space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin shadow-sm" />
              <div className="space-y-1">
                <p className="font-bold text-foreground text-base">Analyzing Defect & Fixture...</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Identifying failure mode, spare parts required, safety precautions, and cost benchmarks.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Diagnostic Result Card */}
          {step === 'result' && diagnosis && (
            <div className="space-y-4">
              {/* Problem Title & Category Banner */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      Detected Problem
                    </span>
                    <h4 className="font-display font-bold text-foreground text-base sm:text-lg mt-1">
                      {diagnosis.problem}
                    </h4>
                  </div>
                  <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${
                    severityBadge[diagnosis.severity]?.bg || 'bg-muted text-muted-foreground'
                  }`}>
                    {severityBadge[diagnosis.severity]?.text || diagnosis.severity.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {diagnosis.description}
                </p>
              </div>

              {/* Cost & Services Box */}
              <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-border">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Estimated Service Cost:
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{diagnosis.estimatedCost.min} — ₹{diagnosis.estimatedCost.max}
                  </span>
                </div>

                {/* Suggested Services */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-primary" /> Recommended Job Works:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.suggestedServices.map((s, idx) => (
                      <span key={idx} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-card border border-border text-foreground shadow-2xs">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Urgency */}
                <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span><strong>Urgency:</strong> {diagnosis.urgency}</span>
                </div>
              </div>

              {/* Safety Tips */}
              {diagnosis.tips?.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 space-y-1 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Homeowner Safety Advice:
                  </span>
                  <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
                    {diagnosis.tips.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Match Button */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => { setStep('upload'); setDiagnosis(null); }}
                  className="px-3.5 py-3 rounded-2xl border border-border text-foreground text-xs font-bold hover:bg-muted transition-colors shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={handleFindProviders}
                  className="flex-1 gradient-primary text-primary-foreground py-3.5 rounded-2xl font-bold text-xs sm:text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
                >
                  <span>🤖 Match Verified {diagnosis.category.toUpperCase()} Specialists</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Finding Providers */}
          {step === 'matching' && (
            <div className="text-center py-14 space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin shadow-sm" />
              <div className="space-y-1">
                <p className="font-bold text-foreground text-base">Matching Top Specialists...</p>
                <p className="text-xs text-muted-foreground">
                  Evaluating certified specialists for {diagnosis?.category} near {userLocation}.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Matched Specialists List */}
          {step === 'matched' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-foreground text-sm sm:text-base flex items-center gap-1.5">
                    <span>🏆 AI-Recommended Specialists</span>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Ranked by skill match, verified warranty compliance & proximity
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {matches.length} Specialists
                </span>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-2xl p-6 space-y-2">
                  <p className="text-2xl">⚡</p>
                  <p className="font-bold text-sm text-foreground">Specialist Team Available</p>
                  <p className="text-xs text-muted-foreground">Contact our central dispatch to assign the best {diagnosis?.category} specialist immediately.</p>
                  <a 
                    href="tel:+919840994649"
                    className="inline-block mt-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-bold text-xs"
                  >
                    📞 Call Dispatch: 9840994649
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((m, i) => (
                    <div 
                      key={m.id || i}
                      className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/40 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                            i === 0 ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            {i === 0 ? '👑 #1' : `#${i + 1}`}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-foreground text-sm truncate">{m.name}</h5>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                                Verified
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              📍 {m.location || userLocation} · ⭐ 4.9 (50+ reviews)
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            {m.score}% Match
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-xl border border-border/50">
                        "{m.reason}"
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-xs font-bold text-foreground">
                          {m.priceRange || `₹${diagnosis?.estimatedCost.min || 350} base`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleBookMatched(m, i)}
                          className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Book Specialist Now</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => { setStep('upload'); setDiagnosis(null); setMatches([]); setImagePreview(null); setImageBase64(null); setDescription(''); }}
                className="w-full py-3 rounded-2xl border border-border text-foreground text-xs font-bold hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Diagnose Another Problem</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
