import { jsx as _jsx } from "react/jsx-runtime";
import ScreenContainer from '@/shared/components/templates/screen-container/ScreenContainer';
const SafeScreen = (props) => (_jsx(ScreenContainer, { ...props, useErrorBoundary: true }));
export default SafeScreen;
