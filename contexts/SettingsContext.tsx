import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useSettings } from "@/hooks/useSettings";

interface SettingsContextType {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  darkModeEnabled: boolean;
  speechRate: number;
  difficultyLevel: string;
  dailyWordGoal: number;
  loading: boolean;
  updateSetting: (key: string, value: any) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const {
    settings,
    loading,
    toggleSetting,
    updateNumericSetting,
    updateStringSetting,
  } = useSettings();

  // Use stable state that only updates when settings actually change
  const [contextValue, setContextValue] = useState<SettingsContextType>(() => ({
    soundEnabled: true,
    notificationsEnabled: true,
    darkModeEnabled: false,
    speechRate: 0.7,
    difficultyLevel: "beginner",
    dailyWordGoal: 10,
    loading: true,
    updateSetting: async () => {},
  }));

  // Memoize the updateSetting function to prevent recreation on every render
  const updateSetting = useCallback(
    async (key: string, value: any) => {
      try {
        if (typeof value === "boolean") {
          await toggleSetting(key as any, value);
        } else if (typeof value === "number") {
          await updateNumericSetting(key as any, value);
        } else {
          await updateStringSetting(key as any, value);
        }
      } catch (error) {
        console.error("Failed to update setting:", error);
        throw error;
      }
    },
    [toggleSetting, updateNumericSetting, updateStringSetting]
  );

  // Only update context when settings actually change
  useEffect(() => {
    if (settings) {
      const newContextValue = {
        soundEnabled: settings.sound_enabled,
        notificationsEnabled: settings.notifications_enabled,
        darkModeEnabled: settings.dark_mode,
        speechRate: settings.speech_rate,
        difficultyLevel: settings.difficulty_level,
        dailyWordGoal: settings.daily_word_goal,
        loading,
        updateSetting,
      };

      // Only update if values have actually changed
      setContextValue((prev) => {
        const hasChanged =
          prev.soundEnabled !== newContextValue.soundEnabled ||
          prev.notificationsEnabled !== newContextValue.notificationsEnabled ||
          prev.darkModeEnabled !== newContextValue.darkModeEnabled ||
          prev.speechRate !== newContextValue.speechRate ||
          prev.difficultyLevel !== newContextValue.difficultyLevel ||
          prev.dailyWordGoal !== newContextValue.dailyWordGoal ||
          prev.loading !== newContextValue.loading;

        return hasChanged ? newContextValue : prev;
      });
    }
  }, [settings, loading, updateSetting]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error(
      "useSettingsContext must be used within a SettingsProvider"
    );
  }
  return context;
}
