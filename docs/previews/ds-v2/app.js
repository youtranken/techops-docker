/* TechOps DS v2 — runtime dùng chung cho mọi trang preview. Classic script, nạp SAU copy.js, ds.js, data.js.
   API chính: App.shell · App.role/setRole · App.toast · App.dialog/confirm · App.drawer · App.menu
              App.task (luật nghiệp vụ) · App.act (hộp thoại hành động) · App.taskDetail (chi tiết: drawer | page)
   Xem _SPEC.md. */
(function(){
  var T=I18N.t, L=I18N.L, P=I18N.PEOPLE;
  var App={};
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};

  /* ================= TIỆN ÍCH ================= */
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function ls(k,d){try{var v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
  function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function nm(k){return P[k]?P[k][0]:''}
  function av(k,c){return P[k]?'<span class="av '+(c||'')+'" style="background:'+P[k][1]+'" title="'+esc(P[k][0])+'" aria-hidden="true">'+k+'</span>':''}
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  /* dt('2026-10-08') → 08/10/2026 | Oct 8, 2026 ; short → 08/10 | Oct 8 */
  function dt(iso,short){var p=iso.split('-');
    if(I18N.lang==='vi')return p[2]+'/'+p[1]+(short?'':'/'+p[0]);
    return MON[+p[1]-1]+' '+(+p[2])+(short?'':', '+p[0]);}
  /* dtt('2026-10-21 16:05') → 21/10 16:05 | Oct 21, 16:05 */
  function dtt(s){var a=s.split(' ');return dt(a[0],true)+(I18N.lang==='vi'?' ':', ')+(a[1]||'')}
  function ago(w){return w[0]==='yday'?T('ago.yday',{h:w[1]}):w[0]==='date'?dtt(w[1]):w[0]==='now'?T('ago.now'):T('ago.'+w[0],{n:w[1]})}
  function when(w){return Array.isArray(w)?ago(w):dtt(w)}
  function addDays(iso,n){return DATA.addDays(iso,n)}
  function daysBetween(a,b){var pa=a.split('-'),pb=b.split('-');return Math.round((new Date(+pb[0],+pb[1]-1,+pb[2])-new Date(+pa[0],+pa[1]-1,+pa[2]))/864e5)}
  function nowStamp(){var d=new Date();return DATA.TODAY+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
  function reduce(){return matchMedia('(prefers-reduced-motion: reduce)').matches}
  /* chèn HTML vào chuỗi đã dịch: fill('td.at',{a:'<b>…</b>',n:2}) — giá trị HTML phải tự escape */
  function fill(k,v){var s=esc(T(k,Object.keys(v).reduce(function(o,x){o[x]='\u0001'+x+'\u0002';return o},{})));
    for(var x in v)s=s.split('\u0001'+x+'\u0002').join(v[x]);return s}
  App.esc=esc; App.av=av; App.nm=nm; App.dt=dt; App.dtt=dtt; App.when=when; App.ls=ls; App.lss=lss; App.fill=fill; App.reduce=reduce;
  App.daysBetween=daysBetween; App.$=$; App.$$=$$;

  /* ================= VAI TRÒ (3 vai trò như V1: ADMIN · BOSS · EMPLOYEE) =================
     App.role3 = 'admin'|'boss'|'emp' (mới) · App.role = 'boss'|'emp' (cũ, admin tính là 'boss' để các trang cũ không vỡ)
     App.isBoss() = ADMIN hoặc BOSS (giống ['ADMIN','BOSS'] trong code) · App.isAdmin() · App.isBossOnly() · App.isEmp() · App.roleCode() */
  var ROLES=['admin','boss','emp'];
  var role=ls('app-role','boss'); if(ROLES.indexOf(role)<0)role='boss';
  Object.defineProperty(App,'role',{get:function(){return role==='emp'?'emp':'boss'}});
  Object.defineProperty(App,'role3',{get:function(){return role}});
  App.isBoss=function(){return role!=='emp'};
  App.isAdmin=function(){return role==='admin'};
  App.isBossOnly=function(){return role==='boss'};
  App.isEmp=function(){return role==='emp'};
  App.roleCode=function(){return {admin:'ADMIN',boss:'BOSS',emp:'EMPLOYEE'}[role]};
  App.roleLabel=function(r){return T('role.'+(r||role))};
  App.me=function(){return DATA.ME[role]};
  App.setRole=function(r){role=ROLES.indexOf(r)>-1?r:'boss';lss('app-role',role);renderShell();document.dispatchEvent(new CustomEvent('rolechange',{detail:role}))};
  /* Menu cấp riêng cho nhân viên (V1: quyền menu theo từng người — Sidebar.tsx:66-86, hr/sidebar-permissions). ADMIN/BOSS luôn thấy hết.
     Preview: công tắc "Nhân viên được cấp thêm menu" bật cả 5 menu Nhật ký · Báo cáo · Helpdesk · Nhân sự · Cài đặt. */
  var GRANT_MENUS=['logs','analytics','helpdesk','hr','settings'];
  App.grants=function(){return ls('app-emp-grants','')==='1'};
  App.setGrants=function(on){lss('app-emp-grants',on?'1':'');renderShell();document.dispatchEvent(new CustomEvent('rolechange',{detail:role}))};
  App.canSeeMenu=function(k){return App.isBoss()||(App.grants()&&GRANT_MENUS.indexOf(k)>-1)};
  /* Đã xem việc Mới xong — riêng từng người, giữ trong phiên (sessionStorage) để các trang preview đồng bộ */
  function seenSet(){try{return JSON.parse(sessionStorage.getItem('app-seen-'+App.me())||'{}')}catch(e){return {}}}
  App.isSeen=function(id){return !!seenSet()[id]};
  App.markSeen=function(id){var s=seenSet();s[id]=1;try{sessionStorage.setItem('app-seen-'+App.me(),JSON.stringify(s))}catch(e){}};

  /* ================= SHELL ================= */
  var NAV=[
    {k:'home',href:'dashboard.html',i:'dashboard',t:'nav.home'},
    {k:'tasks',href:'tasks-list.html',i:'tasks',t:'nav.tasks'},
    {k:'starred',href:'tasks-list.html?view=starred',i:'star',t:'nav.starred',sub:1,boss:1},
    {k:'unseen',href:'tasks-list.html?view=unseen',i:'check-circle',t:'nav.unseen',sub:1,boss:1},
    {k:'helpdesk',href:'helpdesk.html',i:'headset',t:'nav.helpdesk',menu:'helpdesk'},
    {k:'reports',href:'reports.html',i:'chart',t:'nav.reports',menu:'analytics'},
    {group:'nav.group.admin'},
    {k:'people',href:'people.html',i:'users',t:'nav.people',menu:'hr'},
    {k:'logs',href:'logs.html',i:'history',t:'nav.logs',menu:'logs'},
    {k:'settings',href:'settings.html',i:'settings',t:'nav.settings',menu:'settings'}
  ];
  var CFG=null, notifRead=false, counts=null;
  function defaultCounts(){
    var ts=DATA.tasks().filter(function(t){return t.s!=='CANCELLED'});
    return {starred:ts.filter(function(t){return t.star}).length,unseen:ts.filter(function(t){return t.unseen&&!App.isSeen(t.id)}).length};
  }
  function navShow(n){return !(n.boss&&!App.isBoss())&&!(n.menu&&!App.canSeeMenu(n.menu))}
  function navHtml(){
    var c=counts||defaultCounts(), act=CFG.active;
    var h='<div class="nav-h">'+esc(T('nav.group.work'))+'</div>';
    NAV.forEach(function(n,i){
      if(n.group){if(NAV.slice(i+1).some(function(x){return !x.group&&navShow(x)}))h+='<div class="nav-h">'+esc(T(App.isBoss()?n.group:'nav.group.granted'))+'</div>';return;}
      if(!navShow(n))return;
      var cnt=n.k==='starred'?String(c.starred):n.k==='unseen'?(c.unseen||''):'';
      h+='<a href="'+n.href+'" data-nav="'+n.k+'"'+(n.sub?' class="sub"':'')+(n.soon?' data-soon':'')+(act===n.k?' aria-current="page"':'')+'>'+
        ic(n.i,n.k==='starred'?'star-i':'')+'<span>'+esc(T(n.t))+'</span>'+(n.sub?'<span class="cnt">'+cnt+'</span>':'')+'</a>';
    });
    return h;
  }
  function crumbsHtml(){
    var cr=CFG.crumbs||[];
    return cr.map(function(c,i){
      var lab=esc(c.t?T(c.t):c.text), last=i===cr.length-1;
      return '<li>'+(i?ic('chev-r','i-xs'):'')+(last?'<span aria-current="page"'+(c.mono?' class="mono"':'')+'>'+lab+'</span>':'<a href="'+(c.href||'#')+'">'+lab+'</a>')+'</li>';
    }).join('');
  }
  function notifHtml(){
    var b=function(s){return '<b>'+esc(s)+'</b>'};
    var ts=DATA.tasks(), title=function(id){return I18N.title(ts.filter(function(x){return x.id===id})[0])};
    function item(k,who,text,time,go){
      return '<button type="button" class="n-item'+(notifRead?'':(k==='n1'||k==='n2'?' unread':''))+'"'+(go?' data-open-task="'+go+'"':'')+'>'+(who?av(who,'av-lg'):'<span class="ico">'+ic('alert','i-sm')+'</span>')+
        '<div><p>'+text+'</p><time>'+esc(time)+'</time></div></button>';
    }
    var d=I18N.lang==='vi'?'28/10':'Oct 28';
    var h='<div class="pop-h"><h3 id="popTitle">'+esc(T('notif.title'))+'</h3><button class="btn-link" data-shell="readAll">'+esc(T('notif.readAll'))+'</button></div>'+
      '<div class="pop-g">'+esc(T('notif.today'))+'</div>';
    if(App.isBoss()) h+=item('n1','NH',fill('n1',{a:b(nm('NH')),t:b(title('26-0042'))}),T('ago.min',{n:12}),'26-0042')+
      item('n2','TA',fill('n2',{a:b(nm('TA')),t:b(title('26-0033'))}),T('ago.hour',{n:1}),'26-0033')+
      item('n3','LM',fill('n3',{a:b(nm('LM')),d:b(d)}),T('ago.hour',{n:3}),'26-0033');
    /* nhân viên: ALL_FAILED gửi người tạo (_shared.ts:172-194) · TRANSFER_RECEIVED khi được chuyển giao (assignment.service.ts:113-119) */
    else h+=item('n1',null,fill('n.allFailed',{t:b(title('26-0044'))}),T('ago.hour',{n:2}),'26-0044')+
      item('n2','TA',fill('n.transfer',{a:b(nm('TA')),t:b(title('26-0019'))}),T('ago.hour',{n:5}),'26-0019');
    h+='<div class="pop-g">'+esc(T('notif.earlier'))+'</div>'+
      item('n4','PD',fill('n4',{a:b(nm('PD'))}),T('ago.yday',{h:'16:20'}),'26-0036')+
      item('n5',null,esc(T('n5')),T('ago.yday',{h:'08:00'}))+
      /* _shared.ts:111-155: Admin không nhận email thông báo công việc, chỉ nhận trong ứng dụng */
      (App.isAdmin()?'<p class="pop-note">'+ic('info','i-xs')+'<span>'+esc(T('notif.adminNoMail'))+'</span></p>':'')+
      '<div class="pop-f"><a class="btn-link" href="notifications.html">'+esc(T('notif.all'))+'</a></div>';
    return h;
  }
  function pvHtml(){
    var idx=/(^|\/)index\.html$/.test(location.pathname)||/\/$/.test(location.pathname);
    return (idx?'':'<a href="index.html" data-t-label="pv.index">'+ic('grid','i-sm')+'<span>'+esc(T('pv.index'))+'</span></a><span class="pv-sep"></span>')+
      '<div class="seg" id="pvLang" role="group" aria-label="'+esc(T('pv.lang'))+'"><button type="button" data-lang="vi">'+esc(T('lang.vi'))+'</button><button type="button" data-lang="en">'+esc(T('lang.en'))+'</button></div>'+
      (CFG.noRole?'':'<div class="seg" id="pvRole" role="group" aria-label="'+esc(T('pv.role'))+'">'+ROLES.map(function(r){return '<button type="button" data-role="'+r+'">'+esc(T('role.'+r))+'</button>'}).join('')+'</div>'+
        (role==='emp'?'<button type="button" class="pv-btn" id="pvGrants" aria-pressed="'+App.grants()+'">'+ic('key','i-sm')+'<span>'+esc(T('pv.grants'))+'</span></button>':''))+
      '<span class="pv-sep"></span><button type="button" class="pv-btn" data-theme-toggle id="themeBtn"></button>'+
      '<button type="button" class="pv-btn" id="pvIdle">'+ic('clock','i-sm')+'<span>'+esc(T('pv.idle'))+'</span></button>'+
      (CFG.pv?'<span class="pv-sep"></span>'+(typeof CFG.pv==='function'?CFG.pv():CFG.pv):'');
  }
  function renderPv(){
    var pv=$('#pv'); if(!pv)return;
    $$('#pvLang button').forEach(function(x){x.setAttribute('aria-pressed',x.dataset.lang===I18N.lang)});
    $$('#pvRole button').forEach(function(x){x.setAttribute('aria-pressed',x.dataset.role===role)});
    var dark=document.documentElement.getAttribute('data-theme')==='dark', k=dark?'pv.light':'pv.dark', tb=$('#themeBtn');
    if(tb){tb.innerHTML=ic(dark?'sun':'moon','i-sm')+'<span>'+esc(T(k))+'</span>';tb.setAttribute('aria-label',T(k));}
  }
  function renderShell(){
    if(!CFG)return;
    $('#nav').innerHTML=navHtml();
    var c=App.me();
    $('#sbFoot').innerHTML=av(c,'av-lg')+'<div><b>'+esc(nm(c))+'</b><span>'+esc(T('role.'+role))+'</span></div>';
    $('#me').innerHTML=av(c,'av-lg');
    $('#me').setAttribute('aria-label',T('app.account')+': '+nm(c));
    $('#crumbs').innerHTML=crumbsHtml();
    $('#crumbs').setAttribute('aria-label',T('nav.crumbs'));
    $('#pop').innerHTML=notifHtml();
    $('#bellDot').hidden=notifRead;
    $('#pv').innerHTML=pvHtml(); $('#pv').setAttribute('aria-label',T('app.pv.label'));
    renderPv();
    I18N.apply($('#app')); I18N.apply($('#pv'));
    $$('.boss-only').forEach(function(el){el.hidden=!App.isBoss()});
    if(CFG.title)document.title=T('app.name')+' · '+(typeof CFG.title==='function'?CFG.title():T(CFG.title));
  }
  /* App.shell({active, crumbs:[{t|text,href,mono}], title, pv:html|fn, noRole, onNav(k,e)→true nếu tự xử lý, onOpenTask(id)})
     Trang chỉ cần <main class="content" id="content">…</main>; shell tự dựng sidebar, topbar, ngăn trượt, toast, thanh preview. */
  App.shell=function(cfg){
    CFG=cfg||{};
    var content=$('#content');
    var wrap=document.createElement('div');
    wrap.innerHTML='<a class="skip" href="#content">'+esc(T('app.skip'))+'</a>'+
      '<div class="app" id="app">'+
        '<aside class="sb" id="sb"><a class="brand" href="tasks-list.html"><span class="brand-mark">'+ic('workflow','i-sm')+'</span><span class="brand-tx"><b>'+esc(T('app.name'))+'</b><small>'+esc(T('app.org'))+'</small></span></a>'+
          '<nav class="nav" id="nav" data-t-label="nav.label"></nav><div class="sb-foot" id="sbFoot"></div></aside>'+
        '<div class="sb-scrim"></div>'+
        '<div class="main" id="mainCol"><header class="top">'+
          '<button type="button" class="icon-btn menu-btn" data-nav-open data-t-label="nav.open">'+ic('menu')+'</button>'+
          '<nav data-t-label="nav.crumbs"><ol class="crumb" id="crumbs"></ol></nav>'+
          '<label class="search top-search">'+ic('search','i-sm')+'<span class="sr" data-t="top.search"></span><input type="search" data-t-ph="top.search"></label>'+
          '<div class="top-r"><div class="notif-wrap">'+
            '<button type="button" class="icon-btn" id="bell" aria-haspopup="true" aria-expanded="false" aria-controls="pop" data-t-label="top.notifications">'+ic('bell')+'<span class="badge" id="bellDot"></span></button>'+
            '<div class="pop" id="pop" hidden role="dialog" aria-labelledby="popTitle"></div></div>'+
            '<div class="um-wrap"><button type="button" class="av-btn" id="me" aria-haspopup="menu" aria-expanded="false"></button></div>'+
          '</div></header></div>'+
      '</div>'+
      '<div class="dr-scrim" id="drScrim"></div><section class="dr" id="dr" role="dialog" aria-modal="true" tabindex="-1" aria-hidden="true"></section>'+
      '<div class="toasts" id="toasts" role="status" aria-live="polite"></div>'+
      '<div class="pv" id="pv" role="toolbar"></div>';
    var frag=document.createDocumentFragment(); while(wrap.firstChild)frag.appendChild(wrap.firstChild);
    document.body.insertBefore(frag,content);
    $('#mainCol').appendChild(content);
    content.setAttribute('tabindex','-1');
    renderShell();
    if(window.dsIcons)dsIcons(document);
  };
  App.navCounts=function(c){counts=c;if(CFG)$('#nav').innerHTML=navHtml()};
  App.navActive=function(k){if(!CFG)return;CFG.active=k;$('#nav').innerHTML=navHtml()};
  App.crumbs=function(cr){if(!CFG)return;CFG.crumbs=cr;$('#crumbs').innerHTML=crumbsHtml()};
  App.refreshPv=function(){if(CFG){$('#pv').innerHTML=pvHtml();renderPv();}};
  /* Toggle Danh sách | Bảng — dùng ở cả 2 trang */
  App.viewToggle=function(cur){
    function it(k,href,i){var on=cur===k;return on?'<button type="button" aria-pressed="true">'+ic(i,'i-sm')+'<span>'+esc(T('view.'+k))+'</span></button>'
      :'<a href="'+href+'" aria-label="'+esc(T('view.'+k))+'">'+ic(i,'i-sm')+'<span>'+esc(T('view.'+k))+'</span></a>'}
    return '<div class="seg" role="group" aria-label="'+esc(T('pv.views'))+'">'+it('list','tasks-list.html','list')+it('board','tasks-board.html','kanban')+'</div>';
  };

  /* ================= TOAST ================= */
  App.toast=function(msg,type){
    var box=$('#toasts'); if(!box)return;
    var el=document.createElement('div');
    el.className='toast'+(type&&type!=='success'?' '+type:'');
    el.innerHTML=ic(type==='info'?'info':type==='error'?'alert':'check-circle','i-sm')+'<span>'+esc(msg)+'</span><button type="button" class="t-x" aria-label="'+esc(T('app.toast.close'))+'">'+ic('x','i-xs')+'</button>';
    box.appendChild(el);
    var kill=function(){if(el.parentNode)el.parentNode.removeChild(el)};
    el.querySelector('.t-x').onclick=kill; setTimeout(kill,6000);
    var olds=$$('.toast:not(.idle)',box); while(olds.length>3)box.removeChild(olds.shift());
  };

  /* ================= NHÃN PHASE B =================
     Phần preview mà V1 chưa có backend (nháp lưu trên máy, xuất Excel danh sách việc…) gắn nhãn nhỏ .phase-b — xem _SPEC.md mục 7. */
  App.phaseB=function(){return '<span class="phase-b" title="'+esc(T('app.phaseB.d'))+'">'+esc(T('app.phaseB'))+'<span class="sr"> — '+esc(T('app.phaseB.d'))+'</span></span>'};

  /* ================= CẢNH BÁO SẮP HẾT PHIÊN =================
     V1: shared/providers/IdleTimeoutProvider.tsx — không thao tác idleTimeoutMinutes (mặc định 30) thì đăng xuất; 1 phút trước hiện cảnh báo.
     Kiểm tra mỗi 30 giây; chuột/phím/cuộn/chạm = có thao tác. Hết giờ → login.html?s=expired. Thanh preview có nút "Thử cảnh báo hết phiên". */
  var IDLE={min:30,last:Date.now(),el:null,tm:null,left:60};
  ['mousedown','mousemove','keydown','scroll','touchstart','click'].forEach(function(ev){addEventListener(ev,function(){if(!IDLE.el)IDLE.last=Date.now()},{passive:true,capture:true})});
  setInterval(function(){if(!IDLE.el&&Date.now()-IDLE.last>=(IDLE.min-1)*60000)App.idleWarn();},30000);
  function idleClose(keep){if(!IDLE.el)return;clearInterval(IDLE.tm);IDLE.el.remove();IDLE.el=null;IDLE.last=Date.now();if(keep)App.toast(T('idle.kept'),'success');}
  App.idleWarn=function(){
    var box=$('#toasts'); if(!box||IDLE.el)return;
    IDLE.left=60;
    var el=document.createElement('div'); el.className='toast warn idle'; el.setAttribute('role','alertdialog'); el.setAttribute('aria-labelledby','idleT'); el.setAttribute('aria-describedby','idleD');
    function mmss(n){return '0:'+String(n).padStart(2,'0')}
    el.innerHTML=ic('clock','i-sm')+'<div class="idle-b"><b id="idleT">'+esc(T('idle.t'))+'</b><span id="idleD">'+esc(T('idle.d',{m:IDLE.min}))+' <span class="mono" id="idleN">'+mmss(IDLE.left)+'</span></span>'+
      '<div class="idle-f"><a class="btn btn-sm btn-ghost" href="login.html">'+esc(T('top.signout'))+'</a><button type="button" class="btn btn-sm btn-p" data-idle-keep>'+esc(T('idle.keep'))+'</button></div></div>';
    box.appendChild(el); IDLE.el=el;
    el.querySelector('[data-idle-keep]').addEventListener('click',function(){idleClose(true)});
    el.querySelector('[data-idle-keep]').focus({preventScroll:true});
    IDLE.tm=setInterval(function(){IDLE.left--;var n=$('#idleN');if(n)n.textContent=mmss(Math.max(0,IDLE.left));if(IDLE.left<=0){clearInterval(IDLE.tm);location.href='login.html?s=expired';}},1000);
  };
  App.idleClose=idleClose;

  /* ================= HỘP THOẠI ================= */
  var DLG=[];
  function focusables(root){return $$('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',root).filter(function(n){return n.offsetParent!==null||n.type==='file'})}
  function trap(e,root){
    var f=focusables(root).filter(function(n){return n.type!=='file'}); if(!f.length)return;
    var a=document.activeElement, i=f.indexOf(a);
    if(!root.contains(a)){e.preventDefault();f[0].focus();return;}
    if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus();}
    else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus();}
  }
  /* App.dialog({title, sub, body, size:'sm'|'md'|'lg', ok:'nhãn'|null, danger, close:'nhãn', form, init(el,api), onOk(el,api)→false để giữ, onClose()})
     Footer luôn [Đóng][Chính] căn phải. Mobile: trượt từ dưới. Esc / bấm nền = Đóng. */
  App.dialog=function(o){
    var id='dlg'+(DLG.length+1)+'_'+Date.now();
    var w=document.createElement('div'); w.className='dlg-wrap';
    w.innerHTML='<div class="dlg-scrim" data-dlg-x></div><div class="dlg '+(o.size||'md')+'" role="dialog" aria-modal="true" aria-labelledby="'+id+'t"'+(o.form?'':' aria-describedby="'+id+'b"')+'>'+
      '<div class="dlg-h"><h2 id="'+id+'t">'+esc(o.title)+(o.sub?'<span class="sub">'+o.sub+'</span>':'')+'</h2><button type="button" class="icon-btn sm" data-dlg-x aria-label="'+esc(o.close||T('app.close'))+'">'+ic('x','i-sm')+'</button></div>'+
      '<div class="dlg-b" id="'+id+'b">'+(o.body||'')+'</div>'+
      '<div class="dlg-f"><button type="button" class="btn" data-dlg-x>'+esc(o.close||T('app.close'))+'</button>'+
        (o.ok?'<button type="button" class="btn '+(o.danger?'btn-danger':'btn-p')+'" data-dlg-ok>'+esc(o.ok)+'</button>':'')+'</div></div>';
    document.body.appendChild(w); document.body.classList.add('lock');
    var api={el:w,last:document.activeElement,o:o,tried:false,close:function(ok){close(api,ok)}};
    DLG.push(api);
    w.addEventListener('click',function(e){
      if(e.target.closest('[data-dlg-x]')){close(api,false);return;}
      if(e.target.closest('[data-dlg-ok]')){api.tried=true;if(o.onOk&&o.onOk(w,api)===false)return;close(api,true);}
    });
    if(o.init)o.init(w,api);
    var first=o.form?$('textarea,input:not([type=file]):not([type=checkbox]):not([type=radio]),select',$('.dlg-b',w)):null;
    (first||$('[data-dlg-ok]',w)||$('[data-dlg-x].btn',w)).focus();
    return api;
  };
  function close(api,ok){
    var i=DLG.indexOf(api); if(i<0)return;
    DLG.splice(i,1); api.el.remove();
    if(!DLG.length&&!App.drawer.isOpen())document.body.classList.remove('lock');
    if(!ok&&api.o.onClose)api.o.onClose();
    if(api.o.after)api.o.after(ok);
    var l=api.last; if(l&&document.contains(l)&&l.focus)l.focus({preventScroll:true});
  }
  App.dialogOpen=function(){return DLG.length>0};
  /* App.confirm({title, text, ok, danger, onOk}) */
  App.confirm=function(o){return App.dialog({title:o.title,body:'<p>'+esc(o.text)+'</p>',size:'sm',ok:o.ok,danger:o.danger,onOk:o.onOk,onClose:o.onClose})};

  /* trường nhập dùng trong hộp thoại */
  function fieldTa(id,label,ph,req,rows,extra){
    return '<div class="field"><div class="tf-lr"><label class="lbl" for="'+id+'">'+esc(label)+(req?' <span class="req" aria-hidden="true">*</span><span class="sr">('+esc(T('app.req'))+')</span>':' <span class="opt">('+esc(T('app.opt'))+')</span>')+'</label>'+(extra||'')+'</div>'+
      '<textarea class="ta" id="'+id+'" rows="'+(rows||4)+'"'+(req?' required aria-required="true"':'')+' aria-describedby="'+id+'E" placeholder="'+esc(ph)+'"></textarea><p class="err" id="'+id+'E" hidden></p></div>';
  }
  function setErr(input,msg){
    var e=document.getElementById(input.id+'E'); input.setAttribute('aria-invalid',msg?'true':'false');
    if(e){e.hidden=!msg;e.innerHTML=msg?ic('alert','i-xs')+'<span>'+esc(msg)+'</span>':'';}
    return !msg;
  }
  /* Luật V1: lý do chỉ cần KHÔNG RỖNG (ReasonModal required, TransferModal, RequestExtensionModal, RejectReviewModal) */
  function reqCheck(input,key){return setErr(input,input.value.trim()?'':T(key||'app.dlg.reasonErr'))}
  /* Báo cáo / Bổ sung: V1 bắt ≥10 ký tự, tính cả khoảng trắng (CompleteTaskModal.tsx:110, SupplementReportModal.tsx:76) */
  function minCheck(input,key){var n=input.value.length;return setErr(input,n>=10?'':T(key,{n:n}))}
  function liveCheck(w,api,sel,fn){$$(sel,w).forEach(function(x){x.addEventListener('input',function(){if(api.tried)fn(x)})})}
  /* Luật tệp V1 (CreateTask/attachment-rules.ts): 3 tệp · 10 MB/tệp · PDF/JPG/PNG/DOCX/XLSX/PPTX · kiểm số lượng trước, rồi từng tệp, gặp lỗi đầu tiên thì dừng, không thêm tệp nào */
  var ATT={max:3,mb:10,ext:['.pdf','.jpg','.jpeg','.png','.docx','.xlsx','.pptx']};
  function fsize(n){var s=n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1)+' MB';return I18N.lang==='vi'?s.replace('.',','):s}
  function attCheck(list,have){
    if(have+list.length>ATT.max)return have>=ATT.max?T('tf.att.full',{n:ATT.max}):T('tf.att.max',{n:ATT.max,k:list.length,r:ATT.max-have});
    for(var i=0;i<list.length;i++){
      var n=list[i].name, d=n.lastIndexOf('.'), x=d>=0?n.slice(d).toLowerCase():'';
      if(ATT.ext.indexOf(x)<0)return T('tf.att.type',{f:n});
      if(list[i].size>ATT.mb*1048576)return T('tf.att.size',{f:n,s:fsize(list[i].size),m:ATT.mb});
    }
    return '';
  }
  App.attCheck=attCheck;
  function attField(){
    return '<div class="field"><div class="tf-lr"><div class="lbl" id="attL">'+esc(T('app.att.label'))+' <span class="opt">('+esc(T('app.opt'))+')</span></div><span class="tf-cnt" data-attn></span></div>'+
      '<label class="dropz" data-dropz>'+ic('upload','i-sm')+'<span>'+esc(T('app.att.drop'))+' <u>'+esc(T('app.att.pick'))+'</u></span>'+
        '<small class="dz-rules">'+esc(T('tf.att.rules',{n:ATT.max,m:ATT.mb}))+'</small>'+
        '<input type="file" multiple class="sr" data-att accept="'+ATT.ext.join(',')+'" aria-labelledby="attL" aria-describedby="attE attTip"></label>'+
      '<p class="err" id="attE" role="alert" hidden></p><ul class="flist" data-flist></ul>'+
      '<p class="hint" id="attTip">'+ic('camera','i-xs')+' '+esc(T('app.att.paste'))+'</p></div>';
  }
  /* wireAtt(w, files) — files: [{n,s,b,url}] dùng chung với onOk. Dán ảnh (Ctrl+V) khi hộp đang mở → hộp xem trước → thêm vào tệp (usePasteImage + PasteImageModal của V1) */
  function wireAtt(w,files){
    var inp=$('[data-att]',w), z=$('[data-dropz]',w), ul=$('[data-flist]',w), er=$('#attE',w), cnt=$('[data-attn]',w);
    function err(m){er.hidden=!m;er.innerHTML=m?ic('alert','i-xs')+'<span>'+esc(m)+'</span>':'';z.classList.toggle('bad',!!m);}
    function draw(){
      ul.innerHTML=files.map(function(f,i){return '<li>'+(f.url?'<img class="fthumb" src="'+f.url+'" alt="">':ic('file','i-sm'))+'<span title="'+esc(f.n)+'">'+esc(f.n)+'</span><small>'+f.s+'</small><button type="button" class="mini" data-rmf="'+i+'" aria-label="'+esc(T('app.att.remove',{f:f.n}))+'">'+ic('x','i-xs')+'</button></li>'}).join('');
      var full=files.length>=ATT.max; z.classList.toggle('full',full); inp.disabled=full;
      if(cnt)cnt.textContent=T('tf.att.count',{x:files.length,n:ATT.max});
    }
    function add(list,url){var m=attCheck(list,files.length);err(m);if(m)return false;for(var i=0;i<list.length;i++)files.push({n:list[i].name,s:fsize(list[i].size),b:list[i].size,url:url||null});draw();return true;}
    function arr(fl){var a=[];for(var i=0;i<fl.length;i++)a.push({name:fl[i].name,size:fl[i].size});return a}
    inp.addEventListener('change',function(){add(arr(inp.files));inp.value=''});
    ['dragenter','dragover'].forEach(function(t){z.addEventListener(t,function(e){e.preventDefault();if(!z.classList.contains('full'))z.classList.add('hot')})});
    ['dragleave','drop'].forEach(function(t){z.addEventListener(t,function(e){e.preventDefault();z.classList.remove('hot')})});
    z.addEventListener('drop',function(e){if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length)add(arr(e.dataTransfer.files))});
    z.addEventListener('click',function(e){if(z.classList.contains('full')){e.preventDefault();err(T('tf.att.full',{n:ATT.max}));}});
    ul.addEventListener('click',function(e){var b=e.target.closest('[data-rmf]');if(b){files.splice(+b.dataset.rmf,1);err('');draw();inp.focus();}});
    function onPaste(e){
      if(!document.contains(w)){document.removeEventListener('paste',onPaste);return;}
      if(DLG.length&&DLG[DLG.length-1].el!==w)return; /* đang mở hộp xem trước */
      var it=(e.clipboardData&&e.clipboardData.items)||[];
      for(var i=0;i<it.length;i++){if(it[i].kind==='file'&&/^image\//.test(it[i].type)){var f=it[i].getAsFile();if(!f)continue;e.preventDefault();
        if(files.length>=ATT.max){err(T('tf.att.full',{n:ATT.max}));return;}
        pastePreview(f,function(name,url){add([{name:name,size:f.size}],url)});return;}}
    }
    document.addEventListener('paste',onPaste);
    draw();
  }
  function pastePreview(file,ok){
    var ext=file.type==='image/png'?'png':'jpg', name='screenshot-'+Date.now()+'.'+ext, url=URL.createObjectURL(file);
    App.dialog({title:T('tf.paste.t'),size:'md',ok:T('tf.paste.ok'),
      body:'<div class="tf-pimg"><img id="pImg" src="'+url+'" alt="'+esc(T('tf.paste.alt'))+'"></div><p class="hint"><span class="mono" id="pDim"></span> · <span class="mono">'+esc(fsize(file.size))+'</span> · <span class="mono">'+esc(name)+'</span></p>',
      init:function(w){var im=$('#pImg',w);im.onload=function(){$('#pDim',w).textContent=im.naturalWidth+' × '+im.naturalHeight+' px'}},
      onOk:function(){ok(name,url)}});
  }
  /* ================= NGĂN TRƯỢT PHẢI ================= */
  var DR={open:false,o:null};
  /* App.drawer.open({html, label, onClose}) · .set(html) · .close() · .isOpen() */
  App.drawer={
    open:function(o){
      DR.o=o; var dr=$('#dr'); if(!DR.open)DR.last=document.activeElement;
      dr.innerHTML=o.html; dr.setAttribute('aria-label',o.label||T('td.detail'));
      if(window.dsIcons)dsIcons(dr);
      if(!DR.open){DR.open=true;document.body.classList.add('dr-on','lock');dr.setAttribute('aria-hidden','false');}
      var b=$('.dr-b',dr); if(b)b.scrollTop=0;
      dr.focus({preventScroll:true});
    },
    set:function(html){var dr=$('#dr'),b=$('.dr-b',dr),st=b?b.scrollTop:0;dr.innerHTML=html;if(window.dsIcons)dsIcons(dr);b=$('.dr-b',dr);if(b)b.scrollTop=st;},
    close:function(){
      if(!DR.open)return; DR.open=false;
      document.body.classList.remove('dr-on'); if(!DLG.length)document.body.classList.remove('lock');
      $('#dr').setAttribute('aria-hidden','true');
      var o=DR.o; DR.o=null; if(o&&o.onClose)o.onClose();
    },
    isOpen:function(){return DR.open}
  };

  /* ================= MENU THẢ XUỐNG ================= */
  var MENU=null;
  /* App.menu(btn, html các .mi, onPick(el), opt) — mặc định đặt cạnh nút (cha cần position:relative).
     opt.fixed: gắn vào body, định vị theo nút (dùng khi nút nằm trong khung overflow như dòng bảng, thẻ ở cột). opt.label: aria-label. */
  App.menu=function(btn,html,onPick,opt){
    opt=opt||{};
    var again=MENU&&MENU.btn===btn; closeMenu(); if(again)return;
    var m=document.createElement('div'); m.className='menu'+(opt.fixed?' menu-fx':''); m.setAttribute('role','menu'); m.innerHTML=html;
    if(opt.label)m.setAttribute('aria-label',opt.label);
    if(opt.fixed){document.body.appendChild(m);placeMenu(m,btn);}
    else{btn.parentElement.style.position='relative'; btn.parentElement.appendChild(m);}
    btn.setAttribute('aria-expanded','true');
    MENU={btn:btn,el:m,pick:onPick,fixed:!!opt.fixed,at:Date.now()};
    if(!opt.fixed){var r=m.getBoundingClientRect(); if(r.bottom>innerHeight-8&&r.height<btn.getBoundingClientRect().top){m.style.top='auto';m.style.bottom='calc(100% + 6px)';}}
    var f=$$('.mi:not(:disabled)',m); if(f[0])f[0].focus({preventScroll:true});
  };
  function placeMenu(m,btn){
    var r=btn.getBoundingClientRect(), w=m.offsetWidth, h=m.offsetHeight;
    var left=Math.min(Math.max(8,r.right-w),innerWidth-w-8), top=r.bottom+6;
    if(top+h>innerHeight-8)top=r.top-6-h>=8?r.top-6-h:Math.max(8,innerHeight-8-h);
    m.style.left=left+'px'; m.style.top=top+'px';
  }
  function closeMenu(focus){if(!MENU)return false;var b=MENU.btn;MENU.el.remove();b.setAttribute('aria-expanded','false');MENU=null;if(focus&&document.contains(b))b.focus();return true}
  App.closeMenu=closeMenu;
  /* menu cố định: khi cuộn thì bám theo nút; nút ra khỏi màn hình thì đóng. Đổi cỡ thì đóng. */
  addEventListener('scroll',function(e){
    if(!MENU||!MENU.fixed||(e.target&&e.target.nodeType===1&&MENU.el.contains(e.target)))return;
    var r=MENU.btn.getBoundingClientRect();
    if(!document.contains(MENU.btn)||(Date.now()-MENU.at>600&&(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)))closeMenu(false); else placeMenu(MENU.el,MENU.btn);
  },true);
  addEventListener('resize',function(){if(MENU&&MENU.fixed)closeMenu(false)});
  function mi(k,i,label,extra){return '<button type="button" class="mi'+(extra&&extra.danger?' danger':'')+'" role="menuitem" data-mi="'+k+'"'+(extra&&extra.disabled?' disabled':'')+'>'+ic(i,'i-sm')+'<span>'+esc(label)+'</span></button>'}
  App.mi=mi;

  /* ================= NGHIỆP VỤ CÔNG VIỆC — luật lấy NGUYÊN từ V1 =================
     Hiện/ẩn nút: modules/tasks/actions/config/taskActionMatrix.ts (getAllowedActions) + actions/hooks/useTaskPermissions.ts — port 1:1 bên dưới.
     Chuyển trạng thái: services/workflow/{approval,acknowledge,assignment,lifecycle,restore}.service.ts, services/extension.service.ts.
     Chỗ service và UI V1 lệch nhau: preview theo UI V1 (thứ người dùng đang thấy), ghi chú "UI≠" tại chỗ. */
  /* AssigneeStatus V1 (schema.prisma): PENDING · IN_PROGRESS · COMPLETED · REJECTED · TRANSFERRED · REVISION_REQUIRED (ACKNOWLEDGED có trong enum nhưng không dùng).
     Nhận việc = vào thẳng IN_PROGRESS; báo cáo xong = COMPLETED. Người còn hiệu lực = không phải REJECTED/TRANSFERRED (lifecycle.service.ts:119). */
  var AS_ACTIVE={PENDING:1,IN_PROGRESS:1,COMPLETED:1,REVISION_REQUIRED:1};
  var AS_OLD={ACCEPTED:'IN_PROGRESS',REPORTED:'COMPLETED',REWORK:'REVISION_REQUIRED',DECLINED:'REJECTED'}; /* mã cũ của preview → mã V1 */
  var OPEN_ST={PENDING_APPROVAL:1,WAITING_ACKNOWLEDGE:1,IN_PROGRESS:1,PENDING_REVIEW:1};
  /* taskActionMatrix.ts:15-77 */
  var MATRIX={
    PENDING_APPROVAL:{BOSS:['VIEW','APPROVE','REJECT','EDIT'],CREATOR:['VIEW','EDIT','CANCEL'],ADMIN:['VIEW','APPROVE','REJECT','EDIT','CANCEL'],OTHER:[]},
    WAITING_ACKNOWLEDGE:{BOSS:['VIEW','EDIT','CANCEL','FORCE_MODE'],CREATOR_ONLY:['VIEW'],ASSIGNEE_PENDING:['VIEW','ACKNOWLEDGE','REJECT'],ADMIN:['VIEW','EDIT','CANCEL','REASSIGN','FORCE_MODE'],OTHER:['VIEW']},
    IN_PROGRESS:{BOSS:['VIEW','EDIT','FORCE_MODE','APPROVE_EXTENSION','CANCEL'],CREATOR_ONLY:['VIEW','EDIT'],ASSIGNEE_PENDING:['VIEW','ACKNOWLEDGE','REJECT'],
      ASSIGNEE:['VIEW','EDIT','COMPLETE','TRANSFER','REQUEST_EXTENSION','WITHDRAW_EXTENSION'],ADMIN:['VIEW','EDIT','FORCE_MODE','CANCEL','APPROVE_EXTENSION','REASSIGN'],OTHER:['VIEW']},
    PENDING_REVIEW:{BOSS:['VIEW','APPROVE','REJECT_REVIEW'],CREATOR:['VIEW'],ASSIGNEE:['VIEW'],ADMIN:['VIEW','APPROVE','REJECT_REVIEW','CANCEL'],OTHER:['VIEW']},
    COMPLETED:{ALL:['VIEW'],ADMIN:['VIEW']},
    CANCELLED:{ALL:['VIEW'],ADMIN:['VIEW','RESTORE']}
  };
  /* taskActionMatrix.ts:95-193 getAllowedActions — port 1:1 */
  function allowedActions(p){
    var m=MATRIX[p.status]; if(!m)return ['VIEW'];
    var al={}, add=function(l){(l||[]).forEach(function(a){al[a]=1})};
    if(p.role==='ADMIN')add(m.ADMIN||m.ALL||['VIEW']);  /* ADMIN không nhận thao tác người làm (V1 không giao việc cho ADMIN: assignable-users chỉ EMPLOYEE+BOSS) */
    else if(p.role==='BOSS'){
      add(m.BOSS||m.ALL||['VIEW']);
      if(p.isAssignee){ /* Boss được giao: có thêm thao tác người làm (matrix:105-112) */
        if(p.assigneeStatus==='PENDING')add(m.ASSIGNEE_PENDING);
        else if(p.assigneeStatus==='IN_PROGRESS'||p.assigneeStatus==='REVISION_REQUIRED')add(m.ASSIGNEE);
      }
    } else {
      var creatorOnly=p.isCreator&&!p.isAssignee;
      if(creatorOnly)add(m.CREATOR_ONLY||m.CREATOR);
      if(p.isCreator&&p.isAssignee)add((m.CREATOR_ONLY||m.CREATOR||[]).filter(function(a){return a!=='REJECT'}));
      if(p.isAssignee){
        if(p.assigneeStatus==='PENDING')add((m.ASSIGNEE_PENDING||[]).filter(function(a){return !(p.isCreator&&a==='REJECT')}));
        else if(p.assigneeStatus==='IN_PROGRESS'||p.assigneeStatus==='REVISION_REQUIRED')add(m.ASSIGNEE);
      }
      if(!Object.keys(al).length)add(m.OTHER||m.ALL||['VIEW']);
    }
    if(p.workflowMode!=='NEED_APPROVAL')delete al.FORCE_MODE;
    if(p.isForceMode){delete al.REJECT;delete al.TRANSFER;if(p.role!=='BOSS'&&p.role!=='ADMIN')delete al.CANCEL;}
    if(p.isCreator&&!p.isAssignee&&p.allAssigneesAccepted&&p.workflowMode!=='IMMEDIATE')delete al.CANCEL;
    if(p.workflowMode==='IMMEDIATE'&&p.isCreator&&!p.isAssignee&&p.status==='WAITING_ACKNOWLEDGE')al.EDIT=1;
    if(p.workflowMode!=='IMMEDIATE'&&p.role!=='BOSS'&&p.role!=='ADMIN'&&(p.status==='WAITING_ACKNOWLEDGE'||p.status==='IN_PROGRESS'))delete al.EDIT;
    /* allFailed → người tạo (không làm) được Hủy. V1 không chặn theo trạng thái nên việc ĐÃ HỦY (mọi người làm thành REJECTED) cũng hiện "Hủy" — lỗi V1, preview chỉ áp dụng khi việc còn mở. */
    if(p.isCreator&&!p.isAssignee&&p.allFailed&&OPEN_ST[p.status])al.CANCEL=1;
    return Object.keys(al);
  }
  function wf(t){return t.approval?'NEED_APPROVAL':'IMMEDIATE'}
  var Task={
    steps:function(t){var s=t.approval?['PENDING_APPROVAL','WAITING_ACKNOWLEDGE','IN_PROGRESS','PENDING_REVIEW','COMPLETED']:['WAITING_ACKNOWLEDGE','IN_PROGRESS','COMPLETED'];return t.s==='DRAFT'?['DRAFT'].concat(s):s},
    people:function(t){var o=t.a.slice();Object.keys(t.as||{}).forEach(function(c){if(o.indexOf(c)<0)o.push(c)});return o},
    /* đổi mã trạng thái người làm cũ (ACCEPTED/REPORTED/REWORK/DECLINED) sang enum V1 — cho việc lưu trong phiên từ bản preview trước */
    norm:function(t){t.as=t.as||{};Object.keys(t.as).forEach(function(c){var a=t.as[c];if(a&&AS_OLD[a.st])a.st=AS_OLD[a.st]});return t},
    active:function(t){Task.norm(t);return Task.people(t).filter(function(c){var a=t.as[c];return a&&AS_ACTIVE[a.st]})},
    mine:function(t){Task.norm(t);var a=t.as&&t.as[App.me()];return a?a.st:null},
    isAssignee:function(t,c){return Task.people(t).indexOf(c||App.me())>-1},
    /* useTaskPermissions.ts:69-71 — tính từ người làm, không dùng cờ allFailed trong DB */
    allFailed:function(t){Task.norm(t);var p=Task.people(t);return p.length>0&&p.every(function(c){var a=t.as[c];return a&&(a.st==='REJECTED'||a.st==='TRANSFERRED')})},
    /* task-query.service.ts:195-210: ADMIN/BOSS thấy hết; nhân viên thấy việc mình tạo (mọi trạng thái) và việc mình được giao (mọi trạng thái người làm, kể cả đã từ chối/chuyển đi, kể cả Đã xong) trừ khi đang Chờ duyệt */
    visible:function(t){var me=App.me();return App.isBoss()||t.cr===me||(Task.isAssignee(t)&&t.s!=='PENDING_APPROVAL')},
    involved:function(t){return Task.visible(t)},
    /* comment.service.ts:98-110: ai thấy việc thì bình luận được. V1 KHÔNG khoá bình luận khi việc Đã xong/Đã hủy. */
    canComment:function(t){return Task.visible(t)},
    canEditComment:function(c){return c.a===App.me()},                     /* comment.service.ts:179 */
    canDelComment:function(c){return c.a===App.me()||App.isAdmin()},       /* comment.service.ts:215 — Admin xoá được bình luận của người khác */
    latest:function(a){return a&&a.rv&&a.rv.length?a.rv[a.rv.length-1]:null},
    dueIso:function(t){return typeof t.due==='number'?addDays(DATA.TODAY,t.due):typeof t.due==='string'&&t.due!=='ok'?t.due:null},
    extCount:function(t){return {total:t.ext.length,pending:t.ext.filter(function(e){return e.st==='PENDING'}).length}},
    /* useTaskPermissions.ts:60-135 */
    perm:function(t){
      Task.norm(t);
      var me=App.me(), a=t.as[me], ast=a?a.st:undefined, isA=Task.isAssignee(t), isC=t.cr===me, ppl=Task.people(t), af=Task.allFailed(t);
      var acc=ppl.length>0&&ppl.every(function(c){var x=t.as[c];return x&&['IN_PROGRESS','COMPLETED','REVISION_REQUIRED','TRANSFERRED'].indexOf(x.st)>-1});
      var al=allowedActions({status:t.s,role:App.roleCode(),isCreator:isC,isAssignee:isA,assigneeStatus:ast,isForceMode:!!t.force,workflowMode:wf(t),allAssigneesAccepted:acc,allFailed:af});
      var has=function(k){return al.indexOf(k)>-1};
      return {allowed:al,isCreator:isC,isAssignee:isA,my:ast||null,allFailed:af&&!!OPEN_ST[t.s],
        canEdit:has('EDIT'), canCancel:has('CANCEL'),
        canRestore:has('RESTORE')&&!!t.sBefore,  /* restore.service.ts:26-31: không có trạng thái trước khi hủy (vd từ chối kế hoạch) thì không khôi phục được */
        canAcknowledge:has('ACKNOWLEDGE')&&isA&&ast==='PENDING',
        canComplete:has('COMPLETE')&&isA&&(ast==='IN_PROGRESS'||ast==='REVISION_REQUIRED'),
        canTransfer:has('TRANSFER')&&isA&&ast==='IN_PROGRESS',
        canRejectTask:has('REJECT')&&isA&&ast==='PENDING'&&!isC,
        canApprovePlan:has('APPROVE')&&t.s==='PENDING_APPROVAL', canRejectPlan:has('REJECT')&&t.s==='PENDING_APPROVAL',
        canApproveReview:has('APPROVE')&&t.s==='PENDING_REVIEW', canRejectReview:has('REJECT_REVIEW'),
        canRequestExtension:has('REQUEST_EXTENSION')&&isA&&ast==='IN_PROGRESS'&&wf(t)!=='IMMEDIATE',
        canWithdrawExtension:has('WITHDRAW_EXTENSION')&&isA&&ast==='IN_PROGRESS',
        canApproveExtension:has('APPROVE_EXTENSION'),
        canReassign:has('REASSIGN')&&af,  /* TaskActionButtons.tsx:57-59 — UI≠: service cho cả BOSS và người tạo (Trực tiếp), UI V1 chỉ ADMIN thấy nút */
        canToggleForce:has('FORCE_MODE'),
        canSupplement:!!t.approval&&(t.s==='IN_PROGRESS'||t.s==='PENDING_REVIEW')&&isA&&ast==='COMPLETED'};
    },
    /* ai đang giữ việc */
    holder:function(t){
      if(t.s==='DRAFT')return [t.cr];
      if(t.s==='PENDING_APPROVAL'||t.s==='PENDING_REVIEW')return [DATA.BOSS];
      if(t.s==='COMPLETED'||t.s==='CANCELLED')return [];
      if(t.s==='WAITING_ACKNOWLEDGE')return Task.active(t).filter(function(c){return t.as[c].st==='PENDING'});
      return Task.active(t).filter(function(c){return t.as[c].st!=='COMPLETED'});
    },
    /* Hành động của NGƯỜI ĐANG XEM: main = khu hành động (nút chính), more = menu ⋯ */
    actions:function(t){
      var P=Task.perm(t), main=[], more=[];
      if(P.canReassign)main.push(['reassign','act.reassign','p']);
      if(P.canRestore)main.push(['restore','act.restore','p']);
      if(P.canApprovePlan)main.push(['approve','act.approve','p']);
      if(P.canRejectPlan)main.push(['reject','act.decline','neg']);
      if(P.canApproveReview)main.push(['review','act.review','p']);
      if(P.canRejectReview)main.push(['rework','act.rework','neg']);
      if(P.canAcknowledge)main.push(['accept','act.accept','p']);
      if(P.canRejectTask)main.push(['decline','act.decline','neg']);
      if(P.canComplete)main.push(['report','act.report','p']);
      if(P.canSupplement)main.push(['supplement','act.supplement','']);
      if(P.canTransfer)more.push(['transfer','transfer','act.transfer']);
      if(P.canRequestExtension)more.push(['extend','calendar-plus','act.extend']);
      if(P.canCancel)more.push(['cancel','x-circle','act.cancel',1]);
      return {main:main,more:more,perm:P};
    },
    /* việc đang chờ chính người xem (tab "Cần tôi xử lý", dải chờ bạn) */
    needsMe:function(t){return Task.actions(t).main.some(function(x){return ['approve','review','accept','report','reassign'].indexOf(x[0])>-1})},
    canEdit:function(t){return t.s!=='COMPLETED'&&t.s!=='CANCELLED'&&Task.perm(t).canEdit}
  };
  App.task=Task;
  App.allowedActions=allowedActions;

  function hist(t,k,v,who){t.hist.push([nowStamp(),who===undefined?App.me():who,k,v||null])}
  function nextVer(a,major){var l=Task.latest(a);if(!l)return '1.0';var p=l.v.split('.');return major?(+p[0]+1)+'.0':p[0]+'.'+(+p[1]+1)}
  function autoRejectExt(t){t.ext.forEach(function(e){if(e.st==='PENDING'){e.st='REJECTED';e.auto=1;}})}
  /* _shared.ts:172-194 checkAllFailed: mọi người làm REJECTED/TRANSFERRED → bật allFailed, báo người tạo (ALL_FAILED) */
  function checkAllFailed(t){if(Task.allFailed(t)&&!t.allFailed){t.allFailed=1;hist(t,'allFailed',{b:t.cr},null);return true;}return false}
  /* việc đã hủy không báo trễ/sắp hạn (sửa lỗi V1) */
  function dueOf(t){var d=I18N.due(t.due);if(t.s==='CANCELLED'){var iso=Task.dueIso(t);d={tone:'none',label:iso?T('due.on',{d:dt(iso,true)}):d.label};}return d}
  App.dueOf=dueOf;
  function tk(t){return '<div class="tk"><span class="mono">'+t.id+'</span><b>'+esc(I18N.title(t))+'</b></div>'}
  function txt(v){return {vi:v,en:v}}
  function personRadio(name,c,extra){return '<label class="check tr-opt"><input type="'+(extra&&extra.multi?'checkbox':'radio')+'" name="'+name+'" value="'+c+'">'+av(c,'av-sm')+'<span>'+esc(nm(c))+(extra&&extra.tag?'<small class="faint"> · '+esc(extra.tag)+'</small>':'')+'</span></label>'}

  /* App.act(task, k, {done(res), cancel(), who, ext}) — mở hộp thoại hành động, xác nhận xong thì cập nhật task + toast + done({moved,from}) */
  App.act=function(t,k,opt){
    opt=opt||{}; Task.norm(t); var me=App.me(), from=t.s, title=I18N.title(t);
    function finish(msg,type){var moved=t.s!==from;if(msg)App.toast(msg,type);if(opt.done)opt.done({moved:moved,from:from});}
    var base={onClose:function(){if(opt.cancel)opt.cancel()}};
    function D(o){for(var x in base)if(!(x in o))o[x]=base[x];return App.dialog(o)}
    /* approval.service.ts:24-60 — PENDING_APPROVAL → WAITING_ACKNOWLEDGE */
    if(k==='approve')return D({title:T('app.dlg.approve.t'),body:'<p>'+esc(T('app.dlg.approve.d',{t:title,s:T('st.WAITING_ACKNOWLEDGE')}))+'</p>',size:'sm',ok:T('act.approve'),
      onOk:function(){t.s='WAITING_ACKNOWLEDGE';t.since=0;Task.active(t).forEach(function(c){t.as[c].st='PENDING'});hist(t,'approved');finish(T('app.toast.moved',{id:t.id,s:T('st.'+t.s)}))}});
    /* approval.service.ts:146 — PENDING_REVIEW → COMPLETED */
    if(k==='review')return D({title:T('app.dlg.review.t'),body:'<p>'+esc(T('app.dlg.review.d',{t:title,s:T('st.COMPLETED')}))+'</p>',size:'sm',ok:T('act.review'),
      onOk:function(){t.s='COMPLETED';t.due='ok';t.unseen=0;t.since=0;autoRejectExt(t);hist(t,'reviewed');finish(T('app.toast.moved',{id:t.id,s:T('st.COMPLETED')}))}});
    /* acknowledge.service.ts:21-60 — người làm PENDING → IN_PROGRESS; việc WAITING_ACKNOWLEDGE → IN_PROGRESS ngay khi người đầu tiên nhận */
    if(k==='accept'){var act=Task.active(t), acc=act.filter(function(c){return t.as[c].st!=='PENDING'}).length;
      return D({title:T('app.dlg.accept.t'),body:'<p>'+esc(T('app.dlg.accept.d',{t:title,s:T('st.IN_PROGRESS')}))+'</p>'+
        (act.length>1?'<p class="note">'+ic('users','i-sm')+'<span>'+esc(T('app.dlg.accept.multi',{n:act.length,x:acc}))+'</span></p>':''),size:'sm',ok:T('act.accept'),
        onOk:function(){t.as[me]=t.as[me]||{};t.as[me].st='IN_PROGRESS';if(t.s==='WAITING_ACKNOWLEDGE'){t.s='IN_PROGRESS';t.since=0;}hist(t,'accepted');
          finish(t.s!==from?T('app.toast.moved',{id:t.id,s:T('st.'+t.s)}):T('app.toast.accepted',{id:t.id}))}});}
    /* Từ chối nhận (assignment.service.ts:126-222): lý do BẮT BUỘC, chỉ cần không rỗng (TaskActionPanel ReasonModal required).
       Việc được chuyển giao tới → người chuyển quay lại IN_PROGRESS + thông báo "Công việc được trả lại"; nếu không ai còn hiệu lực → allFailed. */
    if(k==='decline'){
      var mine=t.as[me]||{}, back=mine.from&&t.as[mine.from]&&t.as[mine.from].st==='TRANSFERRED'?mine.from:null;
      return D({title:T('app.dlg.decline.t'),form:1,size:'md',ok:T('act.decline'),danger:0,
        body:tk(t)+(back?'<p class="note">'+ic('undo','i-sm')+'<span>'+esc(T('app.dlg.decline.back',{a:nm(back)}))+'</span></p>':'')+fieldTa('rsn',T('app.dlg.reason'),T('app.dlg.decline.ph'),1),
        init:function(w,api){liveCheck(w,api,'#rsn',function(x){reqCheck(x)})},
        onOk:function(w){var x=$('#rsn',w);if(!reqCheck(x)){x.focus();return false;}
          mine.st='REJECTED';mine.why=txt(x.value.trim());mine.w=nowStamp();t.as[me]=mine;hist(t,'declined');
          if(back){var b=t.as[back];b.st='IN_PROGRESS';delete b.to;hist(t,'returned',{b:back});finish(T('app.toast.returned',{id:t.id,a:nm(back)}),'info');return;}
          var af=checkAllFailed(t);
          finish(T(af?'app.toast.allFailed':'app.toast.declined',{id:t.id}),af?'info':'success');
        }});
    }
    /* Từ chối kế hoạch (approval.service.ts:76-98): lý do KHÔNG bắt buộc (ReasonModal không có required). Việc → CANCELLED, không lưu trạng thái trước khi hủy → không khôi phục được. */
    if(k==='reject')return D({title:T('app.dlg.reject.t'),form:1,size:'md',ok:T('app.dlg.reject.ok'),danger:1,
      body:tk(t)+'<p>'+esc(T('app.dlg.reject.d'))+'</p>'+fieldTa('rsn',T('app.dlg.reason'),T('app.dlg.reject.ph'),0),
      onOk:function(w){var v=$('#rsn',w).value.trim();
        t.sBefore=null;t.s='CANCELLED';t.cancel={by:me,w:nowStamp(),x:v?txt(v):null,plan:1};
        Object.keys(t.as).forEach(function(c){var a=t.as[c];if(AS_ACTIVE[a.st]){a.st='REJECTED';a.cx=1;}});
        hist(t,'rejected');finish(T('app.toast.rejected',{id:t.id}));}});
    /* Hủy (lifecycle.service.ts:198-283): lý do bắt buộc ở UI (ReasonModal required; UI≠ service không bắt). Lưu trạng thái trước khi hủy;
       mọi người làm PENDING/IN_PROGRESS/REVISION_REQUIRED/COMPLETED → REJECTED; đơn gia hạn đang chờ tự bị từ chối. */
    if(k==='cancel')return D({title:T('app.dlg.cancel.t'),form:1,size:'md',ok:T('act.cancel'),danger:1,
      body:tk(t)+'<p>'+esc(T('app.dlg.cancel.d'))+'</p>'+fieldTa('rsn',T('app.dlg.cancel.label'),T('app.dlg.cancel.ph'),1),
      init:function(w,api){liveCheck(w,api,'#rsn',function(x){reqCheck(x)})},
      onOk:function(w){var x=$('#rsn',w);if(!reqCheck(x)){x.focus();return false;}
        t.sBefore=t.s;t.s='CANCELLED';t.cancel={by:me,w:nowStamp(),x:txt(x.value.trim())};
        Object.keys(t.as).forEach(function(c){var a=t.as[c];if(AS_ACTIVE[a.st]){a.st='REJECTED';a.cx=1;}});
        autoRejectExt(t);hist(t,'cancelled');finish(T('app.toast.cancelled',{id:t.id}));}});
    /* Khôi phục (restore.service.ts): CHỈ ADMIN; về trạng thái trước khi hủy; MỌI người làm về PENDING (giao lại từ đầu) */
    if(k==='restore')return D({title:T('app.dlg.restore.t'),body:'<p>'+esc(T('app.dlg.restore.d',{s:T('st.'+t.sBefore)}))+'</p><p class="note">'+ic('users','i-sm')+'<span>'+esc(T('app.dlg.restore.ppl'))+'</span></p>',size:'sm',ok:T('act.restore'),
      onOk:function(){t.s=t.sBefore;t.sBefore=null;t.cancel=null;t.allFailed=0;t.since=0;
        Task.people(t).forEach(function(c){var a=t.as[c]||{};a.st='PENDING';delete a.cx;delete a.to;delete a.why;delete a.from;t.as[c]=a;});
        hist(t,'restored');finish(T('app.toast.restored',{id:t.id,s:T('st.'+t.s)}))}});
    /* Báo cáo xong (CompleteTaskModal + lifecycle.service.ts:25-196) / Bổ sung (SupplementReportModal): nội dung ≥10 ký tự (UI), tệp theo attachment-rules, dán ảnh.
       Báo cáo xong có ô chọn Mẫu hoàn thành (mẫu chung + mẫu đúng loại việc). Mọi người còn hiệu lực đã COMPLETED → Chờ nghiệm thu (Phê duyệt, hoặc người vừa nộp đang "Cần làm lại") / Đã xong (Trực tiếp). */
    if(k==='report'||k==='supplement'){
      var rep=k==='report', mineA=t.as[me]||{}, wasRev=mineA.st==='REVISION_REQUIRED', v=rep?(Task.latest(mineA)?nextVer(mineA,wasRev):'1.0'):nextVer(mineA,false);
      var left=Task.active(t).filter(function(c){return c!==me&&t.as[c].st!=='COMPLETED'}).length, files=[];
      var next=!rep?'':left?'<p class="note warn">'+ic('info','i-sm')+'<span>'+esc(T('app.dlg.next.wait',{n:left}))+'</span></p>'
        :'<p class="note">'+ic('info','i-sm')+'<span>'+esc(T(t.approval||wasRev?'app.dlg.next.approval':'app.dlg.next.direct'))+'</span></p>';
      var tps=rep?DATA.templatesFor(t):[];
      var tpl=!rep?'':'<div class="field"><label class="lbl" for="rpTpl">'+esc(T('app.dlg.tpl'))+' <span class="opt">('+esc(T('app.opt'))+')</span></label>'+
        (tps.length?'<select class="select" id="rpTpl"><option value="">'+esc(T('app.dlg.tpl.ph'))+'</option>'+tps.map(function(x){return '<option value="'+x.id+'">'+esc('['+L(x.cat)+'] '+L(x.t))+'</option>'}).join('')+'</select><p class="hint">'+esc(T('app.dlg.tpl.hint',{ty:I18N.type(t)}))+'</p>'
          :'<p class="note">'+ic('info','i-sm')+'<span>'+esc(T('app.dlg.tpl.none'))+'</span></p>')+'</div>';
      return D({title:T(rep?'app.dlg.report.t':'app.dlg.supp.t'),sub:esc(T('app.dlg.report.ver',{v:'v'+v})),form:1,size:'md',ok:T(rep?'app.dlg.report.send':'app.dlg.supp.send'),
        body:tk(t)+tpl+fieldTa('rpt',T(rep?'app.dlg.report.label':'app.dlg.supp.label'),T(rep?'app.dlg.report.ph':'app.dlg.supp.ph'),1,5,'<span class="tf-cnt" id="rptN"></span>')+attField()+next,
        init:function(w,api){
          wireAtt(w,files);
          var ta=$('#rpt',w), cn=$('#rptN',w); function cnt(){var n=ta.value.length;cn.textContent=n<10?n+'/10':'';cn.classList.toggle('over',n>0&&n<10);}
          ta.addEventListener('input',cnt); cnt();
          liveCheck(w,api,'#rpt',function(x){minCheck(x,'app.dlg.minErr')});
          var sel=$('#rpTpl',w); if(sel)sel.addEventListener('change',function(){var x=tps.filter(function(p){return p.id===sel.value})[0];if(x){ta.value=L(x.x);cnt();if(api.tried)minCheck(ta,'app.dlg.minErr');}});
        },
        onOk:function(w){var x=$('#rpt',w);if(!minCheck(x,'app.dlg.minErr')){x.focus();return false;}
          t.as[me]=mineA; mineA.rv=mineA.rv||[]; mineA.rv.push({v:v,w:nowStamp(),x:txt(x.value.trim()),f:files.map(function(f){return {n:f.n,s:f.s}})});
          if(rep){mineA.st='COMPLETED';hist(t,'reported',{v:'v'+v});
            if(Task.active(t).every(function(c){return t.as[c].st==='COMPLETED'})){t.s=t.approval||wasRev?'PENDING_REVIEW':'COMPLETED';t.since=0;if(t.s==='COMPLETED'){t.due='ok';t.unseen=1;}autoRejectExt(t);}
            finish(t.s!==from?T('app.toast.moved',{id:t.id,s:T('st.'+t.s)}):T(t.approval?'app.toast.partial':'app.toast.partialDirect'),t.s!==from?'success':'info');}
          else{hist(t,'supplemented',{v:'v'+v});finish(T('app.toast.supp',{v:'v'+v}));}
        }});
    }
    /* Yêu cầu làm lại (approval.service.ts:199-265, RejectReviewModal): chọn người đã COMPLETED, lý do từng người không rỗng → REVISION_REQUIRED, việc về IN_PROGRESS */
    if(k==='rework'){
      var cand=Task.active(t).filter(function(c){return t.as[c].st==='COMPLETED'}), pre=opt.who;
      var body=tk(t)+'<p>'+esc(T('app.dlg.rework.d'))+'</p><fieldset class="field rw-set" style="border:0;padding:0;margin:0 0 4px"><legend class="lbl">'+esc(T('app.dlg.rework.pick'))+' <span class="req" aria-hidden="true">*</span></legend>'+
        cand.map(function(c){var l=Task.latest(t.as[c]);return '<div class="rw-row"><label class="check"><input type="checkbox" value="'+c+'"'+(c===pre?' checked':'')+'>'+av(c,'av-sm')+'<span>'+esc(nm(c))+'</span><span class="mono faint" style="margin-left:auto;font-size:12px">v'+(l?l.v:'')+'</span></label>'+
          '<div class="rw-why" data-for="'+c+'"'+(c===pre?'':' hidden')+'>'+fieldTa('rw_'+c,T('app.dlg.rework.reason',{a:nm(c)}),T('app.dlg.rework.ph'),1,2)+'</div></div>'}).join('')+
        '<p class="err" id="rwPickE" hidden></p></fieldset>';
      return D({title:T('app.dlg.rework.t'),form:1,size:'md',ok:T('act.rework'),danger:0,body:body,
        init:function(w,api){
          w.addEventListener('change',function(e){var c=e.target.closest('input[type=checkbox]');if(!c)return;var box=$('[data-for="'+c.value+'"]',w);box.hidden=!c.checked;if(c.checked)$('textarea',box).focus();if(api.tried)pickErr()});
          liveCheck(w,api,'.rw-why textarea',function(x){reqCheck(x)});
          function pickErr(){var n=$$('input[type=checkbox]:checked',w).length,e=$('#rwPickE',w);e.hidden=!!n;e.innerHTML=n?'':ic('alert','i-xs')+'<span>'+esc(T('app.dlg.rework.errPick'))+'</span>';return n}
          api.pickErr=pickErr;
        },
        onOk:function(w,api){
          var ok=api.pickErr(), sel=$$('input[type=checkbox]:checked',w).map(function(c){return c.value});
          var bad=null; sel.forEach(function(c){var x=$('#rw_'+c,w);if(!reqCheck(x)&&!bad)bad=x;});
          if(!ok){$('input[type=checkbox]',w).focus();return false;} if(bad){bad.focus();return false;}
          sel.forEach(function(c){var x=$('#rw_'+c,w);t.as[c].st='REVISION_REQUIRED';t.as[c].rw={by:me,w:nowStamp(),x:txt(x.value.trim())};hist(t,'rework',{b:c});});
          t.s='IN_PROGRESS';t.since=0;finish(T('app.toast.rework',{n:sel.length,id:t.id}));
        }});
    }
    /* Xin gia hạn (extension.service.ts:32-110, RequestExtensionModal): chỉ người làm đang IN_PROGRESS; UI chỉ ở quy trình Phê duyệt.
       Tối đa 2 đơn chờ, tổng 5 đơn; ngày mới > hạn hiện tại, > hôm nay, > ngày của đơn đang chờ gần nhất; lý do không rỗng. */
    if(k==='extend'){
      var c=Task.extCount(t), cur=Task.dueIso(t);
      if(c.total>=5||c.pending>=2)return D({title:T('app.dlg.ext.blockT'),size:'sm',body:'<p class="note warn">'+ic('alert','i-sm')+'<span>'+esc(T(c.total>=5?'app.dlg.ext.blockTotal':'app.dlg.ext.blockPending'))+'</span></p>'});
      var floor=[cur||DATA.TODAY,DATA.TODAY].concat(t.ext.filter(function(e){return e.st==='PENDING'}).map(function(e){return e.to})).sort().pop();
      var min=addDays(floor,1);
      return D({title:T('app.dlg.ext.t'),form:1,size:'md',ok:T('app.dlg.ext.send'),
        body:tk(t)+'<div class="ext-dates"><div class="field"><div class="lbl">'+esc(T('app.dlg.ext.cur'))+'</div><div class="input ro mono">'+(cur?dt(cur):esc(T('due.none')))+'</div></div>'+
          '<div class="field"><label class="lbl" for="exD">'+esc(T('app.dlg.ext.new'))+' <span class="req" aria-hidden="true">*</span></label><input class="input mono" type="date" id="exD" min="'+min+'" value="'+addDays(min,1)+'" aria-describedby="exDE"><p class="err" id="exDE" hidden></p></div></div>'+
          fieldTa('exW',T('app.dlg.reason'),T('app.dlg.ext.ph'),1,3)+'<p class="note">'+ic('info','i-sm')+'<span>'+esc(T('app.dlg.ext.quota',{n:5-c.total,p:2-c.pending}))+'</span></p>',
        init:function(w,api){liveCheck(w,api,'#exW',function(x){reqCheck(x)});liveCheck(w,api,'#exD',function(x){setErr(x,x.value&&x.value>=min?'':T('app.dlg.ext.dateErr',{d:dt(floor)}))})},
        onOk:function(w){var d=$('#exD',w),x=$('#exW',w);var okD=setErr(d,d.value&&d.value>=min?'':T('app.dlg.ext.dateErr',{d:dt(floor)})),okW=reqCheck(x);
          if(!okD){d.focus();return false;} if(!okW){x.focus();return false;}
          t.ext.push({id:Date.now(),by:me,w:nowStamp(),from:cur||DATA.TODAY,to:d.value,x:txt(x.value.trim()),st:'PENDING'});hist(t,'extReq',{d:d.value});
          finish(T('app.toast.extSent',{d:dt(d.value)}));}});
    }
    /* Duyệt / từ chối gia hạn (extension.service.ts:126,186): BOSS/ADMIN; phản hồi không bắt buộc */
    if(k==='extOk'||k==='extNo'){
      var e=t.ext.filter(function(x){return String(x.id)===String(opt.ext)})[0]; if(!e)return;
      var okk=k==='extOk';
      return D({title:T(okk?'app.dlg.extOk.t':'app.dlg.extNo.t'),form:1,size:'sm',ok:T(okk?'act.approve':'act.decline'),danger:!okk,
        body:'<p>'+esc(okk?T('app.dlg.extOk.d',{d:dt(e.to)}):T('app.dlg.extNo.d'))+'</p>'+fieldTa('exR',T('app.dlg.reply'),T('app.dlg.reply.ph'),0,2),
        onOk:function(w){var r=$('#exR',w).value.trim();e.st=okk?'APPROVED':'REJECTED';if(r)e.re={by:me,w:nowStamp(),x:txt(r)};
          if(okk){t.due=daysBetween(DATA.TODAY,e.to);hist(t,'extOk',{d:e.to});}else hist(t,'extNo',{b:e.by});
          finish(okk?T('app.toast.extOk',{d:dt(e.to)}):T('app.toast.extNo'));}});
    }
    /* Rút đơn (extension.service.ts:225-250): V1 lưu thành REJECTED + ghi chú "Withdrawn by requester" (không có trạng thái "Đã rút" riêng) */
    if(k==='extWd'){
      var e2=t.ext.filter(function(x){return String(x.id)===String(opt.ext)})[0]; if(!e2)return;
      return D({title:T('app.dlg.wd.t'),body:'<p>'+esc(T('app.dlg.wd.d',{d:dt(e2.to)}))+'</p>',size:'sm',ok:T('app.dlg.wd.ok'),danger:1,
        onOk:function(){e2.st='REJECTED';e2.wd=1;hist(t,'extWd');finish(T('app.toast.extWd'))}});
    }
    /* Chuyển giao (assignment.service.ts:25-122, TransferModal): chỉ khi việc IN_PROGRESS và mình IN_PROGRESS, không khi Bắt buộc.
       Người nhận: EMPLOYEE + BOSS đang hoạt động (assignable-users), trừ mình và MỌI người đã có trong việc (kể cả đã từ chối/chuyển đi → không thể vòng lặp). Ghi chú BẮT BUỘC ở UI (UI≠ service cho trống). */
    if(k==='transfer'){
      if(t.force)return D({title:T('app.dlg.tr.t'),size:'sm',body:'<p class="note warn">'+ic('lock','i-sm')+'<span>'+esc(T('app.dlg.forceNote'))+'</span></p>'});
      var inTask=Task.people(t), opts=DATA.USERS.filter(function(c){return c!==me&&inTask.indexOf(c)<0});
      return D({title:T('app.dlg.tr.t'),form:1,size:'md',ok:T('app.dlg.tr.ok'),
        body:tk(t)+'<p>'+esc(T('app.dlg.tr.d'))+'</p><fieldset class="field" style="border:0;padding:0"><legend class="lbl">'+esc(T('app.dlg.tr.to'))+' <span class="req" aria-hidden="true">*</span></legend>'+
          opts.map(function(c){return personRadio('trTo',c,{tag:DATA.roleOf(c)==='BOSS'?T('role.boss'):''})}).join('')+
          '<p class="hint">'+esc(T('app.dlg.tr.hint'))+'</p><p class="err" id="trE" hidden></p></fieldset>'+
          fieldTa('trN',T('app.dlg.tr.note'),T('app.dlg.tr.ph'),1,2),
        init:function(w,api){w.addEventListener('change',function(e){if(e.target.name==='trTo'&&api.tried)$('#trE',w).hidden=true});liveCheck(w,api,'#trN',function(x){reqCheck(x,'app.dlg.tr.noteErr')})},
        onOk:function(w){var r=$('input[name=trTo]:checked',w),e=$('#trE',w),n=$('#trN',w);
          if(!r){e.hidden=false;e.innerHTML=ic('alert','i-xs')+'<span>'+esc(T('app.dlg.tr.err'))+'</span>';$('input[name=trTo]',w).focus();return false;}
          if(!reqCheck(n,'app.dlg.tr.noteErr')){n.focus();return false;}
          var to=r.value; t.as[me].st='TRANSFERRED';t.as[me].to=to;t.as[me].w=nowStamp();t.as[to]={st:'PENDING',from:me,trNote:txt(n.value.trim())};if(t.a.indexOf(to)<0)t.a.push(to);
          hist(t,'transferred',{b:to});finish(T('app.toast.transferred',{a:nm(to)}));}});
    }
    /* Giao lại khi mọi người đã từ chối (assignment.service.ts:225-302, ReassignModal): chọn NHIỀU người (V1 liệt kê mọi người dùng đang hoạt động),
       người được chọn về PENDING, việc về WAITING_ACKNOWLEDGE, tắt allFailed, gửi "Được giao lại: …" */
    if(k==='reassign'){
      var rlist=DATA.ALL_USERS.map(function(c){var a=t.as[c];return personRadio('raTo',c,{multi:1,tag:a?T('td.as.'+a.st):DATA.roleOf(c)!=='EMPLOYEE'?T('role.'+(DATA.roleOf(c)==='ADMIN'?'admin':'boss')):''})}).join('');
      return D({title:T('app.dlg.ra.t'),form:1,size:'md',ok:T('act.reassign'),
        body:tk(t)+'<p>'+esc(T('app.dlg.ra.d'))+'</p><fieldset class="field ra-set" style="border:0;padding:0"><legend class="lbl">'+esc(T('app.dlg.ra.pick'))+' <span class="req" aria-hidden="true">*</span></legend>'+rlist+
          '<p class="hint" id="raN"></p><p class="err" id="raE" hidden></p></fieldset>',
        init:function(w,api){w.addEventListener('change',function(){var n=$$('input[name=raTo]:checked',w).length;$('#raN',w).textContent=n?T('app.dlg.ra.n',{n:n}):'';if(api.tried)$('#raE',w).hidden=!!n;})},
        onOk:function(w){var sel=$$('input[name=raTo]:checked',w).map(function(x){return x.value}),e=$('#raE',w);
          if(!sel.length){e.hidden=false;e.innerHTML=ic('alert','i-xs')+'<span>'+esc(T('app.dlg.ra.err'))+'</span>';$('input[name=raTo]',w).focus();return false;}
          sel.forEach(function(c){t.as[c]={st:'PENDING',re:1};if(t.a.indexOf(c)<0)t.a.push(c);});
          t.s='WAITING_ACKNOWLEDGE';t.allFailed=0;t.since=0;hist(t,'reassigned',{n:sel.map(nm).join(', ')});
          finish(T('app.toast.reassigned',{id:t.id,n:sel.length}));}});
    }
  };

  /* Popup báo cáo của 1 người làm (xem đủ, dài thì cuộn, kèm tệp, chọn phiên bản) */
  App.reportPopup=function(t,c){
    var a=t.as[c]; if(!a||!a.rv||!a.rv.length)return;
    var cur=a.rv.length-1;
    function body(){
      var r=a.rv[cur];
      return (a.rv.length>1?'<div class="seg rp-ver" role="group" aria-label="'+esc(T('td.version'))+'">'+a.rv.map(function(x,i){return '<button type="button" data-rv="'+i+'" aria-pressed="'+(i===cur)+'" class="mono">v'+x.v+'</button>'}).join('')+'</div>':'')+
        '<div class="by" style="margin-top:12px">'+av(c)+'<b>'+esc(nm(c))+'</b><span class="t">'+esc(when(r.w))+' · v'+r.v+'</span></div>'+
        '<div class="prose pre">'+esc(L(r.x))+'</div>'+
        (r.f&&r.f.length?'<div class="files" aria-label="'+esc(T('td.files'))+'">'+r.f.map(fileRow).join('')+'</div>':'')+
        (a.rw&&cur<a.rv.length-1||a.st==='REVISION_REQUIRED'&&a.rw?'<p class="note warn">'+ic('rotate','i-sm')+'<span><b>'+esc(T('td.reworkWhy'))+':</b> '+esc(L(a.rw.x))+' <span class="faint">— '+esc(nm(a.rw.by))+', '+esc(when(a.rw.w))+'</span></span></p>':'');
    }
    App.dialog({title:T('td.reportOf',{a:nm(c)}),sub:'<span class="mono">'+t.id+'</span> · '+esc(I18N.title(t)),size:'lg',body:body(),
      init:function(w){w.addEventListener('click',function(e){var b=e.target.closest('[data-rv]');if(!b)return;cur=+b.dataset.rv;$('.dlg-b',w).innerHTML=body();var nb=$('[data-rv="'+cur+'"]',w);if(nb)nb.focus();})}});
  };
  /* ================= THAO TÁC NHANH ⋯ (danh sách + bảng) ================= */
  /* icon "copy" chưa có trong sprite của ds.js → bổ sung tại chỗ */
  function ensureIcons(){
    var s=document.getElementById('ds-sprite'); if(!s||document.getElementById('i-copy'))return;
    var y=document.createElementNS('http://www.w3.org/2000/svg','symbol'); y.setAttribute('id','i-copy'); y.setAttribute('viewBox','0 0 24 24');
    y.innerHTML='<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'; s.appendChild(y);
  }
  document.addEventListener('DOMContentLoaded',ensureIcons);
  function copyId(id){
    var ok=function(){App.toast(T('qa.copied',{id:id}))};
    try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(id).then(ok,ok);return;}}catch(e){}
    try{var x=document.createElement('textarea');x.value=id;x.setAttribute('readonly','');x.style.cssText='position:fixed;left:-9999px';document.body.appendChild(x);x.select();document.execCommand('copy');x.remove();}catch(e){}
    ok();
  }
  App.copyId=copyId;
  var ACT_ICON={approve:'check',reject:'x-circle',accept:'check',decline:'x',report:'send',supplement:'file',review:'check-circle',rework:'rotate',extend:'calendar-plus',transfer:'transfer',restore:'undo',reassign:'user-plus'};
  var ACT_ORDER=['reassign','restore','approve','reject','accept','decline','report','supplement','review','rework','extend','transfer'];
  /* các hành động nghiệp vụ HỢP LỆ lúc này của người đang xem (không kể Hủy) — [k, icon, khoá nhãn] */
  function bizActions(t){
    var A=Task.actions(t), out=[];
    A.main.forEach(function(x){out.push([x[0],ACT_ICON[x[0]]||'check',x[1]])});
    A.more.forEach(function(x){if(x[0]!=='cancel')out.push([x[0],x[1],x[2]])});
    return out.sort(function(a,b){return ACT_ORDER.indexOf(a[0])-ACT_ORDER.indexOf(b[0])});
  }
  /* App.quickGroups(t) → 4 nhóm: [xem], [nghiệp vụ], [sửa, ★], [hủy]. Hành động không hợp lệ thì không có trong nhóm. */
  App.quickGroups=function(t){
    var A=Task.actions(t), g3=[];
    if(Task.canEdit(t))g3.push(['edit','edit','act.edit']);
    if(App.isBoss())g3.push(['star','star',t.star?'card.unstar':'card.star']);
    return [[['view','eye','qa.view'],['full','expand','td.openFull'],['copy','copy','qa.copy']],bizActions(t),g3,
      A.more.filter(function(x){return x[0]==='cancel'}).map(function(x){return ['cancel','x-circle','act.cancel',1]})];
  };
  function groupsHtml(gs){return gs.filter(function(g){return g.length}).map(function(g){return g.map(function(x){return mi(x[0],x[1],T(x[2]),{danger:x[3]})}).join('')}).join('<hr>')}
  /* App.quickMenu(btn, task, {onView(id), onChange(k,res)}) — menu ⋯ trên dòng/thẻ. Trang tự stopPropagation để không mở ngăn chi tiết. */
  App.quickMenu=function(btn,t,o){
    o=o||{}; ensureIcons();
    App.menu(btn,groupsHtml(App.quickGroups(t)),function(el){
      var k=el.dataset.mi;
      if(document.contains(btn))btn.focus({preventScroll:true});
      if(k==='view'){if(o.onView)o.onView(t.id);return;}
      if(k==='full'){location.href='task.html?id='+encodeURIComponent(t.id);return;}
      if(k==='copy'){copyId(t.id);return;}
      if(k==='edit'){location.href='task-form.html?id='+encodeURIComponent(t.id);return;}
      if(k==='star'){t.star=t.star?0:1;hist(t,t.star?'starOn':'starOff');App.toast(T(t.star?'qa.starOn':'qa.starOff',{id:t.id}));if(o.onChange)o.onChange('star',{moved:false});return;}
      App.act(t,k,{done:function(r){if(o.onChange)o.onChange(k,r)}});
    },{fixed:true,label:T('qa.menu',{id:t.id})});
  };

  function fileRow(f){var n=L(f.n);return '<div class="file">'+ic('file','i-sm')+'<span class="fn" title="'+esc(n)+'">'+esc(n)+'</span><span class="fs">'+esc(f.s)+'</span><button type="button" class="icon-btn" data-ta="dl" aria-label="'+esc(T('td.download',{f:n}))+'">'+ic('download','i-sm')+'</button></div>'}

  /* ================= CHI TIẾT CÔNG VIỆC (drawer | page) ================= */
  var REG={};
  function statHtml(cls,label){return '<span class="stat '+cls+'"><span class="sdot" aria-hidden="true"></span><span>'+esc(label)+'</span></span>'}
  function mention(s){var h=esc(s);Object.keys(P).forEach(function(k){h=h.split('@'+esc(P[k][0])).join('<span class="at">@'+esc(P[k][0])+'</span>')});return h}
  function descHtml(t){
    if(!t.desc.length)return '<p class="none">'+esc(T('td.descEmpty'))+'</p>';
    return t.desc.map(function(b){
      if(b.p)return '<p>'+esc(L(b.p))+'</p>';
      if(b.h)return '<h4>'+esc(L(b.h))+'</h4>';
      if(b.ul)return '<ul>'+b.ul.map(function(x){return '<li>'+esc(L(x))+'</li>'}).join('')+'</ul>';
      return '';
    }).join('');
  }
  function journey(t,page){
    var stop=t.s==='CANCELLED', base=stop?(t.sBefore||(t.cancel&&t.cancel.plan?'PENDING_APPROVAL':'IN_PROGRESS')):t.s;
    var steps=Task.steps(t), cur=steps.indexOf(base); if(cur<0)cur=0;
    var end=addDays(DATA.TODAY,-(t.s==='COMPLETED'?0:t.since)), span=Math.max(daysBetween(t.at,end),0);
    var li=steps.map(function(s,i){
      var cls=i<cur?'done':i===cur?'cur':'todo';
      if(i===cur&&s==='COMPLETED')cls+=' fin'; if(i===cur&&stop)cls+=' stop';
      var date=t.stepDates&&t.stepDates[s]&&i<=cur?t.stepDates[s]:(i<=cur?addDays(t.at,cur?Math.round(span*i/cur):0):null);
      if(stop&&i===cur&&t.cancel)date=t.cancel.w.split(' ')[0];
      var lab=stop&&i===cur?T('st.CANCELLED'):T('st.'+s);
      return '<li class="'+cls+'"'+(i===cur?' aria-current="step"':'')+'><span class="nd">'+(i<cur||(s==='COMPLETED'&&i===cur)?ic('check'):stop&&i===cur?ic('x'):'')+'</span><span class="lb">'+esc(lab)+'</span>'+(date?'<span class="dt">'+dt(date,true)+'</span>':'<span class="dt" aria-hidden="true">&nbsp;</span>')+'</li>';
    }).join('');
    return {ol:'<ol class="jr'+(page?' jr-c':'')+'" style="--n:'+steps.length+'">'+li+'</ol>',cur:cur,n:steps.length};
  }
  function holderLine(t){
    var h=Task.holder(t), me=App.me();
    if(Task.perm(t).allFailed)return ic('alert','i-sm')+'<span>'+esc(T('td.af.holder'))+'</span>';
    if(t.s==='COMPLETED')return ic('check-circle','i-sm')+'<span>'+esc(T('td.closed',{d:dt(DATA.TODAY)}))+'</span>';
    if(t.s==='CANCELLED')return ic('x-circle','i-sm')+'<span>'+esc(T('td.cancelledOn',{d:dt(t.cancel?t.cancel.w.split(' ')[0]:DATA.TODAY)}))+'</span>';
    if(!h.length)return ic('clock','i-sm')+'<span>'+esc(T('td.wait.'+t.s))+'</span>';
    var first=h.indexOf(me)>-1?me:h[0];
    var who=first===me?T('td.you'):nm(first);
    var whoH='<b>'+esc(h.length>1?T('td.andN',{a:who,n:h.length-1}):who)+'</b>';
    if(t.since===0)return av(first)+'<span>'+fill('td.atNow',{a:whoH})+'</span>';
    if(first===me&&h.length===1)return av(first)+'<span>'+esc(T('td.atYou',{n:t.since}))+'</span>';
    return av(first)+'<span>'+fill('td.at',{a:whoH,n:t.since})+'</span>';
  }
  function moreBtn(t,cls){return '<button type="button" class="icon-btn '+(cls||'')+'" data-ta="more" aria-haspopup="menu" aria-expanded="false" aria-label="'+esc(T('card.more'))+'">'+ic('more')+'</button>'}
  function starBtn(t,cls){return App.isBoss()?'<button type="button" class="icon-btn starb '+(cls||'')+'" data-ta="star" aria-pressed="'+!!t.star+'" aria-label="'+esc(T(t.star?'card.unstar':'card.star'))+'" title="'+esc(T(t.star?'card.unstar':'card.star'))+'">'+ic('star')+'</button>':''}
  function actBtns(t,size){
    var a=Task.actions(t).main;
    return a.slice().reverse().map(function(x){return '<button type="button" class="btn '+(x[2]==='p'?'btn-p':x[2]==='neg'?'btn-neg':'')+(size?' '+size:'')+'" data-ta="act" data-k="'+x[0]+'">'+(x[2]==='p'?ic(x[0]==='reassign'||x[0]==='restore'?ACT_ICON[x[0]]:'check','i-sm'):'')+esc(T(x[1]))+'</button>'}).join('');
  }

  /* ----- khối có khung dùng chung cho drawer + trang: .blk > .blk-h (icon + tiêu đề + đếm/phụ) + .blk-b ----- */
  function blk(id,icon,title,aux,body,o){
    o=o||{}; var h=o.h||'h3';
    return '<section class="blk'+(o.cls?' '+o.cls:'')+'"'+(o.sid?' id="'+o.sid+'"':'')+' aria-labelledby="'+id+'"><header class="blk-h">'+ic(icon,'i-sm')+
      '<'+h+' id="'+id+'">'+esc(title)+'</'+h+'>'+(aux||'')+'</header><div class="blk-b'+(o.flush?' flush':'')+'">'+body+'</div></section>';
  }
  function cntH(n){return n?'<span class="cnt mono">'+n+'</span>':''}
  function auxH(s){return '<span class="aux">'+s+'</span>'}
  function prH(t){return '<span class="pr pr-'+t.p+'">'+ic('flag')+esc(T('pr.'+t.p))+'</span>'}
  function dueH(t,d){
    var ec=Task.extCount(t), iso=Task.dueIso(t);
    return '<span class="due-'+d.tone+'">'+esc(d.label)+'</span>'+(iso&&t.due!=='ok'&&t.s!=='CANCELLED'?'<span class="mono faint">'+dt(iso,true)+'</span>':'')+
      (ec.total?'<small>'+esc(T('td.extUsed',{n:ec.total}))+'</small>':'');
  }
  /* dòng nhắc lượt: "Đến lượt bạn duyệt · đang chờ 2 ngày" */
  function turnText(t){
    var m=Task.actions(t).main; if(!m.length)return '';
    var k=m[0][0], s=T('td.turn.'+k);
    if(k!=='supplement'&&k!=='restore'&&typeof t.since==='number')s+=' · '+(t.since>0?T('td.turn.days',{n:t.since}):T('td.turn.new'));
    return s;
  }
  /* Banner "mọi người đã từ chối" (allFailed) — V1: thông báo ALL_FAILED cho người tạo (_shared.ts:172-194); nút Giao lại chỉ ADMIN (TaskActionButtons.tsx:57-59);
     người tạo là nhân viên được Hủy (taskActionMatrix.ts:186-190). Vice Manager: service cho giao lại nhưng UI V1 không có nút. */
  function afBanner(t){
    var P=Task.perm(t); if(!P.allFailed)return '';
    var who=Task.people(t).filter(function(c){return t.as[c].st==='REJECTED'}).length, k=P.canReassign?'td.af.admin':P.canCancel&&P.isCreator?'td.af.creator':App.isBossOnly()?'td.af.boss':'td.af.other';
    /* Giao lại đã là nút chính ở đầu trang / chân ngăn → banner chỉ thêm nút Hủy cho người tạo (nút Hủy vốn nằm trong ⋯) */
    var btn=!P.canReassign&&P.canCancel&&P.isCreator?'<button type="button" class="btn btn-neg btn-sm" data-ta="act" data-k="cancel">'+ic('x-circle','i-sm')+'<span>'+esc(T('act.cancel'))+'</span></button>':'';
    return '<div class="note bad td-af" role="status">'+ic('alert','i-sm')+'<div class="af-b"><b>'+esc(T('td.af.t'))+'</b><span>'+esc(T(k,{n:who,a:nm(t.cr)}))+'</span></div>'+btn+'</div>';
  }
  App.afBanner=afBanner;
  function cmItem(c,o){
    o=o||{};
    return '<div class="cmc"'+(o.id?' data-cm="'+c.id+'"':'')+'><div class="cmc-h">'+av(c.a)+'<b>'+esc(nm(c.a))+'</b><span class="t">'+esc(when(c.w))+(c.ed?' · '+esc(T('td.cm.edited')):'')+'</span>'+(o.tools||'')+'</div>'+
      (o.body!=null?o.body:'<div class="cmc-b">'+mention(L(c.x))+'</div>')+'</div>';
  }

  /* ----- drawer: bản rút gọn, chia khối ----- */
  function drawerHtml(t,o){
    var d=dueOf(t), nav=o.nav||{i:-1,n:0}, i=nav.i, n=nav.n;
    var who=t.a.length?'<span class="avs">'+t.a.slice(0,3).map(function(c){return av(c)}).join('')+'</span><span class="tx">'+esc(t.a.length>1?T('td.andN',{a:nm(t.a[0]),n:t.a.length-1}):nm(t.a[0]))+'</span>'
      :'<span class="muted">'+esc(T('card.unassigned'))+'</span>';
    var kv=[
      ['td.status',statHtml('s-'+t.s,T('st.'+t.s))],
      ['td.priority',prH(t)],
      ['td.due',dueH(t,d)],
      ['filter.assignee',who],
      ['td.creator',av(t.cr)+'<span class="tx">'+esc(nm(t.cr))+'</span>'],
      ['td.created','<span class="mono">'+dt(t.at)+'</span>'],
      ['td.type','<span class="tx">'+esc(I18N.type(t))+'</span>'],
      ['td.mode','<span class="tx">'+esc(T(t.approval?'td.mode.approval':'td.mode.direct'))+(t.force?' · '+esc(T('td.force')):'')+'</span>']
    ].map(function(r){return '<div><dt>'+esc(T(r[0]))+'</dt><dd>'+r[1]+'</dd></div>'}).join('');
    var j=journey(t);
    var reps=Task.people(t).filter(function(c){return t.as[c]&&t.as[c].rv&&t.as[c].rv.length&&t.as[c].st==='COMPLETED'});
    var rep='';
    if(reps.length&&(t.s==='PENDING_REVIEW'||t.s==='COMPLETED'||t.s==='IN_PROGRESS')){
      var c=reps[0], r=Task.latest(t.as[c]);
      rep=blk('drRep','file',T('td.report'),cntH(reps.length>1?reps.length:0)+(reps.length>1?auxH('<a class="lnk" href="task.html?id='+t.id+'#results">'+esc(T('td.allReports',{n:reps.length}))+'</a>'):''),
        '<div class="by">'+av(c)+'<b>'+esc(nm(c))+'</b><span class="t">'+esc(when(r.w))+(t.as[c].rv.length>1?' · v'+r.v:'')+'</span></div>'+
        '<div class="cmc-b prose pre">'+esc(L(r.x))+'</div>'+(r.f&&r.f.length?'<div class="files" aria-label="'+esc(T('td.files'))+'">'+r.f.map(fileRow).join('')+'</div>':''));
    }
    var cms=t.cm.slice(-3), canC=Task.canComment(t); /* V1 không khoá bình luận khi việc xong/hủy */
    var com=blk('drCm','message',T('td.tab.cm'),cntH(t.cm.length)+(t.cm.length>3?auxH('<a class="lnk" href="task.html?id='+t.id+'#comments">'+esc(T('td.cm.all',{n:t.cm.length}))+'</a>'):''),
      (cms.length?'<div class="cmc-list">'+cms.map(function(x){return cmItem(x)}).join('')+'</div>':'<p class="none">'+esc(T('td.cm.empty'))+'</p>')+
      (canC?'<div class="cbox">'+av(App.me())+'<input type="text" data-ta="cm-quick" aria-label="'+esc(T('td.cm.write'))+'" placeholder="'+esc(T('td.cm.write'))+'"></div>':''));
    var main=Task.actions(t).main;
    var foot=main.length?'<div class="dr-f"><div class="turn"><span class="pd"></span><span>'+esc(turnText(t))+'</span></div>'+actBtns(t)+'</div>':'';
    return '<div class="td-root" data-tid="'+t.id+'" style="display:contents"><header class="dr-h">'+
        '<button type="button" class="dr-back" data-ta="dr-close">'+ic('chev-l')+'<span>'+esc(T('td.back'))+'</span></button>'+
        (n?'<div class="dr-nav" role="group"><button type="button" class="icon-btn" data-ta="dr-step" data-d="-1" aria-label="'+esc(T('td.prev'))+'"'+(i<=0?' disabled':'')+'>'+ic('chev-l')+'</button>'+
        '<button type="button" class="icon-btn" data-ta="dr-step" data-d="1" aria-label="'+esc(T('td.next'))+'"'+(i<0||i>=n-1?' disabled':'')+'>'+ic('chev-r')+'</button></div>'+
        (i>-1?'<span class="dr-pos mono" aria-label="'+esc(T('td.pos',{i:i+1,n:n}))+'">'+(i+1)+' / '+n+'</span>':''):'')+
        '<span class="sp"></span>'+
        '<a class="btn btn-ghost btn-sm dr-full" href="task.html?id='+t.id+'" title="'+esc(T('td.openFull'))+'">'+ic('expand','i-sm')+'<span class="lbl-s">'+esc(T('td.openFull'))+'</span><span class="sr">'+esc(T('td.openFull'))+'</span></a>'+
        '<span class="dr-sep"></span><button type="button" class="icon-btn dr-close" data-ta="dr-close" aria-label="'+esc(T('app.close'))+'">'+ic('x')+'</button>'+
      '</header>'+
      '<div class="dr-b td-blocks">'+
        '<div class="dr-hero"><div class="dr-id"><span class="mono pid">'+t.id+'</span>'+(t.hd?'<a class="chip" href="#" data-ta="hd" aria-label="'+esc(T('td.openTicket'))+' '+t.hd+'">'+t.hd+ic('external')+'</a>':'')+
          '<span class="dr-ht">'+starBtn(t,'sm')+'<span class="mwrap">'+moreBtn(t,'sm')+'</span></span></div>'+
          '<h2 class="ptitle" id="drTitle" tabindex="-1">'+esc(I18N.title(t))+'</h2></div>'+afBanner(t)+
        blk('drInfo','info',T('td.info'),'','<dl class="kvg">'+kv+'</dl>',{flush:1})+
        blk('drJr','workflow',T('td.journey'),auxH(esc(T('td.stepOf',{i:j.cur+1,n:j.n}))),j.ol+'<div class="holder">'+holderLine(t)+'</div>')+
        (t.s==='CANCELLED'&&t.cancel?blk('drCx','x-circle',T(t.cancel.plan?'td.rejectReason':'td.cancelReason'),'','<p class="prose">'+(t.cancel.x?esc(L(t.cancel.x)):'<span class="faint">'+esc(T('td.noReason'))+'</span>')+'</p><p class="by-line">'+esc(nm(t.cancel.by))+' · '+esc(when(t.cancel.w))+'</p>',{cls:'bad'}):'')+
        blk('drDs','file',T('td.desc'),'','<div class="prose">'+descHtml(t)+'</div>')+rep+com+
      '</div>'+foot+'</div>';
  }

  /* ----- trang đầy đủ ----- */
  function pageHtml(t,ctx){
    var ui=ctx.ui, me=App.me(), d=dueOf(t), j=journey(t,true), A=Task.actions(t), ec=Task.extCount(t), boss=App.isBoss();
    /* đầu trang: meta · tiêu đề · dòng nhắc lượt | cụm nút gọn */
    var meta='<span class="mono pid">'+t.id+'</span>'+
      (t.hd?'<span class="sep" aria-hidden="true">·</span><a class="chip" href="#" data-ta="hd" aria-label="'+esc(T('td.openTicket'))+' '+t.hd+'">'+t.hd+ic('external')+'</a>':'')+
      '<span class="sep" aria-hidden="true">·</span><span class="td-tag">'+ic('workflow','i-xs')+esc(T(t.approval?'td.mode.approval':'td.mode.direct'))+'</span>'+
      (t.force?'<span class="sep" aria-hidden="true">·</span><span class="td-tag force">'+ic('lock','i-xs')+esc(T('td.force'))+'</span>':'');
    var my=Task.mine(t);
    var nudge=A.main.length?'<p class="td-nudge on"><span class="pd" aria-hidden="true"></span><span>'+esc(turnText(t))+'</span></p>'
      :'<p class="td-nudge">'+esc(my==='COMPLETED'&&t.s==='IN_PROGRESS'?T('td.wait.reported'):T('td.wait.'+t.s))+'</p>';
    var acts=A.main.length?'<div class="td-acts" role="group" aria-label="'+esc(T('td.actions'))+'">'+actBtns(t)+'</div><span class="td-tsep" aria-hidden="true"></span>':'';
    var tools='<div class="td-tools">'+acts+starBtn(t)+(Task.canEdit(t)?'<button type="button" class="btn btn-ghost td-edit" data-ta="edit">'+ic('edit','i-sm')+'<span>'+esc(T('act.edit'))+'</span></button>':'')+'<span class="mwrap">'+moreBtn(t)+'</span></div>';
    var head='<div class="td-back"><a class="btn btn-ghost btn-sm" href="tasks-list.html" data-ta="back">'+ic('arrow-l','i-sm')+'<span>'+esc(T('td.back'))+'</span></a></div>'+
      '<header class="td-head"><div class="td-hl"><div class="td-meta">'+meta+'</div><h1 class="td-title" id="tdTitle" tabindex="-1">'+esc(I18N.title(t))+'</h1>'+nudge+'</div>'+tools+'</header>';
    /* thanh tóm tắt: ô ngang chia bằng đường kẻ */
    var ppl=t.a.length?'<span class="avs">'+t.a.slice(0,3).map(function(c){return av(c)}).join('')+'</span><span class="muted" title="'+esc(t.a.map(nm).join(', '))+'">'+esc(t.a.length===1?nm(t.a[0]):T('td.pplN',{n:t.a.length}))+'</span>'
      :'<span class="muted">'+esc(T('card.unassigned'))+'</span>';
    var sum='<section class="td-sum" aria-label="'+esc(T('td.sum'))+'"><dl>'+[
      ['td.status',statHtml('s-'+t.s,T('st.'+t.s))],
      ['td.priority',prH(t)],
      ['td.due',dueH(t,d)],
      ['td.assignees',ppl],
      ['td.creator',av(t.cr)+'<span class="nm" title="'+esc(nm(t.cr))+'">'+esc(nm(t.cr))+'</span>'],
      ['td.type','<span class="nm">'+esc(I18N.type(t))+'</span>']
    ].map(function(r){return '<div class="sm-c"><dt>'+esc(T(r[0]))+'</dt><dd>'+r[1]+'</dd></div>'}).join('')+'</dl></section>';
    /* hành trình gọn */
    var jr='<section class="card td-jr" aria-labelledby="jrH"><div class="td-jr-h"><h2 id="jrH">'+ic('workflow','i-sm')+'<span>'+esc(T('td.journey'))+'</span><span class="aux">'+esc(T('td.stepOf',{i:j.cur+1,n:j.n}))+'</span></h2>'+
      '<p class="td-holder">'+holderLine(t)+'</p></div><div class="jr-scroll">'+j.ol+'</div>'+
      (t.s==='CANCELLED'&&t.cancel?'<p class="note bad">'+ic('x-circle','i-sm')+'<span><b>'+esc(T(t.cancel.plan?'td.rejectReason':'td.cancelReason'))+':</b> '+(t.cancel.x?esc(L(t.cancel.x)):esc(T('td.noReason')))+' <span class="faint">— '+esc(nm(t.cancel.by))+', '+esc(when(t.cancel.w))+'</span></span></p>':'')+'</section>';
    /* mô tả */
    var desc=blk('dsH','file',T('td.desc'),'','<div class="prose clamp'+(ui.descOpen?' open':'')+'" id="tdDesc">'+descHtml(t)+'</div>'+
      '<button type="button" class="btn-link td-more" data-ta="desc" aria-controls="tdDesc" aria-expanded="'+!!ui.descOpen+'" hidden>'+ic('chev-d','i-sm'+(ui.descOpen?' up':''))+'<span>'+esc(T(ui.descOpen?'td.less':'td.more'))+'</span></button>',{h:'h2',cls:'td-desc'});
    /* kết quả từng người */
    var canRw=A.perm.canRejectReview;
    var rows=Task.people(t).map(function(c){
      var a=t.as[c]||{st:'PENDING'}, r=Task.latest(a), sub='';
      if(a.st==='REJECTED'&&a.why)sub='<span class="faint">'+esc(T('td.declineWhy'))+':</span> '+esc(L(a.why));
      else if(a.st==='REJECTED'&&a.cx)sub='<span class="faint">'+esc(T('td.byCancel'))+'</span>';
      else if(a.st==='TRANSFERRED'&&a.to)sub=esc(T('td.toPerson',{a:nm(a.to)}));
      else if(a.st==='REVISION_REQUIRED'&&a.rw)sub='<span class="faint">'+esc(T('td.reworkWhy'))+':</span> '+esc(L(a.rw.x));
      else if(a.from)sub='<span class="faint">'+esc(T('td.fromPerson',{a:nm(a.from)}))+(a.trNote?':</span> '+esc(L(a.trNote)):'</span>');
      else if(a.re)sub='<span class="faint">'+esc(T('td.reassigned'))+'</span>';
      return '<li class="rr'+(c===me?' me':'')+'">'+av(c,'av-lg')+
        '<div class="rr-who"><b>'+esc(nm(c))+(c===me?' <span class="faint">('+esc(T('td.you'))+')</span>':'')+'</b>'+statHtml('as-'+a.st,T('td.as.'+a.st))+'</div>'+
        '<span class="rr-ver mono">'+(r?'v'+r.v:'')+'</span><span class="rr-time">'+(r?esc(when(r.w)):'')+'</span>'+
        '<span class="rr-act">'+(r?'<button type="button" class="btn btn-sm" data-ta="report" data-who="'+c+'">'+ic('file','i-sm')+'<span>'+esc(T('td.viewReport'))+'</span></button>':'<span class="faint rr-none">'+esc(a.st==='REJECTED'||a.st==='TRANSFERRED'?'':T('td.noReport'))+'</span>')+
          (canRw&&a.st==='COMPLETED'?'<button type="button" class="icon-btn sm" data-ta="act" data-k="rework" data-who="'+c+'" aria-label="'+esc(T('td.reworkThis',{a:nm(c)}))+'" title="'+esc(T('td.reworkThis',{a:nm(c)}))+'">'+ic('rotate','i-sm')+'</button>':'')+'</span>'+
        (sub?'<p class="rr-sub">'+sub+'</p>':'')+'</li>';
    }).join('');
    var nRep=Task.people(t).filter(function(c){return t.as[c]&&t.as[c].st==='COMPLETED'}).length, nAct=Task.active(t).length;
    var res=blk('rsH','users',T('td.results'),auxH(esc(T('dnd.reported',{x:nRep,n:nAct}))),'<ul class="rr-list">'+rows+'</ul>',{h:'h2',cls:'td-res',sid:'results',flush:1});
    /* cột phải: tệp, nguồn Helpdesk, thông tin thêm */
    var files='<div class="files">'+(t.files.length?t.files.map(fileRow).join(''):'<p class="none">'+esc(T('td.noFiles'))+'</p>')+'</div>'+
      '<button type="button" class="btn btn-sm td-add" data-ta="file-add">'+ic('plus','i-sm')+'<span>'+esc(T('td.addFile'))+'</span></button><input type="file" multiple class="sr" data-ta-file tabindex="-1" aria-hidden="true">';
    var hd=t.hd?blk('hdH','headset',T('td.source'),'','<dl class="kv1">'+
      '<div><dt>'+esc(T('td.ticket'))+'</dt><dd><span class="mono">'+t.hd+'</span></dd></div>'+
      (t.hdReq?'<div><dt>'+esc(T('td.requester'))+'</dt><dd>'+esc(L(t.hdReq))+'</dd></div>':'')+'</dl>'+
      '<a class="btn btn-sm" href="#" data-ta="hd" style="margin-top:12px">'+ic('external','i-sm')+'<span>'+esc(T('td.openTicket'))+'</span></a>',{h:'h2'}):'';
    var extra=blk('exH','info',T('td.extra'),'','<dl class="kv1">'+
      '<div><dt>'+esc(T('td.taskId'))+'</dt><dd><span class="mono">'+t.id+'</span><button type="button" class="mini" data-ta="copy" aria-label="'+esc(T('qa.copy'))+'" title="'+esc(T('qa.copy'))+'">'+ic('copy','i-xs')+'</button></dd></div>'+
      '<div><dt>'+esc(T('td.created'))+'</dt><dd><span class="mono">'+dt(t.at)+'</span></dd></div>'+
      '<div><dt>'+esc(T('td.mode'))+'</dt><dd>'+esc(T(t.approval?'td.mode.approval':'td.mode.direct'))+(t.force?' · '+esc(T('td.force')):'')+'</dd></div></dl>',{h:'h2'});
    var side='<aside class="td-side" aria-label="'+esc(T('td.infoToggle'))+'"><div class="td-side-b">'+
      blk('flH','clip',T('td.files'),cntH(t.files.length),files,{h:'h2'})+hd+extra+'</div></aside>';
    /* tabs Bình luận / Gia hạn / Lịch sử trong một khối */
    var tab=ui.tab||'cm';
    var tabs='<div class="tabs td-tablist" role="tablist" aria-label="'+esc(T('td.sections'))+'">'+
      [['cm','td.tab.cm',String(t.cm.length)],['ext','td.tab.ext',ec.total+'/5'],['hist','td.tab.hist',String(t.hist.length)]].map(function(x){
        return '<button type="button" class="tab" role="tab" id="tab-'+x[0]+'" aria-controls="pn-'+x[0]+'" data-ta="tab" data-tab="'+x[0]+'" aria-selected="'+(tab===x[0])+'" tabindex="'+(tab===x[0]?0:-1)+'">'+esc(T(x[1]))+'<span class="n">'+x[2]+'</span></button>'}).join('')+'</div>';
    var panel='<div class="td-panel blk-b" role="tabpanel" id="pn-'+tab+'" aria-labelledby="tab-'+tab+'">'+(tab==='cm'?cmPanel(t,ui):tab==='ext'?extPanel(t):histPanel(t))+'</div>';
    var tabsSec='<section class="blk td-tabs" id="comments"><div class="blk-h blk-tabs">'+tabs+'</div>'+panel+'</section>';
    return '<div class="td-root td-page'+(A.main.length?' has-act':'')+'" data-tid="'+t.id+'">'+head+afBanner(t)+sum+jr+'<div class="td-grid">'+desc+res+side+tabsSec+'</div></div>';
  }
  function cmPanel(t,ui){
    var me=App.me(), can=Task.canComment(t);
    var list=t.cm.length?'<div class="cm-list cmc-list">'+t.cm.map(function(c){
      var canE=Task.canEditComment(c), canD=Task.canDelComment(c), editing=ui.cmEdit===c.id, dk=c.a===me?'td.cm.del':'td.cm.delOther';
      var tools=(canE||canD)&&!editing?'<span class="cm-tools">'+(canE?'<button type="button" class="mini" data-ta="cm-edit" data-id="'+c.id+'" aria-label="'+esc(T('td.cm.edit'))+'" title="'+esc(T('td.cm.edit'))+'">'+ic('edit','i-xs')+'</button>':'')+
        (canD?'<button type="button" class="mini" data-ta="cm-del" data-id="'+c.id+'" aria-label="'+esc(T(dk))+'" title="'+esc(T(dk))+'">'+ic('trash','i-xs')+'</button>':'')+'</span>':'';
      var body=editing?'<div class="cm-edit"><label class="sr" for="cmE">'+esc(T('td.cm.edit'))+'</label><textarea class="ta" id="cmE" rows="3">'+esc(L(c.x))+'</textarea><div class="cm-edit-f"><button type="button" class="btn btn-sm" data-ta="cm-cancel">'+esc(T('app.close'))+'</button><button type="button" class="btn btn-sm" data-ta="cm-save" data-id="'+c.id+'">'+esc(T('td.cm.save'))+'</button></div></div>':null;
      return cmItem(c,{id:1,tools:tools,body:body});
    }).join('')+'</div>':'<p class="none">'+esc(T('td.cm.empty'))+'</p>';
    var box;
    if(!can)box='';
    else box='<div class="composer">'+av(me,'av-lg')+'<div class="cmp-b"><label class="sr" for="cmNew">'+esc(T('td.cm.label'))+'</label>'+
      '<div class="cmp-in"><textarea class="ta" id="cmNew" rows="2" placeholder="'+esc(T('td.cm.write'))+'" aria-describedby="cmHint" aria-autocomplete="list" aria-controls="cmSug" aria-expanded="false" data-ta-cm>'+esc(ui.draft||'')+'</textarea>'+
      '<ul class="sug" id="cmSug" role="listbox" aria-label="'+esc(T('td.cm.mention'))+'" hidden></ul></div>'+
      '<div class="cmp-f"><span class="hint" id="cmHint">'+ic('info','i-xs')+' '+esc(T('td.cm.hint'))+'</span><button type="button" class="btn btn-sm" data-ta="cm-send">'+ic('send','i-sm')+'<span>'+esc(T('td.cm.send'))+'</span></button></div></div></div>';
    return list+box;
  }
  function extPanel(t){
    var me=App.me(), A=Task.actions(t), P=A.perm, canReq=A.more.some(function(x){return x[0]==='extend'});
    var head='<div class="ext-top"><p class="hint" style="margin:0">'+ic('info','i-xs')+' '+esc(T('td.ext.rules'))+'</p>'+(canReq?'<button type="button" class="btn btn-sm" data-ta="act" data-k="extend">'+ic('calendar-plus','i-sm')+'<span>'+esc(T('act.extend'))+'</span></button>':'')+'</div>';
    if(!t.ext.length)return head+'<p class="none">'+esc(T('td.ext.empty'))+'</p>';
    return head+'<ul class="ext-list">'+t.ext.slice().reverse().map(function(e){
      var acts='';
      if(e.st==='PENDING'&&P.canApproveExtension)acts='<button type="button" class="btn btn-sm btn-neg" data-ta="act" data-k="extNo" data-ext="'+e.id+'">'+esc(T('act.decline'))+'</button><button type="button" class="btn btn-sm" data-ta="act" data-k="extOk" data-ext="'+e.id+'">'+ic('check','i-sm')+esc(T('act.approve'))+'</button>';
      else if(e.st==='PENDING'&&e.by===me&&P.canWithdrawExtension)acts='<button type="button" class="btn btn-sm btn-ghost" data-ta="act" data-k="extWd" data-ext="'+e.id+'">'+ic('undo','i-sm')+esc(T('td.ext.withdraw'))+'</button>';
      return '<li class="ext">'+av(e.by)+'<div class="body"><div class="cm-h"><b>'+esc(nm(e.by))+'</b><span>'+esc(when(e.w))+'</span>'+statHtml('ex-'+e.st,T('td.ext.st.'+e.st))+'</div>'+
        '<p class="ext-to">'+fill('td.ext.to',{a:'<span class="mono">'+dt(e.from,true)+'</span>',b:'<span class="mono">'+dt(e.to,true)+'</span>'})+'</p><p class="ext-why">'+esc(L(e.x))+'</p>'+
        (e.re?'<p class="ext-re"><span class="faint">'+esc(T('td.ext.reply',{a:nm(e.re.by)}))+':</span> '+esc(L(e.re.x))+'</p>':'')+
        (e.auto?'<p class="ext-re faint">'+esc(T('td.ext.auto'))+'</p>':'')+
        (e.wd?'<p class="ext-re faint">'+esc(T('td.ext.wd'))+'</p>':'')+
        (acts?'<div class="ext-acts">'+acts+'</div>':'')+'</div></li>';
    }).join('')+'</ul>';
  }
  function histPanel(t){
    if(!t.hist.length)return '<p class="none">'+esc(T('td.hist.empty'))+'</p>';
    return '<ol class="hist">'+t.hist.slice().reverse().map(function(h){
      var v=h[3]||{}, b=function(s){return '<b>'+esc(s)+'</b>'};
      var txt=fill('td.h.'+h[2],{a:b(nm(h[1])),b:b(nm(v.b||'')),v:esc(v.v||''),d:esc(v.d?dt(v.d,true):''),n:esc(v.n||'')});
      return '<li><span class="hd-dot" aria-hidden="true"></span><p>'+txt+'</p><time class="mono">'+esc(dtt(h[0]))+'</time></li>';
    }).join('')+'</ol>';
  }
  /* App.taskDetail(task, {mode:'drawer'|'page', nav:{i,n}, rerender(), onStep(d), onClose()}) → chuỗi HTML.
     Hành vi (hành động, tabs, bình luận, tệp…) chạy bằng uỷ quyền sự kiện qua [data-ta] trong [data-tid]. */
  App.taskDetail=function(t,o){
    o=o||{};
    var ctx=REG[t.id]&&REG[t.id].t===t?REG[t.id]:{t:t,ui:{}};
    ctx.o=o; REG[t.id]=ctx;
    return o.mode==='page'?pageHtml(t,ctx):drawerHtml(t,o);
  };
  /* gọi sau khi chèn HTML của taskDetail vào DOM: dựng icon + bật nút Xem toàn bộ nếu mô tả bị cắt */
  App.mountTask=function(root){
    if(window.dsIcons)dsIcons(root);
    var d=$('#tdDesc',root), b=$('.td-more',root);
    if(d&&b)b.hidden=!(d.classList.contains('open')||d.scrollHeight>d.clientHeight+2);
  };
  App.taskSkeleton=function(){
    var l=function(w,h,c){return '<span class="sk '+(c||'line')+'" style="width:'+w+';height:'+(h||12)+'px"></span>'};
    var bk=function(inner){return '<div class="blk"><div class="blk-h">'+l('120px',14)+'</div><div class="blk-b">'+inner+'</div></div>'};
    return '<div class="td-page td-sk" aria-busy="true"><span class="sr">'+esc(T('app.loading'))+'</span>'+
      '<div class="td-back">'+l('84px',32)+'</div><div class="td-head"><div class="td-hl" style="flex:1">'+l('220px',14)+'<div style="height:12px"></div>'+l('min(560px,90%)',26)+'<div style="height:10px"></div>'+l('240px',14)+'</div><div class="td-tools">'+l('84px',36)+l('84px',36)+l('36px',36)+'</div></div>'+
      '<div class="td-sum"><dl>'+[1,2,3,4,5,6].map(function(){return '<div class="sm-c">'+l('48px',10)+'<div style="height:8px"></div>'+l('80%',14)+'</div>'}).join('')+'</dl></div>'+
      '<div class="card td-jr"><div class="td-jr-h">'+l('140px',14)+'</div><div class="sk-steps">'+[1,2,3,4,5].map(function(){return '<span>'+l('16px',16,'circle')+l('64px',10)+'</span>'}).join('')+'</div></div>'+
      '<div class="td-grid">'+bk('<div class="sk-lines">'+l('100%')+l('96%')+l('88%')+l('70%')+'</div>').replace('class="blk"','class="blk td-desc"')+
      bk('<div class="sk-lines">'+[1,2,3].map(function(){return '<span class="sk-row">'+l('32px',32,'circle')+l('40%',12)+l('80px',28)+'</span>'}).join('')+'</div>').replace('class="blk"','class="blk td-res"')+
      '<div class="td-side"><div class="td-side-b">'+bk('<div class="sk-lines">'+l('90%')+l('70%')+'</div>')+bk('<div class="sk-lines">'+l('60%')+l('80%')+l('50%')+'</div>')+'</div></div>'+
      bk('<div class="sk-lines">'+l('100%')+l('92%')+l('60%')+'</div>').replace('class="blk"','class="blk td-tabs"')+'</div></div>';
  };

  /* ---- uỷ quyền sự kiện cho chi tiết công việc ---- */
  function ctxOf(el){var r=el.closest('[data-tid]');return r?REG[r.getAttribute('data-tid')]:null}
  function rerender(ctx,focusSel){
    if(ctx.o.rerender)ctx.o.rerender();
    if(focusSel){var f=$(focusSel);if(f)f.focus({preventScroll:true});}
  }
  function runAct(ctx,k,extra){
    var t=ctx.t;
    App.act(t,k,{who:extra&&extra.who,ext:extra&&extra.ext,done:function(){
      setTimeout(function(){rerender(ctx);var f=$('[data-tid="'+t.id+'"] .td-acts .btn')||$('[data-tid="'+t.id+'"] .dr-f .btn')||$('#tdTitle')||$('#drTitle');if(f)f.focus({preventScroll:true});},0);
    }});
  }
  /* ⋯ trong chi tiết: [Sao chép mã] · [Sửa — chỉ ở ngăn trượt] · [Gia hạn, Chuyển giao, Khôi phục] · [Hủy] */
  function openMore(btn,ctx){
    var t=ctx.t, a=Task.actions(t).more, drawer=ctx.o.mode!=='page';
    var gs=[[['copy','copy','qa.copy']],drawer&&Task.canEdit(t)?[['edit','edit','act.edit']]:[],
      a.filter(function(x){return x[0]!=='cancel'}),a.filter(function(x){return x[0]==='cancel'})];
    ensureIcons();
    App.menu(btn,groupsHtml(gs),function(el){
      var k=el.dataset.mi;
      if(k==='copy'){copyId(t.id);if(document.contains(btn))btn.focus();return;}
      if(k==='edit'){location.href='task-form.html?id='+encodeURIComponent(t.id);return;}
      runAct(ctx,k);
    });
  }
  document.addEventListener('click',function(e){
    var el=e.target.closest('[data-ta]'); if(!el)return;
    var ctx=ctxOf(el); if(!ctx)return;
    var a=el.getAttribute('data-ta'), t=ctx.t, ui=ctx.ui;
    if(a==='act'){runAct(ctx,el.dataset.k,{who:el.dataset.who,ext:el.dataset.ext});return;}
    if(a==='more'){openMore(el,ctx);return;}
    if(a==='star'){t.star=t.star?0:1;hist(t,t.star?'starOn':'starOff');rerender(ctx,'[data-tid="'+t.id+'"] [data-ta="star"]');return;}
    if(a==='report'){App.reportPopup(t,el.dataset.who);return;}
    if(a==='desc'){ui.descOpen=!ui.descOpen;rerender(ctx,'[data-ta="desc"]');return;}
    if(a==='side'){ui.sideOpen=!ui.sideOpen;rerender(ctx,'[data-ta="side"]');return;}
    if(a==='tab'){ui.tab=el.dataset.tab;e.stopImmediatePropagation();rerender(ctx,'#tab-'+ui.tab);return;}
    if(a==='cm-edit'){ui.cmEdit=+el.dataset.id;rerender(ctx,'#cmE');return;}
    if(a==='cm-cancel'){var id=ui.cmEdit;ui.cmEdit=null;rerender(ctx,'[data-ta="cm-edit"][data-id="'+id+'"]');return;}
    if(a==='cm-save'){var x=$('#cmE'),v=x.value.trim();if(!v){x.focus();return;}var c=t.cm.filter(function(c){return c.id===+el.dataset.id})[0];c.x={vi:v,en:v};c.ed=1;ui.cmEdit=null;rerender(ctx,'[data-ta="cm-edit"][data-id="'+c.id+'"]');return;}
    if(a==='cm-del'){var cid=+el.dataset.id,cc=t.cm.filter(function(c){return c.id===cid})[0];if(!cc||!Task.canDelComment(cc))return;
      App.confirm({title:T('app.dlg.cmDel.t'),text:cc.a===App.me()?T('app.dlg.cmDel.d'):T('app.dlg.cmDel.dOther',{a:nm(cc.a)}),ok:T('app.dlg.cmDel.ok'),danger:1,onOk:function(){t.cm=t.cm.filter(function(c){return c.id!==cid});t.c=t.cm.length;App.toast(T('app.toast.cmDel'));setTimeout(function(){rerender(ctx,'#cmNew')},0)}});return;}
    if(a==='cm-send'){sendCm(ctx);return;}
    if(a==='file-add'){var inp=$('[data-tid="'+t.id+'"] [data-ta-file]');inp.click();return;}
    if(a==='copy'){copyId(t.id);return;}
    if(a==='dl'||a==='hd'){e.preventDefault();App.toast(T('app.att.hint'),'info');return;}
    if(a==='edit'){location.href='task-form.html?id='+encodeURIComponent(t.id);return;}
    if(a==='back'){if(document.referrer&&/tasks-(list|board)\.html/.test(document.referrer)){e.preventDefault();history.back();}return;}
    if(a==='dr-close'){App.drawer.close();return;}
    if(a==='dr-step'){if(ctx.o.onStep)ctx.o.onStep(+el.dataset.d);return;}
  });
  document.addEventListener('change',function(e){
    var inp=e.target.closest('[data-ta-file]'); if(!inp)return; var ctx=ctxOf(inp); if(!ctx||!inp.files.length)return;
    var t=ctx.t, n=inp.files.length;
    for(var i=0;i<n;i++)t.files.push({n:inp.files[i].name,s:fsize(inp.files[i].size),by:App.me(),w:nowStamp()});
    t.f=t.files.length; hist(t,'files',{n:n}); inp.value='';
    App.toast(T('app.toast.files',{n:n})); rerender(ctx,'[data-tid="'+t.id+'"] [data-ta="file-add"]');
  });
  function sendCm(ctx){
    var x=$('#cmNew'); if(!x)return; var v=x.value.trim(); if(!v){x.focus();return;}
    var t=ctx.t; t.cm.push({id:Date.now(),a:App.me(),w:['now'],x:{vi:v,en:v}}); t.c=t.cm.length; ctx.ui.draft='';
    rerender(ctx,'#cmNew');
    var l=$$('.cm-list .cmc'); if(l.length)l[l.length-1].scrollIntoView({block:'nearest',behavior:reduce()?'auto':'smooth'});
  }
  /* bình luận nhanh trong drawer: Enter để gửi */
  document.addEventListener('keydown',function(e){
    var q=e.target.closest&&e.target.closest('[data-ta="cm-quick"]');
    if(q&&e.key==='Enter'&&q.value.trim()){var ctx=ctxOf(q);ctx.t.cm.push({id:Date.now(),a:App.me(),w:['now'],x:{vi:q.value.trim(),en:q.value.trim()}});ctx.t.c=ctx.t.cm.length;rerender(ctx,'[data-ta="cm-quick"]');}
  });
  /* gợi ý @nhắc tên */
  var SUG={i:0,list:[]};
  function fold(s){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
  function sugState(ta){var pre=ta.value.slice(0,ta.selectionStart),m=/(^|\s)@([^\s@]*)$/.exec(pre);return m?{q:m[2],start:pre.length-m[2].length-1}:null}
  function drawSug(ta){
    var ul=$('#cmSug'), st=sugState(ta); if(!ul)return;
    if(!st){ul.hidden=true;ta.setAttribute('aria-expanded','false');ta.removeAttribute('aria-activedescendant');return;}
    SUG.list=DATA.USERS.filter(function(c){return c!==App.me()&&fold(nm(c)).indexOf(fold(st.q))>-1}); SUG.st=st;
    if(!SUG.list.length){ul.hidden=true;ta.setAttribute('aria-expanded','false');return;}
    if(SUG.i>=SUG.list.length)SUG.i=0;
    ul.innerHTML=SUG.list.map(function(c,i){return '<li role="option" id="sg'+c+'" data-sug="'+c+'" aria-selected="'+(i===SUG.i)+'">'+av(c,'av-sm')+'<span>'+esc(nm(c))+'</span></li>'}).join('');
    ul.hidden=false; ta.setAttribute('aria-expanded','true'); ta.setAttribute('aria-activedescendant','sg'+SUG.list[SUG.i]);
  }
  function pickSug(ta,c){var st=SUG.st;var v=ta.value;var ins='@'+nm(c)+' ';ta.value=v.slice(0,st.start)+ins+v.slice(ta.selectionStart);var p=st.start+ins.length;ta.setSelectionRange(p,p);ta.focus();SUG.i=0;drawSug(ta);}
  document.addEventListener('input',function(e){if(e.target.id==='cmNew'){SUG.i=0;drawSug(e.target);var c=ctxOf(e.target);if(c)c.ui.draft=e.target.value;}});
  document.addEventListener('keydown',function(e){
    if(e.target.id!=='cmNew')return; var ul=$('#cmSug'), open=ul&&!ul.hidden;
    if(open&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();SUG.i=(SUG.i+(e.key==='ArrowDown'?1:-1)+SUG.list.length)%SUG.list.length;drawSug(e.target);return;}
    if(open&&(e.key==='Enter'||e.key==='Tab')){e.preventDefault();pickSug(e.target,SUG.list[SUG.i]);return;}
    if(open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();ul.hidden=true;e.target.setAttribute('aria-expanded','false');return;}
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();var c=ctxOf(e.target);if(c)sendCm(c);}
  },true);
  document.addEventListener('mousedown',function(e){var li=e.target.closest('[data-sug]');if(li){e.preventDefault();pickSug($('#cmNew'),li.dataset.sug);}});

  /* ================= SỰ KIỆN CHUNG CỦA SHELL ================= */
  document.addEventListener('click',function(e){
    var el;
    if(MENU){
      if((el=e.target.closest('.mi'))&&MENU.el.contains(el)){var pick=MENU.pick;closeMenu(false);if(pick)pick(el);return;}
      if(!MENU.el.contains(e.target)&&!e.target.closest('[aria-expanded="true"]'))closeMenu(false);
    }
    if(!CFG)return;
    if((el=e.target.closest('#pvLang [data-lang]'))){I18N.setLang(el.dataset.lang);return;}
    if((el=e.target.closest('#pvRole [data-role]'))){App.setRole(el.dataset.role);return;}
    if(e.target.closest('#pvGrants')){App.setGrants(!App.grants());App.toast(T(App.grants()?'pv.grants.on':'pv.grants.off'),'info');var g=$('#pvGrants');if(g)g.focus();return;}
    if(e.target.closest('#pvIdle')){App.idleWarn();return;}
    if(e.target.closest('[data-shell="readAll"]')){notifRead=true;$('#pop').innerHTML=notifHtml();$('#bellDot').hidden=true;return;}
    if((el=e.target.closest('[data-open-task]'))){closePop();if(CFG.onOpenTask)CFG.onOpenTask(el.dataset.openTask);else location.href='task.html?id='+el.dataset.openTask;return;}
    if(e.target.closest('#bell')){var p=$('#pop'),o=p.hidden;p.hidden=!o;$('#bell').setAttribute('aria-expanded',o);return;}
    if(!e.target.closest('#pop'))closePop();
    if((el=e.target.closest('#me'))){App.menu(el,'<div class="menu-h"><b>'+esc(nm(App.me()))+'</b><span>'+esc(T('role.'+role))+'</span></div>'+mi('profile','user',T('top.profile'))+'<hr>'+mi('signout','logout',T('top.signout')),function(el){location.href=el.dataset.mi==='profile'?'profile.html':'login.html'});return;}
    if((el=e.target.closest('[data-soon]'))){e.preventDefault();$('#app').classList.remove('nav-open');App.toast(T('app.soon'),'info');return;}
    if((el=e.target.closest('.nav a[data-nav]'))){if(CFG.onNav&&CFG.onNav(el.dataset.nav,e)){e.preventDefault();$('#app').classList.remove('nav-open');}return;}
  });
  function closePop(){var p=$('#pop');if(p&&!p.hidden){p.hidden=true;$('#bell').setAttribute('aria-expanded','false');return true}return false}
  App.closePop=closePop;
  document.addEventListener('keydown',function(e){
    if(DLG.length){
      var top=DLG[DLG.length-1], box=$('.dlg',top.el);
      if(e.key==='Escape'){e.preventDefault();close(top,false);return;}
      if(e.key==='Enter'&&!top.o.form&&top.o.ok&&e.target.tagName!=='BUTTON'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();$('[data-dlg-ok]',top.el).click();return;}
      if(e.key==='Tab')trap(e,box);
      return;
    }
    if(MENU){
      var items=$$('.mi:not(:disabled)',MENU.el), i=items.indexOf(document.activeElement);
      if(e.key==='Escape'){e.preventDefault();closeMenu(true);return;}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();var n=(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[n].focus();return;}
      if(e.key==='Home'){e.preventDefault();items[0].focus();return;}
      if(e.key==='End'){e.preventDefault();items[items.length-1].focus();return;}
      if(e.key==='Tab'){closeMenu(false);}
    }
    if(e.key==='Escape'&&closePop()){$('#bell').focus();return;}
    if(DR.open){
      if(e.key==='Escape'){e.preventDefault();App.drawer.close();return;}
      if(e.key==='Tab')trap(e,$('#dr'));
    }
    var tab=e.target.closest&&e.target.closest('.td-tablist [role=tab]');
    if(tab&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){var m=e.key==='ArrowRight'?tab.nextElementSibling:tab.previousElementSibling;if(m)m.click();}
  });
  document.addEventListener('langchange',function(){renderShell()});
  new MutationObserver(renderPv).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  window.App=App;
})();
