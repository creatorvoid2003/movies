const joinDialog = document.getElementById("join-dialog");

if (joinDialog) {
  document.querySelectorAll("#join-button").forEach((button) => {
    button.addEventListener("click", () => joinDialog.showModal());
  });

  joinDialog.querySelector("[data-close-dialog]")?.addEventListener("click", () => {
    joinDialog.close();
  });

  joinDialog.addEventListener("click", (event) => {
    if (event.target === joinDialog) joinDialog.close();
  });
}

const searchInput = document.getElementById("movie-search");
const filterButtons = document.querySelectorAll("[data-filter]");
const catalogStatus = document.getElementById("catalog-status");

if (searchInput && catalogStatus) {
  const updateCatalogMessage = () => {
    const query = searchInput.value.trim();
    const selectedFilter = document.querySelector("[data-filter].active");
    const category = selectedFilter?.dataset.filter;

    if (query) {
      catalogStatus.textContent = `No films are published yet, so “${query}” cannot be found.`;
    } else if (category && category !== "all") {
      const label = selectedFilter.textContent.trim();
      catalogStatus.textContent = `No ${label.toLowerCase()} films have been published yet.`;
    } else {
      catalogStatus.textContent = "The library is being prepared. No films are available yet.";
    }
  };

  searchInput.addEventListener("input", updateCatalogMessage);

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      updateCatalogMessage();
    });
  });
}

const miniScreenToggle = document.getElementById("toggle-mini-screens");
const miniScreenStrip = document.getElementById("private-video-strip");

if (miniScreenToggle && miniScreenStrip) {
  miniScreenToggle.addEventListener("click", () => {
    const isVisible = !miniScreenStrip.hidden;
    miniScreenStrip.hidden = isVisible;
    miniScreenToggle.setAttribute("aria-expanded", String(!isVisible));
    miniScreenToggle.textContent = isVisible ? "Show mini screens" : "Hide mini screens";
  });
}

// Local media controls. Tracks stay on this device until room signaling is added.
const microphoneButton = document.getElementById("toggle-microphone");
const cameraButton = document.getElementById("toggle-camera");
const localPreview = document.getElementById("local-preview");
const localAvatar = document.getElementById("local-avatar");
const localMediaState = document.getElementById("local-media-state");
const roomMediaLabel = document.getElementById("room-media-label");
const mediaFeedback = document.getElementById("voice-chat-status");

if (microphoneButton && cameraButton && localPreview) {
  let microphoneTrack = null;
  let cameraTrack = null;

  const isTrackActive = (track) => Boolean(
    track && track.enabled && track.readyState === "live"
  );

  const updateMediaUI = () => {
    const micOn = isTrackActive(microphoneTrack);
    const cameraOn = isTrackActive(cameraTrack);

    microphoneButton.textContent = micOn ? "Turn mic off" : "Turn mic on";
    cameraButton.textContent = cameraOn ? "Turn camera off" : "Turn camera on";
    microphoneButton.setAttribute("aria-pressed", String(micOn));
    cameraButton.setAttribute("aria-pressed", String(cameraOn));
    localMediaState.textContent = `CAMERA ${cameraOn ? "ON" : "OFF"} · MIC ${micOn ? "ON" : "OFF"}`;
    localPreview.hidden = !cameraOn;
    localAvatar.hidden = cameraOn;

    if (roomMediaLabel) {
      roomMediaLabel.textContent = micOn || cameraOn
        ? "Local media active"
        : "Local media preview";
    }
  };

  const refreshCameraPreview = () => {
    localPreview.srcObject = cameraTrack
      ? new MediaStream([cameraTrack])
      : null;
    updateMediaUI();
  };

  const requestTrack = async (kind) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera and microphone access needs a supported browser and a secure HTTPS page.");
    }

    const stream = await navigator.mediaDevices.getUserMedia(
      kind === "audio"
        ? { audio: true, video: false }
        : { audio: false, video: true }
    );

    const track = stream.getTracks()[0];
    if (!track) {
      throw new Error("The browser did not provide a media track. Please try again.");
    }

    track.addEventListener("ended", () => {
      if (kind === "audio" && microphoneTrack === track) {
        microphoneTrack = null;
      }
      if (kind === "video" && cameraTrack === track) {
        cameraTrack = null;
        refreshCameraPreview();
      }
      updateMediaUI();
    }, { once: true });

    return track;
  };

  const showMediaError = (error, kind) => {
    if (!mediaFeedback) return;

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      mediaFeedback.textContent = `${kind} permission was not granted. Check your browser permissions and try again.`;
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      mediaFeedback.textContent = `No ${kind.toLowerCase()} device was found on this device.`;
    } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      mediaFeedback.textContent = `The ${kind.toLowerCase()} device could not be started. Close other apps using it and try again.`;
    } else {
      mediaFeedback.textContent = error.message || `Could not start the ${kind.toLowerCase()}.`;
    }
  };

  microphoneButton.addEventListener("click", async () => {
    microphoneButton.disabled = true;

    try {
      if (isTrackActive(microphoneTrack)) {
        microphoneTrack.stop();
        microphoneTrack = null;
      } else {
        microphoneTrack = await requestTrack("audio");
      }

      updateMediaUI();
      if (mediaFeedback) {
        mediaFeedback.textContent = "Microphone state changed on this device only. Other room members cannot hear you yet.";
      }
    } catch (error) {
      showMediaError(error, "Microphone");
    } finally {
      microphoneButton.disabled = false;
      updateMediaUI();
    }
  });

  cameraButton.addEventListener("click", async () => {
    cameraButton.disabled = true;

    try {
      if (isTrackActive(cameraTrack)) {
        cameraTrack.stop();
        cameraTrack = null;
      } else {
        cameraTrack = await requestTrack("video");
      }

      refreshCameraPreview();
      if (mediaFeedback) {
        mediaFeedback.textContent = "Camera preview is visible on this device only. Other room members cannot see you yet.";
      }
    } catch (error) {
      showMediaError(error, "Camera");
    } finally {
      cameraButton.disabled = false;
      updateMediaUI();
    }
  });

  window.addEventListener("pagehide", () => {
    [microphoneTrack, cameraTrack].forEach((track) => track?.stop());
    microphoneTrack = null;
    cameraTrack = null;
    localPreview.srcObject = null;
  });

  updateMediaUI();
}


