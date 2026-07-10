const steps = [
  { icon: '🔍', title: 'Search', desc: 'Browse verified providers by service and location' },
  { icon: '📅', title: 'Book', desc: 'Pick a date, time, and describe what you need' },
  { icon: '📍', title: 'Track', desc: 'Follow your provider in real-time, step by step' },
  { icon: '⭐', title: 'Review', desc: 'Rate your experience and help the community' },
];

const HowItWorksSection = () => (
  <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--secondary) / 0.08))' }}>
    {/* Decorative blobs */}
    <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-primary/5 blur-3xl" />
    <div className="absolute bottom-10 right-10 w-56 h-56 rounded-full bg-secondary/5 blur-3xl" />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
      <div className="text-center mb-14">
        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 tracking-wide uppercase">
          Simple Process
        </span>
        <h2 className="text-2xl sm:text-4xl font-display font-bold text-foreground mb-3">
          How It <span className="gradient-text">Works</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Get started in 4 simple steps</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connecting line - desktop */}
        <div className="hidden lg:block absolute top-12 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="relative flex flex-col items-center text-center animate-slide-up group" style={{ animationDelay: `${i * 0.15}s` }}>
              {/* Step connector dot on the line */}
              <div className="hidden lg:block absolute top-12 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-4 ring-background z-10" />

              {/* Icon container */}
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-4xl mb-6 shadow-glass group-hover:scale-110 transition-transform duration-300 relative">
                {s.icon}
                {/* Step number badge */}
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border-2 border-primary text-primary font-display font-bold text-xs flex items-center justify-center shadow-sm">
                  {i + 1}
                </div>
              </div>

              {/* Card */}
              <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-5 w-full hover:shadow-card hover:border-primary/30 transition-all duration-300 group-hover:-translate-y-1">
                <h3 className="font-display font-semibold text-foreground text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>

              {/* Arrow connector - mobile/tablet */}
              {i < steps.length - 1 && (
                <div className="lg:hidden flex justify-center my-2 text-primary/40">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
