import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Mic,
  MicOff,
  RotateCcw,
  CheckCircle,
  XCircle,
  Volume2,
  Trophy,
} from "lucide-react-native";
import * as Speech from "expo-speech";
import { useLearningSession } from "@/hooks/useLearningSession";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { GlobalSounds } from "@/components/SoundManager";

// Enhanced practice words with difficulty-based filtering
const practiceWords = [
  // Easy words (3-4 letters)
  { word: "cat", difficulty: "easy", phonetic: "kat" },
  { word: "dog", difficulty: "easy", phonetic: "dawg" },
  { word: "sun", difficulty: "easy", phonetic: "suhn" },
  { word: "book", difficulty: "easy", phonetic: "bʊk" },
  { word: "tree", difficulty: "easy", phonetic: "tree" },
  { word: "ball", difficulty: "easy", phonetic: "bawl" },
  { word: "fish", difficulty: "easy", phonetic: "fish" },
  { word: "bird", difficulty: "easy", phonetic: "burd" },

  // Medium words (5-7 letters)
  { word: "happy", difficulty: "medium", phonetic: "hap-ee" },
  { word: "friend", difficulty: "medium", phonetic: "frend" },
  { word: "school", difficulty: "medium", phonetic: "skool" },
  { word: "family", difficulty: "medium", phonetic: "fam-uh-lee" },
  { word: "garden", difficulty: "medium", phonetic: "gar-den" },
  { word: "window", difficulty: "medium", phonetic: "win-doh" },
  { word: "picture", difficulty: "medium", phonetic: "pik-cher" },
  { word: "kitchen", difficulty: "medium", phonetic: "kich-en" },

  // Hard words (8+ letters)
  { word: "beautiful", difficulty: "hard", phonetic: "byoo-tuh-fuhl" },
  { word: "wonderful", difficulty: "hard", phonetic: "wuhn-der-fuhl" },
  { word: "adventure", difficulty: "hard", phonetic: "ad-ven-cher" },
  { word: "butterfly", difficulty: "hard", phonetic: "but-er-fly" },
  { word: "telephone", difficulty: "hard", phonetic: "tel-uh-fohn" },
  { word: "computer", difficulty: "hard", phonetic: "kuhm-pyoo-ter" },
  { word: "elephant", difficulty: "hard", phonetic: "el-uh-fuhnt" },
  { word: "dinosaur", difficulty: "hard", phonetic: "dy-nuh-sawr" },
];