const studioFileInput = document.getElementById("studio-film-file");
const studioFilePreview = document.getElementById("studio-file-preview");
const studioForm = document.getElementById("film-metadata-form");
const studioFeedback = document.getElementById("studio-form-feedback");
let selectedStudioFile = null;

if (studioFileInput && studioFilePreview) {
  studioFileInput.addEventListener("change", () => {
    selectedStudioFile = studioFileInput.files?.[0] || null;
    if (!selectedStudioFile) {
      studioFilePreview.textContent = "No file selected.";
      return;
    }
    const sizeMb = selectedStudioFile.size / (1024 * 1024);
    studioFilePreview.textContent = `Selected: ${selectedStudioFile.name} · ${sizeMb.toFixed(1)} MB. This file has not been uploaded.`;
  });
}

if (studioForm && studioFeedback) {
  studioForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.getElementById("studio-film-title").value.trim();
    const rightsConfirmed = document.getElementById("studio-rights").checked;
    if (!selectedStudioFile) {
      studioFeedback.textContent = "Choose a video file first. No upload has occurred.";
      return;
    }
    if (!title) {
      studioFeedback.textContent = "Enter a film title before preparing this draft.";
      document.getElementById("studio-film-title").focus();
      return;
    }
    if (!rightsConfirmed) {
      studioFeedback.textContent = "Please confirm you have the rights to share this film.";
      return;
    }
    studioFeedback.textContent = `Draft preview ready for “${title}”. Nothing has been uploaded, saved, or published.`;
  });
}


// Browser-only room prototype. This is deliberately local and is not a live multi-user service.
const DEMO_ROOMS_KEY = "movies.demoRooms";
const DEMO_CHAT_PREFIX = "movies.demoChat.";

const readLocalList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeLocalList = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const createRoomForm = document.getElementById("create-room-form");
const openCreatedRoom = document.getElementById("open-created-room");
const copyCreatedCode = document.getElementById("copy-created-code");
let latestCreatedCode = "";

if (createRoomForm) {
  createRoomForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const roomName = document.getElementById("new-room-name").value.trim();
    const access = document.getElementById("new-room-access").value;
    const film = document.getElementById("new-room-film").value;
    const feedback = document.getElementById("create-room-feedback");
    if (!roomName) {
      feedback.textContent = "Enter a room name to create this local preview.";
      return;
    }

    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const room = { code, name: roomName, access, film, createdAt: Date.now() };
    const rooms = readLocalList(DEMO_ROOMS_KEY).filter((item) => item.code !== code);
    rooms.push(room);

    if (!writeLocalList(DEMO_ROOMS_KEY, rooms)) {
      feedback.textContent = "This browser could not save the room preview. Check available site storage and try again.";
      return;
    }

    latestCreatedCode = code;
    feedback.textContent = `Local room preview created. Invite code: ${code}. This room exists only in this browser.`;
    if (openCreatedRoom) {
      openCreatedRoom.href = `watch.html?room=${encodeURIComponent(code)}`;
      openCreatedRoom.hidden = false;
    }
    if (copyCreatedCode) copyCreatedCode.hidden = false;
  });
}

