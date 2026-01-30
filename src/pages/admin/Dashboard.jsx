import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { STATUS_LOKASI } from '../../utils/constants'
import { formatRelativeTime, getStatusLabel, getStatusColor } from '../../utils/helpers'
import {
    Users,
    FileText,
    Activity,
    AlertCircle,
    TrendingUp,
    MapPin
} from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement)

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalPatients: 0,
        activeFiles: 0,
        todayActivity: 0,
        missingFiles: 0,
        stuckFiles: 0
    })

    // ... state ...

    // ... chartData & chartOptions ...

    const trendChartData = {
        labels: trendData.map(d => d.date),
        datasets: [
            {
                label: 'Jumlah Aktivitas',
                data: trendData.map(d => d.count),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true
            }
        ]
    }

    const trendChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0
                }
            }
        }
    }
    const [statusCounts, setStatusCounts] = useState([])
    const [recentActivity, setRecentActivity] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()

        // Subscribe to realtime updates
        const channel = supabase
            .channel('dashboard-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'activity_logs' },
                () => {
                    fetchRecentActivity()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tracer' },
                () => {
                    fetchStatusCounts()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const [trendData, setTrendData] = useState([]) // Array of {date, count}

    // ... useEffect ...

    const fetchDashboardData = async () => {
        setLoading(true)
        await Promise.all([
            fetchStats(),
            fetchStatusCounts(),
            fetchRecentActivity(),
            fetchTrendData()
        ])
        setLoading(false)
    }

    const fetchStats = async () => {
        try {
            // Total patients
            const { count: patientCount } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })

            // Get latest tracer status for each patient to count active files
            const { data: tracerData } = await supabase
                .from('tracer')
                .select('patient_id, status_lokasi, updated_at') // Fetch updated_at
                .order('updated_at', { ascending: false })

            // Count unique active files (not lost)
            const latestStatus = {}
            tracerData?.forEach(t => {
                if (!latestStatus[t.patient_id]) {
                    latestStatus[t.patient_id] = t
                }
            })

            const activeCount = Object.values(latestStatus).filter(s => s.status_lokasi !== 'hilang').length
            const missingCount = Object.values(latestStatus).filter(s => s.status_lokasi === 'hilang').length

            // Calculate Stuck Files (> 24 hours not updated)
            const now = new Date()
            const stuckCount = Object.values(latestStatus).filter(s => {
                if (s.status_lokasi === 'hilang') return false
                const lastUpdate = new Date(s.updated_at)
                const diffTime = Math.abs(now - lastUpdate)
                const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
                return diffHours > 24
            }).length

            // Today's activity
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
                stuckFiles: stuckCount // Added
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    // ... fetchStatusCounts ...

    const fetchTrendData = async () => {
        try {
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(endDate.getDate() - 6) // Last 7 days

            const { data } = await supabase
                .from('activity_logs')
                .select('created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true })

            // Group by date
            const grouped = {}
            // Initialize last 7 days with 0
            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate)
                d.setDate(d.getDate() + i)
                const key = d.toISOString().split('T')[0]
                grouped[key] = 0
            }

            data?.forEach(item => {
                const date = item.created_at.split('T')[0]
                if (grouped[date] !== undefined) {
                    grouped[date]++
                }
            })

            const chartData = Object.keys(grouped).map(date => ({
                date: new Date(date).toLocaleDateString('id-ID', { weekday: 'short' }),
                count: grouped[date]
            }))

            setTrendData(chartData)
        } catch (err) {
            console.error('Error fetching trend:', err)
        }
    }

    const fetchRecentActivity = async () => {
        try {
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

    if (loading) {
        return (
            <>
                <div className="page-header">
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Monitoring sistem rekam medis</p>
                </div>
                <div className="page-content">
                    <div className="grid grid-cols-4 gap-md">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="skeleton skeleton-card"></div>
                        ))}
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Monitoring sistem rekam medis</p>
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

                    <div className="stat-card error">
                        <div className="stat-value">{stats.missingFiles}</div>
                        <div className="stat-label">Berkas Hilang</div>
                        <AlertCircle className="stat-icon" size={48} />
                    </div>

                    <div className="stat-card warning">
                        <div className="stat-value">{stats.stuckFiles}</div>
                        <div className="stat-label">Berkas Macet (&gt;24 Jam)</div>
                        <TrendingUp className="stat-icon" size={48} style={{ transform: 'rotate(90deg)' }} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-lg">
                    {/* Status Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                                Status Lokasi Berkas
                            </h2>
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
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                                Aktivitas Terbaru
                            </h2>
                            <span className="badge badge-primary">Realtime</span>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {recentActivity.length > 0 ? (
                                <div className="recent-list" style={{ padding: 'var(--spacing-md)' }}>
                                    {recentActivity.map(activity => (
                                        <div key={activity.id} className="recent-item" style={{ cursor: 'default' }}>
                                            <Activity size={16} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
                                            <div className="recent-item-content">
                                                <div className="recent-item-title">
                                                    {activity.aksi}
                                                    {activity.no_rm && ` - ${activity.no_rm}`}
                                                </div>
                                                <div className="recent-item-subtitle">
                                                    {activity.profiles?.nama || 'System'}
                                                    {activity.details?.status_lokasi && (
                                                        <> • {getStatusLabel(activity.details.status_lokasi, STATUS_LOKASI)}</>
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

                {/* Trend Chart */}
                <div className="card mt-lg">
                    <div className="card-header">
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                            Tren Aktivitas (7 Hari Terakhir)
                        </h2>
                    </div>
                    <div className="card-body">
                        <div className="chart-container" style={{ height: '300px' }}>
                            <Line data={trendChartData} options={trendChartOptions} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Dashboard
