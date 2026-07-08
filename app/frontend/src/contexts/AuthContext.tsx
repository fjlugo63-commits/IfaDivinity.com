import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, TABLES, UserRole } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: UserRole;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  registerClient: (data: { name: string; email: string; phone?: string; timezone?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('anon');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole('anon');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId: string) {
    // Add a timeout to prevent hanging if the profiles table doesn't exist or RLS blocks
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    
    try {
      const queryPromise = supabase
        .from(TABLES.profiles)
        .select('role')
        .eq('id', userId)
        .single();

      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (result === null) {
        // Timeout - assume buyer role
        setUserRole('buyer');
      } else {
        const { data, error } = result;
        if (error || !data) {
          setUserRole('buyer');
        } else {
          setUserRole(data.role as UserRole);
        }
      }
    } catch {
      setUserRole('buyer');
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string, name: string, role: UserRole = 'buyer') {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please connect your Supabase project.') };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, role },
      },
    });
    if (!error) {
      // The trigger should auto-create profile, but let's also try to upsert
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase.from(TABLES.profiles).upsert({
          id: newUser.id,
          email,
          full_name: name,
          role,
        });
      }
    }
    return { error: error as Error | null };
  }

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please connect your Supabase project.') };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signInWithMagicLink(email: string) {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please connect your Supabase project.') };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/client/auth/callback`,
      },
    });
    return { error: error as Error | null };
  }

  async function registerClient(data: { name: string; email: string; phone?: string; timezone?: string }) {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please connect your Supabase project.') };
    }
    // First send magic link for auth
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/client/auth/callback`,
        data: { full_name: data.name, role: 'client' },
      },
    });
    if (otpError) return { error: otpError as Error };

    // Create client record (will be linked after auth confirmation)
    const { error: clientError } = await supabase.from(TABLES.clients).insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'active',
      awo_id: '00000000-0000-0000-0000-000000000000', // placeholder, will be updated
    });
    if (clientError && !clientError.message.includes('duplicate')) {
      return { error: clientError as unknown as Error };
    }
    return { error: null };
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUserRole('anon');
  }

  return (
    <AuthContext.Provider value={{ session, user, userRole, loading, isConfigured: isSupabaseConfigured, signUp, signIn, signInWithMagicLink, registerClient, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}