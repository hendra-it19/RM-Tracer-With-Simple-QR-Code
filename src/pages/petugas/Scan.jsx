import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSync } from '../../contexts/SyncContext'
import { useToast } from '../../contexts/ToastContext'
import { STATUS_LOKASI, UNDO_TIMEOUT } from '../../utils/constants'
import {
    parseQRValue,
    formatDate,
    calculateAge,
    getStatusLabel,
    getStatusColor
} from '../../utils/helpers'
import {
    Camera,
    X,
    MapPin,
    User,
    Calendar,
    FileText,
    RotateCcw,
    CheckCircle,
    AlertCircle,
    Search as SearchIcon
} from 'lucide-react'
import jsQR from 'jsqr'

const Scan = () => {
    const location = useLocation()
    const { profile } = useAuth()
    const { success, error: showError, warning } = useToast()

    const [scanning, setScanning] = useState(false)
    const [patient, setPatient] = useState(null)
    const [currentStatus, setCurrentStatus] = useState(null)
    const [selectedStatus, setSelectedStatus] = useState(null)
    const [keterangan, setKeterangan] = useState('')
    const [saving, setSaving] = useState(false)
    const [lastUpdate, setLastUpdate] = useState(null)
    const [undoTimer, setUndoTimer] = useState(null)

    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const scanIntervalRef = useRef(null)

    // Handle initial no_rm from navigation state
    useEffect(() => {
        if (location.state?.noRm) {
            handleScanResult(location.state.noRm)
        } else {
            startScanning()
        }

        return () => {
            stopScanning()
            if (undoTimer) clearTimeout(undoTimer)
        }
    }, [])

    const startScanning = async () => {
        try {
            setScanning(true)
            setPatient(null)
            setSelectedStatus(null)
            setKeterangan('')

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            })

            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()

                // Start QR detection
                startQRDetection()
            }
        } catch (err) {
            console.error('Camera error:', err)
            showError('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.')
            setScanning(false)
        }
    }

    const startQRDetection = () => {
        const scan = async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
                // Try Native BarcodeDetector First
                if ('BarcodeDetector' in window) {
                    try {
                        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] })
                        const barcodes = await barcodeDetector.detect(videoRef.current)
                        if (barcodes.length > 0) {
                            const qrValue = barcodes[0].rawValue
                            stopScanning()
                            handleScanResult(qrValue)
                            return
                        }
                    } catch (err) {
                        // Drop through to jsQR if native fails
                    }
                }

                // Fallback to jsQR
                try {
                    const video = videoRef.current
                    const canvas = document.createElement('canvas')
                    canvas.width = video.videoWidth
                    canvas.height = video.videoHeight
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    })

                    if (code) {
                        stopScanning()
                        handleScanResult(code.data)
                    }
                } catch (e) {
                    console.error('jsQR error:', e)
                }
            }
        }

        scanIntervalRef.current = setInterval(scan, 200)
    }

    const stopScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current)
            scanIntervalRef.current = null
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        setScanning(false)
    }

    const { isOnline, addToQueue } = useSync() // Add useSync hook

    const handleScanResult = async (qrValue) => {
        const noRm = parseQRValue(qrValue)

        if (!noRm) {
            showError('QR Code tidak valid')
            startScanning()
            return
        }

        // Offline Handling
        if (!isOnline) {
            setPatient({
                id: 'offline-' + noRm, // Temporary ID
                no_rm: noRm,
                nama: `Pasien ${noRm}`,
                tanggal_lahir: new Date(), // Dummy date
                offline: true
            })
            setCurrentStatus(null)
            warning('Mode Offline: Data pasien tidak dapat diverifikasi penuh')
            return
        }

        // Fetch patient data
        try {
            const { data: patientData, error } = await supabase
                .from('patients')
                .select('*')
                .eq('no_rm', noRm)
                .single()

            if (error || !patientData) {
                showError(`Pasien dengan No RM ${noRm} tidak ditemukan`)
                startScanning()
                return
            }

            // Fetch current status
            const { data: tracerData } = await supabase
                .from('tracer')
                .select('*')
                .eq('patient_id', patientData.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

            setPatient(patientData)
            setCurrentStatus(tracerData?.status_lokasi || null)

            // Log removed as per user request (only log mutations)

        } catch (err) {
            console.error('Error fetching patient:', err)
            showError('Gagal memuat data pasien')
            startScanning()
        }
    }

    const handleStatusUpdate = async (status) => {
        if (!patient || !profile) return

        setSelectedStatus(status)
        setSaving(true)

        // Offline Handling
        if (!isOnline || patient.offline) {
            try {
                // Add to offline queue
                addToQueue({
                    type: 'SCAN_MUTATION',
                    payload: {
                        patient_id: patient.offline ? null : patient.id, // If offline patient, id is null/temp
                        no_rm: patient.no_rm,
                        status_lokasi: status,
                        keterangan: keterangan || null,
                        petugas_id: profile.id
                    }
                })

                setLastUpdate({
                    id: 'offline-temp',
                    patient: patient,
                    oldStatus: currentStatus,
                    newStatus: status,
                    keterangan: keterangan
                })

                setCurrentStatus(status)
                success(`Disimpan ke antrian offline: ${getStatusLabel(status, STATUS_LOKASI)}`)

                // Reset for next scan
                setTimeout(() => {
                    setSelectedStatus(null)
                    setKeterangan('')
                    resetScan() // Go back to scan to prevent stuck state
                }, 1500)

            } catch (err) {
                console.error('Error queuing offline item:', err)
                showError('Gagal menyimpan ke antrian offline')
            }
            setSaving(false)
            return
        }

        try {
            // Insert new tracer record
            const { data: tracerData, error: tracerError } = await supabase
                .from('tracer')
                .insert({
                    patient_id: patient.id,
                    status_lokasi: status,
                    keterangan: keterangan || null,
                    petugas_id: profile.id
                })
                .select()
                .single()

            if (tracerError) throw tracerError

            // Log activity
            await supabase.rpc('log_activity', {
                p_aksi: 'UPDATE_STATUS',
                p_no_rm: patient.no_rm,
                p_details: {
                    status_lokasi: status,
                    keterangan: keterangan || null,
                    previous_status: currentStatus
                }
            })

            setLastUpdate({
                id: tracerData.id,
                patient: patient,
                oldStatus: currentStatus,
                newStatus: status,
                keterangan: keterangan
            })

            setCurrentStatus(status)

            // Show success with undo option
            success(`Status diperbarui ke ${getStatusLabel(status, STATUS_LOKASI)}`, {
                duration: UNDO_TIMEOUT,
                onUndo: () => handleUndo(tracerData.id, currentStatus)
            })

            // Set undo timer
            const timer = setTimeout(() => {
                setLastUpdate(null)
            }, UNDO_TIMEOUT)
            setUndoTimer(timer)

            // Reset for next scan
            setTimeout(() => {
                setSelectedStatus(null)
                setKeterangan('')
            }, 1000)

        } catch (err) {
            console.error('Error updating status:', err)
            showError('Gagal memperbarui status')
            setSelectedStatus(null)
        }

        setSaving(false)
    }

    const handleUndo = async (tracerId, previousStatus) => {
        try {
            // Delete the tracer record
            await supabase
                .from('tracer')
                .delete()
                .eq('id', tracerId)

            setCurrentStatus(previousStatus)
            setLastUpdate(null)

            if (undoTimer) {
                clearTimeout(undoTimer)
                setUndoTimer(null)
            }

            success('Perubahan dibatalkan')
        } catch (err) {
            console.error('Error undoing:', err)
            showError('Gagal membatalkan perubahan')
        }
    }

    const resetScan = () => {
        setPatient(null)
        setCurrentStatus(null)
        setSelectedStatus(null)
        setKeterangan('')
        startScanning()
    }

    return (
        <div className="flex flex-col gap-md">
            {scanning ? (
                // Scanner View
                <>
                    <div className="qr-scanner-container">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', borderRadius: 'var(--radius-xl)' }}
                        />
                        <div className="qr-scanner-overlay">
                            <div className="qr-scanner-frame" />
                        </div>
                    </div>

                    <div className="text-center flex flex-col items-center gap-sm mt-md">
                        <p className="text-secondary">Arahkan kamera ke QR Code</p>
                        <div className="flex gap-md">
                            <button
                                className="btn btn-ghost"
                                onClick={stopScanning}
                            >
                                <X size={18} />
                                Batal
                            </button>
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => {
                                    stopScanning()
                                    // Navigate to search
                                    window.location.href = '/petugas/search'
                                    // Note: Using href to ensure clean state or navigate standard
                                    // Actually better to use navigate from hook but useLocation was used
                                }}
                            >
                                <SearchIcon size={18} />
                                Cari Manual
                            </button>
                        </div>
                    </div>
                </>
            ) : patient ? (
                // Patient Info & Status Update
                <>
                    {/* Patient Card */}
                    <div className="patient-card">
                        <div className="patient-card-header">
                            <span className="patient-no-rm">{patient.no_rm}</span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={resetScan}
                            >
                                <RotateCcw size={16} />
                                Scan Lagi
                            </button>
                        </div>

                        <h2 className="patient-name">{patient.nama}</h2>

                        <div className="patient-info-row">
                            <Calendar size={16} />
                            <span>{formatDate(patient.tanggal_lahir)}</span>
                            <span>•</span>
                            <span>{calculateAge(patient.tanggal_lahir)}</span>
                        </div>

                        {currentStatus && (
                            <div className="patient-current-status">
                                <div
                                    className="patient-current-status-dot"
                                    style={{ backgroundColor: getStatusColor(currentStatus, STATUS_LOKASI) }}
                                />
                                <span className="patient-current-status-label">
                                    Lokasi saat ini: {getStatusLabel(currentStatus, STATUS_LOKASI)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Status Selection */}
                    <div>
                        <label className="form-label mb-md">
                            <MapPin size={16} style={{ display: 'inline', marginRight: 4 }} />
                            Pilih Lokasi Tujuan
                        </label>

                        <div className="status-buttons">
                            {STATUS_LOKASI.map(status => (
                                <button
                                    key={status.value}
                                    className={`status-btn ${selectedStatus === status.value ? 'active' : ''}`}
                                    onClick={() => handleStatusUpdate(status.value)}
                                    disabled={saving || selectedStatus === status.value}
                                    style={{
                                        borderColor: selectedStatus === status.value ? status.color : undefined,
                                        background: selectedStatus === status.value ? `${status.color}10` : undefined
                                    }}
                                >
                                    <div
                                        className="status-btn-indicator"
                                        style={{ backgroundColor: status.color }}
                                    />
                                    <div>
                                        <div className="status-btn-label">{status.label}</div>
                                    </div>
                                    {selectedStatus === status.value && (
                                        <CheckCircle size={20} style={{ color: status.color, marginLeft: 'auto' }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Keterangan */}
                    <div className="form-group">
                        <label className="form-label">Keterangan (Opsional)</label>
                        <textarea
                            className="form-input form-textarea"
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                            placeholder="Tambahkan catatan jika diperlukan..."
                            rows={2}
                        />
                    </div>
                </>
            ) : (
                // Loading or Error State
                <div className="text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <Camera size={64} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h3>Memuat Scanner...</h3>
                    <p className="text-secondary">Izinkan akses kamera untuk memulai scan</p>
                    <button
                        className="btn btn-primary mt-lg"
                        onClick={startScanning}
                    >
                        <Camera size={18} />
                        Mulai Scan
                    </button>
                </div>
            )}
        </div>
    )
}

export default Scan
