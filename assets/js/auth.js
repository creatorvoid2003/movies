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
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.moviesSupabase = client;
  const recoveryMode = new URLSearchParams(location.search).has("reset");
  let mode = recoveryMode ? "recovery" : "login";
  let busy = false;

  const setFeedback = (message, error = false) => {
    feedback.textContent = message;
    feedback.dataset.state = error ? "error" : "success";
  };
  const setBusy = (value) => {
    busy = value;
    submitButton.disabled = value;
    submitButton.textContent = value ? "Please wait…" :
      mode === "signup" ? "Create account" :
      mode === "recovery" ? "Update password" : "Sign in";
  };
  const setMode = (next) => {
    mode = next;
    const recovery = mode === "recovery";
    document.getElementById("auth-heading").textContent =
      recovery ? "Choose a new password." : mode === "signup" ? "Create your account." : "Welcome back.";
    document.getElementById("auth-intro").textContent =
      recovery ? "Choose a new password for your Movies account." :
      mode === "signup" ? "Create a free account to join the Movies community." :
      "Sign in to continue to your cinema.";
    document.getElementById("display-name-field").hidden = mode !== "signup";
    document.getElementById("display-name").required = mode === "signup";
    modeButton.hidden = recovery;
    modeButton.textContent = mode === "signup"
      ? "Already have an account? Sign in" : "New to Movies? Create an account";
    passwordReset.hidden = mode !== "login";
    document.getElementById("auth-email-field").hidden = recovery;
    document.getElementById("auth-email").required = !recovery;
    document.getElementById("auth-password-caption").textContent = recovery ? "New password" : "Password";
    setBusy(false);
    setFeedback(recovery ? "Enter your new password below." : "");
  };
  const showSignedIn = async (user) => {
    if (recoveryMode) {
      formPanel.hidden = false;
      accountPanel.hidden = true;
      return;
    }
    if (!user) {
      accountPanel.hidden = true;
      formPanel.hidden = false;
      return;
    }
    window.location.replace("account.html");
  };

  modeButton.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const displayName = document.getElementById("display-name").value.trim();
    if (password.length < 8) return setFeedback("Use a password with at least 8 characters.", true);
    if (mode === "signup" && displayName.length < 2) return setFeedback("Enter a display name with at least 2 characters.", true);

    setBusy(true);
    try {
      if (mode === "recovery") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        await client.auth.signOut();
        setMode("login");
        setFeedback("Password updated. Sign in with your new password.");
      } else if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email, password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: new URL("auth.html", location.href).href
          }
        });
        if (error) throw error;
        if (data.session) {
          setFeedback("Account created. You are now signed in.");
          await showSignedIn(data.user);
        } else {
          setMode("login");
          setFeedback("Account created. Check your email for the confirmation link, then return here to sign in.");
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
        redirectTo: new URL("auth.html?reset=1", location.href).href
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
    if (error) return setFeedback(error.message, true);
    await showSignedIn(null);
    setFeedback("You have signed out.");
  });

  client.auth.onAuthStateChange((_event, session) => {
    showSignedIn(session?.user || null);
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) setFeedback(error.message, true);
    showSignedIn(data?.session?.user || null);
  });
  setMode(mode);
})();
