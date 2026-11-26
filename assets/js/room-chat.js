/* Authenticated public rooms and live room chat. */
window.MOVIES_ROOM_BACKEND = true;
(() => {
  const config = window.MOVIES_SUPABASE_CONFIG;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = (id) => document.getElementById(id);
  const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const roomForm = $("create-room-form");
  const joinForm = $("join-room-form");
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const getUser = async () => {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (data.user) return data.user;
    const { data: guestData, error: guestError } = await client.auth.signInAnonymously({
      options: { data: { display_name: "Guest" } }
    });
    if (guestError) throw new Error("Guest entry is not enabled yet. The site administrator must enable Anonymous Sign-Ins in Supabase.");
    return guestData.user;
  };

  if (roomForm) {
    const filmSelect = $("new-room-film");
    const feedback = $("create-room-feedback");
    const openLink = $("open-created-room");
    const copyButton = $("copy-created-code");
    let latestInvite = "";
    const loadFilms = async () => {
      const { data, error } = await client.from("films").select("id,title").eq("published", true).order("title");
      if (error) { feedback.textContent = "Published films could not be loaded. You can still create a room without a film."; return; }
      filmSelect.replaceChildren(new Option("No film selected", ""));
      (data || []).forEach((film) => filmSelect.add(new Option(film.title, film.id)));
    };
    loadFilms();

    roomForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = roomForm.querySelector('button[type="submit"]');
      button.disabled = true;
      feedback.textContent = "Creating your public room…";
      try {
        const user = await getUser();
        const name = $("new-room-name").value.trim();
        if (name.length < 2) throw new Error("Enter a room name with at least 2 characters.");
        const filmId = filmSelect.value || null;
        const maxMembers = Number($("new-room-limit")?.value || 20);
        const { data, error } = await client.from("rooms")
          .insert({ host_id: user.id, name, visibility: "public", film_id: filmId, max_members: maxMembers })
          .select("id,name,film_id").single();
        if (error) throw error;
        latestInvite = new URL("watch.html?room=" + data.id + (data.film_id ? "&film=" + data.film_id : ""), window.location.href).href;
        openLink.href = latestInvite;
        openLink.hidden = false;
        copyButton.hidden = false;
        feedback.textContent = "Public room created. Anyone with the link can join until the room is full.";
      } catch (error) {
        feedback.textContent = error.message || "The room could not be created.";
      } finally {
        button.disabled = false;
      }
    });
    copyButton?.addEventListener("click", async () => {
      if (!latestInvite) return;
      try { await navigator.clipboard.writeText(latestInvite); feedback.textContent = "Room link copied."; }
      catch { feedback.textContent = "Copy is unavailable. Open the room, then copy its address from your browser."; }
    });
  }

  if (joinForm) {
    joinForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = joinForm.querySelector('button[type="submit"]');
      const feedback = $("join-room-feedback");
      button.disabled = true;
      try {
        await getUser();
        const roomId = $("room-invite-code").value.trim();
        if (!isUuid(roomId)) throw new Error("Enter the room ID from the invitation link.");
        const { data, error } = await client.from("rooms").select("id,film_id,visibility,status,max_members").eq("id", roomId).maybeSingle();
        if (error) throw error;
        if (!data || data.visibility !== "public" || data.status !== "open") throw new Error("That public room is unavailable or has closed.");
        window.location.href = "watch.html?room=" + encodeURIComponent(data.id) + (data.film_id ? "&film=" + encodeURIComponent(data.film_id) : "");
      } catch (error) {
        feedback.textContent = error.message || "Could not join that room.";
      } finally { button.disabled = false; }
    });
  }

  const directory = $("public-room-list");
  if (directory) {
    const renderPublicRooms = async () => {
      directory.textContent = "Loading public rooms…";
      try {
        await getUser();
        const { data, error } = await client.from("rooms")
          .select("id,name,max_members,created_at,film_id")
          .eq("visibility", "public").eq("status", "open")
          .order("created_at", { ascending: false }).limit(30);
        if (error) throw error;
        directory.replaceChildren();
        if (!data?.length) {
          const empty = document.createElement("p");
          empty.textContent = "There are no open rooms right now. Create one and invite others.";
          directory.append(empty);
          return;
        }
        data.forEach((room) => {
          const card = document.createElement("article");
          card.className = "public-room-card";
          const details = document.createElement("div");
          const title = document.createElement("h3");
          title.textContent = room.name || "Movie night";
          const meta = document.createElement("p");
          meta.textContent = "Public room · up to " + room.max_members + " people";
          details.append(title, meta);
          const join = document.createElement("a");
          join.className = "button button-small";
          join.href = "watch.html?room=" + encodeURIComponent(room.id) + (room.film_id ? "&film=" + encodeURIComponent(room.film_id) : "");
          join.textContent = "Join room →";
          card.append(details, join);
          directory.append(card);
        });
      } catch (error) {
        directory.textContent = error.message || "Could not load public rooms.";
      }
    };
    renderPublicRooms();
    $("refresh-public-rooms")?.addEventListener("click", renderPublicRooms);
  }

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");
  const chatForm = $("room-chat-form");
  const chatInput = $("room-chat-input");
  const chatBox = $("chat-messages");
  if (!chatForm || !chatBox || !roomId || !isUuid(roomId)) return;

  document.body.classList.add("public-room-mode");
  document.querySelector(".private-room-tools")?.setAttribute("hidden", "");
  $("private-video-strip")?.setAttribute("hidden", "");
  setText("watch-room-status", "Connecting…");
  setText("watch-room-access", "Public room");
  setText("watch-room-code", roomId.slice(0, 8).toUpperCase());
  setText("chat-local-note", "Connecting to live room chat…");
  const toggle = $("toggle-floating-chat");
  const panel = $("floating-chat-panel");
  if (panel) panel.hidden = false;
  if (toggle) toggle.setAttribute("aria-expanded", "true");
  toggle?.addEventListener("click", () => {
    if (!panel) return;
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
  });
  $("close-floating-chat")?.addEventListener("click", () => {
    if (panel) panel.hidden = true;
    toggle?.setAttribute("aria-expanded", "false");
  });
  $("copy-room-invite")?.addEventListener("click", async () => {
    const feedback = $("voice-chat-status");
    try {
      await navigator.clipboard.writeText(window.location.href);
      setText("copy-room-invite", "Room link copied");
      if (feedback) feedback.textContent = "Public room link copied. Anyone can join while space is available.";
    } catch {
      if (feedback) feedback.textContent = "Copy is unavailable. Copy the room address from your browser.";
    }
  });

  let channel = null;
  let heartbeatTimer = null;
  let currentUser = null;
  let lastSentAt = 0;
  const seen = new Set();

  const appendMessage = (message, author) => {
    if (seen.has(message.id)) return;
    seen.add(message.id);
    const empty = chatBox.querySelector(".chat-empty-message");
    empty?.remove();
    const item = document.createElement("article");
    item.className = "chat-message";
    const name = document.createElement("strong");
    name.textContent = author || "Viewer";
    const body = document.createElement("p");
    body.textContent = message.message;
    const time = document.createElement("time");
    time.dateTime = message.created_at;
    time.textContent = new Date(message.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    item.append(name, body, time);
    chatBox.append(item);
    while (chatBox.children.length > 60) chatBox.firstElementChild.remove();
    chatBox.scrollTop = chatBox.scrollHeight;
    const count = $("floating-chat-count");
    if (count) { count.hidden = false; count.textContent = String(seen.size); }
  };

  const loadMessages = async () => {
    const { data, error } = await client.from("room_messages")
      .select("id,room_id,sender_id,message,created_at")
      .eq("room_id", roomId).order("created_at", {ascending:true}).limit(50);
    if (error) throw error;
    const ids = [...new Set((data || []).map((item) => item.sender_id))];
    let names = {};
    if (ids.length) {
      const { data: profiles } = await client.from("profiles").select("id,display_name").in("id", ids);
      (profiles || []).forEach((profile) => { names[profile.id] = profile.display_name; });
    }
    (data || []).forEach((item) => appendMessage(item, names[item.sender_id] || (item.sender_id === currentUser.id ? "You" : "Viewer")));
  };

  const connect = async () => {
    try {
      currentUser = await getUser();
      const { data: room, error: roomError } = await client.from("rooms")
        .select("id,name,visibility,status,host_id,film_id,max_members").eq("id", roomId).maybeSingle();
      if (roomError) throw roomError;
      if (!room || room.visibility !== "public" || room.status !== "open") throw new Error("This public room is unavailable or has closed.");
      if (room.host_id !== currentUser.id) {
        const { data: existingMembership, error: membershipReadError } = await client.from("room_members")
          .select("room_id").eq("room_id", roomId).eq("user_id", currentUser.id).maybeSingle();
        if (membershipReadError) throw membershipReadError;
        if (!existingMembership) {
          const { error: joinError } = await client.from("room_members")
            .insert({ room_id: roomId, user_id: currentUser.id, member_role: "viewer" });
          if (joinError) {
            if (/room is full/i.test(joinError.message)) throw new Error("This room is full. Try another public room.");
            throw joinError;
          }
        }
      }
      const closeRoomButton = $("close-public-room");
      const closeRoomFeedback = $("room-close-feedback");
      const disableClosedRoom = (notice) => {
        setText("watch-room-status", "Closed");
        setText("chat-local-note", notice || "The host has closed this room.");
        chatInput.disabled = true;
        chatForm.querySelector('button[type="submit"]')?.setAttribute("disabled", "");
        if (closeRoomButton) closeRoomButton.disabled = true;
        if (heartbeatTimer) { window.clearInterval(heartbeatTimer); heartbeatTimer = null; }
      };
      if (room.host_id === currentUser.id && closeRoomButton) {
        closeRoomButton.hidden = false;
        closeRoomButton.addEventListener("click", async () => {
          if (!window.confirm("Close this public room? Everyone will lose access to its live chat, and new guests will not be able to join.")) return;
          closeRoomButton.disabled = true;
          if (closeRoomFeedback) closeRoomFeedback.textContent = "Closing room…";
          const { error: closeError } = await client.from("rooms").update({ status: "closed" }).eq("id", roomId).eq("host_id", currentUser.id);
          if (closeError) {
            if (closeRoomFeedback) closeRoomFeedback.textContent = closeError.message || "The room could not be closed.";
            closeRoomButton.disabled = false;
            return;
          }
          if (closeRoomFeedback) closeRoomFeedback.textContent = "Room closed. It no longer appears in the public directory.";
          disableClosedRoom("The host has closed this room.");
        });
      }
      const refreshPresence = async () => {
        const { data: activeCount, error: presenceError } = await client.rpc("touch_public_room_membership", { target_room_id: roomId });
        if (presenceError) throw presenceError;
        setText("watch-room-capacity", activeCount + " / " + room.max_members + " here");
      };
      await refreshPresence();
      heartbeatTimer = window.setInterval(() => {
        refreshPresence().catch(async () => {
          const { data: latestRoom } = await client.from("rooms").select("status").eq("id", roomId).maybeSingle();
          if (!latestRoom || latestRoom.status !== "open") disableClosedRoom("The host has closed this room.");
          else setText("watch-room-capacity", "Reconnecting…");
        });
    } catch (error) {
      setText("watch-room-status", "Unavailable");
      setText("chat-local-note", error.message || "Could not connect to this room.");
      chatInput.disabled = true;
      chatForm.querySelector('button[type="submit"]')?.setAttribute("disabled", "");
    }
  };

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    const message = chatInput.value.trim();
    if (!message) return;
    if (message.length > 300) { setText("chat-local-note", "Messages must be 300 characters or fewer."); return; }
    if (Date.now() - lastSentAt < 1200) { setText("chat-local-note", "Please wait a moment before sending another message."); return; }
    const button = chatForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const { error } = await client.from("room_messages").insert({room_id:roomId,sender_id:currentUser.id,message});
      if (error) throw error;
      lastSentAt = Date.now();
      chatInput.value = "";
      setText("chat-local-note", "Message sent.");
    } catch (error) {
      setText("chat-local-note", error.message || "Message could not be sent.");
    } finally { button.disabled = false; }
  });

  connect();
  window.addEventListener("beforeunload", () => {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    if (channel) client.removeChannel(channel);
  });
})();
