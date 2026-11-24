(() => {
  const status = document.getElementById("studio-access-status");
  const studio = document.querySelector(".studio-grid");
  if (!status || !studio) return;

  const setLocked = (message, userId = "") => {
    studio.querySelectorAll("input, textarea, select, button").forEach((control) => {
      control.disabled = true;
    });
    status.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = "Studio locked. ";
    status.append(heading, document.createTextNode(message));
    if (userId) {
      const identity = document.createElement("p");
      identity.className = "studio-access-identity";
      identity.textContent = `Signed-in account ID: ${userId}`;
      status.append(identity);
    }
  };

  const setUnlocked = () => {
    studio.querySelectorAll("input, textarea, select, button").forEach((control) => {
      control.disabled = false;
    });
    status.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = "Administrator access verified. ";
    status.append(heading, document.createTextNode(
      "You can manage private film drafts and upload videos to secure cloud storage. Public publishing is not enabled."
    ));
  };

  const start = async () => {
    const config = window.MOVIES_SUPABASE_CONFIG;
    if (!config || !window.supabase?.createClient) {
      setLocked("The sign-in service did not load. Refresh this page and try again.");
      return;
    }

    const client = window.moviesSupabase || window.supabase.createClient(
      config.url,
      config.publishableKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    window.moviesSupabase = client;

    const checkAccess = async () => {
      setLocked("Checking your signed-in account…");
      const { data, error } = await client.auth.getSession();
      if (error || !data.session?.user) {
        setLocked("Sign in to your Movies account first. Then return to Studio.");
        return;
      }

      const userId = data.session.user.id;
      const { data: allowed, error: roleError } = await client.rpc("is_admin");
      if (roleError) {
        setLocked("Your administrator role could not be verified. Please try again later.", userId);
        return;
      }
      if (allowed !== true) {
        setLocked("This account does not have the administrator role yet. The account ID below can be used by the project owner to grant access.", userId);
        return;
      }
      setUnlocked();
    };

    await checkAccess();
    client.auth.onAuthStateChange(() => {
      window.setTimeout(checkAccess, 0);
    });
  };

  start().catch(() => {
    setLocked("The Studio access check failed. Refresh the page and try again.");
  });
})();
