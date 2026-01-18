import { createContext, useContext, useState, ReactNode, useEffect, FC } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';

// Extend MUI theme with custom colors
declare module '@mui/material/styles' {
    interface Palette {
        code: {
            background: string;
            text: string;
        };
    }
    interface PaletteOptions {
        code?: {
            background: string;
            text: string;
        };
    }
}

interface ThemeContextType {
    darkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useDarkMode = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useDarkMode must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            // Set initial value
            setDarkMode(mediaQuery.matches);

            // Listener for OS-level theme changes
            const handleChange = (e: MediaQueryListEvent) => {
                setDarkMode(e.matches);
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, []);

    const theme = createTheme({
        palette: {
            mode: darkMode ? 'dark' : 'light',
            primary: {
                main: darkMode ? '#61dafb' : '#007acc',
            },
            secondary: {
                main: darkMode ? '#f6f8fa' : '#282c34',
            },
            background: {
                default: darkMode ? '#1e1e1e' : '#ffffff',
                paper: darkMode ? '#2d2d2d' : '#f5f5f5',
            },
            text: {
                primary: darkMode ? '#d4d4d4' : '#000000',
                secondary: darkMode ? '#858585' : '#333333',
            },
            action: {
                hover: darkMode ? '#333333' : '#e0e0e0',
            },
            code: {
                background: darkMode ? '#2d2d2d' : '#f9f2f4',
                text: darkMode ? '#9cdcfe' : '#a31515',
            },
        },
        typography: {
            fontSize: 16,
            fontFamily:
                '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", ' +
                'Roboto, "Helvetica Neue", Arial, sans-serif',
            h6: {
                fontWeight: 600,
                fontSize: '1rem',
                lineHeight: 1.5,
            },
            subtitle1: {
                fontWeight: 600,
                fontSize: '1rem',
                lineHeight: 1.5,
            },
            subtitle2: {
                fontWeight: 600,
                fontSize: '0.75rem',
                lineHeight: 1.5,
            },
            body1: {
                fontSize: '1rem',
                lineHeight: 1.5,
                fontWeight: 400,
            },
            // editor font
            body2: {
                fontSize: 14,
                fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            },
        },
        shape: {
            borderRadius: 4,
        },
    });

    return (
        <ThemeContext.Provider value={{ darkMode }}>
            <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
