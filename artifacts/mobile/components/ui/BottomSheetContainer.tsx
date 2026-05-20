/**
 * BottomSheetContainer
 *
 * Use this as the outermost View inside every new slide-up Modal.
 * It gives the sheet a floating appearance with 8 dp gap from all
 * device edges and rounded corners on all sides.
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
 *       paddingHorizontal: SHEET_EDGE_GAP,
 *       paddingBottom: SHEET_EDGE_GAP,
 *       backgroundColor: "rgba(0,0,0,0.5)",
 *     },
 *   });
 *
 * The exported constant SHEET_EDGE_GAP (= 8) should be used on the
 * backdrop overlay so the sheet is consistently inset on all sides.
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const SHEET_EDGE_GAP = 8;
export const SHEET_BORDER_RADIUS = 20;
export const SHEET_BOTTOM_RADIUS = 14;

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
  paddingHorizontal: SHEET_EDGE_GAP,
  paddingBottom: SHEET_EDGE_GAP,
};

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: SHEET_BORDER_RADIUS,
    borderTopRightRadius: SHEET_BORDER_RADIUS,
    borderBottomLeftRadius: SHEET_BOTTOM_RADIUS,
    borderBottomRightRadius: SHEET_BOTTOM_RADIUS,
    overflow: "hidden",
  },
});
