(function () {
  'use strict';

  // ---- Portfolio card 3D tilt ----------------------------------------
  // Cards tilt to follow the cursor; the card image shifts in the
  // opposite direction for a parallax depth layer within the card.

  var cards = document.querySelectorAll('.portfolio-card');

  cards.forEach(function (card) {
    var img       = card.querySelector('.card-image');
    // data-base-scale lets individual images opt into a persistent zoom
    // (e.g. to crop canvas margins) that survives the tilt parallax.
    var baseScale = img ? (parseFloat(img.dataset.baseScale) || 1) : 1;

    card.addEventListener('mousemove', function (e) {
      var r   = card.getBoundingClientRect();
      var x   = e.clientX - r.left;
      var y   = e.clientY - r.top;
      var cx  = r.width  / 2;
      var cy  = r.height / 2;

      // Max ±5° on X axis (top/bottom), ±7° on Y axis (left/right)
      var tiltX = -((y - cy) / cy) * 5;
      var tiltY =  ((x - cx) / cx) * 7;

      card.style.transition = 'box-shadow 0.15s ease';
      card.style.transform  =
        'perspective(900px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) translateY(-4px)';
      card.style.boxShadow  = '0 20px 48px rgba(0,0,0,0.18)';

      // Image counter-parallax — shifts opposite the tilt, preserving base zoom
      if (img) {
        img.style.transition = 'transform 0.05s linear';
        img.style.transform  =
          'translate(' + (-tiltY * 0.8) + 'px, ' + (tiltX * 0.8) + 'px) scale(' + (baseScale * 1.04) + ')';
      }
    });

    card.addEventListener('mouseleave', function () {
      card.style.transition = 'transform 0.5s ease, box-shadow 0.4s ease';
      card.style.transform  = '';
      card.style.boxShadow  = '';

      if (img) {
        img.style.transition = 'transform 0.4s ease';
        img.style.transform  = baseScale !== 1 ? 'scale(' + baseScale + ')' : '';
      }
    });
  });

  // ---- Homepage headshot parallax ------------------------------------
  // The circular hero photo drifts subtly with mouse position —
  // gives a "floating" quality without distorting the image.

  var heroPhoto = document.querySelector('.hero-photo img');

  if (heroPhoto) {
    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth  - 0.5) * 12;
      var y = (e.clientY / window.innerHeight - 0.5) * 10;
      heroPhoto.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    });
  }

}());
