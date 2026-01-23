import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useToast } from '../../contexts/ToastContext'
import { STATUS_LOKASI, ITEMS_PER_PAGE } from '../../utils/constants'
import {
    formatDate,
    generateNoRM,
    generateQRValue,
    getStatusLabel,
    getStatusColor,
    calculateAge,
    debounce
} from '../../utils/helpers'
import { QRCodeSVG } from 'qrcode.react'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Printer,
    QrCode,
    X,
    ChevronLeft,
    ChevronRight,
    FileText,
    Eye
} from 'lucide-react'

const Patients = () => {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [editingPatient, setEditingPatient] = useState(null)
    const [formData, setFormData] = useState({
        no_rm: '',
        nama: '',
        tanggal_lahir: ''
    })
    const [saving, setSaving] = useState(false)
    const [showQRModal, setShowQRModal] = useState(false)
    const [selectedPatientQR, setSelectedPatientQR] = useState(null)
    const [selectedForPrint, setSelectedForPrint] = useState([])
    const { success, error: showError } = useToast()

    useEffect(() => {
        fetchPatients()
    }, [currentPage, search])

    const fetchPatients = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('patients')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

            if (search) {
                query = query.or(`no_rm.ilike.%${search}%,nama.ilike.%${search}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            // Fetch latest tracer status for each patient
            const patientIds = data.map(p => p.id)
            const { data: tracerData } = await supabase
                .from('tracer')
                .select('patient_id, status_lokasi, updated_at')
                .in('patient_id', patientIds)
                .order('updated_at', { ascending: false })

            // Map latest status to each patient
            const statusMap = {}
            tracerData?.forEach(t => {
                if (!statusMap[t.patient_id]) {
                    statusMap[t.patient_id] = t.status_lokasi
                }
            })

            const patientsWithStatus = data.map(p => ({
                ...p,
                current_status: statusMap[p.id] || null
            }))

            setPatients(patientsWithStatus)
            setTotalCount(count || 0)
        } catch (err) {
            showError('Gagal memuat data pasien')
            console.error(err)
        }
        setLoading(false)
    }

    const handleSearch = debounce((value) => {
        setSearch(value)
        setCurrentPage(1)
    }, 300)

    const openAddModal = () => {
        setEditingPatient(null)
        setFormData({
            no_rm: generateNoRM(),
            nama: '',
            tanggal_lahir: ''
        })
        setShowModal(true)
    }

    const openEditModal = (patient) => {
        setEditingPatient(patient)
        setFormData({
            no_rm: patient.no_rm,
            nama: patient.nama,
            tanggal_lahir: patient.tanggal_lahir || ''
        })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()

        if (!formData.no_rm || !formData.nama) {
            showError('No RM dan Nama harus diisi')
            return
        }

        setSaving(true)

        try {
            if (editingPatient) {
                // Update existing patient
                const { error } = await supabase
                    .from('patients')
                    .update({
                        no_rm: formData.no_rm,
                        nama: formData.nama,
                        tanggal_lahir: formData.tanggal_lahir || null,
                        qr_code: generateQRValue(formData.no_rm)
                    })
                    .eq('id', editingPatient.id)

                if (error) throw error

                // Log activity
                await supabase.rpc('log_activity', {
                    p_aksi: 'UPDATE_PATIENT',
                    p_no_rm: formData.no_rm,
                    p_details: { nama: formData.nama }
                })

                success('Data pasien berhasil diperbarui')
            } else {
                // Create new patient
                const { error } = await supabase
                    .from('patients')
                    .insert({
                        no_rm: formData.no_rm,
                        nama: formData.nama,
                        tanggal_lahir: formData.tanggal_lahir || null,
                        qr_code: generateQRValue(formData.no_rm)
                    })

                if (error) {
                    if (error.code === '23505') {
                        showError('Nomor RM sudah terdaftar')
                        setSaving(false)
                        return
                    }
                    throw error
                }

                // Log activity
                await supabase.rpc('log_activity', {
                    p_aksi: 'CREATE_PATIENT',
                    p_no_rm: formData.no_rm,
                    p_details: { nama: formData.nama }
                })

                success('Pasien baru berhasil ditambahkan')
            }

            setShowModal(false)
            fetchPatients()
        } catch (err) {
            showError('Gagal menyimpan data pasien')
            console.error(err)
        }

        setSaving(false)
    }

    const handleDelete = async (patient) => {
        if (!confirm(`Hapus pasien ${patient.nama} (${patient.no_rm})?`)) {
            return
        }

        try {
            const { error } = await supabase
                .from('patients')
                .delete()
                .eq('id', patient.id)

            if (error) throw error

            // Log activity
            await supabase.rpc('log_activity', {
                p_aksi: 'DELETE_PATIENT',
                p_no_rm: patient.no_rm,
                p_details: { nama: patient.nama }
            })

            success('Pasien berhasil dihapus')
            fetchPatients()
        } catch (err) {
            showError('Gagal menghapus pasien')
            console.error(err)
        }
    }

    const showQR = (patient) => {
        setSelectedPatientQR(patient)
        setShowQRModal(true)
    }

    const toggleSelectForPrint = (patient) => {
        setSelectedForPrint(prev => {
            const isSelected = prev.find(p => p.id === patient.id)
            if (isSelected) {
                return prev.filter(p => p.id !== patient.id)
            }
            return [...prev, patient]
        })
    }

    const selectAllForPrint = () => {
        if (selectedForPrint.length === patients.length) {
            setSelectedForPrint([])
        } else {
            setSelectedForPrint([...patients])
        }
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

    return (
        <>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Manajemen Pasien</h1>
                        <p className="page-subtitle">Kelola data pasien dan berkas rekam medis</p>
                    </div>
                    <div className="flex gap-sm">
                        {selectedForPrint.length > 0 && (
                            <Link
                                to="/admin/patients/print"
                                state={{ patients: selectedForPrint }}
                                className="btn btn-secondary"
                            >
                                <Printer size={18} />
                                Print QR ({selectedForPrint.length})
                            </Link>
                        )}
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <Plus size={18} />
                            Tambah Pasien
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Search & Filter */}
                <div className="card mb-lg">
                    <div className="card-body">
                        <div className="search-box">
                            <Search className="search-box-icon" size={18} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Cari berdasarkan No RM atau Nama..."
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedForPrint.length === patients.length && patients.length > 0}
                                            onChange={selectAllForPrint}
                                            className="form-check-input"
                                        />
                                    </th>
                                    <th>No. RM</th>
                                    <th>Nama Pasien</th>
                                    <th>Tanggal Lahir</th>
                                    <th>Usia</th>
                                    <th>Status Lokasi</th>
                                    <th style={{ width: 150 }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={7}>
                                                <div className="skeleton skeleton-text"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : patients.length === 0 ? (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="empty-state">
                                                <FileText className="empty-state-icon" />
                                                <p className="empty-state-title">Tidak ada data</p>
                                                <p className="empty-state-description">
                                                    {search ? 'Tidak ditemukan pasien dengan kata kunci tersebut' : 'Belum ada data pasien'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    patients.map(patient => (
                                        <tr key={patient.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForPrint.some(p => p.id === patient.id)}
                                                    onChange={() => toggleSelectForPrint(patient)}
                                                    className="form-check-input"
                                                />
                                            </td>
                                            <td>
                                                <span className="font-semibold" style={{ color: 'var(--primary-600)' }}>
                                                    {patient.no_rm}
                                                </span>
                                            </td>
                                            <td>{patient.nama}</td>
                                            <td>{formatDate(patient.tanggal_lahir)}</td>
                                            <td>{calculateAge(patient.tanggal_lahir)}</td>
                                            <td>
                                                {patient.current_status ? (
                                                    <span
                                                        className="badge"
                                                        style={{
                                                            backgroundColor: `${getStatusColor(patient.current_status, STATUS_LOKASI)}20`,
                                                            color: getStatusColor(patient.current_status, STATUS_LOKASI)
                                                        }}
                                                    >
                                                        {getStatusLabel(patient.current_status, STATUS_LOKASI)}
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-gray">Belum ada</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    <Link
                                                        to={`/admin/patients/${patient.id}`}
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye size={16} />
                                                    </Link>
                                                    <button
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        title="Lihat QR"
                                                        onClick={() => showQR(patient)}
                                                    >
                                                        <QrCode size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        title="Edit"
                                                        onClick={() => openEditModal(patient)}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        title="Hapus"
                                                        onClick={() => handleDelete(patient)}
                                                        style={{ color: 'var(--error)' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="card-footer">
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(i + 1)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    className="pagination-btn"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingPatient ? 'Edit Pasien' : 'Tambah Pasien Baru'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nomor Rekam Medis</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.no_rm}
                                        onChange={(e) => setFormData({ ...formData, no_rm: e.target.value })}
                                        placeholder="RM-XXXXXX"
                                        required
                                    />
                                    {!editingPatient && (
                                        <p className="form-hint">Nomor RM digenerate otomatis, bisa diubah manual</p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Nama Pasien</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.nama}
                                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                        placeholder="Masukkan nama lengkap"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tanggal Lahir</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.tanggal_lahir}
                                        onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && selectedPatientQR && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">QR Code</h3>
                            <button className="modal-close" onClick={() => setShowQRModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body text-center">
                            <div className="qr-code-display">
                                <QRCodeSVG
                                    value={generateQRValue(selectedPatientQR.no_rm)}
                                    size={200}
                                    level="H"
                                />
                            </div>
                            <div className="qr-code-info">
                                <div className="qr-code-no-rm">{selectedPatientQR.no_rm}</div>
                                <div className="text-secondary">{selectedPatientQR.nama}</div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-primary btn-block"
                                onClick={() => {
                                    setSelectedForPrint([selectedPatientQR])
                                    setShowQRModal(false)
                                }}
                            >
                                <Printer size={18} />
                                Cetak QR Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Patients
