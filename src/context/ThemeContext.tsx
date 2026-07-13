import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ColorTheme, getDefaultTheme, getThemeById } from '../config/themes';

interface ThemeContextType {
  currentTheme: ColorTheme;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'selected_theme_id';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(getDefaultTheme());

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedThemeId) {
      const theme = getThemeById(savedThemeId);
      if (theme) {
        setCurrentTheme(theme);
        applyTheme(theme);
      }
    } else {
      applyTheme(getDefaultTheme());
    }
  }, []);

  const applyTheme = (theme: ColorTheme) => {
    const root = document.documentElement;

    // Apply colors to CSS variables
    root.style.setProperty('--primary', theme.colors.primary);
    root.style.setProperty('--secondary', theme.colors.secondary);
    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--background', theme.colors.background);

    if (theme.colors.destructive) {
      root.style.setProperty('--destructive', theme.colors.destructive);
    }

    // Calculate if background is dark or light
    const bgColor = theme.colors.background;
    const rgb = parseInt(bgColor.replace('#', ''), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Set foreground color based on background brightness
    if (brightness < 128) {
      root.style.setProperty('--foreground', '#FFFFFF');
      root.style.setProperty('--card-foreground', '#FFFFFF');
      root.style.setProperty('--muted-foreground', '#CCCCCC');
    } else {
      root.style.setProperty('--foreground', theme.colors.primary);
      root.style.setProperty('--card-foreground', theme.colors.primary);
      root.style.setProperty('--muted-foreground', '#717182');
    }

    // Set sidebar colors
    root.style.setProperty('--sidebar', theme.colors.primary);
    root.style.setProperty('--sidebar-foreground', brightness < 128 ? theme.colors.background : '#FCFAEE');
    root.style.setProperty('--sidebar-accent', theme.colors.secondary);
  };

  const setTheme = (themeId: string) => {
    const theme = getThemeById(themeId);
    if (theme) {
      setCurrentTheme(theme);
      applyTheme(theme);
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
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
