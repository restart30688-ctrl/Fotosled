/* ФОТОСЛЕД · сетевой отряд + автоматическая рассылка дел всем игрокам */
(function(){
"use strict";
if(window.__FSNET)return;window.__FSNET=1;
var F=window.FS;
if(!F){var er=document.getElementById("err");if(er){er.style.display="block";document.getElementById("errMsg").textContent="net.js: в index.html нет строки-моста window.FS";}return;}
var DB=F.D,Q=function(s){return document.querySelector(s)};
var css=document.createElement("style");
css.textContent='#v-squad.on{display:grid;grid-template-columns:minmax(272px,1fr) minmax(272px,1fr);gap:13px;align-items:start}#v-squad .two{grid-template-columns:1fr}#sqL{display:none}[data-act="addp"],[data-act="allin"],[data-act="nonein"],[data-act="switch"],[data-act="delp"]{display:none!important}#netLobby .ncode{font-size:34px;font-weight:900;letter-spacing:10px;color:var(--pk2);text-align:center;background:#fff;border-radius:16px;padding:9px 6px;box-shadow:0 4px 0 var(--sh);margin:9px 0}#netLobby .nstat,#netDeliver .nstat{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:900;color:var(--mu)}#netLobby .ndot,#netDeliver .ndot{width:11px;height:11px;border-radius:50%;background:var(--lm);box-shadow:0 0 0 3px #E9F9D8;flex:none;animation:npulse 1.8s ease-in-out infinite}#netLobby .ndot.wait,#netDeliver .ndot.wait{background:var(--sun);box-shadow:0 0 0 3px #FFF0C9}#netLobby .ndot.off,#netDeliver .ndot.off{background:#C9BBA6;box-shadow:0 0 0 3px #F0E6D4;animation:none}#netLobby .ndot.bad,#netDeliver .ndot.bad{background:#FF6B6B;box-shadow:0 0 0 3px #FFE0E0;animation:none}@keyframes npulse{50%{box-shadow:0 0 0 6px rgba(139,212,80,.28)}}#netLobby .ncnt{margin-left:auto;font-size:11px;font-weight:900;color:#fff;background:var(--lm);border-radius:10px;padding:3px 9px}#netRoster{max-height:34vh;overflow-y:auto;padding-right:4px;scrollbar-color:var(--pk) #FFE9C4;scrollbar-width:thin}#netLobby .nrow{display:flex;gap:8px;flex-wrap:wrap}#netLobby .njoin{display:flex;gap:8px;margin-top:9px}#netLobby .np{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:16px;background:#fff;box-shadow:0 3px 0 var(--sh);margin-bottom:6px}#netLobby .np.me{background:#FFE9F3;box-shadow:0 3px 0 var(--pk)}#netLobby .np.ld{background:#FFF0C9;box-shadow:0 3px 0 var(--sun)}#netLobby .np.off{opacity:.5}#netLobby .np .nm{font-weight:900;font-size:12.5px}#netLobby .np .s{font-size:9.5px;color:var(--mu)}#netDeliver{background:#FFF3E0;border-radius:18px;padding:11px;margin:0 0 11px;box-shadow:0 4px 0 rgba(180,150,110,.2)}#netDeliver.ok{background:#E9F9D8}#netDeliver.bad{background:#FFE0E0}#netDeliver .nrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}@media(max-width:760px){#v-squad.on{grid-template-columns:1fr}#netRoster{max-height:none}}';
document.head.appendChild(css);

var TE=new TextEncoder(),TD=new TextDecoder();
var BROKERS=["wss://broker.emqx.io:8084/mqtt","wss://broker.hivemq.com:8884/mqtt","wss://test.mosquitto.org:8081/mqtt"];
var N={ws:null,state:"off",room:"",host:false,me:"",buf:new Uint8Array(0),broker:0,t1:0,t2:0,t3:0,last:0,msg:""};
var DEL={},rep={};

function mstr(s){var b=TE.encode(s),a=[b.length>>8,b.length&255],i;for(i=0;i<b.length;i++)a.push(b[i]);return a}
function mlen(n){var a=[],d;do{d=n%128;n=Math.floor(n/128);if(n>0)d|=128;a.push(d)}while(n>0);return a}
function mpk(t,b){var h=[t].concat(mlen(b.length)),u=new Uint8Array(h.length+b.length),i;u.set(h,0);for(i=0;i<b.length;i++)u[h.length+i]=b[i];return u}
function topic(s){return"fs16/r/"+N.room+"/"+s}
function pub(s,o,ret){if(!N.ws||N.state!=="on")return false;try{var p=TE.encode(JSON.stringify(o)),b=mstr(topic(s)),i;for(i=0;i<p.length;i++)b.push(p[i]);N.ws.send(mpk(ret?0x31:0x30,b));return true}catch(e){return false}}
function meP(){return F.BY(N.me)||F.ME()}
function prof(){var p=meP();return{id:p.id,name:p.name,look:p.look,xp:p.xp,solved:p.solved,created:p.created,led:p.led,best:p.best}}
function stop(){clearInterval(N.t1);clearInterval(N.t2);clearInterval(N.t3);N.t1=N.t2=N.t3=0;if(N.ws){try{N.ws.onclose=null;N.ws.close()}catch(e){}}N.ws=null;N.buf=new Uint8Array(0)}
function solo(){var m=F.ME();if(!m)return;DB.players=[m];DB.inGame=[m.id];if(DB.leaderId&&DB.leaderId!==m.id)DB.leaderId=null;DB.hunt=null;F.SAVE()}

function start(code,asHost){
code=String(code||"").replace(/\D/g,"");
if(code.length!==4){F.TS("🔑","Код — 4 цифры");return}
stop();N.room=code;N.host=!!asHost;N.me=DB.activeId;rep={};
if(asHost){solo();DB.missions=DB.missions.filter(function(m){return!!m.scene})}
DB.net={room:code,me:N.me,host:N.host};F.SAVE();open()}
function open(){
N.state="conn";N.msg="Подключаюсь…";lobby();paint();
var ws;try{ws=new WebSocket(BROKERS[N.broker%BROKERS.length],"mqtt")}catch(e){N.state="off";N.msg="Нет сети";lobby();paint();return}
N.ws=ws;ws.binaryType="arraybuffer";
ws.onopen=function(){ws.send(mpk(0x10,mstr("MQTT").concat([4,2,0,60],mstr("fs"+N.me+F.U()))))};
ws.onmessage=function(ev){feed(new Uint8Array(ev.data))};
ws.onerror=function(){};
ws.onclose=function(){if(!N.room)return;N.state="recon";N.msg="Переподключаюсь…";lobby();paint();clearInterval(N.t1);clearInterval(N.t2);clearInterval(N.t3);N.broker++;setTimeout(function(){if(N.room)open()},1800)}}
function ready(){
N.state="on";N.msg="В сети";N.last=Date.now();
N.ws.send(mpk(0x82,[0,1].concat(mstr(topic("#")),[0])));
clearInterval(N.t1);clearInterval(N.t2);clearInterval(N.t3);
N.t1=setInterval(function(){if(N.ws&&N.state==="on"){try{N.ws.send(new Uint8Array([192,0]))}catch(e){}}},25000);
N.t2=setInterval(function(){if(N.host){prune();broadcast()}else pub("a",{t:"hb",from:N.me,p:prof()});push();sync()},5000);
N.t3=setInterval(function(){if(N.host||!N.last)return;if(Date.now()-N.last>26000){var o=DB.players.filter(function(p){return p.id!==N.me&&Date.now()-(p.seen||0)<45000});if(!o.length){N.host=true;DB.net.host=true;F.TS("👑","Хост пропал — ты теперь хост");broadcast()}}},9000);
if(N.host)broadcast();else pub("a",{t:"join",from:N.me,p:prof()});
push(true);lobby();locks();paint();F.TOP();F.DRAW();F.S.p("ok");F.TS("🌐","Игра "+N.room+" — на связи")}
function feed(ch){
var m=new Uint8Array(N.buf.length+ch.length);m.set(N.buf);m.set(ch,N.buf.length);N.buf=m;
for(;;){if(N.buf.length<2)return;var i=1,mu=1,len=0,b;
for(;;){if(i>=N.buf.length)return;b=N.buf[i++];len+=(b&127)*mu;mu*=128;if(!(b&128))break}
if(N.buf.length<i+len)return;
var t=N.buf[0]>>4,body=N.buf.subarray(i,i+len);N.buf=N.buf.slice(i+len);
if(t===2)ready();
else if(t===3){var tl=(body[0]<<8)|body[1],tp=TD.decode(body.subarray(2,2+tl)),tx=TD.decode(body.subarray(2+tl));if(tx)handle(tp,tx)}}}
function handle(tp,tx){var k=tp.split("/")[3],o;try{o=JSON.parse(tx)}catch(e){return}
if(k==="s"){if(N.host&&o.host!==N.me&&o.ts>(DB.nts||0)){N.host=false;DB.net.host=false}if(!N.host)apply(o)}
else if(k==="m")addMission(o);
else if(k==="a"&&N.host&&o.from!==N.me)action(o)}
function apply(o){
N.last=Date.now();DB.nts=o.ts;
var mine=F.BY(N.me),prev=DB.leaderId,ids={};
(o.ms||[]).forEach(function(x){ids[x]=1;if(DEL[x]&&DEL[x].st!=="sent"){DEL[x].st="sent";F.S.p("ok")}});
DB.players=(o.pl||[]).map(function(p){return{id:p.id,name:p.name,look:Object.assign(F.DL(),p.look),xp:p.xp||0,solved:p.solved||0,created:p.created||0,led:p.led||0,best:p.best||0,clean:0,field:0,badges:[],seen:Date.now()}});
var at=-1,i;for(i=0;i<DB.players.length;i++)if(DB.players[i].id===N.me)at=i;
if(mine){mine.seen=Date.now();if(at>=0)DB.players[at]=mine;else DB.players.push(mine)}
DB.activeId=N.me;DB.inGame=DB.players.map(function(p){return p.id});
DB.leaderId=o.leader;DB.leaderMode=o.mode;DB.hunt=o.hunt;
DB.missions=DB.missions.filter(function(m){return m.scene||ids[m.id]||m.authorId===N.me});
F.SAVE();F.TOP();F.DRAW();if(F.RS)F.RS();lobby();locks();paint();
if(prev!==DB.leaderId&&DB.leaderId){var L=F.BY(DB.leaderId);if(L){F.S.p("crown");F.BU(innerWidth/2,innerHeight/2,110);F.TS("👑","Ведущий: "+F.E(L.name))}}}
function broadcast(){if(!N.host||N.state!=="on")return;
pub("s",{t:"s",host:N.me,ts:Date.now(),pl:DB.players.map(function(p){return{id:p.id,name:p.name,look:p.look,xp:p.xp,solved:p.solved,created:p.created,led:p.led,best:p.best}}),leader:DB.leaderId,mode:DB.leaderMode,hunt:DB.hunt,ms:DB.missions.filter(function(m){return!m.scene}).map(function(m){return m.id})},true)}
function action(o){
if(o.t==="join"||o.t==="hb"){var p=F.BY(o.p.id);
if(!p){p={id:o.p.id,name:o.p.name,look:F.DL(),xp:0,solved:0,created:0,led:0,best:0,clean:0,field:0,badges:[],seen:0};DB.players.push(p);F.S.p("ok");F.BU(innerWidth*.3,innerHeight*.4,60);F.TS("🎉",F.E(o.p.name)+" присоединился!")}
p.name=o.p.name;p.look=Object.assign(F.DL(),o.p.look);p.xp=o.p.xp;p.solved=o.p.solved;p.created=o.p.created;p.led=o.p.led;p.best=o.p.best;p.seen=Date.now();
DB.inGame=DB.players.map(function(x){return x.id});
F.SAVE();broadcast();F.TOP();F.DRAW();lobby();locks();paint()}
else if(o.t==="leave"){DB.players=DB.players.filter(function(x){return x.id!==o.from});DB.inGame=DB.players.map(function(x){return x.id});if(DB.leaderId===o.from)DB.leaderId=null;F.SAVE();broadcast();F.DRAW();lobby();paint()}
else if((o.t==="found"||o.t==="gave")&&DB.hunt){var s=DB.hunt.seek.filter(function(x){return x.id===o.from})[0];
if(s){s.st=o.t==="found"?"ok":"no";s.at=Date.now();F.SAVE();broadcast();if(F.RS)F.RS();if(o.t==="found"){F.S.p("win");var w=F.BY(o.from);F.TS("🎉",F.E(w?w.name:"Игрок")+" нашёл место!")}}}
else if(o.t==="mis"){if(addMission(o.m))broadcast()}}
function prune(){var now=Date.now();DB.players=DB.players.filter(function(p){return p.id===N.me||now-(p.seen||0)<120000});DB.inGame=DB.players.map(function(p){return p.id});if(DB.leaderId&&!F.BY(DB.leaderId))DB.leaderId=null}
function addMission(m){if(!m||!m.id)return false;if(DB.missions.some(function(x){return x.id===m.id}))return false;
m.author=m.author||{name:"Друг",look:F.DL()};m.author.look=Object.assign(F.DL(),m.author.look);if(m.author.look.g!=="m")m.author.look.g="f";
m.net=true;DB.missions.unshift(m);F.SAVE();F.DRAW();paint();
F.S.p("ok");F.BU(innerWidth*.7,innerHeight*.35,70);
F.TS("📥","Дело "+F.CN(m)+" от "+F.E(m.author.name)+" — уже на доске!");return true}

function mine(){return DB.missions.filter(function(m){return m.authorId===N.me&&!m.scene})}
function push(force){
mine().forEach(function(m){if(!DEL[m.id])DEL[m.id]={st:N.state==="on"?"wait":"off",n:0}});
if(N.state!=="on"){mine().forEach(function(m){if(DEL[m.id].st!=="sent")DEL[m.id].st="off"});paint();return}
var changed=false;
mine().forEach(function(m){var d=DEL[m.id];
if(d.st==="sent"&&!force)return;
if(d.st==="fail"&&!force)return;
d.n++;
var ok=pub("m/"+m.id,m,true);
if(!ok){d.st="wait";return}
if(N.host){if(d.st!=="sent"){changed=true}d.st="sent";broadcast()}
else{pub("a",{t:"mis",from:N.me,m:m});d.st=d.n>5?"fail":"wait"}});
if(changed){F.S.p("ok");F.BU(innerWidth*.5,innerHeight*.5,60)}
paint()}
function sync(){if(N.state!=="on")return;
Object.keys(DB.prog).forEach(function(k){if(k.indexOf(":"+N.me)<0)return;var pr=DB.prog[k];
if(pr.state==="solved"&&!rep[k]){rep[k]=1;
if(N.host){if(DB.hunt){var s=DB.hunt.seek.filter(function(x){return x.id===N.me})[0];if(s){s.st="ok";s.at=Date.now()}}}else pub("a",{t:"found",from:N.me})}});
if(N.host)broadcast();else pub("a",{t:"hb",from:N.me,p:prof()});F.SAVE()}
function leave(){if(N.state==="on"){pub("a",{t:"leave",from:N.me});if(N.host)pub("s","",true)}
stop();N.room="";N.host=false;N.state="off";DB.net=null;DEL={};solo();F.SAVE();lobby();paint();F.TOP();F.DRAW();locks()}

function locks(){
var on=N.state==="on",host=N.host||!on,L=F.LD();
["sqR","leadB"].forEach(function(id){var box=document.getElementById(id);if(!box)return;
[].forEach.call(box.querySelectorAll("[data-act]"),function(b){var a=b.dataset.act;
if(on&&!host&&(a==="lmode"||a==="roll"||a==="unlead")){b.disabled=true;b.style.opacity=".45"}
if(a==="hunt"&&L&&L.id!==N.me){b.disabled=true;b.style.opacity=".45"}})})}

function paint(){decorateBoard();decorateModal();lobbyCount()}
function tagFor(m){
if(m.authorId!==N.me)return m.net?{t:"🌐 из отряда",bg:"#35B6F5",c:"#fff",k:"net"}:null;
var d=DEL[m.id]||{st:N.state==="on"?"wait":"off"};
if(d.st==="sent")return{t:"📡 у всех",bg:"#8BD450",c:"#fff",k:"sent"};
if(d.st==="wait")return{t:"⏳ отправка",bg:"#FFD84D",c:"#7A5C00",k:"wait"};
if(d.st==="fail")return{t:"⚠️ не ушло",bg:"#FF6B6B",c:"#fff",k:"fail"};
return{t:"📴 локально",bg:"#FFE9C4",c:"#8A7256",k:"off"}}
function decorateBoard(){
var b=document.getElementById("board");if(!b)return;
[].forEach.call(b.querySelectorAll(".case[data-id]"),function(card){
var m=DB.missions.filter(function(x){return x.id===card.dataset.id})[0];if(!m)return;
var info=tagFor(m),meta=card.querySelector(".meta");if(!meta)return;
var old=meta.querySelector("[data-net-tag]");
if(!info){if(old)old.remove();return}
if(old&&old.dataset.k===info.k)return;
if(old)old.remove();
var s=document.createElement("span");
s.className="tag";s.setAttribute("data-net-tag","1");s.dataset.k=info.k;
s.style.background=info.bg;s.style.color=info.c;s.textContent=info.t;
meta.appendChild(s)})}
function decorateModal(){
var mc=document.getElementById("mc");if(!mc)return;
if(!mc.querySelector('[data-act="shfile"]')){var stray=document.getElementById("netDeliver");if(stray)stray.remove();return}
var m=window.MM;if(!m)return;
var d=DEL[m.id]||{st:N.state==="on"?"wait":"off",n:0};
var on=N.state==="on",cnt=DB.players.length;
var cls=d.st==="sent"?"ok":(d.st==="fail"?"bad":""),dot=d.st==="sent"?"":(d.st==="fail"?" bad":(on?" wait":" off"));
var title,body,btns="";
if(!on){title="📴 Отряд не подключён";body="Дело сохранено только у тебя. Создай сетевую игру — и оно улетит всем сразу. Или отправь файлом через чат.";btns='<button class="btn bg sm" data-nd="create">🌐 Создать игру</button>'}
else if(d.st==="sent"){title="📡 Дело уже у всего отряда";body="Получили "+Math.max(0,cnt-1)+" игрок(ов). Файл ниже — запасной путь для тех, кто без сети."}
else if(d.st==="fail"){title="⚠️ Не доставлено";body="Сеть моргнула. Попробуй ещё раз или отправь файлом.";btns='<button class="btn bo sm" data-nd="retry">↺ Повторить отправку</button>'}
else{title="⏳ Отправляю отряду…";body="Дело уходит всем участникам игры "+N.room+". Файл можно не отправлять."}
var sig=cls+"|"+d.st+"|"+cnt+"|"+N.room;
var box=document.getElementById("netDeliver");
if(!box){box=document.createElement("div");box.id="netDeliver";mc.insertBefore(box,mc.children[1]||null);
box.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-nd]"):null;if(!t)return;
F.S.p("tap");
if(t.dataset.nd==="create"){F.CM();F.GO("squad");start(String(Math.floor(1000+Math.random()*9000)),true)}
else{DEL[m.id]={st:"wait",n:0};push(true)}})}
if(box.dataset.sig===sig)return;
box.dataset.sig=sig;box.className=cls;
box.innerHTML='<div class="nstat"><span class="ndot'+dot+'"></span>'+title+'</div><p class="note" style="margin-top:6px">'+body+'</p>'+(btns?'<div class="nrow">'+btns+'</div>':"")}
function lobbyCount(){var e=document.getElementById("netShared");if(!e)return;
var sent=mine().filter(function(m){return DEL[m.id]&&DEL[m.id].st==="sent"}).length;
e.textContent="📡 Моих дел в отряде: "+sent+" из "+mine().length}

