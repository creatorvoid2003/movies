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

/* Local Studio previews shown in the library on this browser only. */
const PUBLIC_PREVIEW_KEY = "movies.studioCatalog";
const searchInput = document.getElementById("movie-search");
const filterButtons = document.querySelectorAll("[data-filter]");
const catalogStatus = document.getElementById("catalog-status");
const publicFilmGrid = document.getElementById("public-film-grid");
const catalogEmpty = document.getElementById("catalog-empty");

const readPublicPreviews = () => {
  try {
    const entries = JSON.parse(localStorage.getItem(PUBLIC_PREVIEW_KEY) || "[]");
    return Array.isArray(entries) ? entries.filter((film) => film.status === "published") : [];
  } catch {
    return [];
  }
};
const renderPublicLibrary = () => {
  if (!publicFilmGrid || !catalogStatus) return;
  const films = readPublicPreviews();
  const query = searchInput?.value.trim().toLowerCase() || "";
  const activeFilter = document.querySelector("[data-filter].active")?.dataset.filter || "all";
  const matches = films.filter((film) => {
    const matchesText = !query || [film.title, film.genre, film.description]
      .some((value) => String(value || "").toLowerCase().includes(query));
    const matchesCategory = activeFilter === "all" || String(film.genre || "").toLowerCase() === activeFilter;
    return matchesText && matchesCategory;
  });
  publicFilmGrid.replaceChildren();
  matches.forEach((film) => {
    const card = document.createElement("article");
    card.className = "public-film-card";
    const artwork = document.createElement("div");
    artwork.className = "public-film-artwork";
    if (film.posterData) {
      const image = document.createElement("img");
      image.src = film.posterData;
      image.alt = `${film.title} poster`;
      artwork.append(image);
    } else {
      artwork.setAttribute("aria-hidden", "true");
      const symbol = document.createElement("span");
      symbol.textContent = (film.title || "M").trim().charAt(0).toUpperCase();
      artwork.append(symbol);
    }
    const copy = document.createElement("div");
    copy.className = "public-film-copy";
    const genre = document.createElement("p");
    genre.className = "eyebrow";
    genre.textContent = film.genre || "FEATURE FILM";
    const title = document.createElement("h3");
    title.textContent = film.title;
    const description = document.createElement("p");
    description.textContent = film.description || "A film ready for your next movie night.";
    const link = document.createElement("a");
    link.className = "button button-small";
    link.href = `film.html?id=${encodeURIComponent(film.id)}`;
    link.textContent = "View film";
    copy.append(genre, title, description, link);
    card.append(artwork, copy);
    publicFilmGrid.append(card);
  });
  if (catalogEmpty) catalogEmpty.hidden = matches.length > 0;
  if (!films.length) {
    catalogStatus.textContent = "No published film previews in this browser yet. Add a permitted film in Studio to see it here.";
  } else if (!matches.length) {
    catalogStatus.textContent = "No films match this search or category.";
  } else {
    catalogStatus.textContent = `${matches.length} ${matches.length === 1 ? "film" : "films"} shown. These are local previews, not a shared public catalogue.`;
  }
};
if (searchInput && catalogStatus) {
  searchInput.addEventListener("input", renderPublicLibrary);
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      renderPublicLibrary();
    });
  });
  renderPublicLibrary();
}

