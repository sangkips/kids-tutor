import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Volume2, Star, Heart } from "lucide-react-native";
import * as Speech from "expo-speech";
import { useLearningSession } from "@/hooks/useLearningSession";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useLevelProgression } from "@/hooks/useLevelProgression";
import { GlobalSounds } from "@/components/SoundManager";
import LevelProgressCard from "@/components/LevelProgressCard";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  pronunciation?: string;
}

export default function ChatScreen() {
  const { soundEnabled, speechRate, darkModeEnabled } = useSettingsContext();
  const { currentLevel, getLevelTitle } = useLevelProgression();

  // Initialize messages with a stable reference
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "1",
      text: "Hi there! I'm your reading buddy! 🌟 Type any word and I'll help you learn how to say it correctly!",
      isUser: false,
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const {
    startSession,
    addWordToSession,
    endSession,
    loading: sessionLoading,
  } = useLearningSession();

  const starWords = [
    "cat",
    "dog",
    "sun",
    "book",
    "happy",
    "play",
    "friend",
    "smile",
  ];

  useEffect(() => {
    // Start a new learning session when component mounts
    const session = startSession("chat");
    setCurrentSession(session);

    // Bounce animation for the mascot
    const bounce = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(bounce, 3000);
      });
    };
    bounce();

    // End session when component unmounts
    return () => {
      if (session && session.wordsPracticed.length > 0) {
        endSession(session);
      }
    };
  }, []);

  // Update welcome message when level changes - use useEffect with proper dependencies
  useEffect(() => {
    const levelTitle = getLevelTitle(currentLevel);
    const newWelcomeText = `Hi there! I'm your reading buddy! 🌟 You're currently at ${levelTitle}. Type any word and I'll help you learn how to say it correctly!`;

    setMessages((prev) => {
      // Only update if the first message text is different
      if (prev[0] && prev[0].text !== newWelcomeText) {
        return prev.map((msg, index) =>
          index === 0 ? { ...msg, text: newWelcomeText } : msg
        );
      }
      return prev;
    });
  }, [currentLevel, getLevelTitle]);

  const speakText = async (text: string) => {
    if (!soundEnabled) return;

    if (Platform.OS === "web") {
      // Web Speech API
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechRate;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      // Expo Speech for mobile
      await Speech.speak(text, {
        rate: speechRate,
        pitch: 1.2,
      });
    }
  };

  const getDifficulty = (word: string): "easy" | "medium" | "hard" => {
    if (word.length <= 3) return "easy";
    if (word.length <= 6) return "medium";
    return "hard";
  };

  const generateResponse = (word: string): string => {
    const cleanWord = word.toLowerCase().trim();

    if (starWords.includes(cleanWord)) {
      return `Wow! "${cleanWord}" is one of my favorite words! 🌟 You're doing amazing! Let me say it for you.`;
    }

    if (cleanWord.length <= 3) {
      return `Great choice! "${cleanWord}" is a short and sweet word! 😊 Listen carefully to how I say it.`;
    } else if (cleanWord.length <= 6) {
      return `Nice word! "${cleanWord}" has ${cleanWord.length} letters. 📚 Here's how it sounds.`;
    } else {
      return `Excellent! "${cleanWord}" is a big word with ${cleanWord.length} letters! 🎉 You're becoming a great reader!`;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Play click sound
    GlobalSounds.playClick();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Track the word in the learning session
    const word = inputText.toLowerCase().trim();
    const difficulty = getDifficulty(word);

    if (currentSession) {
      const updatedSession = addWordToSession(
        currentSession,
        word,
        true,
        difficulty
      );
      setCurrentSession(updatedSession);
    }

    // Simulate AI processing
    setTimeout(async () => {
      const responseText = generateResponse(inputText);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
        pronunciation: inputText.toLowerCase().trim(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);

      // Play success sound
      GlobalSounds.playSuccess();

      // Auto-speak the word after response
      setTimeout(() => {
        speakText(inputText);
      }, 1000);
    }, 1500);

    setInputText("");
  };

  const handleQuickWord = (word: string) => {
    setInputText(word);
    // Auto-send the quick word
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  const saveProgress = async () => {
    if (currentSession && currentSession.wordsPracticed.length > 0) {
      try {
        await endSession(currentSession);
        // Start a new session
        const newSession = startSession("chat");
        setCurrentSession(newSession);

        GlobalSounds.playSuccess();
        Alert.alert(
          "Progress Saved! 🎉",
          `Great job! You practiced ${
            currentSession.wordsPracticed.length
          } words with ${Math.round(
            (currentSession.correctPronunciations /
              currentSession.totalAttempts) *
              100
          )}% accuracy.`,
          [{ text: "Keep Learning!", style: "default" }]
        );
      } catch (error) {
        GlobalSounds.playError();
        Alert.alert("Error", "Failed to save progress. Please try again.");
      }
    } else {
      Alert.alert("No Progress Yet", "Start practicing some words first!");
    }
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage,
      ]}
    >
      {!message.isUser && (
        <Animated.View
          style={[styles.mascot, { transform: [{ scale: bounceAnim }] }]}
        >
          <Text style={styles.mascotEmoji}>🤖</Text>
        </Animated.View>
      )}
      <View
        style={[
          styles.messageBubble,
          message.isUser ? styles.userBubble : styles.aiBubble,
          darkModeEnabled &&
            (message.isUser ? styles.darkUserBubble : styles.darkAiBubble),
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.isUser ? styles.userText : styles.aiText,
            darkModeEnabled && styles.darkText,
          ]}
        >
          {message.text}
        </Text>
        {message.pronunciation && (
          <TouchableOpacity
            style={[
              styles.speakButton,
              darkModeEnabled && styles.darkSpeakButton,
            ]}
            onPress={() => {
              GlobalSounds.playClick();
              speakText(message.pronunciation!);
            }}
          >
            <Volume2 size={16} color="#4F46E5" />
            <Text style={styles.speakButtonText}>Hear it again!</Text>
          </TouchableOpacity>
        )}
      </View>
      {message.isUser && (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>👦</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, darkModeEnabled && styles.darkContainer]}
    >
      <View style={[styles.header, darkModeEnabled && styles.darkHeader]}>
        <Text style={[styles.headerTitle, darkModeEnabled && styles.darkText]}>
          Reading Buddy
        </Text>
        <View style={styles.headerStats}>
          <Star size={20} color="#F59E0B" fill="#F59E0B" />
          <Text style={[styles.statsText, darkModeEnabled && styles.darkText]}>
            Level {currentLevel}
          </Text>
          <Heart size={20} color="#EF4444" fill="#EF4444" />
          <Text style={[styles.statsText, darkModeEnabled && styles.darkText]}>
            {currentSession ? currentSession.wordsPracticed.length : 0}
          </Text>
        </View>
      </View>

      {/* Level Progress Card */}
      <LevelProgressCard compact={true} />

      {/* Progress indicator */}
      {currentSession && currentSession.wordsPracticed.length > 0 && (
        <View
          style={[
            styles.progressIndicator,
            darkModeEnabled && styles.darkProgressIndicator,
          ]}
        >
          <Text style={styles.progressText}>
            📚 {currentSession.wordsPracticed.length} words practiced this
            session
          </Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveProgress}
            disabled={sessionLoading}
          >
            <Text style={styles.saveButtonText}>
              {sessionLoading ? "Saving..." : "Save Progress"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map(renderMessage)}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text
              style={[styles.loadingText, darkModeEnabled && styles.darkText]}
            >
              Your reading buddy is thinking... 🤔
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.inputContainer,
          darkModeEnabled && styles.darkInputContainer,
        ]}
      >
        <View style={styles.quickWords}>
          <Text
            style={[styles.quickWordsLabel, darkModeEnabled && styles.darkText]}
          >
            Try these words:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {starWords.slice(0, 4).map((word) => (
              <TouchableOpacity
                key={word}
                style={[
                  styles.quickWordButton,
                  darkModeEnabled && styles.darkQuickWordButton,
                ]}
                onPress={() => {
                  GlobalSounds.playClick();
                  handleQuickWord(word);
                }}
              >
                <Text
                  style={[
                    styles.quickWordText,
                    darkModeEnabled && styles.darkText,
                  ]}
                >
                  {word}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, darkModeEnabled && styles.darkTextInput]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a word to learn..."
            placeholderTextColor={darkModeEnabled ? "#9CA3AF" : "#6B7280"}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Send size={20} color={inputText.trim() ? "#FFFFFF" : "#9CA3AF"} />
          </TouchableOpacity>
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
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginRight: 8,
  },
  progressIndicator: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#C7D2FE",
  },
  darkProgressIndicator: {
    backgroundColor: "#4B5563",
    borderBottomColor: "#6B7280",
  },
  progressText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
    flex: 1,
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  aiMessage: {
    justifyContent: "flex-start",
  },
  mascot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mascotEmoji: {
    fontSize: 20,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  userAvatarText: {
    fontSize: 20,
  },
  messageBubble: {
    maxWidth: "70%",
    padding: 16,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#4F46E5",
    borderBottomRightRadius: 4,
  },
  darkUserBubble: {
    backgroundColor: "#6366F1",
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  darkAiBubble: {
    backgroundColor: "#374151",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  aiText: {
    color: "#374151",
  },
  speakButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    gap: 6,
  },
  darkSpeakButton: {
    backgroundColor: "#4B5563",
  },
  speakButtonText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "flex-start",
    marginBottom: 16,
  },
  loadingText: {
    color: "#6B7280",
    fontStyle: "italic",
    fontSize: 16,
  },
  inputContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  darkInputContainer: {
    backgroundColor: "#374151",
    borderTopColor: "#4B5563",
  },
  quickWords: {
    marginBottom: 16,
  },
  quickWordsLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  quickWordButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  darkQuickWordButton: {
    backgroundColor: "#4B5563",
    borderColor: "#6B7280",
  },
  quickWordText: {
    color: "#374151",
    fontWeight: "500",
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textInput: {
    flex: 1,
    height: 50,
    backgroundColor: "#F9FAFB",
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  darkTextInput: {
    backgroundColor: "#4B5563",
    borderColor: "#6B7280",
    color: "#F9FAFB",
  },
  sendButton: {
    width: 50,
    height: 50,
    backgroundColor: "#4F46E5",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
});
