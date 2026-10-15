import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform, Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    subtext: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryLight: string;
    surface: string;
    modalBackground: string;
    icon: string;
    statusBar: 'light' | 'dark';
}

export const lightTheme: ThemeColors = {
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    subtext: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    primary: '#2563EB',
    primaryLight: '#EFF6FF',
    surface: '#F8FAFC',
    modalBackground: '#FFFFFF',
    icon: '#64748B',
    statusBar: 'dark',
};

export const darkTheme: ThemeColors = {
    background: '#0B0F19',
    card: '#151C2C',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    subtext: '#94A3B8',
    textMuted: '#64748B',
    border: '#232F46',
    primary: '#3B82F6',
    primaryLight: '#1E293B',
    surface: '#151C2C',
    modalBackground: '#151C2C',
    icon: '#94A3B8',
    statusBar: 'light',
};

interface ThemeContextType {
    themeMode: ThemeMode;
    isDarkMode: boolean;
    theme: ThemeColors;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'appThemeMode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [systemAppearance, setSystemAppearance] = useState<'light' | 'dark'>(() => {
        const initial = Appearance.getColorScheme();
        return initial === 'dark' ? 'dark' : 'light';
    });

    useEffect(() => {
        loadStoredTheme();
    }, []);

    const loadStoredTheme = async () => {
        try {
            const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                setThemeModeState(saved as ThemeMode);
                try {
                    if (saved === 'system') {
                        Appearance.setColorScheme(null);
                    } else {
                        Appearance.setColorScheme(saved);
                    }
                } catch (e) {}
            }
        } catch (e) {
            console.error('Failed to load theme preference', e);
        }
    };

    // Keep system appearance updated in real-time when system theme changes
    useEffect(() => {
        const updateScheme = (scheme?: string | null) => {
            const current = scheme || Appearance.getColorScheme();
            if (current) {
                setSystemAppearance(current === 'dark' ? 'dark' : 'light');
            }
        };

        const appearanceListener = Appearance.addChangeListener(({ colorScheme }) => {
            updateScheme(colorScheme);
        });

        const appStateListener = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                updateScheme();
            }
        });

        updateScheme();

        return () => {
            appearanceListener.remove();
            appStateListener.remove();
        };
    }, []);

    const effectiveSystemDark = systemColorScheme ? systemColorScheme === 'dark' : systemAppearance === 'dark';

    const isDarkMode = themeMode === 'system' 
        ? effectiveSystemDark 
        : themeMode === 'dark';

    const theme = isDarkMode ? darkTheme : lightTheme;

    useEffect(() => {
        try {
            SystemUI.setBackgroundColorAsync(theme.background);
            if (Platform.OS === 'android') {
                NavigationBar.setBackgroundColorAsync(theme.background);
                NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark');
            }
        } catch (e) {
            // Ignore system UI errors on unmounted platforms
        }
    }, [isDarkMode, theme.background]);

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            if (mode === 'system') {
                Appearance.setColorScheme(null);
                const current = Appearance.getColorScheme();
                if (current) {
                    setSystemAppearance(current === 'dark' ? 'dark' : 'light');
                }
            } else {
                Appearance.setColorScheme(mode);
            }
        } catch (e) {
            console.error('Failed to save theme preference', e);
        }
    };

    const toggleTheme = async () => {
        const nextMode: ThemeMode = isDarkMode ? 'light' : 'dark';
        await setThemeMode(nextMode);
    };

    return (
        <ThemeContext.Provider value={{ themeMode, isDarkMode, theme, setThemeMode, toggleTheme }}>
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
