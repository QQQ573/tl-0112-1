import jsPDF from 'jspdf';
import type { ProcessResult, TemplateOrientation } from '../types';

export async function generatePdf(
  results: ProcessResult[],
  orientation: TemplateOrientation,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const successResults = results.filter((r) => r.success && r.dataUrl);

  const isLandscape = orientation === 'landscape';
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < successResults.length; i++) {
    const result = successResults[i];

    if (i > 0) {
      pdf.addPage();
    }

    if (result.dataUrl) {
      const imgData = result.dataUrl;
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    }

    if (onProgress) {
      onProgress(i + 1, successResults.length);
    }
  }

  return pdf.output('blob');
}

export function downloadPdf(blob: Blob, filename: string = '暑期成长评语单.pdf') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
