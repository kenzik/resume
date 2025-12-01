import { boot } from 'quasar/wrappers';
import { useTheme, THEME_KEY } from '../composables/useTheme';

export default boot(({ app }) => {
  // Initialize theme system globally before Vue mounts
  // This ensures theme is ready for all components
  const theme = useTheme();

  // Make theme available globally via provide/inject (typed key)
  app.provide(THEME_KEY, theme);
});

