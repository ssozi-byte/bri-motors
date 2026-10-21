/* Brimotors Limited — site behaviour */
(function () {
  'use strict';

  var DATA = window.BRIMOTORS || { vehicles: [], count: 0 };
  var KES = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

  function money(n) { return 'KES ' + KES.format(n); }
  function km(n) { return KES.format(n) + ' km'; }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------------------------------------------------- navigation */
  var toggle = qs('.nav-toggle');
  var mobileNav = qs('.mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      mobileNav.classList.toggle('is-open', !open);
    });
  }

  /* highlight the active page */
  var path = location.pathname.split('/').pop() || 'index.html';
  qsa('.nav a, .mobile-nav a').forEach(function (a) {
    var raw = a.getAttribute('href') || '';
    if (raw.indexOf('#') > -1) return;
    if (raw.split('?')[0] === path) a.setAttribute('aria-current', 'page');
  });

  /* header shadow */
  var header = qs('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* hours: mark today */
  qsa('[data-hours]').forEach(function (row) {
    var day = row.getAttribute('data-hours');
    if (day !== new Date().getDay().toString()) return;
    row.classList.add('is-today');
  });
  var openLabel = qs('[data-open-now]');
  if (openLabel) {
    var now = new Date();
    var d = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes();
    var windows = {
      0: [840, 1050],
      1: [480, 1050],
      2: [480, 1050],
      3: [480, 1050],
      4: [480, 1050],
      5: [480, 1050],
      6: [480, 1020]
    };
    var w = windows[d];
    var isOpen = mins >= w[0] && mins <= w[1];
    openLabel.textContent = isOpen
      ? 'Open now · closes ' + (w[1] === 1020 ? '5:00' : '5:30') + ' pm'
      : 'Closed now · opens ' + (d === 0 ? '2:00 pm' : '8:00 am');
    openLabel.classList.toggle('is-open', isOpen);
  }

  /* --------------------------------------------------------- reveal on view */
  var revealables = qsa('.reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ------------------------------------------------------------- car cards */
  function card(v) {
    var specs = [km(v.mileage), v.fuel, v.transmission];
    return (
      '<article class="car-card reveal">' +
        '<a class="car-card__media" href="vehicle.html?v=' + encodeURIComponent(v.slug) + '" aria-label="' + v.title + '">' +
          '<img src="' + v.photos[0] + '" alt="' + v.title + '" loading="lazy" width="1500" height="1000">' +
          '<span class="car-card__tag">' + v.body + '</span>' +
        '</a>' +
        '<div class="car-card__body">' +
          '<p class="car-card__year">' + v.year + ' · ' + v.make.toUpperCase() + '</p>' +
          '<h3 class="car-card__title"><a href="vehicle.html?v=' + encodeURIComponent(v.slug) + '">' + v.short + '</a></h3>' +
          '<ul class="car-card__specs">' + specs.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' +
          '<div class="car-card__foot">' +
            '<div>' +
              '<div class="car-card__price">' + money(v.price) + '</div>' +
              '<div class="car-card__month">or ' + money(v.monthly) + ' / month</div>' +
            '</div>' +
            '<a class="car-card__cta" href="vehicle.html?v=' + encodeURIComponent(v.slug) + '" aria-label="View ' + v.title + '">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.4"/></svg>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  /* featured grid on the home page */
  function showNow(root) {
    qsa('.reveal', root).forEach(function (el) { el.classList.add('is-visible'); });
  }

  var featuredGrid = qs('[data-featured]');
  if (featuredGrid) {
    var featured = DATA.vehicles.filter(function (v) { return v.featured; }).slice(0, 6);
    featuredGrid.innerHTML = featured.map(card).join('');
    showNow(featuredGrid);
  }

  /* --------------------------------------------------------- inventory page */
  var results = qs('[data-results]');
  if (results) {
    var state = {
      makes: [],
      body: 'all',
      max: 6000000,
      sort: 'newest',
      q: ''
    };
    var params = new URLSearchParams(location.search);
    if (params.get('make')) state.makes = params.get('make').split(',');
    if (params.get('body')) state.body = params.get('body');
    if (params.get('max')) state.max = parseInt(params.get('max'), 10);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('sort')) state.sort = params.get('sort');

    var makes = Array.from(new Set(DATA.vehicles.map(function (v) { return v.make; }))).sort();
    var countEl = qs('[data-count]');
    var maxOut = qs('[data-max-out]');
    var maxInput = qs('[data-max]');
    var searchInput = qs('[data-search]');
    var sortSelect = qs('[data-sort]');
    var chipsEl = qs('[data-makes]');

    /* make chips with live counts */
    function renderChips() {
      chipsEl.innerHTML = makes.map(function (m) {
        var n = DATA.vehicles.filter(function (v) { return v.make === m; }).length;
        var on = state.makes.indexOf(m) > -1;
        return '<button class="chip" type="button" data-make="' + m + '" aria-pressed="' + on + '">' + m + ' <small>' + n + '</small></button>';
      }).join('');
    }

    chipsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-make]');
      if (!btn) return;
      var make = btn.getAttribute('data-make');
      var i = state.makes.indexOf(make);
      if (i > -1) state.makes.splice(i, 1);
      else state.makes.push(make);
      render();
    });

    qsa('.chip[data-body]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.body = btn.getAttribute('data-body');
        qsa('.chip[data-body]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        render();
      });
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-body') === state.body));
    });

    if (maxInput) {
      maxInput.value = state.max;
      maxInput.addEventListener('input', function () {
        state.max = parseInt(maxInput.value, 10);
        render();
      });
    }
    if (searchInput) {
      searchInput.value = state.q;
      searchInput.addEventListener('input', function () {
        state.q = searchInput.value.trim().toLowerCase();
        render();
      });
    }
    if (sortSelect) {
      sortSelect.value = state.sort;
      sortSelect.addEventListener('change', function () {
        state.sort = sortSelect.value;
        render();
      });
    }

    var resetBtn = qs('[data-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state = { makes: [], body: 'all', max: 6000000, sort: 'newest', q: '' };
        if (maxInput) maxInput.value = 6000000;
        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'newest';
        qsa('.chip[data-body]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-body') === 'all'));
        });
        render();
      });
    }

    function filtered() {
      var list = DATA.vehicles.filter(function (v) {
        if (state.makes.length && state.makes.indexOf(v.make) === -1) return false;
        if (state.body !== 'all' && v.body !== state.body) return false;
        if (v.price > state.max) return false;
        if (state.q) {
          var hay = (v.title + ' ' + v.body + ' ' + v.fuel + ' ' + v.transmission + ' ' + v.color).toLowerCase();
          if (hay.indexOf(state.q) === -1) return false;
        }
        return true;
      });
      var sorters = {
        newest: function (a, b) { return b.year - a.year; },
        priceAsc: function (a, b) { return a.price - b.price; },
        priceDesc: function (a, b) { return b.price - a.price; },
        mileage: function (a, b) { return a.mileage - b.mileage; }
      };
      return list.sort(sorters[state.sort] || sorters.newest);
    }

    function syncUrl() {
      var p = new URLSearchParams();
      if (state.makes.length) p.set('make', state.makes.join(','));
      if (state.body !== 'all') p.set('body', state.body);
      if (state.max !== 6000000) p.set('max', state.max);
      if (state.q) p.set('q', state.q);
      if (state.sort !== 'newest') p.set('sort', state.sort);
      var s = p.toString();
      history.replaceState(null, '', s ? '?' + s : location.pathname);
    }

    function render() {
      renderChips();
      var list = filtered();
      if (maxOut) maxOut.textContent = money(state.max);
      countEl.innerHTML = '<strong>' + list.length + '</strong> of ' + DATA.vehicles.length + ' vehicles';
      results.innerHTML = list.length
        ? list.map(card).join('')
        : '<div class="empty-state"><h3>Nothing matches those filters</h3><p>Try widening the budget or clearing a filter — or tell us what you are looking for and we will source it.</p><a class="btn" href="contact.html">Request a sourcing brief</a></div>';
      showNow(results);
      syncUrl();
    }

    render();
  }

  /* ------------------------------------------------------------ vehicle page */
  var vehicleRoot = qs('[data-vehicle]');
  if (vehicleRoot) {
    var slug = new URLSearchParams(location.search).get('v');
    var v = DATA.vehicles.filter(function (x) { return x.slug === slug; })[0] || DATA.vehicles[0];

    document.title = v.title + ' — Brimotors Limited';
    qs('[data-v-title]').textContent = v.title;
    qs('[data-v-crumb]').textContent = v.title;
    qs('[data-v-sub]').innerHTML =
      '<span>' + v.body + '</span><span>' + km(v.mileage) + '</span><span>' + v.fuel + '</span><span>' + v.transmission + '</span>';
    qs('[data-v-price]').textContent = money(v.price);
    qs('[data-v-monthly]').textContent = 'From ' + money(v.monthly) + ' / month · 5-year bank financing';

    var mainImg = qs('[data-gallery-main]');
    var thumbs = qs('[data-thumbs]');
    var countLabel = qs('[data-gallery-count]');
    var index = 0;

    function show(i) {
      index = (i + v.photos.length) % v.photos.length;
      mainImg.src = v.photos[index];
      mainImg.alt = v.title + ' — photo ' + (index + 1);
      if (countLabel) countLabel.textContent = (index + 1) + ' / ' + v.photos.length;
      qsa('button', thumbs).forEach(function (b, n) {
        b.setAttribute('aria-current', String(n === index));
      });
    }

    if (thumbs) {
      thumbs.innerHTML = v.photos.map(function (src, i) {
        return '<button type="button" aria-label="Show photo ' + (i + 1) + '"><img src="' + src + '" alt="" loading="lazy"></button>';
      }).join('');
      qsa('button', thumbs).forEach(function (b, i) {
        b.addEventListener('click', function () { show(i); });
      });
    }
    qsa('[data-gallery-prev]').forEach(function (b) {
      b.addEventListener('click', function () { show(index - 1); });
    });
    qsa('[data-gallery-next]').forEach(function (b) {
      b.addEventListener('click', function () { show(index + 1); });
    });
    show(0);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    qs('[data-v-copy]').textContent = v.desc;
    qs('[data-v-glance]').innerHTML = [
      ['Year', v.year],
      ['Mileage', km(v.mileage)],
      ['Engine', v.engine],
      ['Gearbox', v.transmission],
      ['Fuel', v.fuel],
      ['Colour', v.color]
    ].map(function (row) {
      return '<div><dt>' + row[0] + '</dt><dd>' + row[1] + '</dd></div>';
    }).join('');
    qs('[data-v-specs]').innerHTML = [
      ['Body', v.body],
      ['Year', v.year],
      ['Mileage', km(v.mileage)],
      ['Engine', v.engine],
      ['Transmission', v.transmission],
      ['Fuel', v.fuel],
      ['Colour', v.color],
      ['Reference', 'BM-' + v.slug.slice(0, 5)]
    ].map(function (row) {
      return '<div><span>' + row[0] + '</span><strong>' + row[1] + '</strong></div>';
    }).join('');

    var waText = encodeURIComponent('Hello Brimotors, I am interested in the ' + v.title + ' (' + money(v.price) + '). Is it still available?');
    qsa('[data-v-wa]').forEach(function (a) {
      a.href = 'https://wa.me/254722114035?text=' + waText;
    });
    qsa('[data-v-call]').forEach(function (a) {
      a.href = 'tel:+254722114035';
    });

    /* finance calculator */
    var price = v.price;
    var deposit = Math.round(price * 0.2);
    var term = 60;
    var rate = 0.14;

    var depInput = qs('[data-deposit]');
    var termInput = qs('[data-term]');
    var depOut = qs('[data-deposit-out]');
    var termOut = qs('[data-term-out]');
    var monthlyOut = qs('[data-calc-total]');

    function calc() {
      var principal = Math.max(price - deposit, 0);
      var r = rate / 12;
      var n = term;
      var m = r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n;
      depOut.textContent = money(deposit);
      termOut.textContent = term + ' months';
      monthlyOut.textContent = money(Math.round(m));
    }

    if (depInput) {
      depInput.max = String(Math.round(price * 0.7));
      depInput.value = String(deposit);
      termInput.value = String(term);
      depInput.addEventListener('input', function () { deposit = parseInt(depInput.value, 10); calc(); });
      termInput.addEventListener('input', function () { term = parseInt(termInput.value, 10); calc(); });
      calc();
    }

    /* similar stock */
    var similar = qs('[data-similar]');
    if (similar) {
      var picks = DATA.vehicles
        .filter(function (x) { return x.slug !== v.slug && (x.body === v.body || x.make === v.make); })
        .slice(0, 3);
      similar.innerHTML = picks.map(card).join('');
      showNow(similar);
    }
  }

  /* ----------------------------------------------------------- contact form */
  var form = qs('[data-form]');
  if (form) {
    var status = qs('[data-form-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var required = qsa('[required]', form);
      var ok = true;
      required.forEach(function (el) {
        var valid = el.value.trim().length > 0;
        if (el.type === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
        el.setAttribute('aria-invalid', String(!valid));
        if (!valid) ok = false;
      });
      if (!ok) {
        status.textContent = 'Please fill in the highlighted fields.';
        return;
      }
      form.reset();
      status.textContent = 'Thank you — this demo form does not send yet. Call 0722 114035 to reach the yard.';
    });
  }

  /* footer year */
  qsa('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
