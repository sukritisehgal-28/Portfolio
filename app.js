/**
 * Sukriti Sehgal Portfolio - Main JavaScript
 * Enhanced with custom cursor, scroll animations, and interactive effects
 */

// ================================================================
// THEME MANAGEMENT
// ================================================================

const THEME_STORAGE_KEY = 'sukriti-theme-preference';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const root = document.documentElement;

const getStoredTheme = () => localStorage.getItem(THEME_STORAGE_KEY);

const applyTheme = (theme) => {
  const resolved = theme === 'light' ? 'light' : 'dark';
  root.setAttribute('data-theme', resolved);
  document.body.dataset.theme = resolved;

  // Update theme color meta tag
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.content = resolved === 'dark' ? '#030014' : '#f8fafc';
  }

  const toggles = document.querySelectorAll('[data-theme-toggle], [data-theme-toggle-footer]');
  toggles.forEach((btn) => {
    const label = btn.querySelector('.theme-label');
    if (label) {
      label.textContent = resolved === 'dark' ? 'Light' : 'Dark';
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
    applyTheme('dark'); // Default to dark for cosmic theme
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
});

initTheme();

// Listen for system theme changes
prefersDark.addEventListener('change', (e) => {
  if (!getStoredTheme()) {
    applyTheme(e.matches ? 'dark' : 'light');
  }
});

// ================================================================
// LOADING SCREEN
// ================================================================

window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 500);
    }, 500);
  }
});

// ================================================================
// CUSTOM CURSOR
// ================================================================

const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');

if (cursor && cursorDot && window.matchMedia('(hover: hover)').matches) {
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Dot follows immediately
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
  });

  // Smooth cursor following animation
  const animateCursor = () => {
    const dx = mouseX - cursorX;
    const dy = mouseY - cursorY;

    cursorX += dx * 0.15;
    cursorY += dy * 0.15;

    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';

    requestAnimationFrame(animateCursor);
  };
  animateCursor();

  // Hover effects
  const interactiveElements = document.querySelectorAll('a, button, input, textarea, [data-magnetic]');

  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
  });

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    cursorDot.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
    cursorDot.style.opacity = '1';
  });
}

// ================================================================
// HEADER SCROLL EFFECT
// ================================================================

const header = document.querySelector('.site-header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;

  if (currentScroll > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }

  lastScroll = currentScroll;
}, { passive: true });

// ================================================================
// MOBILE MENU
// ================================================================

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const siteNav = document.getElementById('site-nav');

if (mobileMenuBtn && siteNav) {
  mobileMenuBtn.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    mobileMenuBtn.classList.toggle('active', isOpen);
    mobileMenuBtn.setAttribute('aria-expanded', isOpen);

    // Prevent body scroll when menu is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close menu when clicking a link
  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('open');
      mobileMenuBtn.classList.remove('active');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

// ================================================================
// SMOOTH SCROLL
// ================================================================

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href');
    if (targetId.length > 1) {
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// ================================================================
// ACTIVE NAV HIGHLIGHT
// ================================================================

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.site-nav a');

const highlightNav = () => {
  const scrollPos = window.scrollY + 150;

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const sectionId = section.getAttribute('id');

    if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
      navLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
          link.classList.add('active');
        }
      });
    }
  });
};

window.addEventListener('scroll', highlightNav, { passive: true });
highlightNav();

// ================================================================
// TYPEWRITER EFFECT
// ================================================================

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
      setTimeout(typeNext, index < text.length ? 50 : 1000);
    } else {
      heroTyped.classList.add('typed-complete');
      // Keep caret blinking
    }
  };

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTimeout(typeNext, 800); // Delay start for effect
  } else {
    textNode.textContent = text;
    caret.remove();
  }
}

// ================================================================
// SCROLL REVEAL ANIMATIONS
// ================================================================

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -80px 0px'
};

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('[data-animate]').forEach((el) => {
    observer.observe(el);
  });
} else {
  // Fallback: show all elements
  document.querySelectorAll('[data-animate]').forEach((el) => {
    el.classList.add('is-visible');
  });
}

// ================================================================
// MAGNETIC BUTTON EFFECT
// ================================================================

document.querySelectorAll('[data-magnetic]').forEach((btn) => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

// ================================================================
// CONTACT FORM
// ================================================================

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
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span> Sending...';

  const formData = new FormData(form);

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    });

    if (response.ok) {
      form.reset();
      if (feedback) {
        feedback.textContent = 'Message sent successfully! I will get back to you soon.';
        feedback.style.color = '#22c55e';
      }
      showToast('Message sent successfully!', 'success');
    } else {
      throw new Error('Form submission failed');
    }
  } catch (error) {
    console.error(error);
    if (feedback) {
      feedback.textContent = 'There was an issue sending your message. Please email sukritisehgal2800@gmail.com.';
      feedback.style.color = '#ef4444';
    }
    showToast('Unable to send message. Please email directly.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
});

// ================================================================
// FOOTER YEAR
// ================================================================

const yearEl = document.getElementById('current-year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ================================================================
// 3D TILT EFFECT FOR PROJECT CARDS
// ================================================================

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;

      card.style.transform = `
        perspective(1000px) 
        rotateX(${rotateX}deg) 
        rotateY(${rotateY}deg) 
        translateY(-10px) 
        scale(1.02)
      `;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ================================================================
// PARALLAX EFFECT FOR HERO ORBS
// ================================================================

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const orbs = document.querySelectorAll('.hero-orb');

  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX - window.innerWidth / 2) / 50;
    const y = (e.clientY - window.innerHeight / 2) / 50;

    orbs.forEach((orb, index) => {
      const factor = (index + 1) * 0.5;
      orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
    });
  });
}

// ================================================================
// KEYBOARD NAVIGATION ENHANCEMENTS
// ================================================================

document.addEventListener('keydown', (e) => {
  // Skip to main content on Tab
  if (e.key === 'Tab' && !e.shiftKey && document.activeElement === document.body) {
    const skipLink = document.querySelector('[href="#main"]');
    if (skipLink) {
      skipLink.focus();
    }
  }

  // Close mobile menu on Escape
  if (e.key === 'Escape' && siteNav?.classList.contains('open')) {
    siteNav.classList.remove('open');
    mobileMenuBtn?.classList.remove('active');
    mobileMenuBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
});

// ================================================================
// PERFORMANCE: PAUSE ANIMATIONS WHEN PAGE NOT VISIBLE
// ================================================================

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    document.body.classList.add('page-hidden');
  } else {
    document.body.classList.remove('page-hidden');
  }
});
