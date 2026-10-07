/* =========================================================
   CHATS — MAIN APPLICATION
   ========================================================= */

/* global supabase */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

let db = null;

if (
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_ANON_KEY.includes("PASTE_")
) {
  db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const state = {
  user: null,
  profile: null,

  selectedUser: null,

  users: [],
  filteredUsers: [],

  messages: [],

  channels: [],

  heartbeatTimer: null,

  notificationEnabled: false,

  onlineStatusEnabled: true,

  loadingMessages: false,
  sendingMessage: false,

  initialized: false
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const authScreen = $("#auth");
const appScreen = $("#app");

const loginForm = $("#login-form");
const signupForm = $("#signup-form");

const authTabs = $$(".auth-tab");

const loginEmail = $("#login-email");
const loginPassword = $("#login-password");

const signupName = $("#signup-name");
const signupEmail = $("#signup-email");
const signupPassword = $("#signup-password");

const loginButton = $("#login-button");
const signupButton = $("#signup-button");

const authMessage = $("#auth-message");

const connectionStatus = $("#connection-status");

const usersPanel = $("#users-panel");
const usersList = $("#users-list");
const userSearch = $("#user-search");

const myDisplayName = $("#my-display-name");

const profileButton = $("#profile-button");

const mainLayout = $("#main-layout");

const chatPanel = $("#chat-panel");

const backButton = $("#back-button");

const chatAvatar = $("#chat-avatar");
const chatUserName = $("#chat-user-name");
const chatUserStatus = $("#chat-user-status");

const chatMenuButton = $("#chat-menu-button");
const chatMenu = $("#chat-menu");
const clearChatButton = $("#clear-chat-button");

const messagesContainer = $("#messages");

const messageForm = $("#message-form");
const messageInput = $("#message-input");
const sendButton = $("#send-button");

const mediaInput = $("#media-input");

const uploadStatus = $("#upload-status");

const settingsPanel = $("#settings-panel");
const closeSettingsButton = $("#close-settings-button");

const profileAvatar = $("#profile-avatar");
const profilePictureInput = $("#profile-picture-input");

const profileName = $("#profile-name");

const saveProfileButton = $("#save-profile-button");
const removeProfilePictureButton =
  $("#remove-profile-picture-button");

const themeSelect = $("#theme-select");

const notificationToggle = $("#notification-toggle");
const onlineStatusToggle = $("#online-status-toggle");

const settingsMessage = $("#settings-message");

const logoutButton = $("#logout-button");


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  setupEventListeners();

  loadSavedTheme();

  if (!db) {

    showAuthMessage(
      "Add your Supabase URL and anon/publishable key in js/config.js.",
      "error"
    );

    return;
  }

  await checkSession();
});


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  /* Auth tabs */

  authTabs.forEach((tab) => {

    tab.addEventListener("click", () => {

      const target = tab.dataset.tab;

      authTabs.forEach((item) => {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      if (target === "login") {

        loginForm.classList.remove("hidden");
        signupForm.classList.add("hidden");

      } else {

        loginForm.classList.add("hidden");
        signupForm.classList.remove("hidden");

      }

      clearAuthMessage();
    });
  });


  /* Login */

  loginForm.addEventListener(
    "submit",
    handleLogin
  );


  /* Signup */

  signupForm.addEventListener(
    "submit",
    handleSignup
  );


  /* Search */

  userSearch.addEventListener(
    "input",
    handleUserSearch
  );


  /* Profile */

  profileButton.addEventListener(
    "click",
    openSettings
  );


  closeSettingsButton.addEventListener(
    "click",
    closeSettings
  );


  /* Back */

  backButton.addEventListener(
    "click",
    closeMobileChat
  );


  /* Chat menu */

  chatMenuButton.addEventListener(
    "click",
    toggleChatMenu
  );


  /* Clear */

  clearChatButton.addEventListener(
    "click",
    clearCurrentChat
  );


  /* Message */

  messageForm.addEventListener(
    "submit",
    sendTextMessage
  );


  messageInput.addEventListener(
    "input",
    updateSendButton
  );


  /* Media */

  mediaInput.addEventListener(
    "change",
    handleMediaUpload
  );


  /* Profile */

  saveProfileButton.addEventListener(
    "click",
    saveProfile
  );


  profilePictureInput.addEventListener(
    "change",
    handleProfilePicture
  );


  removeProfilePictureButton.addEventListener(
    "click",
    removeProfilePicture
  );


  /* Theme */

  themeSelect.addEventListener(
    "change",
    handleThemeChange
  );


  /* Notifications */

  notificationToggle.addEventListener(
    "change",
    handleNotificationToggle
  );


  /* Online status */

  onlineStatusToggle.addEventListener(
    "change",
    handleOnlineStatusToggle
  );


  /* Logout */

  logoutButton.addEventListener(
    "click",
    logout
  );


  /* Close menu when clicking outside */

  document.addEventListener(
    "click",
    (event) => {

      if (
        !chatMenu.contains(event.target) &&
        !chatMenuButton.contains(event.target)
      ) {

        closeChatMenu();

      }
    }
  );


  /* Auth state changes */

  if (db) {

    db.auth.onAuthStateChange(
      async (event, session) => {

        if (event === "SIGNED_OUT") {

          resetApplication();

          return;
        }

        if (
          session &&
          !state.initialized &&
          event === "SIGNED_IN"
        ) {

          await initializeApplication(
            session.user
          );
        }
      }
    );
  }
}


/* =========================================================
   SESSION
   ========================================================= */

async function checkSession() {

  try {

    const {
      data,
      error
    } = await db.auth.getSession();

    if (error) {
      throw error;
    }

    if (data.session) {

      await initializeApplication(
        data.session.user
      );

    } else {

      showAuth();

    }

  } catch (error) {

    console.error(error);

    showAuthMessage(
      error.message || "Unable to check session.",
      "error"
    );

  }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {

  event.preventDefault();

  clearAuthMessage();

  const email =
    loginEmail.value.trim();

  const password =
    loginPassword.value;

  if (!email || !password) {

    showAuthMessage(
      "Enter your email and password.",
      "error"
    );

    return;
  }

  setButtonLoading(
    loginButton,
    true,
    "Logging in..."
  );

  try {

    const {
      data,
      error
    } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Login failed.");
    }

    await initializeApplication(
      data.user
    );

    loginForm.reset();

  } catch (error) {

    console.error(error);

    showAuthMessage(
      getFriendlyAuthError(error),
      "error"
    );

  } finally {

    setButtonLoading(
      loginButton,
      false,
      "Login"
    );
  }
}


/* =========================================================
   SIGNUP
   ========================================================= */

async function handleSignup(event) {

  event.preventDefault();

  clearAuthMessage();

  const name =
    signupName.value.trim();

  const email =
    signupEmail.value.trim();

  const password =
    signupPassword.value;

  if (!name || !email || !password) {

    showAuthMessage(
      "Fill in all fields.",
      "error"
    );

    return;
  }

  if (password.length < 6) {

    showAuthMessage(
      "Password must contain at least 6 characters.",
      "error"
    );

    return;
  }

  setButtonLoading(
    signupButton,
    true,
    "Creating account..."
  );

  try {

    const {
      data,
      error
    } = await db.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data.user) {

      throw new Error(
        "Account could not be created."
      );
    }


    /*
      If email confirmation is disabled,
      a session is immediately available.
    */

    if (data.session) {

      await createOrUpdateProfile(
        data.user,
        name
      );

      await initializeApplication(
        data.user
      );

      signupForm.reset();

    } else {

      /*
        Email confirmation is enabled.
        Profile will be created after first login.
      */

      showAuthMessage(
        "Account created. Check your email to verify your account, then log in.",
        "success"
      );

      signupForm.reset();
    }

  } catch (error) {

    console.error(error);

    showAuthMessage(
      getFriendlyAuthError(error),
      "error"
    );

  } finally {

    setButtonLoading(
      signupButton,
      false,
      "Create account"
    );
  }
}


