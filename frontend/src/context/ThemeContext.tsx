import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'obsidian' | 'gold' | 'light' | 'graphite';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  colorScheme: 'dark' | 'light';
  preview: {
    bg: string;
    surface: string;
    accent: string;
    border: string;
    text: string;
  };
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Black',
    badge: 'Restored Preferred',
    description: 'Deep black and charcoal with refined cyan-teal precision accents',
    colorScheme: 'dark',
    preview: {
      bg: '#0B0F14',
      surface: '#111821',
      accent: '#2DD4BF',
      border: '#273544',
      text: '#F1F5F9',
    },
  },
  {
    id: 'gold',
    name: 'Gold / Bronze',
    badge: 'Warm Editorial',
    description: 'Rich dark background with warm bronze and champagne highlights',
    colorScheme: 'dark',
    preview: {
      bg: '#090909',
      surface: '#121110',
      accent: '#B0906C',
      border: '#262420',
      text: '#F2EFEB',
    },
  },
  {
    id: 'light',
    name: 'Light Minimal',
    badge: 'Clean Contrast',
    description: 'Professional high-contrast light workspace with crisp slate typography',
    colorScheme: 'light',
    preview: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      accent: '#2563EB',
      border: '#CBD5E1',
      text: '#0F172A',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    badge: 'Neutral Dark',
    description: 'Understated dark neutral grey with restrained platinum accents',
    colorScheme: 'dark',
    preview: {
      bg: '#121214',
      surface: '#1C1C20',
      accent: '#A1A1AA',
      border: '#33333C',
      text: '#EDEDF0',
    },
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  currentThemeMeta: ThemeMeta;
}

const STORAGE_KEY = 'fluxv2x_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'obsidian'; // Obsidian Black is the restored default
  });

  const applyTheme = (t: ThemeId) => {
    const meta = THEMES.find((item) => item.id === t) || THEMES[0];
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
    root.setAttribute('data-color-scheme', meta.colorScheme);
    if (meta.colorScheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore storage errors
    }
    applyTheme(newTheme);
  };

  const currentThemeMeta = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentThemeMeta }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