function lobby(){
var box=document.getElementById("netLobby");if(!box)return;
var on=N.state==="on",busy=N.state==="conn"||N.state==="recon",host=N.host||!on;
var roster=DB.players.map(function(p){
var online=!on||p.id===N.me||Date.now()-(p.seen||0)<45000;
var isL=DB.leaderId===p.id,cls=(p.id===N.me?" me":"")+(isL?" ld":"")+(online?"":" off");
var act=isL?'<span class="chip on">👑</span>':(host?'<button class="btn bo sm" data-net="lead" data-id="'+p.id+'">👑</button>':"");
return '<div class="np'+cls+'">'+F.AW(p,36)+'<div class="g2"><div class="nm">'+F.E(p.name)+(p.id===N.me?' <span class="tn mu">(ты)</span>':"")+'</div><div class="s">'+F.E(p.xp+" XP")+'</div></div><span class="ndot'+(online?"":" off")+'"></span>'+act+'</div>'}).join("");
var head;
if(on||busy){var dc=on?"":(N.state==="conn"?" wait":" off");
head='<div class="nstat"><span class="ndot'+dc+'"></span>'+N.msg+" · "+(N.host?"ты хост":"подключён")+'<span class="ncnt">'+DB.players.length+'</span></div>'+
'<div class="ncode">'+N.room+'</div>'+
'<div class="nrow"><button class="btn bs sm g2" data-net="copy">📋 Код</button><button class="btn sm g2" data-net="invite">💬 Пригласить</button><button class="btn bw sm" data-net="leave">Выйти</button></div>'+
'<h2 class="sub">ПРИСОЕДИНИЛИСЬ · '+DB.players.length+'</h2><div id="netRoster">'+roster+'</div>'+
'<div class="nrow" style="margin-top:8px"><button class="btn bg sm w" data-net="push">📡 Разослать мои дела</button></div>'+
'<p class="note" id="netShared"></p>'+
(DB.players.length<2?'<p class="note">Ждём друзей: «Отряд» → код <b>'+N.room+'</b> → «Войти».</p>':'<p class="note">Новые дела улетают всем автоматически — файл через чат больше не обязателен.</p>')}
else{head='<h2 class="sub" style="margin-top:0">🌐 СЕТЕВАЯ ИГРА</h2>'+
'<p class="tn mu">Один телефон — один игрок. Создай игру и дай друзьям код: дела будут приходить всем сами.</p>'+
'<button class="btn big w" data-net="create" style="margin-top:9px">🌐 Создать игру</button>'+
'<div class="njoin"><input type="text" id="netCode" class="g2" inputmode="numeric" maxlength="4" placeholder="Код из 4 цифр"><button class="btn bg" data-net="join">🔑 Войти</button></div>'+
'<div class="err2" id="netErr"></div>'+
'<h2 class="sub">В ОТРЯДЕ · '+DB.players.length+'</h2><div id="netRoster">'+roster+'</div>'+
'<p class="note">Без сети можно тренироваться одному: назначь себя ведущим 👑 и открой дело «Тренировка».</p>'}
box.innerHTML='<div class="pan">'+head+'</div>';lobbyCount()}

