document.addEventListener("DOMContentLoaded", function () {
  const accordionButtons = document.querySelectorAll(".accordion");
  const curtainButton = Array.from(accordionButtons).find(btn =>
    btn.textContent.includes("Human Variety Hour")
  );

  if (!curtainButton) return;

  curtainButton.addEventListener("click", () => {
    const panel = curtainButton.nextElementSibling;
    const curtainSection = panel.querySelector("#hvh-curtain-section");

    // Prevent replay on close
    if (!curtainSection.classList.contains("open")) {
      curtainSection.classList.add("open");

      const flicker = document.getElementById("flicker-sound");
      const slide = document.getElementById("slide-sound");
      if (flicker) flicker.play();
      if (slide) slide.play();
    }
  });
});
