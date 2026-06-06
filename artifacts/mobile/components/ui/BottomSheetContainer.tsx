/**
 * BottomSheetContainer
 *
 * Use this as the outermost View inside every new slide-up Modal.
 * The sheet floats 8 dp from the left/right device edges and sits
 * FLAT against the bottom — only the top corners are rounded.
 *
 * Usage:
 *   <Modal visible={...} transparent animationType="slide" ...>
 *     <Pressable style={styles.backdrop} onPress={onClose}>
 *       <BottomSheetContainer>
 *         <Pressable onPress={() => {}}>{...content...}</Pressable>
 *       </BottomSheetContainer>
 *     </Pressable>
 *   </Modal>
 *
 *   const styles = StyleSheet.create({
 *     backdrop: {
 *       flex: 1,
 *       justifyContent: "flex-end",
 *       backgroundColor: "rgba(0,0,0,0.5)",
 *     },
 *   });
 *
 * SHEET_EDGE_GAP (= 8) is kept for internal reference but is no longer applied
 * to the overlay — sheets extend edge-to-edge. Do NOT add paddingBottom or
 * paddingHorizontal to the backdrop — the sheet must be flush with the screen.
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const SHEET_EDGE_GAP = 8;
export const SHEET_BORDER_RADIUS = 20;

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Override the background colour (defaults to transparent so the
   *  caller's sheet background shows through). */
  backgroundColor?: string;
}

export function BottomSheetContainer({
  children,
  style,
  backgroundColor,
}: Props) {
  return (
    <View
      style={[
        styles.sheet,
        backgroundColor ? { backgroundColor } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Convenience style object for the transparent backdrop / overlay.
 * Spread this into your own StyleSheet overlay definition.
 *
 * Example:
 *   overlay: { ...SHEET_OVERLAY_STYLE, backgroundColor: "rgba(0,0,0,0.5)" }
 */
export const SHEET_OVERLAY_STYLE: ViewStyle = {
  flex: 1,
  justifyContent: "flex-end",
};

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: SHEET_BORDER_RADIUS,
    borderTopRightRadius: SHEET_BORDER_RADIUS,
    overflow: "hidden",
  },
});
