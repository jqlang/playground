import React, { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

export interface NotificationProps {
    message?: string;
    messageId?: string;
    severity?: 'error' | 'warning' | 'info' | 'success';
}

export const Notification: React.FC<NotificationProps> = ({ message, messageId, severity }) => {
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

    useEffect(() => {
        if (messageId && message) {
            setSnackbarOpen(true);
        }
    }, [messageId, message]);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    return (
        <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleClose}>
            <Alert onClose={handleClose} severity={severity || 'info'} sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    );
};
