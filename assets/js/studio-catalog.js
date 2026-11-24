/* Supabase-backed Studio drafts and private video metadata. */
(() => {
  const form = document.getElementById("film-metadata-form");
  const list = document.getElementById("studio-catalog-list");
  const feedback = document.getElementById("studio-form-feedback");
  const count = document.getElementById("studio-catalog-count");
  const search = document.getElementById("studio-catalog-search");
  const filter = document.getElementById("studio-catalog-filter");
  const saveButton = document.getElementById("studio-save-button");
  const cancelButton = document.getElementById("studio-cancel-edit");
  const uploadButton = document.getElementById("studio-upload-button");
  const uploadStatus = document.getElementById("studio-upload-status");
  const videoInput = document.getElementById("studio-film-file");
  const filePreview = document.getElementById("studio-file-preview");
  const posterPreview = document.getElementById("studio-poster-preview");
  const metrics = document.querySelectorAll(".studio-metric");
  if (!form || !list || !feedback) return;

  let client = null;
  let currentUser = null;
  let drafts = [];
  let editingId = null;
  let busy = false;
  window.moviesStudioActiveDraftId = null;
  window.moviesStudioPendingUpload = null;

  const updateUploadControls = () => {
    if (!uploadButton) return;
    const draft = drafts.find((item) => item.id === window.moviesStudioActiveDraftId);
    const alreadyUploaded = draft?.upload_status === "uploaded";
    const hasFile = Boolean(window.moviesStudioPendingUpload?.file || videoInput?.files?.[0]);
    uploadButton.disabled = busy || !window.moviesStudioActiveDraftId || alreadyUploaded || !hasFile;
    uploadButton.textContent = alreadyUploaded ? "Video uploaded privately" : hasFile ? "Upload video to cloud" : window.moviesStudioActiveDraftId ? "Select a video to upload" : "Save a draft to enable upload";
    if (uploadStatus && alreadyUploaded) uploadStatus.textContent = "This draft already has a private cloud video. Replacing videos is not enabled yet.";
  };

  const setFeedback = (message) => { feedback.textContent = message; };
  const setBusy = (value) => {
    busy = value;
    if (saveButton) saveButton.disabled = value;
    if (cancelButton) cancelButton.disabled = value;
  };
  const escapeText = (value) => String(value ?? "");
  const formatSize = (bytes) => {
    if (!Number.isFinite(Number(bytes))) return "Size unavailable";
    const value = Number(bytes);
    return value < 1048576 ? Math.round(value / 1024) + " KB" : (value / 1048576).toFixed(1) + " MB";
  };
  const formatDuration = (seconds) => {
    if (seconds == null || !Number.isFinite(Number(seconds))) return "";
    const total = Math.floor(Number(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remaining = total % 60;
    return hours
      ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remaining).padStart(2, "0")
      : minutes + ":" + String(remaining).padStart(2, "0");
  };

  const updateMetrics = () => {
    if (metrics[0]) {
      metrics[0].querySelector("strong").textContent = "0";
      metrics[0].querySelector("small").textContent = "Publishing not enabled";
    }
    if (metrics[1]) {
      metrics[1].querySelector("strong").textContent = String(drafts.length);
      metrics[1].querySelector("small").textContent = "Saved in Supabase";
    }
    if (metrics[2]) {
      const uploadedBytes = drafts.filter((item) => item.upload_status === "uploaded").reduce((sum, item) => sum + Number(item.file_size_bytes || 0), 0);
      metrics[2].querySelector("strong").textContent = formatSize(uploadedBytes);
      metrics[2].querySelector("small").textContent = "Private cloud videos";
    }
    if (metrics[3]) {
      metrics[3].querySelector("strong").textContent = "—";
      metrics[3].querySelector("small").textContent = "Room service not connected";
    }
  };

  const render = () => {
    const query = (search?.value || "").trim().toLowerCase();
    const status = filter?.value || "all";
    const visible = drafts.filter((draft) =>
      (!query || [draft.title, draft.category, draft.description]
        .some((value) => escapeText(value).toLowerCase().includes(query))) &&
      (status === "all" || status === "draft")
    );
    list.replaceChildren();
    if (count) count.textContent = visible.length + " of " + drafts.length + (drafts.length === 1 ? " saved draft" : " saved drafts");
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "studio-catalog-empty";
      const heading = document.createElement("h3");
      heading.textContent = drafts.length ? "No matching drafts" : "Your cloud catalogue is empty";
      const note = document.createElement("p");
      note.textContent = drafts.length
        ? "Try another search."
        : "Prepare a film draft. Its catalogue details will be saved to your Movies account.";
      empty.append(heading, note);
      list.append(empty);
    }
    visible.forEach((draft) => {
      const card = document.createElement("article");
      card.className = "studio-film-card";
      const top = document.createElement("div");
      top.className = "studio-film-card-top";
      const heading = document.createElement("h3");
      heading.textContent = draft.title;
      const badge = document.createElement("span");
      badge.className = "studio-film-status draft";
      badge.textContent = draft.upload_status === "uploaded" ? "Video stored privately" : "Cloud draft";
      top.append(heading, badge);
      const details = document.createElement("p");
      details.className = "studio-film-details";
      details.textContent = [
        draft.category || "Uncategorised",
        draft.original_file_name || "Video not uploaded",
        draft.file_size_bytes ? formatSize(draft.file_size_bytes) : "",
        draft.duration_seconds ? formatDuration(draft.duration_seconds) : "",
        draft.video_width && draft.video_height ? draft.video_width + " × " + draft.video_height : "",
        draft.upload_status === "uploaded" ? "Video uploaded" : "Video not uploaded"
      ].filter(Boolean).join(" · ");
      const description = document.createElement("p");
      description.className = "studio-film-description";
      description.textContent = draft.description || "No description added.";
      const actions = document.createElement("div");
      actions.className = "studio-film-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button button-small button-outline";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => beginEdit(draft.id));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button-small button-danger";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteDraft(draft.id));
      actions.append(edit, remove);
      card.append(top, details, description, actions);
      list.append(card);
    });
    updateMetrics();
    updateUploadControls();
  };

  const loadDrafts = async () => {
    const { data, error } = await client.from("film_drafts")
      .select("id,owner_id,title,category,description,original_file_name,file_size_bytes,mime_type,duration_seconds,video_width,video_height,storage_path,upload_status,uploaded_at,created_at,updated_at")
      .eq("owner_id", currentUser.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    drafts = data || [];
    render();
  };

  const resetForm = ({ keepTarget = false } = {}) => {
    editingId = null;
    form.reset();
    if (videoInput) videoInput.value = "";
    if (filePreview) filePreview.textContent = "No file selected.";
    if (posterPreview) posterPreview.textContent = "Poster selection is preview-only and is not saved to the cloud.";
    if (saveButton) saveButton.innerHTML = 'Save cloud draft <span aria-hidden="true">→</span>';
    if (cancelButton) cancelButton.hidden = true;
    if (!keepTarget) {
      window.moviesStudioActiveDraftId = null;
      window.moviesStudioPendingUpload = null;
    }
    updateUploadControls();
  };

  const beginEdit = (id) => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;
    editingId = id;
    window.moviesStudioActiveDraftId = id;
    window.moviesStudioPendingUpload = null;
    document.getElementById("studio-film-title").value = draft.title || "";
    document.getElementById("studio-film-genre").value = draft.category || "";
    document.getElementById("studio-film-description").value = draft.description || "";
    if (videoInput) videoInput.value = "";
    if (filePreview) filePreview.textContent = draft.original_file_name
      ? "Saved file reference: " + draft.original_file_name + ". The video itself is not stored."
      : "No video uploaded. Choose a file only to record its basic metadata.";
    if (posterPreview) posterPreview.textContent = "Poster selection is preview-only and is not saved to the cloud.";
    if (saveButton) saveButton.textContent = "Update cloud draft";
    if (cancelButton) cancelButton.hidden = false;
    setFeedback("Editing a cloud draft. Changes are saved to your Movies account.");
    updateUploadControls();
    document.getElementById("studio-film-title").focus();
  };

  const deleteDraft = async (id) => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft || !window.confirm('Delete the cloud draft "' + draft.title + '"?')) return;
    setBusy(true);
    try {
      if (draft.storage_path) {
        const { error: storageError } = await client.storage.from("film-videos").remove([draft.storage_path]);
        if (storageError) throw storageError;
      }
      const { error } = await client.from("film_drafts").delete().eq("id", id).eq("owner_id", currentUser.id);
      if (error) throw error;
      await loadDrafts();
      if (editingId === id) resetForm();
      setFeedback("Cloud draft deleted. No video file was affected.");
    } catch (error) {
      setFeedback("Could not delete the draft: " + (error.message || "Please try again."));
    } finally {
      setBusy(false);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy || !client || !currentUser) return;
    const title = document.getElementById("studio-film-title").value.trim();
    const category = document.getElementById("studio-film-genre").value;
    const description = document.getElementById("studio-film-description").value.trim();
    const file = videoInput?.files?.[0] || null;
    const existing = editingId ? drafts.find((item) => item.id === editingId) : null;
    if (!title) {
      setFeedback("Enter a film title.");
      document.getElementById("studio-film-title").focus();
      return;
    }
    if (!existing && !file) {
      setFeedback("Choose a video file so its filename and basic metadata can be recorded. The file will not be uploaded.");
      return;
    }
    const selectedMetadata = window.moviesStudioSelectedMetadata || null;
    const payload = {
      owner_id: currentUser.id,
      title,
      category,
      description,
      original_file_name: file?.name || existing?.original_file_name || null,
      file_size_bytes: file?.size || existing?.file_size_bytes || null,
      mime_type: file?.type || existing?.mime_type || null,
      duration_seconds: selectedMetadata?.duration ?? existing?.duration_seconds ?? null,
      video_width: selectedMetadata?.width ?? existing?.video_width ?? null,
      video_height: selectedMetadata?.height ?? existing?.video_height ?? null,
      updated_at: new Date().toISOString()
    };
    setBusy(true);
    try {
      let result;
      if (existing) {
        result = await client.from("film_drafts").update(payload)
          .eq("id", existing.id).eq("owner_id", currentUser.id).select("id").single();
      } else {
        result = await client.from("film_drafts").insert(payload).select("id").single();
      }
      if (result.error) throw result.error;
      window.moviesStudioActiveDraftId = result.data.id;
      window.moviesStudioPendingUpload = file ? { draftId: result.data.id, file } : null;
      await loadDrafts();
      resetForm({ keepTarget: true });
      updateUploadControls();
      setFeedback(existing ? "Cloud draft updated successfully. Upload the selected replacement file separately if needed." : "Cloud draft saved. The selected video is ready for a separate private upload.");
    } catch (error) {
      setFeedback("Could not save the cloud draft: " + (error.message || "Please try again."));
    } finally {
      setBusy(false);
    }
  }, true);

  window.addEventListener("movies:film-uploaded", () => loadDrafts().catch((error) => setFeedback("Video uploaded, but the catalogue could not refresh: " + (error.message || "Refresh Studio."))));
  videoInput?.addEventListener("change", updateUploadControls);
  cancelButton?.addEventListener("click", () => {
    resetForm();
    setFeedback("Editing cancelled.");
  });
  search?.addEventListener("input", render);
  filter?.addEventListener("change", render);

  const start = async () => {
    for (let attempt = 0; attempt < 40 && !window.moviesSupabase; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    client = window.moviesSupabase;
    if (!client) {
      setFeedback("The secure sign-in service is unavailable. Refresh Studio and try again.");
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.user) {
      setFeedback("Sign in again to load your cloud drafts.");
      return;
    }
    currentUser = data.session.user;
    const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
    if (roleError || isAdmin !== true) {
      setFeedback("Administrator access could not be confirmed. Cloud catalogue controls remain unavailable.");
      return;
    }
    try {
      await loadDrafts();
      setFeedback("Connected to Supabase. Draft details are stored in your account; video and poster files are not uploaded.");
    } catch (loadError) {
      setFeedback("Could not load cloud drafts: " + (loadError.message || "Please refresh Studio."));
    }
  };

  start().catch((error) => setFeedback("Studio connection failed: " + (error.message || "Please refresh.")));
})();
