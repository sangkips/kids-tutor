import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Volume2,
  Moon,
  Bell,
  Shield,
  HelpCircle,
  Star,
  ChevronRight,
  Languages,
  Palette,
  Zap,
  Clock,
  Target,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Award,
} from "lucide-react-native";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { GlobalSounds } from "@/components/SoundManager";

const DIFFICULTY_LEVELS = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Simple 3-4 letter words",
    color: "#10B981",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "5-7 letter words with complexity",
    color: "#F59E0B",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "8+ letter words and phrases",
    color: "#EF4444",
  },
];

const DAILY_GOALS = [5, 10, 15, 20, 25, 30];

export default function SettingsScreen() {
  const { user } = useAuth();
  const {
    settings,
    loading,
    error,
    toggleSetting,
    updateNumericSetting,
    updateStringSetting,
  } = useSettings();
  const [localSettings, setLocalSettings] = useState({
    sound_enabled: true,
    notifications_enabled: true,
    dark_mode: false,
    auto_play_pronunciation: true,
    difficulty_level: "beginner",
    daily_word_goal: 10,
    speech_rate: 0.7,
  });
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        sound_enabled: settings.sound_enabled,
        notifications_enabled: settings.notifications_enabled,
        dark_mode: settings.dark_mode,
        auto_play_pronunciation: true, // This would come from user_preferences table
        difficulty_level: settings.difficulty_level,
        daily_word_goal: settings.daily_word_goal,
        speech_rate: settings.speech_rate,
      });
    }
  }, [settings]);

  const handleToggle = async (key: string, value: boolean) => {
    // Update local state immediately for responsive UI
    setLocalSettings((prev) => ({ ...prev, [key]: value }));

    // Set saving state
    setSavingStates((prev) => ({ ...prev, [key]: true }));

    try {
      const result = await toggleSetting(key as any, value);

      if (result?.error) {
        // Revert local state on error
        setLocalSettings((prev) => ({ ...prev, [key]: !value }));
        Alert.alert("Error", `Failed to update ${key.replace("_", " ")}`);
        GlobalSounds.playError();
      } else {
        // Show success feedback
        GlobalSounds.playSuccess();
        showSuccessFeedback(key);
      }
    } catch (error) {
      // Revert local state on error
      setLocalSettings((prev) => ({ ...prev, [key]: !value }));
      Alert.alert("Error", "Failed to save settings");
      GlobalSounds.playError();
    } finally {
      setSavingStates((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDifficultyChange = async (difficulty: string) => {
    setLocalSettings((prev) => ({ ...prev, difficulty_level: difficulty }));
    setSavingStates((prev) => ({ ...prev, difficulty_level: true }));

    try {
      const result = await updateStringSetting("difficulty_level", difficulty);

      if (result?.error) {
        // Revert on error
        setLocalSettings((prev) => ({
          ...prev,
          difficulty_level: settings?.difficulty_level || "beginner",
        }));
        Alert.alert("Error", "Failed to update difficulty level");
        GlobalSounds.playError();
      } else {
        GlobalSounds.playSuccess();
        Alert.alert(
          "Difficulty Updated! 🎯",
          `Your learning difficulty has been set to ${difficulty}. New words will match this level.`,
          [{ text: "Got it!", style: "default" }]
        );
      }
    } catch (error) {
      setLocalSettings((prev) => ({
        ...prev,
        difficulty_level: settings?.difficulty_level || "beginner",
      }));
      Alert.alert("Error", "Failed to save difficulty setting");
      GlobalSounds.playError();
    } finally {
      setSavingStates((prev) => ({ ...prev, difficulty_level: false }));
      setShowDifficultyModal(false);
    }
  };

  const handleGoalChange = async (goal: number) => {
    setLocalSettings((prev) => ({ ...prev, daily_word_goal: goal }));
    setSavingStates((prev) => ({ ...prev, daily_word_goal: true }));

    try {
      const result = await updateNumericSetting("daily_word_goal", goal);

      if (result?.error) {
        // Revert on error
        setLocalSettings((prev) => ({
          ...prev,
          daily_word_goal: settings?.daily_word_goal || 10,
        }));
        Alert.alert("Error", "Failed to update daily goal");
        GlobalSounds.playError();
      } else {
        GlobalSounds.playSuccess();
        Alert.alert(
          "Daily Goal Set! 🎯",
          `Your daily learning goal is now ${goal} words. Keep up the great work!`,
          [{ text: "Let's do this!", style: "default" }]
        );
      }
    } catch (error) {
      setLocalSettings((prev) => ({
        ...prev,
        daily_word_goal: settings?.daily_word_goal || 10,
      }));
      Alert.alert("Error", "Failed to save goal setting");
      GlobalSounds.playError();
    } finally {
      setSavingStates((prev) => ({ ...prev, daily_word_goal: false }));
      setShowGoalModal(false);
    }
  };

  const showSuccessFeedback = (settingKey: string) => {
    const settingNames: Record<string, string> = {
      sound_enabled: "Sound Effects",
      notifications_enabled: "Notifications",
      dark_mode: "Dark Mode",
      auto_play_pronunciation: "Auto-play Pronunciation",
    };

    const settingName = settingNames[settingKey] || settingKey;
    // You could implement a toast notification here instead of alert
    // For now, we'll use a subtle visual feedback
  };

  const showComingSoon = () => {
    Alert.alert(
      "Coming Soon!",
      "This feature will be available in a future update."
    );
  };

  const showAbout = () => {
    Alert.alert(
      "Reading Buddy v1.0",
      "A fun and interactive app to help kids learn pronunciation and reading skills.\n\nMade with ❤️ for young learners."
    );
  };

  const getDifficultyInfo = () => {
    const current = DIFFICULTY_LEVELS.find(
      (d) => d.value === localSettings.difficulty_level
    );
    return current || DIFFICULTY_LEVELS[0];
  };

  const renderToggleItem = (
    icon: React.ReactNode,
    title: string,
    settingKey: string,
    description?: string
  ) => {
    const isEnabled = localSettings[settingKey as keyof typeof localSettings];
    const isSaving = savingStates[settingKey];

    return (
      <View
        style={[
          styles.settingItem,
          localSettings.dark_mode && styles.darkSettingItem,
        ]}
      >
        <View style={styles.settingLeft}>
          {icon}
          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.settingText,
                localSettings.dark_mode && styles.darkText,
              ]}
            >
              {title}
            </Text>
            {description && (
              <Text style={styles.settingDescription}>{description}</Text>
            )}
          </View>
        </View>
        <View style={styles.toggleContainer}>
          {isSaving && (
            <ActivityIndicator
              size="small"
              color="#4F46E5"
              style={styles.savingIndicator}
            />
          )}
          <Switch
            value={isEnabled as boolean}
            onValueChange={(value) => handleToggle(settingKey, value)}
            trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
            thumbColor={isEnabled ? "#FFFFFF" : "#9CA3AF"}
            disabled={isSaving || loading}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Settings Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => window.location.reload()}
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const difficultyInfo = getDifficultyInfo();

  return (
    <SafeAreaView
      style={[
        styles.container,
        localSettings.dark_mode && styles.darkContainer,
      ]}
    >
      <View
        style={[styles.header, localSettings.dark_mode && styles.darkHeader]}
      >
        <Text
          style={[
            styles.headerTitle,
            localSettings.dark_mode && styles.darkText,
          ]}
        >
          Settings
        </Text>
        {user && (
          <View style={styles.userIndicator}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.userIndicatorText}>Synced</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Learning Preferences */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              localSettings.dark_mode && styles.darkText,
            ]}
          >
            Learning Preferences
          </Text>

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={() => {
              GlobalSounds.playClick();
              setShowDifficultyModal(true);
            }}
          >
            <View style={styles.settingLeft}>
              <Target size={20} color={difficultyInfo.color} />
              <View style={styles.settingTextContainer}>
                <Text
                  style={[
                    styles.settingText,
                    localSettings.dark_mode && styles.darkText,
                  ]}
                >
                  Difficulty Level
                </Text>
                <Text style={styles.settingDescription}>
                  {difficultyInfo.description}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              {savingStates.difficulty_level && (
                <ActivityIndicator
                  size="small"
                  color="#4F46E5"
                  style={styles.savingIndicator}
                />
              )}
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: difficultyInfo.color },
                ]}
              >
                <Text style={styles.difficultyBadgeText}>
                  {difficultyInfo.label}
                </Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={() => {
              GlobalSounds.playClick();
              setShowGoalModal(true);
            }}
          >
            <View style={styles.settingLeft}>
              <TrendingUp size={20} color="#6366F1" />
              <View style={styles.settingTextContainer}>
                <Text
                  style={[
                    styles.settingText,
                    localSettings.dark_mode && styles.darkText,
                  ]}
                >
                  Daily Goal
                </Text>
                <Text style={styles.settingDescription}>
                  Set your daily learning target
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              {savingStates.daily_word_goal && (
                <ActivityIndicator
                  size="small"
                  color="#4F46E5"
                  style={styles.savingIndicator}
                />
              )}
              <View style={styles.goalBadge}>
                <Award size={14} color="#6366F1" />
                <Text style={styles.goalBadgeText}>
                  {localSettings.daily_word_goal} words
                </Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Audio & Speech Settings */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              localSettings.dark_mode && styles.darkText,
            ]}
          >
            Audio & Speech
          </Text>

          {renderToggleItem(
            <Volume2 size={20} color="#10B981" />,
            "Sound Effects",
            "sound_enabled",
            "Play sounds for interactions and feedback"
          )}

          {renderToggleItem(
            <Zap size={20} color="#F59E0B" />,
            "Auto-play Pronunciation",
            "auto_play_pronunciation",
            "Automatically play word pronunciation"
          )}

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={showComingSoon}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.difficultyIcon}>🔊</Text>
              <View style={styles.settingTextContainer}>
                <Text
                  style={[
                    styles.settingText,
                    localSettings.dark_mode && styles.darkText,
                  ]}
                >
                  Speech Speed
                </Text>
                <Text style={styles.settingDescription}>
                  Adjust pronunciation playback speed
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {localSettings.speech_rate === 0.5
                  ? "Slow"
                  : localSettings.speech_rate === 0.7
                  ? "Normal"
                  : localSettings.speech_rate === 1.0
                  ? "Fast"
                  : "Normal"}
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* App Appearance */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              localSettings.dark_mode && styles.darkText,
            ]}
          >
            App Appearance
          </Text>

          {renderToggleItem(
            <Moon size={20} color="#6366F1" />,
            "Dark Mode",
            "dark_mode",
            "Switch to dark theme for better night reading"
          )}

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={showComingSoon}
          >
            <View style={styles.settingLeft}>
              <Palette size={20} color="#EC4899" />
              <View style={styles.settingTextContainer}>
                <Text
                  style={[
                    styles.settingText,
                    localSettings.dark_mode && styles.darkText,
                  ]}
                >
                  Theme Colors
                </Text>
                <Text style={styles.settingDescription}>
                  Customize app colors and themes
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Purple</Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={showComingSoon}
          >
            <View style={styles.settingLeft}>
              <Languages size={20} color="#10B981" />
              <View style={styles.settingTextContainer}>
                <Text
                  style={[
                    styles.settingText,
                    localSettings.dark_mode && styles.darkText,
                  ]}
                >
                  Language
                </Text>
                <Text style={styles.settingDescription}>
                  Change app interface language
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>English</Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              localSettings.dark_mode && styles.darkText,
            ]}
          >
            Notifications
          </Text>

          {renderToggleItem(
            <Bell size={20} color="#F59E0B" />,
            "Push Notifications",
            "notifications_enabled",
            "Receive reminders and achievement notifications"
          )}

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={showComingSoon}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.difficultyIcon}>🎯</Text>
              <View style={styles.settingTextContainer}>
                <Text
                  style={[
                    styles.settingText,
                    localSettings.dark_mode && styles.darkText,
                  ]}
                >
                  Goal Reminders
                </Text>
                <Text style={styles.settingDescription}>
                  Daily practice reminders
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {localSettings.notifications_enabled ? "Enabled" : "Disabled"}
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support & Information */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              localSettings.dark_mode && styles.darkText,
            ]}
          >
            Support & Information
          </Text>

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={showComingSoon}
          >
            <View style={styles.settingLeft}>
              <HelpCircle size={20} color="#6B7280" />
              <Text
                style={[
                  styles.settingText,
                  localSettings.dark_mode && styles.darkText,
                ]}
              >
                Help & Tutorials
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={showComingSoon}
          >
            <View style={styles.settingLeft}>
              <Shield size={20} color="#6B7280" />
              <Text
                style={[
                  styles.settingText,
                  localSettings.dark_mode && styles.darkText,
                ]}
              >
                Privacy Policy
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={showComingSoon}
          >
            <View style={styles.settingLeft}>
              <Star size={20} color="#F59E0B" />
              <Text
                style={[
                  styles.settingText,
                  localSettings.dark_mode && styles.darkText,
                ]}
              >
                Rate the App
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              localSettings.dark_mode && styles.darkSettingItem,
            ]}
            onPress={showAbout}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.difficultyIcon}>ℹ️</Text>
              <Text
                style={[
                  styles.settingText,
                  localSettings.dark_mode && styles.darkText,
                ]}
              >
                About Reading Buddy
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text
            style={[
              styles.versionText,
              localSettings.dark_mode && styles.darkText,
            ]}
          >
            Reading Buddy v1.0.0
          </Text>
          <Text style={styles.versionSubtext}>
            Built with ❤️ for young learners
          </Text>
          {user && (
            <Text style={styles.syncStatus}>
              Settings synced to your account
            </Text>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Difficulty Level Modal */}
      <Modal
        visible={showDifficultyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDifficultyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              localSettings.dark_mode && styles.darkModalContent,
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                localSettings.dark_mode && styles.darkText,
              ]}
            >
              Choose Difficulty Level
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                localSettings.dark_mode && styles.darkText,
              ]}
            >
              Select the complexity of words you'd like to practice
            </Text>

            {DIFFICULTY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.difficultyOption,
                  localSettings.difficulty_level === level.value &&
                    styles.selectedDifficultyOption,
                  localSettings.dark_mode && styles.darkDifficultyOption,
                ]}
                onPress={() => {
                  GlobalSounds.playClick();
                  handleDifficultyChange(level.value);
                }}
              >
                <View
                  style={[
                    styles.difficultyIndicator,
                    { backgroundColor: level.color },
                  ]}
                />
                <View style={styles.difficultyInfo}>
                  <Text
                    style={[
                      styles.difficultyLabel,
                      localSettings.dark_mode && styles.darkText,
                    ]}
                  >
                    {level.label}
                  </Text>
                  <Text style={styles.difficultyDescription}>
                    {level.description}
                  </Text>
                </View>
                {localSettings.difficulty_level === level.value && (
                  <CheckCircle size={20} color={level.color} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                GlobalSounds.playClick();
                setShowDifficultyModal(false);
              }}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Daily Goal Modal */}
      <Modal
        visible={showGoalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              localSettings.dark_mode && styles.darkModalContent,
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                localSettings.dark_mode && styles.darkText,
              ]}
            >
              Set Daily Goal
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                localSettings.dark_mode && styles.darkText,
              ]}
            >
              How many words would you like to practice each day?
            </Text>

            <View style={styles.goalGrid}>
              {DAILY_GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.goalOption,
                    localSettings.daily_word_goal === goal &&
                      styles.selectedGoalOption,
                    localSettings.dark_mode && styles.darkGoalOption,
                  ]}
                  onPress={() => {
                    GlobalSounds.playClick();
                    handleGoalChange(goal);
                  }}
                >
                  <Text
                    style={[
                      styles.goalNumber,
                      localSettings.daily_word_goal === goal &&
                        styles.selectedGoalNumber,
                      localSettings.dark_mode && styles.darkText,
                    ]}
                  >
                    {goal}
                  </Text>
                  <Text
                    style={[
                      styles.goalLabel,
                      localSettings.daily_word_goal === goal &&
                        styles.selectedGoalLabel,
                    ]}
                  >
                    words
                  </Text>
                  {localSettings.daily_word_goal === goal && (
                    <View style={styles.goalCheckmark}>
                      <CheckCircle size={16} color="#6366F1" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                GlobalSounds.playClick();
                setShowGoalModal(false);
              }}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  darkContainer: {
    backgroundColor: "#1F2937",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#EF4444",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  darkHeader: {
    backgroundColor: "#374151",
    borderBottomColor: "#4B5563",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  darkText: {
    color: "#F9FAFB",
  },
  userIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  userIndicatorText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
    marginLeft: 4,
  },
  settingItem: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  darkSettingItem: {
    backgroundColor: "#374151",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  settingText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savingIndicator: {
    marginRight: 4,
  },
  difficultyIcon: {
    fontSize: 20,
    width: 20,
    textAlign: "center",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  goalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  goalBadgeText: {
    color: "#6366F1",
    fontSize: 12,
    fontWeight: "600",
  },
  versionSection: {
    alignItems: "center",
    paddingVertical: 24,
    marginTop: 20,
  },
  versionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  versionSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  syncStatus: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 8,
    fontStyle: "italic",
  },
  bottomSpacing: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  darkModalContent: {
    backgroundColor: "#374151",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  difficultyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  darkDifficultyOption: {
    borderColor: "#4B5563",
  },
  selectedDifficultyOption: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  difficultyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  difficultyInfo: {
    flex: 1,
  },
  difficultyLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  difficultyDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  goalOption: {
    flex: 1,
    minWidth: 80,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  darkGoalOption: {
    borderColor: "#4B5563",
  },
  selectedGoalOption: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  goalNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  selectedGoalNumber: {
    color: "#6366F1",
  },
  goalLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedGoalLabel: {
    color: "#6366F1",
  },
  goalCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  modalCloseButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
});
