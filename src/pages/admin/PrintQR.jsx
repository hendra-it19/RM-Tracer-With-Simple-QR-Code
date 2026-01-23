import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { generateQRValue } from '../../utils/helpers'
import { ArrowLeft, Download, FileText, Printer } from 'lucide-react'
import { supabase } from '../../config/supabase'

const PrintQR = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const patients = location.state?.patients || []
    const printAreaRef = useRef(null)

    // Download all QR codes as a single image
    const handleDownloadImage = async () => {
        if (patients.length === 0) return

        // Create a canvas to combine all QR codes
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // Calculate dimensions - 5 columns
        const cols = 5
        const qrSize = 100
        const padding = 20
        const labelHeight = 40
        const cellWidth = qrSize + padding * 2
        const cellHeight = qrSize + labelHeight + padding * 2
        const rows = Math.ceil(patients.length / cols)

        canvas.width = cols * cellWidth
        canvas.height = rows * cellHeight

        // White background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw each QR code
        for (let i = 0; i < patients.length; i++) {
            const patient = patients[i]
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = col * cellWidth + padding
            const y = row * cellHeight + padding

            // Create temporary canvas for QR code
            const tempCanvas = document.createElement('canvas')
            const qrCode = document.createElement('div')
            document.body.appendChild(qrCode)

            // Render QR to temp canvas using QRCodeCanvas
            const qrCanvas = document.getElementById(`qr-canvas-${patient.id}`)
            if (qrCanvas) {
                ctx.drawImage(qrCanvas, x, y, qrSize, qrSize)
            }

            // Draw border
            ctx.strokeStyle = '#e2e8f0'
            ctx.setLineDash([5, 5])
            ctx.strokeRect(x - 10, y - 10, cellWidth - padding, cellHeight - padding)
            ctx.setLineDash([])

            // Draw text
            ctx.fillStyle = '#1e293b'
            ctx.font = 'bold 12px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(patient.no_rm, x + qrSize / 2, y + qrSize + 18)

            ctx.fillStyle = '#64748b'
            ctx.font = '10px Inter, sans-serif'
            const truncatedName = patient.nama.length > 15 ? patient.nama.substring(0, 15) + '...' : patient.nama
            ctx.fillText(truncatedName, x + qrSize / 2, y + qrSize + 32)
        }

        // Log activity
        try {
            await supabase.rpc('log_activity', {
                p_aksi: 'DOWNLOAD_QR',
                p_details: { count: patients.length }
            })
        } catch (error) {
            console.error('Error logging download:', error)
        }

        // Download
        const link = document.createElement('a')
        link.download = `qr-codes-${new Date().toISOString().split('T')[0]}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
    }

    // Simple download using html2canvas-like approach
    const downloadAsImage = () => {
        // Create a simpler version - generate a downloadable grid
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        const cols = 5
        const qrSize = 120
        const padding = 15
        const labelHeight = 35
        const cellWidth = qrSize + padding * 2
        const cellHeight = qrSize + labelHeight + padding * 2
        const rows = Math.ceil(patients.length / cols)

        canvas.width = cols * cellWidth
        canvas.height = rows * cellHeight

        // White background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Process each QR code
        const promises = patients.map((patient, i) => {
            return new Promise((resolve) => {
                const col = i % cols
                const row = Math.floor(i / cols)
                const x = col * cellWidth + padding
                const y = row * cellHeight + padding

                // Get the canvas element for this QR code
                const qrCanvas = document.getElementById(`qr-canvas-${patient.id}`)
                if (qrCanvas) {
                    ctx.drawImage(qrCanvas, x + 10, y, qrSize, qrSize)
                }

                // Draw dashed border
                ctx.strokeStyle = '#cbd5e1'
                ctx.setLineDash([4, 4])
                ctx.lineWidth = 1
                ctx.strokeRect(x, y - 5, cellWidth - padding, cellHeight - padding + 5)
                ctx.setLineDash([])

                // Draw text labels
                ctx.fillStyle = '#1e293b'
                ctx.font = 'bold 11px Arial, sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(patient.no_rm, x + cellWidth / 2 - padding / 2, y + qrSize + 15)

                ctx.fillStyle = '#64748b'
                ctx.font = '9px Arial, sans-serif'
                const name = patient.nama.length > 18 ? patient.nama.substring(0, 18) + '...' : patient.nama
                ctx.fillText(name, x + cellWidth / 2 - padding / 2, y + qrSize + 28)

                resolve()
            })
        })

        Promise.all(promises).then(() => {
            // Small delay to ensure canvas is ready
            setTimeout(() => {
                const link = document.createElement('a')
                link.download = `label-qr-${new Date().toISOString().split('T')[0]}.png`
                link.href = canvas.toDataURL('image/png', 1.0)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }, 100)
        })
    }

    // Open print preview (using browser print dialog)
    const handlePrintPreview = () => {
        window.print()
    }

    if (patients.length === 0) {
        return (
            <>
                <div className="page-header no-print">
                    <h1 className="page-title">Print QR Code</h1>
                </div>
                <div className="page-content">
                    <div className="card">
                        <div className="card-body">
                            <div className="empty-state">
                                <p>Tidak ada pasien yang dipilih</p>
                                <button
                                    className="btn btn-primary mt-md"
                                    onClick={() => navigate('/admin/patients')}
                                >
                                    <ArrowLeft size={18} />
                                    Kembali ke Daftar Pasien
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="page-header no-print">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Print QR Code</h1>
                        <p className="page-subtitle">{patients.length} label QR dipilih</p>
                    </div>
                    <div className="flex gap-sm">
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/admin/patients')}
                        >
                            <ArrowLeft size={18} />
                            Kembali
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={downloadAsImage}
                        >
                            <Download size={18} />
                            Download Gambar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handlePrintPreview}
                        >
                            <Printer size={18} />
                            Preview Print
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-content">
                <div className="card no-print mb-md">
                    <div className="card-body">
                        <div className="flex items-center gap-md">
                            <FileText size={24} style={{ color: 'var(--primary-500)' }} />
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Label QR Code untuk Berkas</h3>
                                <p className="text-sm text-secondary">Ukuran kecil untuk ditempel pada berkas rekam medis</p>
                            </div>
                        </div>
                        <div className="mt-md" style={{ padding: '12px', background: 'var(--gray-100)', borderRadius: 'var(--radius-md)' }}>
                            <p className="text-sm"><strong>Download Gambar:</strong> Simpan sebagai file PNG untuk dicetak nanti</p>
                            <p className="text-sm mt-xs"><strong>Preview Print:</strong> Buka dialog print browser untuk langsung cetak</p>
                        </div>
                    </div>
                </div>

                {/* Print Area - Small labels for sticking on medical records */}
                <div className="print-area" ref={printAreaRef}>
                    <style>
                        {`
              @media print {
                @page {
                  size: A4;
                  margin: 8mm;
                }
                
                body {
                  print-color-adjust: exact;
                  -webkit-print-color-adjust: exact;
                }
                
                .print-area {
                  display: block !important;
                }
                
                .print-qr-grid {
                  display: grid !important;
                  grid-template-columns: repeat(5, 1fr) !important;
                  gap: 4mm !important;
                  padding: 0 !important;
                }
                
                .print-qr-item {
                  page-break-inside: avoid;
                  border: 1px dashed #999 !important;
                  padding: 2mm !important;
                }
                
                .no-print {
                  display: none !important;
                }

                .page-header, .card.no-print {
                  display: none !important;
                }
              }
            `}
                    </style>

                    <div
                        className="print-qr-grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '10px',
                            padding: '16px',
                            background: 'white',
                            borderRadius: 'var(--radius-lg)'
                        }}
                    >
                        {patients.map(patient => (
                            <div
                                key={patient.id}
                                className="print-qr-item"
                                style={{
                                    textAlign: 'center',
                                    padding: '10px',
                                    border: '1px dashed #e2e8f0',
                                    borderRadius: '4px',
                                    background: 'white'
                                }}
                            >
                                {/* Hidden canvas for download - Must be rendered (not display:none) for drawImage to work */}
                                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                                    <QRCodeCanvas
                                        id={`qr-canvas-${patient.id}`}
                                        value={generateQRValue(patient.no_rm)}
                                        size={100}
                                        level="H"
                                    />
                                </div>

                                {/* Visible SVG for display */}
                                <QRCodeSVG
                                    value={generateQRValue(patient.no_rm)}
                                    size={80}
                                    level="H"
                                    style={{ margin: '0 auto' }}
                                />
                                <div
                                    style={{
                                        marginTop: '6px',
                                        fontWeight: 600,
                                        fontSize: '10px',
                                        lineHeight: 1.2,
                                        color: '#1e293b'
                                    }}
                                >
                                    {patient.no_rm}
                                </div>
                                <div
                                    style={{
                                        fontSize: '8px',
                                        color: '#64748b',
                                        marginTop: '2px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '100%'
                                    }}
                                >
                                    {patient.nama}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}

export default PrintQR
