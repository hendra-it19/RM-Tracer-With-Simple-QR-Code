import { useSync } from '../contexts/SyncContext'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

const OfflineStatus = () => {
    const { isOnline, pendingQueue, isSyncing, syncQueue } = useSync()

    if (isOnline && pendingQueue.length === 0) return null

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '80px', // Above bottom nav
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50,
                backgroundColor: isOnline ? 'var(--warning-100)' : 'var(--error-100)',
                color: isOnline ? 'var(--warning-700)' : 'var(--error-700)',
                border: `1px solid ${isOnline ? 'var(--warning-200)' : 'var(--error-200)'}`,
                padding: '8px 16px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: '0.875rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                maxWidth: '90%'
            }}
        >
            {isOnline ? (
                <>
                    {isSyncing ? (
                        <RefreshCw className="animate-spin" size={16} />
                    ) : (
                        <Wifi size={16} />
                    )}
                    <span>
                        {isSyncing
                            ? 'Menyinkronkan data...'
                            : `${pendingQueue.length} data menunggu sinkronisasi`
                        }
                    </span>
                    {!isSyncing && (
                        <button
                            onClick={syncQueue}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'inherit',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                marginLeft: '4px',
                                fontWeight: 600
                            }}
                        >
                            Sync
                        </button>
                    )}
                </>
            ) : (
                <>
                    <WifiOff size={16} />
                    <span>Mode Offline • {pendingQueue.length} antrian</span>
                </>
            )}
        </div>
    )
}

export default OfflineStatus
