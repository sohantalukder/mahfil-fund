import { config } from '@/theme/_config';
/**
 * Generates border color styles from configuration
 * @param configuration
 */
export const generateBorderColors = (configuration) => {
    return Object.entries(configuration.borders.colors).reduce((accumulator, [key, value]) => {
        return Object.assign(accumulator, {
            [key]: {
                borderColor: value,
            },
        });
    }, {});
};
/**
 * Generates border radius styles from configuration
 */
export const generateBorderRadius = () => {
    return config.borders.radius.reduce((accumulator, radius) => {
        return Object.assign(accumulator, {
            [`rounded_${radius}`]: {
                borderRadius: radius,
            },
            [`roundedBottom_${radius}`]: {
                borderBottomLeftRadius: radius,
                borderBottomRightRadius: radius,
            },
            [`roundedBottomRight_${radius}`]: {
                borderBottomRightRadius: radius,
            },
            [`roundedTop_${radius}`]: {
                borderTopLeftRadius: radius,
                borderTopRightRadius: radius,
            },
            [`roundedTopLeft_${radius}`]: {
                borderTopLeftRadius: radius,
            },
        });
    }, {});
};
/**
 * Generates border width styles from configuration
 */
export const generateBorderWidths = () => {
    return config.borders.widths.reduce((accumulator, width) => {
        return Object.assign(accumulator, {
            [`w_${width}`]: {
                borderWidth: width,
            },
            [`wBottom_${width}`]: {
                borderBottomWidth: width,
            },
            [`wLeft_${width}`]: {
                borderLeftWidth: width,
            },
            [`wRight_${width}`]: {
                borderRightWidth: width,
            },
            [`wTop_${width}`]: {
                borderTopWidth: width,
            },
        });
    }, {});
};
/**
 * Static border styles
 * @desc These styles are not generated from configuration, you can add your own
 */
export const staticBorderStyles = {};
