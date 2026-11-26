/* Public details page for one published film. */
(() => {
  const status = document.getElementById("film-detail-status");
  const content = document.getElementById("film-detail-content");
  const filmId = new URLSearchParams(window.location.search).get("film");
  const setStatus = (message, isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = isError ? "error" : "info";
  };
  const load = async () => {
    try {
      if (!filmId) throw new Error("No film was selected. Return to the library and choose a film.");
      const config = window.MOVIES_SUPABASE_CONFIG;
      if (!config?.url || !config?.publishableKey || !window.supabase) throw new Error("The film service is not configured.");
      const client = window.supabase.createClient(config.url, config.publishableKey);
      const { data: film, error } = await client.from("films").select("id,title,description,category,poster_storage_path")
        .eq("id", filmId).eq("published", true).maybeSingle();
      if (error) throw error;
      if (!film) throw new Error("This film is unavailable or is no longer published.");
      document.title = (film.title || "Film details") + " — Movies";
      document.getElementById("film-detail-title").textContent = film.title || "Untitled film";
      document.getElementById("film-detail-category").textContent = film.category || "FEATURE FILM";
      document.getElementById("film-detail-description").textContent = film.description || "No description has been added for this film yet.";
      document.getElementById("film-detail-watch").href = "watch.html?film=" + encodeURIComponent(film.id);
      const poster = document.getElementById("film-detail-poster");
      poster.replaceChildren();
      if (film.poster_storage_path) {
        try {
          const response = await fetch(config.url.replace(/\/$/, "") + "/functions/v1/get-film-poster", {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: config.publishableKey },
            body: JSON.stringify({ filmId: film.id })
          });
          const result = await response.json();
          if (response.ok && result.signedUrl) {
            const image = document.createElement("img");
            image.src = result.signedUrl;
            image.alt = (film.title || "Film") + " poster";
            poster.append(image);
          }
        } catch (posterError) {
          console.warn("Film poster could not be loaded:", posterError);
        }
      }
      if (!poster.childElementCount) {
        poster.classList.add("poster-placeholder");
        const mark = document.createElement("span");
        mark.textContent = (film.title || "M").trim().charAt(0).toUpperCase();
        poster.append(mark);
      }
      content.hidden = false;
      status.hidden = true;
    } catch (error) {
      setStatus(error.message || "Film details could not be loaded.", true);
      console.error("Film details load failed:", error);
    }
  };
  load();
})();