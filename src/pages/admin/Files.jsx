import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../config/supabase'
import { useReferenceData } from '../../hooks/useReferenceData'
import {
    formatDateTime,
    formatRelativeTime,
    calculateAge,
    formatDate
} from '../../utils/helpers'
import {
    FileText,
    MapPin,
    Search,
    User,
    Clock,
    ArrowRight,
    Users
} from 'lucide-react'

const Files = () => {
    const { locations, staff, loading: loadingRef } = useReferenceData()
    const [activeTab, setActiveTab] = useState('out') // 'out' or 'in'
    const [files, setFiles] = useState([])
    const [patients, setPatients] = useState({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Realtime subscription
    useEffect(() => {
        fetchData()

        const channel = supabase
            .channel('files-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tracer' }, (payload) => {
                handleRealtimeUpdate(payload.new)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Patients
            const { data: patientData } = await supabase
                .from('patients')
                .select('id, no_rm, nama, tanggal_lahir')

            const patientMap = (patientData || []).reduce((acc, p) => {
                acc[p.id] = p
                return acc
            }, {})
            setPatients(patientMap)

            // 2. Fetch Latest Tracer Status for ALL patients
            // Optimization: We fetch all tracer records ordered by time
            // In a large system, this should be replaced by a dedicated 'current_status' column on patients or a view.
            const { data: tracerData } = await supabase
                .from('tracer')
                .select('*')
                .order('created_at', { ascending: false })

            // Deduplicate to get latest
            const latestStatus = {}
            tracerData?.forEach(t => {
                if (!latestStatus[t.patient_id]) {
                    latestStatus[t.patient_id] = t
                }
            })

            // Also check for patients with NO tracer history (assume "New" or default location?)
            // Usually if no history, it's considered "In Storage" (Rekam Medis) or "Unknown"?
            // We'll treat them as "Belum adilacak" or "Tersedia" if we assume default storage.
            // For now, only show files with tracking history or display all patients.
            // Let's display all patients. If no tracer, assume "Tersedia" (In Storage).

            const allFiles = (patientData || []).map(p => {
                const status = latestStatus[p.id]
                return {
                    patientId: p.id,
                    ...p,
                    status: status || null
                }
            })

            setFiles(allFiles)

        } catch (err) {
            console.error('Error fetching files:', err)
        }
        setLoading(false)
    }

    const handleRealtimeUpdate = (newTracer) => {
        setFiles(prev => {
            return prev.map(f => {
                if (f.patientId === newTracer.patient_id) {
                    return { ...f, status: newTracer }
                }
                return f
            })
        })
    }

    // Process Data
    const processedData = useMemo(() => {
        if (loadingRef || loading) return { in: [], out: [] }

        // Create a map for quick location lookup
        const locationMap = locations.reduce((acc, l) => {
            acc[l.id] = l
            return acc
        }, {})

        // Map legacy statuses if needed
        const isStorage = (statusValue) => {
            if (!statusValue) return true // Assume in storage if no status
            if (statusValue === 'hilang') return false // Special case

            const loc = locationMap[statusValue]
            if (loc) return loc.is_storage

            // Legacy fallback: 'rekam_medis' is storage
            if (statusValue === 'rekam_medis') return true
            return false
        }

        const filtered = files.filter(f => {
            if (!search) return true
            return (
                f.nama.toLowerCase().includes(search.toLowerCase()) ||
                f.no_rm.toLowerCase().includes(search.toLowerCase())
            )
        })

        const inStorage = []
        const outStorage = []

        filtered.forEach(f => {
            const statusVal = f.status?.status_lokasi
            const inStore = isStorage(statusVal)

            // Resolve names
            const locationName = locationMap[statusVal]?.name || statusVal || 'Rekam Medis (Default)'
            const staffName = f.status?.staff_id
                ? staff.find(s => s.id === f.status.staff_id)?.nama
                : '-'

            const item = {
                ...f,
                locationName,
                staffName,
                time: f.status?.created_at,
                is_storage: inStore
            }

            if (inStore) inStorage.push(item)
            else outStorage.push(item)
        })

        return { in: inStorage, out: outStorage }
    }, [files, locations, staff, search, loading, loadingRef])


    return (
        <>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Monitoring Berkas</h1>
                        <p className="page-subtitle">Posisi dan status berkas rekam medis realtime</p>
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Search & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
                    <div className="card md:col-span-2 flex items-center p-sm">
                        <Search className="text-gray-400 ml-sm" size={20} />
                        <input
                            type="text"
                            className="form-input border-none shadow-none text-lg"
                            placeholder="Cari pasien atau No RM..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="card flex items-center justify-between p-md bg-blue-50 text-blue-700 border-blue-100">
                        <div className="font-semibold">Total Berkas Keluar</div>
                        <div className="text-2xl font-bold">{processedData.out.length}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-md">
                    <button
                        className={`px-lg py-sm font-medium border-b-2 transition-colors ${activeTab === 'out' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-gray-700'}`}
                        onClick={() => setActiveTab('out')}
                    >
                        Sedang Dipinjam / Keluar ({processedData.out.length})
                    </button>
                    <button
                        className={`px-lg py-sm font-medium border-b-2 transition-colors ${activeTab === 'in' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-gray-700'}`}
                        onClick={() => setActiveTab('in')}
                    >
                        Tersedia di Rak ({processedData.in.length})
                    </button>
                </div>

                {/* List */}
                <div className="flex flex-col gap-md">
                    {(activeTab === 'out' ? processedData.out : processedData.in).length === 0 ? (
                        <div className="empty-state py-xl">
                            <FileText size={48} className="empty-state-icon" />
                            <p>Tidak ada berkas di kategori ini</p>
                        </div>
                    ) : (
                        (activeTab === 'out' ? processedData.out : processedData.in).map(file => (
                            <div key={file.patientId} className="card hover:shadow-md transition-shadow">
                                <div className="card-body flex items-center gap-md">
                                    {/* Icon / Status */}
                                    <div className={`p-3 rounded-full ${activeTab === 'out' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                        {activeTab === 'out' ? <ArrowRight size={24} /> : <FileText size={24} />}
                                    </div>

                                    {/* Patient Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-sm mb-xs">
                                            <span className="font-mono font-bold text-lg bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                                {file.no_rm}
                                            </span>
                                            <span className="font-semibold text-lg truncate">
                                                {file.nama}
                                            </span>
                                        </div>
                                        <div className="text-sm text-secondary flex items-center gap-md">
                                            <span className="flex items-center gap-xs">
                                                <User size={14} /> {calculateAge(file.tanggal_lahir)}
                                            </span>
                                            {file.time && (
                                                <span className="flex items-center gap-xs" title={formatDateTime(file.time)}>
                                                    <Clock size={14} /> {formatRelativeTime(file.time)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location Info */}
                                    <div className="flex flex-col items-end gap-xs text-right min-w-[150px]">
                                        <div className="flex items-center gap-xs font-semibold text-gray-800">
                                            <MapPin size={16} className={activeTab === 'out' ? 'text-orange-500' : 'text-green-500'} />
                                            {file.locationName}
                                        </div>
                                        {/* Show Staff only if OUT or relevant */}
                                        {activeTab === 'out' && (
                                            <div className="text-sm text-blue-600 flex items-center gap-xs">
                                                <Users size={14} />
                                                {file.staffName || 'Tanpa Nama'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    )
}

export default Files
