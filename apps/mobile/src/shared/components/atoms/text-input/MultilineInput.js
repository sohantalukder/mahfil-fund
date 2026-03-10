import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import rs from '@/shared/utilities/responsiveSize';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme';
import { inputStyles } from './styles/input.styles';
const MultilineInput = ({ containerStyle, defaultValue, height = rs(150), inputStyle = {}, label = '', labelStyle = {}, name = '', numberOfLines = 5, onChangeText, onChangeValue, placeholder, ...props }) => {
    const { colors, gutters, typographies, variant } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const inputReference = useRef(null);
    // Memoize styles to prevent unnecessary recalculations
    const styles = useMemo(() => inputStyles({
        colors,
        variant,
    }), [colors, variant]);
    // Handle text changes
    const handleChangeText = useCallback((text) => {
        if (onChangeValue) {
            onChangeValue(text, name);
        }
        if (onChangeText) {
            onChangeText(text, name);
        }
    }, [onChangeValue, onChangeText, name]);
    // Handle focus event
    const handleFocus = useCallback(() => {
        setIsFocused(true);
    }, []);
    // Handle blur event
    const handleBlur = useCallback(() => {
        setIsFocused(false);
    }, []);
    // Get container style based on focus state
    const containerStyles = useMemo(() => [
        styles.multiLineContainer,
        isFocused && styles.activeContainer,
        containerStyle,
    ], [
        styles.multiLineContainer,
        styles.activeContainer,
        containerStyle,
        isFocused,
    ]);
    // Get label style
    const labelStyles = useMemo(() => [typographies.body1, gutters.paddingBottom_6, labelStyle], [typographies.body1, gutters.paddingBottom_6, labelStyle]);
    // Get input style
    const textInputStyles = useMemo(() => [styles.input, { height }, inputStyle], [styles.input, height, inputStyle]);
    return (_jsxs(View, { style: containerStyles, children: [label ? _jsx(Text, { style: labelStyles, children: label }) : null, _jsx(TextInput, { testID: "multiline-input", defaultValue: defaultValue?.toString(), multiline: true, numberOfLines: numberOfLines, onBlur: handleBlur, onChangeText: handleChangeText, onFocus: handleFocus, placeholder: placeholder, placeholderTextColor: colors.gray4, ref: inputReference, selectionColor: colors.primary, style: textInputStyles, textAlignVertical: "center", ...props })] }));
};
export default React.memo(MultilineInput);
