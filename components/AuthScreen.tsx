import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BookOpen,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Settings,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleAuth = async () => {
    // Reset states
    setError(null);
    setSuccess(null);

    // Validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await signUp(email.trim(), password, fullName.trim());
      } else {
        result = await signIn(email.trim(), password);
      }

      if (result.error) {
        // Handle specific Supabase errors
        const errorMessage =
          result.error &&
          typeof result.error === "object" &&
          "message" in result.error &&
          typeof (result.error as any).message === "string"
            ? (result.error as any).message
            : "An authentication error occurred";

        if (errorMessage.includes("Invalid login credentials")) {
          setError(
            "Invalid email or password. Please check your credentials and try again."
          );
        } else if (errorMessage.includes("User already registered")) {
          setError(
            "An account with this email already exists. Please sign in instead."
          );
        } else if (errorMessage.includes("Database error")) {
          setError(
            "There was a problem creating your account. Please try again in a moment."
          );
        } else if (errorMessage.includes("Email not confirmed")) {
          setError(
            "Please check your email and click the confirmation link before signing in."
          );
        } else if (errorMessage.includes("unexpected_failure")) {
          setError(
            "Account creation failed due to a database error. Please contact support or try again later."
          );
        } else {
          setError(errorMessage || "An authentication error occurred");
        }
      } else if (isSignUp) {
        setSuccess(
          "Account created successfully! Please check your email to verify your account before signing in."
        );
        // Clear form but don't switch to sign in yet
        setEmail("");
        setPassword("");
        setFullName("");
      } else {
        // Sign in successful - the auth state will handle navigation
        setSuccess("Welcome back!");
      }
    } catch (error: unknown) {
      console.error("Auth error:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else if (typeof error === "string") {
        setError(error);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(null);
    // Clear form when switching modes
    setEmail("");
    setPassword("");
    setFullName("");
  };

  // const runDatabaseValidation = async () => {
  //   const result = await validateDatabaseSetup();
  //   if (result.data) {
  //     console.log("Database validation results:", result.data);
  //     alert("Database validation completed. Check console for details.");
  //   } else {
  //     alert(
  //       "Database validation failed: " +
  //         (result.error &&
  //         typeof result.error === "object" &&
  //         "message" in result.error &&
  //         typeof (result.error as any).message === "string"
  //           ? (result.error as any).message
  //           : JSON.stringify(result.error))
  //     );
  //   }
  // };

  // const runUserCreationTest = async () => {
  //   const result = await testUserCreation();
  //   if (result.data) {
  //     console.log("User creation test results:", result.data);
  //     alert("User creation test completed. Check console for details.");
  //   } else {
  //     alert(
  //       "User creation test failed: " +
  //         (result.error &&
  //         typeof result.error === "object" &&
  //         "message" in result.error &&
  //         typeof (result.error as any).message === "string"
  //           ? (result.error as any).message
  //           : JSON.stringify(result.error))
  //     );
  //   }
  // };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <BookOpen size={48} color="#4F46E5" />
            </View>
            <Text style={styles.title}>Reading Buddy</Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? "Create your account to start learning!"
                : "Welcome back! Ready to learn?"}
            </Text>

            {/* Debug toggle button */}
            {/* <TouchableOpacity
              style={styles.debugToggle}
              onPress={() => setShowDebug(!showDebug)}
            >
              <Settings size={16} color="#6B7280" />
              <Text style={styles.debugToggleText}>Debug</Text>
            </TouchableOpacity> */}
          </View>

          {/* Debug panel */}
          {/* {showDebug && (
            <View style={styles.debugPanel}>
              <Text style={styles.debugTitle}>Database Debug Tools</Text>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={runDatabaseValidation}
              >
                <Text style={styles.debugButtonText}>
                  Validate Database Setup
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={runUserCreationTest}
              >
                <Text style={styles.debugButtonText}>
                  Test User Creation Process
                </Text>
              </TouchableOpacity>
            </View>
          )} */}

          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={20} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successContainer}>
                <CheckCircle size={20} color="#059669" />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputContainer}>
                <User size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Mail size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholderTextColor="#9CA3AF"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholderTextColor="#9CA3AF"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.authButtonText}>
                {loading
                  ? "Loading..."
                  : isSignUp
                  ? "Create Account"
                  : "Sign In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={switchMode}
              disabled={loading}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp
                  ? "Already have an account? Sign In"
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🎯</Text>
              <Text style={styles.featureText}>
                Track your learning progress
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🏆</Text>
              <Text style={styles.featureText}>
                Earn achievements and badges
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📊</Text>
              <Text style={styles.featureText}>See detailed statistics</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🔄</Text>
              <Text style={styles.featureText}>Sync across all devices</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  debugToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 8,
    gap: 4,
  },
  debugToggleText: {
    fontSize: 12,
    color: "#6B7280",
  },
  debugPanel: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  debugButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  debugButtonText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  form: {
    marginBottom: 40,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  successText: {
    color: "#059669",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  eyeIcon: {
    padding: 4,
  },
  authButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    alignItems: "center",
    marginTop: 20,
  },
  switchButtonText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "500",
  },
  features: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
});