/* =========================================================
   INITIALIZE APPLICATION
   ========================================================= */

async function initializeApplication(user) {

  if (!user) {
    return;
  }

  state.user = user;

  state.initialized = true;

  showApp();

  await createOrUpdateProfile(
    user
  );

  await loadOwnProfile();

  await setOwnOnlineStatus(
    true
  );

  await loadUsers();

  subscribeToRealtime();

  startHeartbeat();

  loadSettings();

  connectionStatus.classList.add(
    "online"
  );

  connectionStatus.textContent =
    "Connected";
}


/* =========================================================
   CREATE / UPDATE PROFILE
   ========================================================= */

async function createOrUpdateProfile(
  user,
  providedName = null
) {

  try {

    const {
      data: existing,
      error: selectError
    } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (!existing) {

      const fallbackName =
        providedName ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "User";

      const {
        error
      } = await db
        .from("profiles")
        .insert({
          id: user.id,
          display_name:
            fallbackName.substring(0, 40),
          is_online: false
        });

      if (error) {
        throw error;
      }

    } else if (
      providedName &&
      existing.display_name !== providedName
    ) {

      const {
        error
      } = await db
        .from("profiles")
        .update({
          display_name:
            providedName.substring(0, 40)
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }
    }

  } catch (error) {

    console.error(
      "Profile creation error:",
      error
    );
  }
}


/* =========================================================
   LOAD OWN PROFILE
   ========================================================= */

async function loadOwnProfile() {

  const {
    data,
    error
  } = await db
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .single();

  if (error) {

    console.error(error);

    return;
  }

  state.profile = data;

  updateOwnProfileUI();
}


/* =========================================================
   OWN PROFILE UI
   ========================================================= */

function updateOwnProfileUI() {

  if (!state.profile) {
    return;
  }

  const name =
    state.profile.display_name ||
    "User";

  myDisplayName.textContent =
    name;

  profileName.value =
    name;

  renderAvatar(
    profileAvatar,
    state.profile.avatar_url,
    name
  );
}


/* =========================================================
   LOAD USERS
   ========================================================= */

async function loadUsers() {

  if (!state.user) {
    return;
  }

  usersList.innerHTML =
    `<div class="loading-state">
      Loading people...
    </div>`;

  try {

    const {
      data,
      error
    } = await db
      .from("profiles")
      .select("*")
      .neq("id", state.user.id)
      .order("display_name", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    const profiles =
      data || [];

    const enrichedUsers = [];

    for (const profile of profiles) {

      const latest =
        await getLatestMessage(
          profile.id
        );

      const unread =
        await getUnreadCount(
          profile.id
        );

      enrichedUsers.push({
        ...profile,
        latestMessage:
          latest,
        unreadCount:
          unread
      });
    }

    state.users =
      enrichedUsers;

    sortUsers();

    renderUsers();

  } catch (error) {

    console.error(error);

    usersList.innerHTML =
      `<div class="empty-state">
        Unable to load users.
      </div>`;
  }
}


/* =========================================================
   LATEST MESSAGE
   ========================================================= */

async function getLatestMessage(
  otherUserId
) {

  const {
    data,
    error
  } = await db
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${state.user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${state.user.id})`
    )
    .order("created_at", {
      ascending: false
    })
    .limit(1)
    .maybeSingle();

  if (error) {

    console.error(
      "Latest message error:",
      error
    );

    return null;
  }

  return data;
}


/* =========================================================
   UNREAD COUNT
   ========================================================= */

async function getUnreadCount(
  otherUserId
) {

  const {
    count,
    error
  } = await db
    .from("messages")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    )
    .eq(
      "sender_id",
      otherUserId
    )
    .eq(
      "receiver_id",
      state.user.id
    )
    .is(
      "read_at",
      null
    );

  if (error) {

    console.error(
      "Unread count error:",
      error
    );

    return 0;
  }

  return count || 0;
}


/* =========================================================
   SORT USERS
   ========================================================= */

function sortUsers() {

  state.users.sort(
    (a, b) => {

      const dateA =
        a.latestMessage
          ? new Date(
              a.latestMessage.created_at
            ).getTime()
          : 0;

      const dateB =
        b.latestMessage
          ? new Date(
              b.latestMessage.created_at
            ).getTime()
          : 0;

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      return (
        a.display_name || ""
      ).localeCompare(
        b.display_name || ""
      );
    }
  );
}


/* =========================================================
   RENDER USERS
   ========================================================= */

function renderUsers() {

  const search =
    userSearch.value
      .trim()
      .toLowerCase();

  state.filteredUsers =
    state.users.filter(
      (user) =>
        !search ||
        (
          user.display_name || ""
        )
          .toLowerCase()
          .includes(search)
    );


  if (
    state.filteredUsers.length === 0
  ) {

    usersList.innerHTML =
      `<div class="empty-state">
        No people found.
      </div>`;

    return;
  }


  usersList.innerHTML = "";


  state.filteredUsers.forEach(
    (user) => {

      const item =
        document.createElement(
          "button"
        );

      item.type = "button";

      item.className =
        "user-item";

      if (
        state.selectedUser &&
        state.selectedUser.id === user.id
      ) {

        item.classList.add(
          "active"
        );
      }


      const avatar =
        document.createElement(
          "div"
        );

      avatar.className =
        "avatar";


      renderAvatar(
        avatar,
        user.avatar_url,
        user.display_name
      );


      if (
        isUserOnline(user)
      ) {

        const online =
          document.createElement(
            "span"
          );

        online.className =
          "avatar-online";

        avatar.appendChild(
          online
        );
      }


      const main =
        document.createElement(
          "div"
        );

      main.className =
        "user-main";


      const nameRow =
        document.createElement(
          "div"
        );

      nameRow.className =
        "user-name-row";


      const name =
        document.createElement(
          "span"
        );

      name.className =
        "user-name";

      name.textContent =
        user.display_name ||
        "User";


      const time =
        document.createElement(
          "span"
        );

      time.className =
        "user-time";

      if (user.latestMessage) {

        time.textContent =
          formatMessageTime(
            user.latestMessage.created_at
          );
      }


      nameRow.appendChild(
        name
      );

      nameRow.appendChild(
        time
      );


      const previewRow =
        document.createElement(
          "div"
        );

      previewRow.className =
        "user-preview-row";


      const preview =
        document.createElement(
          "span"
        );

      preview.className =
        "user-preview";

      preview.textContent =
        getMessagePreview(
          user.latestMessage
        );


      previewRow.appendChild(
        preview
      );


      if (
        user.unreadCount > 0
      ) {

        const badge =
          document.createElement(
            "span"
          );

        badge.className =
          "unread-badge";

        badge.textContent =
          user.unreadCount > 99
            ? "99+"
            : user.unreadCount;

        previewRow.appendChild(
          badge
        );
      }


      main.appendChild(
        nameRow
      );

      main.appendChild(
        previewRow
      );


      item.appendChild(
        avatar
      );

      item.appendChild(
        main
      );


      item.addEventListener(
        "click",
        () => openChat(user)
      );


      usersList.appendChild(
        item
      );
    }
  );
}


/* =========================================================
   SEARCH
   ========================================================= */

function handleUserSearch() {

  renderUsers();
}


/* =========================================================
   OPEN CHAT
   ========================================================= */

async function openChat(user) {

  state.selectedUser =
    user;

  renderUsers();

  updateChatHeader();

  messagesContainer.innerHTML =
    `<div class="loading-state">
      Loading messages...
    </div>`;

  messageInput.disabled = false;
  sendButton.disabled = true;

  mainLayout.classList.add(
    "chat-open"
  );

  closeSettings();

  await loadMessages();

  await markMessagesAsRead();

  /*
    Refresh unread badge after
    marking messages as read.
  */

  await refreshSelectedUser();

  renderUsers();

  messageInput.focus();
}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages() {

  if (
    !state.selectedUser ||
    !state.user
  ) {
    return;
  }

  state.loadingMessages = true;

  try {

    const myId =
      state.user.id;

    const otherId =
      state.selectedUser.id;

    // Get my personal clear time for this chat
    const {
      data: clearData,
      error: clearError
    } = await db
      .from("chat_clears")
      .select("cleared_at")
      .eq("user_id", myId)
      .eq("other_user_id", otherId)
      .maybeSingle();

    if (clearError) {
      throw clearError;
    }

    const clearedAt =
      clearData?.cleared_at || null;

    // Load conversation messages
    let query = db
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order("created_at", {
        ascending: true
      });

    // If I cleared this chat,
    // only show messages created after my clear time
    if (clearedAt) {

      query = query.gt(
        "created_at",
        clearedAt
      );
    }

    const {
      data,
      error
    } = await query;

    if (error) {
      throw error;
    }

    state.messages =
      data || [];

    renderMessages();

  } catch (error) {

    console.error(
      "Load messages error:",
      error
    );

    messagesContainer.innerHTML =
      `<div class="empty-state">
        Unable to load messages.
      </div>`;

  } finally {

    state.loadingMessages = false;
  }
}

/* =========================================================
   RENDER MESSAGES
   ========================================================= */

function renderMessages() {

  messagesContainer.innerHTML = "";

  if (state.messages.length === 0) {

    const empty =
      document.createElement("div");

    empty.className =
      "empty-chat";

    empty.innerHTML = `
      <div class="empty-chat-icon">
        🔒
      </div>

      <h3>
        This is our private space
      </h3>

      <p>
        Just you and me. Keep it private.
      </p>
    `;

    messagesContainer.appendChild(empty);

    return;
  }

  state.messages.forEach((message) => {

    const mine =
      message.sender_id === state.user.id;

    const wrapper =
      document.createElement("div");

    wrapper.className =
      `message ${mine ? "mine" : "theirs"}`;


    /* MESSAGE CONTENT */

    if (message.message_type === "image") {

      renderImageMessage(
        wrapper,
        message
      );

    } else if (message.message_type === "video") {

      renderVideoMessage(
        wrapper,
        message
      );

    } else {

      renderTextMessage(
        wrapper,
        message
      );
    }


    /* MESSAGE META */

    const meta =
      document.createElement("div");

    meta.className =
      "message-meta";


    /* TIME */

    const time =
      document.createElement("span");

    time.className =
      "message-time";

    time.textContent =
      formatMessageTime(
        message.created_at
      );

    meta.appendChild(time);


    /* SENT / SEEN */

    if (mine) {

      const status =
        document.createElement("span");

      status.className =
        "message-status";

      if (message.read_at) {

        status.textContent =
          "Seen";

        status.classList.add(
          "seen"
        );

      } else {

        status.textContent =
          "Sent";
      }

      meta.appendChild(status);
    }


    wrapper.appendChild(meta);

    messagesContainer.appendChild(wrapper);
  });


  requestAnimationFrame(
    scrollMessagesToBottom
  );
}


/* =========================================================
   TEXT MESSAGE
   ========================================================= */

function renderTextMessage(
  wrapper,
  message
) {

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "message-bubble";

  bubble.textContent =
    message.content || "";

  wrapper.appendChild(
    bubble
  );
}


/* =========================================================
   IMAGE MESSAGE
   ========================================================= */

function renderImageMessage(
  wrapper,
  message
) {

  const media =
    document.createElement(
      "div"
    );

  media.className =
    "message-media";


  const image =
    document.createElement(
      "img"
    );

  image.src =
    message.file_url;

  image.alt =
    message.file_name ||
    "Photo";

  image.loading =
    "lazy";


  image.addEventListener(
    "click",
    () => {

      window.open(
        message.file_url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  );


  media.appendChild(
    image
  );


  if (message.file_name) {

    const filename =
      document.createElement(
        "div"
      );

    filename.className =
      "message-file-name";

    filename.textContent =
      message.file_name;

    media.appendChild(
      filename
    );
  }


  wrapper.appendChild(
    media
  );
}


/* =========================================================
   VIDEO MESSAGE
   ========================================================= */

function renderVideoMessage(
  wrapper,
  message
) {

  const media =
    document.createElement(
      "div"
    );

  media.className =
    "message-media";


  const video =
    document.createElement(
      "video"
    );

  video.src =
    message.file_url;

  video.controls = true;

  video.playsInline = true;

  video.preload =
    "metadata";


  media.appendChild(
    video
  );


  if (message.file_name) {

    const filename =
      document.createElement(
        "div"
      );

    filename.className =
      "message-file-name";

    filename.textContent =
      message.file_name;

    media.appendChild(
      filename
    );
  }


  wrapper.appendChild(
    media
  );
}


/* =========================================================
   SEND TEXT MESSAGE
   ========================================================= */

async function sendTextMessage(
  event
) {

  event.preventDefault();

  if (
    !state.user ||
    !state.selectedUser ||
    state.sendingMessage
  ) {
    return;
  }

  const content =
    messageInput.value.trim();

  if (!content) {
    return;
  }

  state.sendingMessage = true;

  sendButton.disabled = true;


  try {

    const {
      error
    } = await db
      .from("messages")
      .insert({
        sender_id:
          state.user.id,

        receiver_id:
          state.selectedUser.id,

        content,

        message_type:
          "text"
      });

    if (error) {
      throw error;
    }

    messageInput.value = "";

  } catch (error) {

    console.error(error);

    showUploadStatus(
      error.message ||
      "Message could not be sent."
    );

  } finally {

    state.sendingMessage =
      false;

    updateSendButton();
  }
}


/* =========================================================
   UPDATE SEND BUTTON
   ========================================================= */

function updateSendButton() {

  sendButton.disabled =
    !state.selectedUser ||
    !messageInput.value.trim() ||
    state.sendingMessage;
}


/* =========================================================
   MEDIA UPLOAD
   ========================================================= */

async function handleMediaUpload() {

  const files =
    Array.from(
      mediaInput.files || []
    );

  if (
    files.length === 0 ||
    !state.user ||
    !state.selectedUser
  ) {
    return;
  }


  for (const file of files) {

    await uploadMediaFile(
      file
    );
  }


  mediaInput.value = "";

  await loadMessages();

  await loadUsers();
}


/* =========================================================
   UPLOAD MEDIA FILE
   ========================================================= */

async function uploadMediaFile(
  file
) {

  if (
    !file.type.match(
      /^(image|video)\//
    )
  ) {

    showUploadStatus(
      "Only photos and videos are allowed."
    );

    return;
  }


  const isImage =
    file.type.startsWith(
      "image/"
    );

  const maxSize =
    isImage
      ? 10 * 1024 * 1024
      : 50 * 1024 * 1024;


  if (
    file.size > maxSize
  ) {

    showUploadStatus(
      isImage
        ? "Image must be 10 MB or smaller."
        : "Video must be 50 MB or smaller."
    );

    return;
  }


  try {

    showUploadStatus(
      `Uploading ${file.name}...`
    );


    const extension =
      getFileExtension(
        file.name
      );


    const safeName =
      sanitizeFileName(
        file.name
      );


    const uniqueName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}-${safeName}`;


    const path =
      `media/${state.user.id}/${uniqueName}`;


    const {
      error: uploadError
    } = await db.storage
      .from("chat-files")
      .upload(
        path,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        }
      );


    if (uploadError) {
      throw uploadError;
    }


    const {
      data: publicData
    } = db.storage
      .from("chat-files")
      .getPublicUrl(
        path
      );


    const publicUrl =
      publicData.publicUrl;


    const {
      error: messageError
    } = await db
      .from("messages")
      .insert({

        sender_id:
          state.user.id,

        receiver_id:
          state.selectedUser.id,

        content: "",

        message_type:
          isImage
            ? "image"
            : "video",

        file_url:
          publicUrl,

        file_name:
          file.name,

        file_size:
          file.size
      });


    if (messageError) {
      throw messageError;
    }


    showUploadStatus(
      "Sent successfully."
    );


    setTimeout(
      () => {
        clearUploadStatus();
      },
      1500
    );


  } catch (error) {

    console.error(error);

    showUploadStatus(
      error.message ||
      "Upload failed."
    );
  }
}


