(() => {
  const config = window.MOVIES_SUPABASE_CONFIG;
  const feedback = document.getElementById("profile-feedback");
  if (!config || !window.supabase) {
    feedback.textContent = "The account service could not load. Refresh and try again.";
    return;
  }
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const byId = (id) => document.getElementById(id);
  const dialog = byId("profile-edit-dialog");
  let currentUser = null;

  const setFeedback = (message, error = false) => {
    feedback.textContent = message;
    feedback.dataset.state = error ? "error" : "success";
  };

  const renderAvatar = async (user) => {
    const target = byId("profile-avatar");
    const metadata = user.user_metadata || {};
    const name = metadata.display_name || user.email?.split("@")[0] || "Viewer";
    target.replaceChildren();
    const path = metadata.avatar_path;
    if (path) {
      const { data, error } = await client.storage.from("profile-avatars").createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) {
        const img = document.createElement("img");
        img.src = data.signedUrl;
        img.alt = name + " profile photo";
        target.append(img);
        return;
      }
    }
    target.textContent = [...name.trim()][0]?.toUpperCase() || "M";
  };

  const renderProfile = async (user) => {
    const metadata = user.user_metadata || {};
    const name = metadata.display_name || user.email?.split("@")[0] || "Viewer";
    byId("profile-name").textContent = name;
    byId("profile-handle").textContent = "@" + (user.email?.split("@")[0] || "viewer");
    byId("profile-email").textContent = user.email || "Private";
    byId("profile-joined").textContent = user.created_at
      ? new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
      : "Member";
    byId("profile-bio").textContent = metadata.bio || "Welcome to my Movies profile.";
    byId("edit-display-name").value = name;
    byId("edit-bio").value = metadata.bio || "";
    await renderAvatar(user);
  };

  const loadAccount = async () => {
    const { data, error } = await client.auth.getSession();
    if (error) {
      setFeedback(error.message, true);
      return;
    }
    currentUser = data.session?.user || null;
    if (!currentUser) {
      location.replace("auth.html");
      return;
    }
    await renderProfile(currentUser);
    setFeedback("Your account is connected.");
  };

  const openEditProfile = () => dialog.showModal();
  byId("edit-profile-button").addEventListener("click", openEditProfile);
  byId("shortcut-edit-profile").addEventListener("click", openEditProfile);
  byId("cancel-profile-edit").addEventListener("click", () => dialog.close());

  byId("upload-avatar-button").addEventListener("click", () => byId("avatar-file-input").click());
  byId("avatar-file-input").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setFeedback("Choose a JPG, PNG, or WebP image.", true);
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFeedback("Choose an image smaller than 2 MB.", true);
      event.target.value = "";
      return;
    }
    const button = byId("upload-avatar-button");
    button.disabled = true;
    button.textContent = "Uploading…";
    setFeedback("Uploading your profile photo…");
    try {
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = currentUser.id + "/avatar." + extension;
      const { error: uploadError } = await client.storage.from("profile-avatars").upload(path, file, {
        upsert: true, contentType: file.type, cacheControl: "3600"
      });
      if (uploadError) throw uploadError;
      const { data, error: updateError } = await client.auth.updateUser({
        data: { avatar_path: path }
      });
      if (updateError) throw updateError;
      currentUser = data.user;
      await renderAvatar(currentUser);
      setFeedback("Profile photo updated.");
    } catch (error) {
      setFeedback(error.message || "Could not upload your photo.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Change photo";
      event.target.value = "";
    }
  });

  byId("profile-edit-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    const displayName = byId("edit-display-name").value.trim();
    const bio = byId("edit-bio").value.trim();
    if (displayName.length < 2) {
      setFeedback("Display name must contain at least 2 characters.", true);
      return;
    }
    const saveButton = byId("save-profile-button");
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    try {
      const { data, error } = await client.auth.updateUser({ data: { display_name: displayName, bio } });
      if (error) throw error;
      currentUser = data.user;
      await renderProfile(currentUser);
      dialog.close();
      setFeedback("Profile updated.");
    } catch (error) {
      setFeedback(error.message || "Could not update your profile.", true);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save changes";
    }
  });

  byId("profile-signout").addEventListener("click", async () => {
    const button = byId("profile-signout");
    button.disabled = true;
    const { error } = await client.auth.signOut();
    if (error) {
      setFeedback(error.message || "Could not sign out.", true);
      button.disabled = false;
      return;
    }
    location.replace("auth.html");
  });

  client.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) location.replace("auth.html");
    else currentUser = session.user;
  });
  loadAccount();
})();