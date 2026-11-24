/* Local, rule-based Studio checks. No file is uploaded and no AI service is called. */
(() => {
  const button = document.getElementById("studio-run-checks");
  const output = document.getElementById("studio-check-results");
  if (!button || !output) return;

  const byId = (id) => document.getElementById(id);
  const addResult = (parent, kind, title, detail) => {
    const item = document.createElement("article");
    item.className = "studio-check-item " + kind;
    const heading = document.createElement("strong");
    heading.textContent = title;
    const text = document.createElement("p");
    text.textContent = detail;
    item.append(heading, text);
    parent.append(item);
  };

  button.addEventListener("click", () => {
    const title = byId("studio-film-title")?.value.trim() || "";
    const category = byId("studio-film-genre")?.value || "";
    const description = byId("studio-film-description")?.value.trim() || "";
    const file = byId("studio-film-file")?.files?.[0] || null;
    const metadata = window.moviesStudioSelectedMetadata || null;
    const results = document.createElement("div");
    let passed = 0;
    let needsAttention = 0;

    const check = (ok, titleText, goodText, issueText) => {
      addResult(results, ok ? "pass" : "attention", titleText, ok ? goodText : issueText);
      if (ok) passed += 1;
      else needsAttention += 1;
    };

    check(Boolean(title), "Film title", "A title has been entered.", "Add a clear film title before saving.");
    check(Boolean(category), "Category", "A category is selected.", "Choose the closest category to help viewers browse.");
    check(description.length >= 40, "Description", "The description has enough detail for a useful catalogue preview.", description ? "Consider expanding the description to at least 40 characters so viewers understand the film." : "Add a short, spoiler-light description.");
    check(Boolean(file), "Video file", "A video file is selected on this device.", "Select a video file to inspect its basic properties. The file will not be uploaded.");

    if (file) {
      const typeOk = ["video/mp4", "video/webm"].includes(file.type);
      check(typeOk, "Video format", typeOk ? "MP4 or WebM detected." : "Use MP4 or WebM where possible; this selected format may not work consistently across browsers.");
      const sizeOk = file.size <= 500 * 1024 * 1024;
      check(sizeOk, "File size", sizeOk ? "File is under the 500 MB advisory check." : "This file is over 500 MB. No upload is happening now; confirm storage and bandwidth limits before connecting uploads.");
      if (metadata) {
        const durationOk = Number.isFinite(metadata.duration) && metadata.duration > 0;
        check(durationOk, "Video duration", durationOk ? "Video duration was read successfully." : "Duration could not be read. Try another browser-supported video.");
        const resolutionOk = Number(metadata.width) >= 640 && Number(metadata.height) >= 360;
        check(resolutionOk, "Video dimensions", resolutionOk ? "Resolution is at least 640 × 360." : "Resolution is below 640 × 360 or unavailable; check the source video quality.");
      } else {
        addResult(results, "attention", "Video details", "Duration and dimensions are not available yet. Wait for the video preview metadata to load, then run the check again.");
        needsAttention += 1;
      }
    }

    const summary = document.createElement("p");
    summary.className = "studio-check-summary";
    summary.textContent = needsAttention === 0
      ? "All available checks passed. This is a draft readiness review, not permission to publish."
      : passed + " checks passed · " + needsAttention + " item(s) need attention. Review the notes before saving or publishing.";
    output.replaceChildren(summary, results);
  });
})();