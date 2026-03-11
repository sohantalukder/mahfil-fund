import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { View, Pressable } from 'react-native';
import { Text, IconByVariant } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import {
  createAnimatedContextMenuStyles,
  getMenuItemPressedStyle,
  getMenuItemDisabledStyle,
  getHeaderTitleStyle,
  getHeaderSubtitleStyle,
  getSectionTitleTextStyle,
  getMenuItemTextStyle,
  getIconColor,
} from '../styles/animatedContextMenu.styles';
import rs from '@/shared/utilities/responsiveSize';
export const useContextMenuRenderers = ({ config, handleItemPress }) => {
  const { colors, layout } = useTheme();
  const styles = createAnimatedContextMenuStyles(colors);
  const renderMenuItem = (item, _index) => {
    return _jsxs(
      View,
      {
        children: [
          _jsx(Pressable, {
            style: ({ pressed }) => [
              styles.menuItem,
              getMenuItemPressedStyle(colors, pressed),
              getMenuItemDisabledStyle(item.disabled || false),
            ],
            onPress: () => handleItemPress(item),
            disabled: item.disabled,
            children: _jsxs(View, {
              style: [layout.row, layout.itemsCenter, styles.menuItemContent],
              children: [
                config.showIcons !== false &&
                  item.icon &&
                  _jsx(IconByVariant, {
                    path: item.icon,
                    width: rs(20),
                    height: rs(20),
                    color: getIconColor(colors, item),
                  }),
                _jsx(Text, {
                  variant: 'body2',
                  style: [
                    styles.menuItemText,
                    getMenuItemTextStyle(colors, item.destructive),
                  ],
                  children: item.label,
                }),
                item.checked &&
                  _jsx(IconByVariant, {
                    path: 'check',
                    width: rs(20),
                    height: rs(20),
                  }),
              ],
            }),
          }),
          item.separator && _jsx(View, { style: styles.separator }),
        ],
      },
      item.id
    );
  };
  const renderSectionTitle = (section) => {
    if (!section.title) return null;
    return _jsx(View, {
      style: styles.sectionTitle,
      children: _jsx(Text, {
        variant: 'body3',
        style: [styles.sectionTitleText, getSectionTitleTextStyle(colors)],
        children: section.title,
      }),
    });
  };
  const renderHeader = () => {
    if (!config.title && !config.subtitle) return null;
    return _jsxs(View, {
      style: styles.header,
      children: [
        config.title &&
          _jsx(Text, {
            variant: 'body1',
            style: [styles.headerTitle, getHeaderTitleStyle(colors)],
            children: config.title,
          }),
        config.subtitle &&
          _jsx(Text, {
            variant: 'body3',
            style: [styles.headerSubtitle, getHeaderSubtitleStyle(colors)],
            children: config.subtitle,
          }),
      ],
    });
  };
  const renderMenuItems = () => {
    return config.items?.map((item, index) => renderMenuItem(item, index));
  };
  const renderSections = () => {
    return config.sections?.map((section, sectionIndex) =>
      _jsxs(
        View,
        {
          children: [
            sectionIndex > 0 && _jsx(View, { style: styles.separator }),
            renderSectionTitle(section),
            section.items.map((item, index) => renderMenuItem(item, index)),
          ],
        },
        section.id
      )
    );
  };
  return {
    renderMenuItem,
    renderSectionTitle,
    renderHeader,
    renderMenuItems,
    renderSections,
    styles,
  };
};
