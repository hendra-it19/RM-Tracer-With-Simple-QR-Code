import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'

// Pages
import Login from './pages/Login'

// Admin Pages
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Patients from './pages/admin/Patients'
import PatientDetail from './pages/admin/PatientDetail'
import Users from './pages/admin/Users'
import ActivityLog from './pages/admin/ActivityLog'
import PrintQR from './pages/admin/PrintQR'
import AdminProfile from './pages/admin/Profile'

// Petugas Pages
import PetugasLayout from './components/layout/PetugasLayout'
import PetugasHome from './pages/petugas/Home'
import Scan from './pages/petugas/Scan'
import Search from './pages/petugas/Search'
import History from './pages/petugas/History'
import PetugasProfile from './pages/petugas/Profile'

// Loading component
export const LoadingScreen = () => (
    <div className="loading-overlay">
        <div className="spinner spinner-lg"></div>
        <p className="loading-text">Memuat...</p>
    </div>
)

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, profile, loading, refreshProfile } = useAuth()

    if (loading) {
        return <LoadingScreen />
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Safety check for missing profile to prevent redirect loops
    if (user && !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full mx-4">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Gagal Memuat Profil</h2>
                    <p className="text-gray-600 mb-6">
                        Terjadi kesalahan saat memuat data pengguna.
                        Pastikan koneksi internet Anda stabil.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={refreshProfile}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Coba Lagi
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                        >
                            Refresh Halaman
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.role)) {
        // Redirect based on role
        if (profile?.role === 'admin') {
            return <Navigate to="/admin" replace />
        }
        return <Navigate to="/petugas" replace />
    }

    return children
}

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return <LoadingScreen />
    }

    if (user && profile) {
        // Redirect based on role
        if (profile.role === 'admin') {
            return <Navigate to="/admin" replace />
        }
        return <Navigate to="/petugas" replace />
    }

    return children
}

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />

            {/* Admin Routes */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="patients" element={<Patients />} />
                <Route path="patients/print" element={<PrintQR />} />
                <Route path="patients/:id" element={<PatientDetail />} />
                <Route path="users" element={<Users />} />
                <Route path="logs" element={<ActivityLog />} />
                <Route path="profile" element={<AdminProfile />} />
            </Route>

            {/* Petugas Routes */}
            <Route
                path="/petugas"
                element={
                    <ProtectedRoute allowedRoles={['petugas', 'admin']}>
                        <PetugasLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<PetugasHome />} />
                <Route path="scan" element={<Scan />} />
                <Route path="search" element={<Search />} />
                <Route path="history" element={<History />} />
                <Route path="profile" element={<PetugasProfile />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    )
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <AppRoutes />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
