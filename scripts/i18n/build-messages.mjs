/**
 * Sinh messages/vi.json + messages/en.json cho next-intl từ từ điển preview đã duyệt
 * (docs/previews/ds-v2/copy.js) + khoá bổ sung (scripts/i18n/extra-messages.mjs).
 *
 *   node scripts/i18n/build-messages.mjs           → ghi messages/*.json
 *   node scripts/i18n/build-messages.mjs --check   → chỉ kiểm tra (npm run i18n:check), lỗi → exit 1
 *
 * Quy tắc:
 * - Chỉ lấy các nhóm khoá trong INCLUDE (khung + dùng chung). Khoá của từng màn thêm vào INCLUDE khi port màn đó.
 * - Khoá phẳng "a.b.c" → object lồng nhau { a: { b: { c } } }.
 * - XUNG ĐỘT: khi vừa có "a" vừa có "a.x" (vd `app.phaseB` và `app.phaseB.d`), giá trị của "a" chuyển sang "a._"
 *   → trong code gọi t('app.phaseB._'). Danh sách quy đổi in ra mỗi lần chạy (và nằm trong RENAMES bên dưới).
 * - Khoá trùng giữa copy.js và extra-messages.mjs → lỗi (tránh ghi đè ngầm).
 * - Kiểm tra: vi/en cùng tập khoá, cú pháp ICU hợp lệ, vi/en cùng tập placeholder.
 * - Đầu ra sắp xếp khoá → chạy lại cho đúng cùng kết quả (idempotent).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from '@formatjs/icu-messageformat-parser';
import { EXTRA } from './extra-messages.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
export const DEFAULT_COPY = path.join(ROOT, 'docs/previews/ds-v2/copy.js');
export const OUT_DIR = path.join(ROOT, 'messages');

/** Nhóm được đưa vào lần này (A1.3). */
export const INCLUDE = {
  /** Cả nhóm theo đoạn đầu khoá */
  groups: [
    'app', 'top', 'nav', 'st', 'pr', 'due', 'act', 'qa', 'role', 'filter', 'view', 'page', 'empty', 'notif', 'ago',
    'er', // trang/toast lỗi chung
    'idle', 'lang', 'card', 'lane', 'flow', 'n',
    'td', // A2-1 chi tiết công việc (trang + ngăn xem nhanh)
    'tl', // A2-3 danh sách công việc (bảng lọc, chip, phân trang, tab)
    'dnd', // A2-4a bảng Kanban (kéo thả, mẹo, thông báo cho trình đọc màn hình)
    'tf', // A2-4b biểu mẫu Tạo / Sửa công việc (ngăn trượt + trang đầy đủ)
    'dr', // A2-4b nháp lưu trên trình duyệt (Phase B)
    'nt', // A3-2 trang Thông báo
    'pf', // A3-2 Hồ sơ của tôi
    'db', // A3-1 Tổng quan
    'hd', // A3-3 Helpdesk (danh sách, ngăn chi tiết, hộp thoại, Nhập dữ liệu)
    'pp', // A3-4 Nhân sự + Phân quyền (nhãn vai trò dùng ppx.role.* = ROLE_LABELS V1)
    'lg', // A3-6 Nhật ký (công việc / người dùng / tra cứu mã + ngăn chi tiết)
  ],
  /** Khoá lẻ component A1-2 cần (theo tiền tố đầy đủ) */
  prefixes: [
    'td.as.', // trạng thái người làm (StatusDot kind="assignee")
    'dnd.reported', // A2-1: "x/n đã báo cáo" ở khối Kết quả của người làm
    'tf.att.', // A2-2: luật tệp đính kèm trong hộp Báo cáo / Bổ sung
    'tf.paste.', // A2-2: hộp xem trước ảnh vừa dán
    // A3-2: hộp Đổi mật khẩu trong Hồ sơ (phần còn lại của nhóm au làm ở A3-8 Đăng nhập / Mật khẩu)
    'au.pol.', 'au.cur', 'au.new', 'au.show', 'au.hide', 'au.saving',
    'au.err.cur', 'au.err.match', 'au.err.policy', 'au.err.same',
  ],
  /** Bỏ các khoá theo tiền tố: điều khiển của trang preview, tính năng Phase B */
  exclude: [
    'td.pv.', // thanh điều khiển preview
    'td.cm.lock', // khoá bình luận khi xong/hủy — Phase B
    'tf.pv.', // thanh điều khiển preview biểu mẫu
    'nt.scn', 'pf.scn', // A3-2: thanh điều khiển preview
    'pp.pv.', // A3-4: thanh điều khiển preview
    'nt.pb', 'nt.type', 'nt.clear', 'nt.empty.type', // A3-2: lọc theo loại thông báo — Phase B (API V1 không có tham số loại)
    'pf.pb', 'pf.email.ok', 'pf.email.pending', 'pf.email.resend', 'pf.email.sent', 'pf.email.note', // A3-2: xác nhận email — Phase B
    'pf.av.rm', 'pf.saved.avRm', 'pf.pw.last', // A3-2: bỏ ảnh / ngày đổi mật khẩu — V1 không có
    'db.pv.', // thanh điều khiển preview Tổng quan
    'hd.pv.', 'hd.reset.otpH', 'hd.dept.', 'hd.ty.', // A3-3: thanh điều khiển preview + dữ liệu mẫu
    'lg.pv.', 'lg.pb', 'lg.export', 'lg.f.alerts', 'lg.f.qUser', 'lg.dr.byIp', // A3-6: preview + Phase B (xuất Excel, ô tìm/lọc cảnh báo nhật ký người dùng)
    'lg.f.period', 'lg.p.', 'lg.dr.comment', 'lg.dr.part', 'lg.chg.verPart', // A3-6: chọn nhanh khoảng ngày, trích bình luận, tiến độ báo cáo — Phase B
    'lg.f.qTask', 'lg.f.qRef', 'lg.ref.hint', 'lg.na.', // A3-6: câu preview nói tìm theo mã/ID — V1 không có → bản đúng V1 ở lgx.*; trang không quyền do server chuyển hướng
    'hd.imp.jsonH', 'hd.imp.e.shape', // A3-3: có dấu { } không hợp lệ ICU → bản thoát ở extra-messages (hdx.imp.*)
  ],
};

