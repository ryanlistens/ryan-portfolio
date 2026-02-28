(function () {
  'use strict';

  // ---- Homepage headshot parallax ------------------------------------
  // The circular hero photo drifts subtly with mouse position.

  var heroPhoto = document.querySelector('.hero-photo img');

  if (heroPhoto) {
    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth  - 0.5) * 12;
      var y = (e.clientY / window.innerHeight - 0.5) * 10;
      heroPhoto.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    });
  }

  // ---- Portfolio card image parallax ---------------------------------
  // CSS :hover owns the card lift and shadow.
  // JS shifts the image counter to the cursor for a depth layer.

  var cards = document.querySelectorAll('.portfolio-card');

  cards.forEach(function (card) {
    var img = card.querySelector('.card-image');

    card.addEventListener('mousemove', function (e) {
      if (!img) return;
      var r       = card.getBoundingClientRect();
      var offsetX = ((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * 7;
      var offsetY = ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * 5;

      img.style.transition = 'transform 0.05s linear';
      img.style.transform  =
        'translate(' + (-offsetX * 0.8) + 'px, ' + (-offsetY * 0.8) + 'px) scale(1.04)';
    });

    card.addEventListener('mouseleave', function () {
      if (!img) return;
      img.style.transition = 'transform 0.4s ease';
      img.style.transform  = '';
    });
  });

}());
