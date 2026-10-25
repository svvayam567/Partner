// ==========================================================================
// WHATSAPP PARTNER APPLICATION CONFIGURATION
// Single place to edit WhatsApp phone number and pre-filled message
// ==========================================================================
const WHATSAPP_CONFIG = {
  phone: '917416834010',
  text: 'I am interested in partnering with Svvayam Pooja Rooms'
};

const WHATSAPP_PARTNER_URL = `https://wa.me/${WHATSAPP_CONFIG.phone}?text=${encodeURIComponent(WHATSAPP_CONFIG.text)}`;

// Sync any element marked with data-whatsapp-partner
document.querySelectorAll('a[data-whatsapp-partner]').forEach((link) => {
  link.href = WHATSAPP_PARTNER_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
});

document.body.classList.add('js');
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('ready')));
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.06 });

document.querySelectorAll('section:not(.exceptional-homes):not(.media-slider),.include,.step,.video-card').forEach((e) => {
  e.classList.add('reveal');
  observer.observe(e);
});

const menu = document.querySelector('.menu-toggle');
if (menu) {
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    const nav = document.querySelector('nav');
    if (nav) nav.classList.toggle('open', open);
  });
  document.querySelectorAll('nav a').forEach((a) => {
    a.addEventListener('click', () => {
      menu.setAttribute('aria-expanded', 'false');
      const nav = document.querySelector('nav');
      if (nav) nav.classList.remove('open');
    });
  });
}

const progressBar = document.querySelector('.progress');
if (progressBar) {
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
  }, { passive: true });
}

fetch('/content.json')
  .then((r) => {
    if (!r.ok) throw new Error('Failed to fetch content');
    return r.json();
  })
  .then((data) => {
    if (data && Array.isArray(data.stories)) {
      document.querySelectorAll('[data-story]').forEach((card, i) => {
        if (data.stories[i]) {
          const b = card.querySelector('b');
          if (b) b.textContent = data.stories[i].name;
          const f = card.querySelector('iframe');
          if (f) {
            const src = 'https://www.youtube-nocookie.com/embed/' + data.stories[i].video + '?rel=0';
            if (f.getAttribute('src') !== src) f.src = src;
          }
        }
      });
    }
  })
  .catch((err) => {
    console.warn('Content hydration notice:', err);
  });

// Slider video playback management: pause offscreen videos to save resources
const sliderVideos = document.querySelectorAll('.media-slider video');
if (sliderVideos.length > 0 && 'IntersectionObserver' in window) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.05 });

  sliderVideos.forEach((v) => videoObserver.observe(v));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sliderVideos.forEach((v) => v.pause());
    } else {
      sliderVideos.forEach((v) => {
        const rect = v.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          v.play().catch(() => {});
        }
      });
    }
  });
}

