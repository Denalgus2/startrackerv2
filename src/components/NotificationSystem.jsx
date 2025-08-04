// Global notification system with toast notifications
import React, { createContext, useContext, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext();

const toastStyles = {
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200 text-green-800',
    iconClassName: 'text-green-600'
  },
  error: {
    icon: XCircle,
    className: 'bg-red-50 border-red-200 text-red-800',
    iconClassName: 'text-red-600'
  },
  warning: {
    icon: AlertCircle,
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    iconClassName: 'text-yellow-600'
  },
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-800',
    iconClassName: 'text-blue-600'
  }
};

function CustomToast({ type, title, message, onDismiss }) {
  const style = toastStyles[type];
  const Icon = style.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md ${style.className}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.iconClassName}`} />
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold text-sm mb-1">{title}</h4>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function NotificationProvider({ children }) {
  const showNotification = useCallback((type, message, options = {}) => {
    const { title, duration = 4000, persistent = false } = options;

    return toast.custom(
      (t) => (
        <CustomToast
          type={type}
          title={title}
          message={message}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: persistent ? Infinity : duration,
        position: 'top-right'
      }
    );
  }, []);

  const showSuccess = useCallback((message, options) => {
    return showNotification('success', message, options);
  }, [showNotification]);

  const showError = useCallback((message, options) => {
    return showNotification('error', message, { duration: 6000, ...options });
  }, [showNotification]);

  const showWarning = useCallback((message, options) => {
    return showNotification('warning', message, options);
  }, [showNotification]);

  const showInfo = useCallback((message, options) => {
    return showNotification('info', message, options);
  }, [showNotification]);

  const showOfflineNotification = useCallback(() => {
    return showNotification('warning', 'Du er offline. Noen funksjoner kan være begrenset.', {
      title: 'Ingen internettforbindelse',
      persistent: true
    });
  }, [showNotification]);

  const showOnlineNotification = useCallback(() => {
    return showNotification('success', 'Internettforbindelsen er gjenopprettet.', {
      title: 'Tilbake online',
      duration: 3000
    });
  }, [showNotification]);

  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showOfflineNotification,
    showOnlineNotification,
    dismiss: toast.dismiss,
    dismissAll: () => toast.dismiss()
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0
          }
        }}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Hook for online/offline status with notifications
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const { showOfflineNotification, showOnlineNotification } = useNotifications();
  const offlineToastId = React.useRef(null);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineToastId.current) {
        toast.dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }
      showOnlineNotification();
    };

    const handleOffline = () => {
      setIsOnline(false);
      offlineToastId.current = showOfflineNotification();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showOfflineNotification, showOnlineNotification]);

  return isOnline;
}
