import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { useToast } from './ToastContext'
import { useAuth } from './AuthContext'

const SyncContext = createContext({})

export const useSync = () => {
    return useContext(SyncContext)
}

export const SyncProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [pendingQueue, setPendingQueue] = useState([])
    const [isSyncing, setIsSyncing] = useState(false)
    const { success, error: showError, info } = useToast()
    const { user } = useAuth()

    // 1. Monitor Online Status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            info('Kembali online - Mencoba sinkronisasi...')
            syncQueue()
        }
        const handleOffline = () => {
            setIsOnline(false)
            info('Mode Offline - Data akan disimpan lokal')
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // 2. Load Queue from LocalStorage on mount
    useEffect(() => {
        const savedQueue = localStorage.getItem('offline_scan_queue')
        if (savedQueue) {
            try {
                const parsed = JSON.parse(savedQueue)
                if (Array.isArray(parsed)) {
                    setPendingQueue(parsed)
                    // console.log(`[Sync] Loaded ${parsed.length} pending items`)
                }
            } catch (e) {
                console.error('[Sync] Failed to load queue:', e)
            }
        }
    }, [])

    // 3. Save Queue to LocalStorage when changed
    useEffect(() => {
        localStorage.setItem('offline_scan_queue', JSON.stringify(pendingQueue))
    }, [pendingQueue])

    // 4. Add item to queue
    const addToQueue = (item) => {
        const queueItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            retryCount: 0
        }

        setPendingQueue(prev => [...prev, queueItem])
        return queueItem
    }

    // 5. Remove item from queue
    const removeFromQueue = (id) => {
        setPendingQueue(prev => prev.filter(item => item.id !== id))
    }

    // 6. Process Synchronization
    const syncQueue = async () => {
        if (pendingQueue.length === 0 || isSyncing || !user) return

        setIsSyncing(true)
        // console.log('[Sync] Starting sync...', pendingQueue)

        let processedCount = 0
        let tempQueue = [...pendingQueue]

        for (const item of tempQueue) {
            try {
                // Determine action type
                if (item.type === 'SCAN_MUTATION') {
                    // Logic for saving tracer status
                    let { patient_id, status_lokasi, keterangan, petugas_id, no_rm } = item.payload

                    // Offline lookup if patient_id is missing
                    if (!patient_id && no_rm) {
                        const { data: patientData } = await supabase
                            .from('patients')
                            .select('id')
                            .eq('no_rm', no_rm)
                            .single()

                        if (patientData) {
                            patient_id = patientData.id
                        } else {
                            console.error(`[Sync] Patient ${no_rm} not found, skipping item`)
                            // Mark as failed/ignored? Remove from queue to prevent block
                            removeFromQueue(item.id)
                            continue
                        }
                    }

                    if (!patient_id) {
                        console.error('[Sync] Missing patient_id, skipping')
                        removeFromQueue(item.id)
                        continue
                    }

                    // Insert Tracer
                    const { error: tracerError } = await supabase
                        .from('tracer')
                        .insert({
                            patient_id,
                            status_lokasi,
                            keterangan,
                            petugas_id,
                            created_at: item.timestamp // Preserve original time
                        })

                    if (tracerError) throw tracerError

                    // Log Activity
                    await supabase.rpc('log_activity', {
                        p_aksi: 'UPDATE_STATUS_OFFLINE_SYNC',
                        p_no_rm: no_rm,
                        p_details: {
                            status_lokasi,
                            keterangan,
                            synced_at: new Date().toISOString(),
                            original_time: item.timestamp
                        }
                    })

                    // On success, remove from queue
                    removeFromQueue(item.id)
                    processedCount++
                }
            } catch (err) {
                console.error('[Sync] Failed to sync item:', item, err)
                // Increment retry count or handle specific errors?
                // For now we keep it in queue to retry later
            }
        }

        if (processedCount > 0) {
            success(`Berhasil menyinkronkan ${processedCount} data`)
        } else if (pendingQueue.length > 0) {
            // Check if we still have items that failed
            const remaining = pendingQueue.length - processedCount
            if (remaining > 0) {
                // Maybe silent fail or show warning?
            }
        }

        setIsSyncing(false)
    }

    // Auto-sync when queue changes and we are online + user exists
    useEffect(() => {
        if (isOnline && user && pendingQueue.length > 0 && !isSyncing) {
            // Debounce sync
            const timer = setTimeout(() => {
                syncQueue()
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [isOnline, user, pendingQueue])

    const value = {
        isOnline,
        pendingQueue,
        addToQueue,
        syncQueue,
        isSyncing
    }

    return (
        <SyncContext.Provider value={value}>
            {children}
        </SyncContext.Provider>
    )
}

export default SyncContext
