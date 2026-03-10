import { Alert } from 'react-native';
const alert = (params) => {
    const core = {
        title: '',
        body: '',
        okButtonText: 'OK',
        onPressAction: () => { },
    };
    const data = { ...core, ...params };
    const { title, body, okButtonText, onPressAction } = data;
    Alert.alert(title, body, [{ text: okButtonText, onPress: () => onPressAction('confirm') }], { userInterfaceStyle: 'dark' });
};
export { alert };
