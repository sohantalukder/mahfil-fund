import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { View, TouchableOpacity, Animated, TextInput, Keyboard, FlatList, Pressable, } from 'react-native';
import { useTheme } from '@/theme';
import IconByVariant from '../../atoms/icon-by-variant/IconByVariant';
import AnimatedLabel from '../../atoms/text-input/AnimatedLabel';
import { selectStyles } from './styles/select.styles';
import { validateSelectItem } from './utils/select-list.utility';
import { SELECT_LIST_CONSTANTS } from './constants/select-list.constant';
import { logger } from '@/ignoreWarnings';
import { Text } from '../../atoms/index';
/**
 * A customizable dropdown select list component with search functionality
 *
 * @component
 * @example
 * ```tsx
 * const data = [
 *   { key: '1', value: 'Option 1' },
 *   { key: '2', value: 'Option 2' },
 * ];
 *
 * <SelectList
 *   data={data}
 *   setSelected={setValue}
 *   placeholder="Choose an option"
 *   label="Select Option"
 *   search={true}
 * />
 * ```
 */
const SelectList = ({ setSelected, placeholder, boxStyles, inputStyles, dropdownStyles, dropdownItemStyles, dropdownTextStyles, maxHeight, data, defaultOption, arrowicon = false, closeicon = false, search = true, // "Search must" -> on by default
searchPlaceholder = 'Search...', notFoundText = 'No data found', disabledItemStyles, disabledTextStyles, onSelect = () => { }, save = 'key', dropdownShown = false, fontFamily, label, }) => {
    const { colors, layout, gutters } = useTheme();
    const styles = React.useMemo(() => selectStyles({ colors }), [colors]);
    const [firstRender, setFirstRender] = React.useState(true);
    const [dropdown, setDropdown] = React.useState(dropdownShown);
    const [selectedVal, setSelectedVal] = React.useState('');
    const [height, setHeight] = React.useState(maxHeight ?? 200);
    const [isFocused, setIsFocused] = React.useState(false);
    const animatedValue = React.useRef(new Animated.Value(dropdown ? height : 0)).current;
    // Memoized style objects to avoid inline styles
    const searchInputStyle = React.useMemo(() => ({
        padding: 0,
        height: SELECT_LIST_CONSTANTS.SEARCH_INPUT_HEIGHT,
        fontFamily,
        color: colors.text,
    }), [fontFamily, colors.text]);
    const dropdownContainerStyle = React.useMemo(() => ({
        maxHeight: animatedValue,
        position: 'absolute',
        top: SELECT_LIST_CONSTANTS.DROPDOWN_TOP_OFFSET,
        left: 0,
        right: 0,
        zIndex: SELECT_LIST_CONSTANTS.Z_INDEX,
        backgroundColor: colors.background,
        borderRadius: SELECT_LIST_CONSTANTS.BORDER_RADIUS,
        borderWidth: 1,
        borderColor: colors.gray7,
        shadowColor: colors.text,
        shadowOffset: SELECT_LIST_CONSTANTS.SHADOW_OFFSET,
        shadowOpacity: SELECT_LIST_CONSTANTS.SHADOW_OPACITY,
        shadowRadius: SELECT_LIST_CONSTANTS.SHADOW_RADIUS,
        elevation: SELECT_LIST_CONSTANTS.ELEVATION,
    }), [animatedValue, colors.background, colors.gray7, colors.text]);
    const containerStyle = React.useMemo(() => [
        styles.container,
        { zIndex: dropdown ? SELECT_LIST_CONSTANTS.Z_INDEX + 1 : 1 },
    ], [styles.container, dropdown]);
    const backdropStyle = React.useMemo(() => ({
        position: 'absolute',
        top: -1000,
        left: -1000,
        right: -1000,
        bottom: -1000,
        zIndex: SELECT_LIST_CONSTANTS.Z_INDEX - 1,
        backgroundColor: colors.transparent,
    }), [colors.transparent]);
    // Split static and dynamic styles for better performance
    const baseTextStyle = React.useMemo(() => ({
        fontFamily,
    }), [fontFamily]);
    const selectedTextColorStyle = React.useMemo(() => ({
        color: selectedVal ? colors.text : colors.gray4,
    }), [selectedVal, colors.text, colors.gray4]);
    const emptyTextStyle = React.useMemo(() => ({
        fontFamily,
        color: colors.text,
    }), [fontFamily, colors.text]);
    // query drives filteredData (no setTimeout hacks)
    const [query, setQuery] = React.useState('');
    /**
     * Animates the dropdown to slide down and show
     */
    const slideDown = React.useCallback(() => {
        setDropdown(true);
        setIsFocused(true);
        Animated.timing(animatedValue, {
            toValue: height,
            duration: SELECT_LIST_CONSTANTS.ANIMATION_DURATION.SLIDE_DOWN,
            useNativeDriver: false, // Cannot use native driver for height animations
        }).start();
    }, [animatedValue, height]);
    /**
     * Animates the dropdown to slide up and hide
     */
    const slideUp = React.useCallback(() => {
        setIsFocused(false);
        Animated.timing(animatedValue, {
            toValue: 0,
            duration: SELECT_LIST_CONSTANTS.ANIMATION_DURATION.SLIDE_UP,
            useNativeDriver: false, // Cannot use native driver for height animations
        }).start(() => setDropdown(false));
    }, [animatedValue]);
    /**
     * Updates the dropdown height when maxHeight prop changes
     */
    React.useEffect(() => {
        if (maxHeight)
            setHeight(maxHeight);
    }, [maxHeight]);
    /**
     * Sets the default selected option when defaultOption prop changes
     */
    React.useEffect(() => {
        if (!defaultOption || !validateSelectItem(defaultOption))
            return;
        // Handle both key and value, including falsy values like 0 or empty string
        const hasValidKey = defaultOption.key !== undefined && defaultOption.key !== null;
        const hasValidValue = defaultOption.value !== undefined && defaultOption.value !== null;
        if (hasValidKey) {
            setSelectedVal(defaultOption.value?.toString() ?? '');
        }
        else if (hasValidValue) {
            // Fallback to value if key is not available
            setSelectedVal(defaultOption.value?.toString() ?? '');
        }
    }, [defaultOption]);
    /**
     * Controls dropdown visibility based on external dropdownShown prop
     */
    React.useEffect(() => {
        if (firstRender) {
            setFirstRender(false);
            return;
        }
        if (dropdownShown)
            slideDown();
        else
            slideUp();
    }, [dropdownShown, firstRender, slideDown, slideUp]);
    /**
     * Triggers onSelect callback when selection changes
     */
    React.useEffect(() => {
        if (firstRender)
            return;
        onSelect();
    }, [selectedVal, onSelect, firstRender]);
    /**
     * Filters the data based on the search query
     * @returns Filtered array of valid items matching the search query
     */
    const filteredData = React.useMemo(() => {
        if (!Array.isArray(data)) {
            logger.warn('SelectList: data prop must be an array');
            return [];
        }
        // Filter out invalid items and validate
        const validData = data.filter(validateSelectItem);
        if (validData.length !== data.length) {
            logger.warn('SelectList: Some items in data array are invalid and were filtered out');
        }
        const q = query.trim().toLowerCase();
        if (!search || q.length === 0)
            return validData;
        return validData.filter((item) => {
            const itemLabel = String(item?.value ?? item?.key ?? '').toLowerCase();
            return itemLabel.includes(q);
        });
    }, [data, query, search]);
    /**
     * Handles the selection of an item from the dropdown
     * @param item - The selected item
     */
    const handlePick = React.useCallback((item) => {
        const key = item.key ?? item.value;
        const value = item.value ?? '';
        if (save === 'value')
            setSelected(value);
        else
            setSelected(key);
        setSelectedVal(value?.toString() ?? '');
        // clear search & close
        setQuery('');
        slideUp();
    }, [save, slideUp]);
    /**
     * Renders a single item in the dropdown list
     * @param item - The item to render
     * @returns JSX element for the item
     */
    const renderItem = React.useCallback(({ item }) => {
        const value = item.value ?? '';
        const disabled = !!item.disabled;
        const itemStyle = [
            gutters.paddingHorizontal_20,
            gutters.paddingVertical_10,
        ];
        const disabledItemStyle = [
            ...itemStyle,
            { backgroundColor: colors.gray1, opacity: 0.5 },
        ];
        const disabledTextStyle = [
            { color: colors.gray4, fontFamily },
            disabledTextStyles,
        ];
        const enabledTextStyle = [
            { fontFamily, color: colors.text },
            dropdownTextStyles,
        ];
        if (disabled) {
            return (_jsx(View, { style: [disabledItemStyle, disabledItemStyles], children: _jsx(Text, { style: disabledTextStyle, children: String(value) }) }));
        }
        return (_jsx(TouchableOpacity, { style: [itemStyle, dropdownItemStyles], onPress: () => handlePick(item), accessibilityRole: "button", accessibilityLabel: `Select ${String(value)}`, children: _jsx(Text, { style: enabledTextStyle, children: String(value) }) }));
    }, [
        gutters.paddingHorizontal_20,
        gutters.paddingVertical_10,
        colors.gray1,
        colors.gray4,
        colors.text,
        fontFamily,
        disabledItemStyles,
        disabledTextStyles,
        dropdownItemStyles,
        dropdownTextStyles,
        handlePick,
    ]);
    /**
     * Extracts a unique key for each item in the list
     * @param item - The item to extract key from
     * @param index - The index of the item
     * @returns Unique string key
     */
    const keyExtractor = (item, index) => String(item?.key ?? item?.value ?? index);
    return (_jsxs(View, { style: containerStyle, children: [dropdown && (_jsx(Pressable, { style: backdropStyle, onPress: slideUp })), _jsx(AnimatedLabel, { label: label || placeholder || 'Select option', value: selectedVal ?? '', isFocused: selectedVal?.toString() ? true : isFocused }), dropdown && search ? (_jsx(View, { style: [
                    styles.select,
                    isFocused && styles.activeContainer,
                    boxStyles,
                ], children: _jsxs(View, { style: [layout.row, layout.itemsCenter, layout.flex_1], children: [_jsx(TextInput, { placeholder: searchPlaceholder, value: query, onChangeText: setQuery, style: [searchInputStyle, layout.flex_1, inputStyles], returnKeyType: "search", autoFocus: true, placeholderTextColor: colors.gray4 }), _jsx(TouchableOpacity, { onPress: slideUp, accessibilityRole: "button", accessibilityLabel: "Close", style: styles.arrow, children: !closeicon ? _jsx(IconByVariant, { path: "cancel" }) : closeicon })] }) })) : (_jsxs(TouchableOpacity, { style: [
                    styles.select,
                    isFocused && styles.activeContainer,
                    boxStyles,
                ], onPress: () => {
                    if (!dropdown) {
                        Keyboard.dismiss();
                        slideDown();
                    }
                    else {
                        slideUp();
                    }
                }, accessibilityRole: "button", accessibilityLabel: "Open dropdown", children: [_jsx(Text, { style: [baseTextStyle, selectedTextColorStyle, inputStyles], children: selectedVal === '' && isFocused
                            ? placeholder || 'Select option'
                            : String(selectedVal) }), _jsx(View, { style: styles.arrow, children: !arrowicon ? (_jsx(IconByVariant, { path: "downArrow", height: 18, width: 18 })) : (arrowicon) })] })), dropdown ? (_jsx(Animated.View, { style: [dropdownContainerStyle, dropdownStyles], children: _jsx(FlatList, { data: filteredData, keyExtractor: keyExtractor, renderItem: renderItem, keyboardShouldPersistTaps: "handled", contentContainerStyle: [gutters.paddingVertical_10], nestedScrollEnabled: true, getItemLayout: (_, index) => ({
                        length: SELECT_LIST_CONSTANTS.ITEM_HEIGHT,
                        offset: SELECT_LIST_CONSTANTS.ITEM_HEIGHT * index,
                        index,
                    }), ListEmptyComponent: _jsx(TouchableOpacity, { style: [
                            gutters.paddingHorizontal_20,
                            gutters.paddingVertical_10,
                            dropdownItemStyles,
                        ], onPress: () => {
                            setSelected(undefined);
                            setSelectedVal('');
                            setQuery('');
                            slideUp();
                        }, children: _jsx(Text, { style: [emptyTextStyle, dropdownTextStyles], children: notFoundText }) }) }) })) : null] }));
};
export default SelectList;
