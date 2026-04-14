export interface HelpdeskTicket {
  'Ngày tạo': string;
  'Nhân viên': string;
  'Phòng ban': string;
  'Tiêu đề': string;
  'Loại yêu cầu': string;
  'Ưu tiên': string;
  'Diễn giải': string;
  'Trạng thái': string;
  'IT Support': string | null;
  'timeStamp': string;
}

export const MOCK_HELPDESK_TICKETS: HelpdeskTicket[] = [
  // 2 Completed WITH IT Support → tạo Task
  {
    'Ngày tạo': '2026-02-03',
    'Nhân viên': 'Phan Thuy Thuy Trang',
    'Phòng ban': 'Công Trình',
    'Tiêu đề': 'D&E-20240001-Autocad software error',
    'Loại yêu cầu': 'Phần mềm',
    'Ưu tiên': 'Khẩn cấp',
    'Diễn giải': 'Phần mềm Autocad gặp lỗi khi mở bản vẽ lớn, không thể lưu file',
    'Trạng thái': 'Completed',
    'IT Support': 'Nhân viên 01',
    'timeStamp': '2026-02-03 14:57:08',
  },
  {
    'Ngày tạo': '2026-02-05',
    'Nhân viên': 'Lê Thị Bích',
    'Phòng ban': 'Kinh Doanh',
    'Tiêu đề': 'D&E-20240002-Network connection issue',
    'Loại yêu cầu': 'Phần cứng',
    'Ưu tiên': 'Cao',
    'Diễn giải': 'Máy tính không kết nối được mạng nội bộ, ảnh hưởng đến công việc',
    'Trạng thái': 'Completed',
    'IT Support': 'Nhân viên 02',
    'timeStamp': '2026-02-05 10:00:00',
  },
  // 2 Completed WITHOUT IT Support → HelpdeskPendingTask
  {
    'Ngày tạo': '2026-02-10',
    'Nhân viên': 'Hoàng Thị Cẩm',
    'Phòng ban': 'Nhân Sự',
    'Tiêu đề': 'D&E-20240003-Printer not working',
    'Loại yêu cầu': 'Phần cứng',
    'Ưu tiên': 'Bình thường',
    'Diễn giải': 'Máy in tầng 3 không hoạt động, không in được tài liệu',
    'Trạng thái': 'Completed',
    'IT Support': null,
    'timeStamp': '2026-02-10 09:00:00',
  },
  {
    'Ngày tạo': '2026-02-12',
    'Nhân viên': 'Nguyễn Thị Diệu',
    'Phòng ban': 'Tài Chính',
    'Tiêu đề': 'D&E-20240004-Excel formula error',
    'Loại yêu cầu': 'Phần mềm',
    'Ưu tiên': 'Thấp',
    'Diễn giải': 'Công thức Excel báo lỗi #REF khi copy sang sheet khác',
    'Trạng thái': 'Completed',
    'IT Support': null,
    'timeStamp': '2026-02-12 14:00:00',
  },
  // 1 Pending → bị bỏ qua (không sync)
  {
    'Ngày tạo': '2026-02-15',
    'Nhân viên': 'Phạm Văn Em',
    'Phòng ban': 'Mua Hàng',
    'Tiêu đề': 'D&E-20240005-Internet slow',
    'Loại yêu cầu': 'Phần cứng',
    'Ưu tiên': 'Bình thường',
    'Diễn giải': 'Internet rất chậm, không tải được file dung lượng lớn',
    'Trạng thái': 'Pending',
    'IT Support': null,
    'timeStamp': '2026-02-15 11:00:00',
  },
  // 1 IT Support không tồn tại trong DB → fallback HelpdeskPendingTask
  {
    'Ngày tạo': '2026-02-18',
    'Nhân viên': 'Vũ Thị Phương',
    'Phòng ban': 'Sản Xuất',
    'Tiêu đề': 'D&E-20240006-VPN connection failed',
    'Loại yêu cầu': 'Phần mềm',
    'Ưu tiên': 'Khẩn cấp',
    'Diễn giải': 'Không kết nối được VPN, không làm việc từ xa được',
    'Trạng thái': 'Completed',
    'IT Support': 'NonExistentUser XYZ',
    'timeStamp': '2026-02-18 16:00:00',
  },
];
