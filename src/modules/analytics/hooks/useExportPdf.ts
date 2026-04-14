'use client';

import { useState, useCallback } from 'react';
import dayjs from 'dayjs';

interface ExportRange {
  dateFrom: string;
  dateTo: string;
}

function getPeriodFilename(range: ExportRange, preset: string): string {
  if (preset === 'month' && range.dateFrom) {
    const d = dayjs(range.dateFrom);
    return `Thang-${d.month() + 1}-${d.year()}`;
  }
  if (preset === 'quarter' && range.dateFrom) {
    const q = Math.floor(dayjs(range.dateFrom).month() / 3) + 1;
    return `Quy-${q}-${dayjs(range.dateFrom).year()}`;
  }
  if (preset === 'year' && range.dateFrom) {
    return `Nam-${dayjs(range.dateFrom).year()}`;
  }
  if (range.dateFrom && range.dateTo) {
    return `${dayjs(range.dateFrom).format('DDMMYYYY')}-${dayjs(range.dateTo).format('DDMMYYYY')}`;
  }
  return 'toan-bo';
}

export function useExportPdf() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = useCallback(
    async (elementId: string, range: ExportRange, preset: string) => {
      if (isExporting) return;
      const el = document.getElementById(elementId);
      if (!el) return;

      setIsExporting(true);
      try {
        const [{ toPng }, { jsPDF }] = await Promise.all([
          import('html-to-image'),
          import('jspdf'),
        ]);

        const dataUrl = await toPng(el, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW  = pdf.internal.pageSize.getWidth();
        const pageH  = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const usableW = pageW - margin * 2;
        const usableH = pageH - margin * 2;

        const imgProps = pdf.getImageProperties(dataUrl);
        const imgH = (imgProps.height / imgProps.width) * usableW;

        pdf.addImage(dataUrl, 'PNG', margin, margin, usableW, imgH);

        let left = imgH - usableH;
        let page = 1;
        while (left > 0) {
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', margin, margin - usableH * page, usableW, imgH);
          left -= usableH;
          page++;
        }

        pdf.save(`analytics-${getPeriodFilename(range, preset)}.pdf`);
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting],
  );

  return { exportPdf, isExporting };
}
