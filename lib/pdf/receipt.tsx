import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { PdfBranding } from './branding'

export type ReceiptData = {
  receiptNumber: string
  institutionName: string
  studentName: string
  documentNumber: string | null
  paymentDate: string
  amount: number
  currency: string
  method: string
  reference: string | null
  allocations: Array<{ conceptName: string; amount: number }>
  issuedAt: string
  branding?: PdfBranding
}

const DEFAULT_PRIMARY = '#1a1a1a'
const DEFAULT_ACCENT = '#555555'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: '#1a1a1a',
  },
  brandStrip: {
    height: 6,
    marginBottom: 16,
    borderRadius: 2,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  headerText: {
    flexDirection: 'column',
  },
  institutionName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 11,
    color: '#555',
  },
  receiptNumber: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  receiptLabel: {
    fontSize: 9,
    color: '#888',
    textAlign: 'right',
    marginBottom: 4,
  },
  infoSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontFamily: 'Helvetica-Bold',
    width: 120,
    color: '#555',
  },
  infoValue: {
    flex: 1,
  },
  table: {
    marginBottom: 12,
    border: '1px solid #ddd',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    color: '#fff',
    padding: '6 10',
    borderRadius: '4 4 0 0',
  },
  tableHeaderText: {
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '6 10',
    borderBottom: '0.5px solid #eee',
  },
  tableRowLast: {
    flexDirection: 'row',
    padding: '6 10',
  },
  colConcept: {
    flex: 3,
  },
  colAmount: {
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    padding: '8 10',
    backgroundColor: '#f5f5f5',
    borderRadius: '0 0 4 4',
  },
  totalLabel: {
    flex: 3,
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  totalAmount: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#888',
  },
  footerSupport: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
})

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  check: 'Cheque',
}

export function ReceiptPDF({ data }: { data: ReceiptData }) {
  const methodLabel = METHOD_LABELS[data.method] ?? data.method
  const primary = data.branding?.primaryHex ?? DEFAULT_PRIMARY
  const accent = data.branding?.accentHex ?? DEFAULT_ACCENT
  const logoBytes = data.branding?.logoBytes ?? null
  const supportEmail = data.branding?.supportEmail ?? null
  const supportUrl = data.branding?.supportUrl ?? null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Branded color strip across the top */}
        <View style={[styles.brandStrip, { backgroundColor: primary }]} />

        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottom: `2px solid ${primary}` },
          ]}
        >
          <View style={styles.headerLeft}>
            {logoBytes && (
              // Pass bytes directly — @react-pdf/renderer accepts Uint8Array / Buffer.
              <Image style={styles.logo} src={logoBytes as unknown as string} />
            )}
            <View style={styles.headerText}>
              <Text style={styles.institutionName}>{data.institutionName}</Text>
              <Text style={[styles.reportTitle, { color: accent }]}>
                Recibo de Pago
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.receiptLabel}>No. RECIBO</Text>
            <Text style={[styles.receiptNumber, { color: primary }]}>
              {data.receiptNumber}
            </Text>
          </View>
        </View>

        {/* Student and Payment Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estudiante:</Text>
            <Text style={styles.infoValue}>{data.studentName}</Text>
          </View>
          {data.documentNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Documento:</Text>
              <Text style={styles.infoValue}>{data.documentNumber}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha de pago:</Text>
            <Text style={styles.infoValue}>{data.paymentDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Metodo de pago:</Text>
            <Text style={styles.infoValue}>{methodLabel}</Text>
          </View>
          {data.reference && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Referencia:</Text>
              <Text style={styles.infoValue}>{data.reference}</Text>
            </View>
          )}
        </View>

        {/* Allocations Table */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: primary }]}>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>Concepto</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Monto</Text>
          </View>
          {data.allocations.map((alloc, idx) => {
            const isLast = idx === data.allocations.length - 1
            return (
              <View key={idx} style={isLast ? styles.tableRowLast : styles.tableRow}>
                <Text style={styles.colConcept}>{alloc.conceptName}</Text>
                <Text style={styles.colAmount}>
                  {data.currency} {alloc.amount.toFixed(2)}
                </Text>
              </View>
            )
          })}
          {data.allocations.length === 0 && (
            <View style={styles.tableRowLast}>
              <Text style={styles.colConcept}>Pago general</Text>
              <Text style={styles.colAmount}>
                {data.currency} {data.amount.toFixed(2)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.totalRow,
              { borderTop: `1.5px solid ${primary}` },
            ]}
          >
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalAmount, { color: primary }]}>
              {data.currency} {data.amount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View
          style={[styles.footer, { borderTop: `0.5px solid ${accent}` }]}
          fixed
        >
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{data.institutionName}</Text>
            <Text style={styles.footerText}>Emitido: {data.issuedAt}</Text>
          </View>
          {(supportEmail || supportUrl) && (
            <Text style={styles.footerSupport}>
              {supportEmail ? `Soporte: ${supportEmail}` : ''}
              {supportEmail && supportUrl ? '  ·  ' : ''}
              {supportUrl ?? ''}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  )
}
