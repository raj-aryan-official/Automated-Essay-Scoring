import React, { createContext, useContext, useEffect } from 'react';

export type ThemeMode = 'light';
export type ResolvedTheme = 'light';

// Maintain backwards compatibility with code importing `Theme`
export type Theme = ThemeMode;

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  toggleTheme: () => void;
  cycleTheme: () => void;
  setTheme: (_theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    try {
      localStorage.removeItem('aes_theme');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const noop = () => {};

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        resolvedTheme: 'light',
        isDark: false,
        toggleTheme: noop,
        cycleTheme: noop,
        setTheme: noop,
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
