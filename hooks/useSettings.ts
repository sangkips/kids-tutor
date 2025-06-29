import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { useAuth } from './useAuth';

type AppSettings = Database['public']['Tables']['app_settings']['Row'];
type SettingsUpdate = Partial<Omit<AppSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    fetchSettings();

    // Subscribe to settings changes
    const subscription = supabase
      .channel('settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSettings(payload.new as AppSettings);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          await createDefaultSettings();
          return;
        }
        throw error;
      }
      
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setError(error.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!user) return;

    try {
      const defaultSettings = {
        user_id: user.id,
        sound_enabled: true,
        notifications_enabled: true,
        dark_mode: false,
        speech_rate: 0.7,
        difficulty_level: 'beginner' as const,
        daily_word_goal: 10,
      };

      const { data, error } = await supabase
        .from('app_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Error creating default settings:', error);
      setError(error.message || 'Failed to create settings');
    }
  };

  const updateSettings = async (updates: SettingsUpdate) => {
    if (!user || !settings) return { error: new Error('No user or settings') };

    try {
      setError(null);

      const { data, error } = await supabase
        .from('app_settings')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      return { data, error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update settings';
      setError(errorMessage);
      return { data: null, error: new Error(errorMessage) };
    }
  };

  const toggleSetting = async (key: keyof SettingsUpdate, value: boolean) => {
    return updateSettings({ [key]: value });
  };

  const updateNumericSetting = async (key: keyof SettingsUpdate, value: number) => {
    return updateSettings({ [key]: value });
  };

  const updateStringSetting = async (key: keyof SettingsUpdate, value: string) => {
    return updateSettings({ [key]: value });
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    toggleSetting,
    updateNumericSetting,
    updateStringSetting,
    refetch: fetchSettings,
  };
}