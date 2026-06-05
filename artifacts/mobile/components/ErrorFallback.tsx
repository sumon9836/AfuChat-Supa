import { Feather } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React, { useState, useEffect } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ERROR_LOG_KEY = "afuchat_last_crash_error";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const theme = {
    background: isDark ? "#0D0D0D" : "#F2F2F7",
    backgroundSecondary: isDark ? "#1C1C1E" : "#E5E5EA",
    text: isDark ? "#FFFFFF" : "#1C1C1E",
    textSecondary: isDark ? "rgba(255,255,255,0.7)" : "rgba(28,28,30,0.7)",
    link: "#007AFF",
    buttonText: "#FFFFFF",
    danger: "#FF3B30",
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorDetails = formatErrorDetails();

  function formatErrorDetails(): string {
    const ts = new Date().toISOString();
    let details = `Time: ${ts}\nError: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  }

  useEffect(() => {
    try {
      AsyncStorage.setItem(ERROR_LOG_KEY, errorDetails);
    } catch {}
  }, [errorDetails]);

  const handleRestart = async () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.location.reload();
      } else {
        resetError();
      }
      return;
    }
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const handleCopy = () => {
    try {
      Clipboard.setString(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Pressable
        onPress={() => setIsModalVisible(true)}
        accessibilityLabel="View error details"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.topButton,
          {
            top: insets.top + 16,
            backgroundColor: theme.danger,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="alert-circle" size={18} color="#fff" />
        <Text style={styles.topButtonLabel}>Error</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Something went wrong
        </Text>

        <Text style={[styles.message, { color: theme.textSecondary }]}>
          Please reload the app to continue.
        </Text>

        <Text
          style={[styles.errorSummary, { color: theme.danger, fontFamily: monoFont }]}
          numberOfLines={3}
          selectable
        >
          {error.message}
        </Text>

        <Pressable
          onPress={handleRestart}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.link,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            Try Again
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setIsModalVisible(true)}
          style={({ pressed }) => [
            styles.detailsButton,
            {
              borderColor: theme.textSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="info" size={14} color={theme.textSecondary} />
          <Text style={[styles.detailsButtonText, { color: theme.textSecondary }]}>
            View error details
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.background },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Error Details
              </Text>
              <View style={styles.modalHeaderActions}>
                <Pressable
                  onPress={handleCopy}
                  accessibilityLabel="Copy error"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.copyButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Feather
                    name={copied ? "check" : "copy"}
                    size={20}
                    color={copied ? "#34C759" : theme.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={[
                styles.modalScrollContent,
                { paddingBottom: insets.bottom + 16 },
              ]}
              showsVerticalScrollIndicator
            >
              <View
                style={[
                  styles.errorContainer,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.errorText,
                    {
                      color: theme.text,
                      fontFamily: monoFont,
                    },
                  ]}
                  selectable
                >
                  {errorDetails}
                </Text>
              </View>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Tap the copy button and send this to the developer to help diagnose the issue.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 40,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  errorSummary: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
    opacity: 0.8,
  },
  topButton: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  topButtonLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
    minWidth: 200,
    ...Platform.select({
      web: { boxShadow: "0 2px 4px rgba(0,0,0,0.1)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    }),
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  detailsButtonText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  modalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 12,
  },
  errorContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    padding: 16,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: "100%",
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
