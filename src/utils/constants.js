// Status lokasi berkas
export const STATUS_LOKASI = [
  { value: 'ruang_rawat_inap', label: 'Ruang Rawat Inap', color: '#10b981' },
  { value: 'poli', label: 'Poli', color: '#3b82f6' },
  { value: 'casemix', label: 'Casemix', color: '#8b5cf6' },
  { value: 'rekam_medis', label: 'Rekam Medis', color: '#f59e0b' },
  { value: 'hilang', label: 'Hilang', color: '#ef4444' }
]

// User roles
export const ROLES = {
  ADMIN: 'admin',
  PETUGAS: 'petugas'
}

// Activity actions
export const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SCAN_QR: 'SCAN_QR',
  UPDATE_STATUS: 'UPDATE_STATUS',
  CREATE_PATIENT: 'CREATE_PATIENT',
  UPDATE_PATIENT: 'UPDATE_PATIENT',
  DELETE_PATIENT: 'DELETE_PATIENT',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER'
}

// Pagination
export const ITEMS_PER_PAGE = 10

// Undo timeout (in milliseconds)
export const UNDO_TIMEOUT = 5000
