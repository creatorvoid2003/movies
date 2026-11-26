(() => {
  const header = document.querySelector(".site-header");
  const config = window.MOVIES_SUPABASE_CONFIG;
  if (!header || !config || !window.supabase) return;

  const actions = header.querySelector(".header-actions") || header;
  let link = header.querySelector("[data-session-account-link]");
  if (!link) {
    link = document.createElement("a");
    link.dataset.sessionAccountLink = "true";
    link.className = "button button-small button-outline session-account-link";
    actions.append(link);
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  let renderVersion = 0;

  const update = async (user) => {
    const version = ++renderVersion;
    link.replaceChildren();
    if (!user) {
      link.href = "auth.html";
      link.textContent = "Sign in";
      link.setAttribute("aria-label", "Sign in to Movies");
      return;
    }

    if (user.is_anonymous) {
      link.href = "auth.html";
      link.textContent = "Guest · Sign in";
      link.setAttribute("aria-label", "Sign in to a full Movies account");
      return;
    }

    link.href = "account.html";
    link.setAttribute("aria-label", "Open your Movies profile");
    const metadata = user.user_metadata || {};
    const displayName = metadata.display_name || user.email?.split("@")[0] || "My profile";
    const avatar = document.createElement("span");
    avatar.className = "session-avatar";
    avatar.textContent = [...displayName.trim()][0]?.toUpperCase() || "M";

    if (metadata.avatar_path) {
      const { data, error } = await client.storage
        .from("profile-avatars")
        .createSignedUrl(metadata.avatar_path, 3600);
      if (version !== renderVersion) return;
      if (!error && data?.signedUrl) {
        const image = document.createElement("img");
        image.src = data.signedUrl;
        image.alt = "";
        avatar.replaceChildren(image);
      }
    }
    if (version !== renderVersion) return;
    const name = document.createElement("span");
    name.className = "session-account-name";
    name.textContent = displayName;
    link.append(avatar, name);
  };

  client.auth.getSession().then(({ data, error }) => {
    if (!error) update(data?.session?.user || null);
  });
  client.auth.onAuthStateChange((_event, session) => update(session?.user || null));
})();