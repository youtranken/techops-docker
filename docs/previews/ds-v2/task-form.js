/* TechOps DS v2 — Biểu mẫu Tạo / Sửa công việc DÙNG CHUNG. Classic script, nạp SAU app.js (và task-form.css sau app.css).
   Luật lấy từ V1: validators/create-task.schema.ts, update-task.schema.ts, services/task-create.service.ts (resolveInitialStatus),
   services/task-update.service.ts (canEdit, đổi chế độ, Force), components/CreateTask/attachment-rules.ts, EditTask/useEditTaskForm.ts (khoá người làm).

   API
   TaskForm.mount(el, {mode:'create'|'edit', id, compact, sc, draftId, init:{f,draftId}, draftable, onDone(ev)}) → form
       form: dirty() · busy() · leaving() · isDraft() · draftId() · saveDraft() · focus() · destroy()
       ev  : {kind:'created'|'draft'|'deleted', id, task}
   TaskForm.openDrawer({draftId, opener, onChange(ev)}) · TaskForm.closeDrawer(force) · TaskForm.drawerOpen()
       Ngăn trượt phải bản compact. Bấm nền / Esc / Đóng: form trống → đóng; đã nhập → hỏi "Lưu thành bản nháp?" [Bỏ][Tiếp tục sửa][Lưu nháp].
   TaskForm.page({onChange})      — trang đăng ký hàm nhận sự kiện (dùng cho cả nút "Mở lại" trong toast)
   TaskForm.store                 — all() get(id) put(t) remove(id) merge(arr) nextId() · việc MỚI TẠO lưu sessionStorage 'tf-store-v1' (mã V1 YY-NNNN)
   TaskForm.drafts                — NHÁP LƯU TẠM TRÊN TRÌNH DUYỆT (Phase B): all() get(id) put(d) remove(id) · localStorage 'tf-drafts-v1'
                                    d = {id:'d…', f:<dữ liệu form>, ts}. Nháp KHÔNG phải công việc: không có mã, không có trạng thái DRAFT, không vào danh sách việc.
                                    (V1: enum DRAFT có nhưng không có luồng tạo — task-create.service.ts:60-84; danh sách lọc bỏ DRAFT — TaskListFilters.tsx:13)
   TaskForm.apply(arr, ev)        — cập nhật mảng việc của trang theo sự kiện
   TaskForm.hidden(t) / isMyDraft(t) — giữ cho tương thích: việc DRAFT cũ trong phiên bị ẩn, isMyDraft luôn false
   TaskForm.draftMenu(btn, d, {onChange}) — menu ⋯ cho dòng nháp: Mở nháp · Mở trang đầy đủ · Xóa nháp
   ev.kind: 'created' (có task) · 'draft' (lưu nháp, id = mã nháp) · 'deleted' (xoá nháp) */
