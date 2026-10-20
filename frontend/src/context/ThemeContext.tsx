import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

// Maintain backwards compatibility with code importing `Theme`
export type Theme = ThemeMode;

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  toggleTheme: () => void;
  cycleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('aes_theme') as ThemeMode | null;
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    } catch (e) {
      // Ignore localStorage access errors
    }
    return 'system'; // Default to responsive system detection
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return 'light';
    return getSystemTheme();
  });

  // Apply theme to DOM and sync with localStorage
  const applyTheme = useCallback((mode: ThemeMode) => {
    const isDark = mode === 'dark' || (mode === 'system' && getSystemTheme() === 'dark');
    const resolved: ResolvedTheme = isDark ? 'dark' : 'light';
    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    try {
      localStorage.setItem('aes_theme', mode);
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Update theme whenever mode changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen to OS system theme changes dynamically when theme === 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleSystemChange);
      return () => (mediaQuery as any).removeListener(handleSystemChange);
    }
  }, [theme, applyTheme]);

  // Quick toggle between light & dark
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const currentResolved = prev === 'system' ? getSystemTheme() : prev;
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  // Cycle 3-state toggle: Light -> Dark -> System -> Light
  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        toggleTheme,
        cycleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