/* Resolve a selected film detail from the local published-preview catalogue. */
const filmDetailTitle = document.getElementById("film-detail-title");
if (filmDetailTitle) {
  const requestedFilmId = new URLSearchParams(window.location.search).get("id");
  const film = readPublicPreviews().find((item) => item.id === requestedFilmId);
  const detailDescription = document.getElementById("film-detail-description");
  const detailGenre = document.getElementById("film-detail-genre");
  const detailFile = document.getElementById("film-detail-file");
  const detailAvailability = document.getElementById("film-detail-availability");
  const detailStatus = document.getElementById("film-detail-status");
  const watchLink = document.getElementById("film-watch-link");
  const poster = document.getElementById("film-poster-placeholder");
  if (film) {
    filmDetailTitle.textContent = film.title;
    if (detailDescription) detailDescription.textContent = film.description || "No description has been added for this film.";
    if (detailGenre) detailGenre.textContent = film.genre || "Uncategorised";
    if (detailFile) detailFile.textContent = film.fileName || "Local file";
    if (detailAvailability) detailAvailability.textContent = "Local preview only";
    if (detailStatus) detailStatus.textContent = "STUDIO PUBLISHED PREVIEW";
    if (poster) {
      poster.replaceChildren();
      if (film.posterData) {
        const image = document.createElement("img");
        image.src = film.posterData;
        image.alt = `${film.title} poster`;
        poster.append(image);
      } else {
        const initial = document.createElement("span");
        initial.textContent = (film.title || "M").trim().charAt(0).toUpperCase();
        const label = document.createElement("small");
        label.textContent = film.genre || "THE MOVIES COLLECTION";
        poster.append(initial, label);
      }
    }
    if (watchLink) watchLink.href = `watch.html?film=${encodeURIComponent(film.id)}`;
  } else {
    filmDetailTitle.textContent = "This film is not available";
    if (detailDescription) detailDescription.textContent = "This entry may not exist in this browser or may not be marked as a published preview. Return to the library to explore available entries.";
    if (detailStatus) detailStatus.textContent = "FILM NOT FOUND";
    if (watchLink) {
      watchLink.href = "library.html";
      watchLink.textContent = "Return to library";
    }
  }
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


/* Studio catalogue preview: metadata is stored in this browser only. */
const STUDIO_CATALOG_KEY = "movies.studioCatalog";
const studioFileInput = document.getElementById("studio-film-file");
const studioFilePreview = document.getElementById("studio-file-preview");
const studioPosterInput = document.getElementById("studio-poster-file");
const studioPosterPreview = document.getElementById("studio-poster-preview");
const MAX_POSTER_FILE_SIZE = 8 * 1024 * 1024;
const MAX_POSTER_DATA_LENGTH = 450000;
let selectedPosterData = "";
const studioForm = document.getElementById("film-metadata-form");
const studioFeedback = document.getElementById("studio-form-feedback");
const studioCatalogList = document.getElementById("studio-catalog-list");
const studioCatalogSearch = document.getElementById("studio-catalog-search");
const studioCatalogFilter = document.getElementById("studio-catalog-filter");
const studioCatalogCount = document.getElementById("studio-catalog-count");
const studioCancelEdit = document.getElementById("studio-cancel-edit");
const studioSaveButton = document.getElementById("studio-save-button");
let selectedStudioFile = null;
let editingStudioId = null;

const readStudioCatalog = () => {
  try {
    const items = JSON.parse(localStorage.getItem(STUDIO_CATALOG_KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};
const writeStudioCatalog = (items) => {
  try {
    localStorage.setItem(STUDIO_CATALOG_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
};
const updateStudioMetrics = (items) => {
  const published = items.filter((item) => item.status === "published").length;
  const drafts = items.length - published;
  const values = document.querySelectorAll(".studio-metric strong");
  if (values[0]) values[0].textContent = String(published);
  if (values[1]) values[1].textContent = String(drafts);
  if (values[2]) values[2].textContent = "—";
  if (values[3]) values[3].textContent = "—";
  const notes = document.querySelectorAll(".studio-metric small");
  if (notes[0]) notes[0].textContent = "Local preview entries only";
  if (notes[1]) notes[1].textContent = "Saved in this browser";
};
const renderStudioCatalog = () => {
  if (!studioCatalogList) return;
  const allItems = readStudioCatalog();
  const query = studioCatalogSearch?.value.trim().toLowerCase() || "";
  const filter = studioCatalogFilter?.value || "all";
  const items = allItems.filter((item) => {
    const matchesQuery = !query || [item.title, item.genre, item.description]
      .some((value) => String(value || "").toLowerCase().includes(query));
    return matchesQuery && (filter === "all" || item.status === filter);
  });
  studioCatalogList.replaceChildren();
  if (studioCatalogCount) {
    studioCatalogCount.textContent = items.length === allItems.length
      ? `${allItems.length} saved ${allItems.length === 1 ? "entry" : "entries"}`
      : `${items.length} of ${allItems.length} entries shown`;
  }
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "studio-catalog-empty";
    const heading = document.createElement("h3");
    heading.textContent = allItems.length ? "No matching films" : "Your catalogue is empty";
    const note = document.createElement("p");
    note.textContent = allItems.length
      ? "Try another search or status filter."
      : "Prepare a film draft to see its details here. Nothing is uploaded.";
    empty.append(heading, note);
    studioCatalogList.append(empty);
  }
  items.forEach((film) => {
    const card = document.createElement("article");
    card.className = "studio-film-card";
    const top = document.createElement("div");
    top.className = "studio-film-card-top";
    const heading = document.createElement("h3");
    heading.textContent = film.title;
    const status = document.createElement("span");
    status.className = `studio-film-status ${film.status}`;
    status.textContent = film.status === "published" ? "Published preview" : "Draft";
    top.append(heading, status);
    if (film.posterData) {
      const poster = document.createElement("img");
      poster.className = "studio-catalog-poster";
      poster.src = film.posterData;
      poster.alt = `${film.title} poster`;
      card.append(poster);
    }
    const details = document.createElement("p");
    details.className = "studio-film-details";
    details.textContent = [film.genre || "Uncategorised", film.fileName, formatStudioFileSize(film.fileSize), film.durationSeconds ? formatStudioDuration(film.durationSeconds) : "", film.videoWidth && film.videoHeight ? `${film.videoWidth} × ${film.videoHeight}` : ""].filter(Boolean).join(" · ");
    const description = document.createElement("p");
    description.className = "studio-film-description";
    description.textContent = film.description || "No description added.";
    const actions = document.createElement("div");
    actions.className = "studio-film-actions";
    const makeAction = (label, action, className = "button button-small button-outline") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.textContent = label;
      button.addEventListener("click", () => action(film.id));
      return button;
    };
    actions.append(
      makeAction("Edit", beginStudioEdit),
      makeAction(film.status === "published" ? "Move to drafts" : "Publish preview", toggleStudioStatus),
      makeAction("Delete", deleteStudioFilm, "button button-small button-danger")
    );
    card.append(top, details, description, actions);
    studioCatalogList.append(card);
  });
  updateStudioMetrics(allItems);
};
const resetStudioEditor = () => {
  editingStudioId = null;
  selectedStudioFile = null;
  selectedStudioMetadata = null;
  window.moviesStudioSelectedMetadata = null;
  studioMetadataCheckId += 1;
  if (studioMetadataUrl) URL.revokeObjectURL(studioMetadataUrl);
  studioMetadataUrl = null;
  if (studioVideoPlayer) {
    studioVideoPlayer.pause();
    studioVideoPlayer.removeAttribute("src");
    studioVideoPlayer.load();
  }
  if (studioVideoPreview) studioVideoPreview.hidden = true;
  if (studioVideoPreviewStatus) studioVideoPreviewStatus.textContent = "Preview stays on this device.";
  if (studioForm) studioForm.reset();
  if (studioFileInput) studioFileInput.value = "";
  if (studioFilePreview) studioFilePreview.textContent = "No file selected.";
  if (studioFileMetadata) studioFileMetadata.hidden = true;
  selectedPosterData = "";
  if (studioPosterInput) studioPosterInput.value = "";
  if (studioPosterPreview) studioPosterPreview.textContent = "No poster selected";
  if (studioSaveButton) studioSaveButton.innerHTML = 'Save draft preview <span aria-hidden="true">→</span>';
  if (studioCancelEdit) studioCancelEdit.hidden = true;
};
const beginStudioEdit = (id) => {
  const film = readStudioCatalog().find((item) => item.id === id);
  if (!film) return;
  editingStudioId = id;
  selectedStudioFile = null;
  selectedStudioMetadata = null;
  if (studioFileMetadata) studioFileMetadata.hidden = true;
  if (studioMetadataUrl) URL.revokeObjectURL(studioMetadataUrl);
  studioMetadataUrl = null;
  if (studioVideoPlayer) {
    studioVideoPlayer.pause();
    studioVideoPlayer.removeAttribute("src");
    studioVideoPlayer.load();
  }
  if (studioVideoPreview) studioVideoPreview.hidden = true;
  document.getElementById("studio-film-title").value = film.title;
  document.getElementById("studio-film-genre").value = film.genre || "";
  document.getElementById("studio-film-description").value = film.description || "";
  document.getElementById("studio-rights").checked = true;
  if (studioFileInput) studioFileInput.value = "";
  selectedPosterData = film.posterData || "";
  if (studioFilePreview) studioFilePreview.textContent = `Keeping selected file reference: ${film.fileName}. Choose another file only if you want to replace its details.`;
  if (studioPosterPreview) {
    studioPosterPreview.replaceChildren();
    if (selectedPosterData) {
      const image = document.createElement("img");
      image.src = selectedPosterData;
      image.alt = `${film.title} poster preview`;
      studioPosterPreview.append(image);
    } else {
      studioPosterPreview.textContent = "No poster selected";
    }
  }
  if (studioSaveButton) studioSaveButton.textContent = "Update entry";
  if (studioCancelEdit) studioCancelEdit.hidden = false;
  studioFeedback.textContent = "Editing a local catalogue entry. The original video file is not stored by this page.";
  document.getElementById("studio-film-title").focus();
};
const toggleStudioStatus = (id) => {
  const items = readStudioCatalog();
  const film = items.find((item) => item.id === id);
  if (!film) return;
  film.status = film.status === "published" ? "draft" : "published";
  if (!writeStudioCatalog(items)) {
    studioFeedback.textContent = "Could not update the local catalogue. Browser storage may be full or unavailable.";
    return;
  }
  renderStudioCatalog();
  studioFeedback.textContent = film.status === "published"
    ? "Published preview enabled locally. This does not publish a film to the public website."
    : "Entry moved back to local drafts.";
};
const deleteStudioFilm = (id) => {
  const items = readStudioCatalog();
  const film = items.find((item) => item.id === id);
  if (!film || !window.confirm(`Delete the local entry “${film.title}”?`)) return;
  if (!writeStudioCatalog(items.filter((item) => item.id !== id))) {
    studioFeedback.textContent = "Could not delete this entry from browser storage.";
    return;
  }
  if (editingStudioId === id) resetStudioEditor();
  renderStudioCatalog();
  studioFeedback.textContent = "Local catalogue entry deleted. No cloud file was affected.";
};

const studioFileMetadata = document.getElementById("studio-file-metadata");
const studioVideoPreview = document.getElementById("studio-video-preview");
const studioVideoPlayer = document.getElementById("studio-video-player");
const studioVideoPreviewStatus = document.getElementById("studio-video-preview-status");
let studioMetadataUrl = null;
let studioMetadataCheckId = 0;
let selectedStudioMetadata = null;

const formatStudioFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const formatStudioDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "Unavailable";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
};
const renderStudioFileMetadata = (file, metadata = null, note = "") => {
  if (!studioFileMetadata) return;
  studioFileMetadata.replaceChildren();
  studioFileMetadata.hidden = !file;
  if (!file) return;
  const rows = [
    ["File", file.name],
    ["Size", formatStudioFileSize(file.size)],
    ["Format", file.type || "Not provided by device"],
    ["Duration", metadata ? formatStudioDuration(metadata.duration) : "Checking…"],
    ["Resolution", metadata ? `${metadata.width} × ${metadata.height}` : "Checking…"]
  ];
  rows.forEach(([label, value]) => {
    const line = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    line.append(strong, document.createTextNode(value));
    studioFileMetadata.append(line);
  });
  if (note) {
    const message = document.createElement("p");
    message.className = "studio-file-note";
    message.textContent = note;
    studioFileMetadata.append(message);
  }
};

if (studioFileInput && studioFilePreview) {
  studioFileInput.addEventListener("change", () => {
    selectedStudioFile = studioFileInput.files?.[0] || null;
    selectedStudioMetadata = null;
    studioMetadataCheckId += 1;
    const checkId = studioMetadataCheckId;
    if (studioMetadataUrl) URL.revokeObjectURL(studioMetadataUrl);
    studioMetadataUrl = null;
    if (studioVideoPlayer) {
      studioVideoPlayer.pause();
      studioVideoPlayer.removeAttribute("src");
      studioVideoPlayer.load();
    }
    if (studioVideoPreview) studioVideoPreview.hidden = true;
    if (studioVideoPreviewStatus) studioVideoPreviewStatus.textContent = "Preview stays on this device.";
    if (!selectedStudioFile) {
      studioFilePreview.textContent = editingStudioId
        ? "Keeping the existing file reference. Choose a new file only to replace it."
        : "No file selected.";
      renderStudioFileMetadata(null);
      return;
    }

    const extension = selectedStudioFile.name.split(".").pop()?.toLowerCase() || "";
    const supportedExtensions = ["mp4", "m4v", "webm", "ogv", "ogg", "mov"];
    const knownVideoMime = !selectedStudioFile.type || selectedStudioFile.type.startsWith("video/");
    if (!supportedExtensions.includes(extension) || !knownVideoMime) {
      selectedStudioFile = null;
      studioFileInput.value = "";
      studioFilePreview.textContent = "Unsupported file type. Choose an MP4, WebM, Ogg video or MOV file.";
      renderStudioFileMetadata(null);
      if (studioVideoPreview) studioVideoPreview.hidden = true;
      studioFeedback.textContent = "Choose a recognized video file. MP4 (H.264/AAC) and WebM are the preferred starting formats.";
      return;
    }

    studioFilePreview.textContent = "File selected. Checking video metadata in this browser…";
    renderStudioFileMetadata(selectedStudioFile);
    const objectUrl = URL.createObjectURL(selectedStudioFile);
    studioMetadataUrl = objectUrl;
    if (studioVideoPlayer && studioVideoPreview) {
      studioVideoPlayer.src = objectUrl;
      studioVideoPlayer.load();
      studioVideoPreview.hidden = false;
      if (studioVideoPreviewStatus) studioVideoPreviewStatus.textContent = "Local preview ready. Press Play to test video and audio on this device.";
    }
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", () => {
      if (checkId !== studioMetadataCheckId) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      selectedStudioMetadata = {
        duration: Number.isFinite(probe.duration) ? probe.duration : null,
        width: probe.videoWidth || 0,
        height: probe.videoHeight || 0
      };
      window.moviesStudioSelectedMetadata = selectedStudioMetadata;
      renderStudioFileMetadata(selectedStudioFile, selectedStudioMetadata,
        "Metadata read successfully. This checks the browser's ability to read the file header; full playback still needs testing.");
      studioFilePreview.textContent = "File selected · metadata checked · ready to save as a draft and upload privately.";
    }, { once: true });
    probe.addEventListener("error", () => {
      if (checkId !== studioMetadataCheckId) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      renderStudioFileMetadata(selectedStudioFile, null,
        "This browser could not read the video's metadata. The file may use an unsupported codec or container; test playback before publishing.");
      studioFilePreview.textContent = "File selected, but browser metadata could not be read. No upload has occurred.";
      if (studioVideoPreviewStatus) studioVideoPreviewStatus.textContent = "Metadata check failed. You can still try Play to see whether this browser can decode the file.";
    }, { once: true });
    probe.src = objectUrl;
  });
  studioVideoPlayer?.addEventListener("playing", () => {
    if (studioVideoPreviewStatus) studioVideoPreviewStatus.textContent = "Playback started on this device. Check both picture and sound.";
  });
  studioVideoPlayer?.addEventListener("error", () => {
    if (studioVideoPreviewStatus) studioVideoPreviewStatus.textContent = "This browser could not play the selected file. Try an MP4 encoded with H.264 video and AAC audio, or WebM.";
  });
  window.addEventListener("pagehide", () => {
    if (studioVideoPlayer) {
      studioVideoPlayer.pause();
      studioVideoPlayer.removeAttribute("src");
      studioVideoPlayer.load();
    }
    if (studioMetadataUrl) URL.revokeObjectURL(studioMetadataUrl);
    studioMetadataUrl = null;
  });
}

if (studioPosterInput && studioPosterPreview) {
  studioPosterInput.addEventListener("change", () => {
    const file = studioPosterInput.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      studioPosterInput.value = "";
      studioPosterPreview.textContent = "Choose a JPG, PNG or WebP image.";
      studioFeedback.textContent = "That poster format is not supported.";
      return;
    }
    if (file.size > MAX_POSTER_FILE_SIZE) {
      studioPosterInput.value = "";
      studioPosterPreview.textContent = "Poster is too large. Choose an image under 8 MB.";
      studioFeedback.textContent = "Poster selection limit: 8 MB before compression.";
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const source = new Image();
      source.addEventListener("load", () => {
        const scale = Math.min(1, 640 / source.width, 900 / source.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          studioFeedback.textContent = "Could not prepare this poster image in the browser.";
          return;
        }
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        let compressed = canvas.toDataURL("image/jpeg", 0.68);
        if (compressed.length > MAX_POSTER_DATA_LENGTH) compressed = canvas.toDataURL("image/jpeg", 0.48);
        if (compressed.length > MAX_POSTER_DATA_LENGTH) {
          studioPosterInput.value = "";
          studioPosterPreview.textContent = "Poster could not be compressed small enough. Try a simpler image.";
          studioFeedback.textContent = "Choose a smaller or less detailed poster image.";
          return;
        }
        selectedPosterData = compressed;
        const preview = document.createElement("img");
        preview.src = compressed;
        preview.alt = "Selected film poster preview";
        studioPosterPreview.replaceChildren(preview);
        studioFeedback.textContent = "Poster ready. It will be saved as a compressed, browser-local preview only.";
      }, { once: true });
      source.addEventListener("error", () => {
        studioPosterPreview.textContent = "The selected image could not be opened.";
      }, { once: true });
      source.src = String(reader.result);
    }, { once: true });
    reader.addEventListener("error", () => {
      studioFeedback.textContent = "Could not read this poster image.";
    }, { once: true });
    reader.readAsDataURL(file);
  });
}
if (studioForm && studioFeedback) {
  studioForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.getElementById("studio-film-title").value.trim();
    const genre = document.getElementById("studio-film-genre").value;
    const description = document.getElementById("studio-film-description").value.trim();
    const rightsConfirmed = document.getElementById("studio-rights").checked;
    const existing = editingStudioId
      ? readStudioCatalog().find((item) => item.id === editingStudioId)
      : null;
    if (!selectedStudioFile && !existing) {
      studioFeedback.textContent = "Choose a video file first. No upload has occurred.";
      return;
    }
    if (!title) {
      studioFeedback.textContent = "Enter a film title before preparing this entry.";
      document.getElementById("studio-film-title").focus();
      return;
    }
    if (!rightsConfirmed) {
      studioFeedback.textContent = "Please confirm you have the rights to share this film.";
      return;
    }
    const entry = {
      id: existing?.id || (window.crypto?.randomUUID ? crypto.randomUUID() : `film-${Date.now()}`),
      title, genre, description,
      fileName: selectedStudioFile?.name || existing?.fileName,
      fileSize: selectedStudioFile?.size || existing?.fileSize || 0,
      fileMimeType: selectedStudioFile?.type || existing?.fileMimeType || "",
      durationSeconds: selectedStudioMetadata?.duration ?? existing?.durationSeconds ?? null,
      videoWidth: selectedStudioMetadata?.width || existing?.videoWidth || null,
      videoHeight: selectedStudioMetadata?.height || existing?.videoHeight || null,
      posterData: selectedPosterData || existing?.posterData || "",
      status: existing?.status || "draft",
      updatedAt: Date.now()
    };
    const items = readStudioCatalog();
    const next = existing ? items.map((item) => item.id === entry.id ? entry : item) : [...items, entry];
    if (!writeStudioCatalog(next)) {
      studioFeedback.textContent = "Could not save this entry. Browser storage may be full or unavailable.";
      return;
    }
    resetStudioEditor();
    renderStudioCatalog();
    studioFeedback.textContent = existing
      ? `Updated “${title}” in this browser's local catalogue.`
      : `Saved “${title}” as a local draft preview. The video was not uploaded.`;
  });
}
studioCancelEdit?.addEventListener("click", () => {
  resetStudioEditor();
  studioFeedback.textContent = "Editing cancelled.";
});
studioCatalogSearch?.addEventListener("input", renderStudioCatalog);
studioCatalogFilter?.addEventListener("change", renderStudioCatalog);
if (studioCatalogList) renderStudioCatalog();

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

