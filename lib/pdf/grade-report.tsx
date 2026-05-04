import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export type GradeReportData = {
  studentName: string
  documentNumber: string | null
  institutionName: string
  programName: string
  periodName: string
  courses: Array<{
    subjectName: string
    subjectCode: string
    evaluations: Array<{ name: string; weight: number; value: number }>
    finalGrade: number
    finalLetter: string | null
    passed: boolean
  }>
  generatedAt: string
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 24,
    borderBottom: '2px solid #1a1a1a',
    paddingBottom: 12,
  },
  institutionName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#444',
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
    width: 110,
    color: '#555',
  },
  infoValue: {
    flex: 1,
  },
  courseBlock: {
    marginBottom: 16,
    border: '1px solid #ddd',
    borderRadius: 4,
  },
  courseHeader: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '6 10',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '4 4 0 0',
  },
  courseTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#fff',
  },
  courseCode: {
    fontSize: 9,
    color: '#ccc',
  },
  courseFinalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  finalGradeText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },
  passedText: {
    fontSize: 9,
    color: '#86efac',
  },
  failedText: {
    fontSize: 9,
    color: '#fca5a5',
  },
  evalTable: {
    padding: '6 10',
  },
  evalRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottom: '0.5px solid #eee',
  },
  evalName: {
    flex: 3,
    color: '#333',
  },
  evalWeight: {
    flex: 1,
    textAlign: 'right',
    color: '#666',
  },
  evalValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  evalHeader: {
    flexDirection: 'row',
    paddingVertical: 3,
    marginBottom: 2,
    borderBottom: '1px solid #ccc',
  },
  evalHeaderText: {
    fontFamily: 'Helvetica-Bold',
    color: '#555',
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '0.5px solid #ccc',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#888',
  },
})

export function GradeReportPDF({ data }: { data: GradeReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.institutionName}>{data.institutionName}</Text>
          <Text style={styles.reportTitle}>Boletin de Calificaciones</Text>
        </View>

        {/* Student Info */}
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
            <Text style={styles.infoLabel}>Programa:</Text>
            <Text style={styles.infoValue}>{data.programName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Periodo:</Text>
            <Text style={styles.infoValue}>{data.periodName}</Text>
          </View>
        </View>

        {/* Courses */}
        {data.courses.map((course, idx) => (
          <View key={idx} style={styles.courseBlock} wrap={false}>
            <View style={styles.courseHeader}>
              <View>
                <Text style={styles.courseTitle}>{course.subjectName}</Text>
                <Text style={styles.courseCode}>{course.subjectCode}</Text>
              </View>
              <View style={styles.courseFinalBadge}>
                <Text style={styles.finalGradeText}>
                  {course.finalGrade.toFixed(2)}
                  {course.finalLetter ? ` (${course.finalLetter})` : ''}
                </Text>
                <Text style={course.passed ? styles.passedText : styles.failedText}>
                  {course.passed ? 'APROBADO' : 'REPROBADO'}
                </Text>
              </View>
            </View>

            <View style={styles.evalTable}>
              {course.evaluations.length > 0 && (
                <>
                  <View style={styles.evalHeader}>
                    <Text style={[styles.evalHeaderText, { flex: 3 }]}>Evaluacion</Text>
                    <Text style={[styles.evalHeaderText, { flex: 1, textAlign: 'right' }]}>Peso %</Text>
                    <Text style={[styles.evalHeaderText, { flex: 1, textAlign: 'right' }]}>Nota</Text>
                  </View>
                  {course.evaluations.map((ev, evIdx) => (
                    <View key={evIdx} style={styles.evalRow}>
                      <Text style={styles.evalName}>{ev.name}</Text>
                      <Text style={styles.evalWeight}>{(ev.weight * 100).toFixed(0)}%</Text>
                      <Text style={styles.evalValue}>{ev.value.toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.institutionName}</Text>
          <Text style={styles.footerText}>Generado: {data.generatedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}
