import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSync } from '../../contexts/SyncContext'
import { useToast } from '../../contexts/ToastContext'
import { useReferenceData } from '../../hooks/useReferenceData' // New hook
import { UNDO_TIMEOUT } from '../../utils/constants'
import {
    parseQRValue,
    formatDate,
    calculateAge,
    getStatusLabel
} from '../../utils/helpers'
import {
    Camera,
    X,
    MapPin,
    User,
    Calendar,
    RotateCcw,
    CheckCircle,
    Search as SearchIcon,
    Users
} from 'lucide-react'

const Scan = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { profile } = useAuth()
    const { success, error: showError, warning } = useToast()
    const { locations, staff, loading: loadingRef } = useReferenceData()

    const [scanning, setScanning] = useState(false)
    const [patient, setPatient] = useState(null)
    const [currentStatus, setCurrentStatus] = useState(null)

    // Form State
    const [selectedLocation, setSelectedLocation] = useState('')
    const [selectedStaff, setSelectedStaff] = useState('')
    const [keterangan, setKeterangan] = useState('')

    const [saving, setSaving] = useState(false)
    const [lastUpdate, setLastUpdate] = useState(null)
    const [undoTimer, setUndoTimer] = useState(null)

    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const scanIntervalRef = useRef(null)

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
            setSelectedLocation('')
            setSelectedStaff('')
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
                startQRDetection()
            }
        } catch (err) {
            console.error('Camera error:', err)
            showError('Tidak dapat mengakses kamera.')
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
                            stopScanning()
                            handleScanResult(barcodes[0].rawValue)
                            return
                        }
                    } catch (err) { }
                }

                try {
                    const video = videoRef.current
                    const canvas = document.createElement('canvas')
                    canvas.width = video.videoWidth
                    canvas.height = video.videoHeight
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

                    const jsQRModule = await import('jsqr')
                    const jsQR = jsQRModule.default || jsQRModule
                    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" })

                    if (code) {
                        stopScanning()
                        handleScanResult(code.data)
                    }
                } catch (e) { }
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

    const { isOnline, addToQueue } = useSync()

    const handleScanResult = async (qrValue) => {
        const noRm = parseQRValue(qrValue)
        if (!noRm) {
            showError('QR Code tidak valid')
            startScanning()
            return
        }

        if (!isOnline) {
            setPatient({ id: 'offline-' + noRm, no_rm: noRm, nama: `Pasien ${noRm}`, tanggal_lahir: new Date(), offline: true })
            setCurrentStatus(null)
            warning('Mode Offline')
            return
        }

        try {
            const { data: patientData, error } = await supabase
                .from('patients')
                .select('*')
                .eq('no_rm', noRm)
                .single()

            if (error || !patientData) {
                showError(`Pasien ${noRm} tidak ditemukan`)
                startScanning()
                return
            }

            const { data: tracerData } = await supabase
                .from('tracer')
                .select('*')
                .eq('patient_id', patientData.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

            setPatient(patientData)
            setCurrentStatus(tracerData?.status_lokasi || null)
        } catch (err) {
            console.error(err)
            showError('Gagal memuat data')
            startScanning()
        }
    }

    const getLocationName = (id) => locations.find(l => l.id === id)?.name || id

    const handleSaveUpdate = async () => {
        const locationDetails = locations.find(l => l.id === selectedLocation)
        const isStorage = locationDetails?.is_storage

        if (!selectedLocation) {
            showError('Pilih lokasi tujuan')
            return
        }

        if (!isStorage && !selectedStaff) {
            showError('Petugas pengambil wajib diisi untuk lokasi ini')
            return
        }

        setSaving(true)

        // Offline Handling
        if (!isOnline || patient.offline) {
            try {
                addToQueue({
                    type: 'SCAN_MUTATION',
                    payload: {
                        patient_id: patient.offline ? null : patient.id,
                        no_rm: patient.no_rm,
                        status_lokasi: selectedLocation,
                        staff_id: isStorage ? null : selectedStaff,
                        keterangan: keterangan || null,
                        petugas_id: profile.id
                    }
                })
                success(`Disimpan ke antrian offline`)
                setTimeout(resetScan, 1500)
            } catch (e) { showError('Gagal simpan offline') }
            setSaving(false)
            return
        }

        try {
            const { data: tracerData, error } = await supabase
                .from('tracer')
                .insert({
                    patient_id: patient.id,
                    status_lokasi: selectedLocation,
                    staff_id: isStorage ? null : selectedStaff,
                    keterangan: keterangan || null,
                    petugas_id: profile.id
                })
                .select()
                .single()

            if (error) throw error

            // Log activity
            const locName = getLocationName(selectedLocation)
            const staffName = isStorage
                ? 'Dikembalikan ke Rak (System)'
                : (staff.find(s => s.id === selectedStaff)?.nama || selectedStaff)

            await supabase.rpc('log_activity', {
                p_aksi: 'UPDATE_STATUS',
                p_no_rm: patient.no_rm,
                p_details: {
                    status_lokasi: selectedLocation,
                    location_name: locName,
                    staff_name: staffName,
                    keterangan: keterangan || null,
                    is_storage: !!isStorage
                }
            })

            setLastUpdate({
                id: tracerData.id,
                patient,
                oldStatus: currentStatus,
                newStatus: selectedLocation,
                keterangan
            })
            setCurrentStatus(selectedLocation)

            success(`Status diperbarui ke ${locName}`, {
                duration: UNDO_TIMEOUT,
                onUndo: () => handleUndo(tracerData.id, currentStatus)
            })

            const timer = setTimeout(() => setLastUpdate(null), UNDO_TIMEOUT)
            setUndoTimer(timer)

            setTimeout(() => {
                setSelectedLocation('')
                setSelectedStaff('')
                setKeterangan('')
            }, 1000)

        } catch (err) {
            console.error(err)
            showError('Gagal update status')
        }
        setSaving(false)
    }

    const handleUndo = async (tracerId, previousStatus) => {
        try {
            await supabase.from('tracer').delete().eq('id', tracerId)
            setCurrentStatus(previousStatus)
            setLastUpdate(null)
            if (undoTimer) clearTimeout(undoTimer)
            success('Perubahan dibatalkan')
        } catch (err) { showError('Gagal undo') }
    }

    const resetScan = () => {
        setPatient(null)
        startScanning()
    }

    const isSelectedStorage = useMemo(() => {
        const loc = locations.find(l => l.id === selectedLocation)
        return loc?.is_storage
    }, [selectedLocation, locations])

    return (
        <div className="flex flex-col gap-md">
            {scanning ? (
                <div className="relative">
                    <div className="qr-scanner-container relative overflow-hidden rounded-xl bg-black">
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                        <div className="absolute inset-0 border-2 border-white/50 m-12 rounded-lg pointer-events-none"></div>
                    </div>
                    <div className="text-center mt-4">
                        <button className="btn btn-ghost" onClick={stopScanning}><X size={18} /> Batal</button>
                        <button className="btn btn-outline-primary ml-2" onClick={() => navigate('/petugas/search')}>Cari Manual</button>
                    </div>
                </div>
            ) : patient ? (
                <>
                    <div className="patient-card">
                        <div className="patient-card-header">
                            <span className="patient-no-rm">{patient.no_rm}</span>
                            <button className="btn btn-ghost btn-sm" onClick={resetScan}><RotateCcw size={16} /> Scan Lagi</button>
                        </div>
                        <h2 className="patient-name">{patient.nama}</h2>
                        <div className="patient-info-row">
                            <Calendar size={16} /> <span>{formatDate(patient.tanggal_lahir)}</span>
                            <span>•</span> <span>{calculateAge(patient.tanggal_lahir)}</span>
                        </div>
                        <div className="mt-2 text-sm text-secondary">
                            Lokasi Saat Ini: <strong>{getLocationName(currentStatus) || 'Belum ada'}</strong>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label flex items-center gap-2"><MapPin size={16} /> Lokasi Tujuan</label>
                                <select className="form-input form-select" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                                    <option value="">-- Pilih Lokasi --</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>

                            {!isSelectedStorage && (
                                <div className="form-group mt-4">
                                    <label className="form-label flex items-center gap-2"><Users size={16} /> Petugas Pengambil</label>
                                    <select className="form-input form-select" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                                        <option value="">-- Pilih Petugas --</option>
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                                    </select>
                                </div>
                            )}

                            {isSelectedStorage && (
                                <div className="alert alert-info mt-4 text-sm">
                                    Berkas dikembalikan ke ruangan penyimpanan.
                                </div>
                            )}

                            <div className="form-group mt-4">
                                <label className="form-label">Keterangan</label>
                                <textarea className="form-input" rows={2} value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Opsional" />
                            </div>

                            <button className="btn btn-primary btn-block mt-4" disabled={!selectedLocation || (!isSelectedStorage && !selectedStaff) || saving} onClick={handleSaveUpdate}>
                                {saving ? 'Menyimpan...' : 'Simpan Update'}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center p-8">
                    <Camera size={64} className="mx-auto text-gray-300 mb-4" />
                    <button className="btn btn-primary" onClick={startScanning}>Mulai Scan</button>
                </div>
            )}
        </div>
    )
}

export default Scan
