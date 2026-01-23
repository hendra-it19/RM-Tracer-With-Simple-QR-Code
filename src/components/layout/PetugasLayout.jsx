import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Home, QrCode, Search, Clock, User } from 'lucide-react'

const PetugasLayout = () => {
    const { profile } = useAuth()

    const navItems = [
        { path: '/petugas', icon: Home, label: 'Home', end: true },
        { path: '/petugas/scan', icon: QrCode, label: 'Scan' },
        { path: '/petugas/search', icon: Search, label: 'Cari' },
        { path: '/petugas/history', icon: Clock, label: 'Riwayat' },
        { path: '/petugas/profile', icon: User, label: 'Profil' }
    ]

    return (
        <div className="mobile-layout">
            {/* Header */}
            <header className="mobile-header">
                <div className="mobile-header-title">RM Tracer</div>
                <div className="mobile-header-subtitle">
                    Selamat datang, {profile?.nama || 'Petugas'}
                </div>
            </header>

            {/* Main Content */}
            <main className="mobile-content">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon className="bottom-nav-icon" size={24} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}

export default PetugasLayout
