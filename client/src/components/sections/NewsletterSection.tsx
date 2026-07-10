import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.newsletter.subscribe(email.trim());
      toast({ title: '🎉 Subscribed!', description: "You'll receive our best deals and updates." });
      setEmail('');
    } catch (err: any) {
      if (err.message && err.message.includes('already subscribed')) {
        toast({ title: '📬 Already subscribed!', description: 'This email is already on our list.' });
      } else {
        toast({ title: 'Error', description: 'Failed to subscribe. Please try again.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-16" style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="text-3xl mb-3">📬</div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Stay Updated</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Get exclusive offers, new provider alerts, and service tips delivered to your inbox.
        </p>
        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email" required placeholder="Enter your email" value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          <button type="submit" disabled={loading} className="gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-3">No spam, unsubscribe anytime.</p>
      </div>
    </section>
  );
};

export default NewsletterSection;
