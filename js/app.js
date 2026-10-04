const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

let currentUser = null, profile = null, selectedUser = null, channel = null;
let authMode = "login";

const $ = id => document.getElementById(id);
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),3000)}
function initials(name="User"){return name.trim().slice(0,1).toUpperCase()}

document.querySelectorAll("[data-auth]").forEach(b=>b.onclick=()=>{
  authMode=b.dataset.auth;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));
  $("displayName").classList.toggle("hidden",authMode!=="signup");
  $("authButton").textContent=authMode==="signup"?"Create account":"Login";
});

$("authForm").onsubmit=async e=>{
  e.preventDefault();
  const email=$("email").value.trim(), password=$("password").value;
  if(authMode==="signup"){
    const name=$("displayName").value.trim()||email.split("@")[0];
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{display_name:name}}});
    if(error)return toast(error.message);
    if(data.session) await startApp(data.user); else toast("Account created. Check your email to confirm, then login.");
  }else{
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error)return toast(error.message);
    await startApp(data.user);
  }
};

$("logoutBtn").onclick=async()=>{await sb.auth.signOut();location.reload()};

async function startApp(user){
  currentUser=user;
  $("authView").classList.add("hidden"); $("appView").classList.remove("hidden");
  await ensureProfile(); await loadUsers();
}

async function ensureProfile(){
  let {data,error}=await sb.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();
  if(error){toast(error.message);return}
  if(!data){
    const displayName=currentUser.user_metadata?.display_name||currentUser.email.split("@")[0];
    const result=await sb.from("profiles").insert({id:currentUser.id,display_name:displayName}).select().single();
    if(result.error){toast(result.error.message);return} data=result.data;
  }
  profile=data;
  $("myName").textContent=data.display_name;
  $("myEmail").textContent=currentUser.email;
  $("myAvatar").textContent=initials(data.display_name);
}

async function loadUsers(){
  const {data,error}=await sb.from("profiles").select("id,display_name,created_at").neq("id",currentUser.id).order("display_name");
  if(error){toast(error.message);return}
  renderUsers(data||[]);
  $("userSearch").oninput=e=>renderUsers((data||[]).filter(u=>u.display_name.toLowerCase().includes(e.target.value.toLowerCase())));
}

function renderUsers(users){
  const list=$("userList"); list.innerHTML="";
  if(!users.length){list.innerHTML='<div class="no-users">No other users yet.</div>';return}
  users.forEach(u=>{
    const el=document.createElement("div");el.className="user-item"+(selectedUser?.id===u.id?" active":"");
    el.innerHTML=`<div class="avatar">${initials(u.display_name)}</div><div class="user-info"><strong>${escapeHtml(u.display_name)}</strong><span>Start a private chat</span></div>`;
    el.onclick=()=>openChat(u);list.appendChild(el);
  });
}

async function openChat(user){
  selectedUser=user;$("emptyChat").classList.add("hidden");$("chatPanel").classList.remove("hidden");
  $("chatName").textContent=user.display_name;$("chatAvatar").textContent=initials(user.display_name);
  if(channel)await sb.removeChannel(channel);
  await loadMessages();
  channel=sb.channel("messages:"+[currentUser.id,user.id].sort().join(":"))
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
      const m=payload.new;
      if((m.sender_id===currentUser.id&&m.receiver_id===user.id)||(m.sender_id===user.id&&m.receiver_id===currentUser.id)) appendMessage(m);
    }).subscribe();
  await markRead();
}
async function loadMessages(){
  const ids=[currentUser.id,selectedUser.id];
  const {data,error}=await sb.from("messages").select("*")
    .or(`and(sender_id.eq.${ids[0]},receiver_id.eq.${ids[1]}),and(sender_id.eq.${ids[1]},receiver_id.eq.${ids[0]})`)
    .order("created_at",{ascending:true});
  if(error){toast(error.message);return}
  $("messages").innerHTML="";(data||[]).forEach(appendMessage);scrollMessages();
}
function appendMessage(m){
  if(document.querySelector(`[data-msg="${m.id}"]`))return;
  const el=document.createElement("div");el.className="message "+(m.sender_id===currentUser.id?"mine":"theirs");el.dataset.msg=m.id;
  const t=new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  el.innerHTML=`${escapeHtml(m.content)}<span class="time">${t}</span>`;$("messages").appendChild(el);scrollMessages();
}
$("messageForm").onsubmit=async e=>{
  e.preventDefault();const content=$("messageInput").value.trim();if(!content||!selectedUser)return;
  $("messageInput").value="";
  const {error}=await sb.from("messages").insert({sender_id:currentUser.id,receiver_id:selectedUser.id,content});
  if(error){toast(error.message);$("messageInput").value=content}
};
async function markRead(){ if(!selectedUser)return; await sb.from("messages").update({read_at:new Date().toISOString()}).eq("sender_id",selectedUser.id).eq("receiver_id",currentUser.id).is("read_at",null)}
function scrollMessages(){requestAnimationFrame(()=>$("messages").scrollTop=$("messages").scrollHeight)}
function escapeHtml(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML}

sb.auth.getSession().then(async({data})=>{if(data.session)await startApp(data.session.user)});
sb.auth.onAuthStateChange(async(event,session)=>{if(event==="SIGNED_OUT")location.reload()});
