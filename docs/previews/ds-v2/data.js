/* Dữ liệu mẫu chi tiết công việc (song ngữ) dùng chung cho tasks-list / tasks-board / task.html.
   Nạp SAU copy.js. Đây là dữ liệu người dùng nhập (không phải chuỗi giao diện) nên viết thẳng {vi,en}.
   Port: thay bằng API thật — giữ nguyên hình dạng object để dễ đối chiếu. */
(function(){
  /* 3 vai trò như V1 (bảng Role, seed.ts:20-44): ADMIN · BOSS · EMPLOYEE. Người mẫu: admin = Phan Quản trị (PQ), boss = Cao Thuận (CT), emp = Lê Minh (LM). */
  var TODAY='2026-10-22', BOSS='CT', ADMIN='PQ', ME={admin:'PQ',boss:'CT',emp:'LM'};
  /* Người được giao/chuyển giao: EMPLOYEE + BOSS (api/tasks/assignable-users/route.ts:17). Dùng cho Chuyển giao, @nhắc tên, biểu mẫu. */
  var USERS=['CT','LM','PD','NH','TA','DK'];
  /* Mọi người dùng đang hoạt động, kể cả ADMIN — hộp Giao lại của V1 lấy danh sách này (ReassignModal → useUsers({isActive:true})). */
  var ALL_USERS=['PQ','CT','LM','PD','NH','TA','DK'];
  var ROLE_OF={PQ:'ADMIN',CT:'BOSS'};
  function roleOf(c){return ROLE_OF[c]||'EMPLOYEE'}
  /* Mã việc V1: YY-NNNN (task-create.service.ts:44-57). Link cũ CV-1033 → 26-0033 để các trang chưa đổi mã vẫn mở được. */
  function normId(id){var s=String(id||'').trim().toUpperCase(),m=/^CV-(\d{4})$/.exec(s);return m&&+m[1]>=1000?'26-'+String(+m[1]-1000).padStart(4,'0'):s}

  /* Việc thêm — dùng chung để Danh sách và Bảng cùng một bộ dữ liệu */
  var EXTRA=[
    {id:'26-0019', t:{vi:'Triển khai Kaspersky Endpoint cho 40 máy khối Văn phòng',en:'Roll out Kaspersky Endpoint to 40 office PCs'}, s:'IN_PROGRESS', p:'high', ty:{vi:'Bảo mật',en:'Security'}, a:['LM','PD','TA'], due:3, c:4, f:2, approval:1},
    {id:'26-0017', t:{vi:'Cấu hình lại Wi-Fi khách ở sảnh tầng 1',en:'Reconfigure guest Wi-Fi in the ground-floor lobby'}, s:'IN_PROGRESS', p:'normal', ty:{vi:'Mạng',en:'Network'}, a:['LM'], due:5, c:1, f:0, approval:1},
    /* allFailed: mọi người được giao đều từ chối (assignment.service.ts:225-302, _shared.ts:172-194) */
    {id:'26-0044', t:{vi:'Cài máy in mạng cho phòng Nhân sự tầng 2',en:'Set up a network printer for HR on the 2nd floor'}, s:'WAITING_ACKNOWLEDGE', p:'normal', ty:{vi:'Phần cứng',en:'Hardware'}, a:['NH','DK'], due:4, c:1, f:0},
    /* Đã hủy, có trạng thái trước khi hủy → Admin khôi phục được (restore.service.ts) */
    {id:'26-0040', t:{vi:'Nâng cấp Windows 11 cho 12 máy phòng Thiết kế',en:'Upgrade 12 Design PCs to Windows 11'}, s:'CANCELLED', p:'normal', ty:{vi:'Phần mềm',en:'Software'}, a:['LM','TA'], due:'2026-10-30', c:1, f:0, approval:1},
    /* Vice Manager là người được giao (taskActionMatrix.ts:105-112) */
    {id:'26-0045', t:{vi:'Gia hạn chứng chỉ SSL cho cổng VPN',en:'Renew the SSL certificate on the VPN gateway'}, s:'WAITING_ACKNOWLEDGE', p:'high', ty:{vi:'Bảo mật',en:'Security'}, a:['CT','TA'], due:3, c:0, f:0, approval:1}
  ];

  /* Mẫu báo cáo hoàn thành (ReportTemplate, seed.ts:400-430). ty=null: mẫu chung; ty=khoá loại: chỉ hiện cho việc cùng loại
     (api/tasks/[id]/completion-templates/route.ts:26-36). */
  var TEMPLATES=[
    {id:'tp1',ty:null,cat:{vi:'Kết quả',en:'Result'},t:{vi:'Đã xử lý xong',en:'Resolved'},x:{vi:'Đã kiểm tra và xử lý xong vấn đề. Kết quả: [mô tả kết quả]. Không phát sinh vấn đề thêm.',en:'Checked and resolved the issue. Result: [describe the result]. No further issues.'}},
    {id:'tp2',ty:null,cat:{vi:'Kết quả',en:'Result'},t:{vi:'Đã gửi phản hồi cho người dùng',en:'Replied to the user'},x:{vi:'Đã liên hệ và phản hồi cho người dùng về vấn đề này. Người dùng đã xác nhận và đồng ý với hướng giải quyết.',en:'Contacted the user about this issue. They confirmed and agreed with the fix.'}},
    {id:'tp3',ty:'sw',cat:{vi:'Phần mềm',en:'Software'},t:{vi:'Đã cài đặt / cập nhật',en:'Installed / updated'},x:{vi:'Đã cài đặt/cập nhật [tên phần mềm] phiên bản [x.y] trên [số] máy. Đã kiểm tra chạy thử, người dùng xác nhận dùng được.',en:'Installed/updated [software] version [x.y] on [n] machines. Test run passed and users confirmed it works.'}},
    {id:'tp4',ty:'hw',cat:{vi:'Phần cứng',en:'Hardware'},t:{vi:'Đã thay thế thiết bị',en:'Replaced the device'},x:{vi:'Đã thay [thiết bị] tại [vị trí]. Thiết bị cũ đã niêm phong, chờ thanh lý. Đã kiểm tra hoạt động bình thường.',en:'Replaced [device] at [location]. The old device is sealed for disposal. Checked that everything works.'}},
    {id:'tp5',ty:'net',cat:{vi:'Mạng',en:'Network'},t:{vi:'Đã cấu hình mạng',en:'Network configured'},x:{vi:'Đã cấu hình [thiết bị/VLAN]. Ping và kiểm tra kết nối giữa các tầng đều ổn. Đã lưu bản sao cấu hình.',en:'Configured [device/VLAN]. Ping and inter-floor connectivity checks passed. Config backup saved.'}}
  ];
  var TYKEY={'Mạng':'net','Phần cứng':'hw','Hỗ trợ':'sup','Phần mềm':'sw','Bảo mật':'sec','Tài khoản':'acc','Khác':'oth','Phát triển':'dev'};
  function templatesFor(t){var k=t&&t.ty?TYKEY[t.ty.vi]:null;return TEMPLATES.filter(function(x){return !x.ty||x.ty===k})}

  var GENERIC={vi:'Đã làm xong phần việc được giao. Chi tiết trong tệp đính kèm.',en:'My part is done. Details are in the attachment.'};

  /* ---------- Chi tiết theo mã ---------- */
  var X={
    '26-0042':{cr:'NH',at:'2026-10-20',since:2,
      d:[{p:{vi:'Chi nhánh Đà Nẵng cần truy cập ERP và ổ chia sẻ qua VPN trước ngày 25/10. Tạo 12 tài khoản theo danh sách nhân sự đính kèm, phân quyền theo nhóm Kế toán chi nhánh và bật xác thực hai lớp.',en:'The Da Nang branch needs VPN access to the ERP and shared drives before Oct 25. Create 12 accounts from the attached staff list, scope them to the branch Accounting group and turn on two-factor sign-in.'}}],
      files:[{n:{vi:'danh-sach-nhan-su-DN.xlsx',en:'da-nang-staff-list.xlsx'},s:'22 KB',by:'NH',w:'2026-10-20 08:30'}],
      cm:[{a:'TA',w:['hour',1],x:{vi:'Firewall đã mở sẵn dải IP của chi nhánh, chỉ còn chờ duyệt.',en:'The firewall already allows the branch IP range. Just waiting on approval.'}},
          {a:'NH',w:['hour',3],x:{vi:'Danh sách 12 người đã được trưởng chi nhánh xác nhận.',en:'The branch manager has confirmed the list of 12 people.'}}]},
    '26-0039':{cr:'CT',at:'2026-10-13',since:0,
      d:[{p:{vi:'Hai ổ trong mảng RAID 5 của NAS Kế toán báo lỗi SMART. Thay cả 4 ổ, dựng lại mảng và kiểm tra bản sao lưu đêm trước khi bàn giao.',en:'Two drives in the Accounting NAS RAID 5 array report SMART errors. Replace all four, rebuild the array and verify the nightly backup before handing it back.'}}],
      rp:{LM:{w:['hour',2],x:{vi:'Đã thay 4 ổ 4TB, dựng lại RAID 5 trong 7 giờ, không mất dữ liệu. Bản sao lưu đêm 21/10 khôi phục thử thành công. Ổ cũ đã niêm phong, chờ hủy theo quy trình.',en:'Replaced all four 4TB drives and rebuilt RAID 5 in 7 hours with no data loss. A test restore of the Oct 21 nightly backup succeeded. The old drives are sealed and waiting for disposal.'},
        f:[{n:{vi:'bien-ban-ban-giao-NAS.pdf',en:'NAS-handover-record.pdf'},s:'248 KB'},{n:{vi:'smart-log-truoc-sau.xlsx',en:'smart-log-before-after.xlsx'},s:'36 KB'}]}},
      cm:[{a:'LM',w:['hour',2],x:{vi:'Gửi kèm biên bản bàn giao có chữ ký kế toán trưởng.',en:'The handover record signed by the chief accountant is attached.'}},
          {a:'PD',w:['hour',3],x:{vi:'Mình đã kiểm tra lại quyền thư mục của phòng Kế toán, mọi thứ ổn.',en:'I re-checked the Accounting folder permissions. All good.'}}]},
    '26-0036':{cr:'CT',at:'2026-10-19',since:3,
      d:[{p:{vi:'Người dùng tầng 3 in từ Excel thì lệnh treo trong hàng đợi, in từ Word vẫn bình thường. Kiểm tra driver, hàng đợi trên máy chủ in và bản cập nhật Office gần nhất.',en:'On the 3rd floor, Excel print jobs hang in the queue while Word prints fine. Check the driver, the print server queue and the latest Office update.'}}],
      hdReq:{vi:'Võ Thị Lan · Kinh doanh',en:'Vo Thi Lan · Sales'},
      cm:[{a:'LM',w:['hour',5],x:{vi:'Gỡ bản cập nhật Office KB5002 trên 2 máy thì in lại được. Đang kiểm tra các máy còn lại.',en:'Rolling back Office update KB5002 fixed 2 machines. Checking the rest now.'}},
          {a:'CT',w:['yday','16:40'],x:{vi:'Ưu tiên máy phòng Kinh doanh trước nhé.',en:'Please do the Sales machines first.'}}]},
    '26-0033':{cr:'TA',at:'2026-10-08',since:2,
      steps:{PENDING_APPROVAL:'2026-10-08',WAITING_ACKNOWLEDGE:'2026-10-11',IN_PROGRESS:'2026-10-11',PENDING_REVIEW:'2026-10-20'},
      d:[{p:{vi:'Nâng firmware switch lõi Cisco 9300 từ 17.6.4 lên 17.9.5 để vá lỗ hổng bảo mật đã công bố (CVE-2026-20198). Làm ngoài giờ, có phương án quay lui và kiểm tra lại toàn bộ VLAN sau khi nâng.',en:'Upgrade the Cisco 9300 core switch from 17.6.4 to 17.9.5 to patch a published vulnerability (CVE-2026-20198). Work after hours, keep a rollback plan and re-check every VLAN afterwards.'}},
         {h:{vi:'Phân công',en:'Who does what'}},
         {ul:[{vi:'Trần An: nâng firmware, theo dõi log trong 24 giờ đầu.',en:'Tran An: run the upgrade and watch the logs for the first 24 hours.'},
              {vi:'Lê Minh: kiểm tra HSRP và định tuyến giữa các tầng, chụp lại trạng thái trước và sau.',en:'Le Minh: check HSRP and inter-floor routing, capture the state before and after.'},
              {vi:'Phạm Đức: kiểm tra Wi-Fi và điện thoại IP ở cả 5 tầng sau khi nâng.',en:'Pham Duc: test Wi-Fi and IP phones on all 5 floors after the upgrade.'},
              {vi:'Nguyễn Hương: đối chiếu cấu hình đang chạy với bản sao lưu.',en:'Nguyen Huong: compare the running config with the backup.'}]},
         {h:{vi:'Phương án quay lui',en:'Rollback plan'}},
         {p:{vi:'Giữ ảnh 17.6.4 trên flash. Nếu sau 30 phút còn lỗi định tuyến hoặc mất kết nối tầng nào, khởi động lại về ảnh cũ và báo ngay cho trưởng phòng. Không thay đổi cấu hình VLAN trong cùng đợt bảo trì.',en:'Keep the 17.6.4 image on flash. If routing errors or a lost floor remain after 30 minutes, boot back into the old image and tell the manager right away. Don’t change any VLAN config in the same maintenance window.'}},
         {p:{vi:'Tài liệu tham khảo: https://www.cisco.com/c/en/us/support/switches/catalyst-9300-series-switches/products-release-notes-list.html',en:'Reference: https://www.cisco.com/c/en/us/support/switches/catalyst-9300-series-switches/products-release-notes-list.html'}}],
      files:[{n:{vi:'so-do-mang-loi.pdf',en:'core-network-diagram.pdf'},s:'1.2 MB',by:'TA',w:'2026-10-08 09:12'},
             {n:{vi:'ke-hoach-quay-lui.docx',en:'rollback-plan.docx'},s:'86 KB',by:'TA',w:'2026-10-08 09:12'},
             {n:'release-notes-17.9.5.pdf',s:'2.4 MB',by:'TA',w:'2026-10-09 15:40'},
             {n:{vi:'danh-sach-vlan.xlsx',en:'vlan-list.xlsx'},s:'44 KB',by:'NH',w:'2026-10-10 10:05'}],
      /* trạng thái riêng từng người + báo cáo có phiên bản */
      as:{
        TA:{st:'COMPLETED',rv:[
          {v:'1.0',w:'2026-10-18 21:15',x:{vi:'Đã nâng lên 17.9.5 lúc 22:40 thứ Bảy, gián đoạn 6 phút. 14 VLAN và định tuyến giữa các tầng đã kiểm tra lại, không có cảnh báo mới trong 24 giờ theo dõi.',en:'Upgraded to 17.9.5 at 22:40 on Saturday with 6 minutes of downtime. All 14 VLANs and inter-floor routing were re-checked, with no new alerts in 24 hours of monitoring.'},
            f:[{n:{vi:'nhat-ky-nang-cap-9300.txt',en:'upgrade-log-9300.txt'},s:'18 KB'}]},
          {v:'1.1',w:'2026-10-21 16:05',x:{vi:'Bổ sung: sau 72 giờ theo dõi vẫn không có cảnh báo mới. Đính kèm kết quả kiểm tra VLAN và ảnh chụp bảng giám sát.',en:'Update: still no new alerts after 72 hours of monitoring. Attached the VLAN check results and a screenshot of the monitoring board.'},
            f:[{n:{vi:'ket-qua-kiem-tra-vlan.pdf',en:'vlan-check-results.pdf'},s:'412 KB'},{n:{vi:'giam-sat-72h.png',en:'monitoring-72h.png'},s:'1.1 MB'}]}]},
        LM:{st:'COMPLETED',rv:[
          {v:'1.0',w:'2026-10-17 10:20',x:{vi:'Đã kiểm tra HSRP và định tuyến giữa các tầng, hoạt động bình thường.',en:'Checked HSRP and inter-floor routing; both work normally.'},f:[]},
          {v:'2.0',w:'2026-10-20 08:40',x:{vi:'Làm lại theo yêu cầu của trưởng phòng, bổ sung đầy đủ ảnh chụp trước và sau khi nâng.\n\nHSRP\n- Nhóm 10, 20, 30: active ở switch lõi A, standby ở B, chuyển đổi thử 3 lần đều dưới 3 giây.\n- Nhóm 40 (camera): trước đây priority bị đặt sai (100/100), đã sửa thành 110/100 và ghi lại trong sổ thay đổi.\n\nĐịnh tuyến giữa các tầng\n- Ping liên tục 30 phút giữa 5 tầng: mất 0 gói, độ trễ trung bình 1,2 ms (trước khi nâng 1,4 ms).\n- Bảng định tuyến OSPF giống hệt bản lưu trước khi nâng, 42 tuyến.\n- Tầng 4 có 1 cổng uplink báo CRC tăng nhẹ; đã thay dây nhảy, theo dõi thêm 24 giờ không tăng nữa.\n\nViệc còn lại\n- Đề nghị lên lịch thay module quang dự phòng cho tầng 4 trong quý tới.\n- Cập nhật sơ đồ mạng lõi bản mới vào kho tài liệu (đã làm).\n\nẢnh chụp và nhật ký lệnh nằm trong 3 tệp đính kèm.',en:'Redone as the manager asked, now with full before and after screenshots.\n\nHSRP\n- Groups 10, 20, 30: active on core switch A, standby on B; three failover tests all under 3 seconds.\n- Group 40 (cameras): priority was set wrong before (100/100); fixed to 110/100 and logged in the change book.\n\nInter-floor routing\n- 30-minute continuous ping across all 5 floors: 0 packets lost, 1.2 ms average latency (1.4 ms before the upgrade).\n- The OSPF routing table matches the pre-upgrade backup exactly, 42 routes.\n- One uplink port on floor 4 showed slowly rising CRC errors; replaced the patch cable and it stayed flat for another 24 hours.\n\nStill to do\n- Suggest scheduling a spare optical module for floor 4 next quarter.\n- Upload the new core network diagram to the docs library (done).\n\nScreenshots and command logs are in the 3 attachments.'},
            f:[{n:{vi:'hsrp-truoc-sau.png',en:'hsrp-before-after.png'},s:'860 KB'},{n:{vi:'ping-5-tang-30-phut.txt',en:'ping-5-floors-30-min.txt'},s:'64 KB'},{n:{vi:'so-do-mang-loi-v2-ban-cap-nhat-sau-nang-cap-firmware-17.9.5.pdf',en:'core-network-diagram-v2-updated-after-firmware-17.9.5-upgrade.pdf'},s:'1.4 MB'}]}],
          rw:{by:'CT',w:'2026-10-19 09:10',x:{vi:'Thiếu ảnh chụp trạng thái HSRP sau khi nâng, bổ sung giúp anh.',en:'The HSRP status screenshots after the upgrade are missing. Please add them.'}}},
        PD:{st:'COMPLETED',rv:[
          {v:'1.0',w:'2026-10-19 17:30',x:{vi:'Wi-Fi tầng 2 ổn định lại sau khi nâng, điện thoại IP cả 5 tầng gọi thử đều được. Đã hỏi lại người dùng tầng 2.',en:'2nd-floor Wi-Fi is stable again after the upgrade, and test calls on IP phones work on all 5 floors. Confirmed with 2nd-floor users.'},
            f:[{n:{vi:'kiem-tra-wifi-dien-thoai.xlsx',en:'wifi-phone-checks.xlsx'},s:'28 KB'}]}],
          from:'DK'},
        NH:{st:'REJECTED',w:'2026-10-11 15:20',why:{vi:'Tuần này mình trực đêm ở chi nhánh, không tham gia được. Đề nghị giao người khác.',en:'I’m on night duty at the branch this week and can’t join. Please assign someone else.'}},
        DK:{st:'TRANSFERRED',w:'2026-10-12 09:00',to:'PD'}
      },
      cm:[{id:1,a:'TA',w:['date','2026-10-09 08:15'],x:{vi:'Lịch nâng cấp: 22:00 thứ Bảy. @Nguyễn Hương theo dõi bảng giám sát giúp mình nhé.',en:'Upgrade window: 22:00 on Saturday. @Nguyễn Hương please keep an eye on the monitoring board.'}},
          {id:2,a:'NH',w:['date','2026-10-11 15:22'],x:{vi:'Tuần này mình trực đêm bên chi nhánh nên đã từ chối trên hệ thống.',en:'I’m on night duty at the branch this week, so I declined in the system.'}},
          {id:3,a:'CT',w:['date','2026-10-19 09:12'],x:{vi:'@Lê Minh bổ sung ảnh chụp trạng thái HSRP sau khi nâng nhé.',en:'@Lê Minh please add the HSRP status screenshots after the upgrade.'}},
          {id:4,a:'LM',w:['date','2026-10-20 08:42'],x:{vi:'Đã gửi lại báo cáo v2.0 kèm ảnh chụp.',en:'Re-sent the report as v2.0 with screenshots.'},ed:1},
          {id:5,a:'PD',w:['hour',4],x:{vi:'Wi-Fi tầng 2 ổn định lại sau khi nâng, đã hỏi người dùng.',en:'2nd-floor Wi-Fi is stable again after the upgrade. Confirmed with users.'}},
          {id:6,a:'NH',w:['hour',2],x:{vi:'Đã đối chiếu cấu hình đang chạy với bản lưu trước khi nâng, không có khác biệt.',en:'The running config matches the pre-upgrade backup. No differences.'}},
          {id:7,a:'LM',w:['hour',1],x:{vi:'@Cao Thuận nhờ anh nghiệm thu giúp em trước thứ Sáu.',en:'@Cao Thuận could you sign this off before Friday?'}}],
      ext:[{id:1,by:'TA',w:'2026-10-15 10:00',from:'2026-10-18',to:'2026-10-20',x:{vi:'Chờ cửa sổ bảo trì cuối tuần để không ảnh hưởng giờ làm.',en:'Waiting for the weekend maintenance window so work hours aren’t affected.'},st:'APPROVED',re:{by:'CT',w:'2026-10-15 11:30',x:{vi:'Đồng ý, nhớ báo trước cho các phòng.',en:'Approved. Let the departments know in advance.'}}},
           {id:2,by:'PD',w:'2026-10-17 14:10',from:'2026-10-20',to:'2026-10-25',x:{vi:'Cần thêm thời gian kiểm tra điện thoại IP tầng 5.',en:'Need more time to test the 5th-floor IP phones.'},st:'REJECTED',re:{by:'CT',w:'2026-10-17 16:00',x:{vi:'Hạn hiện tại vẫn đủ, kiểm tra tầng 5 trong tối thứ Bảy luôn.',en:'The current due date is enough. Test floor 5 on Saturday night too.'}}},
           {id:3,by:'LM',w:'2026-10-21 17:45',from:'2026-10-20',to:'2026-10-24',x:{vi:'Cần thêm 2 ngày để chụp lại trạng thái HSRP ở 3 tầng còn lại theo góp ý.',en:'Need 2 more days to re-capture HSRP status on the other 3 floors as requested.'},st:'PENDING'}],
      hist:[['2026-10-08 09:12','TA','created'],['2026-10-11 10:30','CT','approved'],['2026-10-11 14:02','TA','accepted'],['2026-10-11 14:30','LM','accepted'],
            ['2026-10-11 15:20','NH','declined'],['2026-10-11 16:00','DK','accepted'],['2026-10-12 09:00','DK','transferred',{b:'PD'}],['2026-10-12 09:30','PD','accepted'],
            ['2026-10-15 10:00','TA','extReq',{d:'2026-10-20'}],['2026-10-15 11:30','CT','extOk',{d:'2026-10-20'}],['2026-10-17 10:20','LM','reported',{v:'v1.0'}],
            ['2026-10-17 14:10','PD','extReq',{d:'2026-10-25'}],['2026-10-17 16:00','CT','extNo',{b:'PD'}],['2026-10-18 21:15','TA','reported',{v:'v1.0'}],
            ['2026-10-19 09:10','CT','rework',{b:'LM'}],['2026-10-19 17:30','PD','reported',{v:'v1.0'}],['2026-10-20 08:40','LM','reported',{v:'v2.0'}],
            ['2026-10-21 16:05','TA','supplemented',{v:'v1.1'}],['2026-10-21 17:45','LM','extReq',{d:'2026-10-24'}]]},
    '26-0031':{cr:'CT',at:'2026-10-20',since:2,
      d:[{p:{vi:'5 nhân viên Kế toán mới bắt đầu làm từ 01/11. Cài MISA SME bản 2026, gắn giấy phép từ kho chung và tạo tài khoản theo phân quyền trưởng phòng đã gửi.',en:'Five new Accounting staff start on Nov 1. Install MISA SME 2026, assign licenses from the shared pool and create accounts using the roles the department head sent.'}}],
      files:[{n:{vi:'phan-quyen-ke-toan.xlsx',en:'accounting-roles.xlsx'},s:'18 KB',by:'CT',w:'2026-10-20 09:00'}],cm:[]},
    '26-0028':{cr:'CT',at:'2026-10-01',since:12,
      d:[{p:{vi:'Xuất cấu hình firewall FortiGate, mã hóa và lưu vào kho sao lưu ngoài văn phòng. Ghi lại các thay đổi chính sách trong tháng.',en:'Export the FortiGate config, encrypt it and store it in the off-site backup vault. Note any policy changes made this month.'}}],
      cm:[{a:'TA',w:['yday','09:10'],x:{vi:'Đã lên lịch xuất tự động lúc 23:00 ngày 27.',en:'Automatic export is scheduled for 23:00 on the 27th.'}}]},
    '26-0025':{cr:'CT',at:'2026-10-20',since:2,
      d:[{p:{vi:'Nhân viên phòng Kinh doanh nghỉ việc từ 24/10. Chuyển hộp thư sang dạng chia sẻ cho trưởng phòng, thu hồi giấy phép Microsoft 365 và đăng xuất mọi thiết bị.',en:'A Sales employee leaves on Oct 24. Convert the mailbox to shared for the department head, reclaim the Microsoft 365 license and sign out every device.'}}],
      hdReq:{vi:'Phạm Thu Hà · Nhân sự',en:'Pham Thu Ha · HR'},cm:[]},
    '26-0022':{cr:'LM',at:'2026-10-20',since:2,
      d:[{p:{vi:'Phòng họp tầng 5 dự kiến dùng từ tháng 12. Liệt kê màn hình, camera hội nghị, micro và điểm mạng cần lắp, kèm báo giá sơ bộ.',en:'The 5th-floor meeting room opens in December. List the displays, conference camera, microphones and network points needed, with a rough quote.'}}],cm:[]},
    '26-0019':{cr:'CT',at:'2026-10-14',since:6,
      d:[{p:{vi:'Cài Kaspersky Endpoint Security 12 cho 40 máy khối Văn phòng, gỡ phần mềm diệt virus cũ, đưa máy vào nhóm chính sách "Văn phòng" trên máy chủ quản trị.',en:'Install Kaspersky Endpoint Security 12 on 40 office PCs, remove the old antivirus and put the machines in the "Office" policy group on the admin server.'}}],
      /* Trần An chuyển phần việc cho Lê Minh; nếu Lê Minh từ chối, phần việc quay về Trần An (assignment.service.ts:148-187) */
      as:{PD:{st:'IN_PROGRESS'},TA:{st:'TRANSFERRED',w:'2026-10-21 09:00',to:'LM'},LM:{st:'PENDING',from:'TA',trNote:{vi:'Mình được điều sang dự án chi nhánh 2 tuần, nhờ Minh làm tiếp tầng 4 và 5 (24 máy).',en:'I’m moving to the branch project for 2 weeks. Minh, please take over floors 4 and 5 (24 machines).'}}},
      hist:[['2026-10-14 09:00','CT','created'],['2026-10-15 10:00','CT','approved'],['2026-10-15 14:00','PD','accepted'],['2026-10-15 14:10','TA','accepted'],['2026-10-21 09:00','TA','transferred',{b:'LM'}]],
      cm:[{a:'PD',w:['hour',6],x:{vi:'Đã xong 16/40 máy tầng 2 và 3.',en:'16 of 40 machines done on floors 2 and 3.'}}]},
    '26-0017':{cr:'CT',at:'2026-10-16',since:5,
      d:[{p:{vi:'Tách Wi-Fi khách ở sảnh sang VLAN riêng, giới hạn 5 Mbps mỗi thiết bị và đổi mật khẩu hằng tuần.',en:'Move lobby guest Wi-Fi onto its own VLAN, cap each device at 5 Mbps and rotate the password weekly.'}}],cm:[]},
    '26-0044':{cr:'LM',at:'2026-10-19',since:1,allFailed:1,
      d:[{p:{vi:'Phòng Nhân sự tầng 2 cần một máy in mạng dùng chung. Lắp máy HP M404dn từ kho, đặt IP tĩnh, cài driver cho 8 máy trong phòng.',en:'HR on the 2nd floor needs a shared network printer. Install the HP M404dn from storage, give it a static IP and set up the driver on the 8 PCs in the room.'}}],
      as:{NH:{st:'REJECTED',w:'2026-10-20 09:40',why:{vi:'Tuần này mình trực chi nhánh, không qua văn phòng được.',en:'I’m covering the branch this week and can’t get to the office.'}},
          DK:{st:'REJECTED',w:'2026-10-21 15:05',why:{vi:'Đang xử lý sự cố máy chủ ERP, chưa nhận thêm việc được.',en:'I’m on the ERP server incident and can’t take more work yet.'}}},
      hist:[['2026-10-19 09:00','LM','created'],['2026-10-20 09:40','NH','declined'],['2026-10-21 15:05','DK','declined'],['2026-10-21 15:05',null,'allFailed',{b:'LM'}]],
      cm:[{a:'LM',w:['hour',3],x:{vi:'Cả hai anh chị đều bận, nhờ trưởng phòng giao lại giúp em.',en:'Both of them are busy. Could the manager reassign this, please?'}}]},
    '26-0040':{cr:'CT',at:'2026-10-12',since:0,sBefore:'IN_PROGRESS',
      cancel:{by:'CT',w:'2026-10-20 17:30',x:{vi:'Phòng Thiết kế xin lùi sang quý 1 vì đang chạy dự án gấp.',en:'Design asked to push this to Q1 because of a rush project.'}},
      d:[{p:{vi:'Nâng cấp 12 máy phòng Thiết kế lên Windows 11 23H2, giữ nguyên bản quyền Adobe và kiểm tra driver bảng vẽ.',en:'Upgrade the 12 Design PCs to Windows 11 23H2, keep the Adobe licenses and check the drawing tablet drivers.'}}],
      /* Hủy việc: V1 chuyển mọi người làm còn hiệu lực sang REJECTED (lifecycle.service.ts:240-247) */
      as:{LM:{st:'REJECTED',cx:1},TA:{st:'REJECTED',cx:1}},
      hist:[['2026-10-12 09:00','CT','created'],['2026-10-13 10:00','CT','approved'],['2026-10-13 14:00','LM','accepted'],['2026-10-13 14:20','TA','accepted'],['2026-10-20 17:30','CT','cancelled']],
      cm:[{a:'TA',w:['date','2026-10-20 16:50'],x:{vi:'Đã xong 3/12 máy, các máy này vẫn chạy ổn.',en:'3 of 12 done; those machines are fine.'}}]},
    '26-0045':{cr:'NH',at:'2026-10-20',since:1,
      d:[{p:{vi:'Chứng chỉ SSL của cổng VPN hết hạn ngày 30/10. Gia hạn qua nhà cung cấp, cài lên FortiGate và kiểm tra lại kết nối từ chi nhánh.',en:'The VPN gateway SSL certificate expires on Oct 30. Renew it with the provider, install it on the FortiGate and re-test branch connections.'}}],
      hist:[['2026-10-20 09:00','NH','created'],['2026-10-21 10:00','CT','approved']],cm:[]}
  };

  function clone(o){return JSON.parse(JSON.stringify(o))}
  function addDays(iso,n){var p=iso.split('-');var d=new Date(+p[0],+p[1]-1,+p[2]+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

  /* Trạng thái riêng mặc định suy từ trạng thái việc (cho việc không có `as` viết tay) */
  function deriveAs(t,rp){
    var as={};
    t.a.forEach(function(c){
      /* AssigneeStatus của V1 (schema.prisma): PENDING · IN_PROGRESS · COMPLETED · REJECTED · TRANSFERRED · REVISION_REQUIRED */
      var st={DRAFT:'PENDING',PENDING_APPROVAL:'PENDING',WAITING_ACKNOWLEDGE:'PENDING',IN_PROGRESS:'IN_PROGRESS',PENDING_REVIEW:'COMPLETED',COMPLETED:'COMPLETED',CANCELLED:'REJECTED'}[t.s];
      var o={st:st};
      if(st==='REJECTED')o.cx=1;
      if(st==='COMPLETED'){var r=rp&&rp[c]; o.rv=[{v:'1.0',w:r&&r.w?r.w:['hour',2],x:r?r.x:GENERIC,f:r?r.f:[]}];}
      as[c]=o;
    });
    return as;
  }
  function genHist(t){
    var h=[[t.at+' 09:00',t.cr,'created']];
    if(t.approval&&t.s!=='PENDING_APPROVAL'&&t.s!=='DRAFT')h.push([addDays(t.at,1)+' 10:00',BOSS,'approved']);
    if(['IN_PROGRESS','PENDING_REVIEW','COMPLETED'].indexOf(t.s)>-1)t.a.forEach(function(c){h.push([addDays(t.at,1)+' 14:00',c,'accepted'])});
    if(['PENDING_REVIEW','COMPLETED'].indexOf(t.s)>-1)t.a.forEach(function(c){h.push([addDays(TODAY,-1)+' 16:00',c,'reported',{v:'v1.0'}])});
    if(t.s==='COMPLETED'&&t.approval)h.push([TODAY+' 08:30',BOSS,'reviewed']);
    return h;
  }

  /* Trả về MẢNG việc mới (bản sao) — mỗi trang tự giữ trạng thái của mình */
  function tasks(){
    return I18N.TASKS.concat(EXTRA).map(function(src){
      var t=clone(src), x=clone(X[src.id]||{});
      t.cr=x.cr||BOSS; t.at=x.at||'2026-10-15'; t.since=x.since||0;
      t.desc=x.d||[]; t.files=x.files||[]; t.cm=(x.cm||[]).map(function(c,i){c.id=c.id||i+1;return c});
      t.ext=x.ext||[]; t.hdReq=x.hdReq||null; t.stepDates=x.steps||null;
      t.as=x.as||deriveAs(t,x.rp); t.hist=x.hist||genHist(t);
      t.force=x.force||0; t.cancel=x.cancel||null; t.sBefore=x.sBefore||null; t.allFailed=x.allFailed||0;
      if(x.cm&&x.cm.length>t.c)t.c=x.cm.length;
      if(t.id==='26-0033')t.c=t.cm.length;
      return t;
    });
  }

  /* ---------- Kịch bản trạng thái mẫu cho task.html (thanh preview) ----------
     state: PENDING_APPROVAL | WAITING_ACKNOWLEDGE | IN_PROGRESS | PENDING_REVIEW | COMPLETED | CANCELLED
     mode : approval | direct | force (Phê duyệt + Bắt buộc) */
  function scenario(base,state,mode){
    var t=clone(base), ap=mode!=='direct';
    t.approval=ap?1:0; t.force=mode==='force'?1:0;
    if(!ap&&(state==='PENDING_APPROVAL'||state==='PENDING_REVIEW'))state='IN_PROGRESS';
    var live=state==='CANCELLED'?'IN_PROGRESS':state;
    t.s=state; t.sBefore=state==='CANCELLED'?'IN_PROGRESS':null;
    t.cancel=state==='CANCELLED'?{by:'CT',w:'2026-10-21 18:00',x:{vi:'Hãng vừa phát hành bản 17.9.6 vá thêm lỗi, gộp vào đợt nâng cấp mới 26-0050.',en:'The vendor just released 17.9.6 with more fixes; this is folded into the new upgrade 26-0050.'}}:null;
    t.due=state==='COMPLETED'?'ok':base.due;
    if(base.id==='26-0033'){
      var A=t.as;
      if(live==='PENDING_APPROVAL'){t.a.forEach(function(c){A[c]={st:'PENDING'}});}
      else if(live==='WAITING_ACKNOWLEDGE'){t.a.forEach(function(c){A[c]={st:'PENDING'}}); A.NH=base.as.NH;}
      else if(live==='IN_PROGRESS'){
        A.TA={st:'IN_PROGRESS'};
        A.LM={st:'REVISION_REQUIRED',rv:[base.as.LM.rv[0]],rw:base.as.LM.rw};
      }
      /* PENDING_REVIEW / COMPLETED: giữ dữ liệu viết tay */
      var keepHist={PENDING_APPROVAL:1,WAITING_ACKNOWLEDGE:5,IN_PROGRESS:15}[live];
      if(keepHist)t.hist=t.hist.slice(0,keepHist);
      if(live==='PENDING_APPROVAL'){t.ext=[];t.cm=t.cm.slice(0,1);}
      if(live==='WAITING_ACKNOWLEDGE'){t.ext=[];t.cm=t.cm.slice(0,2);}
      if(live==='IN_PROGRESS'){t.ext=t.ext.slice(0,2);t.cm=t.cm.slice(0,3);}
      if(!ap)t.hist=t.hist.filter(function(h){return h[2]!=='approved'});
      if(!ap&&live==='WAITING_ACKNOWLEDGE')t.hist=t.hist.slice(0,4);
    } else {
      t.as=deriveAs({a:t.a,s:live},null); t.hist=genHist(t);
    }
    t.since=state==='COMPLETED'?0:base.since;
    t.stepDates=null;
    if(base.id==='26-0033'&&state==='PENDING_REVIEW'&&ap)t.stepDates=base.stepDates;
    if(state==='COMPLETED'){
      t.hist.push([TODAY+' 08:30',BOSS,'reviewed']);
      t.ext.forEach(function(e){if(e.st==='PENDING'){e.st='REJECTED';e.auto=1;}});
    }
    if(state==='CANCELLED'){
      /* lifecycle.service.ts:240-247: hủy → mọi người làm (trừ đã chuyển giao/đã từ chối) thành REJECTED */
      Object.keys(t.as).forEach(function(c){var a=t.as[c];if(a.st!=='TRANSFERRED'&&a.st!=='REJECTED'){a.st='REJECTED';a.cx=1;}});
      t.hist.push(['2026-10-21 18:00','CT','cancelled']);
      t.ext.forEach(function(e){if(e.st==='PENDING'){e.st='REJECTED';e.auto=1;}});
    }
    return t;
  }

  window.DATA={TODAY:TODAY,BOSS:BOSS,ADMIN:ADMIN,ME:ME,USERS:USERS,ALL_USERS:ALL_USERS,roleOf:roleOf,normId:normId,
    TEMPLATES:TEMPLATES,templatesFor:templatesFor,tyKey:function(t){return t&&t.ty?TYKEY[t.ty.vi]||'oth':'oth'},
    tasks:tasks,scenario:scenario,addDays:addDays,clone:clone};
})();