const roomFilmSelect = document.getElementById("new-room-film");
if (roomFilmSelect) {
  const selectedValue = roomFilmSelect.value;
  const noFilmOption = document.createElement("option");
  noFilmOption.value = "";
  noFilmOption.textContent = "No film selected";
  roomFilmSelect.replaceChildren(noFilmOption);

  readPublicPreviews().forEach((film) => {
    const option = document.createElement("option");
    option.value = film.title;
    option.textContent = film.title;
    roomFilmSelect.append(option);
  });

  if ([...roomFilmSelect.options].some((option) => option.value === selectedValue)) {
    roomFilmSelect.value = selectedValue;
  }
}

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
const floatingChatToggle = document.getElementById("toggle-floating-chat");
const floatingChatPanel = document.getElementById("floating-chat-panel");
const floatingChatClose = document.getElementById("close-floating-chat");
let floatingChatIsOpen = false;
const setFloatingChatOpen = (open) => {
  floatingChatIsOpen = open;
  if (floatingChatPanel) floatingChatPanel.hidden = !open;
  if (floatingChatToggle) {
    floatingChatToggle.setAttribute("aria-expanded", String(open));
    floatingChatToggle.setAttribute("aria-label", open ? "Close room chat" : "Open room chat");
  }
  if (open) chatMessages?.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
};
floatingChatToggle?.addEventListener("click", () => setFloatingChatOpen(!floatingChatIsOpen));
floatingChatClose?.addEventListener("click", () => setFloatingChatOpen(false));

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

