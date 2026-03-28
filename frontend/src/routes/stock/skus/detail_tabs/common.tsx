export const thStyle = { textAlign: 'left' as const, padding: '8px 12px', fontWeight: 500, color: '#718096', fontSize: '0.875rem' }
export const tdStyle = { padding: '8px 12px', fontSize: '0.875rem', borderTop: '1px solid #e2e8f0' }
export const tdRight = { ...tdStyle, textAlign: 'right' as const }

export function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0', fontSize: '0.875rem' }}>
        No data.
      </td>
    </tr>
  )
}
