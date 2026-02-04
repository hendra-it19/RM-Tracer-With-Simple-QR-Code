import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    LayoutDashboard,
    Users,
    FileText,
    Activity,
    LogOut,
    QrCode,
    Menu,
    X,
    MapPin,
    UserCheck,
    FolderOpen
} from 'lucide-react'
import { useState } from 'react'

import { LoadingScreen } from '../../App'

const AdminLayout = () => {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleSignOut = async () => {
        if (confirm('Apakah Anda yakin ingin keluar aplikasi?')) {
            setIsLoggingOut(true)
            // Artificial delay for better UX
            await new Promise(resolve => setTimeout(resolve, 800))
            await signOut()
            navigate('/login')
        }
    }

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { path: '/admin/files', icon: FolderOpen, label: 'Monitoring Berkas' },
        { path: '/admin/patients', icon: FileText, label: 'Pasien & Berkas' },
        { path: '/admin/locations', icon: MapPin, label: 'Lokasi Berkas' },
        { path: '/admin/staff', icon: UserCheck, label: 'Petugas Pengambil' },
        { path: '/admin/users', icon: Users, label: 'Manajemen User' },
        { path: '/admin/logs', icon: Activity, label: 'Log Aktivitas' },
        { path: '/admin/profile', icon: Users, label: 'Profil Saya' }
    ]

    const getInitials = (name) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <div className="app-layout">
            {isLoggingOut && <LoadingScreen />}
            {/* Mobile menu button */}
            <button
                className="btn btn-icon btn-ghost no-print"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                    position: 'fixed',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 250,
                    display: 'none'
                }}
                id="mobile-menu-btn"
            >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <QrCode size={28} />
                        <span>RM Tracer</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon className="nav-item-icon" size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {getInitials(profile?.nama)}
                        </div>
                        <div className="user-details">
                            <div className="user-name">{profile?.nama || 'User'}</div>
                            <div className="user-role">{profile?.role || 'Admin'}</div>
                        </div>
                    </div>
                    <button
                        className="btn btn-ghost btn-block mt-sm"
                        onClick={handleSignOut}
                        style={{ justifyContent: 'flex-start' }}
                    >
                        <LogOut size={18} />
                        <span>Keluar</span>
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="no-print"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 199,
                        display: 'none'
                    }}
                    id="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>

            <style>{`
        @media (max-width: 1024px) {
          #mobile-menu-btn {
            display: flex !important;
          }
          #sidebar-overlay {
            display: block !important;
          }
        }
      `}</style>
        </div>
    )
}

export default AdminLayout