const requestedFilmId = new URLSearchParams(window.location.search).get("film");
if (requestedFilmId && !watchRoom) {
  try {
    const films = JSON.parse(localStorage.getItem("movies.studioCatalog") || "[]");
    const selectedFilm = Array.isArray(films)
      ? films.find((item) => item.id === requestedFilmId && item.status === "published")
      : null;
    const title = document.getElementById("watch-film-title");
    const state = document.getElementById("watch-film-state");
    if (selectedFilm && title) {
      title.textContent = selectedFilm.title;
      if (state) state.textContent = "Local catalogue preview";
    }
  } catch {
    // Keep the neutral viewing-room placeholder if local storage is unavailable.
  }
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

/* Private cloud-draft playback: Storage RLS verifies the signed-in admin/owner before a temporary URL is issued. */
const requestedDraftId = new URLSearchParams(window.location.search).get("draft");
let isCloudPlayback = false;
const requestedPublishedFilmId = new URLSearchParams(window.location.search).get("film");
const loadPublishedFilmPlayback = async () => {
  if (!requestedPublishedFilmId || !cinemaVideo) return;
  const feedback = document.getElementById("cinema-player-feedback");
  const state = document.getElementById("watch-film-state");
  const setMessage = (message) => { if (feedback) feedback.textContent = message; };
  setMessage("Checking whether this film is published…");
  try {
    const config = window.MOVIES_SUPABASE_CONFIG;
    if (!config?.url || !config?.publishableKey) throw new Error("The film service is not configured.");
    const response = await fetch(config.url + "/functions/v1/get-film-playback", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: config.publishableKey },
      body: JSON.stringify({ filmId: requestedPublishedFilmId })
    });
    const result = await response.json();
    if (!response.ok || !result.signedUrl) throw new Error(result.error || "This film is not available for public playback.");
    isCloudPlayback = true;
    cinemaVideo.src = result.signedUrl;
    cinemaVideo.load();
    const title = document.getElementById("watch-film-title");
    if (title) title.textContent = result.title || "Now showing";
    if (state) state.textContent = "Public film";
    setMessage("Public film ready. This secure playback link expires after 6 hours and can be renewed by reopening the film.");
  } catch (error) {
    setMessage(error.message || "Public playback could not be started.");
    if (state) state.textContent = "Film unavailable";
  }
};