const SEP = '.';
const SELF = '_';

/** Chạy copy.js (classic script) trong sandbox, lấy window.I18N.M = { vi: {...}, en: {...} } (khoá phẳng). */
export function loadCopyDictionary(copyPath = DEFAULT_COPY) {
  const src = fs.readFileSync(copyPath, 'utf8');
  const ctx = {
    window: {},
    localStorage: { getItem: () => null, setItem() {} },
    document: { addEventListener() {}, documentElement: {}, querySelectorAll: () => [] },
    CustomEvent: function CustomEvent() {},
  };
  vm.runInNewContext(src, ctx, { filename: copyPath });
  const M = ctx.window.I18N && ctx.window.I18N.M;
  if (!M || !M.vi || !M.en) throw new Error(`Không đọc được I18N.M từ ${copyPath}`);
  return { vi: { ...M.vi }, en: { ...M.en } };
}

/**
 * Lọc khoá theo nhóm (đoạn đầu khớp đúng) hoặc tiền tố đầy đủ.
 * @param {Record<string, string>} flat
 * @param {{ groups?: string[], prefixes?: string[], exclude?: string[] }} [opts]
 */
export function selectKeys(flat, { groups = [], prefixes = [], exclude = [] } = {}) {
  const g = new Set(groups);
  const out = {};
  for (const k of Object.keys(flat)) {
    if (exclude.some((p) => k.startsWith(p))) continue;
    if (g.has(k.split(SEP)[0]) || prefixes.some((p) => k.startsWith(p))) out[k] = flat[k];
  }
  return out;
}

/**
 * Khoá phẳng → cây lồng nhau (khoá sắp xếp). Trả kèm danh sách quy đổi xung đột.
 * @param {Record<string, string>} flat
 */
export function nestMessages(flat) {
  const keys = Object.keys(flat).sort();
  const parents = new Set();
  for (const k of keys) {
    const parts = k.split(SEP);
    for (let i = 1; i < parts.length; i++) parents.add(parts.slice(0, i).join(SEP));
  }
  /** @type {{ from: string, to: string }[]} */
  const renames = [];
  /** @type {Record<string, any>} */
  const tree = {};
  for (const k of keys) {
    let target = k;
    if (parents.has(k)) {
      target = k + SEP + SELF;
      renames.push({ from: k, to: target });
    }
    const parts = target.split(SEP);
    let node = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] ??= {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = flat[k];
  }
  return { tree: sortDeep(tree), renames };
}

function sortDeep(o) {
  if (typeof o !== 'object' || o === null) return o;
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortDeep(o[k])]));
}

/**
 * Cây → khoá phẳng (giữ dạng "a._" cho khoá đã quy đổi).
 * @param {Record<string, any>} tree
 * @param {string} [prefix]
 * @param {Record<string, string>} [out]
 * @returns {Record<string, string>}
 */
export function flattenMessages(tree, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? prefix + SEP + k : k;
    if (typeof v === 'object' && v !== null) flattenMessages(v, key, out);
    else out[key] = v;
  }
  return out;
}

/**
 * So tập khoá vi/en (nhận cây hoặc phẳng).
 * @param {Record<string, any>} vi
 * @param {Record<string, any>} en
 */
export function diffKeySets(vi, en) {
  const a = new Set(Object.keys(flattenMessages(vi)));
  const b = new Set(Object.keys(flattenMessages(en)));
  return {
    onlyVi: [...a].filter((k) => !b.has(k)).sort(),
    onlyEn: [...b].filter((k) => !a.has(k)).sort(),
  };
}

/**
 * Chuỗi nào parse ICU lỗi (next-intl dùng ICU: "{", "}", "<tag>" là cú pháp).
 * @param {Record<string, unknown>} flat
 */
