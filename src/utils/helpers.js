import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { id } from 'date-fns/locale'

// Format date to Indonesian format
export const formatDate = (date, formatStr = 'dd MMM yyyy') => {
  if (!date) return '-'
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'
  return format(parsed, formatStr, { locale: id })
}

// Format date with time
export const formatDateTime = (date) => {
  return formatDate(date, 'dd MMM yyyy, HH:mm')
}

// Relative time (e.g., "5 minutes ago")
export const formatRelativeTime = (date) => {
  if (!date) return '-'
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'
  return formatDistanceToNow(parsed, { addSuffix: true, locale: id })
}

// Generate QR code value from no_rm
export const generateQRValue = (noRm) => {
  return `RMTRACER:${noRm}`
}

// Parse QR code value to get no_rm
export const parseQRValue = (qrValue) => {
  if (!qrValue) return null
  if (qrValue.startsWith('RMTRACER:')) {
    return qrValue.replace('RMTRACER:', '')
  }
  // If no prefix, treat as direct no_rm
  return qrValue
}

// Generate a unique no_rm
export const generateNoRM = () => {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `RM-${year}${month}${random}`
}

// Capitalize first letter of each word
export const capitalizeWords = (str) => {
  if (!str) return ''
  return str.replace(/\b\w/g, (char) => char.toUpperCase())
}

// Truncate text with ellipsis
export const truncate = (str, length = 50) => {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Download data as CSV
export const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) return
  
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      }).join(',')
    )
  ]
  
  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Get status color
export const getStatusColor = (status, statusList) => {
  const found = statusList.find(s => s.value === status)
  return found?.color || '#6b7280'
}

// Get status label
export const getStatusLabel = (status, statusList) => {
  const found = statusList.find(s => s.value === status)
  return found?.label || status
}

// Debounce function
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Calculate age from birth date
export const calculateAge = (birthDate) => {
  if (!birthDate) return '-'
  const today = new Date()
  const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
  if (!isValid(birth)) return '-'
  
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return `${age} tahun`
}
