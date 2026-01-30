import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { QrCode, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { signIn } = useAuth()
    const { error: showError } = useToast()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMessage('')

        if (!email || !password) {
            setErrorMessage('Email dan password harus diisi')
            showError('Email dan password harus diisi')
            return
        }

        console.log('[Login] Attempting login for:', email)
        setLoading(true)

        const { data, error } = await signIn(email, password)

        setLoading(false)

        if (error) {
            console.error('[Login] Login failed:', error)

            // Translate common error messages to Indonesian
            let message = error.message
            if (message.includes('Invalid login credentials')) {
                message = 'Email atau password salah'
            } else if (message.includes('Email not confirmed')) {
                message = 'Email belum dikonfirmasi'
            } else if (message.includes('Invalid API key')) {
                message = 'Konfigurasi Supabase tidak valid. Periksa ANON KEY di .env'
            } else if (message.includes('Failed to fetch')) {
                message = 'Tidak dapat terhubung ke server. Periksa koneksi internet dan URL Supabase.'
            }

            setErrorMessage(message)
            showError(message)
            return
        }

        console.log('[Login] Login successful!')
        // Navigation will be handled by the AuthContext and protected routes
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <div className="login-logo-icon">
                            <QrCode size={28} />
                        </div>
                        <span>Berkas RM</span>
                    </div>
                    <p className="login-tagline">Sistem Pelacakan Rekam Medis</p>
                </div>

                <form className="login-body" onSubmit={handleSubmit}>
                    {/* Error Message Display */}
                    {errorMessage && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px',
                                marginBottom: '16px',
                                background: 'var(--error-light)',
                                color: '#b91c1c',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '0.875rem'
                            }}
                        >
                            <AlertCircle size={18} />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)'
                                }}
                            />
                            <input
                                type="email"
                                id="email"
                                className="form-input"
                                placeholder="nama@rumahsakit.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ paddingLeft: '40px' }}
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)'
                                }}
                            />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                className="form-input"
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    padding: '4px'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block btn-lg mt-lg"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 20, height: 20 }}></div>
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <span>Masuk</span>
                        )}
                    </button>

                    {/* Debug info - remove in production */}
                    <div style={{ marginTop: '16px', padding: '12px', background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <strong>Debug:</strong> Buka Browser Console (F12) untuk melihat log detail
                    </div>
                </form>

                <div className="login-footer">
                    <p>Rekam Medis Tracer System &copy; 2026</p>
                </div>
            </div>
        </div>
    )
}

export default Login
