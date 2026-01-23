import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { STATUS_LOKASI } from '../../utils/constants'
import {
    formatDate,
    calculateAge,
    getStatusLabel,
    getStatusColor,
    formatDateTime
} from '../../utils/helpers'
import {
    ArrowLeft,
    Calendar,
    MapPin,
    User,
    Clock,
    CheckCircle,
    FileText,
    History
} from 'lucide-react'

const PatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { profile } = useAuth()
    const { success, error: showError } = useToast()

    const [patient, setPatient] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Update State
    const [selectedStatus, setSelectedStatus] = useState(null)
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
        // Get history with petugas info
        // Note: Supabase join query syntax
        const { data, error } = await supabase
            .from('tracer')
            .select(`
                *,
                profiles:petugas_id (nama)
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
        if (!selectedStatus) return
        setSaving(true)

        try {
            // Insert new tracer record
            const { data, error } = await supabase
                .from('tracer')
                .insert({
                    patient_id: id,
                    status_lokasi: selectedStatus,
                    keterangan: keterangan || null,
                    petugas_id: profile.id
                })
                .select()
                .single()

            if (error) throw error

            // Log activity
            await supabase.rpc('log_activity', {
                p_aksi: 'UPDATE_STATUS_ADMIN',
                p_no_rm: patient.no_rm,
                p_details: {
                    status_lokasi: selectedStatus,
                    keterangan: keterangan || null
                }
            })

            success('Status lokasi berhasil diperbarui')
            setSelectedStatus(null)
            setKeterangan('')
            fetchHistory() // Refresh history

        } catch (err) {
            console.error('Error updating status:', err)
            showError('Gagal memperbarui status')
        }
        setSaving(false)
    }

    if (loading) {
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

    // Current status is the first item in history
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
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: getStatusColor(currentStatus, STATUS_LOKASI) }}
                                            />
                                            <span className="font-semibold text-lg">
                                                {getStatusLabel(currentStatus, STATUS_LOKASI)}
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
                                <div className="flex flex-col gap-sm">
                                    {STATUS_LOKASI.map(status => (
                                        <button
                                            key={status.value}
                                            className={`btn justify-between ${selectedStatus === status.value ? 'active' : ''}`}
                                            onClick={() => setSelectedStatus(status.value)}
                                            style={{
                                                background: selectedStatus === status.value ? `${status.color}10` : 'white',
                                                borderColor: selectedStatus === status.value ? status.color : 'var(--border)',
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <div className="flex items-center gap-sm">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: status.color }}
                                                />
                                                {status.label}
                                            </div>
                                            {selectedStatus === status.value && (
                                                <CheckCircle size={16} style={{ color: status.color }} />
                                            )}
                                        </button>
                                    ))}
                                </div>

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
                                    disabled={!selectedStatus || saving}
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
                                                {/* Timeline Dot */}
                                                <div
                                                    className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white box-content"
                                                    style={{ backgroundColor: getStatusColor(record.status_lokasi, STATUS_LOKASI) }}
                                                />

                                                <div className="flex flex-col gap-xs">
                                                    <div className="flex items-baseline justify-between">
                                                        <span
                                                            className="font-semibold"
                                                            style={{ color: getStatusColor(record.status_lokasi, STATUS_LOKASI) }}
                                                        >
                                                            {getStatusLabel(record.status_lokasi, STATUS_LOKASI)}
                                                        </span>
                                                        <span className="text-xs text-secondary flex items-center gap-xs">
                                                            <Clock size={12} />
                                                            {formatDateTime(record.created_at)}
                                                        </span>
                                                    </div>

                                                    {record.keterangan && (
                                                        <div className="bg-gray-50 p-sm rounded text-sm text-secondary max-w-full break-words">
                                                            "{record.keterangan}"
                                                        </div>
                                                    )}

                                                    <div className="text-xs text-muted flex items-center gap-xs mt-xs">
                                                        <User size={12} />
                                                        <span>Petugas: {record.profiles?.nama || 'Unknown'}</span>
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
