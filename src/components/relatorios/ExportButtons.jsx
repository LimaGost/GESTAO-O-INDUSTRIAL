import { useState } from 'react';
import { Download, FileText } from 'lucide-react';

/**
 * ExportButtons — exporta dados para PDF ou CSV (Excel).
 * Props:
 * filename — nome base do arquivo (sem extensão)
 * columns — [{ header: string, key: string, width?: number }]
 * rows — array de objetos com as chaves dos columns
 * title — título do relatório no PDF
 */
export default function ExportButtons({ filename = 'relatorio', columns, rows, title }) {
  const [exporting, setExporting] = useState(null);

  /* ── CSV / Excel ── */
  const exportCSV = () => {
    setExporting('csv');
    const header = columns.map(c => `"${c.header}"`).join(';');
    const body = rows.map(r =>
      columns.map(c => {
        const val = r[c.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(';')
    ).join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([bom + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  /* ── PDF via jsPDF ── */
  const exportPDF = async () => {
    setExporting('pdf');
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const usableW = pageW - margin * 2;

    // Título
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title || filename, margin, 16);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, margin, 22);
    doc.setTextColor(0);

    // Calcula larguras das colunas
    const colWidths = columns.map(c => c.width || usableW / columns.length);
    const rowH = 7;
    let y = 28;

    // Cabeçalho da tabela
    doc.setFillColor(245, 158, 11);
    doc.rect(margin, y, usableW, rowH, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255);
    let x = margin;
    columns.forEach((col, i) => {
      doc.text(col.header, x + 1.5, y + 4.8);
      x += colWidths[i];
    });
    y += rowH;

    // Linhas
    doc.setFont('helvetica', 'normal');
    rows.forEach((row, ri) => {
      if (y + rowH > doc.internal.pageSize.getHeight() - 14) {
        doc.addPage();
        y = 14;
      }
      if (ri % 2 === 0) {
        doc.setFillColor(252, 248, 243);
        doc.rect(margin, y, usableW, rowH, 'F');
      }
      doc.setTextColor(30);
      let xr = margin;
      columns.forEach((col, i) => {
        const val = String(row[col.key] ?? '');
        const truncated = val.length > 30 ? val.slice(0, 28) + '…' : val;
        doc.text(truncated, xr + 1.5, y + 4.8);
        xr += colWidths[i];
      });
      doc.setDrawColor(230, 220, 210);
      doc.line(margin, y + rowH, margin + usableW, y + rowH);
      y += rowH;
    });

    doc.save(`${filename}.pdf`);
    setExporting(null);
  };

  return (
    <div className="flex gap-2">
      <button onClick={exportCSV} disabled={!!exporting}
        className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
        <FileText size={12} className="text-green-600" />
        {exporting === 'csv' ? 'Exportando…' : 'Excel'}
      </button>
      <button onClick={exportPDF} disabled={!!exporting}
        className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
        <Download size={12} className="text-red-600" />
        {exporting === 'pdf' ? 'Exportando…' : 'PDF'}
      </button>
    </div>
  );
}