(function () {
  var content = Store.load();
  var profile = content.profile || {};
  var projects = content.projects || [];
  var root = document.documentElement;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* Profile text */
  document.querySelectorAll('[data-bind]').forEach(function (node) {
    node.textContent = profile[node.dataset.bind] || '';
  });
  document.title = [profile.name, profile.role].filter(Boolean).join(' | ');
  document.getElementById('draftBar').hidden = !Store.hasUnsavedDraft();

  /* Stack */
  var stack = document.getElementById('stack');
  (profile.stack || []).forEach(function (row) {
    var line = el('div');
    line.append(el('dt', '', row.group), el('dd', '', (row.items || []).join(', ')));
    stack.append(line);
  });

  /* Contact: anything without a value stays hidden */
  document.querySelectorAll('#socials [data-link]').forEach(function (link) {
    var href = Store.safeUrl(profile[link.dataset.link]);
    link.hidden = !href;
    if (href) link.href = href;
  });
  document.getElementById('socials').hidden = !document.querySelector('#socials [data-link]:not([hidden])');

  // Email and phone copy themselves when clicked, instead of mailto/tel links.
  var copyStatus = document.getElementById('copyStatus');
  var copyTimer;
  document.querySelectorAll('#reach [data-contact]').forEach(function (row) {
    var value = String(profile[row.dataset.contact] || '').trim();
    var label = row.dataset.contact === 'email' ? 'Email' : 'Phone number';
    row.hidden = !value;
    row.querySelector('.reach-text').textContent = value;
    row.setAttribute('aria-label', label + ' ' + value + ', click to copy');
    row.addEventListener('click', function () {
      copyText(value).then(function () {
        copyStatus.textContent = label + ' copied';
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () { copyStatus.textContent = ''; }, 2000);
      });
    });
  });
  document.getElementById('reach').hidden = !document.querySelector('#reach [data-contact]:not([hidden])');

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return copyWithSelection(text); });
    }
    return copyWithSelection(text);
  }

  function copyWithSelection(text) {
    var field = el('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    document.execCommand('copy');
    field.remove();
    return Promise.resolve();
  }
  document.getElementById('year').textContent = new Date().getFullYear();

  /* Projects */
  function hueFor(text) {
    var hash = 0;
    for (var i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
    return hash;
  }

  function buildCover(project) {
    var cover = el('div', 'cover');
    cover.style.setProperty('--h', hueFor(project.title || ''));
    var nav = el('div', 'cover-nav');
    nav.append(el('i'), el('i'), el('i'));
    var blocks = el('div', 'cover-blocks');
    blocks.append(el('i'), el('i'), el('i'));
    cover.append(nav, el('div', 'cover-title', project.title), blocks);
    return cover;
  }

  function hostOf(href) {
    return new URL(href).hostname.replace(/^www\./, '');
  }

  function buildProject(project) {
    var card = el('article', 'project reveal' + (project.featured ? ' featured' : ''));
    var href = Store.safeUrl(project.url);
    var image = Store.safeImage(project.image);

    var frame = el(href ? 'a' : 'div', 'frame');
    if (href) {
      frame.href = href;
      frame.target = '_blank';
      frame.rel = 'noopener';
      frame.setAttribute('aria-label', 'Visit ' + project.title);
    }
    var bar = el('div', 'frame-bar');
    var dots = el('span', 'frame-dots');
    dots.append(el('i'), el('i'), el('i'));
    bar.append(dots, el('span', 'frame-url', href ? hostOf(href) : 'link coming soon'));
    var view = el('div', 'frame-view');
    if (image) {
      var img = el('img');
      img.src = image;
      img.alt = 'Screenshot of ' + project.title;
      img.loading = 'lazy';
      img.onerror = function () { img.replaceWith(buildCover(project)); };
      view.append(img);
    } else {
      view.append(buildCover(project));
    }
    frame.append(bar, view);

    var info = el('div', 'project-info');
    var meta = [project.type, project.year].filter(Boolean).join(' / ');
    info.append(el('h3', '', project.title), el('span', 'project-meta', meta));
    if (project.description) info.append(el('p', 'project-desc', project.description));

    var foot = el('div', 'project-foot');
    var tags = el('ul', 'tags');
    (project.tags || []).forEach(function (tag) { tags.append(el('li', '', tag)); });
    foot.append(tags);
    if (href) {
      var visit = el('a', 'visit', 'Visit site ↗');
      visit.href = href;
      visit.target = '_blank';
      visit.rel = 'noopener';
      foot.append(visit);
    }
    info.append(foot);

    card.append(frame, info);
    return card;
  }

  var grid = document.getElementById('projects');
  var filters = document.getElementById('filters');
  var activeTag = null;

  function renderProjects() {
    grid.replaceChildren();
    projects
      .filter(function (p) { return !activeTag || (p.tags || []).indexOf(activeTag) !== -1; })
      .forEach(function (p) {
        var card = buildProject(p);
        grid.append(card);
        observe(card);
      });
    filters.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String((button.dataset.tag || null) === activeTag));
    });
  }

  function addFilter(label, tag) {
    var button = el('button', '', label);
    button.type = 'button';
    if (tag) button.dataset.tag = tag;
    button.addEventListener('click', function () {
      activeTag = tag;
      renderProjects();
    });
    filters.append(button);
  }

  var observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px' })
    : null;

  function observe(node) {
    if (observer) observer.observe(node);
    else node.classList.add('in');
  }

  var allTags = [];
  projects.forEach(function (p) {
    (p.tags || []).forEach(function (tag) {
      if (allTags.indexOf(tag) === -1) allTags.push(tag);
    });
  });
  if (allTags.length > 1) {
    addFilter('All', null);
    allTags.forEach(function (tag) { addFilter(tag, tag); });
  }
  document.getElementById('emptyProjects').hidden = projects.length > 0;
  renderProjects();

  /* Live editor */
  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('portfolio.prefs')) || {}; } catch (e) {}

  function savePrefs() {
    try { localStorage.setItem('portfolio.prefs', JSON.stringify(prefs)); } catch (e) {}
  }

  var swatches = document.querySelectorAll('#swatches button');
  function syncSwatches() {
    swatches.forEach(function (button) {
      button.setAttribute('aria-checked', String(button.dataset.accent === root.dataset.accent));
    });
  }
  swatches.forEach(function (button) {
    button.addEventListener('click', function () {
      root.dataset.accent = prefs.accent = button.dataset.accent;
      syncSwatches();
      savePrefs();
    });
  });
  syncSwatches();

  var radius = document.getElementById('radius');
  var radiusOut = document.getElementById('radiusOut');
  radius.value = prefs.radius != null ? prefs.radius : 12;
  radiusOut.textContent = radius.value + 'px';
  radius.addEventListener('input', function () {
    prefs.radius = Number(radius.value);
    root.style.setProperty('--r', radius.value + 'px');
    radiusOut.textContent = radius.value + 'px';
    savePrefs();
  });

  var schemeButtons = document.querySelectorAll('#scheme button');
  function syncScheme() {
    schemeButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === root.dataset.theme));
    });
  }
  schemeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      root.dataset.theme = prefs.theme = button.dataset.themeChoice;
      syncScheme();
      savePrefs();
    });
  });
  syncScheme();

  /* Scroll reveal for static sections */
  document.querySelectorAll('.service, .about-grid > *').forEach(function (node) {
    node.classList.add('reveal');
    observe(node);
  });
})();
