import { useState, useEffect, useRef } from "react";
import { Platform, Alert } from "react-native";

interface SpeechRecognitionHookProps {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

export function useSpeechRecognition({
  onResult,
  onError,
  language = "en-US",
}: SpeechRecognitionHookProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      // Check for Web Speech API support
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
            .toLowerCase()
            .trim();
          onResult(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);

          let errorMessage = "Speech recognition failed. Please try again.";

          switch (event.error) {
            case "not-allowed":
              errorMessage =
                "Microphone access denied. Please allow microphone access in your browser settings.";
              break;
            case "no-speech":
              errorMessage =
                "No speech detected. Please speak clearly and try again.";
              break;
            case "audio-capture":
              errorMessage =
                "No microphone found. Please check your microphone connection.";
              break;
            case "network":
              errorMessage =
                "Network error occurred. Please check your internet connection.";
              break;
            case "aborted":
              errorMessage = "Speech recognition was aborted.";
              break;
            case "bad-grammar":
              errorMessage = "Speech recognition grammar error.";
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
          }

          onError?.(errorMessage);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onstart = () => {
          console.log("Speech recognition started");
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
        console.log("Speech recognition not supported in this browser");
      }
    } else {
      // For mobile platforms, we could integrate with react-native-voice
      // For now, we'll mark it as not supported
      setIsSupported(false);
      console.log("Speech recognition not implemented for mobile platforms");
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log("Error stopping recognition:", error);
        }
      }
    };
  }, [language, onResult, onError]);

  const startListening = async () => {
    if (!isSupported) {
      onError?.("Speech recognition is not supported on this device.");
      return false;
    }

    if (isListening) {
      return false;
    }

    try {
      if (Platform.OS === "web" && recognitionRef.current) {
        // Request microphone permission first
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permissionError) {
          onError?.(
            "Microphone access denied. Please allow microphone access and try again."
          );
          return false;
        }

        setIsListening(true);
        recognitionRef.current.start();
        return true;
      }
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setIsListening(false);
      onError?.("Failed to start speech recognition. Please try again.");
      return false;
    }

    return false;
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
    setIsListening(false);
  };

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}

// Enhanced Speech Recognition Component for better mobile support
export class EnhancedSpeechRecognition {
  private recognition: any = null;
  private isSupported = false;
  private callbacks: {
    onResult?: (transcript: string) => void;
    onError?: (error: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
  } = {};

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (Platform.OS === "web") {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;

      if (SpeechRecognition) {
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 3; // Get multiple alternatives

    this.recognition.onresult = (event: any) => {
      // Get the best result or try to find the most likely match
      let bestTranscript = "";
      let highestConfidence = 0;

      for (let i = 0; i < event.results[0].length; i++) {
        const alternative = event.results[0][i];
        if (alternative.confidence > highestConfidence) {
          highestConfidence = alternative.confidence;
          bestTranscript = alternative.transcript;
        }
      }

      const transcript = bestTranscript.toLowerCase().trim();
      this.callbacks.onResult?.(transcript);
    };

    this.recognition.onerror = (event: any) => {
      const errorMessage = this.getErrorMessage(event.error);
      this.callbacks.onError?.(errorMessage);
    };

    this.recognition.onstart = () => {
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      this.callbacks.onEnd?.();
    };
  }

  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      "not-allowed":
        "Microphone access denied. Please allow microphone access in your browser settings.",
      "no-speech": "No speech detected. Please speak clearly and try again.",
      "audio-capture":
        "No microphone found. Please check your microphone connection.",
      network: "Network error occurred. Please check your internet connection.",
      aborted: "Speech recognition was aborted.",
      "bad-grammar": "Speech recognition grammar error.",
    };

    return errorMessages[error] || `Speech recognition error: ${error}`;
  }

  public setCallbacks(callbacks: typeof this.callbacks) {
    this.callbacks = callbacks;
  }

  public async start(): Promise<boolean> {
    if (!this.isSupported || !this.recognition) {
      this.callbacks.onError?.(
        "Speech recognition is not supported on this device."
      );
      return false;
    }

    try {
      // Request microphone permission
      if (Platform.OS === "web") {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.recognition.start();
      return true;
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      this.callbacks.onError?.(
        "Failed to start speech recognition. Please try again."
      );
      return false;
    }
  }

  public stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  }

  public get supported(): boolean {
    return this.isSupported;
  }

  public destroy() {
    this.stop();
    this.recognition = null;
    this.callbacks = {};
  }
}
