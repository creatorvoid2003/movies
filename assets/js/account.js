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
  let profileBio = "";

  const setFeedback = (message, error = false) => {
    feedback.textContent = message;
    feedback.dataset.state = error ? "error" : "success";
  };
  const renderProfile = (user) => {
    const metadata = user.user_metadata || {};
    const name = metadata.display_name || user.email?.split("@")[0] || "Viewer";
    const initial = [...name.trim()][0]?.toUpperCase() || "M";
    byId("profile-name").textContent = name;
    byId("profile-handle").textContent = "@" + (user.email?.split("@")[0] || "viewer");
    byId("profile-avatar").textContent = initial;
    byId("profile-email").textContent = user.email || "Private";
    byId("profile-joined").textContent = user.created_at
      ? new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
      : "Member";
    profileBio = metadata.bio || "";
    byId("profile-bio").textContent = profileBio || "Welcome to my Movies profile.";
    byId("edit-display-name").value = name;
    byId("edit-bio").value = profileBio;
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
    renderProfile(currentUser);
    setFeedback("Your account is connected.");
  };

  byId("edit-profile-button").addEventListener("click", () => dialog.showModal());
  byId("cancel-profile-edit").addEventListener("click", () => dialog.close());
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
      const { data, error } = await client.auth.updateUser({
        data: { display_name: displayName, bio }
      });
      if (error) throw error;
      currentUser = data.user;
      renderProfile(currentUser);
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
    else {
      currentUser = session.user;
      renderProfile(currentUser);
    }
  });
  loadAccount();
})();