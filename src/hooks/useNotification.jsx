import { useState, useCallback } from 'react';

export function useNotification() {
    const [notification, setNotification] = useState(null);

    const showNotification = useCallback((options) => {
        setNotification({
            id: Date.now(),
            ...options
        });
    }, []);

    const showSuccess = useCallback((title, message) => {
        showNotification({
            type: 'success',
            title,
            message,
            confirmText: 'OK'
        });
    }, [showNotification]);

    const showError = useCallback((title, message) => {
        showNotification({
            type: 'error',
            title,
            message,
            confirmText: 'OK'
        });
    }, [showNotification]);

    const showWarning = useCallback((title, message) => {
        showNotification({
            type: 'warning',
            title,
            message,
            confirmText: 'OK'
        });
    }, [showNotification]);

    const showInfo = useCallback((title, message) => {
        showNotification({
            type: 'info',
            title,
            message,
            confirmText: 'OK'
        });
    }, [showNotification]);

    const showConfirmation = useCallback((title, message, onConfirm, confirmText = 'Bekreft', cancelText = 'Avbryt') => {
        showNotification({
            type: 'warning',
            title,
            message,
            showCancel: true,
            confirmText,
            cancelText,
            onConfirm
        });
    }, [showNotification]);

    const hideNotification = useCallback(() => {
        setNotification(null);
    }, []);

    return {
        notification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirmation,
        hideNotification
    };
}
