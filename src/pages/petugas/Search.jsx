import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useToast } from '../../contexts/ToastContext'
import { STATUS_LOKASI } from '../../utils/constants'
import {
    debounce,
    formatDate,
    calculateAge,
    getStatusLabel,
    getStatusColor
} from '../../utils/helpers'
import { Search as SearchIcon, FileText, MapPin } from 'lucide-react'

const Search = () => {
    const navigate = useNavigate()
    const { error: showError } = useToast()
    const [search, setSearch] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    const handleSearch = async (query) => {
        if (!query || query.length < 2) {
            setResults([])
            setSearched(false)
            return
        }

        setLoading(true)
        setSearched(true)

        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .or(`no_rm.ilike.%${query}%,nama.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) throw error

            // Fetch current status for each patient
            const patientIds = data.map(p => p.id)
            const { data: tracerData } = await supabase
                .from('tracer')
                .select('patient_id, status_lokasi')
                .in('patient_id', patientIds)
                .order('updated_at', { ascending: false })

            // Map latest status
            const statusMap = {}
            tracerData?.forEach(t => {
                if (!statusMap[t.patient_id]) {
                    statusMap[t.patient_id] = t.status_lokasi
                }
            })

            const resultsWithStatus = data.map(p => ({
                ...p,
                current_status: statusMap[p.id] || null
            }))

            setResults(resultsWithStatus)
        } catch (err) {
            console.error('Search error:', err)
            showError('Gagal mencari pasien')
        }

        setLoading(false)
    }

    const debouncedSearch = debounce(handleSearch, 300)

    const handleInputChange = (e) => {
        const value = e.target.value
        setSearch(value)
        debouncedSearch(value)
    }

    const handleSelectPatient = (patient) => {
        navigate('/petugas/scan', { state: { noRm: patient.no_rm } })
    }

    return (
        <div className="flex flex-col gap-md">
            {/* Search Box & Scan Button */}
            <div className="flex gap-sm">
                <div className="search-box flex-1">
                    <SearchIcon className="search-box-icon" size={20} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Cari No. RM atau nama pasien..."
                        value={search}
                        onChange={handleInputChange}
                        autoFocus
                        style={{ fontSize: '1rem', padding: '1rem 1rem 1rem 3rem' }}
                    />
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/petugas/scan')}
                    style={{ aspectRatio: '1/1', padding: 0, width: '48px' }}
                    title="Scan QR Code"
                >
                    <SearchIcon size={24} className="hidden" /> {/* Hidden icon for spacing if needed */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" /><rect width="5" height="5" x="16" y="3" /><rect width="5" height="5" x="3" y="16" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
                </button>
            </div>

            {/* Results */}
            {loading ? (
                <div className="flex flex-col gap-sm">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card">
                            <div className="card-body">
                                <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
                                <div className="skeleton skeleton-text mt-sm"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : results.length > 0 ? (
                <div className="flex flex-col gap-sm">
                    {results.map(patient => (
                        <div
                            key={patient.id}
                            className="card"
                            onClick={() => handleSelectPatient(patient)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="card-body">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span
                                            className="badge badge-primary mb-xs"
                                            style={{ fontSize: '0.75rem' }}
                                        >
                                            {patient.no_rm}
                                        </span>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                                            {patient.nama}
                                        </h3>
                                        <div className="flex items-center gap-sm text-sm text-secondary mt-xs">
                                            <span>{formatDate(patient.tanggal_lahir)}</span>
                                            <span>•</span>
                                            <span>{calculateAge(patient.tanggal_lahir)}</span>
                                        </div>
                                    </div>

                                    {patient.current_status && (
                                        <div
                                            className="badge"
                                            style={{
                                                backgroundColor: `${getStatusColor(patient.current_status, STATUS_LOKASI)}20`,
                                                color: getStatusColor(patient.current_status, STATUS_LOKASI)
                                            }}
                                        >
                                            <MapPin size={12} />
                                            {getStatusLabel(patient.current_status, STATUS_LOKASI)}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-sm pt-sm border-t border-gray-100 flex justify-end">
                                    <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSelectPatient(patient)
                                        }}
                                    >
                                        <MapPin size={14} />
                                        Update Lokasi
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : searched ? (
                <div className="empty-state">
                    <FileText size={48} style={{ opacity: 0.3 }} />
                    <p className="empty-state-title mt-md">Tidak ditemukan</p>
                    <p className="empty-state-description">
                        Tidak ada pasien dengan kata kunci "{search}"
                    </p>
                </div>
            ) : (
                <div className="empty-state">
                    <SearchIcon size={48} style={{ opacity: 0.3 }} />
                    <p className="text-secondary mt-md">
                        Ketik minimal 2 karakter untuk mencari
                    </p>
                </div>
            )}
        </div>
    )
}

export default Search
