import { useState } from 'react';

const testimonials = [
  {
    id: 1, name: 'Rajesh Kumar', location: 'Chennai', avatar: '👨',
    rating: 5, category: 'Plumbing',
    review: 'Found an amazing plumber through ServiceHub. The live tracking feature is a game-changer! The provider arrived on time and fixed everything perfectly.',
    date: '2 weeks ago',
  },
  {
    id: 2, name: 'Priya Sharma', location: 'Coimbatore', avatar: '👩',
    rating: 5, category: 'Cleaning',
    review: 'Booked a deep cleaning service for my apartment. The team was professional, thorough, and left my place spotless. Highly recommend!',
    date: '1 week ago',
  },
  {
    id: 3, name: 'Karthik Rajan', location: 'Madurai', avatar: '👨',
    rating: 4, category: 'Electrical',
    review: 'Quick response for an electrical emergency. The electrician was knowledgeable and fixed the wiring issue safely. Great service!',
    date: '3 days ago',
  },
  {
    id: 4, name: 'Lakshmi Devi', location: 'Tiruchirappalli', avatar: '👩',
    rating: 5, category: 'HVAC',
    review: 'My AC was repaired same day! The technician explained everything clearly and the pricing was very transparent. Will use again.',
    date: '5 days ago',
  },
  {
    id: 5, name: 'Suresh Babu', location: 'Salem', avatar: '👨',
    rating: 4, category: 'Handyman',
    review: 'Got multiple small repairs done in one visit. The handyman was skilled and efficient. Fair pricing and great communication.',
    date: '1 month ago',
  },
  {
    id: 6, name: 'Anitha Mohan', location: 'Erode', avatar: '👩',
    rating: 5, category: 'Landscaping',
    review: 'Transformed my garden completely! The landscaper had creative ideas and executed them beautifully. My neighbors are jealous!',
    date: '2 weeks ago',
  },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <span key={star} className={`text-sm ${star <= rating ? 'text-warning' : 'text-border'}`}>★</span>
    ))}
  </div>
);

const ReviewsSection = () => {
  const [visibleCount, setVisibleCount] = useState(3);
  const visible = testimonials.slice(0, visibleCount);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">
          What Our <span className="gradient-text">Customers</span> Say
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Real reviews from verified customers across Tamil Nadu
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="flex gap-0.5 text-lg">
            {[1, 2, 3, 4, 5].map(s => <span key={s} className="text-warning">★</span>)}
          </div>
          <span className="font-display font-bold text-foreground text-lg">4.8</span>
          <span className="text-muted-foreground text-sm">from 2,000+ reviews</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((t, i) => (
          <div
            key={t.id}
            className="bg-card rounded-xl border border-border p-6 hover:-translate-y-1 hover:shadow-card-hover transition-all animate-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-lg">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">📍 {t.location}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px] font-medium">
                {t.category}
              </span>
            </div>
            <StarRating rating={t.rating} />
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">"{t.review}"</p>
            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              🕐 {t.date}
            </div>
          </div>
        ))}
      </div>

      {visibleCount < testimonials.length && (
        <div className="text-center mt-8">
          <button
            onClick={() => setVisibleCount(testimonials.length)}
            className="px-6 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors text-sm"
          >
            Show All Reviews ({testimonials.length - visibleCount} more)
          </button>
        </div>
      )}
    </section>
  );
};

export default ReviewsSection;
