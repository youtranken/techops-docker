/* Dữ liệu mẫu dùng chung cho people.html + permissions.html (Nhân sự & Phân quyền). Classic script, nạp sau app.js.
   Nguồn V1: prisma User (+ UserProfile.department/position/phone), ROLE_LABELS (lib/constants.ts),
   MENU_CONFIG (modules/hr/permissions/config.ts), RoleStatusAction seed (prisma/seed.ts:241-310), ACTION_GROUPS (lib/constants.ts:54). */
(function(){
  function D(vi,en){return {vi:vi,en:en}}
  var INF=D('Hạ tầng & mạng','Infrastructure & network'), SUP=D('Hỗ trợ kỹ thuật','IT support'), SW=D('Phần mềm nội bộ','Internal software'),
      SEC=D('An ninh thông tin','Information security'), IT=D('Phòng IT','IT department'), BOD=D('Ban giám đốc','Board of directors'), HRD=D('Hành chính – Nhân sự','Admin & HR');
  /* st: active | pending (tạo bằng link thiết lập, chưa đặt mật khẩu) | locked (isActive=false)
     last: thời điểm đăng nhập cuối (App.when) hoặc null; tasks: số việc liên quan; mc: mustChangePassword */
  var U=[
    {id:'PQ',n:'Phan Quản trị',u:'pqtri',e:'quantri@pmh.com.vn',r:'ADMIN',d:IT,p:D('Quản trị hệ thống','System administrator'),ph:'0903 100 001',st:'active',last:['min',2],tasks:0,at:'2023-03-01',pw:'2026-09-30'},
    {id:'CT',n:'Cao Thuận',u:'cthuan',e:'cao.thuan@pmh.com.vn',r:'BOSS',d:IT,p:D('Phó phòng IT','Deputy head of IT'),ph:'0903 118 204',st:'active',last:['min',4],tasks:5,at:'2023-03-06',pw:'2026-07-14'},
    {id:'VH',ini:'TH',c:'#5f3dc4',n:'Vũ Thị Hạnh',u:'vthanh',e:'hanh.vu@pmh.com.vn',r:'BOSS',d:BOD,p:D('Phó giám đốc vận hành','Deputy COO'),ph:'0912 450 337',st:'active',last:['yday','17:42'],tasks:3,at:'2023-03-06',pw:'2026-05-02'},
    {id:'PD',n:'Phạm Đức',u:'pduc',e:'duc.pham@pmh.com.vn',r:'EMPLOYEE',d:INF,p:D('Trưởng nhóm hạ tầng','Infrastructure lead'),ph:'0988 204 116',st:'active',last:['hour',1],tasks:11,at:'2023-04-17',pw:'2026-08-30'},
    {id:'NH',n:'Nguyễn Hương',u:'nhuong',e:'huong.nguyen@pmh.com.vn',r:'EMPLOYEE',d:SUP,p:D('Chuyên viên hỗ trợ','Support specialist'),ph:'0935 662 018',st:'active',last:['min',12],tasks:9,at:'2024-01-08',pw:'2026-09-11'},
    {id:'TA',n:'Trần An',u:'tan',e:'an.tran@pmh.com.vn',r:'EMPLOYEE',d:INF,p:D('Kỹ sư mạng','Network engineer'),ph:'0977 310 552',st:'active',last:['hour',2],tasks:7,at:'2024-02-19',pw:'2026-06-20'},
    {id:'LM',n:'Lê Minh',u:'lminh',e:'minh.le@pmh.com.vn',r:'EMPLOYEE',d:SW,p:D('Lập trình viên','Developer'),ph:'0909 771 245',st:'active',last:['now'],tasks:8,at:'2024-03-04',pw:'2026-10-01'},
    {id:'DK',n:'Đỗ Khoa',u:'dkhoa',e:'khoa.do@pmh.com.vn',r:'EMPLOYEE',d:SEC,p:D('Chuyên viên an ninh','Security analyst'),ph:'0918 005 763',st:'active',last:['yday','09:15'],tasks:4,at:'2024-05-13',pw:'2026-04-28'},
    {id:'u08',c:'#1971c2',n:'Hoàng Văn Nam',u:'hvnam',e:'nam.hoang@pmh.com.vn',r:'EMPLOYEE',d:SUP,p:D('Kỹ thuật viên','Technician'),ph:'0966 120 449',st:'active',last:['hour',5],tasks:12,at:'2024-06-03',pw:'2025-11-02',mc:1},
    {id:'u09',c:'#d6336c',n:'Bùi Ngọc Lan',u:'bnlan',e:'lan.bui@pmh.com.vn',r:'EMPLOYEE',d:SW,p:D('Kiểm thử phần mềm','QA engineer'),ph:'0903 557 812',st:'active',last:'2026-10-20 16:05',tasks:5,at:'2024-08-12',pw:'2026-08-08'},
    {id:'u10',c:'#495057',n:'Đặng Quốc Bảo',u:'dqbao',e:'bao.dang@pmh.com.vn',r:'EMPLOYEE',d:INF,p:D('Kỹ thuật viên hạ tầng','Infrastructure technician'),ph:'0984 662 190',st:'locked',last:'2026-08-29 10:12',tasks:14,at:'2023-09-25',pw:'2026-02-14'},
    {id:'u11',c:'#0b7285',n:'Phan Thu Trang',u:'pttrang',e:'trang.phan@pmh.com.vn',r:'EMPLOYEE',d:HRD,p:D('Chuyên viên nhân sự','HR specialist'),ph:'0938 404 271',st:'pending',last:null,tasks:0,at:'2026-10-21',pw:null},
    {id:'u12',c:'#e67700',n:'Ngô Minh Tuấn',u:'nmtuan',e:'tuan.ngo@pmh.com.vn',r:'EMPLOYEE',d:SUP,p:D('Kỹ thuật viên','Technician'),ph:'0972 883 640',st:'active',last:['min',38],tasks:10,at:'2024-10-07',pw:'2026-07-30'},
    {id:'u13',c:'#a61e4d',n:'Lý Hoàng Yến',u:'lhyen',e:null,r:'EMPLOYEE',d:SEC,p:D('Thực tập sinh','Intern'),ph:'',st:'active',last:'2026-10-19 08:47',tasks:1,at:'2026-09-15',pw:'2026-09-15',mc:1},
    {id:'u14',c:'#868e96',n:'Trịnh Gia Huy',u:'tghuy',e:'huy.trinh@pmh.com.vn',r:'EMPLOYEE',d:SW,p:D('Lập trình viên','Developer'),ph:'0907 221 908',st:'locked',last:'2026-06-30 17:20',tasks:0,at:'2025-12-01',pw:'2026-01-05'},
    {id:'u15',c:'#2f9e44',n:'Mai Anh Thư',u:'mathu',e:'thu.mai@pmh.com.vn',r:'EMPLOYEE',d:SUP,p:D('Chuyên viên hỗ trợ','Support specialist'),ph:'0919 640 335',st:'active',last:['yday','14:02'],tasks:4,at:'2025-03-10',pw:'2026-09-02'}
  ];
  /* Chữ viết tắt theo getInitials của V1 (UserTable.tsx:29) */
  function initials(n){var w=n.trim().split(/\s+/);if(w.length===1)return w[0].slice(0,2).toUpperCase();if(w.length===2)return (w[0][0]+w[1][0]).toUpperCase();return (w[1][0]+w[w.length-1][0]).toUpperCase()}
  U.forEach(function(x){
    var P=I18N.PEOPLE[x.id];
    if(P){x.n=P[0];x.c=P[1];x.ini=x.id;} else x.ini=x.ini||initials(x.n);
  });

  /* Menu × tính năng — MENU_CONFIG (modules/hr/permissions/config.ts). 'tasks' là menu lõi (không có trong MENU_CONFIG → luôn bật). */
  var MENUS=[
    {k:'tasks',i:'tasks',core:1,f:[]},
    {k:'logs',i:'history',f:['task_activity','user_activity']},
    {k:'analytics',i:'chart',f:[]},
    {k:'helpdesk',i:'headset',f:[]},
    {k:'hr',i:'users',f:['edit','change_password','deactivate','delete']},
    {k:'settings',i:'settings',f:['priorities','task_types','completion_templates','profile','notifications'],smtp:1}
  ];
  /* V1: quyền menu đặt THEO TỪNG NHÂN VIÊN (SidebarPermission, 1 bản ghi / người). Chưa có bản ghi → mặc định
     DEFAULT_MENUS / DEFAULT_FEATURES (api/hr/sidebar-permissions/route.ts:7-11). Chỉ áp cho EMPLOYEE đang hoạt động;
     ADMIN/BOSS luôn đủ quyền (settings-guard.ts:59). 'tasks' là menu lõi, luôn bật. */
  var EMP_MENU={menus:['tasks','logs','analytics','helpdesk','hr'],feat:{logs:['task_activity','user_activity'],hr:['edit','change_password','deactivate','delete']}};
  /* Bản ghi riêng mẫu (người không có ở đây dùng EMP_MENU) */
  var PERM={
    LM:{menus:['tasks','logs','analytics','helpdesk','hr','settings'],feat:{logs:['task_activity'],hr:['edit'],settings:['completion_templates','profile','notifications']}},
    NH:{menus:['tasks','logs','helpdesk','hr'],feat:{logs:['task_activity','user_activity'],hr:['edit']}},
    u12:{menus:['tasks','logs','analytics','helpdesk','hr'],feat:{logs:['task_activity'],hr:['edit']}}
  };
  /* PHASE B — Cột vai trò trên tab "Theo vai trò" (logic mới, V1 không có). lock = luôn đủ quyền (ADMIN/BOSS);
     planned = vai trò dự kiến (MANAGER), chỉ để xem bố cục. */
  var PM_ROLES=[{k:'EMPLOYEE'},{k:'MANAGER',planned:1},{k:'BOSS',lock:1},{k:'ADMIN',lock:1}];
  var ROLE_MENU={EMPLOYEE:EMP_MENU,
    MANAGER:{menus:['tasks','logs','analytics','helpdesk','hr','settings'],feat:{logs:['task_activity','user_activity'],hr:['edit','change_password','deactivate'],settings:['priorities','task_types','completion_templates','profile']}}};

  /* Quyền công việc — ACTION_GROUPS (lib/constants.ts:54-59), STATUS_ORDER, WORKFLOW_ORDER */
  var ACTIONS=[['basic',['VIEW','EDIT','DELETE','CANCEL']],['flow',['ACKNOWLEDGE','COMPLETE','TRANSFER','REJECT']],['boss',['APPROVE','REJECT_REVIEW','REASSIGN','TOGGLE_FORCE_MODE']],['ext',['REQUEST_EXTENSION','APPROVE_EXTENSION','WITHDRAW_EXTENSION']]];
  var STATUSES=['DRAFT','PENDING_APPROVAL','WAITING_ACKNOWLEDGE','IN_PROGRESS','PENDING_REVIEW','COMPLETED','CANCELLED'];
  var MODES=['IMMEDIATE','NEED_APPROVAL'];
  /* RoleStatusAction seed (prisma/seed.ts:241-310). '!' = isForceModeLocked */
  function rs(o){var m={};Object.keys(o).forEach(function(s){m[s]=o[s].split(' ')});return m}
  var BOSS_I=rs({DRAFT:'VIEW EDIT',PENDING_APPROVAL:'VIEW APPROVE CANCEL',WAITING_ACKNOWLEDGE:'VIEW EDIT CANCEL TOGGLE_FORCE_MODE',IN_PROGRESS:'VIEW EDIT CANCEL TOGGLE_FORCE_MODE',PENDING_REVIEW:'VIEW APPROVE REJECT_REVIEW',COMPLETED:'VIEW',CANCELLED:'VIEW'});
  var BOSS_N=rs({DRAFT:'VIEW EDIT',PENDING_APPROVAL:'VIEW APPROVE CANCEL EDIT',WAITING_ACKNOWLEDGE:'VIEW EDIT CANCEL TOGGLE_FORCE_MODE',IN_PROGRESS:'VIEW EDIT CANCEL TOGGLE_FORCE_MODE',PENDING_REVIEW:'VIEW APPROVE REJECT_REVIEW',COMPLETED:'VIEW',CANCELLED:'VIEW'});
  var EMP_I=rs({DRAFT:'VIEW EDIT',WAITING_ACKNOWLEDGE:'VIEW ACKNOWLEDGE REJECT! EDIT',IN_PROGRESS:'VIEW COMPLETE TRANSFER! REQUEST_EXTENSION',PENDING_REVIEW:'VIEW',COMPLETED:'VIEW',CANCELLED:'VIEW'});
  var EMP_N=rs({DRAFT:'VIEW EDIT',PENDING_APPROVAL:'VIEW CANCEL EDIT',WAITING_ACKNOWLEDGE:'VIEW ACKNOWLEDGE REJECT! EDIT',IN_PROGRESS:'VIEW COMPLETE TRANSFER! REQUEST_EXTENSION',PENDING_REVIEW:'VIEW',COMPLETED:'VIEW',CANCELLED:'VIEW'});
  var ROLE_ACT={BOSS:{IMMEDIATE:BOSS_I,NEED_APPROVAL:BOSS_N},EMPLOYEE:{IMMEDIATE:EMP_I,NEED_APPROVAL:EMP_N}};
  /* roleHas(role,mode,status,action) → 0 không có · 1 có · 2 có nhưng khoá khi chế độ Bắt buộc */
  function roleHas(r,m,s,a){var l=((ROLE_ACT[r]||{})[m]||{})[s]||[];if(l.indexOf(a+'!')>-1)return 2;return l.indexOf(a)>-1?1:0}

  /* PHASE B — Quyền công việc riêng (UserStatusAction GRANT/REVOKE). V1 có API (ADMIN) nhưng KHÔNG có hiệu lực:
     trang /hr/users/[id]/permissions trả 404, không API nào gọi requirePermission. task: {'MODE|STATUS|ACTION':'g'|'r'} */
  var OVR={
    LM:{task:{'IMMEDIATE|IN_PROGRESS|TRANSFER':'r','NEED_APPROVAL|IN_PROGRESS|TRANSFER':'r'}},
    TA:{task:{'IMMEDIATE|IN_PROGRESS|REASSIGN':'g'}}
  };

  /* Lịch sử hoạt động mẫu — UserAction enum (prisma/schema.prisma:549) */
  function hist(x){
    if(x.st==='pending')return [['CREATE_USER','2026-10-21 09:30','PQ','10.10.4.21'],['PASSWORD_RESET_REQUESTED','2026-10-21 09:30','PQ','10.10.4.21']];
    var ip='10.10.'+(x.id.length*7%40+2)+'.'+(x.n.length*11%200+10);
    var h=[];
    if(x.st==='locked')h.push(['DEACTIVATE_USER','2026-09-02 08:10','PQ','10.10.4.21']);
    h.push(['LOGIN',x.last,null,ip]);
    if(x.mc)h.push(['RESET_PASSWORD','2026-10-14 11:20','PQ','10.10.4.21']);
    h.push(['LOGIN_FAILED','2026-10-14 08:02',null,ip],['UPDATE_USER','2026-09-18 15:44','PQ','10.10.4.21'],['PASSWORD_CHANGED_SELF',(x.pw||x.at)+' 08:30',null,ip],['CREATE_USER',x.at+' 09:00','PQ','10.10.4.21']);
    return h;
  }

  window.PPDATA={users:function(){return JSON.parse(JSON.stringify(U))},MENUS:MENUS,EMP_MENU:EMP_MENU,PM_ROLES:PM_ROLES,ROLE_MENU:ROLE_MENU,ACTIONS:ACTIONS,STATUSES:STATUSES,MODES:MODES,roleHas:roleHas,
    overrides:function(){return JSON.parse(JSON.stringify(OVR))},perms:function(){return JSON.parse(JSON.stringify(PERM))},
    /* quyền menu hiệu lực của 1 người: ADMIN/BOSS → null (đủ quyền); EMPLOYEE → bản ghi riêng hoặc mặc định */
    menuOf:function(id){var u=U.filter(function(x){return x.id===id})[0];if(!u||u.r!=='EMPLOYEE')return null;return JSON.parse(JSON.stringify(PERM[id]||EMP_MENU))},
    /* Menu mà NGƯỜI ĐANG XEM (nhân viên) thực sự mở được: bản ghi theo người ∩ công tắc preview "Nhân viên được cấp menu" của khung (App.canSeeMenu) */
    myMenu:function(){if(this.myRole()!=='EMPLOYEE')return null;var m=this.menuOf(this.meId())||{menus:['tasks'],feat:{}};
      if(App.canSeeMenu)m.menus=m.menus.filter(function(k){return k==='tasks'||App.canSeeMenu(k)});return m},
    /* Vai trò preview → vai trò V1. Chờ agent lõi thêm App.isAdmin; tạm dùng App.role==='admin'. */
    myRole:function(){if(App.roleCode)return App.roleCode();return (App.isAdmin?App.isAdmin():App.role==='admin')?'ADMIN':App.isBoss()?'BOSS':'EMPLOYEE'},
    meId:function(){var r=this.myRole(), m=App.me(), u=U.filter(function(x){return x.id===m})[0];return u&&u.r===r?m:{ADMIN:'PQ',BOSS:'CT',EMPLOYEE:'LM'}[r]},
    /* Nhãn "Phase B": phần cần backend mới hoặc đổi logic so với V1 */
    pb:function(tip){return '<span class="phase-b" title="'+App.esc(tip||I18N.t('pp.pbT'))+'">'+App.esc(I18N.t('pp.phaseB'))+'</span>'},
    hist:hist,ROLES:['ADMIN','BOSS','EMPLOYEE'],
    av:function(u,cls){return '<span class="av '+(cls||'')+'" style="background:'+u.c+'" aria-hidden="true">'+u.ini+'</span>'},
    POLICY:{minLength:8,upper:1,lower:1,number:1,special:0}};
})();
