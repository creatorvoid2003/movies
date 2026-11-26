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
  const posterInput = document.getElementById("studio-poster-file");
  const posterUploadButton = document.getElementById("studio-poster-upload-button");
  const posterUploadStatus = document.getElementById("studio-poster-upload-status");
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
  window.moviesStudioPendingPoster = null;
  let posterPreviewUrl = null;
  let videoPreviewUrl = null;

  const clearVideoPreview = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    videoPreviewUrl = null;
    const preview = document.getElementById("studio-video-preview");
    const player = document.getElementById("studio-video-player");
    const metadata = document.getElementById("studio-file-metadata");
    if (player) { player.pause(); player.removeAttribute("src"); player.load(); }
    if (preview) preview.hidden = true;
    if (metadata) { metadata.hidden = true; metadata.textContent = ""; }
  };

  const updateUploadControls = () => {
    if (!uploadButton) return;
    const draft = drafts.find((item) => item.id === window.moviesStudioActiveDraftId);
    const alreadyUploaded = draft?.upload_status === "uploaded";
    const hasFile = Boolean(window.moviesStudioPendingUpload?.file || videoInput?.files?.[0]);
    uploadButton.disabled = busy || !window.moviesStudioActiveDraftId || alreadyUploaded || !hasFile;
    uploadButton.textContent = alreadyUploaded ? "Video uploaded privately" : !window.moviesStudioActiveDraftId ? "Save a draft to enable upload" : hasFile ? "Upload video to cloud" : "Select a video to upload";
    if (uploadStatus && alreadyUploaded) uploadStatus.textContent = "This draft already has a private cloud video. Replacing videos is not enabled yet.";
    if (posterUploadButton) {
      const posterFile = window.moviesStudioPendingPoster?.file || posterInput?.files?.[0] || null;
      posterUploadButton.disabled = busy || !window.moviesStudioActiveDraftId || !posterFile;
      posterUploadButton.textContent = posterFile ? "Upload poster to private cloud" : "Select a poster to upload";
    }
  };

  const setFeedback = (message) => { feedback.textContent = message; };
  const setBusy = (value) => {
    busy = value;
    if (saveButton) saveButton.disabled = value;
    if (cancelButton) cancelButton.disabled = value;
    updateUploadControls();
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
      const publishedCount = drafts.filter((item) => item.is_published).length;
      metrics[0].querySelector("strong").textContent = String(publishedCount);
      metrics[0].querySelector("small").textContent = "Visible in public library";
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
      (status === "all" || (status === "draft" && !draft.is_published) || (status === "published" && draft.is_published))
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
      badge.className = "studio-film-status " + (draft.is_published ? "published" : "draft");
      badge.textContent = draft.is_published ? "Published publicly" : draft.upload_status === "uploaded" ? "Video stored privately" : "Cloud draft";
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
      if (draft.poster_signed_url) {
        const poster = document.createElement("img");
        poster.className = "studio-catalog-poster";
        poster.src = draft.poster_signed_url;
        poster.alt = draft.title + " poster";
        poster.loading = "lazy";
        card.append(poster);
      }
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
      if (draft.upload_status === "uploaded" && draft.storage_path) {
        const preview = document.createElement("a");
        preview.className = "button button-small button-outline";
        preview.href = "watch.html?draft=" + encodeURIComponent(draft.id);
        preview.textContent = "Private preview";
        preview.setAttribute("aria-label", "Play private preview of " + draft.title);
        actions.append(preview);
        const publish = document.createElement("button");
        publish.type = "button";
        publish.className = "button button-small" + (draft.is_published ? " button-outline" : "");
        publish.textContent = draft.is_published ? "Unpublish" : "Publish";
        publish.addEventListener("click", () => togglePublish(draft.id));
        actions.append(publish);
      }
      actions.append(edit, remove);
      card.append(top, details, description, actions);
      list.append(card);
    });
    updateMetrics();
    updateUploadControls();
  };

  const loadDrafts = async () => {
    const { data, error } = await client.from("film_drafts")
      .select("id,owner_id,title,category,description,original_file_name,file_size_bytes,mime_type,duration_seconds,video_width,video_height,storage_path,upload_status,uploaded_at,published_film_id,poster_storage_path,created_at,updated_at")
      .eq("owner_id", currentUser.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const linkedFilmIds = (data || []).map((item) => item.published_film_id).filter(Boolean);
    let publishedMap = new Map();
    if (linkedFilmIds.length) {
      const { data: publishedFilms, error: publishedError } = await client.from("films")
        .select("id,published").in("id", linkedFilmIds);
      if (publishedError) throw publishedError;
      publishedMap = new Map((publishedFilms || []).map((film) => [film.id, film.published === true]));
    }
    drafts = await Promise.all((data || []).map(async (item) => {
      let poster_signed_url = null;
      if (item.poster_storage_path) {
        const { data: signedPoster, error: posterError } = await client.storage.from("film-posters").createSignedUrl(item.poster_storage_path, 3600);
        if (!posterError) poster_signed_url = signedPoster?.signedUrl || null;
      }
      return {
        ...item,
        poster_signed_url,
        is_published: item.published_film_id ? publishedMap.get(item.published_film_id) === true : false
      };
    }));
    render();
  };

  const resetForm = ({ keepTarget = false } = {}) => {
    editingId = null;
    form.reset();
    if (videoInput) videoInput.value = "";
    clearVideoPreview();
    if (filePreview) filePreview.textContent = "No file selected.";
    if (posterPreview && !keepTarget) posterPreview.textContent = "No poster selected";
    if (!keepTarget) {
      window.moviesStudioPendingPoster = null;
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
      posterPreviewUrl = null;
    }
    if (saveButton) saveButton.innerHTML = 'Save cloud draft <span aria-hidden="true">→</span>';
    if (cancelButton) cancelButton.hidden = true;
    if (videoInput) videoInput.disabled = false;
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
    if (videoInput) {
      videoInput.value = "";
      videoInput.disabled = draft.upload_status === "uploaded";
    }
    if (filePreview) filePreview.textContent = draft.upload_status === "uploaded"
      ? "Private cloud video stored: " + (draft.original_file_name || "uploaded video") + ". Select another draft to continue."
      : draft.original_file_name
        ? "Saved file reference: " + draft.original_file_name + ". The video has not been uploaded yet."
        : "No video uploaded. Choose a file to prepare it for private cloud storage.";
    window.moviesStudioPendingPoster = null;
    if (posterInput) posterInput.value = "";
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    posterPreviewUrl = null;
    if (posterPreview) {
      posterPreview.replaceChildren();
      if (draft.poster_signed_url) {
        const image = document.createElement("img");
        image.src = draft.poster_signed_url;
        image.alt = draft.title + " poster preview";
        posterPreview.append(image);
      } else posterPreview.textContent = "No poster saved for this draft.";
    }
    if (saveButton) saveButton.textContent = "Update cloud draft";
    if (cancelButton) cancelButton.hidden = false;
    setFeedback("Editing a cloud draft. Changes are saved to your Movies account.");
    updateUploadControls();
    document.getElementById("studio-film-title").focus();
  };

  const togglePublish = async (id) => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft || draft.upload_status !== "uploaded" || !draft.storage_path) {
      setFeedback("Upload the video privately before publishing this film.");
      return;
    }
    const shouldPublish = !draft.is_published;
    const prompt = shouldPublish
      ? 'Publish "' + draft.title + '" to the public Movies library? Anyone will be able to find it and watch it. Only publish a film you own or have permission to distribute.'
      : 'Unpublish "' + draft.title + '"? It will disappear from the public library.';
    if (!window.confirm(prompt)) return;
    setBusy(true);
    try {
      let filmId = draft.published_film_id;
      if (!filmId) {
        const { data: created, error: createError } = await client.from("films").insert({
          owner_id: currentUser.id, title: draft.title, description: draft.description || "",
          category: draft.category || "", provider: "supabase", provider_file_id: draft.storage_path,
          poster_storage_path: draft.poster_storage_path || null,
          mime_type: draft.mime_type || null, file_size_bytes: draft.file_size_bytes || null,
          rights_confirmed: false, published: false
        }).select("id").single();
        if (createError) throw createError;
        filmId = created.id;
        const { error: linkError } = await client.from("film_drafts").update({
          published_film_id: filmId, updated_at: new Date().toISOString()
        }).eq("id", id).eq("owner_id", currentUser.id);
        if (linkError) {
          await client.from("films").delete().eq("id", filmId).eq("owner_id", currentUser.id);
          throw linkError;
        }
      }
      const { error: publishError } = await client.from("films").update({
        poster_storage_path: draft.poster_storage_path || null,
        published: shouldPublish, updated_at: new Date().toISOString()
      }).eq("id", filmId).eq("owner_id", currentUser.id);
      if (publishError) throw publishError;
      await loadDrafts();
      setFeedback(shouldPublish
        ? "Film published. It is now visible in the public Movies library."
        : "Film unpublished. It is no longer listed for public viewers.");
    } catch (error) {
      setFeedback("Could not " + (shouldPublish ? "publish" : "unpublish") + " this film: " + (error.message || "Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const deleteDraft = async (id) => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft || !window.confirm('Delete the cloud draft "' + draft.title + '"?')) return;
    setBusy(true);
    try {
      if (draft.published_film_id) {
        const { error: filmError } = await client.from("films").delete()
          .eq("id", draft.published_film_id).eq("owner_id", currentUser.id);
        if (filmError) throw filmError;
      }
      if (draft.storage_path) {
        const { error: storageError } = await client.storage.from("film-videos").remove([draft.storage_path]);
        if (storageError) throw storageError;
      }
      if (draft.poster_storage_path) {
        const { error: posterStorageError } = await client.storage.from("film-posters").remove([draft.poster_storage_path]);
        if (posterStorageError) throw posterStorageError;
      }
      const { error } = await client.from("film_drafts").delete().eq("id", id).eq("owner_id", currentUser.id);
      if (error) {
        if (draft.storage_path) {
          await client.from("film_drafts").update({ storage_path: null, upload_status: "not_uploaded", uploaded_at: null })
            .eq("id", id).eq("owner_id", currentUser.id);
        }
        throw error;
      }
      await loadDrafts();
      if (editingId === id) resetForm();
      setFeedback("Cloud draft and its stored media were deleted.");
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
      if (existing?.published_film_id) {
        const { error: syncError } = await client.from("films").update({ title, category, description, updated_at: new Date().toISOString() })
          .eq("id", existing.published_film_id).eq("owner_id", currentUser.id);
        if (syncError) throw syncError;
      }
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
  videoInput?.addEventListener("change", () => {
    const file = videoInput.files?.[0] || null;
    clearVideoPreview();
    if (!file) {
      if (filePreview) filePreview.textContent = "No file selected.";
      updateUploadControls();
      return;
    }
    const size = file.size < 1048576
      ? (file.size / 1024).toFixed(0) + " KB"
      : (file.size / 1048576).toFixed(1) + " MB";
    if (filePreview) filePreview.textContent = "Selected: " + file.name + " · " + size;
    const metadata = document.getElementById("studio-file-metadata");
    if (metadata) {
      metadata.textContent = "File type: " + (file.type || "Unknown") + " · Ready to save as a cloud draft.";
      metadata.hidden = false;
    }
    const preview = document.getElementById("studio-video-preview");
    const player = document.getElementById("studio-video-player");
    const previewStatus = document.getElementById("studio-video-preview-status");
    if (preview && player && file.type.startsWith("video/")) {
      videoPreviewUrl = URL.createObjectURL(file);
      player.src = videoPreviewUrl;
      preview.hidden = false;
      if (previewStatus) previewStatus.textContent = "Local preview only — the video has not been uploaded yet.";
      player.load();
    }
    updateUploadControls();
  });
  posterInput?.addEventListener("change", () => {
    const file = posterInput.files?.[0] || null;
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    posterPreviewUrl = null;
    if (!file) {
      window.moviesStudioPendingPoster = null;
      if (posterPreview) posterPreview.textContent = "No poster selected";
      updateUploadControls();
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      posterInput.value = "";
      window.moviesStudioPendingPoster = null;
      if (posterPreview) posterPreview.textContent = "Choose a JPG, PNG or WebP image no larger than 2 MB.";
      if (posterUploadStatus) posterUploadStatus.textContent = "Poster rejected. Check its format and file size.";
      updateUploadControls();
      return;
    }
    posterPreviewUrl = URL.createObjectURL(file);
    window.moviesStudioPendingPoster = { file, objectUrl: posterPreviewUrl };
    if (posterPreview) {
      const image = document.createElement("img");
      image.src = posterPreviewUrl;
      image.alt = "Selected film poster preview";
      posterPreview.replaceChildren(image);
    }
    if (posterUploadStatus) posterUploadStatus.textContent = "Poster selected. Save the draft, then upload it to private cloud storage.";
    updateUploadControls();
  });
  posterUploadButton?.addEventListener("click", async () => {
    if (busy) return;
    const draftId = window.moviesStudioActiveDraftId;
    const file = window.moviesStudioPendingPoster?.file || posterInput?.files?.[0] || null;
    if (!draftId) { if (posterUploadStatus) posterUploadStatus.textContent = "Save the film draft before uploading its poster."; return; }
    if (!file) { if (posterUploadStatus) posterUploadStatus.textContent = "Choose a poster image first."; return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      if (posterUploadStatus) posterUploadStatus.textContent = "Choose a JPG, PNG or WebP image no larger than 2 MB.";
      return;
    }
    const draft = drafts.find((item) => item.id === draftId);
    if (!draft) { if (posterUploadStatus) posterUploadStatus.textContent = "Draft not found. Refresh Studio and try again."; return; }
    setBusy(true);
    let newPath = null;
    try {
      const safeName = String(file.name || "poster").normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "poster";
      newPath = currentUser.id + "/" + draftId + "/" + Date.now() + "-" + safeName;
      if (posterUploadStatus) posterUploadStatus.textContent = "Uploading poster securely to private cloud storage…";
      const { error: uploadError } = await client.storage.from("film-posters").upload(newPath, file, {
        contentType: file.type, cacheControl: "3600", upsert: false
      });
      if (uploadError) throw uploadError;

      // Confirm that Storage can read the uploaded object before saving its path.
      const { data: verification, error: verificationError } = await client.storage
        .from("film-posters").createSignedUrl(newPath, 60);
      if (verificationError || !verification?.signedUrl) {
        throw verificationError || new Error("The poster upload could not be verified in cloud storage.");
      }

      const { data: savedDraft, error: updateError } = await client.from("film_drafts").update({
        poster_storage_path: newPath, updated_at: new Date().toISOString()
      }).eq("id", draftId).eq("owner_id", currentUser.id)
        .select("id,poster_storage_path").single();
      if (updateError) throw updateError;
      if (!savedDraft?.poster_storage_path) {
        throw new Error("The poster file was uploaded, but its draft record was not updated.");
      }
      if (draft.published_film_id) {
        const { data: savedFilm, error: filmUpdateError } = await client.from("films").update({
          poster_storage_path: newPath, updated_at: new Date().toISOString()
        }).eq("id", draft.published_film_id).eq("owner_id", currentUser.id)
          .select("id,poster_storage_path").single();
        if (filmUpdateError || !savedFilm?.poster_storage_path) {
          await client.from("film_drafts").update({
            poster_storage_path: draft.poster_storage_path || null
          }).eq("id", draftId).eq("owner_id", currentUser.id);
          throw filmUpdateError || new Error("The poster was saved to the draft but could not be linked to the published film.");
        }
      }
      if (draft.poster_storage_path) await client.storage.from("film-posters").remove([draft.poster_storage_path]);
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
      posterPreviewUrl = null;
      window.moviesStudioPendingPoster = null;
      if (posterInput) posterInput.value = "";
      await loadDrafts();
      const updated = drafts.find((item) => item.id === draftId);
      if (posterPreview) {
        if (updated?.poster_signed_url) {
          const image = document.createElement("img"); image.src = updated.poster_signed_url; image.alt = "Saved film poster preview"; posterPreview.replaceChildren(image);
        } else posterPreview.textContent = "Poster saved privately.";
      }
      if (posterUploadStatus) posterUploadStatus.textContent = "Poster uploaded. It will appear in the public library when this film is published.";
    } catch (error) {
      if (newPath) await client.storage.from("film-posters").remove([newPath]);
      if (posterUploadStatus) posterUploadStatus.textContent = "Poster upload failed: " + (error.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  });
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
      setFeedback("Connected to Supabase. Draft details, videos and posters are stored privately.");
    } catch (loadError) {
      setFeedback("Could not load cloud drafts: " + (loadError.message || "Please refresh Studio."));
    }
  };

  start().catch((error) => setFeedback("Studio connection failed: " + (error.message || "Please refresh.")));
})();
