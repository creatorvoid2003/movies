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
      const roster = $("room-participant-list");
      const renderParticipants = async () => {
        if (!roster) return;
        const { data: members, error: memberError } = await client.from("room_members")
          .select("user_id,member_role,last_seen_at")
          .eq("room_id", roomId)
          .gte("last_seen_at", new Date(Date.now() - 90000).toISOString())
          .order("joined_at", { ascending: true });
        if (memberError) throw memberError;
        const ids = [...new Set((members || []).map((member) => member.user_id))];
        let names = {};
        if (ids.length) {
          const { data: profiles } = await client.from("profiles").select("id,display_name").in("id", ids);
          (profiles || []).forEach((profile) => { names[profile.id] = profile.display_name; });
        }
        let moderation = [];
        if (room.host_id === currentUser.id) {
          $("room-moderation-blocks-panel")?.removeAttribute("hidden");
          const { data: actions, error: moderationError } = await client.from("room_moderation")
            .select("id,user_id,action,expires_at").eq("room_id", roomId).gt("expires_at", new Date().toISOString());
          if (moderationError) throw moderationError;
          moderation = actions || [];
        }
        roster.replaceChildren();
        (members || []).forEach((member) => {
          const row = document.createElement("div");
          row.className = "room-participant-row";
          const label = document.createElement("span");
          label.textContent = (names[member.user_id] || (member.user_id === currentUser.id ? "You" : "Viewer")) + (member.member_role === "host" ? " · Host" : "");
          row.append(label);
          if (room.host_id === currentUser.id && member.member_role === "viewer" && member.user_id !== currentUser.id) {
            const activeMute = moderation.find((item) => item.user_id === member.user_id && item.action === "mute");
            if (activeMute) {
              const muted = document.createElement("small");
              muted.textContent = "Muted until " + new Date(activeMute.expires_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
              row.append(muted);
            }
            const mute = document.createElement("button");
            mute.type = "button";
            mute.className = "button button-small button-outline";
            mute.textContent = activeMute ? "Unmute" : "Mute 5m";
            mute.addEventListener("click", async () => {
              mute.disabled = true;
              const result = activeMute
                ? await client.from("room_moderation").delete().eq("room_id", roomId).eq("user_id", member.user_id).eq("action", "mute")
                : await client.from("room_moderation").insert({room_id:roomId,user_id:member.user_id,action:"mute",expires_at:new Date(Date.now()+5*60*1000).toISOString(),created_by:currentUser.id});
              if (result.error) {
                mute.disabled = false;
                setText("room-participant-feedback", "Moderation action failed: " + result.error.message);
                return;
              }
              setText("room-participant-feedback", activeMute ? "Chat mute lifted." : "Viewer muted for 5 minutes.");
              await renderParticipants();
            });
            row.append(mute);
            const block = document.createElement("button");
            block.type = "button";
            block.className = "button button-small button-outline";
            block.textContent = "Block 24h";
            block.addEventListener("click", async () => {
              if (!window.confirm("Block this guest from this room for 24 hours? They will be removed and cannot rejoin during that time.")) return;
              block.disabled = true;
              const { error: blockError } = await client.from("room_moderation").upsert({
                room_id:roomId,user_id:member.user_id,action:"block",
                expires_at:new Date(Date.now()+24*60*60*1000).toISOString(),created_by:currentUser.id
              }, { onConflict: "room_id,user_id,action" });
              if (blockError) {
                block.disabled = false;
                setText("room-participant-feedback", "Could not block this guest: " + blockError.message);
                return;
              }
              await client.from("room_members").delete().eq("room_id", roomId).eq("user_id", member.user_id).eq("member_role", "viewer");
              setText("room-participant-feedback", "Guest blocked from this room for 24 hours.");
              await renderParticipants();
            });
            row.append(block);
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "button button-small button-outline";
            remove.textContent = "Remove";
            remove.setAttribute("aria-label", "Remove " + (names[member.user_id] || "viewer") + " from this room");
            remove.addEventListener("click", async () => {
              if (!window.confirm("Remove this viewer from the room? They can rejoin while the room is open and has space.")) return;
              remove.disabled = true;
              const { error } = await client.from("room_members").delete()
                .eq("room_id", roomId).eq("user_id", member.user_id).eq("member_role", "viewer");
              if (error) {
                remove.disabled = false;
                setText("room-participant-feedback", "Could not remove that viewer. " + error.message);
                return;
              }
              setText("room-participant-feedback", "Viewer removed from this room.");
              await renderParticipants();
            });
            row.append(remove);
          }
          roster.append(row);
        });
        if (!members?.length) {
          const empty = document.createElement("p");
          empty.textContent = "No active participants yet.";
          roster.append(empty);
        }
        setText("room-participant-count", String(members?.length || 0) + " active");
        const blockedList = $("room-blocked-list");
        if (blockedList && room.host_id === currentUser.id) {
          blockedList.replaceChildren();
          const blocked = moderation.filter((item) => item.action === "block");
          blocked.forEach((item) => {
            const row = document.createElement("div");
            row.className = "room-participant-row";
            const label = document.createElement("span");
            label.textContent = (names[item.user_id] || "Guest") + " · blocked until " + new Date(item.expires_at).toLocaleString();
            const unblock = document.createElement("button");
            unblock.type = "button";
            unblock.className = "button button-small button-outline";
            unblock.textContent = "Unblock";
            unblock.addEventListener("click", async () => {
              unblock.disabled = true;
              const { error } = await client.from("room_moderation").delete().eq("id", item.id);
              if (error) {
                unblock.disabled = false;
                setText("room-participant-feedback", "Could not lift block: " + error.message);
                return;
              }
              setText("room-participant-feedback", "Room block lifted.");
              await renderParticipants();
            });
            row.append(label, unblock);
            blockedList.append(row);
          });
          if (!blocked.length) {
            const emptyBlocked = document.createElement("p");
            emptyBlocked.textContent = "No active room blocks.";
            blockedList.append(emptyBlocked);
          }
        }
      };
      const refreshPresence = async () => {
        const { data: activeCount, error: presenceError } = await client.rpc("touch_public_room_membership", { target_room_id: roomId });
        if (presenceError) throw presenceError;
        setText("watch-room-capacity", activeCount + " / " + room.max_members + " here");
      };
      await refreshPresence();
      await renderParticipants();
      heartbeatTimer = window.setInterval(() => {
        refreshPresence().then(renderParticipants).catch(async () => {
          const { data: latestRoom } = await client.from("rooms").select("status").eq("id", roomId).maybeSingle();
          if (!latestRoom || latestRoom.status !== "open") disableClosedRoom("The host has closed this room.");
          else setText("watch-room-capacity", "Reconnecting…");
        });
      }, 30000);
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
      if (error) {
        if (/row-level security|can_send_room_message/i.test(error.message || "")) throw new Error("You are muted or blocked from chatting in this room.");
        throw error;
      }
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