/* =========================================================
   MARK MESSAGES AS READ
   ========================================================= */

async function markMessagesAsRead() {

  if (
    !state.user ||
    !state.selectedUser
  ) {
    return;
  }


  const {
    error
  } = await db
    .from("messages")
    .update({
      read_at:
        new Date().toISOString()
    })
    .eq(
      "sender_id",
      state.selectedUser.id
    )
    .eq(
      "receiver_id",
      state.user.id
    )
    .is(
      "read_at",
      null
    );


  if (error) {

    console.error(
      "Read update error:",
      error
    );
  }
}


/* =========================================================
   REFRESH SELECTED USER
   ========================================================= */

async function refreshSelectedUser() {

  if (!state.selectedUser) {
    return;
  }

  const updated =
    await db
      .from("profiles")
      .select("*")
      .eq(
        "id",
        state.selectedUser.id
      )
      .single();


  if (!updated.error) {

    state.selectedUser =
      {
        ...state.selectedUser,
        ...updated.data
      };
  }
}


/* =========================================================
   CHAT HEADER
   ========================================================= */

function updateChatHeader() {

  if (!state.selectedUser) {

    chatUserName.textContent =
      "Select a person";

    chatUserStatus.textContent =
      "Choose someone to start chatting";

    renderAvatar(
      chatAvatar,
      null,
      "?"
    );

    return;
  }


  chatUserName.textContent =
    state.selectedUser.display_name ||
    "User";


  chatUserStatus.textContent =
    getUserStatusText(
      state.selectedUser
    );


  renderAvatar(
    chatAvatar,
    state.selectedUser.avatar_url,
    state.selectedUser.display_name
  );
}


