(() => {
  const header = document.querySelector(".site-header");
  const config = window.MOVIES_SUPABASE_CONFIG;
  if (!header || !config || !window.supabase) return;

  const actions = header.querySelector(".header-actions") || header;
  let link = header.querySelector("[data-session-account-link]");
  if (!link) {
    link = document.createElement("a");
    link.dataset.sessionAccountLink = "true";
    link.className = "button button-small button-outline";
    actions.append(link);
  }

  const update = (user) => {
    link.href = user ? "account.html" : "auth.html";
    link.textContent = user ? "My profile" : "Sign in";
    link.setAttribute("aria-label", user ? "Open your account profile" : "Sign in to Movies");
  };

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  client.auth.getSession().then(({ data }) => update(data?.session?.user || null));
  client.auth.onAuthStateChange((_event, session) => update(session?.user || null));
})();