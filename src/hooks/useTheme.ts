import { useCallback, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface UseThemeResult {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

export function useTheme(): UseThemeResult {
    const [theme, setTheme] = useState<Theme>('dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, toggleTheme, setTheme };
}
