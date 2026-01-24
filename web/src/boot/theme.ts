import { boot } from 'quasar/wrappers';
import { useTheme, THEME_KEY } from '../composables/useTheme';
import { useFont } from '../composables/useFont';

export default boot(({ app }) => {
  // Initialize theme system globally before Vue mounts
  // This ensures theme is ready for all components
  const theme = useTheme();

  // Initialize font system (handles font family, size, and line-height per-font)
  useFont();

  // Make theme available globally via provide/inject (typed key)
  app.provide(THEME_KEY, theme);
});

