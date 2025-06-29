import { useEffect } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { useSettingsContext } from "@/contexts/SettingsContext";

interface SoundManagerProps {
  children: React.ReactNode;
}

export function SoundManager({ children }: SoundManagerProps) {
  const { soundEnabled, speechRate } = useSettingsContext();

  // Global sound management functions
  const playSound = (
    soundType: "success" | "error" | "click" | "notification"
  ) => {
    if (!soundEnabled) return;

    if (Platform.OS === "web") {
      // Web audio implementation
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      const frequencies = {
        success: [523, 659, 784], // C, E, G
        error: [392, 311], // G, Eb
        click: [800], // High click
        notification: [523, 659], // C, E
      };

      const freq = frequencies[soundType];
      freq.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime
        );
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(
          0.1,
          audioContext.currentTime + 0.01
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + 0.3
        );

        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + 0.3 + index * 0.1);
      });
    }
    // For mobile platforms, you could use expo-av or other audio libraries
  };

  const speakText = async (
    text: string,
    options?: { rate?: number; pitch?: number }
  ) => {
    if (!soundEnabled) return;

    const speechOptions = {
      rate: options?.rate || speechRate,
      pitch: options?.pitch || 1.0,
    };

    if (Platform.OS === "web") {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechOptions.rate;
        utterance.pitch = speechOptions.pitch;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      await Speech.speak(text, speechOptions);
    }
  };

  // Make sound functions globally available
  useEffect(() => {
    (global as any).playSound = playSound;
    (global as any).speakText = speakText;

    return () => {
      delete (global as any).playSound;
      delete (global as any).speakText;
    };
  }, [soundEnabled, speechRate]);

  return <>{children}</>;
}

// Global sound utility functions
export const GlobalSounds = {
  playSuccess: () => (global as any).playSound?.("success"),
  playError: () => (global as any).playSound?.("error"),
  playClick: () => (global as any).playSound?.("click"),
  playNotification: () => (global as any).playSound?.("notification"),
  speak: (text: string, options?: { rate?: number; pitch?: number }) =>
    (global as any).speakText?.(text, options),
};
