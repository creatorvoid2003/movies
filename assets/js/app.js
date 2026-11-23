const joinDialog = document.getElementById("join-dialog");

if (joinDialog) {
  document.querySelectorAll("#join-button").forEach((button) => {
    button.addEventListener("click", () => joinDialog.showModal());
  });

  joinDialog.querySelector("[data-close-dialog]")?.addEventListener("click", () => {
    joinDialog.close();
  });

  joinDialog.addEventListener("click", (event) => {
    if (event.target === joinDialog) joinDialog.close();
  });
}

const searchInput = document.getElementById("movie-search");
const filterButtons = document.querySelectorAll("[data-filter]");
const catalogStatus = document.getElementById("catalog-status");

if (searchInput && catalogStatus) {
  const updateCatalogMessage = () => {
    const hasSearch = searchInput.value.trim().length > 0;
    catalogStatus.textContent = hasSearch
      ? "No matching films yet. The movie collection has not been published."
      : "The library is being prepared. No films are available yet.";
  };

  searchInput.addEventListener("input", updateCatalogMessage);

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      updateCatalogMessage();
    });
  });
}
