export function badge(text: string, bg: string, color: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${bg};color:${color};letter-spacing:0.3px">${text}</span>`;
}

export function detailBtn(href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:4px 12px;background:#f3f4f6;color:#4b5563;font-size:11px;font-weight:600;border-radius:6px;text-decoration:none;border:1px solid #e5e7eb;white-space:nowrap" target="_blank">Xem →</a>`;
}

export function sectionTable(headers: string[], rows: string[][]): string {
  const ths = headers
    .map((h) => `<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;white-space:nowrap;background:#f9fafb">${h}</th>`)
    .join('');
  const trs = rows
    .map((row, i) => {
      const tds = row
        .map((cell, ci) => `<td style="padding:10px 14px;font-size:13px;color:${ci === 0 ? '#111827' : '#4b5563'};border-bottom:1px solid #f3f4f6;${ci === 0 ? 'font-weight:500' : ''}">${cell}</td>`)
        .join('');
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">${tds}</tr>`;
    })
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

export function sectionCard(accent: string, iconSvg: string, title: string, count: number, countLabel: string, tableHtml: string): string {
  return `
  <div style="margin-bottom:20px;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="padding:14px 18px;background:${accent};display:table;width:100%;box-sizing:border-box">
      <div style="display:table-cell;vertical-align:middle">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;padding-right:10px">${iconSvg}</td>
          <td style="vertical-align:middle;font-size:14px;font-weight:800;color:#fff;letter-spacing:0.2px;text-transform:uppercase">${title}</td>
        </tr></table>
      </div>
      <div style="display:table-cell;vertical-align:middle;text-align:right">
        <span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,0.22);border-radius:20px;font-size:12px;font-weight:700;color:#fff">${count} ${countLabel}</span>
      </div>
    </div>
    <div style="overflow-x:auto;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">${tableHtml}</div>
  </div>`;
}

export function statCard(value: number, label: string, color: string): string {
  return `
  <td style="padding:0 6px">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;text-align:center;min-width:90px">
      <div style="font-size:26px;font-weight:800;color:${color};line-height:1">${value}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;white-space:nowrap">${label}</div>
    </div>
  </td>`;
}
