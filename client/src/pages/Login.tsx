import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { districts } from '@/data/providers';
import { toast } from '@/hooks/use-toast';

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme: string; size: string; width?: string; text?: string }
          ) => void;
        };
      };
    };
  }
}

const Login = () => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'provider'>('customer');
  const [showForgot, setShowForgot] = useState(false);
  const { login, loginWithGoogle, signup } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupLocation, setSignupLocation] = useState('Chennai');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');

  const passwordStrength = (pw: string) => {
    if (pw.length < 6) return { label: 'Weak', color: 'bg-destructive', width: '33%' };
    if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label: 'Medium', color: 'bg-warning', width: '66%' };
    return { label: 'Strong', color: 'bg-success', width: '100%' };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast({ title: 'Welcome back!', description: 'Login successful.' });
      navigate('/');
    } catch (err: unknown) {
      toast({ title: 'Error', description: getErrorMessage(err, 'Invalid email or password.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential?: string) => {
    if (!credential) {
      toast({ title: 'Error', description: 'Google did not return a sign-in credential.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogle(credential);
      toast({ title: 'Welcome!', description: 'Google login successful.' });
      navigate('/');
    } catch (err: unknown) {
      toast({ title: 'Error', description: getErrorMessage(err, 'Google login failed.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => handleGoogleCredential(response.credential)
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with'
      });
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, [googleClientId]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirm) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (signupPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (signupPhone && signupPhone.replace(/\D/g, '').length !== 10) {
      toast({ title: 'Error', description: 'Phone must be 10 digits.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signup({
        name: signupName,
        email: signupEmail,
        phone: signupPhone,
        location: signupLocation,
        userType,
        password: signupPassword,
      });
      if (userType === 'provider') {
        toast({ title: 'Account Pending Approval', description: 'Your provider profile was created successfully and is pending admin review. You can log in once approved.' });
      } else {
        toast({ title: 'Welcome to ServiceHub!', description: 'Account created successfully.' });
        navigate('/');
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: getErrorMessage(err, 'Signup failed.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    toast({ title: 'Reset link sent!', description: 'Check your email (or console logs) for the password reset link.' });
    setShowForgot(false);
  };
  const strength = passwordStrength(signupPassword);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 gradient-primary" />
      <div className="fixed top-20 left-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="fixed bottom-20 right-20 w-96 h-96 rounded-full bg-secondary/20 blur-3xl animate-float-delayed" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 rounded-full bg-primary/10 blur-2xl animate-float" style={{ animationDelay: '1s' }} />

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={() => setShowForgot(false)}>
          <div className="glass rounded-2xl p-8 max-w-md w-full mx-4 animate-slide-up shadow-glass" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">Reset Password</h3>
            <p className="text-muted-foreground text-sm mb-4">Enter your email to receive a reset link.</p>
            <input type="email" placeholder="Email address" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground mb-4 focus:ring-2 focus:ring-primary outline-none" />
            <button onClick={handleForgotPassword}
              className="w-full gradient-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Send Reset Link
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl mx-4 glass rounded-3xl shadow-glass animate-slide-up overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          
          {/* Left: Marketing */}
          <div className="lg:w-[58%] p-8 lg:p-12 flex flex-col justify-center gradient-primary text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 w-40 h-40 border border-primary-foreground/30 rounded-full" />
              <div className="absolute bottom-10 left-10 w-60 h-60 border border-primary-foreground/20 rounded-full" />
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl lg:text-4xl font-display font-bold mb-4">
                <span className="text-primary-foreground/80">Service</span>Hub
              </h1>
              <h2 className="text-2xl lg:text-3xl font-display font-bold mb-4">
                Find <span className="underline decoration-warning decoration-2 underline-offset-4">Trusted</span> Local Service Providers
              </h2>
              <p className="text-primary-foreground/80 mb-8 leading-relaxed">
                Connect with verified professionals for plumbing, electrical, cleaning, and more across Tamil Nadu.
              </p>

              <div className="flex gap-6 mb-8">
                {[['500+', 'Verified Pros'], ['2k+', 'Happy Clients'], ['98%', 'Satisfaction']].map(([num, label]) => (
                  <div key={label}>
                    <div className="text-2xl font-display font-bold">{num}</div>
                    <div className="text-sm text-primary-foreground/70">{label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                {['✓ Verified Pros', '💰 Fair Pricing', '📍 Live Tracking'].map(badge => (
                  <span key={badge} className="px-3 py-1.5 rounded-full bg-primary-foreground/15 text-sm font-medium backdrop-blur-sm">
                    {badge}
                  </span>
                ))}
              </div>

              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-5 border border-primary-foreground/10">
                <p className="text-sm italic leading-relaxed mb-3">
                  "Found an amazing plumber through ServiceHub. The live tracking feature is a game-changer!"
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm">R</div>
                  <div>
                    <div className="text-sm font-semibold">Rajesh Kumar</div>
                    <div className="text-xs text-primary-foreground/60">Customer, Chennai</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Auth Forms */}
          <div className="lg:w-[42%] p-8 lg:p-10 flex flex-col justify-center bg-card">
            {/* Tab switcher */}
            <div className="flex rounded-lg bg-muted p-1 mb-6">
              <button onClick={() => setTab('login')} className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${tab === 'login' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                Login
              </button>
              <button onClick={() => setTab('signup')} className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${tab === 'signup' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                Sign Up
              </button>
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
                  <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="••••••••" />
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-primary hover:underline">Forgot password?</button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full gradient-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
                  Login to ServiceHub
                </button>
                <div className="relative flex items-center py-1">
                  <div className="flex-1 border-t border-border" />
                  <span className="px-3 text-xs font-medium text-muted-foreground">OR</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                {googleClientId ? (
                  <div ref={googleButtonRef} className="flex justify-center min-h-[44px]" />
                ) : (
                  <button type="button" disabled
                    className="w-full border border-border bg-muted text-muted-foreground py-3 rounded-lg font-semibold cursor-not-allowed">
                    Continue with Google
                  </button>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account? <button type="button" onClick={() => setTab('signup')} className="text-primary font-medium hover:underline">Sign up</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                {/* User Type Selector */}
                <div className="flex gap-3 mb-2">
                  {(['customer', 'provider'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setUserType(type)}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all text-center ${userType === type ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'}`}>
                      <div className="text-xl">{type === 'customer' ? '👤' : '🔧'}</div>
                      <div className="text-xs font-medium text-foreground capitalize">{type}</div>
                    </button>
                  ))}
                </div>
                <input type="text" required placeholder="Full Name" value={signupName} onChange={e => setSignupName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
                <input type="email" required placeholder="Email Address" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
                <input type="tel" placeholder="Phone Number (10 digits)" value={signupPhone} onChange={e => setSignupPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
                <select value={signupLocation} onChange={e => setSignupLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none">
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div>
                  <input type="password" required placeholder="Password (min 6 chars)" value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
                  {signupPassword && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${strength.color} transition-all`} style={{ width: strength.width }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{strength.label}</span>
                    </div>
                  )}
                </div>
                <input type="password" required placeholder="Confirm Password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
                <button type="submit" disabled={loading}
                  className="w-full gradient-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
                  Create Account
                </button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account? <button type="button" onClick={() => setTab('login')} className="text-primary font-medium hover:underline">Login</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
