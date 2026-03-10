import { jsx as _jsx } from "react/jsx-runtime";
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
const LeftArrowIcon = ({ fill, height = 24, width = 24, }) => {
    const { colors } = useTheme();
    return (_jsx(Svg, { fill: "none", height: height, viewBox: "0 0 24 24", width: width, children: _jsx(Path, { d: "M15.5 19l-7-7 7-7", stroke: fill ?? colors.text, strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2 }) }));
};
export default LeftArrowIcon;
