import { jsPDF } from 'jspdf';

export function downloadLevelContentAsPDF(pages, levelTitle) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 20;
  const W = doc.internal.pageSize.getWidth() - M * 2;
  let y = M;

  const addPage = () => { doc.addPage(); y = M; };
  const check   = (h = 10) => { if (y + h > 272) addPage(); };

  // Title
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(30, 41, 59);
  doc.text(levelTitle, M, y);  y += 8;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(148, 163, 184);
  doc.text(`RoboQuiz · Study Material · ${new Date().toLocaleDateString()}`, M, y);  y += 10;
  doc.setDrawColor(226, 232, 240).line(M, y, M + W, y);  y += 10;

  pages.filter(p => p.type !== 'pdf').forEach((page, pi) => {
    if (pi > 0) addPage();

    // Topic heading
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(67, 56, 202);
    doc.text(`${pi + 1}. ${page.title}`, M, y);  y += 10;

    (page.sections || []).forEach((sec, si) => {
      check(14);
      doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(30, 41, 59);
      doc.text(`${si + 1}. ${sec.heading}`, M, y);  y += 7;

      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(71, 85, 105);
      const plain = (sec.body || '').replace(/\*\*([^*]+)\*\*/g, '$1');
      doc.splitTextToSize(plain, W).forEach(line => { check(); doc.text(line, M, y); y += 5.5; });
      y += 5;
    });
  });

  // Footer
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i).setFont('helvetica', 'normal').setFontSize(8).setTextColor(148, 163, 184);
    doc.text(`RoboQuiz · ${levelTitle}`, M, 289);
    doc.text(`${i} / ${total}`, M + W, 289, { align: 'right' });
  }

  doc.save(`${levelTitle.replace(/\s+/g, '_').toLowerCase()}_content.pdf`);
}