function mount(){
var sq=document.getElementById("v-squad");if(!sq)return;
if(!document.getElementById("netLobby")){
var d=document.createElement("div");d.id="netLobby";sq.insertBefore(d,sq.firstChild);
d.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-net]"):null;if(!t)return;
var a=t.dataset.net;F.S.p("tap");
if(a==="create")start(String(Math.floor(1000+Math.random()*9000)),true);
else if(a==="join"){var c=document.getElementById("netCode").value.replace(/\D/g,"");if(c.length!==4){document.getElementById("netErr").textContent="Нужно 4 цифры";return}start(c,false)}
else if(a==="leave")leave();
else if(a==="push"){mine().forEach(function(m){DEL[m.id]={st:"wait",n:0}});push(true);F.TS("📡","Отправляю дела отряду")}
else if(a==="lead"){F.SETL(t.dataset.id);DB.leaderMode="manual";F.SAVE();sync();lobby();locks()}
else if(a==="copy"){if(navigator.clipboard)navigator.clipboard.writeText(N.room).then(function(){F.TS("📋","Код скопирован")}).catch(function(){F.TS("🔑","Код: "+N.room)});else F.TS("🔑","Код: "+N.room)}
else if(a==="invite"){F.TS("🔑","Код игры: "+N.room);F.CHAT()}})}
lobby();locks();paint();
var mo=new MutationObserver(function(){locks();paint()});
["sqR","leadB","board","mc"].forEach(function(id){var el=document.getElementById(id);if(el)mo.observe(el,{childList:true,subtree:true})})}

document.addEventListener("click",function(e){
var t=e.target.closest?e.target.closest('[data-act="case"]'):null;
if(t){var m=DB.missions.filter(function(x){return x.id===t.dataset.id})[0];
if(m&&m.authorId===N.me){e.stopPropagation();e.preventDefault();F.TS("🙈","Своё дело искать нельзя — ты его снял!");return}}
setTimeout(function(){if(N.state==="on"){push();sync()}else{mine().forEach(function(m){if(!DEL[m.id])DEL[m.id]={st:"off",n:0}})}paint();lobby()},110)},true);
window.addEventListener("beforeunload",function(){try{if(N.state==="on")pub("a",{t:"leave",from:N.me})}catch(e){}});
if(!(DB.net&&DB.net.room))solo();
mount();F.TOP();F.DRAW();
if(DB.net&&DB.net.room){N.me=DB.net.me||DB.activeId;start(DB.net.room,!!DB.net.host)}
})();
