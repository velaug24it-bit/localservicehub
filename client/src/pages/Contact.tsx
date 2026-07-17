import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ChevronLeft, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.contact.submit({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });
      toast({ title: '✅ Message Sent!', description: "We'll get back to you within 24 hours." });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast({ title: 'Error', description: 'Failed to send message. Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Banner Header */}
      <header className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </button>
          <span className="text-lg font-display font-bold gradient-text">ServiceHub</span>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 py-12 px-4 max-w-5xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight">
            Contact <span className="gradient-text">ServiceHub Support</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Have questions about bookings, provider verification, or payment methods? Reach out and our team will assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Quick Support Details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide opacity-80">Support Channels</h3>
              
              {/* Phone support */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Call Center</h4>
                  <a href="tel:+919840994649" className="text-primary font-medium text-sm hover:underline">
                    +91 98409 94649
                  </a>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Mon - Sat, 9:00 AM - 7:00 PM</p>
                </div>
              </div>

              {/* Email Support */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Email Helpdesk</h4>
                  <a href="mailto:velr012006@gmail.com" className="text-primary font-medium text-sm hover:underline">
                    velr012006@gmail.com
                  </a>
                  <p className="text-[11px] text-muted-foreground mt-0.5">24/7 ticketing, 24h response time</p>
                </div>
              </div>

              {/* HQ location */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Regional HQ</h4>
                  <p className="text-muted-foreground text-sm">Tamil Nadu, India</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Covering all 38 districts</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
              <h4 className="font-semibold text-foreground text-sm">Instant Chats</h4>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:+919840994649"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-all text-xs font-semibold"
                >
                  📞 Call Now
                </a>
                <a
                  href="https://wa.me/919840994649"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-all text-xs font-semibold"
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-semibold text-foreground text-lg">Send Inquiry Ticket</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">Full Name</label>
                  <input
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Subject</label>
                <input
                  required
                  placeholder="Verification Status / Booking Cancellation Support"
                  value={formData.subject}
                  onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Message Body</label>
                <textarea
                  required
                  placeholder="Explain your inquiry in detail..."
                  rows={5}
                  value={formData.message}
                  onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none resize-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-95 transition-opacity disabled:opacity-60 text-sm"
              >
                {sending ? '⏳ Sending...' : '🚀 Submit Ticket'}
                {!sending && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Basic Footer */}
      <footer className="border-t border-border bg-muted/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ServiceHub. All rights reserved.
      </footer>
    </div>
  );
}
