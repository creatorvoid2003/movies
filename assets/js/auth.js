(() => {
  const config = window.MOVIES_SUPABASE_CONFIG;
  const feedback = document.getElementById("auth-feedback");
  const form = document.getElementById("auth-form");
  const modeButton = document.getElementById("auth-mode-toggle");
  const submitButton = document.getElementById("auth-submit");
  const passwordReset = document.getElementById("password-reset");
  const signOutButton = document.getElementById("auth-signout");
  const accountPanel = document.getElementById("account-panel");
  const formPanel = document.getElementById("auth-form-panel");

  if (!config || !window.supabase || !form || !feedback) {
    if (feedback) feedback.textContent = "The sign-in service could not load. Refresh this page and try again.";
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  window.moviesSupabase = client;

  let mode = "login";
  let busy = false;
  const setFeedback = (message, isError = false) => {
    feedback.textContent = message;
    feedback.dataset.state = isError ? "error" : "success";
  };
  const setBusy = (value) => {
    busy = value;
    submitButton.disabled = value;
    submitButton.textContent = value
      ? "Please wait…"
      : mode === "signup" ? "Create account" : "Sign in";
  };
  const setMode = (nextMode) => {
    mode = nextMode;
    document.getElementById("auth-heading").textContent =
      mode === "signup" ? "Create your account." : "Welcome back.";
    document.getElementById("auth-intro").textContent =
      mode === "signup"
        ? "Create a free account to join the Movies community."
        : "Sign in to continue to your cinema.";
    document.getElementById("display-name-field").hidden = mode !== "signup";
    document.getElementById("display-name").required = mode === "signup";
    modeButton.textContent = mode === "signup"
      ? "Already have an account? Sign in"
      : "New to Movies? Create an account";
    passwordReset.hidden = mode !== "login";
    setBusy(false);
    setFeedback("");
  };

  const showSignedIn = async (user) => {
    if (!user) {
      accountPanel.hidden = true;
      formPanel.hidden = false;
      return;
    }
    formPanel.hidden = true;
    accountPanel.hidden = false;
    document.getElementById("account-email").textContent = user.email || "Signed-in account";
    const { data } = await client.from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    document.getElementById("account-name").textContent =
      data?.display_name || user.user_metadata?.display_name || "Viewer";
  };

  modeButton.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const displayName = document.getElementById("display-name").value.trim();

    if (password.length < 8) {
      setFeedback("Use a password with at least 8 characters.", true);
      return;
    }
    if (mode === "signup" && displayName.length < 2) {
      setFeedback("Enter a display name with at least 2 characters.", true);
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: new URL("auth.html", window.location.href).href
          }
        });
        if (error) throw error;
        if (data.session) {
          setFeedback("Account created. You are now signed in.");
          await showSignedIn(data.user);
        } else {
          setFeedback("Account created. Check your email for the confirmation link, then return here to sign in.");
          setMode("login");
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setFeedback("You are signed in.");
        await showSignedIn(data.user);
      }
    } catch (error) {
      setFeedback(error.message || "Authentication failed. Please try again.", true);
    } finally {
      setBusy(false);
    }
  });

  passwordReset.addEventListener("click", async () => {
    const email = document.getElementById("auth-email").value.trim();
    if (!email) {
      setFeedback("Enter your email address first, then choose password reset.", true);
      document.getElementById("auth-email").focus();
      return;
    }
    passwordReset.disabled = true;
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("auth.html?reset=1", window.location.href).href
      });
      if (error) throw error;
      setFeedback("If an account exists for that email, a password-reset link will be sent.");
    } catch (error) {
      setFeedback(error.message || "Could not request a password reset.", true);
    } finally {
      passwordReset.disabled = false;
    }
  });

  signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;
    const { error } = await client.auth.signOut();
    signOutButton.disabled = false;
    if (error) {
      setFeedback(error.message, true);
      return;
    }
    setFeedback("You have signed out.");
    await showSignedIn(null);
  });

  client.auth.onAuthStateChange((_event, session) => {
    showSignedIn(session?.user || null);
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) setFeedback(error.message, true);
    showSignedIn(data?.session?.user || null);
    if (new URLSearchParams(window.location.search).has("reset")) {
      setFeedback("Set a new password after opening the reset link from your email. Password update is the next account feature.");
    }
  });

  setMode("login");
})();
