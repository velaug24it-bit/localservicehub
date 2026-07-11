import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Provider } from '@/data/providers';

interface DbService {
  name: string;
  price: string;
}

export function useDbProviders() {
  const [dbProviders, setDbProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.providers.list();
        if (data) {
          setDbProviders(
            data
              .filter((p: any) => p.services && p.services.length > 0)
              .map((p: any) => {
                const svcs = p.services || [];
                const priceValues = svcs.map((s: DbService) => parseInt(s.price)).filter((n: number) => !isNaN(n));
                const minPrice = priceValues.length ? Math.min(...priceValues) : 500;
                const maxPrice = priceValues.length ? Math.max(...priceValues) : 1500;

                // Deduce category from services
                let category = 'handyman';
                const firstSvc = svcs[0]?.name.toLowerCase() || '';
                if (firstSvc.includes('pipe') || firstSvc.includes('plumb') || firstSvc.includes('leak') || firstSvc.includes('drain')) category = 'plumbing';
                else if (firstSvc.includes('wire') || firstSvc.includes('light') || firstSvc.includes('electric') || firstSvc.includes('power')) category = 'electrical';
                else if (firstSvc.includes('clean') || firstSvc.includes('wash') || firstSvc.includes('dust')) category = 'cleaning';
                else if (firstSvc.includes('ac') || firstSvc.includes('hvac') || firstSvc.includes('cool') || firstSvc.includes('heat')) category = 'hvac';
                else if (firstSvc.includes('garden') || firstSvc.includes('lawn') || firstSvc.includes('trim') || firstSvc.includes('plant') || firstSvc.includes('landscap')) category = 'landscaping';

                const categoryAvatars: Record<string, string> = {
                  plumbing: '👨‍🔧',
                  electrical: '⚡',
                  cleaning: '🧹',
                  hvac: '❄️',
                  handyman: '🔨',
                  landscaping: '🌿',
                };

                return {
                  id: p.id,
                  name: p.name || 'Provider',
                  category,
                  avatar: categoryAvatars[category] || '👷',
                  rating: p.rating ?? 4.5,
                  reviews: p.reviewsCount ?? 0,
                  services: svcs.map((s: DbService) => s.name),
                  priceRange: `₹${minPrice} - ₹${maxPrice}`,
                  verified: true,
                  location: p.location || 'Chennai',
                  experience: 'Verified Provider',
                  description: `Professional service provider in ${p.location || 'Chennai'}. Book now for quality service.`,
                  phone: p.phone || '',
                  email: p.email || '',
                  availability: p.availability,
                };
              })
          );
        }
      } catch (err) {
        console.error('Failed to load database providers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { dbProviders, loading };
}
