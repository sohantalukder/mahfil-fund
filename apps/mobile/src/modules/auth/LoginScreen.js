import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useStore } from '@/state/store';
import routes from '@/navigation/routes';
export default function LoginScreen({ navigation }) {
    const login = useStore((s) => s.login);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const onSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            await login(email.trim(), password);
            navigation.reset({ index: 0, routes: [{ name: routes.home }] });
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Login failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(View, { style: { flex: 1, padding: 16, justifyContent: 'center' }, children: [_jsx(Text, { style: { fontSize: 22, fontWeight: '700', marginBottom: 8 }, children: "Mahfil Fund" }), _jsx(Text, { style: { color: '#6b7280', marginBottom: 16 }, children: "Login to continue" }), _jsx(TextInput, { value: email, onChangeText: setEmail, autoCapitalize: "none", keyboardType: "email-address", placeholder: "Email", style: {
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                } }), _jsx(TextInput, { value: password, onChangeText: setPassword, secureTextEntry: true, placeholder: "Password", style: {
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                } }), error && (_jsx(Text, { style: { color: '#b91c1c', marginBottom: 12 }, children: error })), _jsx(Button, { title: loading ? 'Signing in...' : 'Login', onPress: onSubmit, disabled: loading })] }));
}
