import { jsx as _jsx } from "react/jsx-runtime";
import { View, RefreshControl } from 'react-native';
import rs from '@/shared/utilities/responsiveSize';
import { useTheme } from '@/theme';
import { FlashList as RNFlashList } from '@shopify/flash-list';
import { EmptyContent, NoInternet } from '../../molecules';
import { useMemo } from 'react';
import { Loader } from '../../atoms';
import layout from '@/theme/layout';
import { NETWORK_ERROR } from '@/assets/constants/network.constant';
import { PAGINATION_CONFIG } from './constant';
import { useBottomSheetFlashList } from './useBottomSheetFlashList';
/**
 * @description This is a flash list component.
 */
const FlashList = ({ data, renderItem, refreshing, onRefresh, isLoading = false, emptyText = 'No Data Found', emptyDescription = 'No Data Found', isFetchingNextPage = false, hasNextPage = false, error = '', refetch = () => { }, isBottomSheet = false, skeleton, ...props }) => {
    const { colors, gutters } = useTheme();
    const bottomSheetFlashListProps = useBottomSheetFlashList();
    // Memoize empty component
    const EmptyComponent = useMemo(() => {
        if (error === NETWORK_ERROR.noInternet) {
            return _jsx(NoInternet, { onRetry: refetch });
        }
        return (_jsx(EmptyContent, { style: { marginTop: rs(20) }, isLoading: isLoading, title: emptyText, description: emptyDescription }));
    }, [isLoading, emptyText, emptyDescription, error, refetch]);
    // Memoize footer component
    const FooterComponent = useMemo(() => {
        if (isFetchingNextPage && hasNextPage) {
            return (_jsx(View, { style: [
                    gutters.paddingVertical_20,
                    layout.flex_1,
                    layout.itemsCenter,
                ], children: _jsx(Loader, {}) }));
        }
        return null;
    }, [isFetchingNextPage, hasNextPage, gutters, layout]);
    // Memoize refresh control
    const refreshControl = useMemo(() => {
        return (_jsx(RefreshControl, { refreshing: refreshing ?? false, onRefresh: onRefresh ?? (() => { }), progressBackgroundColor: colors.background, colors: [colors.text], tintColor: colors.text }));
    }, [refreshing, onRefresh, colors]);
    // Memoize bottom sheet specific props
    const bottomSheetProps = useMemo(() => {
        if (!isBottomSheet)
            return {};
        return {
            ...bottomSheetFlashListProps,
            // Allow simultaneous gestures between bottom sheet and list
            simultaneousHandlers: undefined,
        };
    }, [isBottomSheet, bottomSheetFlashListProps]);
    if (isLoading && skeleton) {
        return skeleton;
    }
    return (_jsx(RNFlashList, { data: data, refreshControl: refreshControl, renderItem: renderItem, ListEmptyComponent: EmptyComponent, ListFooterComponent: FooterComponent, showsVerticalScrollIndicator: false, removeClippedSubviews: true, disableAutoLayout: false, keyboardShouldPersistTaps: "handled", onEndReachedThreshold: PAGINATION_CONFIG.END_REACHED_THRESHOLD, overrideItemLayout: (_layout, _item, _index, _maxColumns) => {
            // eslint-disable-next-line no-param-reassign
            _layout.size = PAGINATION_CONFIG.ESTIMATED_ITEM_SIZE;
        }, ...bottomSheetProps, ...props }));
};
export default FlashList;
