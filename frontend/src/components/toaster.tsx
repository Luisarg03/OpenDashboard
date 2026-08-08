import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

// sonner needs an explicit theme; derive it from next-themes so toasts match
// the active light/dark surface. The toaster renders into a portal in
// document.body; position stays top-right (sonner default).
export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      richColors
      closeButton
    />
  );
}