export default function PracticeScreen() {
  const { soundEnabled, speechRate, darkModeEnabled, difficultyLevel } =
    useSettingsContext();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
    null
  );
  const [score, setScore] = useState(0);
  const [recognition, setRecognition] = useState<any>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] =
    useState(false);
  const [filteredWords, setFilteredWords] = useState(practiceWords);
  const {
    startSession,
    addWordToSession,
    endSession,
    loading: sessionLoading,
  } = useLearningSession();

  const currentWord = filteredWords[currentWordIndex];

  useEffect(() => {
    // Filter words based on difficulty level
    const filtered = practiceWords.filter((word) => {
      switch (difficultyLevel) {
        case "beginner":
          return word.difficulty === "easy";
        case "intermediate":
          return word.difficulty === "easy" || word.difficulty === "medium";
        case "advanced":
          return true; // All difficulties
        default:
          return word.difficulty === "easy";
      }
    });

    setFilteredWords(filtered);
    setCurrentWordIndex(0); // Reset to first word when difficulty changes
  }, [difficultyLevel]);

  useEffect(() => {
    // Start a new practice session
    const session = startSession("practice");
    setCurrentSession(session);

    // Check speech recognition availability and setup
    setupSpeechRecognition();

    // End session when component unmounts
    return () => {
      if (session && session.wordsPracticed.length > 0) {
        endSession(session);
      }

      // Cleanup speech recognition
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
          console.log("Error stopping recognition:", error);
        }
      }
    };
  }, []);

  const setupSpeechRecognition = () => {
    if (Platform.OS === "web") {
      // Web Speech Recognition API
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition;
        const recognitionInstance = new SpeechRecognition();

        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = "en-US";
        recognitionInstance.maxAlternatives = 1;

        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
            .toLowerCase()
            .trim();
          console.log("Speech recognition result:", transcript);
          checkPronunciation(transcript);
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);

          let errorMessage = "Could not recognize speech. Please try again.";
          if (event.error === "not-allowed") {
            errorMessage =
              "Microphone access denied. Please allow microphone access and try again.";
          } else if (event.error === "no-speech") {
            errorMessage =
              "No speech detected. Please speak clearly and try again.";
          }

          Alert.alert("Speech Recognition Error", errorMessage);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        recognitionInstance.onstart = () => {
          console.log("Speech recognition started");
        };

        setRecognition(recognitionInstance);
        setSpeechRecognitionAvailable(true);
      } else {
        console.log("Speech recognition not supported in this browser");
        setSpeechRecognitionAvailable(false);
      }
    } else {
      // For mobile platforms, we'll use a different approach
      // Since Expo doesn't have built-in speech recognition, we'll simulate it
      // In a real app, you might use react-native-voice or similar
      setSpeechRecognitionAvailable(true);
    }
  };

  useEffect(() => {
    if (isListening) {
      // Pulse animation when listening
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isListening) pulse();
        });
      };
      pulse();
    }
  }, [isListening]);

  const startListening = async () => {
    if (!speechRecognitionAvailable) {
      Alert.alert(
        "Speech Recognition Unavailable",
        "Speech recognition is not available on this device. You can still practice by using the Chat tab to type words!",
        [{ text: "OK" }]
      );
      return;
    }

    if (Platform.OS === "web") {
      if (recognition) {
        try {
          setIsListening(true);
          setFeedback(null);
          GlobalSounds.playClick();
          recognition.start();
        } catch (error) {
          console.error("Error starting recognition:", error);
          setIsListening(false);
          Alert.alert(
            "Error",
            "Failed to start speech recognition. Please try again."
          );
        }
      }
    } else {
      // Mobile implementation - simulate speech recognition
      // In a real app, you would integrate with react-native-voice or similar
      setIsListening(true);
      setFeedback(null);
      GlobalSounds.playClick();

      // Simulate listening for 3 seconds, then provide feedback
      setTimeout(() => {
        // For demo purposes, randomly determine if pronunciation is correct
        const isCorrect = Math.random() > 0.3; // 70% success rate for demo
        const simulatedTranscript = isCorrect
          ? currentWord.word
          : "incorrect pronunciation";
        checkPronunciation(simulatedTranscript);
      }, 3000);
    }
  };

  const stopListening = () => {
    if (Platform.OS === "web" && recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
    setIsListening(false);
  };

  const checkPronunciation = (spokenText: string) => {
    const targetWord = currentWord.word.toLowerCase();
    const spokenWord = spokenText.toLowerCase().trim();

    // More flexible matching - check if the spoken word contains the target word
    // or if they're phonetically similar
    const isCorrect =
      spokenWord.includes(targetWord) ||
      targetWord.includes(spokenWord) ||
      calculateSimilarity(spokenWord, targetWord) > 0.7;

    setFeedback(isCorrect ? "correct" : "incorrect");
    setIsListening(false);

    // Play appropriate sound
    if (isCorrect) {
      GlobalSounds.playSuccess();
    } else {
      GlobalSounds.playError();
    }

    // Track the attempt in the learning session
    if (currentSession) {
      const updatedSession = addWordToSession(
        currentSession,
        currentWord.word,
        isCorrect,
        currentWord.difficulty as "easy" | "medium" | "hard"
      );
      setCurrentSession(updatedSession);
    }

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setTimeout(() => nextWord(), 2000);
    }
  };

  // Simple string similarity calculation
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  const nextWord = () => {
    setCurrentWordIndex((prev) => (prev + 1) % filteredWords.length);
    setFeedback(null);
  };

  const resetPractice = async () => {
    // Save current session if there's progress
    if (currentSession && currentSession.wordsPracticed.length > 0) {
      try {
        await endSession(currentSession);
        GlobalSounds.playSuccess();
        Alert.alert(
          "Progress Saved! 🎉",
          `Great practice session! You attempted ${
            currentSession.totalAttempts
          } words with ${Math.round(
            (currentSession.correctPronunciations /
              currentSession.totalAttempts) *
              100
          )}% accuracy.`,
          [{ text: "Continue Practicing!", style: "default" }]
        );
      } catch (error) {
        console.error("Error saving session:", error);
        GlobalSounds.playError();
      }
    }

    // Reset everything and start new session
    setCurrentWordIndex(0);
    setScore(0);
    setFeedback(null);
    const newSession = startSession("practice");
    setCurrentSession(newSession);
  };

  const speakWord = () => {
    if (!soundEnabled) return;

    if (Platform.OS === "web") {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.rate = speechRate;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      Speech.speak(currentWord.word, {
        rate: speechRate,
        pitch: 1.1,
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "#10B981";
      case "medium":
        return "#F59E0B";
      case "hard":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getDifficultyLabel = () => {
    switch (difficultyLevel) {
      case "beginner":
        return "Beginner";
      case "intermediate":
        return "Intermediate";
      case "advanced":
        return "Advanced";
      default:
        return "Beginner";
    }
  };

  const saveProgress = async () => {
    if (currentSession && currentSession.wordsPracticed.length > 0) {
      try {
        await endSession(currentSession);
        // Start a new session
        const newSession = startSession("practice");
        setCurrentSession(newSession);

        GlobalSounds.playSuccess();
        Alert.alert(
          "Progress Saved! 🏆",
          `Excellent work! You practiced ${
            currentSession.wordsPracticed.length
          } words with ${Math.round(
            (currentSession.correctPronunciations /
              currentSession.totalAttempts) *
              100
          )}% accuracy.`,
          [{ text: "Keep Practicing!", style: "default" }]
        );
      } catch (error) {
        GlobalSounds.playError();
        Alert.alert("Error", "Failed to save progress. Please try again.");
      }
    } else {
      Alert.alert("No Progress Yet", "Start practicing some words first!");
    }
  };

  if (!currentWord) {
    return (
      <SafeAreaView
        style={[styles.container, darkModeEnabled && styles.darkContainer]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[styles.loadingText, darkModeEnabled && styles.darkText]}
          >
            No words available for {getDifficultyLabel()} level.
          </Text>
          <Text
            style={[
              styles.loadingSubtext,
              darkModeEnabled && styles.darkSubText,
            ]}
          >
            Try changing your difficulty level in Settings.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, darkModeEnabled && styles.darkContainer]}
    >
      <View style={[styles.header, darkModeEnabled && styles.darkHeader]}>
        <View>
          <Text
            style={[styles.headerTitle, darkModeEnabled && styles.darkText]}
          >
            Pronunciation Practice
          </Text>
          <Text
            style={[
              styles.difficultyIndicator,
              darkModeEnabled && styles.darkSubText,
            ]}
          >
            {getDifficultyLabel()} Level • {filteredWords.length} words
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>Score: {score}</Text>
        </View>
      </View>

      {/* Session Progress */}
      {currentSession && currentSession.wordsPracticed.length > 0 && (
        <View
          style={[
            styles.sessionProgress,
            darkModeEnabled && styles.darkSessionProgress,
          ]}
        >
          <View style={styles.sessionStats}>
            <Text style={styles.sessionText}>
              📚 {currentSession.wordsPracticed.length} words • 🎯{" "}
              {currentSession.correctPronunciations}/
              {currentSession.totalAttempts} correct
            </Text>
          </View>
          <TouchableOpacity
            style={styles.saveProgressButton}
            onPress={saveProgress}
            disabled={sessionLoading}
          >
            <Trophy size={16} color="#FFFFFF" />
            <Text style={styles.saveProgressText}>
              {sessionLoading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        <View style={[styles.wordCard, darkModeEnabled && styles.darkWordCard]}>
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(currentWord.difficulty) },
            ]}
          >
            <Text style={styles.difficultyText}>{currentWord.difficulty}</Text>
          </View>

          <Text style={[styles.wordText, darkModeEnabled && styles.darkText]}>
            {currentWord.word}
          </Text>
          <Text
            style={[styles.phoneticText, darkModeEnabled && styles.darkSubText]}
          >
            /{currentWord.phonetic}/
          </Text>

          <TouchableOpacity
            style={[
              styles.hearWordButton,
              darkModeEnabled && styles.darkHearWordButton,
            ]}
            onPress={() => {
              GlobalSounds.playClick();
              speakWord();
            }}
          >
            <Volume2 size={24} color="#4F46E5" />
            <Text style={styles.hearWordText}>Hear the word</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.practiceArea}>
          <Text
            style={[
              styles.instructionText,
              darkModeEnabled && styles.darkSubText,
            ]}
          >
            {isListening
              ? Platform.OS === "web"
                ? "Listening... Say the word!"
                : "Listening... Speak clearly!"
              : "Tap the microphone and say the word"}
          </Text>

          {!speechRecognitionAvailable && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                💡 Speech recognition not available. Try the Chat tab to
                practice typing words!
              </Text>
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
                feedback === "correct" && styles.micButtonCorrect,
                feedback === "incorrect" && styles.micButtonIncorrect,
                !speechRecognitionAvailable && styles.micButtonDisabled,
              ]}
              onPress={isListening ? stopListening : startListening}
              disabled={feedback !== null || !speechRecognitionAvailable}
            >
              {isListening ? (
                <MicOff size={40} color="#FFFFFF" />
              ) : (
                <Mic size={40} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </Animated.View>

          {feedback && (
            <View style={styles.feedbackContainer}>
              {feedback === "correct" ? (
                <>
                  <CheckCircle size={32} color="#10B981" />
                  <Text style={[styles.feedbackText, styles.correctText]}>
                    Great job! 🎉
                  </Text>
                </>
              ) : (
                <>
                  <XCircle size={32} color="#EF4444" />
                  <Text style={[styles.feedbackText, styles.incorrectText]}>
                    Try again! 💪
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              darkModeEnabled && styles.darkControlButton,
            ]}
            onPress={() => {
              GlobalSounds.playClick();
              nextWord();
            }}
          >
            <Text
              style={[
                styles.controlButtonText,
                darkModeEnabled && styles.darkText,
              ]}
            >
              Skip Word
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              GlobalSounds.playClick();
              resetPractice();
            }}
          >
            <RotateCcw size={20} color="#6B7280" />
            <Text style={styles.resetButtonText}>New Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <Text
            style={[styles.progressText, darkModeEnabled && styles.darkSubText]}
          >
            Word {currentWordIndex + 1} of {filteredWords.length}
          </Text>
          <View
            style={[
              styles.progressBar,
              darkModeEnabled && styles.darkProgressBar,
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((currentWordIndex + 1) / filteredWords.length) * 100
                  }%`,
                },
              ]}
            />
          </View>
        </View>
      </View>
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
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
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
  difficultyIndicator: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  darkText: {
    color: "#F9FAFB",
  },
  darkSubText: {
    color: "#D1D5DB",
  },
  scoreContainer: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  sessionProgress: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#BBF7D0",
  },
  darkSessionProgress: {
    backgroundColor: "#374151",
    borderBottomColor: "#4B5563",
  },
  sessionStats: {
    flex: 1,
  },
  sessionText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "500",
  },
  saveProgressButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  saveProgressText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  wordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  darkWordCard: {
    backgroundColor: "#374151",
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  difficultyText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  wordText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  phoneticText: {
    fontSize: 18,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 20,
  },
  hearWordButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  darkHearWordButton: {
    backgroundColor: "#4B5563",
  },
  hearWordText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  practiceArea: {
    alignItems: "center",
    marginBottom: 30,
  },
  instructionText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  warningContainer: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningText: {
    color: "#92400E",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  micButtonCorrect: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  micButtonIncorrect: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  micButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowColor: "#9CA3AF",
  },
  feedbackContainer: {
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: "600",
  },
  correctText: {
    color: "#10B981",
  },
  incorrectText: {
    color: "#EF4444",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  controlButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  darkControlButton: {
    backgroundColor: "#4B5563",
    borderColor: "#6B7280",
  },
  controlButtonText: {
    color: "#374151",
    fontWeight: "500",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resetButtonText: {
    color: "#6B7280",
    fontWeight: "500",
  },
  progressContainer: {
    alignItems: "center",
  },
  progressText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
  },
  darkProgressBar: {
    backgroundColor: "#4B5563",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  },
});