/* =========================================================
   ONLINE STATUS
   ========================================================= */

async function setOwnOnlineStatus(
  online,
  explicitLogout = false
) {

  if (!state.user) {
    return;
  }


  const enabled =
    online &&
    state.onlineStatusEnabled;


  const update = {
    is_online: enabled,

    last_seen:
      new Date().toISOString()
  };


  /*
   * ONLY an actual Logout button press
   * should update last_logout_at.
   */

  if (explicitLogout) {

    update.last_logout_at =
      new Date().toISOString();
  }


  const {
    error
  } = await db
    .from("profiles")
    .update(update)
    .eq(
      "id",
      state.user.id
    );


  if (error) {

    console.error(
      "Online status error:",
      error
    );
  }
}


/* =========================================================
   HEARTBEAT
   ========================================================= */

function startHeartbeat() {

  stopHeartbeat();


  /*
    Every 25 seconds we update last_seen.

    The UI considers a user online only if
    the heartbeat is recent.
  */

  state.heartbeatTimer =
    setInterval(
      async () => {

        if (
          !state.user ||
          !state.onlineStatusEnabled
        ) {
          return;
        }


        const {
          error
        } = await db
          .from("profiles")
          .update({
            is_online: true,
            last_seen:
              new Date().toISOString()
          })
          .eq(
            "id",
            state.user.id
          );


        if (error) {
          console.error(
            "Heartbeat error:",
            error
          );
        }

      },
      25000
    );
}


