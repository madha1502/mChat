import { create } from 'zustand';

export type ThemeType = 'pastel' | 'dark' | 'cyberpunk' | 'emerald';

interface ThemeState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const SAVED_THEME_KEY = 'mchat_theme_preference';

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem(SAVED_THEME_KEY) as ThemeType) || 'pastel',
  setTheme: (theme: ThemeType) => {
    localStorage.setItem(SAVED_THEME_KEY, theme);
    set({ theme });
  },
}));
