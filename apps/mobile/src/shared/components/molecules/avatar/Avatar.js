import { jsx as _jsx } from "react/jsx-runtime";
import { View } from 'react-native';
import Image from '@/shared/components/atoms/image/Image';
import { IconByVariant } from '@/shared/components/atoms';
const Avatar = ({ imageUrl, height = 20, width = 20, style, borderRadius = 0, }) => {
    // Check if imageUrl is a valid string and contains http/https
    const isValidUrl = imageUrl &&
        typeof imageUrl === 'string' &&
        (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
    return isValidUrl ? (_jsx(View, { style: { height, width }, children: _jsx(Image, { source: { uri: imageUrl }, height: height, width: width, wrapperStyle: style, borderRadius: borderRadius }) })) : (_jsx(IconByVariant, { path: 'profile', height: Number(height) / 1.5, width: Number(width) / 1.5 }));
};
export default Avatar;