const loadPrivateDraftPlayback = async () => {
  if (!requestedDraftId || !cinemaVideo) return;
  const feedback = document.getElementById("cinema-player-feedback");
  const state = document.getElementById("watch-film-state");
  const fileName = document.getElementById("cinema-file-name");
  const setMessage = (message) => { if (feedback) feedback.textContent = message; };
  setMessage("Checking your Movies account before opening this private video…");
  try {
    const config = window.MOVIES_SUPABASE_CONFIG;
    if (!config || !window.supabase) throw new Error("The secure video service is not available. Refresh and try again.");
    const client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data: userData, error: authError } = await client.auth.getUser();
    if (authError || !userData?.user) throw new Error("Sign in with the administrator account that owns this draft to watch its private preview.");
    const { data: draft, error: draftError } = await client.from("film_drafts")
      .select("id,owner_id,title,storage_path,upload_status,mime_type")
      .eq("id", requestedDraftId)
      .eq("owner_id", userData.user.id)
      .single();
    if (draftError || !draft) throw new Error("This private draft was not found or you do not have permission to view it.");
    if (draft.upload_status !== "uploaded" || !draft.storage_path) throw new Error("This draft does not have an uploaded cloud video yet.");
    const { data: signedData, error: signedError } = await client.storage
      .from("film-videos")
      .createSignedUrl(draft.storage_path, 21600);
    if (signedError || !signedData?.signedUrl) throw new Error("Supabase could not create a secure playback link. Check your account access and try again.");
    isCloudPlayback = true;
    cinemaVideo.src = signedData.signedUrl;
    cinemaVideo.load();
    if (fileName) fileName.textContent = "Private cloud video";
    const title = document.getElementById("watch-film-title");
    if (title) title.textContent = draft.title;
    if (state) state.textContent = "Private cloud preview";
    setMessage("Opening your private cloud video. This temporary playback link expires in 6 hours; only an authorised draft owner can request a new one.");
  } catch (error) {
    setMessage(error.message || "Private playback could not be started.");
    if (state) state.textContent = "Access unavailable";
  }
};

