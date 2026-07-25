import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logClientEvent } from '@/lib/engineAuditLogger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';

export default function ClientLogin() {
  const { user, signInWithMagicLink, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Redirect if already authenticated
  if (!loading && user) {
    navigate('/client/dashboard', { replace: true });
    return null;
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setSubmitting(true);
    try {
      if (!isSupabaseConfigured) {
        toast.error('Supabase is not configured.');
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message || '';
        if (msg.toLowerCase().includes('invalid login credentials')) {
          toast.error('Invalid email or password. Please try again or use the magic link option.', { duration: 5000 });
        } else if (msg.toLowerCase().includes('email not confirmed')) {
          toast.error('Please verify your email before signing in. Check your inbox for the verification link.', { duration: 5000 });
        } else {
          toast.error(msg || 'Login failed');
        }
        setSubmitting(false);
        return;
      }

      // Log audit event
      if (data.user) {
        logClientEvent('client_logged_in', {
          entity_type: 'client_accounts',
          entity_id: data.user.id,
          actor_id: data.user.id,
          description: `Client logged in: ${email.trim()}`,
          metadata: { method: 'password', email: email.trim() },
        });
      }

      toast.success('Welcome back!');
      navigate('/client/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMagicLinkLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signInWithMagicLink(email.trim());
      if (error) {
        toast.error(error.message || 'Failed to send magic link');
      } else {
        setMagicLinkSent(true);
        toast.success('Magic link sent! Check your email inbox.');
      }
    } catch (err) {
      console.error('Magic link error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 font-[Rubik]">Client Portal</h1>
          <p className="text-gray-600 mt-2 font-[Nunito_Sans]">Access your consultations and spiritual journey</p>
        </div>

        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>
              {useMagicLink
                ? 'Sign in with a magic link — no password needed'
                : 'Sign in with your email and password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {magicLinkSent ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
                <p className="text-sm text-gray-600 mb-4">
                  We sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setMagicLinkSent(false); setEmail(''); }}
                  className="rounded-xl"
                >
                  Try a different email
                </Button>
              </div>
            ) : useMagicLink ? (
              <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email-ml">Email Address</Label>
                  <Input
                    id="login-email-ml"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send Magic Link'}
                </Button>
                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center mt-3">
                  <Shield className="h-3 w-3" />
                  <span>Secure, passwordless authentication</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-gray-500"
                  onClick={() => setUseMagicLink(false)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Sign in with password instead
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email Address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Link to="/client/forgot-password" className="text-xs text-amber-600 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-xl pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  disabled={submitting}
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-gray-500"
                  onClick={() => setUseMagicLink(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Use magic link instead
                </Button>
              </form>
            )}

            {!magicLinkSent && (
              <div className="mt-6 text-center text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link to="/client/register" className="text-amber-600 hover:underline font-medium">
                  Create Account
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          Are you a practitioner?{' '}
          <a href="/auth" className="text-amber-600 hover:underline font-medium">Sign in to Awo Portal</a>
        </p>
      </div>
    </div>
  );
}