export function findIcuProblems(flat) {
  /** @type {{ key: string, error: string }[]} */
  const out = [];
  for (const [key, msg] of Object.entries(flat)) {
    if (typeof msg !== 'string') {
      out.push({ key, error: 'không phải chuỗi' });
      continue;
    }
    try {
      parse(msg);
    } catch (e) {
      out.push({ key, error: String(e && e.message ? e.message : e) });
    }
  }
  return out;
}

function argNames(msg) {
  const names = new Set();
  const walk = (els) => {
    for (const el of els) {
      if (el.value !== undefined && typeof el.value === 'string' && el.type !== 0) names.add(el.value);
      if (el.options) for (const o of Object.values(el.options)) walk(o.value);
      if (el.children) walk(el.children);
    }
  };
  try {
    walk(parse(msg));
  } catch {
    /* lỗi cú pháp đã báo ở findIcuProblems */
  }
  return [...names].sort();
}

/**
 * vi và en của cùng khoá phải dùng cùng tập placeholder.
 * @param {Record<string, string>} viFlat
 * @param {Record<string, string>} enFlat
 */
export function findPlaceholderMismatches(viFlat, enFlat) {
  /** @type {{ key: string, vi: string[], en: string[] }[]} */
  const out = [];
  for (const key of Object.keys(viFlat).sort()) {
    if (!(key in enFlat)) continue;
    const a = argNames(viFlat[key]);
    const b = argNames(enFlat[key]);
    if (a.join('|') !== b.join('|')) out.push({ key, vi: a, en: b });
  }
  return out;
}

/** Ghép nguồn → { vi, en (cây), renames, problems[] }. Không ghi file. */
export function buildMessages({ copyPath = DEFAULT_COPY, include = INCLUDE, extra = EXTRA } = {}) {
  const copy = loadCopyDictionary(copyPath);
  /** @type {Record<string, unknown>[]} */
  const problems = [];
  /** @type {Record<string, Record<string, string>>} */
  const flat = {};
  for (const lang of ['vi', 'en']) {
    flat[lang] = selectKeys(copy[lang], include);
    for (const [k, v] of Object.entries(extra[lang] ?? {})) {
      if (k in flat[lang]) problems.push({ type: 'duplicate', lang, key: k });
      flat[lang][k] = v;
    }
    for (const p of findIcuProblems(flat[lang])) problems.push({ type: 'icu', lang, ...p });
  }
  const { onlyVi, onlyEn } = diffKeySets(flat.vi, flat.en);
  for (const key of onlyVi) problems.push({ type: 'missing', lang: 'en', key });
  for (const key of onlyEn) problems.push({ type: 'missing', lang: 'vi', key });
  for (const m of findPlaceholderMismatches(flat.vi, flat.en)) problems.push({ type: 'placeholder', ...m });

  const vi = nestMessages(flat.vi);
  const en = nestMessages(flat.en);
  return { vi: vi.tree, en: en.tree, renames: vi.renames, problems };
}

const stringify = (o) => JSON.stringify(o, null, 2) + '\n';

function main(argv) {
  const check = argv.includes('--check');
  const r = buildMessages();
  const nVi = Object.keys(flattenMessages(r.vi)).length;

  if (r.renames.length) {
    console.log(`Quy đổi xung đột khoá (${r.renames.length}): ` + r.renames.map((x) => `${x.from} → ${x.to}`).join(', '));
  }
  if (r.problems.length) {
    console.error(`✗ ${r.problems.length} lỗi:`);
    for (const p of r.problems) console.error('  ' + JSON.stringify(p));
    process.exit(1);
  }

  const files = { vi: path.join(OUT_DIR, 'vi.json'), en: path.join(OUT_DIR, 'en.json') };
  if (check) {
    const stale = [];
    for (const lang of ['vi', 'en']) {
      const cur = fs.existsSync(files[lang]) ? fs.readFileSync(files[lang], 'utf8') : '';
      if (cur.replace(/\r\n/g, '\n') !== stringify(r[lang])) stale.push(path.relative(ROOT, files[lang]));
      else {
        // File trên đĩa có thể bị sửa tay: kiểm lại vi/en khớp khoá từ chính file
      }
    }
    const onDisk = {
      vi: JSON.parse(fs.readFileSync(files.vi, 'utf8')),
      en: JSON.parse(fs.readFileSync(files.en, 'utf8')),
    };
    const d = diffKeySets(onDisk.vi, onDisk.en);
    if (d.onlyVi.length || d.onlyEn.length) {
      console.error(`✗ messages/*.json lệch khoá: chỉ vi ${JSON.stringify(d.onlyVi)}, chỉ en ${JSON.stringify(d.onlyEn)}`);
      process.exit(1);
    }
    if (stale.length) {
      console.error(`✗ ${stale.join(', ')} khác kết quả build — chạy: node scripts/i18n/build-messages.mjs`);
      process.exit(1);
    }
    console.log(`✓ i18n OK: ${nVi} khoá, vi/en khớp, ICU hợp lệ, messages/*.json đúng bản build.`);
    return;
  }

  fs.writeFileSync(files.vi, stringify(r.vi));
  fs.writeFileSync(files.en, stringify(r.en));
  console.log(`✓ Đã ghi messages/vi.json + en.json (${nVi} khoá mỗi file).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2));
}
