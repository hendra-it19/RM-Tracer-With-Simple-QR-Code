import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useToast } from '../../contexts/ToastContext'
import { ROLES, ITEMS_PER_PAGE } from '../../utils/constants'
import { formatDate, debounce } from '../../utils/helpers'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    Users as UsersIcon,
    Shield,
    ShieldCheck,
    Key,
    UserX,
    UserCheck,
    Lock
} from 'lucide-react'

const Users = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [showResetModal, setShowResetModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [resetUser, setResetUser] = useState(null)
    const [resetPassword, setResetPassword] = useState('')
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nama: '',
        role: 'petugas'
    })
    const [saving, setSaving] = useState(false)
    const { success, error: showError } = useToast()

    useEffect(() => {
        fetchUsers()
    }, [currentPage, search])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

            if (search) {
                query = query.or(`nama.ilike.%${search}%,email.ilike.%${search}%`)
            }

            const { data, count, error } = await query

            if (error) throw error

            setUsers(data || [])
            setTotalCount(count || 0)
        } catch (err) {
            showError('Gagal memuat data user')
            console.error(err)
        }
        setLoading(false)
    }

    const handleSearch = debounce((value) => {
        setSearch(value)
        setCurrentPage(1)
    }, 300)

    const openAddModal = () => {
        setEditingUser(null)
        setFormData({
            email: '',
            password: '',
            nama: '',
            role: 'petugas'
        })
        setShowModal(true)
    }

    const openEditModal = (user) => {
        setEditingUser(user)
        setFormData({
            email: user.email,
            password: '',
            nama: user.nama,
            role: user.role
        })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()

        if (!formData.nama || !formData.email) {
            showError('Nama dan Email harus diisi')
            return
        }

        if (!editingUser && !formData.password) {
            showError('Password harus diisi untuk user baru')
            return
        }

        setSaving(true)

        try {
            if (editingUser) {
                // Update existing user profile
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        nama: formData.nama,
                        role: formData.role
                    })
                    .eq('id', editingUser.id)

                if (error) throw error

                // Log activity
                await supabase.rpc('log_activity', {
                    p_aksi: 'UPDATE_USER',
                    p_details: { email: formData.email, role: formData.role }
                })

                success('User berhasil diperbarui')
            } else {
                // Create new user via Supabase Auth
                const { data, error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            nama: formData.nama,
                            role: formData.role
                        }
                    }
                })

                if (error) throw error

                // Log activity
                await supabase.rpc('log_activity', {
                    p_aksi: 'CREATE_USER',
                    p_details: { email: formData.email, role: formData.role }
                })

                success('User baru berhasil ditambahkan')
            }

            setShowModal(false)
            fetchUsers()
        } catch (err) {
            showError(err.message || 'Gagal menyimpan user')
            console.error(err)
        }

        setSaving(false)
    }

    const toggleUserStatus = async (user) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: !user.is_active })
                .eq('id', user.id)

            if (error) throw error

            success(user.is_active ? 'User dinonaktifkan' : 'User diaktifkan')
            fetchUsers()
        } catch (err) {
            showError('Gagal mengubah status user')
            console.error(err)
        }
    }

    const handleDelete = async (user) => {
        if (!confirm(`Hapus user ${user.nama} (${user.email})?`)) {
            return
        }

        showError('Penghapusan user harus dilakukan melalui Supabase Dashboard')
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

    return (
        <>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Manajemen User</h1>
                        <p className="page-subtitle">Kelola akun pengguna dan hak akses</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <Plus size={18} />
                        Tambah User
                    </button>
                </div>
            </div>

            <div className="page-content">
                {/* Search */}
                <div className="card mb-lg">
                    <div className="card-body">
                        <div className="search-box">
                            <Search className="search-box-icon" size={18} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Cari berdasarkan nama atau email..."
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
                                    <th>Nama</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Dibuat</th>
                                    <th style={{ width: 150 }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={6}>
                                                <div className="skeleton skeleton-text"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="empty-state">
                                                <UsersIcon className="empty-state-icon" />
                                                <p className="empty-state-title">Tidak ada data</p>
                                                <p className="empty-state-description">
                                                    {search ? 'Tidak ditemukan user dengan kata kunci tersebut' : 'Belum ada data user'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="flex items-center gap-md">
                                                    <div
                                                        className="user-avatar"
                                                        style={{
                                                            background: user.role === 'admin'
                                                                ? 'linear-gradient(135deg, var(--primary-500), var(--primary-700))'
                                                                : 'var(--gray-300)',
                                                            color: user.role === 'admin' ? 'white' : 'var(--gray-700)'
                                                        }}
                                                    >
                                                        {user.nama?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <span className="font-medium">{user.nama}</span>
                                                </div>
                                            </td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-gray'}`}>
                                                    {user.role === 'admin' ? (
                                                        <><ShieldCheck size={12} /> Admin</>
                                                    ) : (
                                                        <><Shield size={12} /> Petugas</>
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                                                    {user.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td>{formatDate(user.created_at)}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                        onClick={() => toggleUserStatus(user)}
                                                    >
                                                        {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        title="Edit"
                                                        onClick={() => openEditModal(user)}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        title="Reset Password"
                                                        onClick={() => {
                                                            setResetUser(user)
                                                            setResetPassword('')
                                                            setShowResetModal(true)
                                                        }}
                                                        style={{ color: 'var(--warning)' }}
                                                    >
                                                        <Key size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        title="Hapus"
                                                        onClick={() => handleDelete(user)}
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
                                {editingUser ? 'Edit User' : 'Tambah User Baru'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nama Lengkap</label>
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
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="nama@rumahsakit.com"
                                        disabled={!!editingUser}
                                        required
                                    />
                                    {editingUser && (
                                        <p className="form-hint">Email tidak dapat diubah</p>
                                    )}
                                </div>

                                {!editingUser && (
                                    <div className="form-group">
                                        <label className="form-label">Password</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Minimal 6 karakter"
                                            minLength={6}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="petugas">Petugas</option>
                                        <option value="admin">Admin</option>
                                    </select>
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

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title flex items-center gap-sm">
                                <Lock size={20} />
                                Reset Password User
                            </h3>
                            <button className="modal-close" onClick={() => setShowResetModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault()
                            if (resetPassword.length < 6) {
                                showError('Password minimal 6 karakter')
                                return
                            }

                            setSaving(true)
                            try {
                                const { error } = await supabase.rpc('reset_user_password', {
                                    target_user_id: resetUser.id,
                                    new_password: resetPassword
                                })

                                if (error) throw error

                                success(`Password untuk ${resetUser.nama} berhasil direset`)
                                setShowResetModal(false)
                            } catch (err) {
                                showError(err.message || 'Gagal mereset password')
                                console.error(err)
                            }
                            setSaving(false)
                        }}>
                            <div className="modal-body">
                                <div className="alert alert-warning mb-md">
                                    <p className="text-sm">
                                        Anda akan mengubah password untuk user <strong>{resetUser?.nama}</strong> ({resetUser?.email}).
                                    </p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password Baru</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        placeholder="Minimal 6 karakter"
                                        minLength={6}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowResetModal(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Mereset...' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

export default Users
