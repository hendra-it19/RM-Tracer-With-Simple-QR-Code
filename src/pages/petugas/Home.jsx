import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { STATUS_LOKASI } from '../../utils/constants'
import { formatRelativeTime, getStatusLabel, getStatusColor } from '../../utils/helpers'
import { QrCode, FileText, Clock, TrendingUp } from 'lucide-react'

const PetugasHome = () => {
    const { profile } = useAuth()
    const [stats, setStats] = useState({
        todayScans: 0,
        weekScans: 0
    })
    const [recentScans, setRecentScans] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [profile])

    const fetchData = async () => {
        if (!profile?.id) return

        setLoading(true)
        try {
            // Get today's date range
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            weekAgo.setHours(0, 0, 0, 0)

            // Today's scans by this user
            const { count: todayCount } = await supabase
                .from('activity_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id)
                .eq('aksi', 'UPDATE_STATUS')
                .gte('created_at', today.toISOString())

            // Week's scans
            const { count: weekCount } = await supabase
                .from('activity_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id)
                .eq('aksi', 'UPDATE_STATUS')
                .gte('created_at', weekAgo.toISOString())

            setStats({
                todayScans: todayCount || 0,
                weekScans: weekCount || 0
            })

            // Recent scans by this user
            const { data: recentData } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('user_id', profile.id)
                .in('aksi', ['UPDATE_STATUS', 'SCAN_QR'])
                .order('created_at', { ascending: false })
                .limit(5)

            setRecentScans(recentData || [])
        } catch (err) {
            console.error('Error fetching data:', err)
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col gap-lg">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-md">
                <div className="stat-card">
                    <div className="stat-value">{stats.todayScans}</div>
                    <div className="stat-label">Scan Hari Ini</div>
                    <TrendingUp className="stat-icon" size={40} />
                </div>
                <div className="stat-card success">
                    <div className="stat-value">{stats.weekScans}</div>
                    <div className="stat-label">Scan Minggu Ini</div>
                    <FileText className="stat-icon" size={40} />
                </div>
            </div>

            {/* Big Scan Button */}
            <Link to="/petugas/scan" className="btn btn-action">
                <QrCode size={32} />
                <span>Scan QR Code</span>
            </Link>

            {/* Recent Scans */}
            <div className="card">
                <div className="card-header flex justify-between items-center">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                        Scan Terakhir
                    </h3>
                    <Link to="/petugas/history" className="btn btn-ghost btn-sm">
                        <Clock size={16} />
                        Lihat Semua
                    </Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: 'var(--spacing-md)' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton skeleton-text mb-sm"></div>
                            ))}
                        </div>
                    ) : recentScans.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                            <QrCode size={40} style={{ opacity: 0.3 }} />
                            <p className="text-secondary mt-md">Belum ada scan hari ini</p>
                            <p className="text-sm text-muted">Mulai scan untuk melacak berkas</p>
                        </div>
                    ) : (
                        <div className="recent-list" style={{ padding: 'var(--spacing-sm)' }}>
                            {recentScans.map(scan => (
                                <Link
                                    key={scan.id}
                                    to="/petugas/scan"
                                    state={{ noRm: scan.no_rm }}
                                    className="recent-item"
                                >
                                    <div
                                        className="recent-item-dot"
                                        style={{
                                            backgroundColor: scan.details?.status_lokasi
                                                ? getStatusColor(scan.details.status_lokasi, STATUS_LOKASI)
                                                : 'var(--gray-400)'
                                        }}
                                    />
                                    <div className="recent-item-content">
                                        <div className="recent-item-title">{scan.no_rm}</div>
                                        <div className="recent-item-subtitle">
                                            {scan.details?.status_lokasi
                                                ? getStatusLabel(scan.details.status_lokasi, STATUS_LOKASI)
                                                : scan.aksi
                                            }
                                        </div>
                                    </div>
                                    <div className="recent-item-time">
                                        {formatRelativeTime(scan.created_at)}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-md">
                <Link to="/petugas/search" className="card" style={{ textDecoration: 'none' }}>
                    <div className="card-body text-center">
                        <FileText size={32} style={{ color: 'var(--primary-500)', marginBottom: 8 }} />
                        <div className="font-medium">Cari Manual</div>
                        <div className="text-sm text-secondary">Input No. RM</div>
                    </div>
                </Link>
                <Link to="/petugas/history" className="card" style={{ textDecoration: 'none' }}>
                    <div className="card-body text-center">
                        <Clock size={32} style={{ color: 'var(--primary-500)', marginBottom: 8 }} />
                        <div className="font-medium">Riwayat</div>
                        <div className="text-sm text-secondary">Lihat aktivitas</div>
                    </div>
                </Link>
            </div>
        </div>
    )
}

export default PetugasHome
