/**
 * Portfolio — Main Script
 * Hand-written, no frameworks, no AI patterns
 */

// ── Loader ──────────────────────────────────────────────────────
window.addEventListener('load', function () {
  var loader = document.getElementById('loader');
  setTimeout(function () {
    if (loader) loader.classList.add('hidden');
  }, 900);
});

// ── Scroll progress bar ──────────────────────────────────────────
(function () {
  var bar = document.createElement('div');
  bar.id = 'scroll-bar';
  document.body.appendChild(bar);
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var pct = (window.scrollY / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
})();

// ── Particles ────────────────────────────────────────────────────
(function () {
  var c = document.getElementById('particle-canvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W, H, pts = [];

  function resize() {
    W = c.width = window.innerWidth;
    H = c.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function mk() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
      r: Math.random() * 1.5 + .4,
      a: Math.random() * .45 + .1,
      hue: [260, 200, 320][Math.floor(Math.random() * 3)],
      ph: Math.random() * Math.PI * 2
    };
  }

  for (var i = 0; i < 120; i++) pts.push(mk());

  var t = 0;
  function draw() {
    t += .007;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -4) p.x = W + 4;
      if (p.x > W + 4) p.x = -4;
      if (p.y < -4) p.y = H + 4;
      if (p.y > H + 4) p.y = -4;
      var a = p.a * (.65 + .35 * Math.sin(t + p.ph));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + p.hue + ',75%,68%,' + a + ')';
      ctx.fill();
    }
    for (var i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = 'rgba(120,80,220,' + (.08 * (1 - d / 100)) + ')';
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Typewriter ───────────────────────────────────────────────────
(function () {
  var el = document.getElementById('typewriter');
  if (!el) return;
  var words = ['Software Developer', 'Full-Stack Engineer', 'Problem Solver', 'BTech Student', 'Open Source Enthusiast'];
  var wi = 0, ci = 0, del = false;

  function tick() {
    var w = words[wi];
    if (!del) {
      ci++;
      el.textContent = w.slice(0, ci);
      if (ci === w.length) { del = true; return setTimeout(tick, 1800); }
      setTimeout(tick, 82);
    } else {
      ci--;
      el.textContent = w.slice(0, ci);
      if (ci === 0) { del = false; wi = (wi + 1) % words.length; }
      setTimeout(tick, 46);
    }
  }
  setTimeout(tick, 1800);
})();

// ── Theme toggle ─────────────────────────────────────────────────
(function () {
  var btn = document.getElementById('theme-toggle');
  var html = document.documentElement;
  var saved = localStorage.getItem('theme') || 'dark';
  html.setAttribute('data-theme', saved);
  syncIcon(saved);

  if (!btn) return;
  btn.addEventListener('click', function () {
    var cur = html.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncIcon(next);
    btn.style.transform = 'rotate(180deg) scale(.8)';
    setTimeout(function () { btn.style.transform = ''; }, 300);
  });

  function syncIcon(t) {
    if (!btn) return;
    var ic = btn.querySelector('i');
    if (ic) ic.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
})();

// ── Navbar scroll + active link ──────────────────────────────────
(function () {
  var nav = document.getElementById('navbar');

  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
    var sections = document.querySelectorAll('section[id]');
    var cur = '';
    sections.forEach(function (s) {
      if (window.scrollY >= s.offsetTop - 240) cur = s.id;
    });
    document.querySelectorAll('.nav-link').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
    });
    var btt = document.getElementById('back-to-top');
    if (btt) btt.classList.toggle('show', window.scrollY > 400);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(onScroll);

  // Mobile menu
  var mBtn = document.getElementById('mobile-toggle');
  var menu = document.getElementById('nav-menu');
  if (mBtn && menu) {
    mBtn.addEventListener('click', function () {
      menu.classList.toggle('active');
      var ic = mBtn.querySelector('i');
      if (ic) ic.className = menu.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
    });
    document.querySelectorAll('.nav-link').forEach(function (l) {
      l.addEventListener('click', function () {
        menu.classList.remove('active');
        var ic = mBtn.querySelector('i');
        if (ic) ic.className = 'fas fa-bars';
      });
    });
  }
})();

// ── Smooth anchor ────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var t = document.querySelector(this.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ── Back to top ──────────────────────────────────────────────────
var btt = document.getElementById('back-to-top');
if (btt) {
  btt.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── IntersectionObserver reveals ────────────────────────────────
(function () {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-up, .fade-left, .fade-right').forEach(function (el) {
    io.observe(el);
  });

  // Staggered cards
  var cardIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.querySelectorAll('.project-card, .experience-card').forEach(function (card, i) {
        setTimeout(function () { card.classList.add('visible'); }, i * 110);
      });
      cardIO.unobserve(en.target);
    });
  }, { threshold: 0.05 });

  var pg = document.querySelector('.projects-grid');
  var ec = document.querySelector('.experience-container');
  if (pg) cardIO.observe(pg);
  if (ec) cardIO.observe(ec);

  // Skill bars
  var skillIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      document.querySelectorAll('.skill-progress').forEach(function (bar, i) {
        setTimeout(function () {
          bar.style.width = bar.getAttribute('data-width') + '%';
        }, i * 120);
      });
      skillIO.unobserve(en.target);
    });
  }, { threshold: 0.2 });

  var sg = document.querySelector('.skills-grid');
  if (sg) skillIO.observe(sg);

  // Counters
  var cntIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      document.querySelectorAll('[data-count]').forEach(function (el) {
        var target = parseInt(el.getAttribute('data-count'));
        var n = 0, step = Math.ceil(target / 32);
        var iv = setInterval(function () {
          n = Math.min(n + step, target);
          el.textContent = n + '+';
          if (n >= target) clearInterval(iv);
        }, 48);
      });
      cntIO.unobserve(en.target);
    });
  }, { threshold: 0.5 });

  var hs = document.querySelector('.hero-stats');
  if (hs) cntIO.observe(hs);
})();

