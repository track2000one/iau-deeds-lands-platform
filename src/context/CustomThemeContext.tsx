import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface FontSettings {
  family: string;
  size: string;
  color: string;
  customFontUrl?: string;
  customFontName?: string;
}

export interface CustomTheme {
  name: string;
  colors: ThemeColors;
}

interface CustomThemeContextType {
  currentTheme: CustomTheme;
  fontSettings: FontSettings;
  applyTheme: (theme: CustomTheme) => void;
  updateFontSettings: (settings: FontSettings) => void;
  resetToDefault: () => void;
}

const PREDEFINED_THEMES: Record<string, CustomTheme> = {
  professionalBlue: {
    name: 'Professional Blue',
    colors: {
      primary: '#2C4A6B',
      secondary: '#4A6B8F',
      accent: '#6B9EC1',
      background: '#FCFAEE',
    },
  },
  skyBlue: {
    name: 'Sky Blue',
    colors: {
      primary: '#2C5F8D',
      secondary: '#5A9BD5',
      accent: '#FF8C42',
      background: '#F5F9FC',
    },
  },
  roseGarden: {
    name: 'Rose Garden',
    colors: {
      primary: '#8B4854',
      secondary: '#C1788A',
      accent: '#6B9080',
      background: '#FAF7F2',
    },
  },
  sandyBeach: {
    name: 'Sandy Beach',
    colors: {
      primary: '#6B5D50',
      secondary: '#A89586',
      accent: '#4A7C9B',
      background: '#FDFAF5',
    },
  },
  oceanBreeze: {
    name: 'Ocean Breeze',
    colors: {
      primary: '#2E7D8F',
      secondary: '#5DADE2',
      accent: '#E67E22',
      background: '#F0F8FF',
    },
  },
  elegantDark: {
    name: 'Elegant Dark',
    colors: {
      primary: '#688E9E',
      secondary: '#98B4C1',
      accent: '#E6B88A',
      background: '#1A2332',
    },
  },
  modernRed: {
    name: 'Modern Red',
    colors: {
      primary: '#C41E3A',
      secondary: '#E94B3C',
      accent: '#7A8B99',
      background: '#FAFAFA',
    },
  },
  forestGreen: {
    name: 'Forest Green',
    colors: {
      primary: '#2D5016',
      secondary: '#4A7C2C',
      accent: '#889D77',
      background: '#F7FAF4',
    },
  },
};

const DEFAULT_THEME = PREDEFINED_THEMES.professionalBlue;
const DEFAULT_FONT: FontSettings = {
  family: 'Cairo, sans-serif',
  size: '16px',
  color: '#2C4A6B',
};

const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<CustomTheme>(() => {
    const saved = localStorage.getItem('customTheme');
    return saved ? JSON.parse(saved) : DEFAULT_THEME;
  });

  const [fontSettings, setFontSettings] = useState<FontSettings>(() => {
    const saved = localStorage.getItem('fontSettings');
    return saved ? JSON.parse(saved) : DEFAULT_FONT;
  });

  useEffect(() => {
    applyThemeToDocument(currentTheme, fontSettings);
  }, [currentTheme, fontSettings]);

  const applyThemeToDocument = (theme: CustomTheme, font: FontSettings) => {
    const root = document.documentElement;

    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-background', theme.colors.background);

    root.style.setProperty('--font-family', font.customFontName ? `'${font.customFontName}', ${font.family}` : font.family);
    root.style.setProperty('--font-size-base', font.size);
    root.style.setProperty('--font-color', font.color);

    // Apply custom font if URL is provided
    if (font.customFontUrl && font.customFontName) {
      const existingStyle = document.getElementById('custom-font-face');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'custom-font-face';
      style.textContent = `
        @font-face {
          font-family: '${font.customFontName}';
          src: url('${font.customFontUrl}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `;
      document.head.appendChild(style);
    }
  };

  const applyTheme = (theme: CustomTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('customTheme', JSON.stringify(theme));
  };

  const updateFontSettings = (settings: FontSettings) => {
    setFontSettings(settings);
    localStorage.setItem('fontSettings', JSON.stringify(settings));
  };

  const resetToDefault = () => {
    setCurrentTheme(DEFAULT_THEME);
    setFontSettings(DEFAULT_FONT);
    localStorage.removeItem('customTheme');
    localStorage.removeItem('fontSettings');
  };

  return (
    <CustomThemeContext.Provider
      value={{
        currentTheme,
        fontSettings,
        applyTheme,
        updateFontSettings,
        resetToDefault,
      }}
    >
      {children}
    </CustomThemeContext.Provider>
  );
};

export const useCustomTheme = (): CustomThemeContextType => {
  const context = useContext(CustomThemeContext);
  if (context === undefined) {
    throw new Error('useCustomTheme must be used within a CustomThemeProvider');
  }
  return context;
};

export { PREDEFINED_THEMES };
