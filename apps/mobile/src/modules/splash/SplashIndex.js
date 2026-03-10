import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Loader } from '@/shared/components/atoms';
import { SafeSplashScreen } from '@/shared/components/templates';
import { useTheme } from '@/theme';
import AnimatedLogo from './components/AnimatedLogo';
import useSplash from './hooks/useSplash';
const SplashIndex = () => {
    const { gutters } = useTheme();
    const { isLoading } = useSplash();
    return (_jsxs(SafeSplashScreen, { children: [_jsx(AnimatedLogo, {}), isLoading ? _jsx(Loader, { style: gutters.marginBottom_40 }) : null] }));
};
export default SplashIndex;