(function(){
  var T=I18N.t, esc=App.esc, L=I18N.L, M=I18N.M, $=App.$;
  var MAXF=3, MAXMB=10, EXT=['.pdf','.jpg','.jpeg','.png','.docx','.xlsx','.pptx'];
  var TYPES=['sw','hw','net','sec','acc','sup','oth'], PRS=['urgent','high','normal','low'];
  var TYMAP={'Mạng':'net','Phần cứng':'hw','Hỗ trợ':'sup','Phần mềm':'sw','Bảo mật':'sec','Tài khoản':'acc','Khác':'oth'};
  /* người làm đã nhận thì không bỏ khỏi việc được (EditTask/useEditTaskForm.ts) — AssigneeStatus V1 + mã cũ */
  var LOCK={IN_PROGRESS:1,COMPLETED:1,REVISION_REQUIRED:1,ACCEPTED:1,REPORTED:1,REWORK:1};
  /* Việc mẫu cùng trạng thái để mở sau khi tạo ở trang đầy đủ (task.html chỉ có dữ liệu mẫu) */
  var SAMPLE_BY_STATE={PENDING_APPROVAL:'26-0042',WAITING_ACKNOWLEDGE:'26-0031',IN_PROGRESS:'26-0036'};
  /* Dữ liệu người dùng nhập mẫu (không phải chuỗi giao diện) — viết {vi,en} như data.js */
  var SAMPLE={
    title:{vi:'Thay switch PoE tầng 4 bị chết 6 cổng',en:'Replace the 4th-floor PoE switch with 6 dead ports'},
    desc:{vi:'<p>Switch PoE tầng 4 chết 6 cổng, 3 camera hành lang và 2 điện thoại IP mất nguồn.</p><ul><li>Lấy switch dự phòng trong kho, cấu hình <b>VLAN</b> như bản cũ.</li><li>Kiểm tra lại nguồn cho camera hành lang.</li></ul>',
          en:'<p>The 4th-floor PoE switch lost 6 ports. Three hallway cameras and two IP phones have no power.</p><ul><li>Take the spare switch from storage and copy the old <b>VLAN</b> config.</li><li>Re-check power for the hallway cameras.</li></ul>'},
    files:[{n:'so-do-mang-tang-4.pdf',b:1258291},{n:'anh-tu-rack.jpg',b:3250585},{n:'cau-hinh-vlan.xlsx',b:48128}],
    reject:{n:'quay-video-tu-rack.mp4',b:14889779}
  };
  var SPRITE='<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true" id="tfSprite">'+
    '<symbol id="i-tf-bold" viewBox="0 0 24 24"><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/></symbol>'+
    '<symbol id="i-tf-italic" viewBox="0 0 24 24"><path d="M19 4h-9"/><path d="M14 20H5"/><path d="M15 4 9 20"/></symbol>'+
    '<symbol id="i-tf-under" viewBox="0 0 24 24"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 20h16"/></symbol>'+
    '<symbol id="i-tf-ol" viewBox="0 0 24 24"><path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></symbol>'+
    '<symbol id="i-tf-image" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></symbol></svg>';
  function ensureSprite(){if(document.getElementById('i-tf-bold'))return;var d=document.createElement('div');d.innerHTML=SPRITE;document.body.insertBefore(d.firstChild,document.body.firstChild);}

  function me(){return App.me()}
  function today(){return DATA.TODAY}
  function clone(o){return JSON.parse(JSON.stringify(o))}
  function pad(n){return String(n).padStart(2,'0')}
  function stamp(){var d=new Date();return DATA.TODAY+' '+pad(d.getHours())+':'+pad(d.getMinutes())}
  function fsize(b){var vi=I18N.lang==='vi';if(b<1048576)return Math.max(1,Math.round(b/1024))+' KB';var s=(b/1048576).toFixed(1);return (vi?s.replace('.',','):s)+' MB'}
  /* Admin không nằm trong danh sách được giao (assignable-users: EMPLOYEE+BOSS) → không tự chọn sẵn */
  function blank(){return {mode:'direct',title:'',desc:'',people:DATA.USERS.indexOf(me())>-1?[me()]:[],start:today(),due:'',pr:'normal',ty:'sw',star:false,force:false,files:[]}}
  function snap(f){var o=clone(f);o.people.sort();o.desc=o.desc.replace(/<br>$/,'');o.files=o.files.filter(function(x){return !x.rm}).map(function(x){return x.n});return JSON.stringify(o)}
  function descHtml(blocks){
    return (blocks||[]).map(function(b){
      if(b.p)return '<p>'+esc(L(b.p))+'</p>';
      if(b.h)return '<p><b>'+esc(L(b.h))+'</b></p>';
      if(b.ul)return '<ul>'+b.ul.map(function(x){return '<li>'+esc(L(x))+'</li>'}).join('')+'</ul>';
      return '';
    }).join('');
  }
  /* HTML soạn thảo → khối mô tả theo hình dạng data.js (để ngăn/trang chi tiết đọc được) */
  function blocksOf(html){
    var d=document.createElement('div'),out=[]; d.innerHTML=html||'';
    Array.prototype.forEach.call(d.childNodes,function(n){
      if(n.nodeType===1&&(n.tagName==='UL'||n.tagName==='OL')){var li=[];Array.prototype.forEach.call(n.querySelectorAll('li'),function(x){var s=x.textContent.trim();if(s)li.push(s)});if(li.length)out.push({ul:li});return;}
      var s=(n.textContent||'').replace(/ /g,' ').trim(); if(s)out.push({p:s});
    });
    return out;
  }

  /* ================= KHO NHÁP / VIỆC MỚI (sessionStorage) ================= */
  var SK='tf-store-v1';
  function sget(){var s=null;try{s=JSON.parse(sessionStorage.getItem(SK))}catch(e){}return s&&s.t&&s.del?s:{t:{},del:{}}}
  function sset(s){try{sessionStorage.setItem(SK,JSON.stringify(s))}catch(e){}}
  var Store={
    all:function(){var s=sget();return Object.keys(s.t).map(function(k){return s.t[k]}).sort(function(a,b){return (b._ts||0)-(a._ts||0)})},
    get:function(id){return sget().t[id]||null},
    put:function(t){var s=sget();s.t[t.id]=t;delete s.del[t.id];sset(s);return t},
    remove:function(id){var s=sget();delete s.t[id];s.del[id]=1;sset(s)},
    /* việc mẫu (DATA) + việc đã lưu trong phiên: bản lưu thay bản mẫu cùng mã, việc đã xoá bị loại */
    merge:function(arr){var s=sget();return Store.all().filter(function(t){return t.s!=='DRAFT'&&/^\d{2}-\d{4}$/.test(t.id)}).map(App.task.norm).concat(arr.filter(function(t){return !s.del[t.id]&&!s.t[t.id]}))},
    /* task-create.service.ts:44-57: "YY-NNNN", đánh số lại mỗi năm */
    nextId:function(){
      var s=sget(),n=0,yy=DATA.TODAY.slice(2,4);
      DATA.tasks().map(function(x){return x.id}).concat(Object.keys(s.t),Object.keys(s.del)).forEach(function(id){var m=/^(\d{2})-(\d{4})$/.exec(id);if(m&&m[1]===yy&&+m[2]>n)n=+m[2]});
      return yy+'-'+String(n+1).padStart(4,'0');
    }
  };
  /* ================= NHÁP LƯU TẠM TRÊN TRÌNH DUYỆT (Phase B) ================= */
  var DK='tf-drafts-v1';
  function dget(){var s=null;try{s=JSON.parse(localStorage.getItem(DK))}catch(e){}return s&&typeof s==='object'?s:{}}
  function dset(s){try{localStorage.setItem(DK,JSON.stringify(s))}catch(e){}}
  var Drafts={
    all:function(){var s=dget();return Object.keys(s).map(function(k){return s[k]}).filter(function(d){return d.cr===me()}).sort(function(a,b){return b.ts-a.ts})},
    get:function(id){var d=dget()[id];return d&&d.cr===me()?d:null},
    put:function(d){var s=dget();d.id=d.id||('d'+Date.now().toString(36));d.ts=Date.now();d.cr=me();s[d.id]=d;dset(s);return d},
    remove:function(id){var s=dget();delete s[id];dset(s)},
    title:function(d){var t=d&&d.f&&d.f.title?d.f.title.trim():'';return t||T('dr.untitled')}
  };
  function findTask(id){return Store.merge(DATA.tasks()).filter(function(x){return x.id===id})[0]||null}
  function dtime(ts){var d=new Date(ts),p=function(n){return String(n).padStart(2,'0')};return App.dtt(d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()))}
  /* Form → việc (hình dạng như DATA.tasks()) */
  function toTask(F,id,st){
    var ti=F.title.trim(), now=stamp(), kept=F.files.filter(function(f){return !f.rm}), draft=st==='DRAFT';
    var t={id:id,t:{vi:ti||M.vi['dr.untitled'],en:ti||M.en['dr.untitled']},s:st,p:F.pr,ty:{vi:M.vi['tf.ty.'+F.ty],en:M.en['tf.ty.'+F.ty]},
      a:F.people.slice(),due:F.due?App.daysBetween(today(),F.due):null,c:0,f:kept.length,star:!draft&&App.isBoss()&&F.star?1:0,
      approval:!draft&&F.mode==='approval'?1:0,force:!draft&&F.mode==='approval'&&F.force?1:0,
      cr:me(),at:today(),since:0,desc:blocksOf(F.desc),files:kept.map(function(f){return {n:f.n,s:f.sz,by:me(),w:now}}),
      cm:[],ext:[],hdReq:null,stepDates:null,as:{},hist:[[now,me(),'created']],cancel:null,sBefore:null,_f:clone(F),_ts:Date.now()};
    t.a.forEach(function(c){t.as[c]={st:st==='IN_PROGRESS'?'IN_PROGRESS':'PENDING'}});
    return t;
  }
  function formFromTask(t,fseq){
    var people=App.task.people(t).filter(function(c){var a=t.as[c];return !a||(a.st!=='REJECTED'&&a.st!=='DECLINED'&&a.st!=='TRANSFERRED')});
    return {mode:t.approval?'approval':'direct',title:t._f?t._f.title:(t.s==='DRAFT'&&!L(t.t)?'':L(t.t)),desc:descHtml(t.desc),people:people,start:t.at,due:App.task.dueIso(t)||'',
      pr:t.p,ty:TYMAP[t.ty.vi]||'oth',star:!!t.star,force:!!t.force,
      files:(t.files||[]).map(function(f){return {id:'o'+(++fseq.n),n:L(f.n),b:f.b||0,sz:f.s||fsize(f.b||0),old:1,rm:0}})};
  }

  /* ================= BIỂU MẪU ================= */
  function Form(root,o){
    o=o||{};
    var compact=!!o.compact;
    var QID=DATA.normId(o.id||'');
    var S={sc:o.sc||(o.mode==='edit'?'edit':'new'),screen:'normal',tried:false,busy:false,serverErr:false,leaving:false,q:'',fileErr:'',fxForce:false,draftId:null};
    var F=null, BASE=null, TK=null, seq={n:0}, dead=false, timers=[];
    root.classList.add('tf-form');

    function q(s){return root.querySelector(s)}
    function qq(s){return Array.prototype.slice.call(root.querySelectorAll(s))}
    function later(fn,ms){var h=setTimeout(function(){if(!dead)fn()},ms);timers.push(h);return h}
    function isEdit(){return S.sc==='edit'&&!S.draftId}
    function isDraft(){return !!S.draftId}
    function draftable(){return compact||isDraft()||!!o.draftable}
    function descText(){var d=document.createElement('div');d.innerHTML=F.desc;return (d.textContent||'').replace(/ /g,' ').trim()}
    function dirty(){return !!F&&S.screen==='normal'&&snap(F)!==snap(BASE)}
    function keptFiles(){return F.files.filter(function(f){return !f.rm})}
    function norm(f){f.files=(f.files||[]).map(function(x){x.id=(x.old?'o':'n')+(++seq.n);if(x.b)x.sz=fsize(x.b);return x});return f}
    function draftForm(id){var d=Drafts.get(id);return d&&d.f?norm(clone(d.f)):null}

    /* ---------- Việc cần sửa ---------- */
    function editId(){return QID||(App.isBoss()?'26-0019':'26-0036')}
    function loadTask(){
      var id=editId(), t=findTask(id);
      if(!t)return null;
      if(id==='26-0019'&&!t._f){ /* mẫu: 2 người đã nhận, 1 người chưa nhận, 1 người đã từ chối, 1 đơn gia hạn đang chờ */
        t.as={LM:{st:'IN_PROGRESS'},PD:{st:'IN_PROGRESS'},TA:{st:'PENDING'},DK:{st:'REJECTED'}};
        t.ext=[{st:'PENDING'}];
        t.files=[{n:{vi:'danh-sach-may-van-phong.xlsx',en:'office-pc-list.xlsx'},b:31744}];
      }
      return t;
    }
    function lockOf(c){
      if(!isEdit()||!TK)return null;
      var a=TK.as[c];
      if(a&&LOCK[a.st])return 'acc';
      if(c===TK.cr&&F.people.indexOf(c)>-1&&App.task.people(TK).indexOf(c)>-1)return 'cr';
      return null;
    }
    function declined(c){return isEdit()&&TK&&TK.as[c]&&(TK.as[c].st==='REJECTED'||TK.as[c].st==='DECLINED')}
    /* task-update.service.ts: quyền đổi chế độ */
    function canSwitch(to){
      var t=TK, from=t.approval?'approval':'direct', s=t.s;
      if(to===from)return true;
      if(App.isBoss()){
        if(s==='PENDING_REVIEW'&&to==='direct')return false;
        return ['PENDING_APPROVAL','WAITING_ACKNOWLEDGE','IN_PROGRESS','PENDING_REVIEW'].indexOf(s)>-1;
      }
      if(t.cr!==me())return false;
      if(from==='approval'&&to==='direct'&&s==='PENDING_APPROVAL')return true;
      var noAck=App.task.people(t).every(function(c){var a=t.as[c];return !a||['PENDING','REJECTED','DECLINED','TRANSFERRED'].indexOf(a.st)>-1});
      return from==='direct'&&to==='approval'&&s==='WAITING_ACKNOWLEDGE'&&noAck;
    }
    function lockReason(){
      var t=TK, from=t.approval?'approval':'direct';
      if(App.isBoss())return t.s==='PENDING_REVIEW'&&from==='approval'?T('tf.mode.lock.review'):'';
      if(t.cr!==me())return T('tf.mode.lock.notCreator');
      return from==='direct'?T('tf.mode.lock.acked'):T('tf.mode.lock.approved');
    }
    /* Trạng thái sau khi lưu / tạo (resolveInitialStatus) */
    function statusAfter(){
      if(!isEdit()){
        if(!F.people.length)return null;
        var self=F.people.length===1&&F.people[0]===me();
        if(F.mode==='direct')return self?'IN_PROGRESS':'WAITING_ACKNOWLEDGE';
        return App.isBoss()?'WAITING_ACKNOWLEDGE':'PENDING_APPROVAL';
      }
      var from=TK.approval?'approval':'direct', s=TK.s;
      if(F.mode===from)return s;
      if(F.mode==='direct'&&s==='PENDING_APPROVAL')return 'WAITING_ACKNOWLEDGE';
      if(F.mode==='approval'&&!App.isBoss()&&s==='WAITING_ACKNOWLEDGE')return 'PENDING_APPROVAL';
      return s;
    }
    function changes(){
      var a=JSON.parse(snap(F)), b=JSON.parse(snap(BASE)), n=0;
      Object.keys(a).forEach(function(k){if(JSON.stringify(a[k])!==JSON.stringify(b[k]))n++});
      return n;
    }

    /* ---------- Kiểm tra ---------- */
    function validate(){
      var e={}, maxT=isEdit()?255:150, tl=F.title.trim().length, dl=descText().length;
      if(!tl)e.title=T('tf.e.title'); else if(tl>maxT)e.title=T('tf.e.titleMax',{n:maxT,x:tl});
      if(!dl)e.desc=T('tf.e.desc'); else if(!isEdit()&&dl>5000)e.desc=T('tf.e.descMax',{n:5000,x:dl});
      if(!F.people.length)e.people=T('tf.e.people');
      if(!F.start)e.start=T('tf.e.start');
      if(!F.due)e.due=T('tf.e.due'); else if(F.start&&F.due<F.start)e.due=T('tf.e.dueOrder');
      return e;
    }
    var ORDER=['title','desc','people','start','due'];
    function errHtml(m){return m?ic('alert','i-xs')+'<span>'+esc(m)+'</span>':''}
    function showErrs(){
      var e=S.tried?validate():{};
      ORDER.forEach(function(k){
        var p=q('#e-'+k); if(!p)return;
        p.hidden=!e[k]; p.innerHTML=errHtml(e[k]);
        var el={title:'#fTitle',desc:'#fDesc',start:'#fStart',due:'#fDue'}[k];
        if(el&&q(el))q(el).setAttribute('aria-invalid',e[k]?'true':'false');
      });
      var ed=q('#edWrap'); if(ed)ed.classList.toggle('bad',!!e.desc);
      var pl=q('#plist'); if(pl)pl.classList.toggle('bad',!!e.people);
      renderTop(e);
      return e;
    }
    function renderTop(e){
      var box=q('#tfTop'); if(!box)return;
      var n=Object.keys(e||{}).length, h='';
      if(S.serverErr)h='<div class="note bad" role="alert" tabindex="-1" id="srvNote">'+ic('alert','i-sm')+'<div><b>'+esc(T('tf.e.server.t'))+'</b>'+esc(T('tf.e.server.d'))+'</div></div>';
      else if(S.tried&&n)h='<div class="note bad" role="alert">'+ic('alert','i-sm')+'<div>'+esc(T('tf.e.sum',{n:n}))+'</div></div>';
      box.innerHTML=h; box.hidden=!h;
    }
    function focusFirst(e){
      var k=ORDER.filter(function(x){return e[x]})[0]; if(!k)return;
      var el=q({title:'#fTitle',desc:'#fDesc',people:'#pq',start:'#fStart',due:'#fDue'}[k]); if(!el)return;
      el.scrollIntoView({block:'center',behavior:App.reduce()?'auto':'smooth'});
      el.focus({preventScroll:true});
    }

    /* ---------- Dựng giao diện ---------- */
    function req(){return ' <span class="req" aria-hidden="true">*</span><span class="sr">('+esc(T('app.req'))+')</span>'}
    function opt(){return ' <span class="opt">('+esc(T('app.opt'))+')</span>'}
    function stDot(s){return '<span class="tf-st s-'+s+'"><span class="sdot" aria-hidden="true"></span>'+esc(T('st.'+s))+'</span>'}
    function head(){
      if(isDraft())return '<div class="head"><div><h1>'+esc(T('tf.title.new'))+'</h1><p class="tf-sub"><span>'+esc(T('tf.draft.title'))+'</span>'+App.phaseB()+'<span class="sep" aria-hidden="true">·</span><span class="faint">'+esc(T('dr.local'))+'</span></p></div>'+
        '<div class="head-act"><button type="button" class="btn btn-neg" data-tf="del">'+ic('trash','i-sm')+'<span>'+esc(T('tf.draft.del'))+'</span></button></div></div>';
      if(!isEdit())return '<div class="head"><div><h1>'+esc(T('tf.title.new'))+'</h1><p>'+esc(T('tf.sub.new'))+'</p></div></div>';
      var t=TK;
      return '<div class="head"><div><h1>'+esc(T('tf.title.edit'))+'</h1><p class="tf-sub"><span class="mono">'+t.id+'</span><span class="sep" aria-hidden="true">·</span>'+stDot(t.s)+
        '<span class="sep" aria-hidden="true">·</span><span>'+esc(T('tf.sub.by',{a:App.nm(t.cr)}))+'</span></p></div></div>';
    }
    function draftNote(){return isDraft()?'<p class="tf-dnote">'+ic('info')+'<span>'+esc(T('tf.draft.note'))+'</span></p>':''}
    function draftBtn(){return '<button type="button" class="btn" data-tf="draft" id="btnDraft" title="'+esc(T('dr.local'))+'">'+esc(T('tf.draft.save'))+App.phaseB()+'</button>'}
    function tbBtn(cmd,icon,key){return '<button type="button" data-cmd="'+cmd+'" aria-pressed="false" aria-label="'+esc(T(key))+'" title="'+esc(T(key))+'"><svg class="i i-sm" aria-hidden="true"><use href="#i-'+icon+'"/></svg></button>'}
    function fTitle(){
      var maxT=isEdit()?255:150;
      return '<div class="field"><div class="tf-lr"><label class="lbl" for="fTitle">'+esc(T('tf.f.title'))+req()+'</label><span class="tf-cnt" id="cTitle" aria-hidden="true"></span></div>'+
        '<input class="input tf-title" id="fTitle" autocomplete="off" aria-required="true" aria-describedby="e-title" data-max="'+maxT+'" placeholder="'+esc(T('tf.f.title.ph'))+'" value="'+esc(F.title)+'">'+
        '<p class="err" id="e-title" hidden></p></div>';
    }
    function fDesc(){
      return '<div class="field"><div class="tf-lr"><div class="lbl" id="lDesc">'+esc(T('tf.f.desc'))+req()+'</div>'+(isEdit()?'':'<span class="tf-cnt" id="cDesc" aria-hidden="true"></span>')+'</div>'+
        '<div class="tf-ed" id="edWrap"><div class="tf-tb" role="toolbar" aria-label="'+esc(T('tf.ed.toolbar'))+'" aria-controls="fDesc">'+
          tbBtn('bold','tf-bold','tf.ed.b')+tbBtn('italic','tf-italic','tf.ed.i')+tbBtn('underline','tf-under','tf.ed.u')+'<span class="sep" aria-hidden="true"></span>'+
          tbBtn('insertUnorderedList','list','tf.ed.ul')+tbBtn('insertOrderedList','tf-ol','tf.ed.ol')+'</div>'+
          '<div class="tf-area" id="fDesc" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="lDesc" aria-required="true" aria-describedby="e-desc" data-ph="'+esc(T('tf.f.desc.ph'))+'"></div></div>'+
        '<p class="err" id="e-desc" hidden></p></div>';
    }
    function fAtt(){
      return '<div class="field"><div class="tf-lr"><div class="lbl" id="lAtt">'+esc(T('app.att.label'))+opt()+'</div><span class="tf-cnt" id="cAtt"></span></div>'+
        '<label class="dropz tf-drop" id="drop">'+ic('upload')+'<span>'+esc(T('app.att.drop'))+' <u>'+esc(T('app.att.pick'))+'</u></span>'+
          '<small>'+esc(T('tf.att.rules',{n:MAXF,m:MAXMB}))+'</small>'+
          '<input type="file" multiple class="sr" id="fFile" accept="'+EXT.join(',')+'" aria-labelledby="lAtt" aria-describedby="e-file tipPaste"></label>'+
        '<p class="err" id="e-file" role="alert" hidden></p><ul class="flist" id="flist"></ul>'+
        '<p class="hint tf-tip" id="tipPaste"><svg class="i" aria-hidden="true"><use href="#i-tf-image"/></svg><span>'+esc(T('tf.att.paste'))+'</span></p></div>';
    }
    function modeOpt(m){
      var dis=isEdit()&&!canSwitch(m), d=m==='direct'?T('tf.mode.direct.d'):T(App.isBoss()?'tf.mode.approval.d.boss':'tf.mode.approval.d.emp');
      return '<label class="tf-opt"><input type="radio" name="mode" value="'+m+'"'+(F.mode===m?' checked':'')+(dis?' disabled':'')+'>'+
        '<span><b>'+esc(T('td.mode.'+m))+'</b><small>'+esc(d)+'</small></span></label>';
    }
    function setupFields(){
      var h='<div class="field"><div class="lbl" id="lMode">'+esc(T('tf.f.mode'))+'</div><div class="tf-modes" role="radiogroup" aria-labelledby="lMode" aria-describedby="modeFx">'+modeOpt('direct')+modeOpt('approval')+'</div>'+
          '<div id="modeFx" aria-live="polite"></div></div>'+
        '<div class="field"><div class="lbl" id="lPeople">'+esc(T('tf.f.people'))+req()+'</div>'+
          '<label class="search">'+ic('search','i-sm')+'<span class="sr">'+esc(T('tf.people.search'))+'</span><input type="search" id="pq" autocomplete="off" aria-controls="plist" aria-describedby="e-people" placeholder="'+esc(T('tf.people.search'))+'" value="'+esc(S.q)+'"></label>'+
          '<div class="tf-pl" id="plist" role="group" aria-labelledby="lPeople"></div>'+
          '<p class="err" id="e-people" hidden></p><div class="tf-pmeta" id="pmeta" aria-live="polite"></div></div>'+
        '<div class="tf-2">'+
          '<div class="field"><label class="lbl" for="fStart">'+esc(T('tf.f.start'))+req()+'</label><input type="date" class="input mono" id="fStart" value="'+F.start+'" aria-describedby="e-start"><p class="err" id="e-start" hidden></p></div>'+
          '<div class="field"><label class="lbl" for="fDue">'+esc(T('tf.f.due'))+req()+'</label><input type="date" class="input mono" id="fDue" value="'+F.due+'"'+(F.start?' min="'+F.start+'"':'')+' aria-required="true" aria-describedby="e-due dueFx"><p class="err" id="e-due" hidden></p></div>'+
        '</div><p class="hint" id="dueFx" hidden></p>'+
        '<div class="tf-2">'+
          '<div class="field"><label class="lbl" for="fPr">'+esc(T('filter.priority'))+'</label><select class="select" id="fPr">'+PRS.map(function(p){return '<option value="'+p+'"'+(F.pr===p?' selected':'')+'>'+esc(T('pr.'+p))+'</option>'}).join('')+'</select></div>'+
          '<div class="field"><label class="lbl" for="fTy">'+esc(T('tf.f.type'))+'</label><select class="select" id="fTy">'+TYPES.map(function(p){return '<option value="'+p+'"'+(F.ty===p?' selected':'')+'>'+esc(T('tf.ty.'+p))+'</option>'}).join('')+'</select></div>'+
        '</div>';
      if(App.isBoss()){
        var off=F.mode!=='approval';
        h+='<div class="tf-boss" role="group" aria-labelledby="hBoss"><h3 id="hBoss">'+esc(T('tf.boss.h'))+'</h3>'+
          '<label class="tf-sw'+(F.star?' on-star':'')+'" id="swStar"><input type="checkbox" id="fStar"'+(F.star?' checked':'')+' aria-describedby="dStar"><span><b>'+ic('star')+esc(T('tf.star'))+'</b><small id="dStar">'+esc(T('tf.star.d'))+'</small></span></label>'+
          '<label class="tf-sw'+(off?' off':'')+'" id="swForce"><input type="checkbox" id="fForce"'+(F.force&&!off?' checked':'')+(off?' disabled':'')+' aria-describedby="dForce"><span><b>'+ic('lock')+esc(T('tf.force'))+'</b><small id="dForce">'+esc(T(off?'tf.force.off':'tf.force.d'))+'</small></span></label>'+
        '</div>';
      }
      return h;
    }
    function bar(){
      var back=isEdit()?'task.html?id='+TK.id:isDraft()?'tasks-list.html?view=drafts':'tasks-list.html';
      return '<div class="tf-bar" id="tfBar"><p class="tf-sum" id="sum" aria-live="polite"></p><div class="tf-btns">'+
        '<a class="btn" href="'+back+'" id="btnClose">'+esc(T('app.close'))+'</a>'+
        (draftable()&&!isEdit()?draftBtn():'')+
        '<button type="button" class="btn btn-p" id="btnSubmit">'+ic(isEdit()?'check':'plus','i-sm')+'<span>'+esc(T(isEdit()?'tf.save':'page.new'))+'</span></button></div>'+
        '<span class="sr" id="busySr" aria-live="assertive"></span></div>';
    }
    function pageLayout(){
      return head()+'<div class="tf-top" id="tfTop" hidden></div>'+draftNote()+'<div class="tf-grid">'+
        '<section class="card tf-card" aria-labelledby="hC"><h2 id="hC">'+esc(T('tf.sec.content'))+'</h2>'+fTitle()+fDesc()+fAtt()+'</section>'+
        '<section class="card tf-card" aria-labelledby="hS"><h2 id="hS">'+esc(T('tf.sec.setup'))+'</h2>'+setupFields()+'</section></div>'+bar();
    }
    /* Ngăn trượt: một cột — Tiêu đề, Mô tả, khối Thiết lập, Tệp; chân dính đáy [Xóa nháp] … [Lưu nháp][Tạo công việc] */
    function drawerLayout(){
      var full=T('tf.full');
      return '<header class="dr-h tf-dh"><h2 id="tfDT">'+(isDraft()?esc(T('tf.draft.title'))+App.phaseB():esc(T('tf.title.new')))+'</h2><span class="sp"></span>'+
          '<button type="button" class="btn btn-ghost btn-sm dr-full" data-tf="full" aria-label="'+esc(full)+'" title="'+esc(full)+'">'+ic('expand','i-sm')+'<span class="lbl-s">'+esc(full)+'</span></button>'+
          '<span class="dr-sep" aria-hidden="true"></span><button type="button" class="icon-btn" data-tf="close" aria-label="'+esc(T('app.close'))+'" title="'+esc(T('app.close'))+'">'+ic('x')+'</button></header>'+
        '<div class="dr-b tf-db">'+draftNote()+'<div class="tf-top" id="tfTop" hidden></div>'+fTitle()+fDesc()+
          '<section class="tf-set" aria-labelledby="hS"><h3 id="hS">'+ic('settings')+esc(T('tf.sec.setup'))+'</h3>'+setupFields()+'</section>'+fAtt()+'</div>'+
        '<footer class="dr-f tf-df"><p class="tf-sum" id="sum" aria-live="polite"></p><div class="tf-drow">'+
          (isDraft()?'<button type="button" class="btn btn-neg" data-tf="del">'+ic('trash','i-sm')+'<span>'+esc(T('tf.draft.del'))+'</span></button>':'')+
          '<span class="sp"></span>'+draftBtn()+
          '<button type="button" class="btn btn-p" id="btnSubmit">'+ic('plus','i-sm')+'<span>'+esc(T('page.new'))+'</span></button></div>'+
          '<span class="sr" id="busySr" aria-live="assertive"></span></footer>';
    }
    function stateScreen(icon,title,desc,taskId){
      return '<div class="state page" role="status">'+ic(icon)+'<h1>'+esc(title)+'</h1><p>'+esc(desc)+'</p><div class="acts">'+
        (taskId?'<a class="btn btn-p" href="task.html?id='+taskId+'">'+ic('arrow-l','i-sm')+'<span>'+esc(T('tf.backTask'))+'</span></a>':'')+
        '<a class="btn'+(taskId?'':' btn-p')+'" href="tasks-list.html">'+esc(T('td.backList'))+'</a></div></div>';
    }
    function skeleton(){
      function card(n){var s='<div class="card tf-card tf-sk"><span class="sk line" style="width:30%"></span>';for(var i=0;i<n;i++)s+='<span class="sk" style="height:'+(i===1?120:38)+'px"></span>';return s+'</div>'}
      return '<div class="head"><div><span class="sk line" style="width:200px;height:22px"></span><span class="sk line" style="width:260px;margin-top:10px"></span></div></div>'+
        '<div class="tf-grid" aria-busy="true"><span class="sr">'+esc(T('app.loading'))+'</span>'+card(3)+card(4)+'</div>';
    }
    function render(){
      if(dead)return;
      var sc=S.screen;
      if(sc==='loading'){root.innerHTML=skeleton();return;}
      if(sc==='nf'){root.innerHTML=stateScreen('file-q',T('td.nf.t',{id:editId()}),T('td.nf.d'));finish();return;}
      if(sc==='na'){root.innerHTML=stateScreen('lock',T('tf.na.t'),S.naWhy,TK.id);finish();return;}
      root.innerHTML=compact?drawerLayout():pageLayout();
      q('#fDesc').innerHTML=F.desc;
      wire(); renderPeople(); renderFiles(); renderModeFx(); renderDueFx(); renderCounts(); edEmpty(); renderSum(); showErrs();
      if(S.busy)setBusy(true);
      finish();
    }
    function finish(){
      if(window.dsIcons)dsIcons(root);
      if(compact)return;
      var t=isEdit()&&TK?TK.id+' · '+T('tf.crumb.edit'):isDraft()?T('tf.draft.title'):T('tf.title.new');
      document.title=T('app.name')+' · '+t;
      padPv();
    }
    /* thanh preview nổi ngay trên thanh hành động (mobile thanh cao hơn) */
    function padPv(){if(compact)return;var b=$('#tfBar');document.body.style.setProperty('--tf-pv',(b?b.offsetHeight+10:20)+'px')}

    /* ---------- Phần cập nhật nhỏ ---------- */
    function renderCounts(){
      var tl=F.title.trim().length, mx=isEdit()?255:150, c=q('#cTitle');
      if(c){c.textContent=tl+'/'+mx;c.classList.toggle('over',tl>mx);}
      var d=q('#cDesc'); if(d){var n=descText().length;d.textContent=n+'/5000';d.classList.toggle('over',n>5000);}
    }
    function edEmpty(){var a=q('#fDesc');if(a)a.classList.toggle('empty',!descText()&&!/<(li|ul|ol)/i.test(a.innerHTML))}
    function peopleOrder(){var u=DATA.USERS.slice(), m=me(), i=u.indexOf(m);if(i<0)return u;u.splice(i,1);return [m].concat(u)}
    function renderPeople(){
      var qs=S.q.trim().toLowerCase(), list=peopleOrder().filter(function(c){return !qs||App.nm(c).toLowerCase().indexOf(qs)>-1||c.toLowerCase()===qs});
      var html=list.map(function(c){
        var on=F.people.indexOf(c)>-1, lk=on&&lockOf(c), dc=!on&&declined(c);
        var tag=lk?'<span class="tag">'+ic('lock')+esc(T(lk==='acc'?'tf.people.locked':'tf.people.creator'))+'</span>'
          :dc?'<span class="tag">'+esc(T('tf.people.declined'))+'</span>'
          :c===DATA.BOSS?'<span class="tag">'+esc(T('role.boss'))+'</span>':'';
        return '<label class="tf-p'+(lk?' locked':'')+'"><input type="checkbox" value="'+c+'"'+(on?' checked':'')+(lk?' disabled aria-describedby="lockHint"':'')+'>'+
          App.av(c)+'<span class="nm">'+esc(App.nm(c))+(c===me()?'<small>'+esc(T('tf.people.you'))+'</small>':'')+'</span>'+tag+'</label>';
      }).join('');
      q('#plist').innerHTML=html||'<div class="tf-pempty">'+esc(T('tf.people.none',{q:S.q.trim()}))+'</div>';
      var hasLock=F.people.some(function(c){return lockOf(c)});
      var added=isEdit()?F.people.filter(function(c){return BASE.people.indexOf(c)<0}).length:0;
      q('#pmeta').innerHTML='<span>'+(F.people.length?'<b>'+esc(T('tf.people.n',{n:F.people.length}))+'</b>':'')+'</span>'+
        (added?'<span>'+esc(T('tf.people.added',{n:added}))+'</span>':'');
      var lh=q('#lockHint');
      if(hasLock&&!lh)q('#pmeta').insertAdjacentHTML('afterend','<p class="hint" id="lockHint">'+esc(T('tf.people.lockHint'))+'</p>');
      if(!hasLock&&lh)lh.remove();
      if(window.dsIcons)dsIcons(q('#plist'));
    }
    function renderFiles(){
      var kept=keptFiles().length, full=kept>=MAXF;
      q('#flist').innerHTML=F.files.map(function(f){
        var img=/\.(png|jpe?g)$/i.test(f.n);
        return '<li class="'+(f.rm?'rm':'')+'">'+(img?'<svg class="i i-sm" aria-hidden="true"><use href="#i-tf-image"/></svg>':ic('file','i-sm'))+'<span title="'+esc(f.n)+'">'+esc(f.n)+'</span>'+
          (f.rm?'<span class="tag">'+esc(T('tf.att.removed'))+'</span><button type="button" class="btn-link" data-keep="'+f.id+'" aria-label="'+esc(T('tf.att.keep',{f:f.n}))+'">'+esc(T('tf.att.undo'))+'</button>'
            :'<small>'+esc(f.sz)+'</small><button type="button" class="mini" data-rmf="'+f.id+'" aria-label="'+esc(T('app.att.remove',{f:f.n}))+'">'+ic('x','i-xs')+'</button>')+'</li>';
      }).join('');
      q('#cAtt').textContent=T('tf.att.count',{x:kept,n:MAXF});
      var dz=q('#drop'); dz.classList.toggle('full',full); dz.classList.toggle('bad',!!S.fileErr);
      q('#fFile').disabled=full;
      var e=q('#e-file'); e.hidden=!S.fileErr; e.innerHTML=errHtml(S.fileErr);
    }
    function renderModeFx(){
      var box=q('#modeFx'); if(!box)return; var h='';
      if(isEdit()){
        var from=TK.approval?'approval':'direct', other=from==='direct'?'approval':'direct';
        if(F.mode!==from){
          var k=F.mode==='direct'?(TK.s==='PENDING_APPROVAL'?'tf.fx.toWait':'tf.fx.noReview'):(App.isBoss()?'tf.fx.bossApproval':'tf.fx.toApproval');
          h='<p class="tf-fx warn">'+ic('info')+'<span>'+esc(T(k))+(TK.force&&F.mode==='direct'?' '+esc(T('tf.fx.forceOff')):'')+'</span></p>';
        } else if(!canSwitch(other)){
          h='<p class="tf-fx">'+ic('lock')+'<span>'+esc(lockReason())+'</span></p>';
        }
      } else if(S.fxForce&&F.mode==='direct'){
        h='<p class="tf-fx warn">'+ic('info')+'<span>'+esc(T('tf.fx.forceOff'))+'</span></p>';
      }
      box.innerHTML=h; if(window.dsIcons)dsIcons(box);
    }
    function renderDueFx(){
      var p=q('#dueFx'); if(!p)return;
      var n=isEdit()&&App.isBoss()&&TK.ext?TK.ext.filter(function(x){return x.st==='PENDING'}).length:0;
      var show=n&&F.due!==BASE.due;
      p.hidden=!show; p.textContent=show?T('tf.due.ext',{n:n}):'';
    }
    function renderSum(){
      var el=q('#sum'); if(!el)return; var h;
      if(!isEdit()){
        var st=statusAfter();
        if(!st)h='<span class="muted">'+esc(T('tf.sum.none'))+'</span>';
        else{
          var n=F.people.length, who=n===1?(F.people[0]===me()?T('tf.sum.you'):App.nm(F.people[0])):T('tf.sum.n',{n:n});
          var k=st==='PENDING_APPROVAL'?'tf.sum.approval':st==='IN_PROGRESS'?'tf.sum.self':F.mode==='approval'?'tf.sum.skip':'tf.sum.give';
          h='<span class="lead">'+esc(T(k,{a:who}))+'</span><span class="sep" aria-hidden="true">·</span><span>'+esc(T('tf.sum.start'))+'</span>'+stDot(st);
        }
      } else {
        var s2=statusAfter(), c=changes();
        if(s2!==TK.s)h='<span class="lead">'+esc(T('tf.sum.changes',{n:c}))+'</span><span class="sep" aria-hidden="true">·</span><span>'+esc(T('tf.sum.move'))+'</span>'+stDot(s2);
        else if(c)h='<span class="lead">'+esc(T('tf.sum.changes',{n:c}))+'</span>';
        else h='<span class="muted">'+esc(T('tf.sum.nochange'))+'</span>';
      }
      el.innerHTML=h; padPv();
    }
    function changed(){renderCounts();renderSum();if(S.tried)showErrs();}

    /* ---------- Tệp ---------- */
    function extOf(n){var i=n.lastIndexOf('.');return i>=0?n.slice(i).toLowerCase():''}
    /* attachment-rules.ts: kiểm tra số lượng trước, rồi từng tệp (định dạng, dung lượng); lỗi đầu tiên → không thêm tệp nào */
    function checkFiles(list){
      var kept=keptFiles().length;
      if(kept+list.length>MAXF)return kept>=MAXF?T('tf.att.full',{n:MAXF}):T('tf.att.max',{n:MAXF,k:list.length,r:MAXF-kept});
      for(var i=0;i<list.length;i++){
        if(EXT.indexOf(extOf(list[i].n))<0)return T('tf.att.type',{f:list[i].n});
        if(list[i].b>MAXMB*1048576)return T('tf.att.size',{f:list[i].n,s:fsize(list[i].b),m:MAXMB});
      }
      return '';
    }
    function addFiles(list,silent){
      var err=checkFiles(list); S.fileErr=err;
      if(!err)list.forEach(function(f){F.files.push({id:'n'+(++seq.n),n:f.n,b:f.b,sz:fsize(f.b),old:0,rm:0})});
      renderFiles(); renderSum();
      if(!err&&!silent&&list.length)App.toast(T('app.toast.files',{n:list.length}));
    }
    function fromFileList(fl){var a=[];for(var i=0;i<fl.length;i++)a.push({n:fl[i].name,b:fl[i].size});return a}
    function pasteImage(file){
      if(keptFiles().length>=MAXF){S.fileErr=T('tf.att.full',{n:MAXF});renderFiles();q('#e-file').scrollIntoView({block:'center'});return;}
      var ext=file.type==='image/png'?'png':'jpg', name='screenshot-'+Date.now()+'.'+ext, url=URL.createObjectURL(file);
      App.dialog({title:T('tf.paste.t'),size:'md',ok:T('tf.paste.ok'),
        body:'<div class="tf-pimg"><img id="pImg" src="'+url+'" alt="'+esc(T('tf.paste.alt'))+'"></div><p class="hint"><span class="mono" id="pDim"></span> · <span class="mono">'+esc(fsize(file.size))+'</span></p>',
        init:function(w){var im=$('#pImg',w);im.onload=function(){$('#pDim',w).textContent=im.naturalWidth+' × '+im.naturalHeight+' px'}},
        onOk:function(){addFiles([{n:name,b:file.size}])},
        after:function(){URL.revokeObjectURL(url)}});
    }

    /* ---------- Sự kiện ---------- */
    function wire(){
      var ti=q('#fTitle'), area=q('#fDesc');
      ti.addEventListener('input',function(){F.title=ti.value;changed()});
      area.addEventListener('input',function(){F.desc=area.innerHTML;edEmpty();changed();tbState()});
      area.addEventListener('paste',function(e){
        var cd=e.clipboardData; if(!cd)return;
        for(var i=0;i<cd.items.length;i++)if(cd.items[i].kind==='file')return; /* ảnh: để bộ bắt dán chung xử lý */
        var txt=cd.getData('text/plain'); if(txt==null)return;
        e.preventDefault(); document.execCommand('insertText',false,txt);
      });
      area.addEventListener('keyup',tbState); area.addEventListener('mouseup',tbState); area.addEventListener('focus',tbState);
      qq('.tf-tb [data-cmd]').forEach(function(b){
        b.addEventListener('mousedown',function(e){e.preventDefault()});
        b.addEventListener('click',function(){area.focus();document.execCommand(b.dataset.cmd,false,null);F.desc=area.innerHTML;edEmpty();changed();tbState();});
      });
      qq('input[name="mode"]').forEach(function(r){r.addEventListener('change',function(){
        F.mode=r.value;
        if(F.mode==='direct'&&F.force){F.force=false;S.fxForce=true;} else S.fxForce=false;
        var sw=q('#swForce');
        if(sw){var off=F.mode!=='approval',cb=q('#fForce');sw.classList.toggle('off',off);cb.disabled=off;if(off)cb.checked=false;q('#dForce').textContent=T(off?'tf.force.off':'tf.force.d');}
        renderModeFx();renderSum();
      })});
      q('#pq').addEventListener('input',function(e){S.q=e.target.value;renderPeople();});
      q('#plist').addEventListener('change',function(e){
        var cb=e.target; if(cb.type!=='checkbox')return;
        var c=cb.value, i=F.people.indexOf(c);
        if(cb.checked&&i<0)F.people.push(c); if(!cb.checked&&i>-1)F.people.splice(i,1);
        renderPeople(); var n=q('#plist input[value="'+c+'"]'); if(n)n.focus();
        changed();
      });
      q('#fStart').addEventListener('change',function(e){F.start=e.target.value;q('#fDue').min=F.start||'';changed();});
      q('#fDue').addEventListener('change',function(e){F.due=e.target.value;renderDueFx();changed();});
      q('#fPr').addEventListener('change',function(e){F.pr=e.target.value;changed();});
      q('#fTy').addEventListener('change',function(e){F.ty=e.target.value;changed();});
      var st=q('#fStar'); if(st)st.addEventListener('change',function(){F.star=st.checked;q('#swStar').classList.toggle('on-star',F.star);changed();});
      var fo=q('#fForce'); if(fo)fo.addEventListener('change',function(){F.force=fo.checked;changed();});
      var inp=q('#fFile'), z=q('#drop');
      inp.addEventListener('change',function(){addFiles(fromFileList(inp.files));inp.value='';});
      ['dragenter','dragover'].forEach(function(t){z.addEventListener(t,function(e){e.preventDefault();if(!z.classList.contains('full'))z.classList.add('hot')})});
      ['dragleave','drop'].forEach(function(t){z.addEventListener(t,function(e){e.preventDefault();z.classList.remove('hot')})});
      z.addEventListener('drop',function(e){if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length)addFiles(fromFileList(e.dataTransfer.files));});
      z.addEventListener('click',function(e){if(z.classList.contains('full')){e.preventDefault();S.fileErr=T('tf.att.full',{n:MAXF});renderFiles();}});
      q('#flist').addEventListener('click',function(e){
        var b=e.target.closest('[data-rmf]'), k=e.target.closest('[data-keep]');
        if(b){var f=F.files.filter(function(x){return x.id===b.dataset.rmf})[0];if(f.old)f.rm=1;else F.files.splice(F.files.indexOf(f),1);S.fileErr='';renderFiles();renderSum();
          var nb=q('#flist [data-keep="'+f.id+'"]')||q('#fFile');if(nb&&!nb.disabled)nb.focus();return;}
        if(k){var g=F.files.filter(function(x){return x.id===k.dataset.keep})[0];
          if(keptFiles().length>=MAXF){S.fileErr=T('tf.att.full',{n:MAXF});renderFiles();return;}
          g.rm=0;S.fileErr='';renderFiles();renderSum();var r=q('#flist [data-rmf="'+g.id+'"]');if(r)r.focus();}
      });
      q('#btnSubmit').addEventListener('click',submit);
    }
    /* nút data-tf (gắn một lần vào root, sống qua các lần dựng lại) */
    root.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-tf]'); if(!b||!root.contains(b))return;
      var k=b.dataset.tf;
      if(k==='draft'){saveDraft();return;}
      if(k==='del'){delDraft();return;}
      if(k==='full'){toFull();return;}
      if(k==='close'){if(o.onCloseReq)o.onCloseReq();return;}
    });
    function tbState(){
      qq('.tf-tb [data-cmd]').forEach(function(b){var on=false;try{on=document.queryCommandState(b.dataset.cmd)}catch(e){}b.setAttribute('aria-pressed',on?'true':'false')});
    }
    function setBusy(on){
      var b=q('#btnSubmit'); if(!b)return;
      b.setAttribute('aria-disabled',on?'true':'false'); b.disabled=on;
      b.querySelector('svg,.tf-spin').outerHTML=on?'<span class="tf-spin" aria-hidden="true"></span>':ic(isEdit()?'check':'plus','i-sm');
      var c=q('#btnClose'); if(c)c.setAttribute('aria-disabled',on?'true':'false');
      qq('[data-tf="draft"],[data-tf="del"]').forEach(function(x){x.disabled=on});
      q('#busySr').textContent=on?T(isEdit()?'tf.busy.save':'tf.busy.create'):'';
      var g=q('.tf-grid')||q('.tf-db'); if(g)g.setAttribute('aria-busy',on?'true':'false');
    }
    function emit(ev){if(o.onDone)o.onDone(ev)}
    function submit(){
      if(S.busy)return;
      S.tried=true; S.serverErr=false;
      var e=showErrs();
      if(Object.keys(e).length){focusFirst(e);return;}
      if(isEdit()&&!changes()){App.toast(T('tf.toast.nochange'),'info');return;}
      S.busy=true; setBusy(true);
      later(function(){
        S.busy=false;
        if(S.sc==='server'){
          setBusy(false); S.serverErr=true; renderTop({});
          var n=q('#srvNote'); if(n){n.scrollIntoView({block:'center',behavior:App.reduce()?'auto':'smooth'});n.focus({preventScroll:true});}
          App.toast(T('tf.toast.err'),'error'); return;
        }
        var st=statusAfter(), id=isEdit()?TK.id:Store.nextId(), task=null;
        if(!isEdit()){task=Store.put(toTask(F,id,st)); /* việc mới giữ trong phiên để Danh sách/Bảng thấy; tạo từ nháp → cấp mã mới, xoá nháp */
          if(S.draftId){Drafts.remove(S.draftId);S.draftId=null;}}
        S.leaving=true;
        if(compact){emit({kind:'created',id:id,task:task});App.toast(T('tf.toast.created',{id:id,s:T('st.'+st)}));return;}
        App.toast(isEdit()?T('tf.toast.saved',{id:id}):T('tf.toast.created',{id:id,s:T('st.'+st)}));
        setBusy(true);
        later(function(){location.href='task.html?id='+(isEdit()?id:SAMPLE_BY_STATE[st]);},1500);
      },compact?700:1100);
    }
    /* Lưu nháp (Phase B): không kiểm tra, KHÔNG tạo việc, KHÔNG cấp mã — chỉ lưu dữ liệu form vào localStorage của trình duyệt này */
    function saveDraft(){
      if(S.busy||isEdit()||!F)return;
      var d=Drafts.put({id:S.draftId,f:clone(F)}), id=d.id;
      S.draftId=id; BASE=clone(F);
      if(compact){S.leaving=true;emit({kind:'draft',id:id,draft:d});toastReopen(T('dr.toast.saved'),id);return;}
      App.toast(T('dr.toast.saved'));
      S.leaving=true; setBusy(true);
      later(function(){location.href='tasks-list.html?view=drafts';},1200);
    }
    function delDraft(){
      var id=S.draftId; if(!id||S.busy)return;
      confirmDelete(id,function(){
        S.leaving=true;
        if(compact)emit({kind:'deleted',id:id});
        else later(function(){location.href='tasks-list.html?view=drafts';},900);
      });
    }
    /* Mở dạng trang đầy đủ: chuyển dữ liệu đang nhập qua sessionStorage */
    function toFull(){
      try{sessionStorage.setItem('tf-handoff',JSON.stringify({f:F,draftId:S.draftId,base:S.draftId?BASE:null}))}catch(e){}
      S.leaving=true;
      location.href='task-form.html?from=panel';
    }

    /* Dán ảnh chụp màn hình ở bất kỳ đâu */
    function onPaste(e){
      if(dead||S.screen!=='normal'||!F||App.dialogOpen()||!e.clipboardData||!root.isConnected)return;
      if(compact&&!App.drawer.isOpen())return;
      var it=e.clipboardData.items||[];
      for(var i=0;i<it.length;i++){
        if(it[i].kind==='file'&&/^image\//.test(it[i].type)){var f=it[i].getAsFile();if(f){e.preventDefault();pasteImage(f);return;}}
      }
    }
    function onLang(){
      if(dead)return;
      if(S.screen!=='normal'||!F){if(S.screen!=='loading')load();return;}
      if(!dirty()&&isEdit()){F=formFromTask(TK,seq);BASE=clone(F);}
      else if(!dirty()&&S.sc==='new'&&!isDraft()&&!(o.init&&o.init.f)){F=blank();BASE=clone(F);}
      if(F.files)F.files.forEach(function(f){if(f.b)f.sz=fsize(f.b)});
      if(S.sc==='files')S.fileErr=checkFiles([SAMPLE.reject]);
      render();
    }
    document.addEventListener('paste',onPaste);
    document.addEventListener('langchange',onLang);

    /* ---------- Nạp ---------- */
    function setCrumbs(){
      if(compact)return;
      App.crumbs(isEdit()?[{t:'nav.tasks',href:'tasks-list.html'},{text:editId(),href:'task.html?id='+editId()},{t:'tf.crumb.edit'}]
        :isDraft()?[{t:'nav.tasks',href:'tasks-list.html'},{text:S.draftId,mono:1}]
        :[{t:'nav.tasks',href:'tasks-list.html'},{t:'tf.title.new'}]);
    }
    function load(){
      S.tried=false;S.busy=false;S.serverErr=false;S.leaving=false;S.q='';S.fileErr='';S.fxForce=false;S.draftId=null;TK=null;
      if(S.sc==='edit'&&!compact){
        setCrumbs(); S.screen='loading'; render();
        later(function(){
          TK=loadTask();
          if(!TK){S.screen='nf';render();return;}
          if(TK.s==='DRAFT'){ /* nháp: chỉ người tạo mở được, mở như Tạo mới có sẵn dữ liệu */
            if(TK.cr!==me()){S.screen='nf';render();return;}
            S.draftId=TK.id; F=draftForm(TK.id); BASE=clone(F); TK=null; S.screen='normal'; setCrumbs(); render(); return;
          }
          if(TK.s==='COMPLETED'||TK.s==='CANCELLED'){S.screen='na';S.naWhy=T('tf.na.closed',{s:T('st.'+TK.s)});render();return;}
          if(!App.task.canEdit(TK)){S.screen='na';S.naWhy=T(TK.s==='PENDING_REVIEW'?'tf.na.review':TK.approval&&TK.cr===me()?'tf.na.approved':'tf.na.other');render();return;}
          F=formFromTask(TK,seq); BASE=clone(F); S.screen='normal'; render();
        },350);
        return;
      }
      S.screen='normal'; F=blank(); BASE=clone(F);
      var did=o.draftId||(o.init&&o.init.draftId);
      if(did){var df=draftForm(did); if(df){S.draftId=did; F=df; BASE=clone(df);}}
      if(o.init&&o.init.f){F=norm(clone(o.init.f)); if(o.init.base)BASE=norm(clone(o.init.base));}
      if(S.sc==='invalid'){
        F.people=[]; F.due=DATA.addDays(today(),-2); S.tried=true;
      } else if(S.sc==='server'||S.sc==='files'){
        F.title=L(SAMPLE.title); F.desc=L(SAMPLE.desc); F.people=App.isBoss()?['TA','PD']:[me(),'TA']; F.due=DATA.addDays(today(),3); F.pr='high'; F.ty='net';
        if(App.isBoss())F.mode='approval';
        if(S.sc==='files'){F.files=SAMPLE.files.map(function(f){return {id:'n'+(++seq.n),n:f.n,b:f.b,sz:fsize(f.b),old:0,rm:0}});S.fileErr=checkFiles([SAMPLE.reject]);}
      }
      setCrumbs(); render();
      if(S.sc==='invalid')showErrs();
    }

    ensureSprite();
    load();
    return {
      dirty:dirty, busy:function(){return S.busy}, leaving:function(){return S.leaving}, isDraft:isDraft, draftId:function(){return S.draftId},
      saveDraft:saveDraft, screen:function(){return S.screen},
      focus:function(){var t=q('#fTitle');if(t)t.focus({preventScroll:true})},
      destroy:function(){dead=true;timers.forEach(clearTimeout);document.removeEventListener('paste',onPaste);document.removeEventListener('langchange',onLang);}
    };
  }

  /* ================= HỘP HỎI 3 LỰA CHỌN (dựa trên App.dialog, không sửa app.js) ================= */
  function ask3(o){
    var api=App.dialog({title:o.title,body:'<p>'+esc(o.text)+'</p>',size:'sm',ok:null,onClose:o.onKeep,
      init:function(w,api){
        var f=$('.dlg-f',w); f.classList.add('tf-f3');
        f.innerHTML='<button type="button" class="btn btn-neg" data-tf3="discard">'+esc(o.discard)+'</button><span class="sp"></span>'+
          '<button type="button" class="btn" data-dlg-x>'+esc(T('dr.ask.keep'))+'</button>'+
          '<button type="button" class="btn btn-p" data-tf3="save">'+esc(o.save)+'</button>';
        f.addEventListener('click',function(e){
          var b=e.target.closest('[data-tf3]'); if(!b)return;
          e.stopPropagation(); api.close(true);
          (b.dataset.tf3==='save'?o.onSave:o.onDiscard)();
        });
      }});
    var s=$('[data-tf3="save"]',api.el); if(s)s.focus();
    return api;
  }
  function confirmDelete(id,after){
    App.confirm({title:T('dr.del.t'),text:T('dr.del.d'),ok:T('tf.draft.del'),danger:true,onOk:function(){
      Drafts.remove(id); App.toast(T('dr.toast.deleted'));
      setTimeout(after,0); /* để hộp xác nhận đóng và trả focus trước */
    }});
  }
  function toastReopen(msg,id){
    App.toast(msg);
    var box=$('#toasts'), el=box&&box.lastElementChild; if(!el)return;
    var b=document.createElement('button'); b.type='button'; b.className='tf-tact'; b.textContent=T('dr.toast.reopen');
    b.setAttribute('aria-label',T('dr.toast.reopen')+' '+id);
    b.addEventListener('click',function(){if(el.parentNode)el.parentNode.removeChild(el);openDrawer({draftId:id,opener:document.querySelector('[data-tf-new]')});});
    el.insertBefore(b,el.querySelector('.t-x'));
  }

  /* ================= NGĂN TRƯỢT ================= */
  var DRW=null, HOOK={}, rmT=null;
  function onKey(e){
    if(!DRW||e.key!=='Escape'||App.dialogOpen()||document.querySelector('.menu'))return;
    e.preventDefault(); e.stopPropagation(); requestClose();
  }
  function onScrim(e){
    if(!DRW||!e.target.closest||!e.target.closest('#drScrim'))return;
    e.preventDefault(); e.stopPropagation(); requestClose();
  }
  function requestClose(){
    var d=DRW; if(!d||d.form.busy())return;
    if(!d.form.dirty()){App.drawer.close();return;}
    var ex=d.form.isDraft(), id=d.form.draftId();
    ask3({title:T(ex?'dr.ask.t2':'dr.ask.t'),text:ex?T('dr.ask.d2',{id:id}):T('dr.ask.d'),discard:T(ex?'dr.ask.discard2':'dr.ask.discard'),save:T('tf.draft.save'),
      onDiscard:function(){App.drawer.close()},
      onSave:function(){d.form.saveDraft()},
      onKeep:function(){setTimeout(function(){var dr=$('#dr');if(DRW===d&&dr&&!dr.contains(document.activeElement))d.form.focus();},0)}});
  }
  function onDrClose(){
    var d=DRW; if(!d)return; DRW=null;
    d.form.destroy();
    removeEventListener('keydown',onKey,true); removeEventListener('click',onScrim,true);
    clearTimeout(rmT); rmT=setTimeout(function(){if(!DRW){var dr=$('#dr');if(dr)dr.classList.remove('tf-dr');}},320);
    var op=d.opener; if(op&&document.contains(op)&&op.focus)op.focus({preventScroll:true});
  }
  function openDrawer(opts){
    opts=opts||{};
    if(DRW){if(DRW.form.dirty())return;App.drawer.close();}
    else if(App.drawer.isOpen())App.drawer.close(); /* đang mở ngăn chi tiết: đóng để trang dọn trạng thái */
    var opener=opts.opener||document.activeElement;
    App.drawer.open({html:'<div class="tf-dwrap" id="tfDrw"></div>',label:T('tf.title.new'),onClose:onDrClose});
    var dr=$('#dr'); clearTimeout(rmT); dr.classList.add('tf-dr');
    var d={opts:opts,opener:opener};
    d.form=Form($('#tfDrw'),{compact:true,sc:'new',draftId:opts.draftId,
      onCloseReq:requestClose,
      onDone:function(ev){
        App.drawer.close();
        var fn=opts.onChange||HOOK.onChange; if(fn)fn(ev);
      }});
    DRW=d;
    addEventListener('keydown',onKey,true); addEventListener('click',onScrim,true);
    if(d.form.isDraft())dr.setAttribute('aria-label',T('tf.draft.title'));
    d.form.focus();
  }

  window.TaskForm={
    mount:function(el,o){return Form(el,o)},
    openDrawer:openDrawer,
    closeDrawer:function(force){if(!DRW)return;if(force)App.drawer.close();else requestClose();},
    drawerOpen:function(){return !!DRW},
    page:function(h){HOOK=h||{}},
    store:Store,
    drafts:Drafts,
    hidden:function(t){return t.s==='DRAFT'},
    isMyDraft:function(){return false},
    apply:function(arr,ev){
      var id=ev.id||(ev.task&&ev.task.id), i=-1;
      arr.forEach(function(x,k){if(x.id===id)i=k});
      if(i>-1)arr.splice(i,1);
      if(ev.kind==='created'&&ev.task)arr.unshift(ev.task);
      return arr;
    },
    draftMenu:function(btn,d,o){
      o=o||{};
      App.menu(btn,App.mi('open','edit',T('dr.menu.open'))+App.mi('full','expand',T('td.openFull'))+'<hr>'+App.mi('del','trash',T('tf.draft.del'),{danger:1}),function(el){
        var k=el.dataset.mi;
        if(document.contains(btn))btn.focus({preventScroll:true});
        if(k==='open')openDrawer({draftId:d.id,opener:btn,onChange:o.onChange});
        else if(k==='full')location.href='task-form.html?draft='+encodeURIComponent(d.id);
        else if(k==='del')confirmDelete(d.id,function(){var fn=o.onChange||HOOK.onChange;if(fn)fn({kind:'deleted',id:d.id});});
      },{fixed:true,label:T('dr.menu',{t:Drafts.title(d)})});
    },
    draftTime:function(d){return dtime(d.ts)}
  };
})();
