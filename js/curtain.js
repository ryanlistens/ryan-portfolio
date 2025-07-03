document.addEventListener("DOMContentLoaded", function () {
  const accordions = document.querySelectorAll(".accordion");

  accordions.forEach((btn) => {
    btn.addEventListener("click", function () {
      const panel = this.nextElementSibling;

      // Close other accordions
      document.querySelectorAll(".panel").forEach((p) => {
        if (p !== panel) {
          p.style.maxHeight = null;
          p.classList.remove("open");
        }
      });

      // Toggle this one
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
        panel.classList.remove("open");
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
        panel.classList.add("open");
      }
    });
  });
});
