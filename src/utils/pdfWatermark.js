// Adds a faint, diagonal text watermark ("soham" by default) to every page of a
// PDF and triggers a browser download of the stamped copy.
//
// The source (`pdfData`) may be a base64 `data:` URL (decoded locally) or an
// http(s) URL (fetched). Fetching an http URL requires the host to allow
// cross-origin reads (CORS) — if it doesn't, `fetchPdfBytes` throws and callers
// should fall back to a plain, un-watermarked download.
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

async function fetchPdfBytes(pdfData) {
  if (pdfData.startsWith('data:')) {
    const b64  = pdfData.split(',')[1] || '';
    const bstr = atob(b64);
    const u8   = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return u8;
  }
  const res = await fetch(pdfData, { mode: 'cors' });
  if (!res.ok) throw new Error(`Could not fetch PDF (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

function triggerDownload(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Stamp `text` diagonally (45°), centered, faint grey, behind the content of
// every page, then download as `filename`.
export async function downloadWatermarkedPdf(pdfData, filename = 'document.pdf', text = 'soham') {
  const bytes  = await fetchPdfBytes(pdfData);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const COS45  = Math.cos(Math.PI / 4);
  const SIN45  = Math.sin(Math.PI / 4);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    // Scale the watermark to the page; clamp so tiny/huge pages stay sensible.
    const fontSize  = Math.max(24, Math.min(width, height) * 0.18);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    // drawText anchors at the baseline start and rotates around it, so offset
    // the start back along the 45° direction to center the text on the page.
    page.drawText(text, {
      x: width / 2 - (textWidth / 2) * COS45,
      y: height / 2 - (textWidth / 2) * SIN45,
      size: fontSize,
      font,
      color: rgb(0.6, 0.6, 0.6),
      rotate: degrees(45),
      opacity: 0.18,
    });
  }

  triggerDownload(await pdfDoc.save(), filename);
}
