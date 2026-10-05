'use strict';
// Exportador OOXML (.xlsx real), sin dependencia de Excel/Office ni de un CDN.
// JSZip 3.10.1 se distribuye con su licencia en ../vendor.
const JSZip = require('../vendor/jszip.min.js');
const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '').slice(0, 32767).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function letter(n) { let s = ''; for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; }
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
function cell(ref, value, style = 0) {
  if (value && typeof value === 'object' && typeof value.formula === 'string') return `<c r="${ref}" s="${style}"><f>${xml(value.formula)}</f><v>${Number(value.result) || 0}</v></c>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  // Cualquier código/texto de usuario, incluso '=...', es texto, nunca fórmula.
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
const styles = `${declaration}<styleSheet xmlns="${ns}">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00&quot; MXN&quot;"/><numFmt numFmtId="165" formatCode="0.00;[Red]-0.00;0.00"/></numFmts>
<fonts count="4"><font><sz val="10"/><color rgb="FF302A33"/><name val="Calibri"/></font><font><b/><sz val="20"/><color rgb="FF713F5C"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF713F5C"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF713F5C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFBF0F5"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>
<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
async function workbook(sheets) {
  if (!Array.isArray(sheets) || !sheets.length) throw new Error('Se requiere al menos una hoja.');
  const zip = new JSZip(); const names = new Set(); const now = new Date().toISOString();
  let types = ''; let links = ''; let books = '';
  sheets.forEach((sheet, index) => {
    const id = index + 1;
    let name = String(sheet.name || `Hoja ${id}`).replace(/[\[\]:*?/\\]/g, ' ').slice(0, 31);
    if (names.has(name)) name = `${name.slice(0,26)} ${id}`; names.add(name);
    const columns = sheet.columns; const rows = sheet.rows || [];
    if (!columns?.length || rows.length > 100000) throw new Error('La exportación permite hasta 100,000 filas por hoja; acota el periodo.');
    const last = letter(columns.length - 1); const end = Math.max(5, rows.length + 5);
    let data = `<row r="1" ht="36" customHeight="1">${cell('A1', sheet.title || 'ColorLenses', 1)}</row>`;
    data += `<row r="2" ht="34" customHeight="1">${cell('A2', sheet.subtitle || '', 0)}</row><row r="3">${cell('A3', `Generado: ${now} · ColorLenses`, 0)}</row>`;
    data += `<row r="5" ht="32" customHeight="1">${columns.map((c,i) => cell(`${letter(i)}5`, c.title, 2)).join('')}</row>`;
    rows.forEach((row, i) => {
      const r = i + 6;
      data += `<row r="${r}" ht="24" customHeight="1">` + columns.map((c,j) => {
        const value = c.value ? c.value(row, r, columns) : row[c.key];
        const style = c.type === 'money' ? 4 : c.type === 'power' ? 5 : c.type === 'number' ? 6 : c.type === 'text' ? 9 : (i % 2 ? 3 : 0);
        return cell(`${letter(j)}${r}`, value, style);
      }).join('') + '</row>';
    });
    if (sheet.totals && rows.length) {
      const r = end + 2;
      data += `<row r="${r}" ht="28" customHeight="1">` + columns.map((c,j) => {
        let value = j === 0 ? 'TOTAL' : '';
        if (sheet.totals.includes(c.key)) {
          value = { formula: `SUM(${letter(j)}6:${letter(j)}${end})`, result: rows.reduce((sum,row) => {
            const v = c.value ? c.value(row, 0, columns) : row[c.key]; return sum + Number(typeof v === 'object' ? v.result : v || 0);
          },0) };
        }
        return cell(`${letter(j)}${r}`, value, c.type === 'money' ? 8 : 7);
      }).join('') + '</row>';
    }
    const cols = columns.map((c,j) => `<col min="${j+1}" max="${j+1}" width="${Math.min(40,Math.max(10,c.width || 18))}" customWidth="1"/>`).join('');
    zip.file(`xl/worksheets/sheet${id}.xml`, `${declaration}<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${cols}</cols><sheetData>${data}</sheetData><autoFilter ref="A5:${last}${end}"/>${columns.length>1?`<mergeCells count="3"><mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/><mergeCell ref="A3:${last}3"/></mergeCells>`:""}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`);
    types += `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    links += `<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${id}.xml"/>`;
    books += `<sheet name="${xml(name)}" sheetId="${id}" r:id="rId${id}"/>`;
  });
  zip.file('[Content_Types].xml', `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${types}</Types>`);
  zip.file('_rels/.rels', `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `${declaration}<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${books}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml', styles);
  zip.file('docProps/core.xml', `${declaration}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>ColorLenses</dc:creator><dc:title>Reporte de inventario</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
async function sendWorkbook(res, filename, sheets) {
  const buffer = await workbook(sheets);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9_.-]/g,'_')}"`);
  res.setHeader('Cache-Control', 'no-store'); res.send(buffer);
}
module.exports = { workbook, sendWorkbook, letter, xml };
