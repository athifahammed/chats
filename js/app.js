const sb=supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
let me=null,current=null,channel=null,profiles=[];

const $=id=>document.getElementById(id);
function toast(t){$("toast").textContent=t;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2200)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function initials(n){return (n||"U").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function fmtLast(x){if(!x)return"Offline";let d=new Date(x);let diff=Date.now()-d.getTime();if(diff<60000)return"Active now";if(diff<3600000)return`${Math.floor(diff/60000)}m ago`;if(diff<86400000)return`${Math.floor(diff/3600000)}h ago`;return d.toLocaleDateString()}
function dayLabel(x){let d=new Date(x),t=new Date();let y=new Date();y.setDate(t.getDate()-1);if(d.toDateString()===t.toDateString())return"Today";if(d.toDateString()===y.toDateString())return"Yesterday";return d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}
function applyTheme(t){document.documentElement.className=t||"dark";localStorage.setItem("chats-theme",t||"dark")}
function renderUsers(list=profiles){$("users").innerHTML=list.map(p=>`<div class="user" data-id="${p.id}"><div class="avatar">${esc(initials(p.display_name))}${p.is_online?'<span class="dot"></span>':''}</div><div class="user-main"><div class="user-name">${esc(p.display_name)}</div><div class="user-status">${p.is_online?"Active now":fmtLast(p.last_seen)}</div></div></div>`).join("");$("emptyUsers").classList.toggle("hidden",!list.length);document.querySelectorAll(".user").forEach(x=>x.onclick=()=>openChat(x.dataset.id))}
async function ensureSession(){
  let {data:{session}}=await sb.auth.getSession();
  if(!session){let r=await sb.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session}
  me=session.user;
  let {data:p,error}=await sb.from("profiles").select("*").eq("id",me.id).maybeSingle();
  if(error)throw error;
  if(!p){let r=await sb.from("profiles").insert({id:me.id,display_name:"New User",is_online:true,last_seen:new Date().toISOString()}).select().single();if(r.error)throw r.error;p=r.data}
  else await sb.from("profiles").update({is_online:true,last_seen:new Date().toISOString()}).eq("id",me.id);
  $("nameInput").value=p.display_name||"";
}
async function loadUsers(){let r=await sb.from("profiles").select("*").neq("id",me.id).order("display_name");if(r.error){toast(r.error.message);return}profiles=r.data||[];renderUsers()}
async function openChat(id){
 current=profiles.find(p=>p.id===id);if(!current)return;
 $("home").classList.add("hidden");$("chat").classList.remove("hidden");$("chatName").textContent=current.display_name;$("chatStatus").textContent=current.is_online?"Active now":fmtLast(current.last_seen);
 await loadMessages(); subscribeChat();
}
function closeChat(){if(channel)sb.removeChannel(channel);channel=null;current=null;$("chat").classList.add("hidden");$("home").classList.remove("hidden")}
async function loadMessages(){
 let r=await sb.from("messages").select("*").or(`and(sender_id.eq.${me.id},receiver_id.eq.${current.id}),and(sender_id.eq.${current.id},receiver_id.eq.${me.id})`).order("created_at",{ascending:true});
 if(r.error){toast(r.error.message);return}
 $("messages").innerHTML="";let last="";
 for(const m of r.data||[]){let d=dayLabel(m.created_at);if(d!==last){$("messages").insertAdjacentHTML("beforeend",`<div class="day">${d}</div>`);last=d}let mine=m.sender_id===me.id;$("messages").insertAdjacentHTML("beforeend",`<div class="msg ${mine?"mine":""}">${esc(m.content)}<div class="meta">${new Date(m.created_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</div>${mine&&m.read_at?'<div class="seen">Seen</div>':""}</div>`)}
 $("messages").scrollTop=$("messages").scrollHeight;
 await sb.from("messages").update({read_at:new Date().toISOString()}).eq("sender_id",current.id).eq("receiver_id",me.id).is("read_at",null);
}
function subscribeChat(){channel=sb.channel("chat-"+current.id).on("postgres_changes",{event:"*",schema:"public",table:"messages"},payload=>{let m=payload.new;if(m&&(m.sender_id===me.id&&m.receiver_id===current.id||m.sender_id===current.id&&m.receiver_id===me.id))loadMessages()}).subscribe()}
$("sendForm").onsubmit=async e=>{e.preventDefault();let c=$("messageInput").value.trim();if(!c||!current)return;let r=await sb.from("messages").insert({sender_id:me.id,receiver_id:current.id,content:c});if(r.error)toast(r.error.message);else $("messageInput").value=""}
$("backBtn").onclick=closeChat;
$("settingsBtn").onclick=()=>{$("settings").classList.remove("hidden")}
$("closeSettings").onclick=()=>{$("settings").classList.add("hidden")}
$("saveName").onclick=async()=>{let n=$("nameInput").value.trim();if(!n)return;let r=await sb.from("profiles").update({display_name:n}).eq("id",me.id);if(r.error)toast(r.error.message);else{toast("Name saved");$("settings").classList.add("hidden");loadUsers()}}
document.querySelectorAll("[data-theme]").forEach(b=>b.onclick=()=>applyTheme(b.dataset.theme));
$("notifyBtn").onclick=async()=>{if(!("Notification"in window)){toast("Notifications not supported");return}let p=await Notification.requestPermission();toast(p==="granted"?"Notifications enabled":"Notifications disabled")}
$("search").oninput=e=>{let q=e.target.value.toLowerCase();renderUsers(profiles.filter(p=>(p.display_name||"").toLowerCase().includes(q)))}
window.addEventListener("beforeunload",()=>{if(me)sb.from("profiles").update({is_online:false,last_seen:new Date().toISOString()}).eq("id",me.id)});
sb.auth.onAuthStateChange(()=>{});
(async()=>{try{applyTheme(localStorage.getItem("chats-theme")||"dark");await ensureSession();await loadUsers();sb.channel("presence").on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles"},()=>loadUsers()).subscribe();setInterval(()=>me&&sb.from("profiles").update({is_online:true,last_seen:new Date().toISOString()}).eq("id",me.id),30000)}catch(e){console.error(e);toast("Setup error: "+e.message)}})();
