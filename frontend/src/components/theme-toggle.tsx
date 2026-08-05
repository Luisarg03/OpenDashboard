import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <motion.div
        key={resolvedTheme}
        initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
      </motion.div>
    </Button>
  );
}
