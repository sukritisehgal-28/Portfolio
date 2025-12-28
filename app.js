const THEME_STORAGE_KEY = 'sukriti-theme-preference';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const root = document.documentElement;

const getStoredTheme = () => localStorage.getItem(THEME_STORAGE_KEY);

const applyTheme = (theme) => {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', resolved);
  document.body.dataset.theme = resolved;
  const toggles = document.querySelectorAll('[data-theme-toggle], [data-theme-toggle-footer]');
  toggles.forEach((btn) => {
    const label = btn.querySelector('.theme-label');
    if (label) {
      const nextThemeText = resolved === 'dark' ? 'Light' : 'Dark';
      label.textContent = `${nextThemeText} Mode`;
    }
    btn.setAttribute('aria-pressed', resolved === 'dark' ? 'true' : 'false');
  });
};

const initTheme = () => {
  const stored = getStoredTheme();
  if (stored) {
    applyTheme(stored);
  } else if (prefersDark.matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }
};

const toggleTheme = () => {
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
};

document.querySelectorAll('[data-theme-toggle], [data-theme-toggle-footer]').forEach((btn) => {
  btn.addEventListener('click', toggleTheme);
  btn.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleTheme();
    }
  });
});

initTheme();

const handlePrefChange = (event) => {
  if (!getStoredTheme()) {
    applyTheme(event.matches ? 'dark' : 'light');
  }
};

if (typeof prefersDark.addEventListener === 'function') {
  prefersDark.addEventListener('change', handlePrefChange);
} else if (typeof prefersDark.addListener === 'function') {
  prefersDark.addListener(handlePrefChange);
}

// smooth anchor scroll fallback for browsers without CSS support
const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
smoothScrollLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href');
    if (targetId.length > 1) {
      const target = document.querySelector(targetId);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// Hero typewriter animation
const heroTyped = document.querySelector('.typed');
if (heroTyped) {
  const text = heroTyped.dataset.typed || '';
  const caret = document.createElement('span');
  caret.className = 'typed-caret';
  caret.setAttribute('aria-hidden', 'true');
  const textNode = document.createTextNode('');
  heroTyped.textContent = '';
  heroTyped.append(textNode, caret);
  let index = 0;

  const typeNext = () => {
    if (index <= text.length) {
      textNode.textContent = text.slice(0, index);
      index += 1;
      setTimeout(typeNext, index < text.length ? 55 : 600);
    } else {
      heroTyped.classList.add('typed-complete');
      caret.remove();
    }
  };

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typeNext();
  } else {
    textNode.textContent = text;
    caret.remove();
  }
}

// Parallax hero background
const heroBackground = document.querySelector('.hero-background');
if (heroBackground && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.addEventListener('scroll', () => {
    const offset = window.scrollY * 0.2;
    heroBackground.style.transform = `translateY(${offset * -0.1}px) scale(${1.08 + offset / 2000})`;
  }, { passive: true });
}

// Intersection Observer for reveal animations
let registerAnimateElement = (element) => {
  if (element) {
    element.classList.add('is-visible');
  }
};

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -80px 0px' });

  registerAnimateElement = (element) => {
    if (element) {
      observer.observe(element);
    }
  };

  document.querySelectorAll('[data-animate]').forEach((element) => registerAnimateElement(element));
} else {
  document.querySelectorAll('[data-animate]').forEach((element) => element.classList.add('is-visible'));
}

// Project Slider functionality
const projectSlider = document.getElementById('project-slider');
const slides = document.querySelectorAll('.project-slide');
const prevBtn = document.querySelector('.slider-prev');
const nextBtn = document.querySelector('.slider-next');
const dots = document.querySelectorAll('.slider-dot');
let currentSlide = 0;
const totalSlides = slides.length;

const updateSlider = (index) => {
  // Update slides
  slides.forEach((slide, i) => {
    slide.classList.remove('active');
    if (i === index) {
      slide.classList.add('active');
      // Re-trigger animations for cards in the new slide
      slide.querySelectorAll('[data-animate]').forEach((el) => {
        el.classList.remove('is-visible');
        setTimeout(() => el.classList.add('is-visible'), 50);
      });
    }
  });

  // Update dots
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });

  // Update arrow states (optional visual feedback)
  if (prevBtn) prevBtn.style.opacity = index === 0 ? '0.5' : '1';
  if (nextBtn) nextBtn.style.opacity = index === totalSlides - 1 ? '0.5' : '1';
};

const goToSlide = (index) => {
  if (index < 0) index = totalSlides - 1;
  if (index >= totalSlides) index = 0;
  currentSlide = index;
  updateSlider(currentSlide);
};

