/**
 * Tiny hand-rolled PDF generator for booking invoices.
 *
 * Avoids pulling pdf-lib for what is, in the end, a one-page text
 * document. Generates a valid PDF 1.4 file with one A4 page using the
 * built-in Helvetica + Helvetica-Bold fonts. Output is a Buffer ready to
 * stream to the response.
 *
 * The structure is intentionally minimal — five PDF objects (catalog,
 * pages, page, contents, font) plus the xref. Anything beyond a single
 * page of text would warrant pdf-lib; for a receipt this is overkill-
 * proof and dependency-free.
 */

interface InvoiceLine {
  /** Left-aligned column (e.g. "Walking — 60 min"). */
  label: string;
  /** Right-aligned column (e.g. "$45.00"). */
  amount: string;
}

export interface InvoiceInput {
  /** Used as the file's title metadata + the H1 on the page. */
  invoiceNumber: string;
  issuedAt: string;
  ownerName: string;
  ownerEmail: string;
  providerName: string;
  providerEmail: string | null;
  /** Free-form line item rows. */
  lines: InvoiceLine[];
  /** "Total" row at the bottom, rendered bold. */
  totalLabel: string;
  totalAmount: string;
  /** Optional refund row. Rendered when present. */
  refundLabel?: string;
  refundAmount?: string;
  /** Final note (e.g. "Thank you for using petwalker."). */
  footerNote: string;
}

/**
 * Encode `s` using PDF's literal-string syntax: `(...)` with escapes for
 * the few special characters. Multibyte codepoints fall back to '?' —
 * non-ASCII labels are rare in invoices and out of scope for this
 * minimal generator. Use pdf-lib if i18n labels become a requirement.
 */
function escapePdfText(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 127) {
      out += '?';
      continue;
    }
    if (ch === '\\') out += '\\\\';
    else if (ch === '(') out += '\\(';
    else if (ch === ')') out += '\\)';
    else out += ch;
  }
  return out;
}

interface PdfTextOp {
  x: number;
  y: number;
  size: number;
  bold: boolean;
  text: string;
}

function buildContentStream(ops: PdfTextOp[]): string {
  // Group by font/size to minimize Tf operators. Trivial here — we just
  // emit one BT…ET block with explicit font on every Td so the output
  // stays self-contained even if a future op reorders things.
  let out = '';
  for (const op of ops) {
    out += 'BT\n';
    out += `${op.bold ? '/F2' : '/F1'} ${op.size} Tf\n`;
    out += `${op.x} ${op.y} Td\n`;
    out += `(${escapePdfText(op.text)}) Tj\n`;
    out += 'ET\n';
  }
  return out;
}

export function buildInvoicePdf(input: InvoiceInput): Buffer {
  const A4 = { width: 595, height: 842 } as const;
  const margin = 56;
  const lineH = 16;
  const ops: PdfTextOp[] = [];

  let y = A4.height - margin;
  // Title
  ops.push({ x: margin, y, size: 22, bold: true, text: 'Invoice' });
  y -= 12;
  ops.push({
    x: margin,
    y: y - 6,
    size: 11,
    bold: false,
    text: `#${input.invoiceNumber}`,
  });
  y -= 8;
  ops.push({
    x: margin,
    y: y - 12,
    size: 11,
    bold: false,
    text: `Issued ${input.issuedAt}`,
  });
  y -= 36;

  // Parties: two columns, owner left / provider right.
  ops.push({ x: margin, y, size: 10, bold: true, text: 'Bill to' });
  ops.push({ x: 320, y, size: 10, bold: true, text: 'Provider' });
  y -= lineH;
  ops.push({ x: margin, y, size: 11, bold: false, text: input.ownerName });
  ops.push({ x: 320, y, size: 11, bold: false, text: input.providerName });
  y -= lineH;
  ops.push({ x: margin, y, size: 10, bold: false, text: input.ownerEmail });
  if (input.providerEmail) {
    ops.push({ x: 320, y, size: 10, bold: false, text: input.providerEmail });
  }
  y -= lineH * 2;

  // Line items header row
  ops.push({ x: margin, y, size: 10, bold: true, text: 'Description' });
  ops.push({ x: 460, y, size: 10, bold: true, text: 'Amount' });
  y -= 4;
  // Rule (drawn as a long "_" string rather than the path operator —
  // good enough for visual separation without leaving the text object).
  ops.push({
    x: margin,
    y,
    size: 10,
    bold: false,
    text: '__________________________________________________________________',
  });
  y -= lineH;

  for (const line of input.lines) {
    ops.push({ x: margin, y, size: 11, bold: false, text: line.label });
    ops.push({ x: 460, y, size: 11, bold: false, text: line.amount });
    y -= lineH;
  }

  if (input.refundLabel && input.refundAmount) {
    y -= 4;
    ops.push({
      x: margin,
      y,
      size: 11,
      bold: false,
      text: input.refundLabel,
    });
    ops.push({ x: 460, y, size: 11, bold: false, text: input.refundAmount });
    y -= lineH;
  }

  y -= 8;
  ops.push({
    x: margin,
    y,
    size: 10,
    bold: false,
    text: '__________________________________________________________________',
  });
  y -= lineH;
  ops.push({ x: margin, y, size: 12, bold: true, text: input.totalLabel });
  ops.push({ x: 460, y, size: 12, bold: true, text: input.totalAmount });

  // Footer
  ops.push({
    x: margin,
    y: margin + 8,
    size: 9,
    bold: false,
    text: input.footerNote,
  });

  const content = buildContentStream(ops);

  // ── PDF object assembly. Manual offsets for the xref table. ────────
  const objects: string[] = [];
  function addObj(body: string): number {
    const idx = objects.length + 1;
    objects.push(`${idx} 0 obj\n${body}\nendobj\n`);
    return idx;
  }

  const catalogId = 1;
  const pagesId = 2;
  const pageId = 3;
  const contentsId = 4;
  const fontRegId = 5;
  const fontBoldId = 6;
  // Pre-bump indices by adding placeholders in order; addObj keeps them aligned.
  addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  addObj(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  addObj(
    `<< /Type /Page /Parent ${pagesId} 0 R ` +
      `/MediaBox [0 0 ${A4.width} ${A4.height}] ` +
      `/Resources << /Font << /F1 ${fontRegId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
      `/Contents ${contentsId} 0 R >>`,
  );
  addObj(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  const header = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  let body = header;
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'binary'));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body, 'binary');
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'binary');
}