/* =========================================================
   STOP HEARTBEAT
   ========================================================= */

function stopHeartbeat() {

  if (
    state.heartbeatTimer
  ) {

    clearInterval(
      state.heartbeatTimer
    );

    state.heartbeatTimer =
      null;
  }
}


/* =========================================================
   DETERMINE ONLINE
   ========================================================= */

function isUserOnline(
  user
) {

  if (
    !user ||
    !user.is_online ||
    !user.last_seen
  ) {
    return false;
  }


  const lastSeen =
    new Date(
      user.last_seen
    ).getTime();


  const now =
    Date.now();


  /*
    70 seconds gives some tolerance
    for network delay.
  */

  return (
    now - lastSeen <
    70000
  );
}


/* =========================================================
   USER STATUS TEXT
   ========================================================= */

function getUserStatusText(
  user
) {

  if (
    isUserOnline(user)
  ) {

    return "Online";
  }


  /*
    If the profile has a recent explicit
    logout timestamp, we can identify
    that the user actually used Logout.

    Browser/device crashes cannot be
    identified as an explicit logout.
  */

  if (
    user.last_logout_at
  ) {

    const logoutTime =
      new Date(
        user.last_logout_at
      ).getTime();


    const lastSeen =
      user.last_seen
        ? new Date(
            user.last_seen
          ).getTime()
        : 0;


    if (
      logoutTime >= lastSeen
    ) {

      return "Logged out";
    }
  }


  if (user.last_seen) {

    return (
      "Last seen " +
      formatLastSeen(
        user.last_seen
      )
    );
  }


  return "Offline";
}


/* =========================================================
   FORMAT LAST SEEN
   ========================================================= */

function formatLastSeen(
  dateString
) {

  const date =
    new Date(dateString);

  const now =
    new Date();

  const diff =
    now.getTime() -
    date.getTime();


  const seconds =
    Math.floor(
      diff / 1000
    );


  if (seconds < 60) {
    return "just now";
  }


  const minutes =
    Math.floor(
      seconds / 60
    );


  if (minutes < 60) {
    return `${minutes}m ago`;
  }


  const hours =
    Math.floor(
      minutes / 60
    );


  if (hours < 24) {
    return `${hours}h ago`;
  }


  const days =
    Math.floor(
      hours / 24
    );


  if (days < 7) {
    return `${days}d ago`;
  }


  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short"
    }
  );
}


/* =========================================================
   REALTIME
   ========================================================= */

function subscribeToRealtime() {

  removeRealtimeChannels();


  /*
   * MESSAGE REALTIME
   */

  const messageChannel =
    db.channel(
      "chats-messages"
    );


  messageChannel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages"
      },
      async (payload) => {

        await handleRealtimeMessage(
          payload
        );
      }
    )
    .subscribe(
      (status) => {

        if (
          status ===
          "SUBSCRIBED"
        ) {

          connectionStatus.textContent =
            "Connected";

          connectionStatus.classList.add(
            "online"
          );
        }


        if (
          status ===
          "CHANNEL_ERROR"
        ) {

          connectionStatus.textContent =
            "Connection error";

          connectionStatus.classList.remove(
            "online"
          );
        }
      }
    );


  /*
   * PROFILE REALTIME
   */

  const profileChannel =
    db.channel(
      "chats-profiles"
    );


  profileChannel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles"
      },
      async (payload) => {

        /*
         * Check whether another user
         * actually logged out.
         */

        if (
          payload.eventType ===
          "UPDATE"
        ) {

          const oldProfile =
            payload.old;

          const newProfile =
            payload.new;


          /*
           * Only show the logout alert
           * for the person currently
           * open in the chat.
           */

          if (
            state.selectedUser &&
            newProfile &&
            newProfile.id ===
              state.selectedUser.id
          ) {

            const oldLogout =
              oldProfile?.last_logout_at ||
              null;

            const newLogout =
              newProfile?.last_logout_at ||
              null;


            /*
             * last_logout_at changed
             * = real Logout button press.
             */

            if (
              newLogout &&
              newLogout !== oldLogout
            ) {

              showLogoutChatAlert(
                newProfile.display_name ||
                "User"
              );
            }
          }
        }


        /*
         * Refresh users and current
         * chat user information.
         */

        await loadUsers();


        if (
          state.selectedUser
        ) {

          await refreshSelectedUser();

          updateChatHeader();
        }
      }
    )
    .subscribe();


  state.channels = [
    messageChannel,
    profileChannel
  ];
}


/* =========================================================
   REALTIME MESSAGE HANDLER
   ========================================================= */

