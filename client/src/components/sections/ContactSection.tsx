import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

const ContactSection = () => {
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
    <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">
          Get In <span className="gradient-text">Touch</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Have questions or need help? Reach out to us anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Contact Info Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Phone */}
          <div className="bg-card rounded-xl border border-border p-5 hover:shadow-card transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-xl shrink-0">📞</div>
              <div>
                <div className="font-semibold text-foreground text-sm">Call Us</div>
                <a href="tel:+919840994649" className="text-primary font-medium text-sm hover:underline">
                  +91 98409 94649
                </a>
                <div className="text-xs text-muted-foreground mt-0.5">Mon - Sat, 9 AM - 7 PM</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <a href="tel:+919840994649" className="flex-1 text-center py-2 rounded-lg bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-colors">
                📞 Call Now
              </a>
              <a href="https://wa.me/919840994649" target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center py-2 rounded-lg bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-colors">
                💬 WhatsApp
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="bg-card rounded-xl border border-border p-5 hover:shadow-card transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-xl shrink-0">📧</div>
              <div>
                <div className="font-semibold text-foreground text-sm">Email Us</div>
                <a href="mailto:velr012006@gmail.com" className="text-primary font-medium text-sm hover:underline">
                  velr012006@gmail.com
                </a>
                <div className="text-xs text-muted-foreground mt-0.5">We reply within 24 hours</div>
              </div>
            </div>
            <a href="mailto:velr012006@gmail.com"
              className="block text-center mt-3 py-2 rounded-lg bg-info/10 text-info text-xs font-semibold hover:bg-info/20 transition-colors">
              ✉️ Send Email
            </a>
          </div>

          {/* Location */}
          <div className="bg-card rounded-xl border border-border p-5 hover:shadow-card transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-xl shrink-0">📍</div>
              <div>
                <div className="font-semibold text-foreground text-sm">Our Location</div>
                <div className="text-muted-foreground text-sm">Tamil Nadu, India</div>
                <div className="text-xs text-muted-foreground mt-0.5">Serving all 38 districts</div>
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="bg-card rounded-xl border border-border p-5 hover:shadow-card transition-all">
            <div className="font-semibold text-foreground text-sm mb-3">Follow Us</div>
            <div className="flex gap-3">
              {[
                { label: '📘 Facebook', url: 'https://www.facebook.com' },
                { label: '📸 Instagram', url: 'https://www.instagram.com' },
                { label: '🐦 Twitter', url: 'https://www.twitter.com' },
                { label: '💼 LinkedIn', url: 'https://www.linkedin.com' },
              ].map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium cursor-pointer hover:bg-primary/10 transition-colors">
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border p-6">
          <h3 className="font-display font-semibold text-foreground text-lg mb-4">Send Us a Message</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                required placeholder="Your Name" value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
              />
              <input
                required type="email" placeholder="Your Email" value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <input
              required placeholder="Subject" value={formData.subject}
              onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <textarea
              required placeholder="Your message..." rows={5} value={formData.message}
              onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
            />
            <button
              type="submit" disabled={sending}
              className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {sending ? '⏳ Sending...' : '🚀 Send Message'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
