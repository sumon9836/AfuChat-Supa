import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from "react-native";

let NativeKeyboardAwareScrollView: any = null;
try {
  NativeKeyboardAwareScrollView =
    require("react-native-keyboard-controller").KeyboardAwareScrollView;
} catch (_) {}

type Props = ScrollViewProps & {
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  extraScrollHeight?: number;
  [key: string]: any;
};

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  style,
  contentContainerStyle,
  extraScrollHeight,
  ...props
}: Props) {
  if (NativeKeyboardAwareScrollView) {
    return (
      <NativeKeyboardAwareScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        style={style}
        contentContainerStyle={contentContainerStyle}
        {...props}
      >
        {children}
      </NativeKeyboardAwareScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style as any]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
