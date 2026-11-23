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