// ==========================================================================
// SHARED INFINITE DRAGGABLE SLIDER ENGINE
// ==========================================================================
function createInfiniteDraggableSlider({
  container,
  track,
  direction = 1,
  autoSpeed = 0.5,
  getSetWidth,
  onUpdate = null,
  onInit = null
}) {
  if (!container || !track) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed = prefersReduced ? 0 : Math.abs(autoSpeed);
  const dir = direction >= 0 ? 1 : -1;

  let setWidth = 0;
  let currentX = 0;
  let isPointerDown = false;
  let isDragging = false;
  let hasDragged = false;
  let hasLockedAxis = false;
  let isHorizontal = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocityX = 0;
  let isInteracting = false;
  let momentumTimer = null;
  let animFrameId = null;

  function measure() {
    setWidth = getSetWidth ? getSetWidth() : 0;
    if (setWidth <= 0) return;
    if (currentX === 0) {
      currentX = -setWidth;
    }
    applyTransform();
    if (onUpdate) onUpdate(currentX, setWidth);
  }

  function applyTransform() {
    if (setWidth <= 0) return;
    while (currentX <= -2 * setWidth) {
      currentX += setWidth;
    }
    while (currentX >= 0) {
      currentX -= setWidth;
    }
    track.style.transform = `translate3d(${currentX}px, 0, 0)`;
  }

  function tick() {
    if (!isInteracting && speed > 0 && !document.hidden && setWidth > 0) {
      currentX += dir * speed;
      applyTransform();
      if (onUpdate) onUpdate(currentX, setWidth);
    }
    animFrameId = requestAnimationFrame(tick);
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    isPointerDown = true;
    isDragging = false;
    hasDragged = false;
    hasLockedAxis = false;
    isHorizontal = false;
    isInteracting = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    lastX = startX;
    lastTime = performance.now();
    velocityX = 0;
    if (momentumTimer) {
      cancelAnimationFrame(momentumTimer);
      momentumTimer = null;
    }
  }

  function onPointerMove(e) {
    if (!isPointerDown) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const dx = clientX - lastX;
    const totalDx = clientX - startX;
    const totalDy = clientY - startY;

    if (!hasLockedAxis) {
      if (Math.abs(totalDx) > 6 || Math.abs(totalDy) > 6) {
        hasLockedAxis = true;
        if (Math.abs(totalDx) >= Math.abs(totalDy)) {
          isHorizontal = true;
        } else {
          isHorizontal = false;
          isPointerDown = false;
          isInteracting = false;
          return;
        }
      } else {
        return;
      }
    }

    if (!isHorizontal) return;

    if (e.cancelable) e.preventDefault();
    isDragging = true;
    hasDragged = true;
    container.classList.add('is-dragging');

    const now = performance.now();
    const dt = Math.max(now - lastTime, 1);
    velocityX = dx / dt;
    lastX = clientX;
    lastTime = now;

    currentX += dx;
    applyTransform();
    if (onUpdate) onUpdate(currentX, setWidth);
  }

  function onPointerUp() {
    if (!isPointerDown && !isDragging) return;
    isPointerDown = false;
    container.classList.remove('is-dragging');

    if (isDragging) {
      let momentumSpeed = velocityX * 16;
      isDragging = false;

      function momentum() {
        if (Math.abs(momentumSpeed) > 0.35) {
          currentX += momentumSpeed;
          momentumSpeed *= 0.92;
          applyTransform();
          if (onUpdate) onUpdate(currentX, setWidth);
          momentumTimer = requestAnimationFrame(momentum);
        } else {
          isInteracting = false;
          momentumTimer = null;
        }
      }
      momentum();
    } else {
      isInteracting = false;
    }
  }

  container.addEventListener('dragstart', (e) => e.preventDefault());
  container.addEventListener('click', (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  container.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);

  container.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);
  window.addEventListener('touchcancel', onPointerUp);

  window.addEventListener('resize', measure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else {
      animFrameId = requestAnimationFrame(tick);
    }
  });

  if (onInit) {
    onInit({
      step(delta) {
        isInteracting = true;
        if (momentumTimer) cancelAnimationFrame(momentumTimer);
        const targetX = currentX + delta;
        const start = currentX;
        const diff = targetX - start;
        const startTime = performance.now();
        const duration = 400;

        function animateStep(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          currentX = start + diff * ease;
          applyTransform();
          if (onUpdate) onUpdate(currentX, setWidth);
          if (progress < 1) {
            momentumTimer = requestAnimationFrame(animateStep);
          } else {
            isInteracting = false;
            momentumTimer = null;
          }
        }
        momentumTimer = requestAnimationFrame(animateStep);
      },
      getCurrentX: () => currentX,
      getSetWidth: () => setWidth
    });
  }

  measure();
  animFrameId = requestAnimationFrame(tick);
}

// 1. Hero / Manufacturing Section Media Slider Strip
const heroMediaSlider = document.querySelector('.media-slider');
if (heroMediaSlider) {
  const track = heroMediaSlider.querySelector('.slider-track');
  const existingSets = track.querySelectorAll('.slider-set');
  if (existingSets.length > 0 && existingSets.length < 3) {
    const cloneSet = existingSets[0].cloneNode(true);
    cloneSet.setAttribute('aria-hidden', 'true');
    track.appendChild(cloneSet);
  }

  createInfiniteDraggableSlider({
    container: heroMediaSlider,
    track,
    direction: 1, // Calm Left-to-Right continuous motion
    autoSpeed: 0.29, // ~17.5px/sec
    getSetWidth() {
      const firstSet = track.querySelector('.slider-set');
      return firstSet ? firstSet.getBoundingClientRect().width : 0;
    }
  });
}

