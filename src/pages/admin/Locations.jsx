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
    MapPin,
    Building
} from 'lucide-react'

const Locations = () => {
    const [locations, setLocations] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [editingLocation, setEditingLocation] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        type: 'poli',
        description: '',
        is_storage: false
    })
    const [saving, setSaving] = useState(false)
    const { success, error: showError } = useToast()

    useEffect(() => {
        fetchLocations()
    }, [currentPage, search])

    const fetchLocations = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('locations')
                .select('*', { count: 'exact' })
                .order('name', { ascending: true })
                .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

            if (search) {
                query = query.ilike('name', `%${search}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            setLocations(data || [])
            setTotalCount(count || 0)
        } catch (err) {
            showError('Gagal memuat data lokasi')
            console.error(err)
        }
        setLoading(false)
    }

    const openAddModal = () => {
        setEditingLocation(null)
        setFormData({ name: '', type: 'poli', description: '', is_storage: false })
        setShowModal(true)
    }

    const openEditModal = (loc) => {
        setEditingLocation(loc)
        setFormData({
            name: loc.name,
            type: loc.type || 'poli',
            description: loc.description || '',
            is_storage: loc.is_storage || false
        })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!formData.name) {
            showError('Nama lokasi harus diisi')
            return
        }

        setSaving(true)
        try {
            if (editingLocation) {
                const { error } = await supabase
                    .from('locations')
                    .update(formData)
                    .eq('id', editingLocation.id)

                if (error) throw error
                success('Lokasi berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('locations')
                    .insert(formData)

                if (error) throw error
                success('Lokasi baru berhasil ditambahkan')
            }

            setShowModal(false)
            fetchLocations()
        } catch (err) {
            showError(err.message || 'Gagal menyimpan lokasi')
            console.error(err)
        }
        setSaving(false)
    }

    const handleDelete = async (loc) => {
        if (!confirm(`Hapus lokasi ${loc.name}?\n\nPastikan lokasi ini tidak sedang digunakan aktif oleh berkas.`)) {
            return
        }

        try {
            const { error } = await supabase
                .from('locations')
                .delete()
                .eq('id', loc.id)

            if (error) throw error
            success(`Lokasi ${loc.name} berhasil dihapus`)
            fetchLocations()
        } catch (err) {
            showError('Gagal menghapus lokasi. Mungkin sedang digunakan dalam riwayat.')
            console.error(err)
        }
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

    return (
        <>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Manajemen Lokasi</h1>
                        <p className="page-subtitle">Kelola daftar lokasi penyimpanan berkas (Poli, Ruangan, dll)</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <Plus size={18} />
                        Tambah Lokasi
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
                                placeholder="Cari nama lokasi..."
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
                                    <th>Nama Lokasi</th>
                                    <th>Tipe</th>
                                    <th>Keterangan</th>
                                    <th style={{ width: 100 }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}><td colSpan={4}><div className="skeleton skeleton-text"></div></td></tr>
                                    ))
                                ) : locations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className="empty-state">
                                                <MapPin className="empty-state-icon" />
                                                <p>Tidak ada data lokasi</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    locations.map(loc => (
                                        <tr key={loc.id}>
                                            <td className="font-medium">{loc.name}</td>
                                            <td>
                                                <span className="badge badge-gray uppercase text-xs">{loc.type}</span>
                                            </td>
                                            <td>
                                                {loc.description || '-'}
                                                {loc.is_storage && (
                                                    <span className="badge badge-primary ml-sm text-xs">Penyimpanan</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEditModal(loc)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="btn btn-icon btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(loc)}>
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
                    {/* Pagination omitted for brevity if not strictly needed, but implemented basic structure above. Add if list grows. */}
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
                            <h3 className="modal-title">{editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nama Lokasi</label>
                                    <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tipe</label>
                                    <select className="form-input form-select" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="poli">Poli</option>
                                        <option value="ruangan">Ruangan</option>
                                        <option value="gudang">Gudang / Arsip</option>
                                        <option value="lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Deskripsi</label>
                                    <textarea className="form-input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_storage}
                                            onChange={e => setFormData({ ...formData, is_storage: e.target.checked })}
                                        />
                                        <span>Ruangan Penyimpanan (Gudang/Rak)</span>
                                    </label>
                                    <p className="text-xs text-secondary mt-xs ml-lg">
                                        Jika dicentang, pengembalian berkas ke lokasi ini tidak memerlukan input petugas pengambil.
                                    </p>
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

export default Locations
