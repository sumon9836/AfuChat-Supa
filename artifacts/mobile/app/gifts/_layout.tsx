import { Stack } from "expo-router";

export default function GiftsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", gestureEnabled: true }} />
  );
}
