import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { User, Lock, Save } from 'lucide-react'

const Profile = () => {
    const { profile, updateProfile, updatePassword } = useAuth()
    const { success, error: showError } = useToast()

    const [nama, setNama] = useState(profile?.nama || '')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        if (!nama.trim()) {
            showError('Nama tidak boleh kosong')
            return
        }

        setLoading(true)
        try {
            const { error } = await updateProfile({ nama })
            if (error) throw error
            success('Profil berhasil diperbarui')
        } catch (err) {
            showError('Gagal memperbarui profil')
            console.error(err)
        }
        setLoading(false)
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        if (newPassword.length < 6) {
            showError('Password baru minimal 6 karakter')
            return
        }
        if (newPassword !== confirmPassword) {
            showError('Konfirmasi password tidak cocok')
            return
        }

        setLoading(true)
        try {
            const { error } = await updatePassword(newPassword)
            if (error) throw error
            success('Password berhasil diperbarui')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            showError(err.message || 'Gagal memperbarui password')
            console.error(err)
        }
        setLoading(false)
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Profil Saya</h1>
                    <p className="page-subtitle">Kelola informasi akun dan keamanan</p>
                </div>
            </div>

            <div className="page-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    {/* Update Profile Card */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title flex items-center gap-sm">
                                <User size={20} />
                                Informasi Akun
                            </h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleUpdateProfile}>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={profile?.email || 'Loading...'}
                                        disabled
                                        style={{ backgroundColor: 'var(--gray-50)', cursor: 'not-allowed' }}
                                    />
                                    <p className="form-hint">Email tidak dapat diubah</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={nama}
                                        onChange={(e) => setNama(e.target.value)}
                                        placeholder="Nama lengkap Anda"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <span className="badge badge-primary inline-flex">
                                        {profile?.role?.toUpperCase()}
                                    </span>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary w-full mt-md"
                                    disabled={loading}
                                >
                                    <Save size={18} />
                                    Simpan Perubahan
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Update Password Card */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title flex items-center gap-sm">
                                <Lock size={20} />
                                Ganti Password
                            </h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleUpdatePassword}>
                                <div className="form-group">
                                    <label className="form-label">Password Baru</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimal 6 karakter"
                                        minLength={6}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Konfirmasi Password Baru</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Ulangi password baru"
                                        minLength={6}
                                        required
                                    />
                                </div>
                                <div className="alert alert-info mt-md">
                                    <p className="text-sm">
                                        Pastikan password baru Anda aman dan mudah diingat.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary w-full mt-md"
                                    disabled={loading}
                                >
                                    <Save size={18} />
                                    Update Password
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Profile
