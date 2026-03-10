import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { View, TouchableOpacity, Animated, TextInput, Keyboard, FlatList, Pressable, ActivityIndicator, } from 'react-native';
import { useTheme } from '@/theme';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import AnimatedLabel from '@/shared/components/atoms/text-input/AnimatedLabel';
import Text from '@/shared/components/atoms/text/Text';
import { multiSelectStyles } from './styles';
import { validateMultiSelectItem, arraysEqual, getStoredValue } from './utils';
import { MULTI_SELECT_LIST_CONSTANTS } from './constants';
import debounceHandler from '@/shared/utilities/debounceHandler';
import BadgeBar from './components/BadgeBar';
import DropdownItem from './components/DropdownItem';
import rs from '@/shared/utilities/responsiveSize';
const MultiSelectList = ({ setSelected, selectedValues = [], placeholder, boxStyles, inputStyles, dropdownStyles, dropdownItemStyles, dropdownTextStyles, maxHeight, data, arrowicon = false, closeicon = false, search = true, searchQuery: externalSearchQuery, onSearchChange, searchPlaceholder = 'Search...', notFoundText = 'No data found', disabledItemStyles, disabledTextStyles, disabledCheckBoxStyles, checkBoxStyles, badgeStyles, badgeTextStyles, onSelect, dropdownShown = false, fontFamily, label, enableInfiniteScroll = false, onLoadMore, isLoading = false, hasMore = true, loadingComponent, save = 'key', }) => {
    const { colors, layout, gutters } = useTheme();
    const styles = React.useMemo(() => multiSelectStyles({ colors }), [colors]);
    const [dropdown, setDropdown] = React.useState(dropdownShown);
    const [selectedVal, setSelectedVal] = React.useState(selectedValues);
    const [isFocused, setIsFocused] = React.useState(false);
    const [internalSearchQuery, setInternalSearchQuery] = React.useState('');
    const [showAllBadges, setShowAllBadges] = React.useState(false);
    const animatedValue = React.useRef(new Animated.Value(dropdown ? maxHeight ?? 350 : 0)).current;
    const currentSearchQuery = externalSearchQuery ?? internalSearchQuery;
    const debouncedSearchChange = React.useMemo(() => debounceHandler((q) => onSearchChange?.(q), MULTI_SELECT_LIST_CONSTANTS.SEARCH_DEBOUNCE_MS), [onSearchChange]);
    const searchInputStyle = React.useMemo(() => ({
        padding: 0,
        height: MULTI_SELECT_LIST_CONSTANTS.SEARCH_INPUT_HEIGHT,
        fontFamily,
        color: colors.text,
    }), [fontFamily, colors.text]);
    const dropdownContainerStyle = React.useMemo(() => ({
        maxHeight: animatedValue,
        position: 'absolute',
        top: MULTI_SELECT_LIST_CONSTANTS.DROPDOWN_TOP_OFFSET,
        left: 0,
        right: 0,
        zIndex: MULTI_SELECT_LIST_CONSTANTS.Z_INDEX,
        backgroundColor: colors.background,
        borderRadius: MULTI_SELECT_LIST_CONSTANTS.BORDER_RADIUS,
        borderWidth: 1,
        borderColor: colors.gray7,
        shadowColor: colors.text,
        shadowOffset: MULTI_SELECT_LIST_CONSTANTS.SHADOW_OFFSET,
        shadowOpacity: MULTI_SELECT_LIST_CONSTANTS.SHADOW_OPACITY,
        shadowRadius: MULTI_SELECT_LIST_CONSTANTS.SHADOW_RADIUS,
        elevation: MULTI_SELECT_LIST_CONSTANTS.ELEVATION,
    }), [animatedValue, colors.background, colors.gray7, colors.text]);
    const badgeBaseStyle = React.useMemo(() => ({
        backgroundColor: colors.gray7,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    }), [colors.gray7]);
    const slideDown = React.useCallback(() => {
        setDropdown(true);
        setIsFocused(true);
        Animated.timing(animatedValue, {
            toValue: maxHeight ?? 350,
            duration: MULTI_SELECT_LIST_CONSTANTS.ANIMATION_DURATION.SLIDE_DOWN,
            useNativeDriver: false,
        }).start();
    }, [animatedValue, maxHeight]);
    const slideUp = React.useCallback(() => {
        setIsFocused(false);
        Keyboard.dismiss();
        setShowAllBadges(false);
        Animated.timing(animatedValue, {
            toValue: 0,
            duration: MULTI_SELECT_LIST_CONSTANTS.ANIMATION_DURATION.SLIDE_UP,
            useNativeDriver: false,
        }).start(() => setDropdown(false));
    }, [animatedValue]);
    React.useEffect(() => {
        if (!arraysEqual(selectedValues, selectedVal)) {
            setSelectedVal([...selectedValues]);
            setShowAllBadges(false);
        }
    }, [selectedValues, selectedVal]);
    React.useEffect(() => {
        if (dropdownShown) {
            slideDown();
        }
        else {
            slideUp();
        }
    }, [dropdownShown, slideDown, slideUp]);
    const notifySelect = React.useCallback((vals) => {
        setSelected(vals);
        onSelect?.(vals);
    }, [onSelect]);
    const handleSearchChange = React.useCallback((query) => {
        if (externalSearchQuery === undefined)
            setInternalSearchQuery(query);
        debouncedSearchChange(query);
    }, [externalSearchQuery, debouncedSearchChange]);
    const clearSearch = React.useCallback(() => {
        if (externalSearchQuery === undefined)
            setInternalSearchQuery('');
        onSearchChange?.('');
    }, [externalSearchQuery, onSearchChange]);
    const closeAndClear = React.useCallback(() => {
        clearSearch();
        slideUp();
    }, [clearSearch, slideUp]);
    const filteredData = React.useMemo(() => {
        const valid = data.filter(validateMultiSelectItem);
        const q = currentSearchQuery.trim().toLowerCase();
        if (!search || q.length === 0)
            return valid;
        return valid.filter((item) => {
            const labelText = String(item?.value ?? item?.key ?? '').toLowerCase();
            return labelText.includes(q);
        });
    }, [data, currentSearchQuery, search]);
    const handlePick = React.useCallback((item) => {
        const stored = getStoredValue(item, save);
        const isAlready = selectedVal.includes(stored);
        const next = isAlready ? selectedVal.filter((v) => v !== stored) : [...selectedVal, stored];
        setSelectedVal(next);
        notifySelect(next);
        if (next.length <= MULTI_SELECT_LIST_CONSTANTS.MAX_VISIBLE_BADGES)
            setShowAllBadges(false);
    }, [selectedVal, save, notifySelect]);
    const handleRemoveBadge = React.useCallback((stored) => {
        const next = selectedVal.filter((v) => v !== stored);
        setSelectedVal(next);
        notifySelect(next);
        if (next.length <= MULTI_SELECT_LIST_CONSTANTS.MAX_VISIBLE_BADGES)
            setShowAllBadges(false);
    }, [selectedVal, notifySelect]);
    const renderLoadingIndicator = React.useCallback(() => {
        if (!isLoading)
            return null;
        if (loadingComponent)
            return loadingComponent;
        return (_jsx(View, { style: [gutters.paddingVertical_10, layout.justifyCenter, layout.itemsCenter], children: _jsx(ActivityIndicator, { size: "small", color: colors.primary }) }));
    }, [
        isLoading,
        loadingComponent,
        gutters.paddingVertical_10,
        layout.justifyCenter,
        layout.itemsCenter,
        colors.primary,
    ]);
    const keyExtractor = React.useCallback((item, index) => String(item?.key ?? item?.value ?? index), []);
    const getItemLayout = React.useCallback((_, index) => ({
        length: MULTI_SELECT_LIST_CONSTANTS.ITEM_HEIGHT,
        offset: MULTI_SELECT_LIST_CONSTANTS.ITEM_HEIGHT * index,
        index,
    }), []);
    const containerStyle = React.useMemo(() => [styles.container, { zIndex: dropdown ? MULTI_SELECT_LIST_CONSTANTS.Z_INDEX + 1 : 1 }], [styles.container, dropdown]);
    const backdropStyle = React.useMemo(() => ({
        position: 'absolute',
        top: -1000,
        left: -1000,
        right: -1000,
        bottom: -1000,
        zIndex: MULTI_SELECT_LIST_CONSTANTS.Z_INDEX - 1,
        backgroundColor: colors.transparent,
    }), [colors.transparent]);
    const handleEndReached = React.useCallback(() => {
        if (!enableInfiniteScroll || !onLoadMore || isLoading || !hasMore)
            return;
        onLoadMore();
    }, [enableInfiniteScroll, onLoadMore, isLoading, hasMore]);
    const renderItem = React.useCallback(({ item }) => {
        const stored = getStoredValue(item, save);
        const isSelected = selectedVal.includes(stored);
        return (_jsx(DropdownItem, { item: item, isSelected: isSelected, onToggle: handlePick, checkboxContainerStyle: { marginRight: rs(10) }, checkBoxStyles: checkBoxStyles, dropdownItemStyles: dropdownItemStyles, dropdownTextStyles: dropdownTextStyles, disabledItemStyles: disabledItemStyles, disabledTextStyles: disabledTextStyles, disabledCheckBoxStyles: disabledCheckBoxStyles }));
    }, [
        save,
        selectedVal,
        handlePick,
        checkBoxStyles,
        dropdownItemStyles,
        dropdownTextStyles,
        disabledItemStyles,
        disabledTextStyles,
        disabledCheckBoxStyles,
    ]);
    return (_jsxs(View, { style: containerStyle, children: [dropdown && (_jsx(Pressable, { style: backdropStyle, onPress: closeAndClear })), _jsx(TouchableOpacity, { onPress: () => {
                    if (!dropdown) {
                        Keyboard.dismiss();
                        slideDown();
                    }
                }, children: _jsx(AnimatedLabel, { label: label || placeholder || 'Select options', value: selectedVal.length > 0 ? `${selectedVal.length} selected` : '', isFocused: isFocused }) }), dropdown && search ? (_jsx(View, { style: [styles.select, isFocused && styles.activeContainer, boxStyles], children: _jsxs(View, { style: [layout.row, layout.itemsCenter, layout.flex_1], children: [_jsx(TextInput, { placeholder: searchPlaceholder, value: currentSearchQuery, onChangeText: handleSearchChange, style: [searchInputStyle, layout.flex_1, inputStyles], returnKeyType: "search", autoFocus: true, placeholderTextColor: colors.gray4 }), _jsx(TouchableOpacity, { onPress: closeAndClear, accessibilityRole: "button", accessibilityLabel: "Close", style: styles.arrow, children: !closeicon ? _jsx(IconByVariant, { path: "cancel" }) : closeicon })] }) })) : (_jsxs(TouchableOpacity, { style: [styles.select, isFocused && styles.activeContainer, boxStyles], onPress: () => {
                    if (!dropdown) {
                        Keyboard.dismiss();
                        slideDown();
                    }
                    else {
                        slideUp();
                    }
                }, accessibilityRole: "button", accessibilityLabel: "Open dropdown", children: [_jsx(View, { style: layout.flex_1, children: selectedVal.length > 0 ? (_jsx(View, { style: gutters.marginTop_6, children: _jsx(BadgeBar, { selected: selectedVal, data: data, showAll: showAllBadges, onToggleShowAll: setShowAllBadges, onRemove: handleRemoveBadge, badgeBaseStyle: badgeBaseStyle, badgeStyles: badgeStyles, badgeTextStyles: badgeTextStyles }) })) : (_jsx(Text, { color: "disabled", style: inputStyles, children: isFocused ? placeholder || 'Select options' : '' })) }), _jsx(View, { style: styles.arrow, children: !arrowicon ? (_jsx(IconByVariant, { path: "downArrow", height: 18, width: 18 })) : (arrowicon) })] })), dropdown && (_jsxs(Animated.View, { style: [dropdownContainerStyle, dropdownStyles], children: [selectedVal.length > 0 && (_jsx(View, { style: [gutters.paddingHorizontal_20, gutters.paddingTop_16], children: _jsx(BadgeBar, { selected: selectedVal, data: data, showAll: showAllBadges, onToggleShowAll: setShowAllBadges, onRemove: handleRemoveBadge, badgeBaseStyle: badgeBaseStyle, badgeStyles: badgeStyles, badgeTextStyles: badgeTextStyles }) })), _jsx(FlatList, { data: filteredData, keyExtractor: keyExtractor, renderItem: renderItem, keyboardShouldPersistTaps: "handled", contentContainerStyle: [gutters.paddingVertical_10, gutters.paddingTop_0], nestedScrollEnabled: true, onEndReached: handleEndReached, onEndReachedThreshold: MULTI_SELECT_LIST_CONSTANTS.INFINITE_SCROLL_THRESHOLD, scrollEventThrottle: 16, getItemLayout: getItemLayout, ListEmptyComponent: _jsx(TouchableOpacity, { style: [gutters.paddingHorizontal_20, gutters.paddingVertical_10, dropdownItemStyles], onPress: () => {
                                setSelectedVal([]);
                                notifySelect([]);
                                closeAndClear();
                            }, children: _jsx(Text, { color: "default", style: dropdownTextStyles, children: notFoundText }) }), ListFooterComponent: renderLoadingIndicator })] }))] }));
};
export default MultiSelectList;
