/**
 * Abhay Maddheshiya - Portfolio Interactivity & Contact Form Controller
 */

// Page Loader
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 800);
  }
});

// Top Scroll Progress Bar
(() => {
  const progressBar = document.createElement('div');
  progressBar.id = 'scroll-bar';
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const doc = document.documentElement;
    const scrollPercentage = (window.scrollY / (doc.scrollHeight - doc.clientHeight)) * 100;
    progressBar.style.width = `${scrollPercentage}%`;
  }, { passive: true });
})();

// Background Particle Canvas Animation
(() => {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  const particles = [];

  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function createParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.45 + 0.1,
      hue: [260, 200, 320][Math.floor(Math.random() * 3)],
      phase: Math.random() * Math.PI * 2
    };
  }

  for (let i = 0; i < 110; i++) {
    particles.push(createParticle());
  }

  let time = 0;
  function renderParticles() {
    time += 0.007;
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -4) p.x = width + 4;
      if (p.x > width + 4) p.x = -4;
      if (p.y < -4) p.y = height + 4;
      if (p.y > height + 4) p.y = -4;

      const dynamicAlpha = p.alpha * (0.65 + 0.35 * Math.sin(time + p.phase));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 75%, 68%, ${dynamicAlpha})`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(120, 80, 220, ${0.08 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(renderParticles);
  }
  renderParticles();
})();

// Typewriter Hero Animation
(() => {
  const typewriterElement = document.getElementById('typewriter');
  if (!typewriterElement) return;

  const words = ['Software Developer', 'Full-Stack Engineer', 'Problem Solver', 'BTech Student', 'Open Source Enthusiast'];
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeStep() {
    const currentWord = words[wordIndex];

    if (!isDeleting) {
      charIndex++;
      typewriterElement.textContent = currentWord.slice(0, charIndex);

      if (charIndex === currentWord.length) {
        isDeleting = true;
        return setTimeout(typeStep, 1800);
      }
      setTimeout(typeStep, 80);
    } else {
      charIndex--;
      typewriterElement.textContent = currentWord.slice(0, charIndex);

      if (charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
      }
      setTimeout(typeStep, 45);
    }
  }

  setTimeout(typeStep, 1500);
})();

// Theme Toggle (Dark / Light)
(() => {
  const toggleBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'dark';

  root.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const currentTheme = root.getAttribute('data-theme');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    root.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    updateThemeIcon(nextTheme);

    toggleBtn.style.transform = 'rotate(180deg) scale(0.85)';
    setTimeout(() => toggleBtn.style.transform = '', 300);
  });

  function updateThemeIcon(theme) {
    if (!toggleBtn) return;
    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }
})();

// Navigation Scroll State & Mobile Drawer Toggle
(() => {
  const navbar = document.getElementById('navbar');
  const backToTopBtn = document.getElementById('back-to-top');

  function handleScroll() {
    const scrollY = window.scrollY;

    if (navbar) {
      navbar.classList.toggle('scrolled', scrollY > 70);
    }

    const sections = document.querySelectorAll('section[id]');
    let currentSection = '';

    sections.forEach(sec => {
      if (scrollY >= sec.offsetTop - 240) {
        currentSection = sec.id;
      }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === `#${currentSection}`);
    });

    if (backToTopBtn) {
      backToTopBtn.classList.toggle('show', scrollY > 400);
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile Menu Navigation
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('active');
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
      }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      });
    });
  }
})();

// Smooth Anchor Link Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Scroll Reveal Animations
(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-up, .fade-left, .fade-right').forEach(el => observer.observe(el));

  // Staggered Cards Animation
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const cards = entry.target.querySelectorAll('.project-card, .experience-card');
      cards.forEach((card, index) => {
        setTimeout(() => card.classList.add('visible'), index * 100);
      });
      cardObserver.unobserve(entry.target);
    });
  }, { threshold: 0.05 });

  const projectGrid = document.querySelector('.projects-grid');
  const experienceContainer = document.querySelector('.experience-container');
  if (projectGrid) cardObserver.observe(projectGrid);
  if (experienceContainer) cardObserver.observe(experienceContainer);

  // Skill Bar Animation
  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll('.skill-progress').forEach((bar, index) => {
        setTimeout(() => {
          bar.style.width = `${bar.getAttribute('data-width')}%`;
        }, index * 100);
      });
      skillObserver.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  const skillGrid = document.querySelector('.skills-grid');
  if (skillGrid) skillObserver.observe(skillGrid);

  // Animated Stat Counters
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.getAttribute('data-count'), 10);
        let count = 0;
        const step = Math.ceil(target / 30);
        const timer = setInterval(() => {
          count = Math.min(count + step, target);
          el.textContent = `${count}+`;
          if (count >= target) clearInterval(timer);
        }, 45);
      });
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) counterObserver.observe(heroStats);
})();

// Mouse Hover Effect & 3D Tilt on Project Cards
document.querySelectorAll('.project-card, .experience-card, .glowcard').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  });
});

document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    card.style.transform = `translateY(-10px) rotateY(${dx * 5}deg) rotateX(${-dy * 5}deg) scale(1.01)`;
  });
  card.addEventListener('mouseleave', () => card.style.transform = '');
});

// Contact Form Handling (FormSubmit + Web3Forms Fallback + Node Backend Support)
(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const WEB3FORMS_KEY = (window.WEB3FORMS_KEY || 'a702fd7f-2f49-4e03-b687-e9e7688397f7').trim();

  function sendWeb3Forms(submitBtn) {
    const formData = new FormData(form);
    if (!formData.get('access_key')) {
      formData.append('access_key', WEB3FORMS_KEY);
    }

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          showToast('✅ Message sent! Check your Gmail inbox.', 'success');
          form.reset();
        } else {
          showToast(`❌ Delivery error: ${res.message || 'Failed to deliver email.'}`, 'error');
        }
      })
      .catch(err => {
        console.error('[Web3Forms Error]', err);
        showToast('❌ Email delivery error. Please try again.', 'error');
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        }
      });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const name = (document.getElementById('contactName') || {}).value || '';
    const email = (document.getElementById('contactEmail') || {}).value || '';
    const subject = (document.getElementById('contactSubject') || {}).value || '';
    const message = (document.getElementById('contactMessage') || {}).value || '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    }

    // Persist to local Node.js backend if active (skip static dev servers)
    const port = window.location.port;
    const hostname = window.location.hostname;
    const isStaticHost = port === '5500' || port === '5501' || port === '8080' || hostname.endsWith('github.io') || window.location.protocol === 'file:';

    if (!isStaticHost) {
      fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      }).catch(err => console.warn('Backend persistence notice:', err));
    }

    // Deliver via FormSubmit API targeting recipient address
    fetch('https://formsubmit.co/ajax/abhaymaddheshiya159@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        _subject: subject || `Portfolio Contact Message from ${name}`,
        message
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success === 'true' || res.success === true) {
          showToast('✅ Message sent! Delivered directly to your Gmail inbox.', 'success');
          form.reset();
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
          }
        } else if (res.message && res.message.toLowerCase().includes('activation')) {
          showToast('⚠️ Form Activation Required! Please check abhaymaddheshiya159@gmail.com and click "Activate Form".', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
          }
        } else {
          sendWeb3Forms(submitBtn);
        }
      })
      .catch(err => {
        console.warn('[FormSubmit Notice - switching to Web3Forms]', err);
        sendWeb3Forms(submitBtn);
      });
  });
})();

// Toast Notification Manager
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('toast-in'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-in');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
