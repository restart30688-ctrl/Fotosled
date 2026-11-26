/* ФОТОСЛЕД · сетевая игра: один телефон — один игрок */
(function(){
"use strict";
if(window.__FSNET)return;window.__FSNET=1;
var F=window.FS;
if(!F){var er=document.getElementById("err");if(er){er.style.display="block";document.getElementById("errMsg").textContent="net.js: в index.html нет строки-моста window.FS";}return;}
var DB=F.D,Q=function(s){return document.querySelector(s)};
var css=document.createElement("style");
css.textContent='#v-squad.on{display:grid;grid-template-columns:minmax(272px,1fr) minmax(272px,1fr);gap:13px;align-items:start}#v-squad .two{grid-template-columns:1fr}#sqL{display:none}[data-act="addp"],[data-act="allin"],[data-act="nonein"],[data-act="switch"],[data-act="delp"]{display:none!important}#netLobby .ncode{font-size:34px;font-weight:900;letter-spacing:10px;color:var(--pk2);text-align:center;background:#fff;border-radius:16px;padding:9px 6px;box-shadow:0 4px 0 var(--sh);margin:9px 0}#netLobby .nstat{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:900;color:var(--mu)}#netLobby .ndot{width:11px;height:11px;border-radius:50%;background:var(--lm);box-shadow:0 0 0 3px #E9F9D8;flex:none;animation:npulse 1.8s ease-in-out infinite}#netLobby .ndot.wait{background:var(--sun);box-shadow:0 0 0 3px #FFF0C9}#netLobby .ndot.off{background:#C9BBA6;box-shadow:0 0 0 3px #F0E6D4;animation:none}@keyframes npulse{50%{box-shadow:0 0 0 6px rgba(139,212,80,.28)}}#netLobby .ncnt{margin-left:auto;font-size:11px;font-weight:900;color:#fff;background:var(--lm);border-radius:10px;padding:3px 9px}#netRoster{max-height:38vh;overflow-y:auto;padding-right:4px;scrollbar-color:var(--pk) #FFE9C4;scrollbar-width:thin}#netLobby .nrow{display:flex;gap:8px;flex-wrap:wrap}#netLobby .njoin{display:flex;gap:8px;margin-top:9px}#netLobby .np{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:16px;background:#fff;box-shadow:0 3px 0 var(--sh);margin-bottom:6px}#netLobby .np.me{background:#FFE9F3;box-shadow:0 3px 0 var(--pk)}#netLobby .np.ld{background:#FFF0C9;box-shadow:0 3px 0 var(--sun)}#netLobby .np.off{opacity:.5}#netLobby .np .nm{font-weight:900;font-size:12.5px}#netLobby .np .s{font-size:9.5px;color:var(--mu)}@media(max-width:760px){#v-squad.on{grid-template-columns:1fr}#netRoster{max-height:none}}';
document.head.appendChild(css);

var TE=new TextEncoder(),TD=new TextDecoder();
var BROKERS=["wss://broker.emqx.io:8084/mqtt","wss://broker.hivemq.com:8884/mqtt","wss://test.mosquitto.org:8081/mqtt"];
var N={ws:null,state:"off",room:"",host:false,me:"",buf:new Uint8Array(0),broker:0,t1:0,t2:0,t3:0,last:0,msg:"",sent:{},rep:{}};

function mstr(s){var b=TE.encode(s),a=[b.length>>8,b.length&255],i;for(i=0;i<b.length;i++)a.push(b[i]);return a}
function mlen(n){var a=[],d;do{d=n%128;n=Math.floor(n/128);if(n>0)d|=128;a.push(d)}while(n>0);return a}
function mpk(t,b){var h=[t].concat(mlen(b.length)),u=new Uint8Array(h.length+b.length),i;u.set(h,0);for(i=0;i<b.length;i++)u[h.length+i]=b[i];return u}
function topic(s){return"fs15/r/"+N.room+"/"+s}
function pub(s,o,ret){if(!N.ws||N.state!=="on")return;try{var p=TE.encode(JSON.stringify(o)),b=mstr(topic(s)),i;for(i=0;i<p.length;i++)b.push(p[i]);N.ws.send(mpk(ret?0x31:0x30,b))}catch(e){}}
function meP(){return F.BY(N.me)||F.ME()}
function prof(){var p=meP();return{id:p.id,name:p.name,look:p.look,xp:p.xp,solved:p.solved,created:p.created,led:p.led,best:p.best}}
function stop(){clearInterval(N.t1);clearInterval(N.t2);clearInterval(N.t3);N.t1=N.t2=N.t3=0;if(N.ws){try{N.ws.onclose=null;N.ws.close()}catch(e){}}N.ws=null;N.buf=new Uint8Array(0)}
function solo(){var m=F.ME();if(!m)return;DB.players=[m];DB.inGame=[m.id];if(DB.leaderId&&DB.leaderId!==m.id)DB.leaderId=null;DB.hunt=null;F.SAVE()}

function start(code,asHost){
code=String(code||"").replace(/\D/g,"");
if(code.length!==4){F.TS("🔑","Код — 4 цифры");return}
stop();N.room=code;N.host=!!asHost;N.me=DB.activeId;N.sent={};N.rep={};
if(asHost){solo();DB.missions=DB.missions.filter(function(m){return!!m.scene})}
DB.net={room:code,me:N.me,host:N.host};F.SAVE();open();
}
function open(){
N.state="conn";N.msg="Подключаюсь…";lobby();
var ws;try{ws=new WebSocket(BROKERS[N.broker%BROKERS.length],"mqtt")}catch(e){N.state="off";N.msg="Нет сети";lobby();return}
N.ws=ws;ws.binaryType="arraybuffer";
ws.onopen=function(){ws.send(mpk(0x10,mstr("MQTT").concat([4,2,0,60],mstr("fs"+N.me+F.U()))))};
ws.onmessage=function(ev){feed(new Uint8Array(ev.data))};
ws.onerror=function(){};
ws.onclose=function(){if(!N.room)return;N.state="recon";N.msg="Переподключаюсь…";lobby();clearInterval(N.t1);clearInterval(N.t2);clearInterval(N.t3);N.broker++;setTimeout(function(){if(N.room)open()},1800)};
}
function ready(){
N.state="on";N.msg="В сети";N.last=Date.now();
N.ws.send(mpk(0x82,[0,1].concat(mstr(topic("#")),[0])));
clearInterval(N.t1);clearInterval(N.t2);clearInterval(N.t3);
N.t1=setInterval(function(){if(N.ws&&N.state==="on"){try{N.ws.send(new Uint8Array([192,0]))}catch(e){}}},25000);
N.t2=setInterval(function(){if(N.host){prune();broadcast()}else pub("a",{t:"hb",from:N.me,p:prof()})},5000);
N.t3=setInterval(function(){if(N.host||!N.last)return;if(Date.now()-N.last>26000){var o=DB.players.filter(function(p){return p.id!==N.me&&Date.now()-(p.seen||0)<45000});if(!o.length){N.host=true;DB.net.host=true;F.TS("👑","Хост пропал — ты теперь хост");broadcast()}}},9000);
if(N.host)broadcast();else pub("a",{t:"join",from:N.me,p:prof()});
lobby();locks();F.TOP();F.DRAW();F.S.p("ok");F.TS("🌐","Игра "+N.room+" — на связи");
}
function feed(ch){
var m=new Uint8Array(N.buf.length+ch.length);m.set(N.buf);m.set(ch,N.buf.length);N.buf=m;
for(;;){if(N.buf.length<2)return;var i=1,mu=1,len=0,b;
for(;;){if(i>=N.buf.length)return;b=N.buf[i++];len+=(b&127)*mu;mu*=128;if(!(b&128))break}
if(N.buf.length<i+len)return;
var t=N.buf[0]>>4,body=N.buf.subarray(i,i+len);N.buf=N.buf.slice(i+len);
if(t===2)ready();
else if(t===3){var tl=(body[0]<<8)|body[1],tp=TD.decode(body.subarray(2,2+tl)),tx=TD.decode(body.subarray(2+tl));if(tx)handle(tp,tx)}}
}
function handle(tp,tx){var k=tp.split("/")[3],o;try{o=JSON.parse(tx)}catch(e){return}
if(k==="s"){if(N.host&&o.host!==N.me&&o.ts>(DB.nts||0)){N.host=false;DB.net.host=false}if(!N.host)apply(o)}
else if(k==="m")addMission(o);
else if(k==="a"&&N.host&&o.from!==N.me)action(o)}
function apply(o){
N.last=Date.now();DB.nts=o.ts;
var mine=F.BY(N.me),prev=DB.leaderId;
DB.players=(o.pl||[]).map(function(p){return{id:p.id,name:p.name,look:Object.assign(F.DL(),p.look),xp:p.xp||0,solved:p.solved||0,created:p.created||0,led:p.led||0,best:p.best||0,clean:0,field:0,badges:[],seen:Date.now()}});
var at=-1,i;for(i=0;i<DB.players.length;i++)if(DB.players[i].id===N.me)at=i;
if(mine){mine.seen=Date.now();if(at>=0)DB.players[at]=mine;else DB.players.push(mine)}
DB.activeId=N.me;DB.inGame=DB.players.map(function(p){return p.id});
DB.leaderId=o.leader;DB.leaderMode=o.mode;DB.hunt=o.hunt;
var ids={};(o.ms||[]).forEach(function(x){ids[x]=1});
DB.missions=DB.missions.filter(function(m){return m.scene||ids[m.id]});
F.SAVE();F.TOP();F.DRAW();if(F.RS)F.RS();lobby();locks();
if(prev!==DB.leaderId&&DB.leaderId){var L=F.BY(DB.leaderId);if(L){F.S.p("crown");F.BU(innerWidth/2,innerHeight/2,110);F.TS("👑","Ведущий: "+F.E(L.name))}}
}
function broadcast(){if(!N.host||N.state!=="on")return;
pub("s",{t:"s",host:N.me,ts:Date.now(),pl:DB.players.map(function(p){return{id:p.id,name:p.name,look:p.look,xp:p.xp,solved:p.solved,created:p.created,led:p.led,best:p.best}}),leader:DB.leaderId,mode:DB.leaderMode,hunt:DB.hunt,ms:DB.missions.filter(function(m){return!m.scene}).map(function(m){return m.id})},true)}
function action(o){
if(o.t==="join"||o.t==="hb"){var p=F.BY(o.p.id);
if(!p){p={id:o.p.id,name:o.p.name,look:F.DL(),xp:0,solved:0,created:0,led:0,best:0,clean:0,field:0,badges:[],seen:0};DB.players.push(p);F.S.p("ok");F.BU(innerWidth*.3,innerHeight*.4,60);F.TS("🎉",F.E(o.p.name)+" присоединился!")}
p.name=o.p.name;p.look=Object.assign(F.DL(),o.p.look);p.xp=o.p.xp;p.solved=o.p.solved;p.created=o.p.created;p.led=o.p.led;p.best=o.p.best;p.seen=Date.now();
DB.inGame=DB.players.map(function(x){return x.id});
F.SAVE();broadcast();F.TOP();F.DRAW();lobby();locks()}
else if(o.t==="leave"){DB.players=DB.players.filter(function(x){return x.id!==o.from});DB.inGame=DB.players.map(function(x){return x.id});if(DB.leaderId===o.from)DB.leaderId=null;F.SAVE();broadcast();F.DRAW();lobby()}
else if((o.t==="found"||o.t==="gave")&&DB.hunt){var s=DB.hunt.seek.filter(function(x){return x.id===o.from})[0];
if(s){s.st=o.t==="found"?"ok":"no";s.at=Date.now();F.SAVE();broadcast();if(F.RS)F.RS();if(o.t==="found"){F.S.p("win");var w=F.BY(o.from);F.TS("🎉",F.E(w?w.name:"Игрок")+" нашёл место!")}}}
else if(o.t==="mis"){addMission(o.m);broadcast()}}
function prune(){var now=Date.now();DB.players=DB.players.filter(function(p){return p.id===N.me||now-(p.seen||0)<120000});DB.inGame=DB.players.map(function(p){return p.id});if(DB.leaderId&&!F.BY(DB.leaderId))DB.leaderId=null}
function addMission(m){if(!m||!m.id)return;if(DB.missions.some(function(x){return x.id===m.id}))return;
m.author=m.author||{name:"Друг",look:F.DL()};m.author.look=Object.assign(F.DL(),m.author.look);if(m.author.look.g!=="m")m.author.look.g="f";
DB.missions.unshift(m);F.SAVE();F.DRAW();F.TS("📥","Новое дело "+F.CN(m)+" от "+F.E(m.author.name))}
function sync(){if(N.state!=="on")return;
DB.missions.forEach(function(m){if(m.authorId===N.me&&!N.sent[m.id]){N.sent[m.id]=1;pub("m/"+m.id,m,true);if(!N.host)pub("a",{t:"mis",from:N.me,m:m})}});
Object.keys(DB.prog).forEach(function(k){if(k.indexOf(":"+N.me)<0)return;var pr=DB.prog[k];
if(pr.state==="solved"&&!N.rep[k]){N.rep[k]=1;
if(N.host){if(DB.hunt){var s=DB.hunt.seek.filter(function(x){return x.id===N.me})[0];if(s){s.st="ok";s.at=Date.now()}}}else pub("a",{t:"found",from:N.me})}});
if(N.host)broadcast();else pub("a",{t:"hb",from:N.me,p:prof()});F.SAVE()}
function leave(){if(N.state==="on"){pub("a",{t:"leave",from:N.me});if(N.host)pub("s","",true)}
stop();N.room="";N.host=false;N.state="off";DB.net=null;solo();F.SAVE();lobby();F.TOP();F.DRAW();locks()}

function locks(){
var on=N.state==="on",host=N.host||!on,L=F.LD();
["sqR","leadB"].forEach(function(id){var box=document.getElementById(id);if(!box)return;
[].forEach.call(box.querySelectorAll("[data-act]"),function(b){var a=b.dataset.act;
if(on&&!host&&(a==="lmode"||a==="roll"||a==="unlead")){b.disabled=true;b.style.opacity=".45"}
if(a==="hunt"&&L&&L.id!==N.me){b.disabled=true;b.style.opacity=".45"}})})}

function lobby(){
var box=document.getElementById("netLobby");if(!box)return;
var on=N.state==="on",busy=N.state==="conn"||N.state==="recon",host=N.host||!on;
var head,roster=DB.players.map(function(p){
var online=!on||p.id===N.me||Date.now()-(p.seen||0)<45000;
var isL=DB.leaderId===p.id,cls=(p.id===N.me?" me":"")+(isL?" ld":"")+(online?"":" off");
var act=isL?'<span class="chip on">👑</span>':(host?'<button class="btn bo sm" data-net="lead" data-id="'+p.id+'">👑</button>':"");
return '<div class="np'+cls+'">'+F.AW(p,36)+'<div class="g2"><div class="nm">'+F.E(p.name)+(p.id===N.me?' <span class="tn mu">(ты)</span>':"")+'</div><div class="s">'+F.E(p.xp+" XP")+'</div></div><span class="ndot'+(online?"":" off")+'"></span>'+act+'</div>'}).join("");
if(on||busy){
var dc=on?"":(N.state==="conn"?" wait":" off");
head='<div class="nstat"><span class="ndot'+dc+'"></span>'+N.msg+" · "+(N.host?"ты хост":"подключён")+'<span class="ncnt">'+DB.players.length+'</span></div>'+
'<div class="ncode">'+N.room+'</div>'+
'<div class="nrow"><button class="btn bs sm g2" data-net="copy">📋 Код</button><button class="btn sm g2" data-net="invite">💬 Пригласить</button><button class="btn bw sm" data-net="leave">Выйти</button></div>'+
'<h2 class="sub">ПРИСОЕДИНИЛИСЬ · '+DB.players.length+'</h2><div id="netRoster">'+roster+'</div>'+
(DB.players.length<2?'<p class="note">Ждём друзей: они открывают «Отряд», вводят код <b>'+N.room+'</b> и жмут «Войти».</p>':'<p class="note">Все игроки видны у всех. Ведущий выбирается справа, дела прилетают автоматически.</p>');
}else{
head='<h2 class="sub" style="margin-top:0">🌐 СЕТЕВАЯ ИГРА</h2>'+
'<p class="tn mu">Один телефон — один игрок. Создай игру и дай друзьям код или войди в чужую.</p>'+
'<button class="btn big w" data-net="create" style="margin-top:9px">🌐 Создать игру</button>'+
'<div class="njoin"><input type="text" id="netCode" class="g2" inputmode="numeric" maxlength="4" placeholder="Код из 4 цифр"><button class="btn bg" data-net="join">🔑 Войти</button></div>'+
'<div class="err2" id="netErr"></div>'+
'<h2 class="sub">В ОТРЯДЕ · '+DB.players.length+'</h2><div id="netRoster">'+roster+'</div>'+
'<p class="note">Без сети можно тренироваться одному: назначь себя ведущим 👑 и открой дело «Тренировка».</p>';
}
box.innerHTML='<div class="pan">'+head+'</div>';
}
function mount(){
var sq=document.getElementById("v-squad");if(!sq)return;
if(!document.getElementById("netLobby")){
var d=document.createElement("div");d.id="netLobby";sq.insertBefore(d,sq.firstChild);
d.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-net]"):null;if(!t)return;
var a=t.dataset.net;F.S.p("tap");
if(a==="create")start(String(Math.floor(1000+Math.random()*9000)),true);
else if(a==="join"){var c=document.getElementById("netCode").value.replace(/\D/g,"");if(c.length!==4){document.getElementById("netErr").textContent="Нужно 4 цифры";return}start(c,false)}
else if(a==="leave")leave();
else if(a==="lead"){F.SETL(t.dataset.id);DB.leaderMode="manual";F.SAVE();sync();lobby();locks()}
else if(a==="copy"){if(navigator.clipboard)navigator.clipboard.writeText(N.room).then(function(){F.TS("📋","Код скопирован")}).catch(function(){F.TS("🔑","Код: "+N.room)});else F.TS("🔑","Код: "+N.room)}
else if(a==="invite"){F.TS("🔑","Код игры: "+N.room);F.CHAT()}});
}
lobby();locks();
var sr=document.getElementById("sqR");
if(sr)new MutationObserver(function(){locks()}).observe(sr,{childList:true,subtree:true});
var lb=document.getElementById("leadB");
if(lb)new MutationObserver(function(){locks()}).observe(lb,{childList:true,subtree:true});
}
document.addEventListener("click",function(e){
var t=e.target.closest?e.target.closest('[data-act="case"]'):null;
if(t){var m=DB.missions.filter(function(x){return x.id===t.dataset.id})[0];
if(m&&m.authorId===N.me){e.stopPropagation();e.preventDefault();F.TS("🙈","Своё дело искать нельзя — ты его снял!");return}}
if(N.state==="on")setTimeout(function(){sync();lobby()},90);
},true);
window.addEventListener("beforeunload",function(){try{if(N.state==="on")pub("a",{t:"leave",from:N.me})}catch(e){}});
if(!(DB.net&&DB.net.room))solo();
mount();F.TOP();F.DRAW();
if(DB.net&&DB.net.room){N.me=DB.net.me||DB.activeId;start(DB.net.room,!!DB.net.host)}
})();