// 2. About Section Craftsmen Slider
const craftsmenSlider = document.querySelector('.craftsmen-showcase');
if (craftsmenSlider) {
  const viewport = craftsmenSlider.querySelector('.craftsmen-viewport');
  const track = craftsmenSlider.querySelector('.craftsmen-track');
  const prevBtn = craftsmenSlider.querySelector('.craftsmen-prev');
  const nextBtn = craftsmenSlider.querySelector('.craftsmen-next');
  const dots = craftsmenSlider.querySelectorAll('.craftsmen-dot');

  const canonicalSlides = Array.from(track.querySelectorAll('.craftsmen-slide'));
  const totalSlides = canonicalSlides.length;

  if (track.querySelectorAll('.craftsmen-slide').length === totalSlides) {
    const set1 = canonicalSlides.map((s) => {
      const c = s.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      return c;
    });
    const set3 = canonicalSlides.map((s) => {
      const c = s.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      return c;
    });
    set1.forEach((c) => track.insertBefore(c, canonicalSlides[0]));
    set3.forEach((c) => track.appendChild(c));
  }

  let controller = null;

  createInfiniteDraggableSlider({
    container: viewport,
    track,
    direction: -1, // Right-to-Left motion
    autoSpeed: 0.65, // ~40px/sec
    getSetWidth() {
      const firstSlide = track.querySelector('.craftsmen-slide');
      if (!firstSlide) return 0;
      const slideRect = firstSlide.getBoundingClientRect();
      const trackStyle = window.getComputedStyle(track);
      const gap = parseFloat(trackStyle.gap) || 16;
      return totalSlides * (slideRect.width + gap);
    },
    onUpdate(currentX, setWidth) {
      if (setWidth <= 0) return;
      const firstSlide = track.querySelector('.craftsmen-slide');
      if (!firstSlide) return;
      const slideWidth = firstSlide.getBoundingClientRect().width;
      const trackStyle = window.getComputedStyle(track);
      const gap = parseFloat(trackStyle.gap) || 16;
      const step = slideWidth + gap;
      const offsetInSet = (-currentX) % setWidth;
      let activeIdx = Math.round(offsetInSet / step) % totalSlides;
      if (activeIdx < 0) activeIdx += totalSlides;

      dots.forEach((dot, idx) => {
        const isActive = idx === activeIdx;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    },
    onInit(api) {
      controller = api;
    }
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!controller) return;
      const firstSlide = track.querySelector('.craftsmen-slide');
      const step = firstSlide ? firstSlide.getBoundingClientRect().width + 16 : 300;
      controller.step(step);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!controller) return;
      const firstSlide = track.querySelector('.craftsmen-slide');
      const step = firstSlide ? firstSlide.getBoundingClientRect().width + 16 : 300;
      controller.step(-step);
    });
  }
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      if (!controller) return;
      const firstSlide = track.querySelector('.craftsmen-slide');
      const step = firstSlide ? firstSlide.getBoundingClientRect().width + 16 : 300;
      const setW = controller.getSetWidth();
      const currentX = controller.getCurrentX();
      const currentNorm = ((-currentX) % setW) / step;
      let diffSlides = idx - (currentNorm % totalSlides);
      if (diffSlides > totalSlides / 2) diffSlides -= totalSlides;
      if (diffSlides < -totalSlides / 2) diffSlides += totalSlides;
      controller.step(-diffSlides * step);
    });
  });
  viewport.addEventListener('keydown', (e) => {
    if (!controller) return;
    const firstSlide = track.querySelector('.craftsmen-slide');
    const step = firstSlide ? firstSlide.getBoundingClientRect().width + 16 : 300;
    if (e.key === 'ArrowRight') controller.step(-step);
    else if (e.key === 'ArrowLeft') controller.step(step);
  });
}

// Materials Card Slideshow Controller (every 3 seconds auto-advance, swipe, dots)
const materialCards = document.querySelectorAll('.material-card[data-slideshow]');
if (materialCards.length > 0) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  materialCards.forEach((card) => {
    const slides = card.querySelectorAll('.slideshow-slide');
    const dots = card.querySelectorAll('.slideshow-dot');
    if (slides.length <= 1) return;

    let currentSlide = 0;
    let timer = null;

    function preloadNext(index) {
      const nextIdx = (index + 1) % slides.length;
      const nextSlide = slides[nextIdx];
      if (nextSlide) {
        const img = nextSlide.querySelector('img');
        if (img && img.loading === 'lazy') {
          img.loading = 'eager';
        }
      }
    }

    function showSlide(index) {
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const isActive = i === currentSlide;
        slide.classList.toggle('active', isActive);
      });
      dots.forEach((dot, i) => {
        const isActive = i === currentSlide;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      preloadNext(currentSlide);
    }

    function startTimer() {
      if (prefersReduced) return;
      stopTimer();
      timer = setInterval(() => {
        if (!document.hidden) {
          showSlide(currentSlide + 1);
        }
      }, 3000);
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    // Dots navigation
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-slide'), 10);
        showSlide(idx);
        startTimer();
      });
    });

    // Touch swipe support
    const slideshow = card.querySelector('.material-slideshow');
    if (slideshow) {
      let touchStartX = 0;
      let touchStartY = 0;

      slideshow.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      slideshow.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
          if (diffX > 0) {
            showSlide(currentSlide + 1);
          } else {
            showSlide(currentSlide - 1);
          }
          startTimer();
        }
      }, { passive: true });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    });

    preloadNext(0);
    startTimer();
  });
}
