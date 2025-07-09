
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll('.accordion').forEach(acc => {
    acc.addEventListener('click', function() {
      const panel = this.nextElementSibling;
      if (panel.style.maxHeight && panel.style.maxHeight !== '0px') {
        panel.style.maxHeight = '0';
      } else {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
});
