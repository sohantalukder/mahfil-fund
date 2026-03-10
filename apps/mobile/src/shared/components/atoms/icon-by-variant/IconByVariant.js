import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { z } from 'zod';
import { useTheme } from '@/theme';
import { getIconsContext } from '@/assets/getAssetsContext';
const icons = getIconsContext();
const EXTENSION = 'tsx';
function IconByVariant({ height, path, width, color, ...props }) {
    const { variant } = useTheme();
    const iconProperties = { ...props, height, width, fill: color };
    const iconName = `${path?.[0]?.toUpperCase() || ''}${path?.substring(1) || ''}`;
    const extendPath = `./${iconName}.icon.${EXTENSION}`;
    const Icon = useMemo(() => {
        try {
            const getDefaultSource = () => {
                const module = icons(`${extendPath}`);
                if (!module) {
                    throw new Error(`Icon module not found for path: ${extendPath}`);
                }
                return z
                    .object({
                    default: z.function().returns(z.custom()),
                })
                    .parse(module).default;
            };
            if (variant === 'default') {
                return getDefaultSource();
            }
            try {
                const module = icons(`${extendPath}`);
                if (!module) {
                    if (__DEV__) {
                        console.warn(`Couldn't load the icon: ${path}.${EXTENSION} for the variant ${variant}, Fallback to default`);
                    }
                    return getDefaultSource();
                }
                const fetchedModule = z
                    .object({
                    default: z.function().returns(z.custom()),
                })
                    .parse(module);
                return fetchedModule.default;
            }
            catch (error) {
                if (__DEV__) {
                    console.error(`Couldn't load the icon: ${path}.${EXTENSION} for the variant ${variant}, Fallback to default`, error);
                }
                return getDefaultSource();
            }
        }
        catch (error) {
            if (__DEV__) {
                console.error(`Couldn't load the icon: ${path}.${EXTENSION}`, error);
            }
            throw error;
        }
    }, [variant, path]);
    return _jsx(Icon, { ...iconProperties });
}
export default IconByVariant;
