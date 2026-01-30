import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useToast } from '../../contexts/ToastContext'
import { STATUS_LOKASI, ITEMS_PER_PAGE } from '../../utils/constants'
import {
    formatDateTime,
    getStatusLabel,
    downloadCSV,
    debounce
} from '../../utils/helpers'
import {
    Search,
    ChevronRight,
    Activity,
    Filter,
    RefreshCw,
    FileText
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ActivityLog = () => {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [filters, setFilters] = useState({
        search: '',
        user_id: '',
        status: '',
        date_from: '',
        date_to: ''
    })
    const [users, setUsers] = useState([])
    const { success, error: showError } = useToast()

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        fetchLogs()
    }, [currentPage, filters])

    useEffect(() => {
        // Subscribe to realtime updates
        const channel = supabase
            .channel('activity-logs-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activity_logs' },
                (payload) => {
                    // Add new log to top of list
                    fetchLogs()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, nama')
            .order('nama')

        setUsers(data || [])
    }

    const fetchLogs = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('activity_logs')
                .select(`
          *,
          profiles:user_id (nama, email)
        `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

            // Apply filters
            if (filters.search) {
                query = query.ilike('no_rm', `%${filters.search}%`)
            }

            if (filters.user_id) {
                query = query.eq('user_id', filters.user_id)
            }

            if (filters.date_from) {
                query = query.gte('created_at', filters.date_from)
            }

            if (filters.date_to) {
                const endDate = new Date(filters.date_to)
                endDate.setDate(endDate.getDate() + 1)
                query = query.lt('created_at', endDate.toISOString())
            }

            const { data, count, error } = await query

            if (error) throw error

            setLogs(data || [])
            setTotalCount(count || 0)
        } catch (err) {
            showError('Gagal memuat log aktivitas')
            console.error(err)
        }
        setLoading(false)
    }

    const handleSearch = debounce((value) => {
        setFilters(prev => ({ ...prev, search: value }))
        setCurrentPage(1)
    }, 300)

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
    }

    const clearFilters = () => {
        setFilters({
            search: '',
            user_id: '',
            status: '',
            date_from: '',
            date_to: ''
        })
        setCurrentPage(1)
    }

    const handleExportPDF = async () => {
        try {
            // Fetch all logs with current filters
            let query = supabase
                .from('activity_logs')
                .select(`
          *,
          profiles:user_id (nama, email)
        `)
                .order('created_at', { ascending: false })
                .limit(1000)

            if (filters.search) {
                query = query.ilike('no_rm', `%${filters.search}%`)
            }
            if (filters.user_id) {
                query = query.eq('user_id', filters.user_id)
            }
            if (filters.date_from) {
                query = query.gte('created_at', filters.date_from)
            }
            if (filters.date_to) {
                const endDate = new Date(filters.date_to)
                endDate.setDate(endDate.getDate() + 1)
                query = query.lt('created_at', endDate.toISOString())
            }

            const { data, error } = await query

            if (error) throw error

            // Create PDF
            const doc = new jsPDF()

            // Add Header
            doc.setFontSize(18)
            doc.text('RUMAH SAKIT UMUM DAERAH', 105, 20, { align: 'center' })
            doc.setFontSize(14)
            doc.text('LAPORAN AKTIVITAS SISTEM REKAM MEDIS', 105, 30, { align: 'center' })

            doc.setFontSize(10)
            doc.text(`Dicetak pada: ${formatDateTime(new Date().toISOString())}`, 14, 45)
            doc.text(`Filter: ${filters.date_from ? filters.date_from : 'Awal'} s/d ${filters.date_to ? filters.date_to : 'Sekarang'}`, 14, 50)

            // Add Table
            const tableData = data.map(log => [
                formatDateTime(log.created_at),
                log.profiles?.nama || '-',
                log.aksi,
                log.no_rm || '-',
                log.details?.status_lokasi
                    ? getStatusLabel(log.details.status_lokasi, STATUS_LOKASI)
                    : (log.details?.keterangan || '-')
            ])

            autoTable(doc, {
                startY: 55,
                head: [['Waktu', 'User', 'Aksi', 'No RM', 'Detail / Lokasi']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 8 },
            })

            // Save PDF
            doc.save(`laporan-aktivitas-${new Date().toISOString().split('T')[0]}.pdf`)
            success('Laporan PDF berhasil didownload')
        } catch (err) {
            showError('Gagal membuat laporan PDF')
            console.error(err)
        }
    }

    const handleExportCSV = async () => {
        try {
            // Fetch all logs with current filters
            let query = supabase
                .from('activity_logs')
                .select(`
          *,
          profiles:user_id (nama, email)
        `)
                .order('created_at', { ascending: false })
                .limit(1000)

            if (filters.search) {
                query = query.ilike('no_rm', `%${filters.search}%`)
            }
            if (filters.user_id) {
                query = query.eq('user_id', filters.user_id)
            }
            if (filters.date_from) {
                query = query.gte('created_at', filters.date_from)
            }
            if (filters.date_to) {
                const endDate = new Date(filters.date_to)
                endDate.setDate(endDate.getDate() + 1)
                query = query.lt('created_at', endDate.toISOString())
            }

            const { data, error } = await query

            if (error) throw error

            // Format data for CSV
            const csvData = data.map(log => ({
                Tanggal: formatDateTime(log.created_at),
                User: log.profiles?.nama || '-',
                Email: log.profiles?.email || '-',
                Aksi: log.aksi,
                'No RM': log.no_rm || '-',
                'Status Lokasi': log.details?.status_lokasi
                    ? getStatusLabel(log.details.status_lokasi, STATUS_LOKASI)
                    : '-',
                Keterangan: log.details?.keterangan || '-'
            }))

            downloadCSV(csvData, `log-aktivitas-${new Date().toISOString().split('T')[0]}`)
            success('Data berhasil diexport')
        } catch (err) {
            showError('Gagal export data')
            console.error(err)
        }
    }

    const getActionBadgeClass = (aksi) => {
        if (aksi.includes('DELETE')) return 'badge-error'
        if (aksi.includes('CREATE')) return 'badge-success'
        if (aksi.includes('UPDATE')) return 'badge-warning'
        if (aksi === 'LOGIN' || aksi === 'LOGOUT') return 'badge-primary'
        return 'badge-gray'
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

    return (
        <>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Log Aktivitas</h1>
                        <p className="page-subtitle">Monitoring semua aktivitas sistem</p>
                    </div>
                    <div className="flex gap-sm">
                        <span className="badge badge-primary">
                            <RefreshCw size={12} /> Realtime
                        </span>
                        <button
                            className="btn btn-secondary"
                            onClick={handleExportPDF}
                            disabled={logs.length === 0}
                        >
                            <FileText size={18} />
                            Export PDF
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleExportCSV}
                            disabled={logs.length === 0}
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Filters */}
                <div className="filter-bar">
                    <div className="filter-item" style={{ flex: 2 }}>
                        <div className="search-box">
                            <Search className="search-box-icon" size={18} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Cari No RM..."
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-item">
                        <select
                            className="form-input form-select"
                            value={filters.user_id}
                            onChange={(e) => handleFilterChange('user_id', e.target.value)}
                        >
                            <option value="">Semua User</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <input
                            type="date"
                            className="form-input"
                            value={filters.date_from}
                            onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            placeholder="Dari tanggal"
                        />
                    </div>

                    <div className="filter-item">
                        <input
                            type="date"
                            className="form-input"
                            value={filters.date_to}
                            onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            placeholder="Sampai tanggal"
                        />
                    </div>

                    {(filters.search || filters.user_id || filters.date_from || filters.date_to) && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={clearFilters}
                        >
                            Reset
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Waktu</th>
                                    <th>User</th>
                                    <th>Aksi</th>
                                    <th>No. RM</th>
                                    <th>Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(10)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={5}>
                                                <div className="skeleton skeleton-text"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5}>
                                            <div className="empty-state">
                                                <Activity className="empty-state-icon" />
                                                <p className="empty-state-title">Tidak ada log</p>
                                                <p className="empty-state-description">
                                                    Belum ada aktivitas yang tercatat
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id}>
                                            <td>
                                                <div className="text-sm">
                                                    {formatDateTime(log.created_at)}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    <div
                                                        className="user-avatar"
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            fontSize: '0.75rem',
                                                            background: 'var(--gray-200)',
                                                            color: 'var(--gray-700)'
                                                        }}
                                                    >
                                                        {log.profiles?.nama?.charAt(0).toUpperCase() || 'S'}
                                                    </div>
                                                    <span>{log.profiles?.nama || 'System'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getActionBadgeClass(log.aksi)}`}>
                                                    {log.aksi}
                                                </span>
                                            </td>
                                            <td>
                                                {log.no_rm ? (
                                                    <span className="font-medium" style={{ color: 'var(--primary-600)' }}>
                                                        {log.no_rm}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td>
                                                {log.details ? (
                                                    <div className="text-sm text-secondary">
                                                        {log.details.status_lokasi && (
                                                            <div>Lokasi: {getStatusLabel(log.details.status_lokasi, STATUS_LOKASI)}</div>
                                                        )}
                                                        {log.details.keterangan && (
                                                            <div>Note: {log.details.keterangan}</div>
                                                        )}
                                                        {log.details.nama && (
                                                            <div>Pasien: {log.details.nama}</div>
                                                        )}
                                                        {log.details.email && (
                                                            <div>Email: {log.details.email}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="card-footer">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-secondary">
                                    Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} dari {totalCount}
                                </div>
                                <div className="pagination">
                                    <button
                                        className="pagination-btn"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                        const pageNum = i + 1
                                        return (
                                            <button
                                                key={pageNum}
                                                className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                                                onClick={() => setCurrentPage(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        )
                                    })}
                                    {totalPages > 5 && <span className="px-md">...</span>}
                                    <button
                                        className="pagination-btn"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default ActivityLog
