import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { GlobalSounds } from '@/components/SoundManager';

interface LevelRequirements {
  level: number;
  minWordsLearned: number;
  minAccuracy: number;
  minStreakDays: number;
  minPracticeTime: number; // in minutes
  specialRequirements?: string[];
}

const LEVEL_REQUIREMENTS: LevelRequirements[] = [
  {
    level: 1,
    minWordsLearned: 0,
    minAccuracy: 0,
    minStreakDays: 0,
    minPracticeTime: 0,
  },
  {
    level: 2,
    minWordsLearned: 25,
    minAccuracy: 60,
    minStreakDays: 3,
    minPracticeTime: 30,
    specialRequirements: ['Complete first chat session', 'Try pronunciation practice'],
  },
  {
    level: 3,
    minWordsLearned: 75,
    minAccuracy: 70,
    minStreakDays: 7,
    minPracticeTime: 90,
    specialRequirements: ['Master 10 easy words', 'Use app for 7 consecutive days'],
  },
  {
    level: 4,
    minWordsLearned: 150,
    minAccuracy: 75,
    minStreakDays: 14,
    minPracticeTime: 180,
    specialRequirements: ['Master 20 medium words', 'Achieve 80% accuracy in practice'],
  },
  {
    level: 5,
    minWordsLearned: 250,
    minAccuracy: 80,
    minStreakDays: 21,
    minPracticeTime: 300,
    specialRequirements: ['Master 15 hard words', 'Complete 50 practice sessions'],
  },
  {
    level: 6,
    minWordsLearned: 400,
    minAccuracy: 85,
    minStreakDays: 30,
    minPracticeTime: 480,
    specialRequirements: ['Master 30 hard words', 'Maintain 30-day streak'],
  },
  {
    level: 7,
    minWordsLearned: 600,
    minAccuracy: 88,
    minStreakDays: 45,
    minPracticeTime: 720,
    specialRequirements: ['Reading Champion achievement', 'Help others learn'],
  },
  {
    level: 8,
    minWordsLearned: 850,
    minAccuracy: 90,
    minStreakDays: 60,
    minPracticeTime: 1000,
    specialRequirements: ['Master 100 words total', 'Pronunciation expert'],
  },
  {
    level: 9,
    minWordsLearned: 1200,
    minAccuracy: 92,
    minStreakDays: 90,
    minPracticeTime: 1440,
    specialRequirements: ['Learning mentor', 'Advanced difficulty mastery'],
  },
  {
    level: 10,
    minWordsLearned: 1500,
    minAccuracy: 95,
    minStreakDays: 120,
    minPracticeTime: 2000,
    specialRequirements: ['Reading Buddy Master', 'Perfect pronunciation streak'],
  },
];

