/* Private, administrator-only resumable uploads to Supabase Storage. */
(() => {
  const button = document.getElementById("studio-upload-button");
  const status = document.getElementById("studio-upload-status");
  const videoInput = document.getElementById("studio-film-file");
  const progressWrap = document.getElementById("studio-upload-progress-wrap");
  const progress = document.getElementById("studio-upload-progress");
  const progressLabel = document.getElementById("studio-upload-progress-label");
  if (!button || !status) return;

  const BUCKET = "film-videos";
  const MAX_BYTES = 50 * 1024 * 1024;
  const MIME_BY_EXTENSION = {
    mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm",
    ogv: "video/ogg", ogg: "video/ogg", mov: "video/quicktime"
  };
  let uploading = false;

  const setStatus = (message) => { status.textContent = message; };
  const setProgress = (value) => {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    if (progress) progress.value = percent;
    if (progressLabel) progressLabel.textContent = percent + "%";
    if (progressWrap) progressWrap.hidden = false;
  };
  const uploadSmallFile = (url, file, contentType, headers, onProgress) => new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.timeout = 120000;
    request.setRequestHeader("apikey", headers.apikey);
    request.setRequestHeader("Authorization", headers.authorization);
    request.setRequestHeader("Content-Type", contentType);
    request.setRequestHeader("Cache-Control", "3600");
    request.setRequestHeader("x-upsert", "true");
    request.upload.addEventListener("loadstart", () => onProgress(1));
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      let message = "Storage returned HTTP " + request.status;
      try {
        const body = JSON.parse(request.responseText);
        message = body.message || body.error || message;
      } catch (_) {}
      reject(new Error(message));
    });
    request.addEventListener("error", () => reject(new Error("Network connection interrupted during upload.")));
    request.addEventListener("abort", () => reject(new Error("Upload was cancelled.")));
    request.addEventListener("timeout", () => reject(new Error("Upload timed out after 2 minutes. Check your connection and retry.")));
    request.send(file);
  });

  const safeName = (name) => {
    const cleaned = String(name || "video").normalize("NFKD")
      .replace(/[^a-zA-Z0-9._ -]/g, "")
      .trim().replace(/\s+/g, "-").replace(/-+/g, "-")
      .slice(-120);
    return cleaned || "video";
  };

  button.addEventListener("click", async () => {
    if (uploading) return;
    const pending = window.moviesStudioPendingUpload;
    const file = pending?.file || videoInput?.files?.[0] || null;
    const draftId = window.moviesStudioActiveDraftId;
    if (!draftId) {
      setStatus("Save a film draft before uploading its video.");
      return;
    }
    if (!file) {
      setStatus("Select a video file first. If you refreshed the page, open the draft and select the file again.");
      return;
    }
    if (pending?.draftId && pending.draftId !== draftId) {
      setStatus("The selected file belongs to a different draft. Save the correct draft again.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("This file is larger than 50 MB. The current Free-plan project cannot accept it.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_BY_EXTENSION[extension] || "";
    if (!contentType) {
      setStatus("Unsupported format. Choose MP4, WebM, Ogg video or MOV.");
      return;
    }
    const client = window.moviesSupabase;
    if (!client) {
      setStatus("Supabase is not connected. Refresh Studio and sign in again.");
      return;
    }

    uploading = true;
    button.disabled = true;
    button.textContent = "Uploading…";
    setProgress(0);
    setStatus("Checking your administrator session…");
    let uploadedPath = null;
    let completed = false;
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData.session;
      if (!session?.user) throw new Error("Sign in again before uploading.");
      const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
      if (roleError || isAdmin !== true) throw new Error("Administrator access could not be verified.");

      const config = window.MOVIES_SUPABASE_CONFIG;
      if (!config?.url || !config?.publishableKey) throw new Error("Storage configuration is missing.");
      const projectHost = new URL(config.url).hostname;
      const storageHost = projectHost.replace(".supabase.co", ".storage.supabase.co");
      const objectPath = session.user.id + "/" + draftId + "/" + safeName(file.name);
      const endpoint = "https://" + storageHost + "/storage/v1/upload/resumable";
      setStatus("Uploading securely to private cloud storage…");

      if (file.size <= 6 * 1024 * 1024) {
        const objectUrl = config.url.replace(/\/$/, "") + "/storage/v1/object/" +
          BUCKET + "/" + objectPath.split("/").map(encodeURIComponent).join("/");
        setStatus("Uploading video with live progress…");
        await uploadSmallFile(objectUrl, file, contentType, {
          apikey: config.publishableKey,
          authorization: "Bearer " + session.access_token
        }, (percent) => {
          setProgress(percent);
          setStatus("Uploading video… " + Math.round(percent) + "%");
        });
        uploadedPath = objectPath;
      } else {
      if (!window.tus?.Upload) {
        throw new Error("The resumable upload library did not load. Refresh Studio and try again.");
      }
      await new Promise((resolve, reject) => {
        const upload = new window.tus.Upload(file, {
          endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: "Bearer " + session.access_token,
            apikey: config.publishableKey,
            "x-upsert": "true"
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          chunkSize: 6 * 1024 * 1024,
          metadata: {
            bucketName: BUCKET,
            objectName: objectPath,
            contentType,
            cacheControl: "3600"
          },
          onError: reject,
          onProgress: (bytesUploaded, bytesTotal) => {
            const percent = bytesTotal ? (bytesUploaded / bytesTotal) * 100 : 0;
            setProgress(percent);
            setStatus("Uploading video… " + Math.round(percent) + "%");
          },
          onSuccess: () => {
            uploadedPath = objectPath;
            resolve();
          }
        });
        upload.findPreviousUploads().then((previous) => {
          if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
          upload.start();
        }).catch(reject);
      });
      }

      const { error: updateError } = await client.from("film_drafts").update({
        storage_path: objectPath,
        upload_status: "uploaded",
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", draftId).eq("owner_id", session.user.id);
      if (updateError) throw updateError;

      completed = true;
      window.moviesStudioPendingUpload = null;
      if (videoInput) videoInput.value = "";
      setProgress(100);
      setStatus("Upload complete. The video is stored privately in your Movies cloud bucket.");
      window.dispatchEvent(new CustomEvent("movies:film-uploaded"));
    } catch (error) {
      if (uploadedPath && client) {
        await client.storage.from(BUCKET).remove([uploadedPath]).catch(() => {});
      }
      setStatus("Upload failed: " + (error.message || "Check your connection and try again."));
    } finally {
      uploading = false;
      button.disabled = completed;
      button.textContent = completed ? "Video uploaded privately" : "Upload video to cloud";
    }
  });
})();
