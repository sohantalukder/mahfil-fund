import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { View } from 'react-native';
import { Text, IconByVariant, Loader } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { staticFontStyles } from '@/theme/fonts';
const EmptyContent = ({ description, icon = 'emptyContent', title, titleVariant = 'body1', descriptionVariant = 'body2', titleColor = 'default', descriptionColor = 'default', isLoading = false, style, }) => {
    const { gutters, layout } = useTheme();
    const renderContent = () => {
        if (isLoading) {
            return _jsx(Loader, {});
        }
        return (_jsxs(_Fragment, { children: [typeof icon === 'string' ? _jsx(IconByVariant, { path: icon }) : icon, title && (_jsx(Text, { variant: titleVariant, color: titleColor, weight: "semibold", style: [gutters.marginTop_10, staticFontStyles.alignCenter], children: title })), description && (_jsx(Text, { variant: descriptionVariant, color: descriptionColor, style: [gutters.marginTop_6, staticFontStyles.alignCenter], children: description }))] }));
    };
    return (_jsx(View, { style: [layout.itemsCenter, layout.justifyCenter, style], children: renderContent() }));
};
export default EmptyContent;
