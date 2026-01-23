import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { User, Mail, Shield, LogOut, Key, Save } from 'lucide-react'

const Profile = () => {
    const navigate = useNavigate()
    const { profile, signOut, updateProfile, updatePassword } = useAuth()
    const { success, error: showError } = useToast()

    const [editing, setEditing] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        nama: profile?.nama || ''
    })

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    })

    const handleSaveProfile = async (e) => {
        e.preventDefault()

        if (!formData.nama) {
            showError('Nama harus diisi')
            return
        }

        setSaving(true)

        const { error } = await updateProfile({ nama: formData.nama })

        if (error) {
            showError('Gagal memperbarui profil')
        } else {
            success('Profil berhasil diperbarui')
            setEditing(false)
        }

        setSaving(false)
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()

        if (passwordData.newPassword.length < 6) {
            showError('Password minimal 6 karakter')
            return
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showError('Password tidak cocok')
            return
        }

        setSaving(true)

        const { error } = await updatePassword(passwordData.newPassword)

        if (error) {
            showError('Gagal mengubah password')
        } else {
            success('Password berhasil diubah')
            setChangingPassword(false)
            setPasswordData({ newPassword: '', confirmPassword: '' })
        }

        setSaving(false)
    }

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const getInitials = (name) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <div className="flex flex-col gap-lg">
            {/* Profile Header */}
            <div className="card">
                <div className="card-body text-center">
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 'var(--radius-full)',
                            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: 600,
                            margin: '0 auto var(--spacing-md)'
                        }}
                    >
                        {getInitials(profile?.nama)}
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                        {profile?.nama || 'User'}
                    </h2>

                    <div className="flex items-center justify-center gap-sm text-secondary mt-xs">
                        <Mail size={14} />
                        <span>{profile?.email}</span>
                    </div>

                    <div
                        className="badge badge-primary mt-md"
                        style={{ margin: '0 auto' }}
                    >
                        <Shield size={12} />
                        {profile?.role === 'admin' ? 'Administrator' : 'Petugas'}
                    </div>
                </div>
            </div>

            {/* Edit Profile */}
            <div className="card">
                <div className="card-header flex justify-between items-center">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Informasi Profil</h3>
                    {!editing && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditing(true)}
                        >
                            Edit
                        </button>
                    )}
                </div>
                <div className="card-body">
                    {editing ? (
                        <form onSubmit={handleSaveProfile}>
                            <div className="form-group">
                                <label className="form-label">Nama Lengkap</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex gap-sm">
                                <button
                                    type="button"
                                    className="btn btn-secondary flex-1"
                                    onClick={() => {
                                        setEditing(false)
                                        setFormData({ nama: profile?.nama || '' })
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-1"
                                    disabled={saving}
                                >
                                    <Save size={16} />
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center gap-md">
                            <User size={20} style={{ color: 'var(--text-muted)' }} />
                            <div>
                                <div className="text-sm text-secondary">Nama</div>
                                <div className="font-medium">{profile?.nama}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Change Password */}
            <div className="card">
                <div className="card-header flex justify-between items-center">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Keamanan</h3>
                    {!changingPassword && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setChangingPassword(true)}
                        >
                            <Key size={14} />
                            Ganti Password
                        </button>
                    )}
                </div>

                {changingPassword && (
                    <div className="card-body">
                        <form onSubmit={handleChangePassword}>
                            <div className="form-group">
                                <label className="form-label">Password Baru</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="Minimal 6 karakter"
                                    minLength={6}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Konfirmasi Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="Ulangi password baru"
                                    required
                                />
                            </div>

                            <div className="flex gap-sm">
                                <button
                                    type="button"
                                    className="btn btn-secondary flex-1"
                                    onClick={() => {
                                        setChangingPassword(false)
                                        setPasswordData({ newPassword: '', confirmPassword: '' })
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-1"
                                    disabled={saving}
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Logout */}
            <button
                className="btn btn-danger btn-block"
                onClick={handleSignOut}
            >
                <LogOut size={18} />
                Keluar dari Aplikasi
            </button>
        </div>
    )
}

export default Profile
