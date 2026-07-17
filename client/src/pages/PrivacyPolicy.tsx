import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Lock, Eye } from 'lucide-react';

export default function PrivacyPolicy() {
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
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight">
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Last Updated: July 17, 2026</p>
        </div>

        {/* Introduction Box */}
        <div className="bg-card border border-border rounded-2xl p-5 flex gap-3 text-sm text-muted-foreground leading-relaxed shadow-sm">
          <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            Your privacy is highly valued at ServiceHub. This policy explains what information we gather, how we utilize and protect it, and your rights concerning your personal details.
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          
          {/* Section 1 */}
          <section className="space-y-2.5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">1</span>
              Information We Collect
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect information to facilitate booking matches, process advance payments securely, and notify you of progress updates:
            </p>
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5">
              <li><strong>Personal details:</strong> Name, email address, phone number, and physical locations.</li>
              <li><strong>Provider details:</strong> Business categories, experience metrics, work documents, and UPI/banking credentials.</li>
              <li><strong>Usage logs:</strong> Search logs, AI-diagnosis logs, chat messages, and browser information.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2.5 border-t border-border/60 pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">2</span>
              How We Use Your Data
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We strictly process data only for operational purposes. We do not sell or lease your personal information to third parties:
            </p>
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5">
              <li>To match customers with nearby service providers.</li>
              <li>To compute surge parameters and smart discount percentages.</li>
              <li>To verify provider profiles and ensure general safety.</li>
              <li>To coordinate transactions via secure platforms (Razorpay/Stripe).</li>
              <li>To analyze device status reports via AI Diagnosis helper functions.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2.5 border-t border-border/60 pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">3</span>
              Data Sharing &amp; Access Control
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When a booking is confirmed, we share limited customer details (name, phone, address, and issue description) with the selected provider to enable work execution.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Similarly, provider contact details are shared with the customer. Both parties agree to use this information solely for coordinating the specific booking ticket.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2.5 border-t border-border/60 pt-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold">4</span>
              Data Protection &amp; Retention
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All critical records, authentication hashes, and logs are encrypted using standard transit layer transport mechanisms (SSL) and hosted securely. We retain account records as long as your profile remains active.
            </p>
          </section>

        </div>

        {/* Info Box */}
        <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
          <Eye className="w-5 h-5 text-muted-foreground mx-auto" />
          <h4 className="font-semibold text-foreground text-sm">Control Your Data</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            You can request details of stored records or account deletion by emailing us at <a href="mailto:velr012006@gmail.com" className="text-primary hover:underline">velr012006@gmail.com</a>.
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
