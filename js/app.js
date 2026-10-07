(() => {
  const $ = (id) => document.getElementById(id);

  if (!window.SUPABASE_URL || window.SUPABASE_URL.includes("PASTE_") ||
      !window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY.includes("PASTE_")) {
    $("authMessage").textContent = "Open js/config.js and add your Supabase URL and anon key.";
    return;
  }

  const client = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  let currentUser = null;
  let myProfile = null;
  let selectedUser = null;
  let allUsers = [];
  let messageChannel = null;
  let profileChannel = null;

  function initials(name) {
    return (name || "U").trim().split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase();
  }

  function showAuthMessage(text, good=false) {
    $("authMessage").textContent = text || "";
    $("authMessage").style.color = good ? "#86efac" : "";
  }

  function setTheme(theme) {
    document.body.classList.remove("light","blue","purple");
    if (theme !== "dark") document.body.classList.add(theme);
    localStorage.setItem("chats-theme", theme);
    $("themeSelect").value = theme;
  }

  function friendlyError(error) {
    return error?.message || "Something went wrong. Please try again.";
  }

  async function ensureProfile(user, nameIfNew="User") {
    const { data, error } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) throw error;
    if (data) return data;
    const { data: created, error: createError } = await client.from("profiles")
      .insert({ id:user.id, display_name:nameIfNew.trim() || "User", is_online:true, last_seen:new Date().toISOString() })
      .select().single();
    if (createError) throw createError;
    return created;
  }

  async function enterApp(user) {
    currentUser = user;
    myProfile = await ensureProfile(user);
    await client.from("profiles").update({is_online:true,last_seen:new Date().toISOString()}).eq("id", user.id);

    $("authScreen").classList.add("hidden");
    $("chatScreen").classList.remove("hidden");
    $("myNameLabel").textContent = myProfile.display_name;
    $("profileNameInput").value = myProfile.display_name;
    $("profileAvatar").textContent = initials(myProfile.display_name);
    setTheme(localStorage.getItem("chats-theme") || "dark");
    $("connectionStatus").textContent = "Online";

    await loadUsers();
    subscribeRealtime();
  }

  async function loadUsers() {
    const { data, error } = await client.from("profiles")
      .select("id,display_name,last_seen,is_online")
      .neq("id", currentUser.id)
      .order("display_name");
    if (error) {
      $("usersList").innerHTML = `<div class="empty-state"><p>${escapeHtml(friendlyError(error))}</p></div>`;
      return;
    }
    allUsers = data || [];
    renderUsers(allUsers);
  }

  function renderUsers(users) {
    const query = $("userSearch").value.trim().toLowerCase();
    const filtered = users.filter(u => (u.display_name || "").toLowerCase().includes(query));
    if (!filtered.length) {
      $("usersList").innerHTML = `<div class="empty-state" style="padding:30px 10px"><p>No people found.</p></div>`;
      return;
    }
    $("usersList").innerHTML = filtered.map(u => `
      <div class="user-item ${selectedUser?.id === u.id ? "active":""}" data-id="${u.id}">
        <div class="avatar">${escapeHtml(initials(u.display_name))}</div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(u.display_name || "User")}</div>
          <div class="user-status">${u.is_online ? "Online" : formatLastSeen(u.last_seen)}</div>
        </div>
        <span class="dot ${u.is_online ? "online":""}"></span>
      </div>`).join("");
    document.querySelectorAll(".user-item").forEach(el => {
      el.onclick = () => {
        const u = allUsers.find(x => x.id === el.dataset.id);
        if (u) openChat(u);
      };
    });
  }

  function formatLastSeen(value) {
    if (!value) return "Offline";
    const d = new Date(value);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "Last seen just now";
    if (diff < 3600000) return `Last seen ${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `Last seen ${Math.floor(diff/3600000)}h ago`;
    return `Last seen ${d.toLocaleDateString()}`;
  }

  async function openChat(user) {
    selectedUser = user;
    $("main-area")?.classList?.add("chat-open");
    document.querySelector(".main-area").classList.add("chat-open");
    $("chatName").textContent = user.display_name || "User";
    $("chatAvatar").textContent = initials(user.display_name);
    updateChatStatus(user);
    $("messageInput").disabled = false;
    $("sendBtn").disabled = false;
    await loadMessages();
    await markRead();
    renderUsers(allUsers);
  }

  function updateChatStatus(user) {
    $("chatStatus").textContent = user.is_online ? "Online" : formatLastSeen(user.last_seen);
  }

  async function loadMessages() {
    if (!selectedUser) return;
    const { data, error } = await client.from("messages").select("*")
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
      .order("created_at", {ascending:true});
    if (error) {
      $("messages").innerHTML = `<div class="empty-state"><p>${escapeHtml(friendlyError(error))}</p></div>`;
      return;
    }
    renderMessages(data || []);
  }

  function renderMessages(list) {
    const box = $("messages");
    if (!list.length) {
      box.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><h3>Start a conversation</h3><p>Send the first message.</p></div>`;
      return;
    }
    let lastDay = "";
    box.innerHTML = list.map(m => {
      const date = new Date(m.created_at);
      const day = date.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
      const separator = day !== lastDay ? `<div class="day">${escapeHtml(day)}</div>` : "";
      lastDay = day;
      const mine = m.sender_id === currentUser.id;
      const time = date.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
      const seen = mine && m.read_at ? " • Seen" : "";
      return `${separator}<div class="msg-row ${mine ? "mine":""}">
        <div class="bubble">${escapeHtml(m.content)}
          <div class="meta">${time}${seen}</div>
        </div>
      </div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  async function markRead() {
    if (!selectedUser) return;
    await client.from("messages").update({read_at:new Date().toISOString()})
      .eq("receiver_id",currentUser.id).eq("sender_id",selectedUser.id).is("read_at",null);
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!selectedUser) return;
    const input = $("messageInput");
    const content = input.value.trim();
    if (!content) return;
    $("sendBtn").disabled = true;
    const { error } = await client.from("messages").insert({
      sender_id:currentUser.id,
      receiver_id:selectedUser.id,
      content,
      message_type:"text"
    });
    $("sendBtn").disabled = false;
    if (error) {
      alert(friendlyError(error));
      return;
    }
    input.value = "";
    await loadMessages();
  }

  function subscribeRealtime() {
    if (messageChannel) client.removeChannel(messageChannel);
    if (profileChannel) client.removeChannel(profileChannel);

    messageChannel = client.channel("messages-live")
      .on("postgres_changes",{event:"*",schema:"public",table:"messages"}, async payload => {
        const m = payload.new || payload.old;
        if (!m || !selectedUser) return;
        if ((m.sender_id === currentUser.id && m.receiver_id === selectedUser.id) ||
            (m.sender_id === selectedUser.id && m.receiver_id === currentUser.id)) {
          await loadMessages();
          if (m.receiver_id === currentUser.id) await markRead();
        }
      }).subscribe();

    profileChannel = client.channel("profiles-live")
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles"}, payload => {
        const p = payload.new;
        const i = allUsers.findIndex(u => u.id === p.id);
        if (i >= 0) allUsers[i] = {...allUsers[i],...p};
        renderUsers(allUsers);
        if (selectedUser?.id === p.id) {
          selectedUser = {...selectedUser,...p};
          updateChatStatus(selectedUser);
        }
      }).subscribe();
  }

  async function logout() {
    if (currentUser) {
      await client.from("profiles").update({is_online:false,last_seen:new Date().toISOString()}).eq("id",currentUser.id);
    }
    await client.auth.signOut();
    location.reload();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  document.querySelectorAll("[data-auth-tab]").forEach(btn => {
    btn.onclick = () => {
      const isLogin = btn.dataset.authTab === "login";
      document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x===btn));
      $("loginForm").classList.toggle("hidden", !isLogin);
      $("signupForm").classList.toggle("hidden", isLogin);
      showAuthMessage("");
    };
  });

  $("loginForm").onsubmit = async e => {
    e.preventDefault();
    showAuthMessage("Logging in…", true);
    const {data,error} = await client.auth.signInWithPassword({
      email:$("loginEmail").value.trim(),
      password:$("loginPassword").value
    });
    if (error) { showAuthMessage(friendlyError(error)); return; }
    try { await enterApp(data.user); } catch(err) { showAuthMessage(friendlyError(err)); }
  };

  $("signupForm").onsubmit = async e => {
    e.preventDefault();
    showAuthMessage("Creating account…", true);
    const name = $("signupName").value.trim();
    const {data,error} = await client.auth.signUp({
      email:$("signupEmail").value.trim(),
      password:$("signupPassword").value,
      options:{data:{display_name:name}}
    });
    if (error) { showAuthMessage(friendlyError(error)); return; }
    if (!data.user) { showAuthMessage("Account created. Check your email to confirm.", true); return; }
    try {
      myProfile = await ensureProfile(data.user,name);
      await enterApp(data.user);
    } catch(err) { showAuthMessage(friendlyError(err)); }
  };

  $("userSearch").oninput = () => renderUsers(allUsers);
  $("messageForm").onsubmit = sendMessage;
  $("logoutBtn").onclick = logout;
  $("profileLogoutBtn").onclick = logout;

  $("profileBtn").onclick = () => {
    $("profilePanel").classList.remove("hidden");
    $("profileNameInput").value = myProfile?.display_name || "";
    $("profileAvatar").textContent = initials(myProfile?.display_name);
  };
  $("closeProfileBtn").onclick = () => $("profilePanel").classList.add("hidden");

  $("saveProfileBtn").onclick = async () => {
    const name = $("profileNameInput").value.trim();
    if (!name) return;
    const {data,error} = await client.from("profiles").update({display_name:name}).eq("id",currentUser.id).select().single();
    if (error) { $("profileMessage").textContent = friendlyError(error); return; }
    myProfile = data;
    $("myNameLabel").textContent = name;
    $("profileAvatar").textContent = initials(name);
    $("profileMessage").style.color = "#86efac";
    $("profileMessage").textContent = "Saved.";
    await loadUsers();
  };

  $("themeSelect").onchange = e => setTheme(e.target.value);

  $("notifyBtn").onclick = async () => {
    if (!("Notification" in window)) {
      $("profileMessage").textContent = "Notifications are not supported by this browser.";
      return;
    }
    const permission = await Notification.requestPermission();
    $("notifyBtn").textContent = permission === "granted" ? "Enabled" : "Enable";
    $("profileMessage").textContent = permission === "granted" ? "Notifications enabled." : "Notification permission was not granted.";
  };

  $("backBtn").onclick = () => {
    document.querySelector(".main-area").classList.remove("chat-open");
    selectedUser = null;
    $("messageInput").disabled = true;
    $("sendBtn").disabled = true;
  };

  window.addEventListener("beforeunload", () => {
    if (currentUser) client.from("profiles").update({is_online:false,last_seen:new Date().toISOString()}).eq("id",currentUser.id);
  });

  setInterval(async () => {
    if (!currentUser) return;
    await client.from("profiles").update({is_online:true,last_seen:new Date().toISOString()}).eq("id",currentUser.id);
  }, 30000);

  setTheme(localStorage.getItem("chats-theme") || "dark");

  client.auth.getSession().then(async ({data}) => {
    if (data.session?.user) {
      try { await enterApp(data.session.user); }
      catch(err) { showAuthMessage(friendlyError(err)); }
    }
  });

  client.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      $("chatScreen").classList.add("hidden");
      $("authScreen").classList.remove("hidden");
    }
  });
})();
