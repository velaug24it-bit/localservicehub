import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface PricingFactor {
  name: string;
  multiplier: number;
  reason: string;
}

interface PricingResult {
  basePrice: number;
  finalPrice: number;
  totalMultiplier: number;
  surgeLevel: 'none' | 'low' | 'medium' | 'high';
  factors: PricingFactor[];
  demandStats: { recentBookings: number; availableProviders: number };
}

interface SmartPricingDisplayProps {
  category: string;
  location: string;
  serviceType: string;
  basePrice: number;
  date: string;
  time: string;
  onPriceCalculated?: (finalPrice: number) => void;
}

export default function SmartPricingDisplay({
  category, location, serviceType, basePrice, date, time, onPriceCalculated,
}: SmartPricingDisplayProps) {
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || !basePrice) return;
    const timer = setTimeout(() => fetchPricing(), 500);
    return () => clearTimeout(timer);
  }, [category, location, serviceType, basePrice, date, time]);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const data = await api.pricing.calculate({ category, location, serviceType, basePrice, date, time });
      setPricing(data);
      onPriceCalculated?.(data.finalPrice);
    } catch {
      setPricing(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-6 bg-muted rounded w-1/2" />
      </div>
    );
  }

  if (!pricing) return null;

  const surgeColors = {
    none: 'bg-success/10 text-success border-success/20',
    low: 'bg-success/10 text-success border-success/20',
    medium: 'bg-success/15 text-success border-success/30 font-medium',
    high: 'bg-success/20 text-success border-success/40 font-bold',
  };

  const surgeLabels = {
    none: 'Standard Rate',
    low: 'Slight Savings',
    medium: 'Great Discount',
    high: 'Super Saver Rate',
  };

  return (
    <div className={`rounded-xl border p-4 ${surgeColors[pricing.surgeLevel]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏷️</span>
          <span className="text-xs font-bold uppercase tracking-wide">Smart Pricing (Discounted)</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background/50 text-success">
          {surgeLabels[pricing.surgeLevel]}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        {pricing.totalMultiplier < 1 && (
          <span className="text-sm line-through opacity-60">₹{pricing.basePrice}</span>
        )}
        <span className="text-2xl font-display font-bold">₹{pricing.finalPrice}</span>
        {pricing.totalMultiplier < 1 && (
          <span className="text-xs font-medium text-success-foreground bg-success/20 px-2 py-0.5 rounded">
            ({Math.round((1 - pricing.totalMultiplier) * 100)}% OFF)
          </span>
        )}
      </div>

      {pricing.factors.length > 0 && (
        <div className="space-y-1.5">
          {pricing.factors.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                {f.name}
              </span>
              <span className="opacity-70">{f.reason}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-[10px] opacity-60">
        <span>📊 {pricing.demandStats.recentBookings} bookings this week</span>
        <span>👷 {pricing.demandStats.availableProviders} providers nearby</span>
      </div>
    </div>
  );
}
