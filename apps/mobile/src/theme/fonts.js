import { config } from '@/theme/_config';
import { responsiveFontSize } from '@/shared/utilities/responsiveSize';
export const generateFontColors = (configuration) => {
    return Object.entries(configuration.fonts.colors).reduce((accumulator, [key, value]) => {
        return Object.assign(accumulator, {
            [key]: {
                color: value,
            },
        });
    }, {});
};
export const generateFontSizes = () => {
    return config.fonts.sizes.reduce((accumulator, size) => {
        return Object.assign(accumulator, {
            [`size_${size}`]: {
                fontSize: responsiveFontSize(size),
            },
        });
    }, {});
};
export var fontWeight;
(function (fontWeight) {
    fontWeight["regular"] = "400";
    fontWeight["medium"] = "500";
    fontWeight["semibold"] = "600";
    fontWeight["bold"] = "700";
})(fontWeight || (fontWeight = {}));
export const staticFontStyles = {
    alignLeft: {
        textAlign: 'left',
    },
    alignCenter: {
        textAlign: 'center',
    },
    bold: {
        fontWeight: fontWeight.bold,
    },
    capitalize: {
        textTransform: 'capitalize',
    },
    uppercase: {
        textTransform: 'uppercase',
    },
};
export const fontFamily = {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
};
