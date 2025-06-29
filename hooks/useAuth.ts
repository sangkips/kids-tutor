import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, testSupabaseConnection } from '@/lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Test Supabase connection first
    const checkConnection = async () => {
      const isConnected = await testSupabaseConnection();
      if (!isConnected) {
        setConnectionError('Unable to connect to database. Please check your configuration.');
        setLoading(false);
        return;
      }

      // Get initial session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setConnectionError('Authentication error: ' + error.message);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Session error:', error);
        setConnectionError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    checkConnection();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setConnectionError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Attempting to sign up user:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Supabase signup error:', error);
        return { data, error };
      }

      console.log('Signup successful:', data);

      // If signup was successful but we got a database error, try to repair the user setup
      if (data.user && !error) {
        try {
          // Test if the user setup was completed properly
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!profile) {
            console.log('Profile not found, attempting to repair user setup...');
            // Try to repair the user setup
            await supabase.rpc('repair_user_setup', { target_user_id: data.user.id });
          }
        } catch (repairError) {
          console.error('Error during user setup repair:', repairError);
          // Don't fail the signup, just log the error
        }
      }

      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase signin error:', error);
      } else {
        console.log('Signin successful:', data);
      }

      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  // Debug function to validate database setup
  const validateDatabaseSetup = async () => {
    try {
      const { data, error } = await supabase.rpc('validate_database_setup');
      console.log('Database validation:', data);
      return { data, error };
    } catch (error) {
      console.error('Database validation error:', error);
      return { data: null, error };
    }
  };

  // Debug function to test user creation
  const testUserCreation = async () => {
    try {
      const testId = crypto.randomUUID();
      const { data, error } = await supabase.rpc('test_user_creation_process', { 
        test_user_id: testId 
      });
      console.log('User creation test:', data);
      return { data, error };
    } catch (error) {
      console.error('User creation test error:', error);
      return { data: null, error };
    }
  };

  return {
    session,
    user,
    loading,
    connectionError,
    signUp,
    signIn,
    signOut,
    validateDatabaseSetup,
    testUserCreation,
  };
}