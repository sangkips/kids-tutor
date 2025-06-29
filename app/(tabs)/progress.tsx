import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Trophy,
  Star,
  Target,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  BookOpen,
  RefreshCw,
  Flame,
  CheckCircle2,
  XCircle,
  X,
  Crown,
  MessageCircle,
  Mic,
  MapPin,
  Calendar as CalendarIcon,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { useLevelProgression } from "@/hooks/useLevelProgression";
import LevelProgressCard from "@/components/LevelProgressCard";

interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  icon: string;
  progress: number;
  maxProgress: number;
  category: "milestone" | "practice" | "streak" | "accuracy" | "exploration";
  earnedAt?: string;
}

interface UserStats {
  totalWords: number;
  totalTime: number;
  accuracyRate: number;
  currentStreak: number;
  sessionsToday: number;
  chatSessions: number;
  practiceSessions: number;
  uniqueWordsLearned: number;
  masteredWords: number;
}

interface DailyGoal {
  goal_type: "words" | "time" | "accuracy";
  target_value: number;
  current_value: number;
  completed: boolean;
}

interface StreakData {
  date: string;
  completed: boolean;
  wordsLearned: number;
}

export default function ProgressScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">(
    "week"
  );
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    totalWords: 0,
    totalTime: 0,
    accuracyRate: 0,
    currentStreak: 0,
    sessionsToday: 0,
    chatSessions: 0,
    practiceSessions: 0,
    uniqueWordsLearned: 0,
    masteredWords: 0,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<
    Array<{ day: string; words: number; time: number }>
  >([]);
  const [streakData, setStreakData] = useState<StreakData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { settings } = useSettings();
  const {
    currentLevel,
    getLevelTitle,
    getLevelColor,
    getLevelIcon,
    LEVEL_REQUIREMENTS,
    checkLevelProgression,
  } = useLevelProgression();

  useEffect(() => {
    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  const calculateAchievements = (stats: UserStats): Achievement[] => {
    return [
      {
        id: "first_word",
        title: "First Word",
        description: "Pronounced your first word correctly!",
        earned: stats.totalWords > 0,
        icon: "🌟",
        progress: Math.min(stats.totalWords, 1),
        maxProgress: 1,
        category: "milestone",
        earnedAt: stats.totalWords > 0 ? new Date().toISOString() : undefined,
      },
      {
        id: "chat_master",
        title: "Chat Master",
        description: "Completed 10 chat sessions with your reading buddy",
        earned: stats.chatSessions >= 10,
        icon: "💬",
        progress: Math.min(stats.chatSessions, 10),
        maxProgress: 10,
        category: "practice",
        earnedAt:
          stats.chatSessions >= 10 ? new Date().toISOString() : undefined,
      },
      {
        id: "practice_star",
        title: "Practice Star",
        description: "Completed 5 pronunciation practice sessions",
        earned: stats.practiceSessions >= 5,
        icon: "⭐",
        progress: Math.min(stats.practiceSessions, 5),
        maxProgress: 5,
        category: "practice",
        earnedAt:
          stats.practiceSessions >= 5 ? new Date().toISOString() : undefined,
      },
      {
        id: "word_explorer",
        title: "Word Explorer",
        description: "Learned 20 unique words",
        earned: stats.uniqueWordsLearned >= 20,
        icon: "🗺️",
        progress: Math.min(stats.uniqueWordsLearned, 20),
        maxProgress: 20,
        category: "exploration",
        earnedAt:
          stats.uniqueWordsLearned >= 20 ? new Date().toISOString() : undefined,
      },
      {
        id: "reading_champion",
        title: "Reading Champion",
        description: "Achieved 90% accuracy rate",
        earned: stats.accuracyRate >= 90,
        icon: "🏆",
        progress: Math.min(stats.accuracyRate, 90),
        maxProgress: 90,
        category: "accuracy",
        earnedAt:
          stats.accuracyRate >= 90 ? new Date().toISOString() : undefined,
      },
      {
        id: "daily_learner",
        title: "Daily Learner",
        description: "Practiced for 7 days in a row",
        earned: stats.currentStreak >= 7,
        icon: "📚",
        progress: Math.min(stats.currentStreak, 7),
        maxProgress: 7,
        category: "streak",
        earnedAt:
          stats.currentStreak >= 7 ? new Date().toISOString() : undefined,
      },
      {
        id: "word_master",
        title: "Word Master",
        description: "Mastered 50 words with high accuracy",
        earned: stats.masteredWords >= 50,
        icon: "🎓",
        progress: Math.min(stats.masteredWords, 50),
        maxProgress: 50,
        category: "exploration",
        earnedAt:
          stats.masteredWords >= 50 ? new Date().toISOString() : undefined,
      },
      {
        id: "time_champion",
        title: "Time Champion",
        description: "Practiced for over 5 hours total",
        earned: stats.totalTime >= 300, // 5 hours in minutes
        icon: "⏰",
        progress: Math.min(stats.totalTime, 300),
        maxProgress: 300,
        category: "practice",
        earnedAt: stats.totalTime >= 300 ? new Date().toISOString() : undefined,
      },
    ];
  };

  const fetchUserProgress = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check for level progression first
      await checkLevelProgression();

      // Fetch user profile stats
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "total_words_learned, total_practice_time, accuracy_rate, current_streak"
        )
        .eq("id", user.id)
        .single();

      // Fetch today's sessions count
      const today = new Date().toISOString().split("T")[0];
      const { data: todaySessions } = await supabase
        .from("learning_sessions")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", today + "T00:00:00.000Z")
        .lt("created_at", today + "T23:59:59.999Z");

      // Fetch session counts by type
      const { data: chatSessions } = await supabase
        .from("learning_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("session_type", "chat");

      const { data: practiceSessions } = await supabase
        .from("learning_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("session_type", "practice");

      // Fetch unique words learned
      const { data: wordProgress } = await supabase
        .from("word_progress")
        .select("word, mastery_level")
        .eq("user_id", user.id);

      // Calculate unique words and mastered words
      const uniqueWords = wordProgress?.length || 0;
      const masteredWords =
        wordProgress?.filter((w) => w.mastery_level >= 75).length || 0;

      // Fetch daily goals
      const { data: goals } = await supabase
        .from("daily_goals")
        .select("goal_type, target_value, current_value, completed")
        .eq("user_id", user.id)
        .eq("goal_date", today);

      // Fetch weekly progress (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const { data: sessions } = await supabase
        .from("learning_sessions")
        .select("created_at, words_practiced, session_duration")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString())
        .order("created_at", { ascending: true });

      // Fetch streak data (last 30 days)
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 29);
      const { data: streakSessions } = await supabase
        .from("learning_sessions")
        .select("created_at, words_practiced")
        .eq("user_id", user.id)
        .gte("created_at", monthAgo.toISOString())
        .order("created_at", { ascending: true });

      // Process weekly data
      const weeklyData = [];
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayName = days[date.getDay()];
        const dateStr = date.toISOString().split("T")[0];

        const daySessions =
          sessions?.filter((s) => s.created_at.startsWith(dateStr)) || [];

        const words = daySessions.reduce(
          (sum, s) => sum + (s.words_practiced?.length || 0),
          0
        );
        const time = Math.round(
          daySessions.reduce((sum, s) => sum + (s.session_duration || 0), 0) /
            60
        );

        weeklyData.push({ day: dayName, words, time });
      }

      // Process streak data
      const streakDataProcessed = [];
      const dailyWordGoal = settings?.daily_word_goal || 10;

      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStr = date.toISOString().split("T")[0];

        const daySessions =
          streakSessions?.filter((s) => s.created_at.startsWith(dateStr)) || [];

        const wordsLearned = daySessions.reduce(
          (sum, s) => sum + (s.words_practiced?.length || 0),
          0
        );
        const completed = wordsLearned >= dailyWordGoal;

        streakDataProcessed.push({
          date: dateStr,
          completed,
          wordsLearned,
        });
      }

      // Update user stats
      const newUserStats: UserStats = {
        totalWords: profile?.total_words_learned || 0,
        totalTime: Math.round((profile?.total_practice_time || 0) / 60), // Convert to minutes
        accuracyRate: profile?.accuracy_rate || 0,
        currentStreak: profile?.current_streak || 0,
        sessionsToday: todaySessions?.length || 0,
        chatSessions: chatSessions?.length || 0,
        practiceSessions: practiceSessions?.length || 0,
        uniqueWordsLearned: uniqueWords,
        masteredWords: masteredWords,
      };

      setUserStats(newUserStats);

      // Calculate achievements based on real data
      const calculatedAchievements = calculateAchievements(newUserStats);
      setAchievements(calculatedAchievements);

      setDailyGoals(goals || []);
      setWeeklyProgress(weeklyData);
      setStreakData(streakDataProcessed);
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProgress();
  };

  const maxWords = Math.max(...weeklyProgress.map((d) => d.words), 1);
  const earnedAchievements = achievements.filter((a) => a.earned).length;

  const getGoalByType = (type: "words" | "time" | "accuracy") => {
    return (
      dailyGoals.find((g) => g.goal_type === type) || {
        goal_type: type,
        target_value:
          type === "words"
            ? settings?.daily_word_goal || 10
            : type === "time"
            ? 30
            : 80,
        current_value: 0,
        completed: false,
      }
    );
  };

  const getStreakColor = (index: number) => {
    const dayData = streakData[index];
    if (!dayData) return "#E5E7EB";

    if (dayData.completed) {
      return "#10B981"; // Green for completed days
    } else if (dayData.wordsLearned > 0) {
      return "#F59E0B"; // Orange for partial progress
    } else {
      return "#E5E7EB"; // Gray for no activity
    }
  };

  const getAchievementCategoryIcon = (category: Achievement["category"]) => {
    switch (category) {
      case "milestone":
        return <Star size={16} color="#F59E0B" />;
      case "practice":
        return <Mic size={16} color="#10B981" />;
      case "streak":
        return <Flame size={16} color="#EF4444" />;
      case "accuracy":
        return <Target size={16} color="#6366F1" />;
      case "exploration":
        return <MapPin size={16} color="#EC4899" />;
      default:
        return <Award size={16} color="#6B7280" />;
    }
  };

  const renderStreakCalendar = () => {
    const weeks = [];
    const daysPerWeek = 7;
    const totalDays = 30;

    for (let week = 0; week < Math.ceil(totalDays / daysPerWeek); week++) {
      const weekDays = [];
      for (let day = 0; day < daysPerWeek; day++) {
        const dayIndex = week * daysPerWeek + day;
        if (dayIndex < totalDays) {
          const dayData = streakData[dayIndex];
          weekDays.push(
            <View
              key={dayIndex}
              style={[
                styles.streakDay,
                { backgroundColor: getStreakColor(dayIndex) },
              ]}
            />
          );
        }
      }
      weeks.push(
        <View key={week} style={styles.streakWeek}>
          {weekDays}
        </View>
      );
    }

    return weeks;
  };

  const renderLevelModal = () => {
    const levelColor = getLevelColor(currentLevel);
    const levelTitle = getLevelTitle(currentLevel);
    const levelIcon = getLevelIcon(currentLevel);

    return (
      <Modal
        visible={showLevelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLevelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.levelModalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLevelModal(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.levelModalHeader}>
              <Text style={styles.levelModalIcon}>{levelIcon}</Text>
              <Text style={styles.levelModalTitle}>Level {currentLevel}</Text>
              <Text style={styles.levelModalSubtitle}>{levelTitle}</Text>
            </View>

            <ScrollView
              style={styles.levelRequirements}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.requirementsTitle}>Level Requirements</Text>

              {LEVEL_REQUIREMENTS.slice(0, 10).map((requirement, index) => {
                const isCurrentLevel = requirement.level === currentLevel;
                const isCompleted = requirement.level < currentLevel;
                const isNext = requirement.level === currentLevel + 1;

                return (
                  <View
                    key={requirement.level}
                    style={[
                      styles.levelRequirement,
                      isCurrentLevel && styles.currentLevelRequirement,
                      isNext && styles.nextLevelRequirement,
                    ]}
                  >
                    <View style={styles.levelRequirementHeader}>
                      <View style={styles.levelRequirementLeft}>
                        <View
                          style={[
                            styles.levelRequirementBadge,
                            {
                              backgroundColor: isCompleted
                                ? "#10B981"
                                : isCurrentLevel
                                ? levelColor
                                : "#E5E7EB",
                            },
                          ]}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={16} color="#FFFFFF" />
                          ) : isCurrentLevel ? (
                            <Crown size={16} color="#FFFFFF" />
                          ) : (
                            <Text
                              style={[
                                styles.levelRequirementNumber,
                                { color: isNext ? "#6B7280" : "#9CA3AF" },
                              ]}
                            >
                              {requirement.level}
                            </Text>
                          )}
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.levelRequirementTitle,
                              isCurrentLevel && {
                                color: levelColor,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            Level {requirement.level}
                          </Text>
                          <Text style={styles.levelRequirementSubtitle}>
                            {getLevelTitle(requirement.level)}
                          </Text>
                        </View>
                      </View>
                      {isCurrentLevel && (
                        <View
                          style={[
                            styles.currentBadge,
                            { backgroundColor: levelColor },
                          ]}
                        >
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                      {isNext && (
                        <View style={styles.nextBadge}>
                          <Text style={styles.nextBadgeText}>Next</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.levelRequirementDetails}>
                      <View style={styles.requirementRow}>
                        <Target size={14} color="#6B7280" />
                        <Text style={styles.requirementDetailText}>
                          {requirement.minWordsLearned} words mastered
                        </Text>
                      </View>
                      <View style={styles.requirementRow}>
                        <TrendingUp size={14} color="#6B7280" />
                        <Text style={styles.requirementDetailText}>
                          {requirement.minAccuracy}% accuracy rate
                        </Text>
                      </View>
                      <View style={styles.requirementRow}>
                        <Flame size={14} color="#6B7280" />
                        <Text style={styles.requirementDetailText}>
                          {requirement.minStreakDays} day learning streak
                        </Text>
                      </View>
                      <View style={styles.requirementRow}>
                        <Clock size={14} color="#6B7280" />
                        <Text style={styles.requirementDetailText}>
                          {requirement.minPracticeTime} minutes practice time
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Progress</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <RefreshCw size={20} color="#4F46E5" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.levelBadge,
              { backgroundColor: getLevelColor(currentLevel) },
            ]}
            onPress={() => setShowLevelModal(true)}
          >
            <Trophy size={16} color="#FFFFFF" />
            <Text style={styles.levelText}>Lv.{currentLevel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Level Progress Card */}
        <LevelProgressCard onPress={() => setShowLevelModal(true)} />

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <BookOpen size={24} color="#4F46E5" />
            <Text style={styles.statNumber}>{userStats.totalWords}</Text>
            <Text style={styles.statLabel}>Total Words Learned</Text>
          </View>

          <View style={styles.statCard}>
            <Clock size={24} color="#10B981" />
            <Text style={styles.statNumber}>{userStats.totalTime}m</Text>
            <Text style={styles.statLabel}>Practice Time</Text>
          </View>

          <View style={styles.statCard}>
            <Target size={24} color="#EF4444" />
            <Text style={styles.statNumber}>
              {Math.round(userStats.accuracyRate)}%
            </Text>
            <Text style={styles.statLabel}>Accuracy Rate</Text>
          </View>
        </View>

        {/* Current Streak */}
        <View style={styles.streakContainer}>
          <View style={styles.streakHeader}>
            <Flame size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Learning Streak</Text>
          </View>

          <View style={styles.streakCard}>
            <View style={styles.streakMainInfo}>
              <Text style={styles.streakNumber}>{userStats.currentStreak}</Text>
              <Text style={styles.streakText}>Days in a row!</Text>
              <Text style={styles.streakMotivation}>
                {userStats.currentStreak > 0
                  ? "Keep it up! 🔥"
                  : "Start your streak today! 💪"}
              </Text>
            </View>

            <View style={styles.streakCalendar}>
              <Text style={styles.streakCalendarTitle}>Last 30 Days</Text>
              <View style={styles.streakGrid}>{renderStreakCalendar()}</View>
              <View style={styles.streakLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#10B981" }]}
                  />
                  <Text style={styles.legendText}>Goal reached</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#F59E0B" }]}
                  />
                  <Text style={styles.legendText}>Some progress</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#E5E7EB" }]}
                  />
                  <Text style={styles.legendText}>No activity</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Today's Activity */}
        <View style={styles.todayContainer}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.todayStats}>
            <View style={styles.todayStatItem}>
              <Text style={styles.todayStatNumber}>
                {userStats.sessionsToday}
              </Text>
              <Text style={styles.todayStatLabel}>Sessions</Text>
            </View>
            <View style={styles.todayStatItem}>
              <Text style={styles.todayStatNumber}>
                {userStats.currentStreak}
              </Text>
              <Text style={styles.todayStatLabel}>Day Streak</Text>
            </View>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Activity</Text>
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === "week" && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod("week")}
              >
                <Text
                  style={[
                    styles.periodText,
                    selectedPeriod === "week" && styles.periodTextActive,
                  ]}
                >
                  Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === "month" && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod("month")}
              >
                <Text
                  style={[
                    styles.periodText,
                    selectedPeriod === "month" && styles.periodTextActive,
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chart}>
            {weeklyProgress.map((day, index) => (
              <View key={index} style={styles.chartBar}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max((day.words / maxWords) * 100, 4) },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{day.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Daily Goals */}
        <View style={styles.goalsContainer}>
          <Text style={styles.sectionTitle}>Daily Goals</Text>

          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleContainer}>
                <Text style={styles.goalTitle}>Learn new words</Text>
                {getGoalByType("words").completed && (
                  <CheckCircle2 size={16} color="#10B981" />
                )}
              </View>
              <Text style={styles.goalProgress}>
                {getGoalByType("words").current_value}/
                {getGoalByType("words").target_value}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      (getGoalByType("words").current_value /
                        getGoalByType("words").target_value) *
                        100,
                      100
                    )}%`,
                    backgroundColor: getGoalByType("words").completed
                      ? "#10B981"
                      : "#4F46E5",
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleContainer}>
                <Text style={styles.goalTitle}>Practice time</Text>
                {getGoalByType("time").completed && (
                  <CheckCircle2 size={16} color="#10B981" />
                )}
              </View>
              <Text style={styles.goalProgress}>
                {getGoalByType("time").current_value}/
                {getGoalByType("time").target_value} min
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      (getGoalByType("time").current_value /
                        getGoalByType("time").target_value) *
                        100,
                      100
                    )}%`,
                    backgroundColor: getGoalByType("time").completed
                      ? "#10B981"
                      : "#4F46E5",
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleContainer}>
                <Text style={styles.goalTitle}>Accuracy target</Text>
                {getGoalByType("accuracy").completed && (
                  <CheckCircle2 size={16} color="#10B981" />
                )}
              </View>
              <Text style={styles.goalProgress}>
                {getGoalByType("accuracy").current_value}/
                {getGoalByType("accuracy").target_value}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      (getGoalByType("accuracy").current_value /
                        getGoalByType("accuracy").target_value) *
                        100,
                      100
                    )}%`,
                    backgroundColor: getGoalByType("accuracy").completed
                      ? "#10B981"
                      : "#4F46E5",
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Dynamic Achievements */}
        <View style={styles.achievementsContainer}>
          <View style={styles.sectionHeader}>
            <Award size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementCounter}>
              <Text style={styles.achievementCountText}>
                {earnedAchievements}/{achievements.length}
              </Text>
            </View>
          </View>

          <View style={styles.achievementsList}>
            {achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.earned && styles.achievementCardLocked,
                ]}
              >
                <View style={styles.achievementIconContainer}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <View style={styles.achievementCategory}>
                    {getAchievementCategoryIcon(achievement.category)}
                  </View>
                </View>
                <View style={styles.achievementContent}>
                  <Text
                    style={[
                      styles.achievementTitle,
                      !achievement.earned && styles.achievementTitleLocked,
                    ]}
                  >
                    {achievement.title}
                  </Text>
                  <Text
                    style={[
                      styles.achievementDescription,
                      !achievement.earned &&
                        styles.achievementDescriptionLocked,
                    ]}
                  >
                    {achievement.description}
                  </Text>

                  {/* Progress bar for achievements */}
                  <View style={styles.achievementProgressContainer}>
                    <View style={styles.achievementProgressBar}>
                      <View
                        style={[
                          styles.achievementProgressFill,
                          {
                            width: `${
                              (achievement.progress / achievement.maxProgress) *
                              100
                            }%`,
                            backgroundColor: achievement.earned
                              ? "#10B981"
                              : "#4F46E5",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.achievementProgressText}>
                      {achievement.progress}/{achievement.maxProgress}
                    </Text>
                  </View>
                </View>
                {achievement.earned && (
                  <View style={styles.earnedBadge}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {renderLevelModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
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
  } as ViewStyle,
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  } as ViewStyle,
  refreshButton: {
    padding: 8,
  } as ViewStyle,
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  } as ViewStyle,
  levelText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  } as ViewStyle,
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  } as ViewStyle,
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  streakContainer: {
    marginBottom: 24,
  } as ViewStyle,
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  } as ViewStyle,
  streakCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  streakMainInfo: {
    alignItems: "center",
    marginBottom: 24,
  } as ViewStyle,
  streakNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  streakText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#D97706",
  },
  streakMotivation: {
    fontSize: 16,
    color: "#92400E",
    marginTop: 4,
  },
  streakCalendar: {
    alignItems: "center",
  } as ViewStyle,
  streakCalendarTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  streakGrid: {
    flexDirection: "column",
    gap: 3,
  } as ViewStyle,
  streakWeek: {
    flexDirection: "row",
    gap: 3,
  } as ViewStyle,
  streakDay: {
    width: 12,
    height: 12,
    borderRadius: 2,
  } as ViewStyle,
  streakLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
  } as ViewStyle,
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  } as ViewStyle,
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  legendText: {
    fontSize: 12,
    color: "#6B7280",
  },
  todayContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  todayStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  } as ViewStyle,
  todayStatItem: {
    alignItems: "center",
  } as ViewStyle,
  todayStatNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4F46E5",
  },
  todayStatLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  } as ViewStyle,
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 2,
  } as ViewStyle,
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  } as ViewStyle,
  periodButtonActive: {
    backgroundColor: "#FFFFFF",
  } as ViewStyle,
  periodText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  periodTextActive: {
    color: "#1F2937",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 8,
  } as ViewStyle,
  chartBar: {
    flex: 1,
    alignItems: "center",
  } as ViewStyle,
  barContainer: {
    height: 100,
    justifyContent: "flex-end",
    width: "100%",
  } as ViewStyle,
  bar: {
    backgroundColor: "#4F46E5",
    borderRadius: 4,
    minHeight: 4,
  } as ViewStyle,
  dayLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
  achievementsContainer: {
    marginBottom: 24,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  achievementCounter: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: "auto",
  } as ViewStyle,
  achievementCountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D97706",
  },
  achievementsList: {
    gap: 12,
  } as ViewStyle,
  achievementCard: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  achievementCardLocked: {
    opacity: 0.6,
  } as ViewStyle,
  achievementIconContainer: {
    position: "relative",
    marginRight: 16,
  } as ViewStyle,
  achievementIcon: {
    fontSize: 24,
  },
  achievementCategory: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  achievementContent: {
    flex: 1,
  } as ViewStyle,
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: "#6B7280",
  },
  achievementDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  achievementDescriptionLocked: {
    color: "#9CA3AF",
  },
  achievementProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  achievementProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  } as ViewStyle,
  achievementProgressFill: {
    height: "100%",
    borderRadius: 2,
  } as ViewStyle,
  achievementProgressText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    minWidth: 30,
  },
  earnedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  goalsContainer: {
    marginBottom: 24,
  } as ViewStyle,
  goalCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  } as ViewStyle,
  goalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  goalTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  goalProgress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
  } as ViewStyle,
  progressFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  } as ViewStyle,
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  levelModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    position: "relative",
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  levelModalHeader: {
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  levelModalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  levelModalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  levelModalSubtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  levelRequirements: {
    flex: 1,
    padding: 20,
  },
  requirementsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  levelRequirement: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  currentLevelRequirement: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  nextLevelRequirement: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  levelRequirementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  levelRequirementLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelRequirementBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  levelRequirementNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  levelRequirementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  levelRequirementSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  nextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F59E0B",
  },
  nextBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  levelRequirementDetails: {
    gap: 8,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementDetailText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
