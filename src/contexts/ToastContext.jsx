import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const ToastContext = createContext({})

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((toast) => {
        const id = Date.now() + Math.random()
        const newToast = {
            id,
            type: 'info',
            duration: 5000,
            ...toast
        }

        setToasts(prev => [...prev, newToast])

        // Auto remove toast after duration
        if (newToast.duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, newToast.duration)
        }

        return id
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const success = useCallback((message, options = {}) => {
        return addToast({ type: 'success', message, ...options })
    }, [addToast])

    const error = useCallback((message, options = {}) => {
        return addToast({ type: 'error', message, ...options })
    }, [addToast])

    const warning = useCallback((message, options = {}) => {
        return addToast({ type: 'warning', message, ...options })
    }, [addToast])

    const info = useCallback((message, options = {}) => {
        return addToast({ type: 'info', message, ...options })
    }, [addToast])

    const icons = {
        success: <CheckCircle size={20} color="#10b981" />,
        error: <AlertCircle size={20} color="#ef4444" />,
        warning: <AlertTriangle size={20} color="#f59e0b" />,
        info: <Info size={20} color="#3b82f6" />
    }

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.type}`}>
                        <span className="toast-icon">{icons[toast.type]}</span>
                        <div className="toast-content">
                            {toast.title && <div className="toast-title">{toast.title}</div>}
                            <div className="toast-message">{toast.message}</div>
                        </div>
                        {toast.onUndo && (
                            <button
                                className="toast-undo"
                                onClick={() => {
                                    toast.onUndo()
                                    removeToast(toast.id)
                                }}
                            >
                                Undo
                            </button>
                        )}
                        <button
                            className="toast-close"
                            onClick={() => removeToast(toast.id)}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export default ToastContext
