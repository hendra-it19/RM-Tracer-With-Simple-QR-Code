import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useReferenceData } from '../../hooks/useReferenceData'
import {
    formatDate,
    calculateAge,
    formatDateTime
} from '../../utils/helpers'
import {
    ArrowLeft,
    Calendar,
    MapPin,
    User,
    Clock,
    History,
    Users
} from 'lucide-react'

const PatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { profile } = useAuth()
    const { success, error: showError } = useToast()
    const { locations, staff, loading: loadingRef } = useReferenceData()

    const [patient, setPatient] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Update State
    const [selectedLocation, setSelectedLocation] = useState('')
    const [selectedStaff, setSelectedStaff] = useState('')
    const [keterangan, setKeterangan] = useState('')

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Patient Info
            const { data: patientData, error: patientError } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single()

            if (patientError) throw patientError
            setPatient(patientData)

            // 2. Fetch Tracer History
            fetchHistory()

        } catch (err) {
            console.error('Error fetching data:', err)
            showError('Gagal memuat data pasien')
        }
        setLoading(false)
    }

    const fetchHistory = async () => {
        // Get history with petugas (system user) and staff (picker) info
        const { data, error } = await supabase
            .from('tracer')
            .select(`
                *,
                profiles:petugas_id (nama),
                staff:staff_id (nama)
            `)
            .eq('patient_id', id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching history:', error)
            return
        }

        setHistory(data || [])
    }

    const handleUpdateStatus = async () => {
        // Find selected location details
        const locationDetails = locations.find(l => l.id === selectedLocation)
        const isStorage = locationDetails?.is_storage

        if (!selectedLocation) {
            showError('Lokasi harus dipilih')
            return
        }

        // Validation: Require staff only if NOT storage
        if (!isStorage && !selectedStaff) {
            showError('Petugas Pengambil Berkas harus diisi (untuk lokasi non-penyimpanan)')
            return
        }

        setSaving(true)

        try {
            // Insert new tracer record
            const { error } = await supabase
                .from('tracer')
                .insert({
                    patient_id: id,
                    status_lokasi: selectedLocation, // Stores Location ID (UUID)
                    staff_id: isStorage ? null : selectedStaff,         // Null if storage
                    keterangan: keterangan || null,
                    petugas_id: profile.id           // Stores System User ID
                })
                .select()
                .single()

            if (error) throw error

            // Log activity
            // Resolve names for log details
            const locName = locationDetails?.name || selectedLocation
            const staffName = isStorage
                ? 'Dikembalikan ke Rak (System)'
                : (staff.find(s => s.id === selectedStaff)?.nama || selectedStaff)

            await supabase.rpc('log_activity', {
                p_aksi: 'UPDATE_STATUS_ADMIN',
                p_no_rm: patient.no_rm,
                p_details: {
                    status_lokasi: selectedLocation,
                    location_name: locName,
                    staff_name: staffName,
                    keterangan: keterangan || null,
                    is_storage: !!isStorage
                }
            })

            success('Status lokasi berhasil diperbarui')
            setSelectedLocation('')
            setSelectedStaff('')
            setKeterangan('')
            fetchHistory()

        } catch (err) {
            console.error('Error updating status:', err)
            showError('Gagal memperbarui status')
        }
        setSaving(false)
    }

    // Helper to resolve location name from ID or use raw string (legacy)
    const getLocationName = (status) => {
        const loc = locations.find(l => l.id === status)
        return loc ? loc.name : status
    }

    // Check current selected location type
    const isSelectedStorage = useMemo(() => {
        const loc = locations.find(l => l.id === selectedLocation)
        return loc?.is_storage
    }, [selectedLocation, locations])

    if (loading || loadingRef) {
        return (
            <div className="page-content">
                <div className="skeleton" style={{ height: 200, marginBottom: 20 }}></div>
                <div className="skeleton" style={{ height: 400 }}></div>
            </div>
        )
    }

    if (!patient) {
        return (
            <div className="page-content text-center">
                <h3>Pasien tidak ditemukan</h3>
                <button className="btn btn-primary mt-md" onClick={() => navigate('/admin/patients')}>
                    Kembali
                </button>
            </div>
        )
    }

    const currentStatus = history.length > 0 ? history[0].status_lokasi : null

    return (
        <>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-sm mb-xs">
                            <button
                                className="btn btn-icon btn-ghost btn-sm"
                                onClick={() => navigate('/admin/patients')}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="page-title">Detail Pasien</h1>
                        </div>
                        <p className="page-subtitle ml-xl">Informasi dan riwayat rekam medis</p>
                    </div>
                </div>
            </div>

            <div className="page-content">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                    {/* Left Column: Info & Update */}
                    <div className="md:col-span-1 flex flex-col gap-lg">
                        {/* Patient Info Card */}
                        <div className="card">
                            <div className="card-body">
                                <div className="mb-md">
                                    <span className="badge badge-primary font-mono text-lg">
                                        {patient.no_rm}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold mb-sm">{patient.nama}</h2>
                                <div className="text-secondary flex flex-col gap-xs text-sm">
                                    <div className="flex items-center gap-sm">
                                        <Calendar size={16} />
                                        <span>Lahir: {formatDate(patient.tanggal_lahir)}</span>
                                    </div>
                                    <div className="flex items-center gap-sm">
                                        <User size={16} />
                                        <span>Usia: {calculateAge(patient.tanggal_lahir)}</span>
                                    </div>
                                </div>

                                <div className="mt-lg pt-md border-t border-gray-200">
                                    <p className="text-sm font-medium text-secondary mb-xs">Lokasi Terakhir</p>
                                    {currentStatus ? (
                                        <div className="flex items-center gap-sm">
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                            <span className="font-semibold text-lg">
                                                {getLocationName(currentStatus)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="badge badge-gray">Belum ada riwayat</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Update Status Form */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title text-lg font-semibold flex items-center gap-sm">
                                    <MapPin size={20} />
                                    Update Lokasi
                                </h3>
                            </div>
                            <div className="card-body">
                                <div className="form-group">
                                    <label className="form-label">Lokasi Berkas</label>
                                    <select
                                        className="form-input form-select"
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                    >
                                        <option value="">-- Pilih Lokasi --</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {!isSelectedStorage && (
                                    <div className="form-group mt-md">
                                        <label className="form-label">Petugas Pengambil Berkas</label>
                                        <select
                                            className="form-input form-select"
                                            value={selectedStaff}
                                            onChange={(e) => setSelectedStaff(e.target.value)}
                                        >
                                            <option value="">-- Pilih Petugas --</option>
                                            {staff.map(s => (
                                                <option key={s.id} value={s.id}>{s.nama} {s.nip ? `(${s.nip})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {isSelectedStorage && (
                                    <div className="alert alert-info mt-md text-sm">
                                        <div className="flex items-center gap-xs">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span>Berkas dikembalikan ke penyimpanan (Staff otomatis).</span>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-md">
                                    <label className="form-label">Keterangan</label>
                                    <textarea
                                        className="form-input"
                                        rows={2}
                                        placeholder="Catatan tambahan..."
                                        value={keterangan}
                                        onChange={e => setKeterangan(e.target.value)}
                                    />
                                </div>

                                <button
                                    className="btn btn-primary btn-block mt-md"
                                    disabled={!selectedLocation || (!isSelectedStorage && !selectedStaff) || saving}
                                    onClick={handleUpdateStatus}
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: History Timeline */}
                    <div className="md:col-span-2">
                        <div className="card h-full">
                            <div className="card-header flex justify-between items-center">
                                <h3 className="card-title text-lg font-semibold flex items-center gap-sm">
                                    <History size={20} />
                                    Riwayat Perpindahan
                                </h3>
                                <span className="text-sm text-secondary">
                                    Total: {history.length} aktivitas
                                </span>
                            </div>
                            <div className="card-body">
                                {history.length === 0 ? (
                                    <div className="empty-state">
                                        <p>Belum ada riwayat perpindahan berkas.</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-4 border-l-2 border-gray-100 space-y-8">
                                        {history.map((record, index) => (
                                            <div key={record.id} className="relative">
                                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white box-content bg-blue-500" />

                                                <div className="flex flex-col gap-xs">
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="font-semibold text-blue-600">
                                                            {getLocationName(record.status_lokasi)}
                                                        </span>
                                                        <span className="text-xs text-secondary flex items-center gap-xs">
                                                            <Clock size={12} />
                                                            {formatDateTime(record.created_at)}
                                                        </span>
                                                    </div>

                                                    <div className="text-sm flex flex-col gap-xs mt-xs">
                                                        {record.staff && (
                                                            <div className="flex items-center gap-xs text-gray-700">
                                                                <Users size={14} />
                                                                <span>Diambil oleh: <strong>{record.staff.nama}</strong></span>
                                                            </div>
                                                        )}
                                                        {record.keterangan && (
                                                            <div className="text-secondary italic">
                                                                "{record.keterangan}"
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-muted flex items-center gap-xs mt-xs">
                                                        <User size={12} />
                                                        <span>Admin Input: {record.profiles?.nama || 'Unknown'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PatientDetail