export function useLevelProgression() {
  const { user } = useAuth();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [progressToNextLevel, setProgressToNextLevel] = useState(0);
  const [nextLevelRequirements, setNextLevelRequirements] = useState<LevelRequirements | null>(null);
  const [loading, setLoading] = useState(false);

  // Memoize functions to prevent recreation on every render
  const getLevelIcon = useCallback((level: number): string => {
    const icons = ['🌱', '🌿', '🌳', '⭐', '🌟', '💫', '🏆', '👑', '💎', '🔥'];
    return icons[Math.min(level - 1, icons.length - 1)];
  }, []);

  const getLevelTitle = useCallback((level: number): string => {
    const titles = [
      'Beginner Reader',
      'Word Explorer',
      'Reading Sprout',
      'Pronunciation Pro',
      'Reading Star',
      'Word Wizard',
      'Reading Champion',
      'Pronunciation Master',
      'Reading Genius',
      'Reading Buddy Master'
    ];
    return titles[Math.min(level - 1, titles.length - 1)];
  }, []);

  const getLevelColor = useCallback((level: number): string => {
    const colors = [
      '#10B981', // Green
      '#3B82F6', // Blue
      '#8B5CF6', // Purple
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#EC4899', // Pink
      '#6366F1', // Indigo
      '#14B8A6', // Teal
      '#F97316', // Orange
      '#DC2626', // Dark Red
    ];
    return colors[Math.min(level - 1, colors.length - 1)];
  }, []);

  const updateUserLevel = useCallback(async (newLevel: number) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating user level:', error);
    }
  }, [user]);

  const awardLevelUpAchievement = useCallback(async (newLevel: number) => {
    if (!user) return;

    try {
      // Play celebration sound
      GlobalSounds.playSuccess();

      // Award level-up achievement
      await supabase
        .from('achievements')
        .insert({
          user_id: user.id,
          achievement_type: 'level_up',
          title: `Level ${newLevel} Reached!`,
          description: `Congratulations! You've advanced to Level ${newLevel}. Keep up the amazing work!`,
          icon: getLevelIcon(newLevel),
        });

      // Award special achievements for milestone levels
      if (newLevel === 5) {
        await supabase
          .from('achievements')
          .insert({
            user_id: user.id,
            achievement_type: 'milestone',
            title: 'Reading Star ⭐',
            description: 'You\'ve reached Level 5! You\'re becoming a reading expert!',
            icon: '⭐',
          });
      } else if (newLevel === 10) {
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
    } catch (error) {
      console.error('Error awarding level-up achievement:', error);
    }
  }, [user, getLevelIcon]);

  const calculateProgressToNextLevel = useCallback((
    current: {
      wordsLearned: number;
      accuracy: number;
      streak: number;
      practiceTime: number;
    },
    requirement: LevelRequirements
  ): number => {
    const progressMetrics = [
      Math.min(current.wordsLearned / requirement.minWordsLearned, 1),
      Math.min(current.accuracy / requirement.minAccuracy, 1),
      Math.min(current.streak / requirement.minStreakDays, 1),
      Math.min(current.practiceTime / requirement.minPracticeTime, 1),
    ];

    // Return the average progress across all metrics
    return Math.floor(progressMetrics.reduce((sum, metric) => sum + metric, 0) / progressMetrics.length * 100);
  }, []);

  const checkLevelProgression = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

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

      // Get session count
      const { data: sessions } = await supabase
        .from('learning_sessions')
        .select('id')
        .eq('user_id', user.id);

      const masteredWords = wordStats?.length || 0;
      const practiceTimeMinutes = Math.floor(profile.total_practice_time / 60);
      const sessionCount = sessions?.length || 0;

      // Calculate which level the user qualifies for
      let qualifiedLevel = 1;
      for (const requirement of LEVEL_REQUIREMENTS) {
        const meetsRequirements = 
          masteredWords >= requirement.minWordsLearned &&
          profile.accuracy_rate >= requirement.minAccuracy &&
          profile.current_streak >= requirement.minStreakDays &&
          practiceTimeMinutes >= requirement.minPracticeTime;

        if (meetsRequirements) {
          qualifiedLevel = requirement.level;
        } else {
          break;
        }
      }

      // Update level if user has progressed
      if (qualifiedLevel > profile.level) {
        await updateUserLevel(qualifiedLevel);
        await awardLevelUpAchievement(qualifiedLevel);
        setCurrentLevel(qualifiedLevel);
      } else {
        setCurrentLevel(profile.level);
      }

      // Calculate progress to next level
      const nextLevel = Math.min(qualifiedLevel + 1, LEVEL_REQUIREMENTS.length);
      const nextRequirement = LEVEL_REQUIREMENTS.find(r => r.level === nextLevel);
      
      if (nextRequirement) {
        const progress = calculateProgressToNextLevel(
          {
            wordsLearned: masteredWords,
            accuracy: profile.accuracy_rate,
            streak: profile.current_streak,
            practiceTime: practiceTimeMinutes,
          },
          nextRequirement
        );
        
        setProgressToNextLevel(progress);
        setNextLevelRequirements(nextRequirement);
      }

    } catch (error) {
      console.error('Error checking level progression:', error);
    } finally {
      setLoading(false);
    }
  }, [user, updateUserLevel, awardLevelUpAchievement, calculateProgressToNextLevel]);

  // Only run checkLevelProgression when user changes, not on every render
  useEffect(() => {
    if (user) {
      checkLevelProgression();
    }
  }, [user?.id]); // Only depend on user.id, not the entire user object

  return {
    currentLevel,
    progressToNextLevel,
    nextLevelRequirements,
    loading,
    checkLevelProgression,
    getLevelTitle,
    getLevelColor,
    getLevelIcon,
    LEVEL_REQUIREMENTS,
  };
}