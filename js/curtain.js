<script>
document.addEventListener("DOMContentLoaded", function () {
  const accordion = document.querySelectorAll(".accordion");
  accordion.forEach(btn => {
    btn.addEventListener("click", function () {
      const panel = this.nextElementSibling;
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
</script>
