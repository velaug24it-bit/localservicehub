import { useState } from 'react';

const faqs = [
  { q: 'How are service providers verified?', a: 'All providers undergo background checks, skill assessments, and document verification before being listed on ServiceHub. We also continuously monitor ratings and reviews.' },
  { q: 'What if I\'m not satisfied with the service?', a: 'We offer a 100% satisfaction guarantee. If you\'re unhappy with the service, contact us within 24 hours and we\'ll arrange a re-service or full refund.' },
  { q: 'How does live tracking work?', a: 'Once your booking is confirmed, you can track your service provider\'s progress in real-time through step-by-step updates — from confirmation to job completion.' },
  { q: 'What payment methods are accepted?', a: 'We accept UPI, credit/debit cards, net banking, and cash payments. Payment is collected after service completion for your safety.' },
  { q: 'Can I reschedule or cancel a booking?', a: 'Yes! You can reschedule or cancel any booking from the "My Bookings" section. Cancellations made 2+ hours before the scheduled time are free of charge.' },
  { q: 'Do you serve all areas in Tamil Nadu?', a: 'Yes, ServiceHub operates across all 38 districts of Tamil Nadu with a growing network of verified professionals.' },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">
          Frequently Asked <span className="gradient-text">Questions</span>
        </h2>
        <p className="text-muted-foreground">Everything you need to know about ServiceHub</p>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-card rounded-xl border border-border overflow-hidden transition-all hover:shadow-card">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
              <span className="font-medium text-foreground text-sm pr-4">{faq.q}</span>
              <span className={`text-muted-foreground text-lg shrink-0 transition-transform ${openIndex === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            {openIndex === i && (
              <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed animate-slide-up">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
