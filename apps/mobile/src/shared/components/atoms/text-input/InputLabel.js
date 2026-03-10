import { jsx as _jsx } from "react/jsx-runtime";
import Text from '../text/Text';
export const InputLabel = ({ text, labelStyle }) => {
    if (!text)
        return null;
    return (_jsx(Text, { style: labelStyle, variant: "body2", children: text }));
};
