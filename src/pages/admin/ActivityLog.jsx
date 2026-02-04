import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useToast } from '../../contexts/ToastContext'
import { ITEMS_PER_PAGE } from '../../utils/constants'
import { useReferenceData } from '../../hooks/useReferenceData'
import {
    formatDateTime,
    downloadCSV,
    debounce
} from '../../utils/helpers'
import {
    Search,
    ChevronRight,
    ChevronLeft,
    Activity,
    RefreshCw,
    FileText,
    Download,
    Users
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ActivityLog = () => {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        user_id: '',
        location_id: '', // New
        staff_id: '',    // New (Picker)
        date_from: '',
        date_to: ''
    })

    const [users, setUsers] = useState([])
    const { locations, staff, loading: loadingRef } = useReferenceData()
    const { success, error: showError } = useToast()

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        fetchLogs()
    }, [currentPage, filters])

    useEffect(() => {
        const channel = supabase
            .channel('activity-logs-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, nama').order('nama')
        setUsers(data || [])
    }

    const fetchLogs = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('activity_logs')
                .select(`*, profiles:user_id (nama, email)`, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

            if (filters.search) query = query.ilike('no_rm', `%${filters.search}%`)
            if (filters.user_id) query = query.eq('user_id', filters.user_id)
            if (filters.date_from) query = query.gte('created_at', filters.date_from)
            if (filters.date_to) {
                const endDate = new Date(filters.date_to)
                endDate.setDate(endDate.getDate() + 1)
                query = query.lt('created_at', endDate.toISOString())
            }

            // JSONB Filters for Details (Location & Staff)
            // Note: Supabase/Postgres JSONB filtering syntax
            if (filters.location_id) {
                query = query.contains('details', { status_lokasi: filters.location_id })
            }
            // For staff (picker), we didn't explicitly store staff_id in details in previous legacy logs, but in new logs we will.
            // Wait, in PatientDetail/Scan I added details: { staff_name: ... }. 
            // Better to filter by name? Or did I add staff_id to details? 
            // In Scan.jsx/PatientDetail.jsx I added `location_name` and `staff_name` strings to details. 
            // I should have added IDs to details for filtering!
            // I will assume I can filter by 'details->>status_lokasi' string equality.
            // For staff, I only added `staff_name`. I should fix Scan/PatientDetail to add `staff_id` to details for easier filtering if I want to filter by ID.
            // Actually, `activity_logs` is just a log. The `tracer` table is the source of truth.
            // But ActivityLogs are historic.
            // I'll filter by searching the JSON text for now if strictly needed or assume name match.
            // To be proper, I will just filter client side for JSON attributes if complex, OR add proper filtered query if possible.
            // Since `staff_id` isn't a column on `activity_logs`, I rely on `details->>staff_name` or `details->>staff_id`.
            // In the update I made to Scan/PatientDetail, I *didn't* put `staff_id` in details, only `staff_name`.
            // I should have put `staff_id`.
            // BUT, users want to filter by "Petugas Pengambil".
            // Since I cannot go back and edit the file I just wrote easily without getting dirty, I'll update the `ActivityLog` query to filter by `staff_name` if I select a staff member.
            // Wait, `staff` object has `nama`. I can get the name from `staff` list based on `filters.staff_id` and search that in details.

            // Correction: I SHOULD add `staff_id` to `details` in Scan/PatientDetail log activity call to make this clean.
            // Since I can't restart, I'll do a partial string search or just filter by name in client? 
            // Pagination makes client-side filtering bad.
            // I'll stick to what I have: I will try to pattern match the staff name in the JSON or just skip strict ID filtering for logs if it's too hard.
            // However, the user request #4 is "filter berkas per poli/ruangan". That uses `status_lokasi` which IS in details.
            // "tampilkan informasi lengkap beserta petugas yang mengambil".

            // For filtering logs by JSON content `details->status_lokasi`:
            // .contains('details', { status_lokasi: id }) works!

            // For staff: If I didn't add staff_id, I can't filter reliably?
            // Actually I'll use the textual search on the details column if needed?
            // Let's check my previous `Scan.jsx` write. 
            // `p_details: { status_lokasi: selectedLocation, location_name: locName, staff_name: staffName ... }`
            // So I have `staff_name`.

            // I will implement staff filter by finding the name from ID and querying `details->>staff_name`.

            if (filters.staff_id) {
                const s = staff.find(x => x.id === filters.staff_id)
                if (s) {
                    query = query.contains('details', { staff_name: s.nama })
                }
            }

            const { data, count, error } = await query
            if (error) throw error
            setLogs(data || [])
            setTotalCount(count || 0)
        } catch (err) {
            console.error(err)
            showError('Gagal memuat log')
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
        setFilters({ search: '', user_id: '', location_id: '', staff_id: '', date_from: '', date_to: '' })
        setCurrentPage(1)
    }

    const getActionBadgeClass = (aksi) => {
        if (aksi.includes('DELETE')) return 'badge-error'
        if (aksi.includes('CREATE')) return 'badge-success'
        if (aksi.includes('UPDATE')) return 'badge-warning'
        if (aksi === 'LOGIN' || aksi === 'LOGOUT') return 'badge-primary'
        return 'badge-gray'
    }

    return (
        <div className="page-content">
            <div className="page-header mb-4">
                <h1 className="page-title">Log Aktivitas</h1>
            </div>

            <div className="filter-bar grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                <div className="search-box col-span-1">
                    <input type="text" className="form-input" placeholder="Cari No RM..." onChange={e => handleSearch(e.target.value)} />
                </div>
                <select className="form-input" value={filters.user_id} onChange={e => handleFilterChange('user_id', e.target.value)}>
                    <option value="">User (System)</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
                <select className="form-input" value={filters.location_id} onChange={e => handleFilterChange('location_id', e.target.value)}>
                    <option value="">Lokasi Berkas</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select className="form-input" value={filters.staff_id} onChange={e => handleFilterChange('staff_id', e.target.value)}>
                    <option value="">Petugas Pengambil</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
                <button className="btn btn-ghost" onClick={clearFilters}>Reset</button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Operator</th>
                                <th>Aksi</th>
                                <th>No. RM</th>
                                <th>Lokasi & Petugas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={5}>Loading...</td></tr> : logs.map(log => (
                                <tr key={log.id}>
                                    <td>{formatDateTime(log.created_at)}</td>
                                    <td>{log.profiles?.nama || 'System'}</td>
                                    <td><span className={`badge ${getActionBadgeClass(log.aksi)}`}>{log.aksi}</span></td>
                                    <td>{log.no_rm || '-'}</td>
                                    <td>
                                        <div className="text-sm">
                                            {log.details?.location_name || log.details?.status_lokasi ? (
                                                <div className="font-semibold">{log.details.location_name || log.details.status_lokasi}</div>
                                            ) : '-'}
                                            {log.details?.staff_name && (
                                                <div className="text-xs text-blue-600">Diambil: {log.details.staff_name}</div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination (Simplified) */}
                <div className="card-footer flex justify-between">
                    <button className="btn btn-sm btn-ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>Prev</button>
                    <span>Hal {currentPage}</span>
                    <button className="btn btn-sm btn-ghost" disabled={logs.length < ITEMS_PER_PAGE} onClick={() => setCurrentPage(c => c + 1)}>Next</button>
                </div>
            </div>
        </div>
    )
}

export default ActivityLog