const nextSlide = () => goToSlide(currentSlide + 1);
const prevSlide = () => goToSlide(currentSlide - 1);

// Event listeners for arrows
prevBtn?.addEventListener('click', prevSlide);
nextBtn?.addEventListener('click', nextSlide);

// Event listeners for dots
dots.forEach((dot) => {
  dot.addEventListener('click', () => {
    const slideIndex = parseInt(dot.dataset.slide, 10);
    goToSlide(slideIndex);
  });
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.target.closest('.project-slider-container')) {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  }
});

// Touch/swipe support
let touchStartX = 0;
let touchEndX = 0;

projectSlider?.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

projectSlider?.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) nextSlide();
    else prevSlide();
  }
}, { passive: true });

// Initialize slider
updateSlider(0);

// Contact form handling with Formspree
const form = document.querySelector('[data-form]');
const feedback = form?.querySelector('.form-feedback');
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mzzjolzp';

const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  const formData = new FormData(form);

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      body: formData
    });

    if (response.ok) {
      form.reset();
      if (feedback) {
        feedback.textContent = 'Message sent successfully! I will get back to you soon.';
      }
      showToast('Message sent successfully!', 'success');
    } else {
      throw new Error('Form submission failed');
    }
  } catch (error) {
    console.error(error);
    if (feedback) {
      feedback.textContent = 'There was an issue sending your message. Please email sukritisehgal2800@gmail.com.';
    }
    showToast('Unable to send message. Please email directly.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});

// Footer year
const yearEl = document.getElementById('current-year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Floating Tags - Drag & Click Functionality
const floatingTags = document.querySelectorAll('.floating-tag');

floatingTags.forEach((tag) => {
  let isDragging = false;
  let startX, startY, offsetX, offsetY;
  let clickStartTime, clickStartX, clickStartY;

  // Mouse/Touch down
  const handleStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    clickStartTime = Date.now();
    clickStartX = clientX;
    clickStartY = clientY;

    isDragging = false;
    const rect = tag.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    startX = rect.left;
    startY = rect.top;

    tag.style.transition = 'none';
  };

  // Mouse/Touch move
  const handleMove = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = Math.abs(clientX - clickStartX);
    const deltaY = Math.abs(clientY - clickStartY);

    // If moved more than 5px, consider it a drag
    if (deltaX > 5 || deltaY > 5) {
      isDragging = true;
      tag.classList.add('dragging');

      const heroRect = tag.closest('.hero').getBoundingClientRect();
      let newX = clientX - heroRect.left - offsetX;
      let newY = clientY - heroRect.top - offsetY;

      // Boundary constraints
      const maxX = heroRect.width - tag.offsetWidth;
      const maxY = heroRect.height - tag.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      tag.style.left = `${newX}px`;
      tag.style.top = `${newY}px`;
      tag.style.setProperty('--x', `${newX}px`);
      tag.style.setProperty('--y', `${newY}px`);
    }
  };

  // Mouse/Touch up
  const handleEnd = (e) => {
    tag.classList.remove('dragging');
    tag.style.transition = '';

    const clickDuration = Date.now() - clickStartTime;

    // If released quickly and didn't move much, treat as click
    if (!isDragging && clickDuration < 300) {
      const keyword = tag.dataset.keyword;
      const target = tag.dataset.target;

      if (keyword && target === 'projects') {
        // Scroll to projects section
        const projectsSection = document.getElementById('projects');
        if (projectsSection) {
          projectsSection.scrollIntoView({ behavior: 'smooth' });

          // Highlight matching projects after scroll
          setTimeout(() => {
            const allProjects = document.querySelectorAll('.project-card');
            allProjects.forEach((card) => {
              const keywords = card.dataset.keywords || '';
              if (keywords.toLowerCase().includes(keyword.toLowerCase())) {
                // Add highlight effect
                card.style.transform = 'scale(1.05)';
                card.style.boxShadow = '0 12px 40px rgba(116, 162, 255, 0.4)';
                card.style.border = '2px solid var(--accent)';

                // Remove highlight after 2 seconds
                setTimeout(() => {
                  card.style.transform = '';
                  card.style.boxShadow = '';
                  card.style.border = '';
                }, 2000);
              }
            });
          }, 800);
        }
      }
    }

    isDragging = false;
  };

  // Mouse events
  tag.addEventListener('mousedown', handleStart);
  document.addEventListener('mousemove', (e) => {
    if (tag.classList.contains('dragging')) {
      handleMove(e);
    }
  });
  document.addEventListener('mouseup', handleEnd);

  // Touch events
  tag.addEventListener('touchstart', handleStart, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (tag.classList.contains('dragging')) {
      handleMove(e);
    }
  }, { passive: true });
  document.addEventListener('touchend', handleEnd);
});
