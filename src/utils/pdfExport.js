import { jsPDF } from 'jspdf';

const MARGIN = 15; // mm
const PAGE_W = 297; // A4 landscape width
const PAGE_H = 210; // A4 landscape height

/**
 * Export the current canvas + project metadata to a PDF file.
 *
 * @param {object} options
 * @param {import('konva/lib/Stage').Stage} options.stage  - Konva Stage instance
 * @param {string}  options.filename   - suggested filename (without extension)
 * @param {number}  options.area       - terrain area in m²
 * @param {number}  options.perimeter  - terrain perimeter in m
 * @param {Array}   options.elements   - placed elements array
 * @param {Array}   options.paths      - placed paths array
 */
export const exportToPdf = async ({ stage, filename = 'proyecto', area, perimeter, elements = [], paths = [] }) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Header ────────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Distribución de Terreno', MARGIN, MARGIN + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  pdf.text(`Archivo: ${filename}   ·   Fecha: ${dateStr}`, MARGIN, MARGIN + 11);

  // ── Summary ────────────────────────────────────────────────────────────────
  const summaryY = MARGIN + 18;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Resumen', MARGIN, summaryY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const stats = [
    `Área del terreno: ${area.toFixed(1)} m²`,
    `Perímetro: ${perimeter.toFixed(1)} m`,
    `Elementos colocados: ${elements.length}`,
    `Caminos: ${paths.length}`,
  ];
  stats.forEach((line, i) => pdf.text(line, MARGIN, summaryY + 6 + i * 5));

  // ── Canvas image ──────────────────────────────────────────────────────────
  // Konva's toDataURL uses JPEG which fills transparency with black.
  // Composite onto a white canvas first to get a proper white background.
  const rawDataUrl = stage.toDataURL({ pixelRatio: 2 });
  const offscreen = document.createElement('canvas');
  offscreen.width = stage.width() * 2;
  offscreen.height = stage.height() * 2;
  const ctx = offscreen.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);
  const img = new Image();
  await new Promise((resolve) => { img.onload = resolve; img.src = rawDataUrl; });
  ctx.drawImage(img, 0, 0);
  const imgData = offscreen.toDataURL('image/jpeg', 0.92);

  // Available area for the canvas image (below header, right of summary)
  const summaryBlockW = 60; // mm reserved for left summary column
  const headerH = summaryY + 6 + stats.length * 5 + 4;
  const imgX = MARGIN + summaryBlockW;
  const imgY = MARGIN + 16;
  const imgMaxW = PAGE_W - imgX - MARGIN;
  const imgMaxH = PAGE_H - imgY - MARGIN;

  // Maintain aspect ratio
  const stageW = stage.width();
  const stageH = stage.height();
  const aspect = stageW / stageH;
  let imgW = imgMaxW;
  let imgH = imgW / aspect;
  if (imgH > imgMaxH) {
    imgH = imgMaxH;
    imgW = imgH * aspect;
  }

  pdf.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgH);

  // Light border around the image
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.rect(imgX, imgY, imgW, imgH);

  // ── Element list ──────────────────────────────────────────────────────────
  if (elements.length > 0) {
    const listX = MARGIN;
    let listY = summaryY + 6 + stats.length * 5 + 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Elementos', listX, listY);
    listY += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    elements.forEach((el) => {
      if (listY > PAGE_H - MARGIN - 4) return; // overflow guard
      const sizeInfo = el.shape === 'circle'
        ? `⌀ ${(el.radius * 2).toFixed(1)} m`
        : `${el.width?.toFixed(1)} × ${el.height?.toFixed(1)} m`;
      pdf.text(`• ${el.label}  (${sizeInfo})`, listX, listY);
      listY += 4.5;
    });
  }

  pdf.save(`${filename}.pdf`);
};
