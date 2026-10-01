/* ==========================================================================
   Namyanzi Edwards · Portfolio script (vanilla JS, no dependencies)

   1. Mobile nav menu
   2. Highlight the nav link for the section in view
   3. Galleries: clickable images, "View all" toggle past 6 images
   4. Lightbox: Esc or click outside to close, arrow keys to navigate
   5. Image placeholders: show a gray labeled box if a file is missing
   ========================================================================== */
(function () {
  'use strict';

  /* 1. Mobile nav menu ---------------------------------------------------- */
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('nav-menu');

  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close after choosing a section
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* 2. Active nav link ---------------------------------------------------- */
  const navLinks = Array.from(document.querySelectorAll('.nav__list a[href^="#"]'));

  if ('IntersectionObserver' in window && navLinks.length) {
    const linkFor = new Map(navLinks.map((a) => [a.hash.slice(1), a]));

    // A section counts as "current" when it crosses the middle of the viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.removeAttribute('aria-current'));
        const link = linkFor.get(entry.target.id);
        if (link) link.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    linkFor.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* 3. Galleries ----------------------------------------------------------
     Markup contract (see index.html): a [data-gallery] element containing
     figure.gallery__item > .ph > img, plus an optional figcaption.
     Adding a photo means adding one more figure; no JS changes needed. */
  const VISIBLE_LIMIT = 6;
  const lightbox = document.getElementById('lightbox');
  const canUseLightbox = lightbox && typeof lightbox.showModal === 'function';

  document.querySelectorAll('[data-gallery]').forEach((gallery, galleryIndex) => {
    const items = Array.from(gallery.querySelectorAll('.gallery__item'));

    items.forEach((item) => {
      const img = item.querySelector('.ph img');
      if (!img || !canUseLightbox) return;

      // Wrap the image in a button so it is keyboard accessible.
      // It stays disabled until the image loads, so placeholders are skipped.
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery__btn';
      button.disabled = true;
      button.setAttribute('aria-label', 'View larger: ' + (img.alt || 'photo'));
      img.replaceWith(button);
      button.appendChild(img);

      button.addEventListener('click', () => {
        // Navigate only between images that actually loaded
        const loaded = items.filter((i) => i.querySelector('.ph.is-loaded'));
        openLightbox(loaded, loaded.indexOf(item), button);
      });
    });

    // Show the first 6; put the rest behind a toggle. Hidden lazy images
    // are not downloaded until revealed.
    if (items.length > VISIBLE_LIMIT) {
      const extra = items.slice(VISIBLE_LIMIT);
      const collapsedLabel = 'View all ' + items.length + ' photos';
      if (!gallery.id) gallery.id = 'gallery-' + galleryIndex;

      extra.forEach((item) => { item.hidden = true; });

      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'gallery__toggle';
      more.textContent = collapsedLabel;
      more.setAttribute('aria-expanded', 'false');
      more.setAttribute('aria-controls', gallery.id);

      more.addEventListener('click', () => {
        const expand = more.getAttribute('aria-expanded') !== 'true';
        extra.forEach((item) => { item.hidden = !expand; });
        more.setAttribute('aria-expanded', String(expand));
        more.textContent = expand ? 'Show fewer' : collapsedLabel;
      });

      gallery.after(more);
    }
  });

  /* 4. Lightbox ----------------------------------------------------------- */
  const state = { items: [], index: 0, returnFocus: null };
  let showImage = () => {};

  function openLightbox(items, index, opener) {
    if (!canUseLightbox || index < 0 || !items.length) return;
    state.items = items;
    state.returnFocus = opener;
    showImage(index);
    lightbox.showModal();
    document.body.classList.add('lightbox-open');
  }

  if (canUseLightbox) {
    const lbImg = lightbox.querySelector('.lightbox__img');
    const lbCaption = lightbox.querySelector('.lightbox__caption');
    const lbCount = lightbox.querySelector('.lightbox__count');
    const prevBtn = lightbox.querySelector('.lightbox__prev');
    const nextBtn = lightbox.querySelector('.lightbox__next');
    const closeBtn = lightbox.querySelector('.lightbox__close');

    showImage = (index) => {
      const count = state.items.length;
      state.index = (index + count) % count; // wrap around at both ends

      const item = state.items[state.index];
      const img = item.querySelector('img');
      const caption = item.querySelector('figcaption');

      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCaption.textContent = caption ? caption.textContent.trim() : '';
      lbCount.textContent = (state.index + 1) + ' / ' + count;

      const single = count < 2;
      prevBtn.hidden = single;
      nextBtn.hidden = single;
      lbCount.hidden = single;
    };

    prevBtn.addEventListener('click', () => showImage(state.index - 1));
    nextBtn.addEventListener('click', () => showImage(state.index + 1));
    closeBtn.addEventListener('click', () => lightbox.close());

    // Esc is handled natively by <dialog>; arrows are handled here
    lightbox.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(state.index - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); showImage(state.index + 1); }
    });

    // Clicking anywhere except the image, caption, or controls closes it
    lightbox.addEventListener('click', (event) => {
      if (!event.target.closest('.lightbox__img, .lightbox__caption, .lightbox__btn')) {
        lightbox.close();
      }
    });

    lightbox.addEventListener('close', () => {
      document.body.classList.remove('lightbox-open');
      lbImg.removeAttribute('src');
      if (state.returnFocus) state.returnFocus.focus();
    });
  }

  /* 5. Image placeholders --------------------------------------------------
     Each .ph frame shows its gray data-label box until its image loads.
     Missing files get .is-missing, which hides the <img> (no broken icon). */
  function watchImage(img) {
    const frame = img.closest('.ph');
    if (!frame) return;

    const settle = (ok) => {
      frame.classList.add(ok ? 'is-loaded' : 'is-missing');
      const button = frame.querySelector('.gallery__btn');
      if (button) button.disabled = !ok;
    };

    // The image may have finished (or failed) before this script ran.
    // Some browsers report lazy images that haven't started as "complete",
    // so only treat a lazy image as missing once its error event fires.
    // Until then it stays invisible (opacity 0) over the placeholder.
    if (img.complete && img.naturalWidth > 0) {
      settle(true);
    } else if (img.complete && img.loading !== 'lazy') {
      settle(false);
    } else {
      img.addEventListener('load', () => settle(true), { once: true });
      img.addEventListener('error', () => settle(false), { once: true });
    }
  }

  document.querySelectorAll('.ph img').forEach(watchImage);
})();