async function handleRealtimeMessage(
  payload
) {

  const message =
    payload.new ||
    payload.old;


  if (!message) {
    return;
  }


  const isMine =
    message.sender_id ===
    state.user?.id;


  const isForMe =
    message.receiver_id ===
    state.user?.id;


  if (
    !isMine &&
    !isForMe
  ) {
    return;
  }


  /*
    New message
  */

  if (
    payload.eventType ===
    "INSERT"
  ) {

    if (
      state.selectedUser &&
      (
        (
          message.sender_id ===
          state.selectedUser.id &&
          message.receiver_id ===
          state.user.id
        ) ||
        (
          message.sender_id ===
          state.user.id &&
          message.receiver_id ===
          state.selectedUser.id
        )
      )
    ) {

      /*
        Avoid duplicate messages.
      */

      const exists =
        state.messages.some(
          (item) =>
            item.id ===
            message.id
        );


      if (!exists) {

        state.messages.push(
          message
        );

        renderMessages();
      }


      /*
        Automatically mark received
        messages as read if chat is open.
      */

      if (
        message.sender_id ===
        state.selectedUser.id
      ) {

        await markMessagesAsRead();
      }
    }


    /*
      Notification for incoming
      message when chat is not active.
    */

    if (
      !isMine &&
      message.sender_id !==
      state.selectedUser?.id
    ) {

      await sendBrowserNotification(
        message
      );
    }
  }


  /*
    Message updated
  */

  if (
    payload.eventType ===
    "UPDATE"
  ) {

    const index =
      state.messages.findIndex(
        (item) =>
          item.id ===
          message.id
      );


    if (index !== -1) {

      state.messages[index] =
        message;

      renderMessages();
    }
  }


  /*
    Message deleted
  */

  if (
    payload.eventType ===
    "DELETE"
  ) {

    state.messages =
      state.messages.filter(
        (item) =>
          item.id !==
          message.id
      );

    renderMessages();
  }


  /*
    Refresh home screen.
  */

  await loadUsers();
}


/* =========================================================
   REMOVE REALTIME CHANNELS
   ========================================================= */

function removeRealtimeChannels() {

  if (
    !db ||
    !state.channels.length
  ) {
    return;
  }


  state.channels.forEach(
    (channel) => {

      try {

        db.removeChannel(
          channel
        );

      } catch (error) {

        console.error(
          error
        );
      }
    }
  );


  state.channels = [];
}


/* =========================================================
   BROWSER NOTIFICATIONS
   ========================================================= */

async function handleNotificationToggle() {

  const enabled =
    notificationToggle.checked;


  state.notificationEnabled =
    enabled;


  localStorage.setItem(
    "chats_notifications",
    enabled
      ? "true"
      : "false"
  );


  if (
    enabled &&
    "Notification" in window
  ) {

    if (
      Notification.permission ===
      "default"
    ) {

      const permission =
        await Notification.requestPermission();


      if (
        permission !==
        "granted"
      ) {

        notificationToggle.checked =
          false;

        state.notificationEnabled =
          false;

        localStorage.setItem(
          "chats_notifications",
          "false"
        );

        showSettingsMessage(
          "Notification permission was not granted.",
          "error"
        );

        return;
      }
    }


    if (
      Notification.permission !==
      "granted"
    ) {

      notificationToggle.checked =
        false;

      state.notificationEnabled =
        false;

      showSettingsMessage(
        "Browser notifications are blocked.",
        "error"
      );

      return;
    }


    showSettingsMessage(
      "Notifications enabled.",
      "success"
    );

  } else {

    showSettingsMessage(
      "Notifications disabled.",
      "success"
    );
  }
}


/* =========================================================
   SEND BROWSER NOTIFICATION
   ========================================================= */

async function sendBrowserNotification(
  message
) {

  if (
    !state.notificationEnabled ||
    !("Notification" in window)
  ) {
    return;
  }


  if (
    Notification.permission !==
    "granted"
  ) {
    return;
  }


  /*
    Do not notify if the current
    chat is already open.
  */

  if (
    state.selectedUser &&
    message.sender_id ===
    state.selectedUser.id &&
    document.visibilityState ===
    "visible"
  ) {

    return;
  }


  const sender =
    state.users.find(
      (user) =>
        user.id ===
        message.sender_id
    );


  const senderName =
    sender?.display_name ||
    "New message";


  let body =
    message.content ||
    "Sent you a message";


  if (
    message.message_type ===
    "image"
  ) {

    body = "📷 Sent a photo";

  } else if (
    message.message_type ===
    "video"
  ) {

    body = "🎥 Sent a video";
  }


  try {

    new Notification(
      senderName,
      {
        body,
        tag:
          `chats-${message.sender_id}`
      }
    );

  } catch (error) {

    console.error(
      "Notification error:",
      error
    );
  }
}


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {

  settingsPanel.classList.remove(
    "hidden"
  );

  loadSettings();

  closeChatMenu();
}


function closeSettings() {

  settingsPanel.classList.add(
    "hidden"
  );
}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

function loadSettings() {

  const notifications =
    localStorage.getItem(
      "chats_notifications"
    );


  state.notificationEnabled =
    notifications === "true";


  notificationToggle.checked =
    state.notificationEnabled;


  const online =
    localStorage.getItem(
      "chats_online_status"
    );


  state.onlineStatusEnabled =
    online !== "false";


  onlineStatusToggle.checked =
    state.onlineStatusEnabled;


  if (state.profile) {

    profileName.value =
      state.profile.display_name ||
      "";

    renderAvatar(
      profileAvatar,
      state.profile.avatar_url,
      state.profile.display_name
    );
  }


  loadSavedThemeToSelect();
}


/* =========================================================
   SAVE PROFILE
   ========================================================= */

async function saveProfile() {

  if (!state.user) {
    return;
  }


  const name =
    profileName.value.trim();


  if (!name) {

    showSettingsMessage(
      "Enter a display name.",
      "error"
    );

    return;
  }


  if (name.length > 40) {

    showSettingsMessage(
      "Name must be 40 characters or less.",
      "error"
    );

    return;
  }


  saveProfileButton.disabled =
    true;


  try {

    const {
      data,
      error
    } = await db
      .from("profiles")
      .update({
        display_name: name
      })
      .eq(
        "id",
        state.user.id
      )
      .select()
      .single();


    if (error) {
      throw error;
    }


    state.profile =
      data;


    updateOwnProfileUI();

    await loadUsers();


    if (state.selectedUser) {

      updateChatHeader();
    }


    showSettingsMessage(
      "Profile updated.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showSettingsMessage(
      error.message ||
      "Could not update profile.",
      "error"
    );

  } finally {

    saveProfileButton.disabled =
      false;
  }
}


/* =========================================================
   PROFILE PICTURE
   ========================================================= */

