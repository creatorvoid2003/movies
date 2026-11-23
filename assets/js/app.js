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
    const hasSearch = searchInput.value.trim().length > 0;
    catalogStatus.textContent = hasSearch
      ? "No matching films yet. The movie collection has not been published."
      : "The library is being prepared. No films are available yet.";
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
const roomMediaStatus = document.getElementById("room-media-status");

if (microphoneButton && cameraButton && localPreview) {
  let microphoneTrack = null;
  let cameraTrack = null;

  const updateMediaUI = () => {
    const micOn = Boolean(microphoneTrack?.enabled && microphoneTrack.readyState === "live");
    const cameraOn = Boolean(cameraTrack?.enabled && cameraTrack.readyState === "live");

    microphoneButton.textContent = micOn ? "Turn mic off" : "Turn mic on";
    cameraButton.textContent = cameraOn ? "Turn camera off" : "Turn camera on";
    microphoneButton.setAttribute("aria-pressed", String(micOn));
    cameraButton.setAttribute("aria-pressed", String(cameraOn));
    localMediaState.textContent = `CAMERA ${cameraOn ? "ON" : "OFF"} · MIC ${micOn ? "ON" : "OFF"}`;
    localPreview.hidden = !cameraOn;
    localAvatar.hidden = cameraOn;

    if (roomMediaStatus) {
      roomMediaStatus.innerHTML = "<i></i> " + (micOn || cameraOn ? "Local media active" : "Local media preview");
    }
  };

  const refreshLocalStream = () => {
    localPreview.srcObject = cameraTrack ? new MediaStream([cameraTrack]) : null;
    updateMediaUI();
  };

  const requestTrack = async (kind) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media capture requires a supported browser and a secure HTTPS page.");
    }

    const stream = await navigator.mediaDevices.getUserMedia(
      kind === "audio" ? { audio: true, video: false } : { audio: false, video: true }
    );
    return stream.getTracks()[0];
  };

  microphoneButton.addEventListener("click", async () => {
    microphoneButton.disabled = true;
    try {
      if (microphoneTrack?.readyState === "live") {
        microphoneTrack.stop();
        microphoneTrack = null;
      } else {
        microphoneTrack = await requestTrack("audio");
      }
      refreshLocalStream();
    } catch (error) {
      if (roomMediaStatus) roomMediaStatus.textContent = error.name === "NotAllowedError"
        ? "Microphone permission was not granted."
        : error.message;
    } finally {
      microphoneButton.disabled = false;
      updateMediaUI();
    }
  });

  cameraButton.addEventListener("click", async () => {
    cameraButton.disabled = true;
    try {
      if (cameraTrack?.readyState === "live") {
        cameraTrack.stop();
        cameraTrack = null;
      } else {
        cameraTrack = await requestTrack("video");
      }
      refreshLocalStream();
    } catch (error) {
      if (roomMediaStatus) roomMediaStatus.textContent = error.name === "NotAllowedError"
        ? "Camera permission was not granted."
        : error.message;
    } finally {
      cameraButton.disabled = false;
      updateMediaUI();
    }
  });

  window.addEventListener("pagehide", () => {
    [microphoneTrack, cameraTrack].forEach((track) => track?.stop());
    localPreview.srcObject = null;
  });

  updateMediaUI();
}
