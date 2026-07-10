const badges = [
  { icon: '🛡️', label: '100% Verified Pros' },
  { icon: '💳', label: 'Secure Payments' },
  { icon: '🔒', label: 'Data Protected' },
  { icon: '🏆', label: 'Satisfaction Guarantee' },
  { icon: '⚡', label: 'Same-Day Service' },
  { icon: '📞', label: '24/7 Support' },
];

const TrustBadgesSection = () => (
  <section className="border-y border-border bg-muted/50 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {badges.map(b => (
          <div key={b.label} className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xl">{b.icon}</span>
            <span className="text-xs font-semibold uppercase tracking-wide">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustBadgesSection;
