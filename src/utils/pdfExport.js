import { jsPDF } from 'jspdf';

export function downloadLevelContentAsPDF(pages, levelTitle) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;

  // Cover page
  doc.setFillColor(99, 102, 241); // indigo
  doc.rect(0, 0, pageW, 60, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(levelTitle, margin, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(199, 210, 254);
  doc.text('RoboQuiz · Study Material', margin, 42);
  doc.setFontSize(9);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, 52);

  // Table of contents
  let y = 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('Contents', margin, y);
  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  pages.forEach((page, i) => {
    if (page.type === 'pdf') return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`${i + 1}.  ${page.title}`, margin + 2, y);
    y += 6;
  });

  // Pages content
  pages.forEach((page, pi) => {
    if (page.type === 'pdf') return;

    doc.addPage();
    y = margin;

    // Page title banner
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(margin - 4, y - 6, maxW + 8, 22, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(67, 56, 202);
    doc.text(page.title, margin, y + 8);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`${levelTitle} · Topic ${pi + 1} of ${pages.filter(p => p.type !== 'pdf').length}`, margin, y);
    y += 10;

    (page.sections || []).forEach((sec, si) => {
      if (y > 258) { doc.addPage(); y = margin; }

      // Section heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`${si + 1}.  ${sec.heading}`, margin, y);
      y += 3;
      doc.setDrawColor(199, 210, 254);
      doc.line(margin, y, margin + maxW * 0.4, y);
      y += 7;

      // Body text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const plainBody = (sec.body || '').replace(/\*\*([^*]+)\*\*/g, '$1');
      const lines = doc.splitTextToSize(plainBody, maxW);
      lines.forEach(line => {
        if (y > 272) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 5.5;
      });
      y += 8;
    });
  });

  // Footer on all pages
  const count = doc.internal.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('RoboQuiz · Study Material', margin, 289);
    doc.text(`${i} / ${count}`, pageW - margin, 289, { align: 'right' });
  }

  const fileName = `${levelTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_content.pdf`;
  doc.save(fileName);
}
