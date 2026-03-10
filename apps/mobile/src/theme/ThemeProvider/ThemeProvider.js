import { jsx as _jsx } from "react/jsx-runtime";
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createContext, useCallback, useEffect, useMemo, useState, useRef, } from 'react';
import { useColorScheme } from 'react-native';
import { generateBackgrounds, staticBackgroundStyles, } from '@/theme/backgrounds';
import { generateBorderColors, generateBorderRadius, generateBorderWidths, staticBorderStyles, } from '@/theme/borders';
import { generateFontColors, generateFontSizes, staticFontStyles, } from '@/theme/fonts';
import { generateGutters, staticGutterStyles } from '@/theme/gutters';
import layout from '@/theme/layout';
import generateConfig from '@/theme/ThemeProvider/generateConfig';
import { typographies } from '../typographies';
import localStore from '@/services/storage/localStore.service';
import { getAssetsContext } from '@/assets/getAssetsContext';
export const ThemeContext = createContext(undefined);
// Cache for generated theme objects to avoid regeneration
const themeCache = new Map();
const configCache = new Map();
// Memoized asset references
const getAssetImages = (() => {
    let cachedImages = null;
    return () => {
        if (!cachedImages) {
            cachedImages = getAssetsContext();
        }
        return cachedImages;
    };
})();
function ThemeProvider({ children }) {
    const storage = localStore;
    const images = getAssetImages();
    const colorScheme = useColorScheme();
    const systemTheme = colorScheme === 'dark' ? 'dark' : 'default';
    // Use ref to track initialization to prevent unnecessary effects
    const initialized = useRef(false);
    // Current theme variant
    const [variant, setVariant] = useState(() => {
        const storedTheme = storage.getTheme();
        if (storedTheme === 'system') {
            return systemTheme;
        }
        return storedTheme || systemTheme;
    });
    // Initialize theme at default if not defined (only once)
    useEffect(() => {
        if (initialized.current)
            return;
        const appHasThemeDefined = storage.getTheme();
        if (!appHasThemeDefined) {
            storage.setTheme('system');
            setVariant(systemTheme);
        }
        initialized.current = true;
    }, [storage, systemTheme]); // Empty dependency array since we only want this to run once
    // Update theme variant when system theme changes
    useEffect(() => {
        if (storage.getTheme() === 'system') {
            setVariant(systemTheme);
        }
    }, [systemTheme, storage]); // Changed from colorScheme to systemTheme
    const changeTheme = useCallback((nextVariant) => {
        const newVariant = nextVariant === 'system' ? systemTheme : nextVariant;
        setVariant(newVariant);
        storage.setTheme(nextVariant);
    }, [systemTheme, storage] // Removed storage from dependencies as it's stable
    );
    // Memoized config generation with caching
    const fullConfig = useMemo(() => {
        if (configCache.has(variant)) {
            return configCache.get(variant);
        }
        const config = generateConfig(variant);
        configCache.set(variant, config);
        return config;
    }, [variant]);
    // Generate theme styles with caching
    const themeStyles = useMemo(() => {
        const cacheKey = `${variant}-styles`;
        if (themeCache.has(cacheKey)) {
            return themeCache.get(cacheKey);
        }
        const fontColors = generateFontColors(fullConfig);
        const backgrounds = generateBackgrounds(fullConfig);
        const gutters = generateGutters(fullConfig);
        const borderColors = generateBorderColors(fullConfig);
        const styles = {
            fonts: {
                ...generateFontSizes(),
                ...fontColors,
                ...staticFontStyles,
            },
            backgrounds: {
                ...backgrounds,
                ...staticBackgroundStyles,
            },
            gutters: {
                ...gutters,
                ...staticGutterStyles,
            },
            borders: {
                ...borderColors,
                ...generateBorderRadius(),
                ...generateBorderWidths(),
                ...staticBorderStyles,
            },
            typographies: typographies(fontColors),
        };
        themeCache.set(cacheKey, styles);
        return styles;
    }, [fullConfig, variant]);
    // Memoized navigation theme
    const navigationTheme = useMemo(() => {
        const baseTheme = variant === 'dark' ? DarkTheme : DefaultTheme;
        return {
            ...baseTheme,
            colors: fullConfig.navigationColors,
            dark: variant === 'dark',
        };
    }, [variant, fullConfig.navigationColors]);
    // Memoized logo selection
    const logos = useMemo(() => ({
        logo: images('./logo.png'),
    }), [images]);
    // Main theme object
    const theme = useMemo(() => ({
        ...themeStyles,
        colors: fullConfig.colors,
        layout,
        variant,
        ...logos,
    }), [themeStyles, fullConfig.colors, variant, logos]);
    // Context value
    const value = useMemo(() => ({
        ...theme,
        changeTheme,
        navigationTheme,
    }), [theme, changeTheme, navigationTheme]);
    return (_jsx(ThemeContext.Provider, { value: value, children: children }));
}
export default ThemeProvider;