async function handleProfilePicture() {

  const file =
    profilePictureInput.files?.[0];


  if (
    !file ||
    !state.user
  ) {
    return;
  }


  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    showSettingsMessage(
      "Please choose an image.",
      "error"
    );

    return;
  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    showSettingsMessage(
      "Profile picture must be 5 MB or smaller.",
      "error"
    );

    return;
  }


  try {

    showSettingsMessage(
      "Uploading picture...",
      ""
    );


    const extension =
      getFileExtension(
        file.name
      );


    const path =
      `avatars/${state.user.id}-${Date.now()}.${extension}`;


    const {
      error: uploadError
    } = await db.storage
      .from("chat-files")
      .upload(
        path,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        }
      );


    if (uploadError) {
      throw uploadError;
    }


    const {
      data
    } = db.storage
      .from("chat-files")
      .getPublicUrl(
        path
      );


    const avatarUrl =
      data.publicUrl;


    const {
      data: updated,
      error
    } = await db
      .from("profiles")
      .update({
        avatar_url:
          avatarUrl
      })
      .eq(
        "id",
        state.user.id
      )
      .select()
      .single();


    if (error) {
      throw error;
    }


    state.profile =
      updated;


    updateOwnProfileUI();

    await loadUsers();


    showSettingsMessage(
      "Profile picture updated.",
      "success"
    );


  } catch (error) {

    console.error(error);

    showSettingsMessage(
      error.message ||
      "Could not upload profile picture.",
      "error"
    );

  } finally {

    profilePictureInput.value = "";
  }
}


/* =========================================================
   REMOVE PROFILE PICTURE
   ========================================================= */

async function removeProfilePicture() {

  if (!state.user) {
    return;
  }


  if (
    !state.profile?.avatar_url
  ) {

    showSettingsMessage(
      "No profile picture to remove.",
      "error"
    );

    return;
  }


  const confirmed =
    confirm(
      "Remove your profile picture?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } = await db
      .from("profiles")
      .update({
        avatar_url: null
      })
      .eq(
        "id",
        state.user.id
      );


    if (error) {
      throw error;
    }


    state.profile.avatar_url =
      null;


    updateOwnProfileUI();

    await loadUsers();


    showSettingsMessage(
      "Profile picture removed.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showSettingsMessage(
      error.message ||
      "Could not remove picture.",
      "error"
    );
  }
}


/* =========================================================
   ONLINE STATUS TOGGLE
   ========================================================= */

async function handleOnlineStatusToggle() {

  const enabled =
    onlineStatusToggle.checked;


  state.onlineStatusEnabled =
    enabled;


  localStorage.setItem(
    "chats_online_status",
    enabled
      ? "true"
      : "false"
  );


  await setOwnOnlineStatus(
    enabled
  );


  showSettingsMessage(
    enabled
      ? "Online status enabled."
      : "Online status hidden.",
    "success"
  );


  await loadUsers();
}


/* =========================================================
   THEME
   ========================================================= */

function handleThemeChange() {

  const theme =
    themeSelect.value;


  applyTheme(
    theme
  );


  localStorage.setItem(
    "chats_theme",
    theme
  );
}


function applyTheme(
  theme
) {

  document.body.classList.remove(
    "theme-light",
    "theme-blue",
    "theme-purple"
  );


  if (
    theme ===
    "light"
  ) {

    document.body.classList.add(
      "theme-light"
    );

  } else if (
    theme ===
    "blue"
  ) {

    document.body.classList.add(
      "theme-blue"
    );

  } else if (
    theme ===
    "purple"
  ) {

    document.body.classList.add(
      "theme-purple"
    );
  }
}


function loadSavedTheme() {

  const theme =
    localStorage.getItem(
      "chats_theme"
    ) ||
    "dark";


  applyTheme(
    theme
  );
}


function loadSavedThemeToSelect() {

  const theme =
    localStorage.getItem(
      "chats_theme"
    ) ||
    "dark";


  themeSelect.value =
    theme;
}


/* =========================================================
   CLEAR CHAT
   ========================================================= */