/* Local video player prototype. Local file selection remains available as a fallback. */
const cinemaVideo = document.getElementById("cinema-video");
const cinemaStage = document.getElementById("video-stage");
const cinemaFileInput = document.getElementById("cinema-file");
const cinemaFileName = document.getElementById("cinema-file-name");
const cinemaPlay = document.getElementById("cinema-play");
const cinemaProgress = document.getElementById("cinema-progress");
const cinemaCurrentTime = document.getElementById("cinema-current-time");
const cinemaDuration = document.getElementById("cinema-duration");
const cinemaMute = document.getElementById("cinema-mute");
const cinemaVolume = document.getElementById("cinema-volume");
const cinemaSpeed = document.getElementById("cinema-speed");
const cinemaFullscreen = document.getElementById("cinema-fullscreen");
const cinemaFeedback = document.getElementById("cinema-player-feedback");
const cinemaStageMessage = document.getElementById("stage-message");
const subtitleInput = document.getElementById("subtitle-file");
let cinemaObjectUrl = "";
let subtitleObjectUrl = "";
let subtitleTrack = null;

if (cinemaVideo && cinemaFileInput) {
  const formatPlayerTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remaining = total % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
      : `${minutes}:${String(remaining).padStart(2, "0")}`;
  };

  const setPlayerEnabled = (enabled) => {
    [cinemaPlay, cinemaProgress, cinemaMute, cinemaVolume, cinemaSpeed, cinemaFullscreen]
      .filter(Boolean)
      .forEach((control) => { control.disabled = !enabled; });
  };

  const updateProgress = () => {
    const duration = cinemaVideo.duration;
    const current = cinemaVideo.currentTime;
    if (cinemaCurrentTime) cinemaCurrentTime.textContent = formatPlayerTime(current);
    if (cinemaDuration) cinemaDuration.textContent = formatPlayerTime(duration);
    if (cinemaProgress && Number.isFinite(duration) && duration > 0) {
      cinemaProgress.value = String(Math.round((current / duration) * 1000));
    }
  };

  const updatePlayButton = () => {
    if (!cinemaPlay) return;
    const playing = !cinemaVideo.paused && !cinemaVideo.ended;
    cinemaPlay.textContent = playing ? "Ⅱ" : "▶";
    cinemaPlay.setAttribute("aria-label", playing ? "Pause video" : "Play video");
  };

  const updateMuteButton = () => {
    const muted = cinemaVideo.muted || cinemaVideo.volume === 0;
    if (!cinemaMute) return;
    cinemaMute.textContent = muted ? "×" : "♫";
    cinemaMute.setAttribute("aria-label", muted ? "Unmute video" : "Mute video");
    cinemaMute.setAttribute("aria-pressed", String(muted));
  };

  cinemaFileInput.addEventListener("change", () => {
    const file = cinemaFileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      cinemaFeedback.textContent = "Choose a supported video file.";
      cinemaFileInput.value = "";
      return;
    }
    if (cinemaObjectUrl) URL.revokeObjectURL(cinemaObjectUrl);
    cinemaObjectUrl = URL.createObjectURL(file);
    cinemaVideo.src = cinemaObjectUrl;
    cinemaVideo.load();
    cinemaFileName.textContent = file.name;
    cinemaFeedback.textContent = "Local video selected. It has not been uploaded or shared.";
    isCloudPlayback = false;
    if (cinemaStageMessage) cinemaStageMessage.hidden = false;
    setPlayerEnabled(false);
    if (cinemaProgress) cinemaProgress.value = "0";
    if (cinemaCurrentTime) cinemaCurrentTime.textContent = "0:00";
    if (cinemaDuration) cinemaDuration.textContent = "Loading…";
    const title = document.getElementById("watch-film-title");
    if (title) title.textContent = file.name.replace(/\.[^.]+$/, "");
  });

  cinemaVideo.addEventListener("loadedmetadata", () => {
    setPlayerEnabled(true);
    updateProgress();
    if (cinemaStageMessage) cinemaStageMessage.hidden = true;
    const state = document.getElementById("watch-film-state");
    if (state) state.textContent = isCloudPlayback ? "Private cloud preview" : "Local preview";
    cinemaFeedback.textContent = isCloudPlayback ? "Private cloud video ready. Playback is being served from secure storage." : "Video ready. Playback is local to this device.";
  });
  cinemaVideo.addEventListener("timeupdate", updateProgress);
  cinemaVideo.addEventListener("durationchange", updateProgress);
  cinemaVideo.addEventListener("play", updatePlayButton);
  cinemaVideo.addEventListener("pause", updatePlayButton);
  cinemaVideo.addEventListener("ended", updatePlayButton);
  cinemaVideo.addEventListener("volumechange", updateMuteButton);
  if (requestedPublishedFilmId) loadPublishedFilmPlayback();
  else loadPrivateDraftPlayback();
  cinemaVideo.addEventListener("error", () => {
    cinemaFeedback.textContent = isCloudPlayback ? "The cloud video could not be played. The file may use an unsupported codec or its temporary link may have expired." : "This video could not be played by the browser. Try an MP4 or WebM file.";
    setPlayerEnabled(false);
  });

  cinemaPlay?.addEventListener("click", async () => {
    if (cinemaVideo.paused) {
      try {
        await cinemaVideo.play();
      } catch {
        cinemaFeedback.textContent = "Playback could not start. Try pressing play again.";
      }
    } else {
      cinemaVideo.pause();
    }
    updatePlayButton();
  });
  cinemaProgress?.addEventListener("input", () => {
    if (Number.isFinite(cinemaVideo.duration) && cinemaVideo.duration > 0) {
      cinemaVideo.currentTime = (Number(cinemaProgress.value) / 1000) * cinemaVideo.duration;
      updateProgress();
    }
  });
  cinemaMute?.addEventListener("click", () => {
    cinemaVideo.muted = !cinemaVideo.muted;
    updateMuteButton();
  });
  cinemaVolume?.addEventListener("input", () => {
    cinemaVideo.volume = Number(cinemaVolume.value);
    cinemaVideo.muted = cinemaVideo.volume === 0;
    updateMuteButton();
  });
  cinemaSpeed?.addEventListener("change", () => {
    cinemaVideo.playbackRate = Number(cinemaSpeed.value);
  });
  cinemaFullscreen?.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (cinemaStage?.requestFullscreen) await cinemaStage.requestFullscreen();
      else cinemaFeedback.textContent = "Fullscreen is not supported by this browser.";
    } catch {
      cinemaFeedback.textContent = "Fullscreen could not be opened. Try again.";
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (cinemaFullscreen) {
      cinemaFullscreen.setAttribute("aria-label", document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen");
    }
  });
  subtitleInput?.addEventListener("change", () => {
    const file = subtitleInput.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".vtt")) {
      cinemaFeedback.textContent = "Choose a WebVTT subtitle file ending in .vtt.";
      subtitleInput.value = "";
      return;
    }
    if (subtitleObjectUrl) URL.revokeObjectURL(subtitleObjectUrl);
    if (subtitleTrack) subtitleTrack.remove();
    subtitleObjectUrl = URL.createObjectURL(file);
    subtitleTrack = document.createElement("track");
    subtitleTrack.kind = "subtitles";
    subtitleTrack.label = "Local subtitles";
    subtitleTrack.srclang = "en";
    subtitleTrack.src = subtitleObjectUrl;
    subtitleTrack.default = true;
    cinemaVideo.append(subtitleTrack);
    subtitleTrack.addEventListener("load", () => {
      if (subtitleTrack.track) subtitleTrack.track.mode = "showing";
    }, { once: true });
    cinemaFeedback.textContent = "Subtitle file added to this local preview.";
  });
  window.addEventListener("pagehide", () => {
    cinemaVideo.pause();
    cinemaVideo.removeAttribute("src");
    cinemaVideo.load();
    if (cinemaObjectUrl) URL.revokeObjectURL(cinemaObjectUrl);
    if (subtitleObjectUrl) URL.revokeObjectURL(subtitleObjectUrl);
  });
  setPlayerEnabled(false);
  updatePlayButton();
  updateMuteButton();
}
