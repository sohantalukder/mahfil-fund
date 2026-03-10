import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import Text from '@/shared/components/atoms/text/Text';
import { Checkbox } from '@/shared/components/atoms';
import { MULTI_SELECT_LIST_CONSTANTS } from '../constants';
import rs from '@/shared/utilities/responsiveSize';
const DropdownItem = ({ item, isSelected, onToggle, checkboxContainerStyle, checkBoxStyles, dropdownItemStyles, dropdownTextStyles, disabledItemStyles, disabledTextStyles, disabledCheckBoxStyles, }) => {
    const { gutters, layout, colors } = useTheme();
    const valueStr = String(item.value ?? '');
    const baseRow = [gutters.paddingHorizontal_20, gutters.paddingVertical_10, layout.row, layout.itemsCenter];
    if (item.disabled) {
        return (_jsxs(View, { style: [...baseRow, { backgroundColor: colors.gray1, opacity: rs(0.5) }, disabledItemStyles], children: [_jsx(View, { style: [{ marginRight: rs(10) }, checkboxContainerStyle, disabledCheckBoxStyles], children: _jsx(Checkbox, { checked: isSelected, disabled: true, size: MULTI_SELECT_LIST_CONSTANTS.CHECKBOX_SIZE }) }), _jsx(Text, { color: "disabled", style: disabledTextStyles, children: valueStr })] }));
    }
    return (_jsxs(TouchableOpacity, { style: [...baseRow, dropdownItemStyles], onPress: () => onToggle(item), accessibilityRole: "button", accessibilityLabel: `${isSelected ? 'Deselect' : 'Select'} ${valueStr}`, children: [_jsx(View, { style: [{ marginRight: rs(10) }, checkboxContainerStyle, checkBoxStyles], children: _jsx(Checkbox, { checked: isSelected, onPress: () => onToggle(item), size: MULTI_SELECT_LIST_CONSTANTS.CHECKBOX_SIZE }) }), _jsx(Text, { color: "default", style: dropdownTextStyles, children: valueStr })] }));
};
export default DropdownItem;