if (copyCreatedCode) {
  copyCreatedCode.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(latestCreatedCode);
      document.getElementById("create-room-feedback").textContent = "Local preview invite code copied.";
    } catch {
      document.getElementById("create-room-feedback").textContent = `Copy unavailable. Your local preview code is ${latestCreatedCode}.`;
    }
  });
}

const joinRoomForm = document.getElementById("join-room-form");
if (joinRoomForm) {
  joinRoomForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = document.getElementById("room-invite-code").value.trim().toUpperCase();
    const feedback = document.getElementById("join-room-feedback");
    const room = readLocalList(DEMO_ROOMS_KEY).find((item) => item.code === code);
    if (!code) {
      feedback.textContent = "Enter an invitation code first.";
      return;
    }
    if (!room) {
      feedback.textContent = "That code was not found in this browser. Live invitations will work after the room service is connected.";
      return;
    }
    window.location.href = `watch.html?room=${encodeURIComponent(code)}`;
  });
}

// Load the local room preview, copy its invite link, and provide a browser-only chat demo.
const watchParams = new URLSearchParams(window.location.search);
const requestedRoomCode = (watchParams.get("room") || "").toUpperCase();
const watchRoom = readLocalList(DEMO_ROOMS_KEY).find((item) => item.code === requestedRoomCode);
const watchRoomTitle = document.getElementById("watch-room-title");
const watchRoomStatus = document.getElementById("watch-room-status");
const watchRoomAccess = document.getElementById("watch-room-access");
const watchRoomCode = document.getElementById("watch-room-code");
const copyRoomInvite = document.getElementById("copy-room-invite");
const roomChatForm = document.getElementById("room-chat-form");
const roomChatInput = document.getElementById("room-chat-input");
const chatMessages = document.getElementById("chat-messages");

if (watchRoom) {
  if (watchRoomTitle) watchRoomTitle.textContent = watchRoom.name;
  if (watchRoomStatus) watchRoomStatus.textContent = "Local preview";
  if (watchRoomAccess) watchRoomAccess.textContent = watchRoom.access === "public" ? "Public preview" : "Private preview";
  if (watchRoomCode) watchRoomCode.textContent = watchRoom.code;
  if (copyRoomInvite) copyRoomInvite.textContent = "Copy room invite";
  const filmTitle = document.getElementById("watch-film-title");
  if (filmTitle && watchRoom.film) filmTitle.textContent = watchRoom.film;
} else if (requestedRoomCode) {
  if (watchRoomTitle) watchRoomTitle.textContent = "Room preview not found";
  if (watchRoomStatus) watchRoomStatus.textContent = "Not found here";
  if (watchRoomCode) watchRoomCode.textContent = "Unknown";
}

if (copyRoomInvite) {
  copyRoomInvite.addEventListener("click", async () => {
    const inviteUrl = window.location.href;
    const feedback = document.getElementById("voice-chat-status");
    try {
      await navigator.clipboard.writeText(inviteUrl);
      copyRoomInvite.textContent = "Invite link copied";
      if (feedback) feedback.textContent = "The local preview link was copied. It will only open on this browser because no live room service is connected.";
    } catch {
      if (feedback) feedback.textContent = `Copy unavailable. Room code: ${watchRoom?.code || "not set"}.`;
    }
  });
}

const chatKey = `${DEMO_CHAT_PREFIX}${watchRoom?.code || "preview"}`;
const renderChat = () => {
  if (!chatMessages) return;
  const messages = readLocalList(chatKey);
  chatMessages.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement("p");
    empty.className = "chat-empty-message";
    empty.textContent = "No messages yet. Start the local demo conversation.";
    chatMessages.append(empty);
    return;
  }
  messages.slice(-30).forEach((message) => {
    const item = document.createElement("article");
    item.className = "chat-message";
    const author = document.createElement("strong");
    author.textContent = message.author;
    const body = document.createElement("p");
    body.textContent = message.text;
    const time = document.createElement("time");
    time.textContent = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    item.append(author, body, time);
    chatMessages.append(item);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

if (roomChatForm && roomChatInput) {
  roomChatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const messageText = roomChatInput.value.trim();
    if (!messageText) return;
    const messages = readLocalList(chatKey);
    messages.push({ author: "You", text: messageText, createdAt: Date.now() });
    if (!writeLocalList(chatKey, messages)) {
      const note = document.getElementById("chat-local-note");
      if (note) note.textContent = "The browser could not save this message. Check available site storage.";
      return;
    }
    roomChatInput.value = "";
    renderChat();
  });
  renderChat();
}