async function clearCurrentChat() {

  if (
    !state.user ||
    !state.selectedUser
  ) {
    return;
  }

  closeChatMenu();

  const confirmed =
    confirm(
      `Clear this chat for you?\n\nThe other person will still see their messages.`
    );

  if (!confirmed) {
    return;
  }

  try {

    showUploadStatus(
      "Clearing chat..."
    );

    const {
      error
    } = await db
      .from("chat_clears")
      .upsert(
        {
          user_id:
            state.user.id,

          other_user_id:
            state.selectedUser.id,

          cleared_at:
            new Date().toISOString()
        },
        {
          onConflict:
            "user_id,other_user_id"
        }
      );

    if (error) {
      throw error;
    }

    // Clear only my local screen
    state.messages = [];

    renderMessages();

    await loadUsers();

    showUploadStatus(
      "Chat cleared for you."
    );

    setTimeout(
      clearUploadStatus,
      1500
    );

  } catch (error) {

    console.error(
      "Clear chat error:",
      error
    );

    showUploadStatus(
      error.message ||
      "Could not clear chat."
    );
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  if (!state.user) {
    return;
  }


  const confirmed =
    confirm(
      "Are you sure you want to log out?"
    );


  if (!confirmed) {
    return;
  }


  logoutButton.disabled =
    true;


  try {

    /*
      Explicitly record logout.

      This lets other users know that
      this was an actual Logout action.
    */

    await db
      .from("profiles")
      .update({
        is_online: false,
        last_seen:
          new Date().toISOString(),
        last_logout_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        state.user.id
      );


    stopHeartbeat();

    removeRealtimeChannels();


    const {
      error
    } = await db.auth.signOut();


    if (error) {
      throw error;
    }


  } catch (error) {

    console.error(error);

    showSettingsMessage(
      error.message ||
      "Could not log out.",
      "error"
    );

  } finally {

    logoutButton.disabled =
      false;
  }
}


/* =========================================================
   RESET APPLICATION
   ========================================================= */

function resetApplication() {

  stopHeartbeat();

  removeRealtimeChannels();


  state.user = null;
  state.profile = null;

  state.selectedUser = null;

  state.users = [];
  state.filteredUsers = [];

  state.messages = [];

  state.initialized = false;


  mainLayout.classList.remove(
    "chat-open"
  );


  closeSettings();

  closeChatMenu();


  showAuth();
}


/* =========================================================
   SHOW AUTH
   ========================================================= */

function showAuth() {

  authScreen.classList.remove(
    "hidden"
  );

  appScreen.classList.add(
    "hidden"
  );
}


/* =========================================================
   SHOW APP
   ========================================================= */

function showApp() {

  authScreen.classList.add(
    "hidden"
  );

  appScreen.classList.remove(
    "hidden"
  );
}


/* =========================================================
   MOBILE CHAT
   ========================================================= */

function closeMobileChat() {

  mainLayout.classList.remove(
    "chat-open"
  );

  state.selectedUser =
    null;

  messageInput.value = "";

  messageInput.disabled =
    true;

  sendButton.disabled =
    true;

  updateChatHeader();

  renderUsers();
}


/* =========================================================
   CHAT MENU
   ========================================================= */

function toggleChatMenu() {

  chatMenu.classList.toggle(
    "hidden"
  );

  chatMenuButton.setAttribute(
    "aria-expanded",
    String(
      !chatMenu.classList.contains(
        "hidden"
      )
    )
  );
}


function closeChatMenu() {

  chatMenu.classList.add(
    "hidden"
  );

  chatMenuButton.setAttribute(
    "aria-expanded",
    "false"
  );
}


/* =========================================================
   SCROLL MESSAGES
   ========================================================= */

function scrollMessagesToBottom() {

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


/* =========================================================
   AVATAR RENDERER
   ========================================================= */

function renderAvatar(
  element,
  imageUrl,
  name
) {

  element.innerHTML = "";


  if (imageUrl) {

    const image =
      document.createElement(
        "img"
      );

    image.src =
      imageUrl;

    image.alt =
      name || "Profile picture";


    image.onerror = () => {

      element.innerHTML =
        "";

      element.textContent =
        getInitial(
          name
        );
    };


    element.appendChild(
      image
    );

  } else {

    element.textContent =
      getInitial(
        name
      );
  }
}


/* =========================================================
   INITIAL
   ========================================================= */

function getInitial(
  name
) {

  if (!name) {
    return "?";
  }

  return name
    .trim()
    .charAt(0)
    .toUpperCase();
}


/* =========================================================
   MESSAGE PREVIEW
   ========================================================= */

function getMessagePreview(
  message
) {

  if (!message) {
    return "No messages yet";
  }


  if (
    message.message_type ===
    "image"
  ) {

    return "📷 Photo";
  }


  if (
    message.message_type ===
    "video"
  ) {

    return "🎥 Video";
  }


  if (
    message.content
  ) {

    return message.content;
  }


  return "Message";
}


/* =========================================================
   MESSAGE TIME
   ========================================================= */

function formatMessageTime(
  dateString
) {

  if (!dateString) {
    return "";
  }


  const date =
    new Date(dateString);


  return date.toLocaleTimeString(
    [],
    {
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


/* =========================================================
   FILE HELPERS
   ========================================================= */

function getFileExtension(
  filename
) {

  const parts =
    filename.split(".");


  return (
    parts.length > 1
      ? parts.pop()
      : "file"
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}


function sanitizeFileName(
  filename
) {

  return filename
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .substring(
      0,
      100
    );
}


/* =========================================================
   UPLOAD STATUS
   ========================================================= */

function showUploadStatus(
  text
) {

  uploadStatus.textContent =
    text;
}


function clearUploadStatus() {

  uploadStatus.textContent =
    "";
}


/* =========================================================
   AUTH MESSAGE
   ========================================================= */

function showAuthMessage(
  text,
  type = ""
) {

  authMessage.textContent =
    text;

  authMessage.className =
    "message-area";

  if (type) {

    authMessage.classList.add(
      type
    );
  }
}


function clearAuthMessage() {

  authMessage.textContent =
    "";

  authMessage.className =
    "message-area";
}


/* =========================================================
   SETTINGS MESSAGE
   ========================================================= */

function showSettingsMessage(
  text,
  type = ""
) {

  settingsMessage.textContent =
    text;

  settingsMessage.className =
    "message-area";

  if (type) {

    settingsMessage.classList.add(
      type
    );
  }


  if (text) {

    setTimeout(
      () => {

        settingsMessage.textContent =
          "";

        settingsMessage.className =
          "message-area";

      },
      3500
    );
  }
}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setButtonLoading(
  button,
  loading,
  text
) {

  button.disabled =
    loading;

  button.textContent =
    text;
}


/* =========================================================
   FRIENDLY AUTH ERRORS
   ========================================================= */

function getFriendlyAuthError(
  error
) {

  const message =
    error?.message ||
    "Something went wrong.";


  const lower =
    message.toLowerCase();


  if (
    lower.includes(
      "invalid login credentials"
    )
  ) {

    return "Incorrect email or password.";
  }


  if (
    lower.includes(
      "email not confirmed"
    )
  ) {

    return "Please verify your email before logging in.";
  }


  if (
    lower.includes(
      "user already registered"
    )
  ) {

    return "An account with this email already exists.";
  }


  if (
    lower.includes(
      "password should be at least"
    )
  ) {

    return "Password must contain at least 6 characters.";
  }


  return message;
}


/* =========================================================
   BEFORE UNLOAD
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    /*
      Best-effort offline update.

      Browsers do not guarantee that asynchronous
      database requests finish when a page closes,
      so the heartbeat is still used to determine
      stale/offline users.
    */

    if (
      !state.user ||
      !state.onlineStatusEnabled ||
      !db
    ) {
      return;
    }


    db
      .from("profiles")
      .update({
        is_online: false,
        last_seen:
          new Date().toISOString()
      })
      .eq(
        "id",
        state.user.id
      );
  }
);


/* =========================================================
   VISIBILITY CHANGE
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      if (
        state.user &&
        state.onlineStatusEnabled
      ) {

        await setOwnOnlineStatus(
          true
        );
      }


      if (
        state.selectedUser
      ) {

        await markMessagesAsRead();
      }
    }
  }
);





function showLogoutChatAlert(
  userName
) {

  if (
    !messagesContainer
  ) {
    return;
  }


  const alert =
    document.createElement(
      "div"
    );

  alert.className =
    "chat-system-alert";


  alert.innerHTML = `
    <span class="chat-system-alert-icon">
      🔔
    </span>

    <span>
      ${escapeHtml(userName)}
      logged out
    </span>
  `;


  messagesContainer.appendChild(
    alert
  );


  requestAnimationFrame(
    () => {

      alert.classList.add(
        "show"
      );
    }
  );


  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}



function escapeHtml(
  value
) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    value || "";

  return div.innerHTML;
}
