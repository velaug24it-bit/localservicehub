import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale, ShieldAlert, BookOpen } from 'lucide-react';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </button>
          <span className="text-lg font-display font-bold gradient-text">ServiceHub Legal</span>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 py-12 px-4 max-w-4xl mx-auto w-full space-y-8">
        <div className="space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight">
            Terms &amp; <span className="gradient-text">Conditions</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Last Updated: July 17, 2026</p>
        </div>

        {/* Warning Alert */}
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 flex gap-3 text-sm text-warning-foreground leading-relaxed">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <strong>Important Legal Notice:</strong> Please read these terms carefully before using ServiceHub. By booking a provider or joining as a service provider, you agree to be bound by these Terms &amp; Conditions and our Privacy Policy.
          </div>
        </div>

        {/* Sections */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          
          {/* Section 1 */}
          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">1</span>
              The ServiceHub Platform
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ServiceHub acts as an online marketplace connecting consumers looking for home utility and repair services (&quot;Customers&quot;) with verified independent professionals (&quot;Providers&quot;) across Tamil Nadu's 38 districts. ServiceHub does not employ providers and is not responsible for the performance or quality of service rendered by providers.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2.5 border-t border-border/60 pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">2</span>
              Customer Obligations &amp; Booking Rules
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When booking a service, Customers must provide accurate phone numbers, detailed service descriptions, and valid physical addresses. Booking requests are accepted based on provider availability.
            </p>
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5">
              <li>Customers must pay a platform advance booking fee of ₹50 online to confirm booking slots.</li>
              <li>Customers must pay the remaining service amount directly to the Provider upon successful completion of work.</li>
              <li>Customers are required to provide a safe and reasonable work space for the Providers.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2.5 border-t border-border/60 pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">3</span>
              Provider Pricing &amp; Commission terms
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Service Providers are independent business entities. They are free to set their own pricing catalog through the Provider dashboard based on service items, quantity metrics, and specific work types.
            </p>
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5">
              <li>Providers receive bookings at their published rates. Providers must keep pricing listings updated and accurate.</li>
              <li>Platform charges providers a commission of 10% on earnings exceeding specific settlement thresholds.</li>
              <li>Profiles must be reactivated periodically by paying platform dues to remain visible to clients and search indexes.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2.5 border-t border-border/60 pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">4</span>
              Cancellation &amp; Refund Policies
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Service bookings can be cancelled by both Customers and Providers under reasonable circumstances before work commencement.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The online paid platform booking fee (₹50) is non-refundable if the customer cancels the booking within 2 hours of the scheduled time. If the provider cancels or fails to show up, the booking fee is credited back or re-assigned to a new provider slot.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2.5 border-t border-border/60 pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">5</span>
              Limitation of Liability
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ServiceHub is not liable for direct, indirect, incidental, or consequential damages resulting from any service provided by independent professionals. All disputes regarding work quality, safety, or delays must be resolved directly between the Customer and the Provider.
            </p>
          </section>

        </div>

        {/* Helpful Contact Box */}
        <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
          <BookOpen className="w-5 h-5 text-muted-foreground mx-auto" />
          <h4 className="font-semibold text-foreground text-sm">Have queries about these terms?</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            If you need clarification regarding any legal guidelines, contact our support team at <a href="mailto:velr012006@gmail.com" className="text-primary hover:underline">velr012006@gmail.com</a>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ServiceHub. All rights reserved.
      </footer>
    </div>
  );
}
