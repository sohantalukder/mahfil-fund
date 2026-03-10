import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { ScrollView, View, Alert } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/theme';
import { useI18n } from '@/shared/hooks/language/useI18n';
import { apiInstances } from '@/config/http/apiInstance.config';
import { IconByVariant, Image, Text, Button, Card, Divider, } from '@/shared/components/atoms';
import { SafeScreen } from '@/shared/components/templates';
import rs from '@/shared/utilities/responsiveSize';
function Example() {
    const { t } = useTranslation();
    const { toggleLanguage } = useI18n();
    const [isLoading, setIsLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const { changeTheme, colors, gutters, layout, variant, logo, typographies } = useTheme();
    const styles = {
        centerText: { textAlign: 'center' },
        centerTextWithLineHeight: { textAlign: 'center', lineHeight: 24 },
    };
    const onChangeTheme = () => {
        changeTheme(variant === 'default' ? 'dark' : 'default');
    };
    const fetchRandomUser = async () => {
        try {
            setIsLoading(true);
            // Using the configured API instance to fetch a random user
            const response = await apiInstances.businessService.get('users?limit=1');
            if (response.users && response.users.length > 0) {
                const user = response.users[0];
                if (user) {
                    setUserData(user);
                    Alert.alert(t('boilerplate.screen_example.api_messages.success_title'), t('boilerplate.screen_example.api_messages.success_message', {
                        firstName: user.firstName,
                        lastName: user.lastName,
                    }), [
                        {
                            text: t('boilerplate.screen_example.api_messages.success_button'),
                        },
                    ]);
                }
            }
        }
        catch (error) {
            console.error('Error fetching user:', error);
            Alert.alert(t('boilerplate.screen_example.api_messages.error_title'), t('boilerplate.screen_example.api_messages.error_message'), [{ text: t('boilerplate.screen_example.api_messages.error_button') }]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const features = [
        {
            title: t('boilerplate.screen_example.features.api_integration.title'),
            description: t('boilerplate.screen_example.features.api_integration.description'),
            icon: 'send',
            onPress: fetchRandomUser,
            isLoading,
            buttonText: t('boilerplate.screen_example.features.api_integration.button'),
        },
        {
            title: t('boilerplate.screen_example.features.theme_toggle.title'),
            description: t('boilerplate.screen_example.features.theme_toggle.description'),
            icon: 'theme',
            onPress: onChangeTheme,
            isLoading: false,
            buttonText: t('boilerplate.screen_example.features.theme_toggle.button'),
        },
        {
            title: t('boilerplate.screen_example.features.language_switch.title'),
            description: t('boilerplate.screen_example.features.language_switch.description'),
            icon: 'language',
            onPress: toggleLanguage,
            isLoading: false,
            buttonText: t('boilerplate.screen_example.features.language_switch.button'),
        },
    ];
    return (_jsx(SafeScreen, { children: _jsxs(ScrollView, { showsVerticalScrollIndicator: false, children: [_jsx(View, { style: [layout.itemsCenter, gutters.marginTop_40], children: _jsx(View, { style: [
                            layout.relative,
                            {
                                width: rs(200),
                                height: rs(200),
                                borderRadius: rs(100),
                                backgroundColor: colors.primary + '15',
                            },
                            layout.itemsCenter,
                            layout.justifyCenter,
                        ], children: _jsx(Image, { source: logo, resizeMode: "contain", style: {
                                height: rs(120),
                                width: rs(120),
                            } }) }) }), _jsxs(View, { style: [gutters.paddingHorizontal_32, gutters.marginTop_32], children: [_jsx(Text, { variant: "heading1", weight: "bold", style: [typographies.heading1, styles.centerText], children: t('boilerplate.screen_example.title') }), _jsx(Text, { variant: "body1", color: "secondary", style: [gutters.marginTop_16, styles.centerTextWithLineHeight], children: t('boilerplate.screen_example.description') })] }), userData && (_jsx(View, { style: [gutters.paddingHorizontal_32, gutters.marginTop_32], children: _jsx(Card, { variant: "elevated", elevation: 3, borderRadius: 16, padding: 20, children: _jsxs(View, { style: [layout.row, layout.itemsCenter, gutters.gap_16], children: [_jsx(Image, { source: { uri: userData.image }, style: {
                                        width: rs(60),
                                        height: rs(60),
                                        borderRadius: rs(30),
                                    } }), _jsxs(View, { style: layout.flex_1, children: [_jsxs(Text, { variant: "body1", weight: "semibold", children: [userData.firstName, " ", userData.lastName] }), _jsxs(Text, { variant: "body2", color: "secondary", children: ["@", userData.username] }), _jsx(Text, { variant: "body3", color: "secondary", children: userData.email })] })] }) }) })), _jsxs(View, { style: [gutters.paddingHorizontal_32, gutters.marginTop_40], children: [_jsx(Text, { variant: "heading2", weight: "semibold", style: gutters.marginBottom_24, children: t('boilerplate.screen_example.explore_features') }), features.map((feature, index) => (_jsxs(View, { children: [_jsxs(Card, { variant: "outlined", borderRadius: 12, padding: 20, margin: 0, elevation: 1, style: gutters.marginBottom_16, children: [_jsxs(View, { style: [layout.row, layout.itemsCenter, gutters.gap_16], children: [_jsx(View, { style: [
                                                        {
                                                            width: rs(48),
                                                            height: rs(48),
                                                            borderRadius: rs(24),
                                                            backgroundColor: colors.primary + '15',
                                                        },
                                                        layout.itemsCenter,
                                                        layout.justifyCenter,
                                                    ], children: _jsx(IconByVariant, { path: feature.icon, stroke: colors.text, width: 24, height: 24 }) }), _jsxs(View, { style: layout.flex_1, children: [_jsx(Text, { variant: "body1", weight: "semibold", children: feature.title }), _jsx(Text, { variant: "body2", color: "secondary", style: gutters.marginTop_4, children: feature.description })] })] }), _jsx(View, { style: gutters.marginTop_16, children: _jsx(Button, { text: feature.buttonText, variant: "primary", onPress: feature.onPress, isLoading: feature.isLoading, iconColor: colors.white, icon: feature.icon, borderRadius: 12 }) })] }), index < features.length - 1 && (_jsx(View, { style: gutters.marginBottom_8, children: _jsx(Divider, {}) }))] }, feature.title)))] }), _jsx(View, { style: [gutters.paddingHorizontal_32, gutters.marginTop_32], children: _jsxs(Card, { variant: "filled", borderRadius: 16, padding: 24, elevation: 2, backgroundColor: colors.primary + '10', children: [_jsx(Text, { variant: "body1", weight: "semibold", style: [gutters.marginBottom_16, styles.centerText], children: t('boilerplate.screen_example.stats.title') }), _jsxs(View, { style: [layout.row, layout.justifyBetween], children: [_jsxs(View, { style: layout.itemsCenter, children: [_jsx(Text, { variant: "heading2", weight: "bold", color: "primary", children: "5+" }), _jsx(Text, { variant: "body3", color: "secondary", children: t('boilerplate.screen_example.stats.components') })] }), _jsxs(View, { style: layout.itemsCenter, children: [_jsx(Text, { variant: "heading2", weight: "bold", color: "primary", children: "10+" }), _jsx(Text, { variant: "body3", color: "secondary", children: t('boilerplate.screen_example.stats.utilities') })] }), _jsxs(View, { style: layout.itemsCenter, children: [_jsx(Text, { variant: "heading2", weight: "bold", color: "primary", children: "2" }), _jsx(Text, { variant: "body3", color: "secondary", children: t('boilerplate.screen_example.stats.languages') })] }), _jsxs(View, { style: layout.itemsCenter, children: [_jsx(Text, { variant: "heading2", weight: "bold", color: "primary", children: "\u221E" }), _jsx(Text, { variant: "body3", color: "secondary", children: t('boilerplate.screen_example.stats.possibilities') })] })] })] }) }), _jsx(View, { style: gutters.marginBottom_40 })] }) }));
}
export default Example;
