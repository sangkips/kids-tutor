import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { useAuth } from './useAuth';
import { useSettings } from './useSettings';

type LearningSession = Database['public']['Tables']['learning_sessions']['Insert'];

export function useLearningSession() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);

  const startSession = (sessionType: 'chat' | 'practice') => {
    return {
      sessionType,
      startTime: Date.now(),
      wordsPracticed: [] as string[],
      correctPronunciations: 0,
      totalAttempts: 0,
    };
  };

  const addWordToSession = (
    session: any,
    word: string,
    isCorrect: boolean,
    difficulty: 'easy' | 'medium' | 'hard' = 'easy'
  ) => {
    const updatedSession = {
      ...session,
      wordsPracticed: [...session.wordsPracticed, word],
      totalAttempts: session.totalAttempts + 1,
      correctPronunciations: session.correctPronunciations + (isCorrect ? 1 : 0),
    };

    // Update word progress in real-time
    if (user) {
      updateWordProgress(word, difficulty, isCorrect);
    }

    return updatedSession;
  };

  const endSession = async (session: any) => {
    if (!user) return { error: new Error('No user') };

    setLoading(true);
    try {
      const sessionDuration = Math.floor((Date.now() - session.startTime) / 1000);
      const accuracyRate = session.totalAttempts > 0 
        ? (session.correctPronunciations / session.totalAttempts) * 100 
        : 0;

      const sessionData: LearningSession = {
        user_id: user.id,
        session_type: session.sessionType,
        words_practiced: session.wordsPracticed,
        correct_pronunciations: session.correctPronunciations,
        total_attempts: session.totalAttempts,
        session_duration: sessionDuration,
        accuracy_rate: accuracyRate,
      };

      const { data, error } = await supabase
        .from('learning_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      // Update user statistics
      await updateUserStats(
        session.wordsPracticed.length,
        sessionDuration,
        accuracyRate
      );

      // Update daily goals
      await updateDailyGoals(session.wordsPracticed.length, sessionDuration, accuracyRate);

      // Update streak
      await updateStreak(session.wordsPracticed.length);

      // Check for level progression after session
      await checkLevelProgression(session.wordsPracticed.length, accuracyRate);

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const updateWordProgress = async (
    word: string,
    difficulty: 'easy' | 'medium' | 'hard',
    isCorrect: boolean
  ) => {
    if (!user) return;

    try {
      await supabase.rpc('update_word_progress', {
        p_user_id: user.id,
        p_word: word.toLowerCase(),
        p_difficulty: difficulty,
        p_correct: isCorrect,
      });
    } catch (error) {
      console.error('Error updating word progress:', error);
    }
  };

  const updateUserStats = async (
    wordsLearned: number,
    practiceTime: number,
    accuracy: number
  ) => {
    if (!user) return;

    try {
      await supabase.rpc('update_user_stats', {
        p_user_id: user.id,
        p_words_learned: wordsLearned,
        p_practice_time: practiceTime,
        p_accuracy: accuracy,
      });
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  const updateStreak = async (wordsLearned: number) => {
    if (!user || !settings) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyGoal = settings.daily_word_goal || 10;

      // Check if user has reached their daily goal
      const { data: todayGoal } = await supabase
        .from('daily_goals')
        .select('current_value')
        .eq('user_id', user.id)
        .eq('goal_type', 'words')
        .eq('goal_date', today)
        .single();

      const totalWordsToday = (todayGoal?.current_value || 0) + wordsLearned;

      if (totalWordsToday >= dailyGoal) {
        // User reached their goal, update streak
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_streak, longest_streak')
          .eq('id', user.id)
          .single();

        if (profile) {
          const newStreak = profile.current_streak + 1;
          const newLongestStreak = Math.max(newStreak, profile.longest_streak);

          await supabase
            .from('profiles')
            .update({
              current_streak: newStreak,
              longest_streak: newLongestStreak,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        }
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const checkLevelProgression = async (wordsLearned: number, sessionAccuracy: number) => {
    if (!user) return;

    try {
      // Get current user stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // Get word mastery stats
      const { data: wordStats } = await supabase
        .from('word_progress')
        .select('mastery_level, difficulty')
        .eq('user_id', user.id)
        .gte('mastery_level', 75); // Consider 75%+ as "mastered"

      const masteredWords = wordStats?.length || 0;
      const practiceTimeMinutes = Math.floor(profile.total_practice_time / 60);

      // Define level requirements
      const levelRequirements = [
        { level: 1, words: 0, accuracy: 0, streak: 0, time: 0 },
        { level: 2, words: 25, accuracy: 60, streak: 3, time: 30 },
        { level: 3, words: 75, accuracy: 70, streak: 7, time: 90 },
        { level: 4, words: 150, accuracy: 75, streak: 14, time: 180 },
        { level: 5, words: 250, accuracy: 80, streak: 21, time: 300 },
        { level: 6, words: 400, accuracy: 85, streak: 30, time: 480 },
        { level: 7, words: 600, accuracy: 88, streak: 45, time: 720 },
        { level: 8, words: 850, accuracy: 90, streak: 60, time: 1000 },
        { level: 9, words: 1200, accuracy: 92, streak: 90, time: 1440 },
        { level: 10, words: 1500, accuracy: 95, streak: 120, time: 2000 },
      ];

      // Calculate which level the user qualifies for
      let qualifiedLevel = 1;
      for (const requirement of levelRequirements) {
        const meetsRequirements = 
          masteredWords >= requirement.words &&
          profile.accuracy_rate >= requirement.accuracy &&
          profile.current_streak >= requirement.streak &&
          practiceTimeMinutes >= requirement.time;

        if (meetsRequirements) {
          qualifiedLevel = requirement.level;
        } else {
          break;
        }
      }

      // Update level if user has progressed
      if (qualifiedLevel > profile.level) {
        await supabase
          .from('profiles')
          .update({ 
            level: qualifiedLevel,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        // Award level-up achievement
        await supabase
          .from('achievements')
          .insert({
            user_id: user.id,
            achievement_type: 'level_up',
            title: `Level ${qualifiedLevel} Reached!`,
            description: `Congratulations! You've advanced to Level ${qualifiedLevel}. Keep up the amazing work!`,
            icon: getLevelIcon(qualifiedLevel),
          });

        // Award special milestone achievements
        if (qualifiedLevel === 5) {
          await supabase
            .from('achievements')
            .insert({
              user_id: user.id,
              achievement_type: 'milestone',
              title: 'Reading Star ⭐',
              description: 'You\'ve reached Level 5! You\'re becoming a reading expert!',
              icon: '⭐',
            });
        } else if (qualifiedLevel === 10) {
          await supabase
            .from('achievements')
            .insert({
              user_id: user.id,
              achievement_type: 'milestone',
              title: 'Reading Buddy Master 🏆',
              description: 'Amazing! You\'ve reached the highest level! You\'re a true reading champion!',
              icon: '🏆',
            });
        }
      }
    } catch (error) {
      console.error('Error checking level progression:', error);
    }
  };

  const getLevelIcon = (level: number): string => {
    const icons = ['🌱', '🌿', '🌳', '⭐', '🌟', '💫', '🏆', '👑', '💎', '🔥'];
    return icons[Math.min(level - 1, icons.length - 1)];
  };

  const updateDailyGoals = async (
    wordsLearned: number,
    practiceTime: number,
    accuracy: number
  ) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // First, get current values for each goal type
      const { data: currentGoals } = await supabase
        .from('daily_goals')
        .select('goal_type, current_value, target_value')
        .eq('user_id', user.id)
        .eq('goal_date', today);

      // Update words goal - increment current value
      const wordsGoal = currentGoals?.find(g => g.goal_type === 'words');
      if (wordsGoal) {
        const newValue = wordsGoal.current_value + wordsLearned;
        await supabase
          .from('daily_goals')
          .update({
            current_value: newValue,
            completed: newValue >= wordsGoal.target_value,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('goal_type', 'words')
          .eq('goal_date', today);
      }

      // Update time goal - increment current value (convert seconds to minutes)
      const timeGoal = currentGoals?.find(g => g.goal_type === 'time');
      if (timeGoal) {
        const newValue = timeGoal.current_value + Math.floor(practiceTime / 60);
        await supabase
          .from('daily_goals')
          .update({
            current_value: newValue,
            completed: newValue >= timeGoal.target_value,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('goal_type', 'time')
          .eq('goal_date', today);
      }

      // Update accuracy goal - take the better of current or new accuracy
      const accuracyGoal = currentGoals?.find(g => g.goal_type === 'accuracy');
      if (accuracyGoal) {
        const newValue = Math.max(accuracyGoal.current_value, Math.floor(accuracy));
        await supabase
          .from('daily_goals')
          .update({
            current_value: newValue,
            completed: newValue >= accuracyGoal.target_value,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('goal_type', 'accuracy')
          .eq('goal_date', today);
      }

      // If goals don't exist for today, create them
      if (!currentGoals || currentGoals.length === 0) {
        const defaultGoals = [
          {
            user_id: user.id,
            goal_type: 'words' as const,
            target_value: settings?.daily_word_goal || 10,
            current_value: wordsLearned,
            goal_date: today,
            completed: wordsLearned >= (settings?.daily_word_goal || 10),
          },
          {
            user_id: user.id,
            goal_type: 'time' as const,
            target_value: 30,
            current_value: Math.floor(practiceTime / 60),
            goal_date: today,
            completed: Math.floor(practiceTime / 60) >= 30,
          },
          {
            user_id: user.id,
            goal_type: 'accuracy' as const,
            target_value: 80,
            current_value: Math.floor(accuracy),
            goal_date: today,
            completed: Math.floor(accuracy) >= 80,
          },
        ];

        await supabase.from('daily_goals').insert(defaultGoals);
      }
    } catch (error) {
      console.error('Error updating daily goals:', error);
    }
  };

  return {
    loading,
    startSession,
    addWordToSession,
    endSession,
  };
}