import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { formatRelativeTime, getStatusLabel } from '../../utils/helpers' // Removed getStatusColor as we generate dynamic
import { STATUS_LOKASI } from '../../utils/constants' // Fallback for legacy data
import {
    Users,
    FileText,
    TrendingUp,
    MapPin,
    Activity,
    AlertCircle
} from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalPatients: 0,
        activeFiles: 0,
        todayActivity: 0,
        missingFiles: 0,
        stuckFiles: 0
    })

    const [statusCounts, setStatusCounts] = useState([])
    const [recentActivity, setRecentActivity] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()

        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => fetchRecentActivity())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tracer' }, () => fetchStatusCounts())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        await Promise.all([
            fetchStats(),
            fetchStatusCounts(),
            fetchRecentActivity()
        ])
        setLoading(false)
    }

    const fetchStats = async () => {
        try {
            const { count: patientCount } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })

            const { data: tracerData } = await supabase
                .from('tracer')
                .select('patient_id, status_lokasi, updated_at')
                .order('updated_at', { ascending: false })

            const latestStatus = {}
            tracerData?.forEach(t => {
                if (!latestStatus[t.patient_id]) {
                    latestStatus[t.patient_id] = t
                }
            })

            const activeFiles = Object.values(latestStatus).filter(s => s.status_lokasi !== 'hilang')
            const activeCount = activeFiles.length
            const missingCount = Object.values(latestStatus).filter(s => s.status_lokasi === 'hilang').length

            const now = new Date()
            const stuckCount = Object.values(latestStatus).filter(s => {
                if (s.status_lokasi === 'hilang') return false
                const lastUpdate = new Date(s.updated_at)
                const diffHours = Math.abs(now - lastUpdate) / 36e5
                return diffHours > 24
            }).length

            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const { count: activityCount } = await supabase
                .from('activity_logs')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString())

            setStats({
                totalPatients: patientCount || 0,
                activeFiles: activeCount,
                todayActivity: activityCount || 0,
                missingFiles: missingCount,
                stuckFiles: stuckCount
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const fetchStatusCounts = async () => {
        try {
            // Fetch dynamic locations
            const { data: locations } = await supabase.from('locations').select('id, name')
            const locationMap = (locations || []).reduce((acc, loc) => {
                acc[loc.id] = loc.name
                return acc
            }, {})

            // Fetch tracer status
            const { data } = await supabase.from('tracer').select('patient_id, status_lokasi, updated_at').order('updated_at', { ascending: false })

            // Deduplicate to get latest status per patient
            const latestStatus = {}
            data?.forEach(t => {
                if (!latestStatus[t.patient_id]) {
                    latestStatus[t.patient_id] = t
                }
            })

            const counts = {}
            Object.values(latestStatus).forEach(item => {
                const status = item.status_lokasi
                // Resolve name: Check if it's a UUID (dynamic) or Legacy
                let label = locationMap[status] || status

                // Fallback for legacy codes
                const legacy = STATUS_LOKASI.find(s => s.value === status)
                if (legacy) label = legacy.label

                // Formatting
                if (label === 'hilang') label = 'Hilang'

                counts[label] = (counts[label] || 0) + 1
            })

            // Generate colors
            const generateColor = (index) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']
                return colors[index % colors.length]
            }

            const statusData = Object.keys(counts).map((label, index) => ({
                label,
                count: counts[label],
                color: generateColor(index),
                value: label
            }))

            setStatusCounts(statusData)
        } catch (error) {
            console.error('Error fetching status counts:', error)
        }
    }

    const fetchRecentActivity = async () => {
        try {
            // Note: Join with locations/staff if needed, but 'details' usually has snapshot info
            const { data } = await supabase
                .from('activity_logs')
                .select(`
                    *,
                    profiles:user_id (nama)
                `)
                .order('created_at', { ascending: false })
                .limit(10)

            setRecentActivity(data || [])
        } catch (error) {
            console.error('Error fetching recent activity:', error)
        }
    }

    const chartData = {
        labels: statusCounts.map(s => s.label),
        datasets: [{
            data: statusCounts.map(s => s.count),
            backgroundColor: statusCounts.map(s => s.color),
            borderWidth: 0,
            hoverOffset: 4
        }]
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            }
        },
        cutout: '60%'
    }

    if (loading) return <div className="page-content"><div className="spinner"></div></div>

    // Helper to resolve location display name for recent activity list if stored as UUID
    // Simplify: Just show what's in details or logs. 
    // Usually log details snapshots the name. If not, it might show UUID. 
    // We'll trust existing helpers or raw display for now.

    return (
        <>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Monitoring sistem rekam medis</p>
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-md mb-lg">
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalPatients}</div>
                        <div className="stat-label">Total Pasien</div>
                        <Users className="stat-icon" size={48} />
                    </div>
                    <div className="stat-card success">
                        <div className="stat-value">{stats.activeFiles}</div>
                        <div className="stat-label">Berkas Aktif</div>
                        <FileText className="stat-icon" size={48} />
                    </div>
                    <div className="stat-card purple">
                        <div className="stat-value">{stats.todayActivity}</div>
                        <div className="stat-label">Aktivitas Hari Ini</div>
                        <TrendingUp className="stat-icon" size={48} />
                    </div>
                    <div className="stat-card warning">
                        <div className="stat-value">{stats.stuckFiles}</div>
                        <div className="stat-label">Berkas Macet (&gt;24 Jam)</div>
                        <AlertCircle className="stat-icon" size={48} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-lg">
                    {/* Status Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Status Lokasi Berkas</h2>
                        </div>
                        <div className="card-body">
                            <div className="chart-container" style={{ height: '280px' }}>
                                {statusCounts.some(s => s.count > 0) ? (
                                    <Doughnut data={chartData} options={chartOptions} />
                                ) : (
                                    <div className="empty-state">
                                        <MapPin className="empty-state-icon" />
                                        <p>Belum ada data status lokasi</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="card">
                        <div className="card-header flex justify-between items-center">
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Aktivitas Terbaru</h2>
                            <span className="badge badge-primary">Realtime</span>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {recentActivity.length > 0 ? (
                                <div className="recent-list" style={{ padding: 'var(--spacing-md)' }}>
                                    {recentActivity.map(activity => (
                                        <div key={activity.id} className="recent-item">
                                            <Activity size={16} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
                                            <div className="recent-item-content">
                                                <div className="recent-item-title">
                                                    {activity.aksi}
                                                    {activity.no_rm && ` - ${activity.no_rm}`}
                                                </div>
                                                <div className="recent-item-subtitle">
                                                    {activity.profiles?.nama || 'System'}
                                                    {activity.details?.status_lokasi && (
                                                        <> • {getStatusLabel(activity.details.status_lokasi, STATUS_LOKASI) || activity.details.status_lokasi}</>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="recent-item-time">
                                                {formatRelativeTime(activity.created_at)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <Activity className="empty-state-icon" />
                                    <p>Belum ada aktivitas</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Dashboard
