import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Provider } from '@/data/providers';

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
  score: number;
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
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 5MB', variant: 'destructive' });
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
      toast({ title: 'Please upload a photo or describe the issue', variant: 'destructive' });
      return;
    }
    setStep('analyzing');
    try {
      console.log('Calling ai-diagnose...', { hasImage: !!imageBase64, hasDescription: !!description.trim() });
      const data = await api.ai.diagnose({ imageBase64, description: description.trim() });
      if (!data || !data.problem) throw new Error('Invalid response from AI');
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
      setMatches(data.matches || []);
      setStep('matched');
    } catch {
      // Fallback: filter locally by category
      const fallback = allProviders
        .filter(p => p.category === diagnosis.category)
        .slice(0, 5)
        .map(p => ({ id: p.id, name: p.name, score: 80, reason: `Available ${p.category} provider in ${p.location}` }));
      setMatches(fallback);
      setStep('matched');
    }
  };

  const severityColor: Record<string, string> = {
    low: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    high: 'bg-destructive/10 text-destructive',
    urgent: 'bg-destructive text-destructive-foreground',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-card-hover max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gradient-primary p-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-primary-foreground flex items-center gap-2">
                🧠 AI Problem Diagnosis
              </h3>
              <p className="text-sm text-primary-foreground/70">Upload a photo or describe your issue</p>
            </div>
            <button onClick={onClose} className="text-primary-foreground/70 hover:text-primary-foreground text-xl">✕</button>
          </div>
        </div>

        <div className="p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Problem" className="max-h-48 mx-auto rounded-lg object-cover" />
                ) : (
                  <>
                    <div className="text-4xl mb-2">📸</div>
                    <p className="text-sm font-medium text-foreground">Click to upload a photo</p>
                    <p className="text-xs text-muted-foreground mt-1">Take a photo of the issue (max 5MB)</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">OR describe the issue</span></div>
              </div>

              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. My kitchen sink is leaking from underneath, water pooling on floor..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              />

              <button
                onClick={handleAnalyze}
                disabled={!imageBase64 && !description.trim()}
                className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                🧠 Analyze with AI
              </button>
            </div>
          )}

          {/* Step: Analyzing */}
          {step === 'analyzing' && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="font-semibold text-foreground">AI is analyzing your problem...</p>
              <p className="text-sm text-muted-foreground">Detecting issue type, estimating cost, and finding best providers</p>
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && diagnosis && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🔍</div>
                <div className="flex-1">
                  <h4 className="font-display font-bold text-foreground text-lg">{diagnosis.problem}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityColor[diagnosis.severity] || 'bg-muted text-muted-foreground'}`}>
                      {diagnosis.severity.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                      {diagnosis.category}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{diagnosis.description}</p>

              <div className="bg-accent/50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">💰 Estimated Cost</p>
                  <p className="text-lg font-display font-bold gradient-text">
                    ₹{diagnosis.estimatedCost.min.toLocaleString()} — ₹{diagnosis.estimatedCost.max.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">🔧 Suggested Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.suggestedServices.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">⏰ Urgency</p>
                  <p className="text-sm text-muted-foreground">{diagnosis.urgency}</p>
                </div>
              </div>

              {diagnosis.tips.length > 0 && (
                <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-warning mb-2">⚠️ Safety Tips</p>
                  <ul className="space-y-1">
                    {diagnosis.tips.map((t, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span>•</span><span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleFindProviders}
                className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                🤖 AI Match Best Providers
              </button>
            </div>
          )}

          {/* Step: Matching */}
          {step === 'matching' && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="font-semibold text-foreground">Finding the best providers...</p>
              <p className="text-sm text-muted-foreground">Analyzing skills, ratings, distance, and availability</p>
            </div>
          )}

          {/* Step: Matched */}
          {step === 'matched' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏆</span>
                <h4 className="font-display font-bold text-foreground">AI-Recommended Providers</h4>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-3xl mb-2">😕</p>
                  <p className="text-sm">No matching providers found. Try broadening your search.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((m, i) => {
                    const provider = allProviders.find(p => p.id === m.id || p.name === m.name);
                    return (
                      <div key={m.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-card transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              i === 0 ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'
                            }`}>
                              {i === 0 ? '👑' : `#${i + 1}`}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">{m.name}</p>
                              <p className="text-xs text-muted-foreground">{m.reason}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-semibold text-primary">{m.score}% match</div>
                            <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${m.score}%` }} />
                            </div>
                          </div>
                        </div>
                        {provider && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">💰 {provider.priceRange}</span>
                            <button
                              onClick={() => { onBookProvider(provider); onClose(); }}
                              className="gradient-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                            >
                              Book Now
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => { setStep('upload'); setDiagnosis(null); setMatches([]); setImagePreview(null); setImageBase64(null); setDescription(''); }}
                className="w-full py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                🔄 Diagnose Another Problem
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
