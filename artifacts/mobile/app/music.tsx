import { Stack } from "expo-router";
import AfuMusicApp from "@/modules/afumusic";

export default function MusicPage() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "AfuMusic" }} />
      <AfuMusicApp />
    </>
  );
}
