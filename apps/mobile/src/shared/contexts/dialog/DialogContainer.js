import { jsx as _jsx } from "react/jsx-runtime";
import Dialog from '@/shared/components/atoms/dialog/Dialog';
import { memo, useEffect, useState } from 'react';
import { setDialogManager } from './dialogManager';
const DialogContainer = memo(() => {
    const [currentDialog, setCurrentDialog] = useState(null);
    useEffect(() => {
        setDialogManager(setCurrentDialog);
        return () => {
            setDialogManager(null);
        };
    }, []);
    return (_jsx(Dialog, { ...currentDialog, visible: !!currentDialog, onDismiss: () => setCurrentDialog(null) }));
});
export default DialogContainer;
