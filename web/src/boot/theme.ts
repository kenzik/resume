import { boot } from 'quasar/wrappers';
import { useTheme } from '../composables/useTheme';

export default boot(({ app }) => {
  // Initialize theme system globally before Vue mounts
  // This ensures theme is ready for all components
  const theme = useTheme();

  // Make theme available globally via provide/inject
  app.provide('theme', theme);

  console.log('[boot/theme] Theme system initialized:', theme.currentThemeName.value);
});

