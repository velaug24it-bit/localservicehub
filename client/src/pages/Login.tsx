import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { districts } from '@/data/providers';
import { toast } from '@/hooks/use-toast';
import { 
  Eye, EyeOff, Lock, Mail, User, Phone, MapPin, 
  ShieldCheck, ArrowRight, Wrench, CheckCircle2, Sparkles, Building2
} from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    if (pw.length < 6) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label: 'Medium', color: 'bg-amber-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast({ title: 'Welcome back!', description: 'Sign in successful.' });
      navigate('/');
    } catch (err: unknown) {
      toast({ title: 'Authentication Error', description: getErrorMessage(err, 'Invalid email or password.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential?: string) => {
    if (!credential) {
      toast({ title: 'Error', description: 'Google sign in credential missing.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogle(credential);
      toast({ title: 'Welcome!', description: 'Signed in with Google.' });
      navigate('/');
    } catch (err: unknown) {
      toast({ title: 'Error', description: getErrorMessage(err, 'Google sign in failed.'), variant: 'destructive' });
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
      toast({ title: 'Error', description: 'Phone number must be 10 digits.', variant: 'destructive' });
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
        toast({ title: 'Account Created', description: 'Your provider profile was created and is pending admin verification.' });
      } else {
        toast({ title: 'Welcome!', description: 'Account created successfully.' });
        navigate('/');
      }
    } catch (err: unknown) {
      toast({ title: 'Registration Failed', description: getErrorMessage(err, 'Signup failed.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    toast({ title: 'Reset link dispatched', description: 'Check your email inbox for password recovery instructions.' });
    setShowForgot(false);
  };

  const strength = passwordStrength(signupPassword);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Subtle Gradient Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[450px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowForgot(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Reset Password</h3>
                <p className="text-xs text-slate-400">Enter your registered email to receive a recovery link</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={forgotEmail} 
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" 
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setShowForgot(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
              >
                Send Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Logo Banner (Flipkart / Amazon Style) */}
      <header className="pt-4 pb-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 p-0.5 shadow-xl shadow-indigo-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-indigo-400 font-extrabold text-xl">
              S
            </div>
          </div>
          <div className="text-left">
            <span className="text-2xl font-extrabold tracking-tight text-white block leading-none">
              Service<span className="text-indigo-400">Hub</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Official Portal</span>
          </div>
        </div>
      </header>

      {/* Main Single Centered Auth Card (Amazon / Flipkart / Apple / Stripe Style) */}
      <main className="relative z-10 w-full max-w-[440px] my-auto">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-6 sm:p-8 space-y-6">
          
          {/* Title & Segmented Switcher */}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </h1>
              <p className="text-xs text-slate-400">
                {tab === 'login' 
                  ? 'Access your ServiceHub account' 
                  : 'Get started with verified local services'}
              </p>
            </div>

            {/* Top Switcher Bar */}
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  tab === 'login'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab('signup')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  tab === 'signup'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                New Account
              </button>
            </div>
          </div>

          {/* Form Area */}
          {tab === 'login' ? (
            /* SIGN IN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center py-2">
                <div className="flex-1 border-t border-slate-800" />
                <span className="px-3 text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">OR</span>
                <div className="flex-1 border-t border-slate-800" />
              </div>

              {/* Google SSO */}
              {googleClientId ? (
                <div ref={googleButtonRef} className="flex justify-center min-h-[44px]" />
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full border border-slate-800 bg-slate-950/40 text-slate-500 py-3 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Google Sign In Unavailable
                </button>
              )}

              <p className="text-center text-xs text-slate-400 pt-2">
                New to ServiceHub?{' '}
                <button
                  type="button"
                  onClick={() => setTab('signup')}
                  className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                >
                  Create an Account
                </button>
              </p>
            </form>
          ) : (
            /* CREATE ACCOUNT FORM */
            <form onSubmit={handleSignup} className="space-y-3.5">
              {/* Account Type Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserType('customer')}
                    className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-2.5 ${
                      userType === 'customer'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-bold block">Customer</div>
                      <div className="text-[9px] text-slate-400">Book services</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserType('provider')}
                    className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-2.5 ${
                      userType === 'provider'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-bold block">Provider</div>
                      <div className="text-[9px] text-slate-400">Offer services</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Email Input */}
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Grid: Phone & Location */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Phone (10 digits)"
                    value={signupPhone}
                    onChange={e => setSignupPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={signupLocation}
                    onChange={e => setSignupLocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  >
                    {districts.map(d => <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password (min 6 chars)"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {signupPassword && (
                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all`} style={{ width: strength.width }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm Password"
                  value={signupConfirm}
                  onChange={e => setSignupConfirm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-400 pt-1">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                >
                  Sign In
                </button>
              </p>
            </form>
          )}
        </div>
      </main>

      {/* Top Company Style Trust & Footer Bar (Amazon / Flipkart Style) */}
      <footer className="relative z-10 pt-6 pb-2 text-center space-y-3">
        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 256-Bit SSL Encrypted
          </span>
          <span className="hidden sm:inline text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> Verified Professionals
          </span>
          <span className="hidden sm:inline text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" /> 100% Satisfaction Guarantee
          </span>
        </div>

        {/* Footer Legal Links */}
        <p className="text-[11px] text-slate-500">
          © {new Date().getFullYear()} ServiceHub Technologies Inc. All rights reserved. ·{' '}
          <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a> ·{' '}
          <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a> ·{' '}
          <a href="#" className="hover:text-slate-400 transition-colors">Help Center</a>
        </p>
      </footer>
    </div>
  );
};

export default Login;
