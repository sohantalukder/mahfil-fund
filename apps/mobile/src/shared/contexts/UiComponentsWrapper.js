import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ToastContainer } from '@/shared/contexts/toast';
import { DialogContainer } from './dialog';
import { BottomSheetContainer } from './bottom-sheet';
const UiComponentsWrapper = ({ children, }) => {
    return (_jsxs(_Fragment, { children: [_jsx(DialogContainer, {}), _jsx(ToastContainer, {}), _jsx(BottomSheetContainer, {}), children] }));
};
export default UiComponentsWrapper;
