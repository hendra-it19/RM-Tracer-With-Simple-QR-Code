import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { STATUS_LOKASI } from '../../utils/constants'
import {
    formatDateTime,
    formatDate,
    getStatusLabel,
    getStatusColor
} from '../../utils/helpers'
import { Clock, MapPin, FileText, ChevronRight } from 'lucide-react'

const History = () => {
    const { profile } = useAuth()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('today')

    useEffect(() => {
        if (profile?.id) {
            fetchHistory()
        }
    }, [profile, filter])

    const fetchHistory = async () => {
        setLoading(true)

        try {
            let query = supabase
                .from('activity_logs')
                .select('*')
                .eq('user_id', profile.id)
                .in('aksi', ['UPDATE_STATUS', 'SCAN_QR'])
                .order('created_at', { ascending: false })
                .limit(50)

            // Apply date filter
            const now = new Date()
            if (filter === 'today') {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                query = query.gte('created_at', today.toISOString())
            } else if (filter === 'week') {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                query = query.gte('created_at', weekAgo.toISOString())
            } else if (filter === 'month') {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                query = query.gte('created_at', monthAgo.toISOString())
            }

            const { data, error } = await query

            if (error) throw error

            // Group by date
            const grouped = {}
            data?.forEach(item => {
                const date = formatDate(item.created_at, 'yyyy-MM-dd')
                if (!grouped[date]) {
                    grouped[date] = []
                }
                grouped[date].push(item)
            })

            setHistory(Object.entries(grouped).map(([date, items]) => ({
                date,
                dateLabel: formatDate(date, 'EEEE, dd MMMM yyyy'),
                items
            })))

        } catch (err) {
            console.error('Error fetching history:', err)
        }

        setLoading(false)
    }

    const filterOptions = [
        { value: 'today', label: 'Hari Ini' },
        { value: 'week', label: 'Minggu Ini' },
        { value: 'month', label: 'Bulan Ini' }
    ]

    return (
        <div className="flex flex-col gap-md">
            {/* Filter Tabs */}
            <div className="flex gap-sm">
                {filterOptions.map(option => (
                    <button
                        key={option.value}
                        className={`btn btn-sm ${filter === option.value ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* History List */}
            {loading ? (
                <div className="flex flex-col gap-md">
                    {[1, 2, 3].map(i => (
                        <div key={i}>
                            <div className="skeleton skeleton-text mb-sm" style={{ width: '50%' }}></div>
                            <div className="card">
                                <div className="card-body">
                                    <div className="skeleton skeleton-text"></div>
                                    <div className="skeleton skeleton-text mt-sm" style={{ width: '70%' }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : history.length === 0 ? (
                <div className="empty-state">
                    <Clock size={48} style={{ opacity: 0.3 }} />
                    <p className="empty-state-title mt-md">Belum ada riwayat</p>
                    <p className="empty-state-description">
                        Aktivitas scan Anda akan muncul di sini
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-lg">
                    {history.map(group => (
                        <div key={group.date}>
                            <h3
                                className="text-sm font-semibold text-secondary mb-sm"
                                style={{ paddingLeft: 4 }}
                            >
                                {group.dateLabel}
                            </h3>

                            <div className="card">
                                <div style={{ padding: 0 }}>
                                    {group.items.map((item, index) => (
                                        <Link
                                            key={item.id}
                                            to="/petugas/scan"
                                            state={{ noRm: item.no_rm }}
                                            className="flex items-center gap-md"
                                            style={{
                                                padding: 'var(--spacing-md)',
                                                borderBottom: index < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                                                textDecoration: 'none',
                                                color: 'inherit'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 'var(--radius-lg)',
                                                    background: item.details?.status_lokasi
                                                        ? `${getStatusColor(item.details.status_lokasi, STATUS_LOKASI)}20`
                                                        : 'var(--gray-100)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {item.aksi === 'UPDATE_STATUS' ? (
                                                    <MapPin
                                                        size={18}
                                                        style={{
                                                            color: item.details?.status_lokasi
                                                                ? getStatusColor(item.details.status_lokasi, STATUS_LOKASI)
                                                                : 'var(--gray-500)'
                                                        }}
                                                    />
                                                ) : (
                                                    <FileText size={18} style={{ color: 'var(--gray-500)' }} />
                                                )}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="font-medium">{item.no_rm}</div>
                                                <div className="text-sm text-secondary">
                                                    {item.aksi === 'UPDATE_STATUS' && item.details?.status_lokasi
                                                        ? getStatusLabel(item.details.status_lokasi, STATUS_LOKASI)
                                                        : 'Scan QR'
                                                    }
                                                </div>
                                            </div>

                                            <div className="text-sm text-muted" style={{ flexShrink: 0 }}>
                                                {formatDateTime(item.created_at).split(', ')[1]}
                                            </div>

                                            <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default History
