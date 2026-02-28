(function () {
  'use strict';

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

  // ---- Portfolio card image parallax ---------------------------------
  // The card lifts and the image shifts counter to the cursor, creating
  // a depth layer without rotating the card text.
  //
  // Skipped entirely on touch/stylus-primary devices — no reliable
  // pointer tracking, and mouseleave never fires after a tap.

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var cards = document.querySelectorAll('.portfolio-card');

  cards.forEach(function (card) {
    var img       = card.querySelector('.card-image');
    // data-base-scale lets an image opt into a persistent zoom
    // (e.g. to crop canvas margins) that survives the parallax shift.
    var baseScale = img ? (parseFloat(img.dataset.baseScale) || 1) : 1;

    card.addEventListener('mousemove', function (e) {
      var r  = card.getBoundingClientRect();
      var x  = e.clientX - r.left;
      var y  = e.clientY - r.top;
      var cx = r.width  / 2;
      var cy = r.height / 2;

      var offsetX = ((x - cx) / cx) * 7;   // –7 … +7 px
      var offsetY = ((y - cy) / cy) * 5;   // –5 … +5 px

      // Card: lift only — no rotation so text stays flat and readable
      card.style.transition = 'box-shadow 0.15s ease';
      card.style.transform  = 'translateY(-4px)';
      card.style.boxShadow  = '0 20px 48px rgba(0,0,0,0.18)';

      // Image: shift opposite cursor for parallax depth
      if (img) {
        img.style.transition = 'transform 0.05s linear';
        img.style.transform  =
          'translate(' + (-offsetX * 0.8) + 'px, ' + (-offsetY * 0.8) + 'px) scale(' + (baseScale * 1.04) + ')';
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

}());
