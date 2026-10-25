import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/theme-context';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <Button
      aria-label={`Ativar tema ${nextTheme === 'dark' ? 'escuro' : 'claro'}`}
      className="size-11"
      onClick={toggleTheme}
      size="icon"
      title={`Ativar tema ${nextTheme === 'dark' ? 'escuro' : 'claro'}`}
      variant="outline"
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