// ── Card mouse glow ──────────────────────────────────────────────
document.querySelectorAll('.project-card, .experience-card, .glowcard').forEach(function (card) {
  card.addEventListener('mousemove', function (e) {
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
});

// ── 3D tilt on project cards ─────────────────────────────────────
document.querySelectorAll('.project-card').forEach(function (card) {
  card.addEventListener('mousemove', function (e) {
    var r = card.getBoundingClientRect();
    var dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    var dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    card.style.transform = 'translateY(-12px) rotateY(' + (dx * 6) + 'deg) rotateX(' + (-dy * 6) + 'deg) scale(1.02)';
  });
  card.addEventListener('mouseleave', function () { card.style.transform = ''; });
});

// ── Contact form ──────────────────────────────────────────────────
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var WEB3FORMS_KEY = (window.WEB3FORMS_KEY || 'a702fd7f-2f49-4e03-b687-e9e7688397f7').trim();

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var btn = form.querySelector('button[type="submit"]');
    var name = (document.getElementById('contactName') || {}).value || '';
    var email = (document.getElementById('contactEmail') || {}).value || '';
    var subject = (document.getElementById('contactSubject') || {}).value || '';
    var message = (document.getElementById('contactMessage') || {}).value || '';

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…'; }

    // 1. If running on Node.js backend server (port 5000 / custom host), persist to backend database
    // Avoid calling static dev servers (e.g., Live Server port 5500/5501) which return 405 Method Not Allowed
    var isStaticHost = window.location.port === '5500' || window.location.port === '5501' || window.location.port === '8080' || window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
    if (!isStaticHost) {
      fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, subject: subject, message: message })
      }).catch(function (err) { console.warn('Backend note:', err); });
    }

    // 2. Direct client-side email delivery via Web3Forms API to abhaymaddheshiya159@gmail.com
    var formData = new FormData(form);
    if (!formData.get('access_key')) {
      formData.append('access_key', WEB3FORMS_KEY);
    }

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) {
          showToast('✅ Message sent! Check your Gmail Inbox (and Spam/Junk folder).', 'success');
          form.reset();
        } else {
          showToast('❌ Delivery failed: ' + (res.message || 'Please try again.'), 'error');
        }
      })
      .catch(function (err) {
        console.error('[Web3Forms Error]', err);
        showToast('❌ Email delivery error. Please try again.', 'error');
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message'; }
      });
  });
})();


// ── Toast notifications ──────────────────────────────────────────
function showToast(msg, type) {
  var t = document.createElement('div');
  t.className = 'toast toast-' + (type || 'success');
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.classList.add('toast-in'); }, 10);
  setTimeout(function () {
    t.classList.remove('toast-in');
    setTimeout(function () { t.remove(); }, 400);
  }, 4000);
}
