import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useReferenceData } from '../../hooks/useReferenceData'
import {
    formatDateTime,
    formatDate,
    getStatusLabel
} from '../../utils/helpers'
import { Clock, MapPin, FileText, ChevronRight, Search, Users, Calendar } from 'lucide-react'

const History = () => {
    const { profile } = useAuth()
    const { locations, staff, loading: loadingRef } = useReferenceData()

    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)

    // Filter State
    const [timeFilter, setTimeFilter] = useState('today') // today, week, month, custom
    const [search, setSearch] = useState('')
    const [locationId, setLocationId] = useState('')
    const [staffId, setStaffId] = useState('')
    const [dateRange, setDateRange] = useState({ start: '', end: '' })

    useEffect(() => {
        if (profile?.id) {
            fetchHistory()
        }
    }, [profile, timeFilter, search, locationId, staffId, dateRange])

    const fetchHistory = async () => {
        setLoading(true)

        try {
            let query = supabase
                .from('activity_logs')
                .select('*')
                .eq('user_id', profile.id)
                .in('aksi', ['UPDATE_STATUS', 'SCAN_QR'])
                .order('created_at', { ascending: false })
                .limit(100)

            // 1. Time Filters
            const now = new Date()
            if (timeFilter === 'today') {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                query = query.gte('created_at', today.toISOString())
            } else if (timeFilter === 'week') {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                query = query.gte('created_at', weekAgo.toISOString())
            } else if (timeFilter === 'month') {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                query = query.gte('created_at', monthAgo.toISOString())
            } else if (timeFilter === 'custom') {
                if (dateRange.start) query = query.gte('created_at', dateRange.start)
                if (dateRange.end) {
                    const endDate = new Date(dateRange.end)
                    endDate.setDate(endDate.getDate() + 1)
                    query = query.lt('created_at', endDate.toISOString())
                }
            }

            // 2. Search
            if (search) {
                query = query.ilike('no_rm', `%${search}%`)
            }

            // 3. Details Filters
            // Note: details->status_lokasi stores Location ID (new) or Code (old)
            // details->staff_name stores Staff Name (string) 
            // We can filter by seeing if the JSON contains a key/value

            if (locationId) {
                query = query.contains('details', { status_lokasi: locationId })
            }

            // Filter by Staff Name since we stored name in details in Scan.jsx
            if (staffId) {
                const s = staff.find(x => x.id === staffId)
                if (s) {
                    query = query.contains('details', { staff_name: s.nama })
                }
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

    const timeOptions = [
        { value: 'today', label: 'Hari Ini' },
        { value: 'week', label: 'Minggu Ini' },
        { value: 'month', label: 'Bulan Ini' },
        { value: 'custom', label: 'Range Tanggal' }
    ]

    return (
        <div className="flex flex-col gap-md">
            {/* Main Tabs */}
            <div className="flex gap-sm overflow-x-auto pb-2 scrollbar-hide">
                {timeOptions.map(option => (
                    <button
                        key={option.value}
                        className={`btn btn-sm ${timeFilter === option.value ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTimeFilter(option.value)}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Sub Filters */}
            <div className="card">
                <div className="card-body p-sm">
                    <div className="flex flex-col gap-sm">

                        {/* Search & Custom Date */}
                        <div className="flex gap-sm">
                            <div className="search-box flex-1">
                                <Search className="search-box-icon" size={16} />
                                <input
                                    type="text"
                                    className="form-input form-input-sm"
                                    placeholder="Cari No RM..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {timeFilter === 'custom' && (
                            <div className="flex gap-sm">
                                <input type="date" className="form-input form-input-sm" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} placeholder="Mulai" />
                                <input type="date" className="form-input form-input-sm" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} placeholder="Selesai" />
                            </div>
                        )}

                        {/* Location & Staff */}
                        <div className="flex gap-sm">
                            <select
                                className="form-input form-input-sm"
                                value={locationId}
                                onChange={e => setLocationId(e.target.value)}
                                style={{ width: '50%' }}
                            >
                                <option value="">Semua Lokasi</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>

                            <select
                                className="form-input form-input-sm"
                                value={staffId}
                                onChange={e => setStaffId(e.target.value)}
                                style={{ width: '50%' }}
                            >
                                <option value="">Semua Petugas</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* History List */}
            {loading ? (
                <div className="flex justify-center p-lg"><div className="spinner"></div></div>
            ) : history.length === 0 ? (
                <div className="empty-state">
                    <Clock size={48} style={{ opacity: 0.3 }} />
                    <p className="empty-state-title mt-md">Tidak ada data</p>
                </div>
            ) : (
                <div className="flex flex-col gap-lg">
                    {history.map(group => (
                        <div key={group.date}>
                            <h3 className="text-sm font-semibold text-secondary mb-sm pl-1">
                                {group.dateLabel}
                            </h3>

                            <div className="card">
                                <div style={{ padding: 0 }}>
                                    {group.items.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-xs"
                                            style={{
                                                padding: 'var(--spacing-md)',
                                                borderBottom: index < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                                            }}
                                        >
                                            <div className="flex items-center gap-md">
                                                <div
                                                    style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                                >
                                                    {item.aksi === 'UPDATE_STATUS' ? <MapPin size={18} /> : <FileText size={18} />}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="font-medium text-lg">{item.no_rm}</div>
                                                    <div className="text-sm font-semibold text-gray-800">
                                                        {item.details?.location_name || item.details?.status_lokasi || 'Update Status'}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-muted">
                                                    {formatDateTime(item.created_at).split(', ')[1]}
                                                </div>
                                            </div>

                                            {/* Extra Details */}
                                            {item.details?.staff_name && (
                                                <div className="ml-[56px] text-sm text-blue-600 flex items-center gap-xs">
                                                    <Users size={14} />
                                                    <span>Diambil: {item.details.staff_name}</span>
                                                </div>
                                            )}
                                        </div>
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
