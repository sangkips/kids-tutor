import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { TrendingUp, Star, Target, Clock, Award } from "lucide-react-native";
import { useLevelProgression } from "@/hooks/useLevelProgression";

interface LevelProgressCardProps {
  onPress?: () => void;
  compact?: boolean;
}

export default function LevelProgressCard({
  onPress,
  compact = false,
}: LevelProgressCardProps) {
  const {
    currentLevel,
    progressToNextLevel,
    nextLevelRequirements,
    getLevelTitle,
    getLevelColor,
    getLevelIcon,
  } = useLevelProgression();

  const levelColor = getLevelColor(currentLevel);
  const levelTitle = getLevelTitle(currentLevel);
  const levelIcon = getLevelIcon(currentLevel);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress}>
        <View style={styles.compactHeader}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelBadgeText}>Lv.{currentLevel}</Text>
          </View>
          <Text style={styles.compactTitle}>{levelTitle}</Text>
        </View>
        <View style={styles.compactProgress}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressToNextLevel}%`,
                  backgroundColor: levelColor,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progressToNextLevel}%</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.levelInfo}>
          <Text style={styles.levelIcon}>{levelIcon}</Text>
          <View>
            <Text style={styles.levelNumber}>Level {currentLevel}</Text>
            <Text style={styles.levelTitle}>{levelTitle}</Text>
          </View>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Award size={16} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            Progress to Level {currentLevel + 1}
          </Text>
          <Text style={[styles.progressPercentage, { color: levelColor }]}>
            {progressToNextLevel}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressToNextLevel}%`, backgroundColor: levelColor },
            ]}
          />
        </View>
      </View>

      {nextLevelRequirements && (
        <View style={styles.requirementsSection}>
          <Text style={styles.requirementsTitle}>Next Level Requirements:</Text>
          <View style={styles.requirementsList}>
            <View style={styles.requirement}>
              <Target size={14} color="#6B7280" />
              <Text style={styles.requirementText}>
                {nextLevelRequirements.minWordsLearned} words mastered
              </Text>
            </View>
            <View style={styles.requirement}>
              <TrendingUp size={14} color="#6B7280" />
              <Text style={styles.requirementText}>
                {nextLevelRequirements.minAccuracy}% accuracy
              </Text>
            </View>
            <View style={styles.requirement}>
              <Star size={14} color="#6B7280" />
              <Text style={styles.requirementText}>
                {nextLevelRequirements.minStreakDays} day streak
              </Text>
            </View>
            <View style={styles.requirement}>
              <Clock size={14} color="#6B7280" />
              <Text style={styles.requirementText}>
                {nextLevelRequirements.minPracticeTime} minutes practice
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  levelInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  levelTitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 2,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 12,
    flex: 1,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  levelBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  progressSection: {
    marginBottom: 20,
  },
  compactProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    flex: 1,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  requirementsSection: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  requirementsList: {
    gap: 8,
  },
  requirement: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
