/* Public Supabase-backed film catalogue. Only published rows are requested. */
(() => {
  const grid = document.getElementById("public-film-grid");
  if (!grid) return;
  const search = document.getElementById("movie-search");
  const status = document.getElementById("catalog-status");
  const empty = document.getElementById("catalog-empty");
  const filters = [...document.querySelectorAll("[data-filter]")];
  let films = [];
  let activeFilter = "all";
  const render = () => {
    const query = (search?.value || "").trim().toLowerCase();
    const matches = films.filter((film) => {
      const category = String(film.category || "").toLowerCase();
      return (!query || [film.title, category, film.description].some((v) => String(v || "").toLowerCase().includes(query))) &&
        (activeFilter === "all" || category === activeFilter);
    });
    grid.replaceChildren();
    matches.forEach((film) => {
      const card = document.createElement("article");
      card.className = "public-film-card";
      const artwork = document.createElement("div");
      artwork.className = "public-film-artwork";
      if (film.poster_url) {
        const image = document.createElement("img");
        image.src = film.poster_url;
        image.alt = film.title + " poster";
        image.loading = "lazy";
        artwork.append(image);
      } else {
        artwork.setAttribute("aria-hidden", "true");
        const symbol = document.createElement("span");
        symbol.textContent = (film.title || "M").trim().charAt(0).toUpperCase();
        artwork.append(symbol);
      }
      const copy = document.createElement("div");
      copy.className = "public-film-copy";
      const category = document.createElement("p");
      category.className = "eyebrow";
      category.textContent = film.category || "FEATURE FILM";
      const title = document.createElement("h3");
      title.textContent = film.title;
      const description = document.createElement("p");
      description.textContent = film.description || "A film ready for your next movie night.";
      const link = document.createElement("a");
      link.className = "button button-small";
      link.href = "watch.html?film=" + encodeURIComponent(film.id);
      link.textContent = "Watch film";
      copy.append(category, title, description, link);
      card.append(artwork, copy);
      grid.append(card);
    });
    if (empty) empty.hidden = matches.length > 0;
    if (status) status.textContent = !films.length ? "No films have been published yet."
      : !matches.length ? "No films match this search or category."
      : matches.length + " published " + (matches.length === 1 ? "film" : "films") + " available.";
  };
  filters.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter || "all";
    filters.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    render();
  }));
  search?.addEventListener("input", render);
  const load = async () => {
    try {
      const config = window.MOVIES_SUPABASE_CONFIG;
      if (!config?.url || !config?.publishableKey || !window.supabase) throw new Error("The public catalogue service is not configured.");
      const client = window.supabase.createClient(config.url, config.publishableKey);
      const { data, error } = await client.from("films").select("id,title,description,category,poster_url")
        .eq("published", true).order("created_at", { ascending: false });
      if (error) throw error;
      films = data || [];
      render();
    } catch (error) {
      if (status) status.textContent = "The public catalogue could not load. Please refresh in a moment.";
      console.error("Public catalogue load failed:", error.message);
    }
  };
  load();
})();
