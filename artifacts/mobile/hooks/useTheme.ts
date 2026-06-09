import Colors from "@/constants/colors";
import { useThemeContext } from "@/context/ThemeContext";
import { useAppAccent } from "@/context/AppAccentContext";

export function useTheme() {
  const { isDark, themeMode, setThemeMode } = useThemeContext();
  const { accent } = useAppAccent();
  const baseColors = isDark ? Colors.dark : Colors.light;

  // The accent is only used for chat bubble customization.
  // All app chrome (icons, tabs, CTAs) always uses the brand color
  // so every page looks visually identical regardless of user preferences.
  const colors = {
    ...baseColors,
    accent: Colors.brand,
    tint: Colors.brand,
    tabIconSelected: Colors.brand,
    online: Colors.brand,
    unread: Colors.brand,
    bubble: accent,   // chat bubbles can still be user-customized
  };
  return { colors, isDark, themeMode, setThemeMode, accent: Colors.brand };
}
