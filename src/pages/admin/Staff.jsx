import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useToast } from '../../contexts/ToastContext'
import { ITEMS_PER_PAGE } from '../../utils/constants'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    UserCheck,
    UserX,
    Users as UsersIcon
} from 'lucide-react'

const Staff = () => {
    const [staffList, setStaffList] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [editingStaff, setEditingStaff] = useState(null)
    const [formData, setFormData] = useState({
        nama: '',
        nip: '',
        is_active: true
    })
    const [saving, setSaving] = useState(false)
    const { success, error: showError } = useToast()

    useEffect(() => {
        fetchStaff()
    }, [currentPage, search])

    const fetchStaff = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('staff')
                .select('*', { count: 'exact' })
                .order('nama', { ascending: true })
                .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

            if (search) {
                query = query.or(`nama.ilike.%${search}%,nip.ilike.%${search}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            setStaffList(data || [])
            setTotalCount(count || 0)
        } catch (err) {
            showError('Gagal memuat data petugas')
            console.error(err)
        }
        setLoading(false)
    }

    const openAddModal = () => {
        setEditingStaff(null)
        setFormData({ nama: '', nip: '', is_active: true })
        setShowModal(true)
    }

    const openEditModal = (staff) => {
        setEditingStaff(staff)
        setFormData({
            nama: staff.nama,
            nip: staff.nip || '',
            is_active: staff.is_active
        })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!formData.nama) {
            showError('Nama petugas harus diisi')
            return
        }

        setSaving(true)
        try {
            if (editingStaff) {
                const { error } = await supabase
                    .from('staff')
                    .update(formData)
                    .eq('id', editingStaff.id)

                if (error) throw error
                success('Data petugas berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('staff')
                    .insert(formData)

                if (error) throw error
                success('Petugas baru berhasil ditambahkan')
            }

            setShowModal(false)
            fetchStaff()
        } catch (err) {
            showError(err.message || 'Gagal menyimpan data petugas')
            console.error(err)
        }
        setSaving(false)
    }

    const handleDelete = async (staff) => {
        if (!confirm(`Hapus petugas ${staff.nama}?\n\nDisarankan untuk menonaktifkan saja jika sudah pernah melakukan transaksi.`)) {
            return
        }

        try {
            const { error } = await supabase
                .from('staff')
                .delete()
                .eq('id', staff.id)

            if (error) throw error
            success(`Petugas ${staff.nama} berhasil dihapus`)
            fetchStaff()
        } catch (err) {
            showError('Gagal menghapus petugas. Mungkin sedang digunakan dalam riwayat.')
            console.error(err)
        }
    }

    const toggleStatus = async (staff) => {
        try {
            const { error } = await supabase
                .from('staff')
                .update({ is_active: !staff.is_active })
                .eq('id', staff.id)

            if (error) throw error
            fetchStaff()
            success('Status petugas diperbarui')
        } catch (err) {
            console.error(err)
            showError('Gagal mengubah status')
        }
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

    return (
        <>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Manajemen Petugas Pengambil Berkas</h1>
                        <p className="page-subtitle">Daftar petugas yang berwenang mengambil berkas rekam medis</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <Plus size={18} />
                        Tambah Petugas
                    </button>
                </div>
            </div>

            <div className="page-content">
                <div className="card mb-lg">
                    <div className="card-body">
                        <div className="search-box">
                            <Search className="search-box-icon" size={18} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Cari nama atau NIP..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nama Petugas</th>
                                    <th>NIP / ID</th>
                                    <th>Status</th>
                                    <th style={{ width: 150 }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}><td colSpan={4}><div className="skeleton skeleton-text"></div></td></tr>
                                    ))
                                ) : staffList.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className="empty-state">
                                                <UsersIcon className="empty-state-icon" />
                                                <p>Tidak ada data petugas</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    staffList.map(staff => (
                                        <tr key={staff.id}>
                                            <td className="font-medium">{staff.nama}</td>
                                            <td>{staff.nip || '-'}</td>
                                            <td>
                                                <span className={`badge ${staff.is_active ? 'badge-success' : 'badge-gray'}`}>
                                                    {staff.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => toggleStatus(staff)} title={staff.is_active ? "Nonaktifkan" : "Aktifkan"}>
                                                        {staff.is_active ? <UserCheck size={16} /> : <UserX size={16} />}
                                                    </button>
                                                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditModal(staff)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="btn btn-icon btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(staff)}>
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
                    {totalPages > 1 && (
                        <div className="card-footer">
                            <div className="pagination">
                                <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
                                <span className="px-md text-sm text-secondary">Hal {currentPage} dari {totalPages}</span>
                                <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingStaff ? 'Edit Petugas' : 'Tambah Petugas'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nama Petugas</label>
                                    <input type="text" className="form-input" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">NIP (Opsional)</label>
                                    <input type="text" className="form-input" value={formData.nip} onChange={e => setFormData({ ...formData, nip: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                                        <span>Aktif</span>
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

export default Staff
