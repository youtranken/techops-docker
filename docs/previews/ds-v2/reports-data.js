/* TechOps DS v2 — dữ liệu + phép tính mẫu cho 2 trang Báo cáo (reports.html, reports-tasks.html). Classic script, nạp SAU data.js.
   Mô phỏng đúng công thức V1 (src/modules/analytics/services/analytics/*.query.ts):
   - kpi.query: tổng/hoàn thành/đang làm/chờ/quá hạn/gia hạn — lọc theo NGÀY TẠO trong kỳ
   - monthly-overview.query: tạo mới theo ngày tạo, hoàn thành theo ngày xong, đúng hạn = xong đúng hạn / xong trong tháng
   - performance.query + task-list.query: theo PHÂN CÔNG (mỗi người × mỗi việc), chỉ nhân viên
   - funnel.query: 5 bước; "Chờ nghiệm thu" chỉ tính việc Phê duyệt
   - task-type-time.query: TB ngày hoàn thành theo loại (làm tròn lên)
   Dữ liệu sinh tất định (seed cố định) từ 01/09/2025 tới DATA.TODAY, cộng 10 việc thật của data.js (để mở được ngăn chi tiết).
   Port: thay bằng API /api/analytics/* — giữ hình dạng object để dễ đối chiếu. */
(function(){
  var TODAY=DATA.TODAY, START='2025-09-01';
  var EMP=['LM','PD','NH','TA','DK'], EW=[.26,.22,.2,.18,.14];
  /* ---------- ngày ---------- */
  function d2i(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function i2d(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}
  function add(s,n){var d=i2d(s);d.setDate(d.getDate()+n);return d2i(d)}
  function diff(a,b){return Math.round((i2d(b)-i2d(a))/864e5)}
  function eom(y,m){return d2i(new Date(y,m,0))}
  /* ---------- sinh số ngẫu nhiên tất định ---------- */
  var seed=20261022;
  function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}
  function ri(a,b){return a+Math.floor(rnd()*(b-a+1))}
  function pickW(arr,w){var r=rnd(),s=0;for(var i=0;i<arr.length;i++){s+=w[i];if(r<s)return arr[i]}return arr[arr.length-1]}
  function pick(arr){return arr[Math.floor(rnd()*arr.length)]}

  /* ---------- từ điển dữ liệu (dữ liệu người dùng nhập → viết thẳng {vi,en}) ---------- */
  var TYPES={sup:{vi:'Hỗ trợ',en:'Support'},hw:{vi:'Phần cứng',en:'Hardware'},sw:{vi:'Phần mềm',en:'Software'},net:{vi:'Mạng',en:'Network'},sec:{vi:'Bảo mật',en:'Security'},acc:{vi:'Tài khoản',en:'Accounts'},oth:{vi:'Khác',en:'Other'}};
  var TK=['sup','hw','sw','net','sec','acc','oth'], TW=[.31,.15,.18,.12,.08,.12,.04], TF={sup:.6,hw:1.1,sw:.85,net:1.45,sec:1.3,acc:.45,oth:1.2};
  var DEPT=[['Kế toán','Accounting'],['Nhân sự','HR'],['Kinh doanh','Sales'],['Kho','Warehouse'],['Marketing','Marketing'],['Chăm sóc khách hàng','Customer Care'],['Ban Giám đốc','Executive']];
  var APPS=['MISA','Microsoft 365','AutoCAD','Foxit PDF','Zoom'];
  var MEN=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var TPL={
    sup:[['Máy in phòng {d} không in được','{D} printer won’t print'],['Hỗ trợ kết nối máy chiếu phòng họp tầng {f}','Help connect the projector on floor {f}'],['Outlook phòng {d} không nhận thư mới','Outlook in {D} isn’t receiving new mail'],['Máy tính phòng {d} khởi động chậm','Slow startup on a {D} PC'],['Không truy cập được ổ chia sẻ phòng {d}','{D} can’t reach the shared drive']],
    hw:[['Thay bàn phím, chuột cho {n} máy phòng {d}','Replace keyboards and mice on {n} {D} PCs'],['Nâng RAM cho {n} máy phòng {d}','Upgrade RAM on {n} {D} PCs'],['Thay pin UPS phòng máy chủ','Replace UPS batteries in the server room'],['Lắp màn hình thứ hai cho phòng {d}','Fit second monitors for {D}']],
    sw:[['Cài {a} cho {n} nhân viên phòng {d}','Install {a} for {n} {D} staff'],['Cập nhật Windows tháng {m} cho phòng {d}','Apply {M} Windows updates for {D}'],['Gia hạn bản quyền {a}','Renew the {a} licence']],
    net:[['Kéo thêm {n} điểm mạng cho phòng {d}','Add {n} network points for {D}'],['Wi-Fi tầng {f} chập chờn','Patchy Wi-Fi on floor {f}'],['Tách VLAN riêng cho camera tầng {f}','Put floor {f} cameras on their own VLAN']],
    sec:[['Rà soát quyền thư mục chia sẻ phòng {d}','Review {D} shared-folder permissions'],['Kiểm tra cảnh báo mã độc trên máy phòng {d}','Check a malware alert on a {D} PC'],['Sao lưu cấu hình firewall tháng {m}','Back up the firewall config — {M}']],
    acc:[['Tạo tài khoản cho {n} nhân viên mới phòng {d}','Create accounts for {n} new {D} staff'],['Thu hồi tài khoản nhân viên nghỉ việc phòng {d}','Revoke accounts for a {D} leaver'],['Đặt lại mật khẩu email cho phòng {d}','Reset an email password for {D}']],
    oth:[['Kiểm kê thiết bị IT phòng {d}','IT asset count for {D}'],['Chuẩn bị thiết bị cho hội nghị khách hàng','Set up equipment for the customer conference']]
  };
  function mkTitle(tk,created){
    var t=pick(TPL[tk]), d=pick(DEPT), n=ri(2,12), f=ri(2,6), a=pick(APPS), m=+created.split('-')[1];
    function f1(s,en){return s.split('{d}').join(d[0]).split('{D}').join(d[1]).split('{n}').join(n).split('{f}').join(f).split('{a}').join(a).split('{m}').join(m).split('{M}').join(MEN[m-1])}
    return {vi:f1(t[0]),en:f1(t[1])};
  }

  /* ---------- sinh việc ---------- */
  var REAL=DATA.tasks(), REALID={};
  REAL.forEach(function(t){REALID[t.id]=1});
  var ALL=null;
  function gen(){
    var list=[], d=START;
    while(d<=TODAY){
      var wd=i2d(d).getDay();
      if(wd!==0){
        var mean=(d<'2026-01-01'?2.8:3.45)*(wd===6?.35:1);
        var n=Math.max(0,Math.round(mean+(rnd()+rnd()+rnd()-1.5)*1.6));
        if(d===TODAY)n=Math.min(n,2);
        for(var i=0;i<n;i++)list.push(one(d));
      }
      d=add(d,1);
    }
    /* mã việc như V1 (task-create.service.ts generateTaskCode): "YY-NNNN", đếm lại từ 0001 mỗi năm; chừa mã của việc thật */
    var no={}, yy;
    list.forEach(function(t){yy=t.cr.slice(2,4);no[yy]=no[yy]||1;while(REALID[yy+'-'+String(no[yy]).padStart(4,'0')])no[yy]++;t.id=yy+'-'+String(no[yy]).padStart(4,'0');no[yy]++;});
    REAL.forEach(function(r){list.push(fromReal(r))});
    list.sort(function(a,b){return a.cr<b.cr?-1:a.cr>b.cr?1:(a.id<b.id?-1:1)});
    return list;
  }
  function one(cr){
    var tk=pickW(TK,TW), p=pickW(['urgent','high','normal','low'],[.08,.22,.55,.15]);
    var dur={urgent:ri(1,2),high:ri(2,4),normal:ri(3,7),low:ri(5,12)}[p];
    var t={id:'',t:mkTitle(tk,cr),tk:tk,p:p,cr:cr,due:add(cr,dur),approval:rnd()<.35?1:0,force:0,done:null,cx:null,a:[],ext:0,real:0};
    if(t.approval&&rnd()<.12)t.force=1;
    var age=diff(cr,TODAY);
    var late=rnd()<.085, actual=late?dur+ri(1,4):Math.max(0,Math.round(dur*(.3+rnd()*.7)*TF[tk]*1.05));
    if(!late&&actual>dur)actual=dur;
    var doneD=add(cr,actual), stuck=age>8&&rnd()<.02;
    if(rnd()<.025){t.s='CANCELLED';t.cx=add(cr,Math.min(age,ri(0,dur)));}
    else if(!stuck&&doneD<TODAY){t.s='COMPLETED';t.done=doneD;}
    else{
      var fr=stuck?.5:age/Math.max(1,actual);
      if(t.approval&&age<=1&&rnd()<.5)t.s='PENDING_APPROVAL';
      else if(fr<.2&&!stuck)t.s='WAITING_ACKNOWLEDGE';
      else if(fr<.85||!t.approval)t.s='IN_PROGRESS';
      else t.s='PENDING_REVIEW';
      if(t.s!=='PENDING_APPROVAL'&&rnd()<.12)t.ext=1;
    }
    var k=pickW([1,2,3],[.7,.22,.08]), pool=EMP.slice(), ws=EW.slice();
    for(var i=0;i<k;i++){
      var c=pickW(pool,norm(ws)), j=pool.indexOf(c); pool.splice(j,1); ws.splice(j,1);
      t.a.push(asg(t,c,i));
    }
    /* đổi người: một người từ chối hoặc chuyển giao, người khác làm thay (hai dòng phân công) */
    if(pool.length&&t.s!=='PENDING_APPROVAL'&&t.s!=='WAITING_ACKNOWLEDGE'){
      var r=rnd();
      if(r<.035)t.a.unshift({c:pickW(pool,norm(ws)),st:'REJECTED',ack:t.cr,done:null});
      else if(r<.06)t.a.unshift({c:pickW(pool,norm(ws)),st:'TRANSFERRED',ack:t.cr,done:null});
    }
    return t;
  }
  function norm(w){var s=w.reduce(function(a,b){return a+b},0);return w.map(function(x){return x/s})}
  function asg(t,c,i){
    var ack=add(t.cr,rnd()<.6?0:1); if(ack>TODAY)ack=TODAY;
    var st={PENDING_APPROVAL:'PENDING',WAITING_ACKNOWLEDGE:'PENDING',PENDING_REVIEW:'COMPLETED',COMPLETED:'COMPLETED'}[t.s];
    if(t.s==='IN_PROGRESS'){var r=rnd();st=r<.9?'IN_PROGRESS':t.approval?'REVISION_REQUIRED':'IN_PROGRESS';if(i>0&&rnd()<.3)st='COMPLETED';}
    if(t.s==='CANCELLED')st='IN_PROGRESS';
    var done=null;
    if(st==='COMPLETED'){done=t.done?add(t.done,i&&rnd()<.4?-1:0):add(TODAY,-ri(0,1));if(done<ack)done=ack;}
    return {c:c,st:st,ack:ack,done:done};
  }
  function fromReal(r){
    var due=r.due===null?null:r.due==='ok'?'2026-10-23':typeof r.due==='string'?r.due:add(TODAY,r.due);
    var t={id:r.id,t:r.t,tk:{'Mạng':'net','Phần cứng':'hw','Hỗ trợ':'sup','Phần mềm':'sw','Bảo mật':'sec','Tài khoản':'acc'}[r.ty.vi]||'oth',p:r.p,s:r.s,cr:r.at,due:due,approval:r.approval?1:0,force:0,
      done:r.s==='COMPLETED'?'2026-10-22':null,cx:r.s==='CANCELLED'?TODAY:null,ext:(r.ext||[]).some(function(e){return e.st==='PENDING'})?1:0,real:1,a:[]};
    r.a.forEach(function(c){var s=(r.as[c]||{}).st||'PENDING';t.a.push({c:c,st:s,ack:add(r.at,1)>TODAY?TODAY:add(r.at,1),done:s==='COMPLETED'?'2026-10-21':null})});
    return t;
  }
  function tasks(){if(!ALL)ALL=gen();return ALL}

  /* ---------- kỳ báo cáo ---------- */
  /* P = {pr:'month'|'quarter'|'year'|'custom', y, m, q, a, b} → a/b là ISO */
  function norm2(P){
    var y=+P.y||2026, o={pr:P.pr||'month',y:y};
    if(o.pr==='month'){o.m=+P.m||10;o.a=y+'-'+String(o.m).padStart(2,'0')+'-01';o.b=eom(y,o.m);}
    else if(o.pr==='quarter'){o.q=+P.q||4;var m0=(o.q-1)*3+1;o.a=y+'-'+String(m0).padStart(2,'0')+'-01';o.b=eom(y,m0+2);}
    else if(o.pr==='year'){o.a=y+'-01-01';o.b=y+'-12-31';}
    else {o.a=P.a||'2026-10-01';o.b=P.b||TODAY;}
    return o;
  }
  /* Kỳ trước như V1 (analytics/page.tsx:84-93): lùi ĐÚNG SỐ NGÀY của kỳ đang xem, với mọi kiểu kỳ.
     VD tháng 10 (31 ngày) → 31/08–30/09, không phải "tháng 9". (Bản đề xuất "kỳ lịch liền trước" đã bỏ, trả về V1.) */
  function prev(P){
    var len=diff(P.a,P.b)+1;return norm2({pr:'custom',a:add(P.a,-len),b:add(P.a,-1)});
  }
  function months(){return I18N.t('rp.months').split(',')}
  function label(P){
    var T=I18N.t;
    if(P.pr==='month')return T('rp.lbl.month',{n:P.m,y:P.y,mon:I18N.t('rp.monthsLong').split(',')[P.m-1]});
    if(P.pr==='quarter')return T('rp.lbl.quarter',{q:P.q,y:P.y});
    if(P.pr==='year')return T('rp.lbl.year',{y:P.y});
    return T('rp.lbl.range',{a:App.dt(P.a),b:App.dt(P.b)});
  }
  /* tên tệp như V1 (useExportPdf.getPeriodFilename / task-list buildPeriodLabel) */
  function fileTag(P){
    if(P.pr==='month')return 'Thang-'+P.m+'-'+P.y;
    if(P.pr==='quarter')return 'Quy-'+P.q+'-'+P.y;
    if(P.pr==='year')return 'Nam-'+P.y;
    return P.a.split('-').reverse().join('')+'-'+P.b.split('-').reverse().join('');
  }
  function fromQuery(q){
    var s=new URLSearchParams(q||location.search);
    return norm2({pr:s.get('pr')||'month',y:s.get('y'),m:s.get('m'),q:s.get('q'),a:s.get('a'),b:s.get('b')});
  }
  function toQuery(P){
    var o={pr:P.pr};
    if(P.pr==='custom'){o.a=P.a;o.b=P.b;} else {o.y=P.y; if(P.pr==='month')o.m=P.m; if(P.pr==='quarter')o.q=P.q;}
    return new URLSearchParams(o).toString();
  }

  /* ---------- định dạng số ---------- */
  function loc(){return I18N.lang==='vi'?'vi-VN':'en-US'}
  function n(x){return Number(x).toLocaleString(loc())}
  function pct(x,dec){if(dec===undefined)dec=1;return Number(x).toLocaleString(loc(),{maximumFractionDigits:dec,minimumFractionDigits:0})+'%'}
  function num1(x){return Number(x).toLocaleString(loc(),{maximumFractionDigits:1})}
  /* làm tròn như V1: tỉ lệ hoàn thành KPI .toFixed(1) (page.tsx:155) · đúng hạn/gia hạn/tháng/theo người Math.round(…*100) số nguyên (*.query.ts) */
  function rate(a,b){return b>0?Math.round(a/b*1000)/10:0}
  function r0(a,b){return b>0?Math.round(a/b*100):0}
  function pct1(x){return Number(x).toLocaleString(loc(),{maximumFractionDigits:1,minimumFractionDigits:1})+'%'}

  /* ---------- phép tính ---------- */
  function inRange(P){if(window.RP&&RP.EMPTY)return [];return tasks().filter(function(t){return t.cr>=P.a&&t.cr<=P.b})}
  var OPEN={PENDING:1,ACKNOWLEDGED:1,IN_PROGRESS:1,REVISION_REQUIRED:1}; /* AssigneeStatus V1 (performance.query.ts ACTIVE_STATUSES) */
  function isOver(t){return t.due&&t.s!=='COMPLETED'&&t.s!=='CANCELLED'&&t.due<TODAY}
  /* KpiData (kpi.query.ts) */
  function kpi(P){
    var L=inRange(P), by={}, pr={urgent:0,high:0,normal:0,low:0}, done=L.filter(function(t){return t.s==='COMPLETED'});
    L.forEach(function(t){by[t.s]=(by[t.s]||0)+1;pr[t.p]++;});
    var ot=done.filter(function(t){return !t.due||t.done<=t.due}).length;
    var days=done.reduce(function(s,t){return s+Math.max(0,diff(t.cr,t.done))},0);
    var ext=L.filter(function(t){return t.ext}).length;
    return {total:L.length,done:done.length,cancelled:by.CANCELLED||0,over:L.filter(isOver).length,
      prog:by.IN_PROGRESS||0,wait:(by.PENDING_REVIEW||0)+(by.WAITING_ACKNOWLEDGE||0),waitAck:by.WAITING_ACKNOWLEDGE||0,waitRev:by.PENDING_REVIEW||0,
      ext:ext,extRate:r0(ext,L.length),onTime:r0(ot,done.length),avgDays:done.length?Math.round(days/done.length*10)/10:0,
      byStatus:by,byPriority:pr,flow:{direct:L.filter(function(t){return !t.approval}).length,approval:L.filter(function(t){return t.approval}).length},
      force:L.filter(function(t){return t.force}).length};
  }
  /* DrillDown như V1 (api/analytics/drilldown/route.ts:39-75): "Hoàn thành" lọc theo NGÀY XONG trong kỳ (completedAt), các loại khác theo ngày tạo;
     "Quá hạn" = Chờ duyệt/Chờ nhận/Đang làm/Chờ nghiệm thu có hạn < hôm nay; tối đa 100 dòng. Vì vậy số dòng có thể khác số trên thẻ KPI (KPI đếm theo ngày tạo) — đúng V1. */
  function drill(P,type){
    var L=type==='done'?(RP.EMPTY?[]:tasks().filter(function(t){return t.s==='COMPLETED'&&t.done>=P.a&&t.done<=P.b})):inRange(P).filter({total:function(){return true},prog:function(t){return t.s==='IN_PROGRESS'},
      wait:function(t){return t.s==='PENDING_REVIEW'||t.s==='WAITING_ACKNOWLEDGE'},over:function(t){return isOver(t)&&['IN_PROGRESS','PENDING_REVIEW','PENDING_APPROVAL','WAITING_ACKNOWLEDGE'].indexOf(t.s)>-1}}[type]);
    return L.sort(type==='over'?function(a,b){return a.due<b.due?-1:1}:function(a,b){return a.cr>b.cr?-1:a.cr<b.cr?1:(a.id>b.id?-1:1)}).slice(0,100);
  }
  /* MonthlyOverview (monthly-overview.query.ts) */
  function monthly(y){
    var r=[];for(var i=0;i<12;i++)r.push({m:i+1,created:0,done:0,ot:0,cancelled:0,future:(y+'-'+String(i+1).padStart(2,'0'))>TODAY.slice(0,7)});
    if(!RP.EMPTY)tasks().forEach(function(t){
      if(+t.cr.slice(0,4)===y)r[+t.cr.slice(5,7)-1].created++;
      if(t.s==='COMPLETED'&&+t.done.slice(0,4)===y){var o=r[+t.done.slice(5,7)-1];o.done++;if(t.done<=t.due)o.ot++;}
      if(t.s==='CANCELLED'&&t.cx&&+t.cx.slice(0,4)===y)r[+t.cx.slice(5,7)-1].cancelled++;
    });
    r.forEach(function(o){o.onTime=o.done?r0(o.ot,o.done):null});
    return r;
  }
  /* Phân công (task-list.query.ts) — mỗi người × mỗi việc, chỉ nhân viên */
  function rows(P){
    var out=[];
    inRange(P).forEach(function(t){t.a.forEach(function(a,i){
      if(EMP.indexOf(a.c)<0)return;
      out.push({k:t.id+'-'+a.c+'-'+i,t:t,c:a.c,st:a.st,cr:t.cr,ack:a.ack,due:t.due,done:a.done,
        days:a.done?Math.max(0,diff(a.ack,a.done)):null,onTime:a.done?(t.due?a.done<=t.due:true):null,
        over:!a.done&&OPEN[a.st]&&t.s!=='CANCELLED'&&!!t.due&&t.due<TODAY});
    })});
    return out;
  }
  /* UserPerformance (performance.query.ts) — bỏ việc đã hủy, chỉ nhân viên.
     Đúng hạn theo người như V1 (performance.query.ts:83-87): số phân công xong đúng hạn / TỔNG số phân công (không phải / số đã xong), số nguyên.
     Tỉ lệ hoàn thành = xong / tổng, số nguyên (PerformanceTable.tsx:69). Nhân viên được cấp menu chỉ thấy dòng của mình (performance/route.ts:14). */
  function perf(P){
    var m={};
    rows(P).forEach(function(r){
      if(r.t.s==='CANCELLED')return;
      var o=m[r.c]||(m[r.c]={c:r.c,total:0,done:0,ot:0,prog:0,over:0,rej:0,trans:0});
      o.total++;
      if(r.st==='COMPLETED'){o.done++;if(r.onTime)o.ot++;}
      else if(r.st==='REJECTED')o.rej++;
      else if(r.st==='TRANSFERRED')o.trans++;
      else if(OPEN[r.st]){o.prog++;if(r.over)o.over++;}
    });
    var me=window.App&&!App.isBoss()?App.me():null;
    return Object.keys(m).filter(function(k){return !me||k===me}).map(function(k){var o=m[k];o.rate=r0(o.done,o.total);o.onTime=r0(o.ot,o.total);return o});
  }
  /* Research (research.service.ts): việc quá hạn + cân bằng khối lượng — trang V1 /analytics/research */
  function overdue(a,b){ /* hạn < hôm nay, chưa Xong/Hủy; lọc ngày tạo nếu có; sắp theo hạn tăng dần */
    if(RP.EMPTY)return [];
    return tasks().filter(function(t){return t.due&&t.due<TODAY&&t.s!=='COMPLETED'&&t.s!=='CANCELLED'&&(!a||t.cr>=a)&&(!b||t.cr<=b)})
      .map(function(t){return {t:t,days:diff(t.due,TODAY)}}).sort(function(x,y){return x.t.due<y.t.due?-1:x.t.due>y.t.due?1:0});
  }
  function workload(){ /* mọi dòng phân công của việc chưa Xong/Hủy/Nháp. "Chờ" = PENDING_APPROVAL + PENDING_REVIEW — V1 ghi nhầm 'WAITING_ACK' nên việc Chờ nhận KHÔNG được đếm (giữ đúng V1) */
    if(RP.EMPTY)return [];
    var m={};
    tasks().forEach(function(t){if(['COMPLETED','CANCELLED','DRAFT'].indexOf(t.s)>-1)return;
      t.a.forEach(function(x){var o=m[x.c]||(m[x.c]={c:x.c,prog:0,wait:0});if(t.s==='IN_PROGRESS')o.prog++;else if(t.s==='PENDING_APPROVAL'||t.s==='PENDING_REVIEW')o.wait++;});});
    return Object.keys(m).map(function(k){var o=m[k];o.total=o.prog+o.wait;return o}).filter(function(o){return o.total>0}).sort(function(a,b){return b.total-a.total});
  }
  /* FunnelStage (funnel.query.ts) */
  function funnel(P){
    var L=inRange(P).filter(function(t){return t.s!=='DRAFT'});
    var st=[['created',function(){return true}],['ack',function(t){return ['IN_PROGRESS','PENDING_REVIEW','COMPLETED','CANCELLED'].indexOf(t.s)>-1}],
      ['prog',function(t){return ['IN_PROGRESS','PENDING_REVIEW','COMPLETED'].indexOf(t.s)>-1}],['review',function(t){return t.approval&&(t.s==='PENDING_REVIEW'||t.s==='COMPLETED')}],
      ['done',function(t){return t.s==='COMPLETED'}]];
    return st.map(function(s){var c=L.filter(s[1]).length;return {k:s[0],count:c,pct:L.length?Math.round(c/L.length*100):0}});
  }
  /* TaskTypeTime (task-type-time.query.ts) */
  function typeTime(P){
    var m={};
    inRange(P).forEach(function(t){if(t.s!=='COMPLETED')return;var d=Math.max(1,diff(t.cr,t.done));var o=m[t.tk]||(m[t.tk]={tk:t.tk,sum:0,count:0});o.sum+=d;o.count++;});
    return Object.keys(m).map(function(k){var o=m[k];o.avg=Math.ceil(o.sum/o.count);return o}).sort(function(a,b){return b.avg-a.avg||b.count-a.count});
  }

  /* ---------- thanh chọn kỳ (dùng chung 2 trang) — V1: DateRangeFilter (Tháng/Quý/Tuỳ chọn) + TaskListFilter (tháng + năm) ---------- */
  var TY=+TODAY.slice(0,4), TM=+TODAY.slice(5,7), FIRSTY=2025;
  function esc(s){return App.esc(s)}
  function opt(v,l,cur){return '<option value="'+v+'"'+(v===cur?' selected':'')+'>'+esc(l)+'</option>'}
  /* opt.keys: kiểu kỳ có ở V1 của trang đó; opt.pb: kiểu kỳ V1 không có → gắn nhãn Phase B.
     Tổng quan V1 (DateRangeFilter): Tháng · Quý · Tuỳ chọn (Năm = Phase B). Danh sách việc V1 (TaskListFilter): Tháng · Năm ("Tất cả tháng") · Tuỳ chọn (Quý = Phase B). */
  function pbarHtml(P,err,po){
    po=po||{keys:['month','quarter','custom'],pb:['year']};
    var T=I18N.t, ks=po.keys.concat(po.pb||[]), h='<div class="seg" role="group" aria-label="'+esc(T('rp.period'))+'">'+ks.map(function(k){
      var b=(po.pb||[]).indexOf(k)>-1;
      return '<button type="button" data-pr="'+k+'" aria-pressed="'+(P.pr===k)+'"'+(b?' class="pb-zone" title="'+esc(T('rp.pb.tip'))+'"':'')+'>'+esc(T('rp.pr.'+k))+(b?'<span class="phase-b pb-s">'+esc(T('rp.pb.s'))+'</span>':'')+'</button>'}).join('')+'</div>';
    if(P.pr==='custom'){
      h+='<span class="dates"><label class="sr" for="pA">'+esc(T('rp.from'))+'</label><input class="input" type="date" id="pA" value="'+P.a+'" min="'+FIRSTY+'-01-01" max="'+TODAY+'"'+(err?' aria-invalid="true" aria-describedby="pErr"':'')+'>'+
        '<span class="faint" aria-hidden="true">–</span><label class="sr" for="pB">'+esc(T('rp.to'))+'</label><input class="input" type="date" id="pB" value="'+P.b+'" min="'+FIRSTY+'-01-01" max="'+TODAY+'"'+(err?' aria-invalid="true" aria-describedby="pErr"':'')+'></span>';
      if(err)h+='<p class="err" id="pErr" role="alert">'+ic('alert','i-xs')+'<span>'+esc(T('rp.err.range'))+'</span></p>';
      return h;
    }
    var o='', cur, y, m, q;
    if(P.pr==='month'){cur=P.y+'-'+P.m;for(y=TY;y>=FIRSTY;y--)for(m=(y===TY?TM:12);m>=1;m--)o+=opt(y+'-'+m,label({pr:'month',y:y,m:m}),cur);}
    else if(P.pr==='quarter'){cur=P.y+'-'+P.q;for(y=TY;y>=FIRSTY;y--)for(q=(y===TY?Math.ceil(TM/3):4);q>=1;q--)o+=opt(y+'-'+q,label({pr:'quarter',y:y,q:q}),cur);}
    else {cur=String(P.y);for(y=TY;y>=FIRSTY;y--)o+=opt(String(y),label({pr:'year',y:y}),cur);}
    return h+'<label class="sr" for="pSel">'+esc(T('rp.pick'))+'</label><select class="select" id="pSel">'+o+'</select>';
  }
  function switchTo(P,k){
    var y=P.pr==='custom'?+P.b.slice(0,4):P.y, m=P.pr==='month'?P.m:P.pr==='quarter'?(P.q-1)*3+1:P.pr==='custom'?+P.b.slice(5,7):(y===TY?TM:12);
    if(y===TY&&m>TM)m=TM;
    if(k==='month')return norm2({pr:'month',y:y,m:m});
    if(k==='quarter')return norm2({pr:'quarter',y:y,q:Math.ceil(m/3)});
    if(k==='year')return norm2({pr:'year',y:y});
    return norm2({pr:'custom',a:P.a,b:P.b>TODAY?TODAY:P.b});
  }
  /* bindPeriod(getP, apply(P|null, err)) — uỷ quyền sự kiện cho #pbar */
  function bindPeriod(getP,apply){
    document.addEventListener('click',function(e){var b=e.target.closest('#pbar [data-pr]');if(!b)return;var P=getP();if(P.pr===b.dataset.pr)return;apply(switchTo(P,b.dataset.pr),false,'[data-pr="'+b.dataset.pr+'"]');});
    document.addEventListener('change',function(e){
      var el=e.target, P=getP();
      if(el.id==='pSel'){var v=el.value.split('-');apply(norm2(P.pr==='month'?{pr:'month',y:v[0],m:v[1]}:P.pr==='quarter'?{pr:'quarter',y:v[0],q:v[1]}:{pr:'year',y:v[0]}),false,'#pSel');return;}
      if(el.id==='pA'||el.id==='pB'){var a=document.getElementById('pA').value,bb=document.getElementById('pB').value;if(!a||!bb)return;
        if(a>bb){apply(norm2({pr:'custom',a:a,b:bb}),true,'#'+el.id);return;} apply(norm2({pr:'custom',a:a,b:bb}),false,'#'+el.id);}
    });
  }

  window.RP={TODAY:TODAY,pbarHtml:pbarHtml,bindPeriod:bindPeriod,START:START,EMP:EMP,TYPES:TYPES,tasks:tasks,isReal:function(id){return !!REALID[id]},
    norm:norm2,prev:prev,label:label,fileTag:fileTag,fromQuery:fromQuery,toQuery:toQuery,months:months,add:add,diff:diff,
    n:n,pct:pct,pct1:pct1,num1:num1,rate:rate,r0:r0,overdue:overdue,workload:workload,kpi:kpi,drill:drill,monthly:monthly,rows:rows,perf:perf,funnel:funnel,typeTime:typeTime,isOver:isOver,
    type:function(tk){return TYPES[tk][I18N.lang]||TYPES[tk].vi},title:function(t){return t.t[I18N.lang]||t.t.vi}};
})();
