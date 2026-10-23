/**
 * Cấu hình menu dùng chung.
 * Cấu trúc menu V2 (nhóm, mục con, nhãn i18n) nằm ở `src/shared/layout/nav/nav-model.ts`.
 */

/** V1: menu nhân viên thấy mặc định trước khi tải xong / khi tải lỗi quyền menu (khớp DEFAULT_MENUS của api/hr/sidebar-permissions). */
export const ALWAYS_VISIBLE_MENUS = ['logs', 'analytics', 'helpdesk', 'hr'];
