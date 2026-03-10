import { getDialogManager } from './dialogManager';
export const dialog = {
    show: (props) => {
        const manager = getDialogManager();
        if (manager) {
            manager.show(props);
        }
    },
    hide: () => {
        const manager = getDialogManager();
        if (manager) {
            manager.hide();
            manager.progress(false);
        }
    },
    progress: (isLoading, buttonIndex) => {
        const manager = getDialogManager();
        if (manager) {
            manager.progress(isLoading, buttonIndex);
        }
    },
    confirm: (title, description, onConfirm, onCancel) => {
        dialog.show({
            title,
            description,
            buttons: [
                {
                    label: 'Cancel',
                    type: 'outline',
                    onPress: () => {
                        dialog.hide();
                        onCancel?.();
                    },
                },
                {
                    label: 'Confirm',
                    type: 'primary',
                    onPress: async () => {
                        // Show progress on the confirm button
                        dialog.progress(true);
                        try {
                            await onConfirm();
                            dialog.hide();
                        }
                        catch (error) {
                            // If there's an error, stop the progress but keep the dialog open
                            dialog.progress(false);
                            throw error;
                        }
                    },
                },
            ],
        });
    },
    alert: (title, description, onPress) => {
        dialog.show({
            title,
            description,
            buttons: [
                {
                    label: 'OK',
                    type: 'primary',
                    onPress: () => {
                        dialog.hide();
                        onPress?.();
                    },
                },
            ],
        });
    },
};
