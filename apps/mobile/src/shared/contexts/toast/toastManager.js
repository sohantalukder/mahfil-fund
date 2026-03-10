import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedToast } from './AnimatedToast';
import styles from './styles';
// Create a singleton instance to manage global toast state
class ToastManager {
    constructor() {
        this.toastQueue = [];
        this.currentSetToast = null;
        this.currentToasts = [];
    }
    show(toast) {
        const key = Math.random().toString();
        const newToast = { ...toast, key };
        if (this.currentSetToast) {
            this.currentToasts = [...this.currentToasts, newToast];
            this.currentSetToast(this.currentToasts);
        }
        else {
            this.toastQueue.push(toast);
        }
        return () => this.hide(key);
    }
    hide(key) {
        if (this.currentSetToast) {
            this.currentToasts = this.currentToasts.filter((t) => t.key !== key);
            this.currentSetToast(this.currentToasts);
        }
    }
    setToastSetter(setter) {
        this.currentSetToast = setter;
        // Process any queued toasts
        if (setter && this.toastQueue.length > 0) {
            const queuedToasts = this.toastQueue.map((toast) => ({
                ...toast,
                key: Math.random().toString(),
            }));
            this.currentToasts = [...this.currentToasts, ...queuedToasts];
            this.toastQueue = [];
            setter(this.currentToasts);
        }
    }
    clearToastSetter() {
        this.currentSetToast = null;
    }
    getCurrentToasts() {
        return this.currentToasts;
    }
}
// Create singleton instance
const toastManager = new ToastManager();
// Export manager functions
export const toast = toastManager;
export const setToastManager = (setter) => {
    toastManager.setToastSetter(setter);
};
export const ToastContainer = () => {
    const [toasts, setToasts] = useState(toastManager.getCurrentToasts());
    // Subscribe to manager updates
    useEffect(() => {
        setToastManager(setToasts);
        return () => {
            toastManager.clearToastSetter();
        };
    }, []);
    const hideToast = useCallback((key) => {
        toastManager.hide(key);
    }, []);
    if (toasts.length === 0) {
        return null;
    }
    return (_jsx(SafeAreaView, { style: styles.container, children: _jsx(View, { style: styles.content, children: toasts.map((item) => (_jsx(AnimatedToast, { toast: item, hide: () => hideToast(item.key) }, item.key))) }) }));
};
