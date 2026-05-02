(() => {
  const nav = document.getElementById("nav");
  if (!nav) return;

  // Keep nav visible immediately while preserving existing scroll styling.
  nav.style.opacity = "1";

  // Respect reduced motion without altering existing setup logic.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.style.scrollBehavior = "auto";
  }

  // Show a clear still hero on first load only.
  const sticky = document.querySelector(".cinema-sticky");
  const firstFrameUrl =
    "assets/c__Users_aagat_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Two-storey_Nepali_house_golden_hour_202605021840-f4ec42df-3991-47ac-92bc-22bd167f7607.png";

  let overlay = null;
  if (sticky && window.scrollY <= 0) {
    overlay = document.createElement("div");
    overlay.className = "opening-image-overlay";
    overlay.style.backgroundImage = `url("${firstFrameUrl}")`;
    sticky.insertBefore(overlay, sticky.firstChild);
  }

  function hideOpeningOverlay() {
    if (!overlay) return;
    overlay.classList.add("is-hidden");
    window.setTimeout(() => {
      if (overlay) overlay.remove();
      overlay = null;
    }, 500);
    window.removeEventListener("scroll", onFirstScroll, { passive: true });
    window.removeEventListener("wheel", onFirstScroll, { passive: true });
    window.removeEventListener("touchmove", onFirstScroll, { passive: true });
  }

  function onFirstScroll() {
    if (window.scrollY > 0) hideOpeningOverlay();
  }

  if (overlay) {
    window.addEventListener("scroll", onFirstScroll, { passive: true });
    window.addEventListener("wheel", onFirstScroll, { passive: true });
    window.addEventListener("touchmove", onFirstScroll, { passive: true });
  }
})();
