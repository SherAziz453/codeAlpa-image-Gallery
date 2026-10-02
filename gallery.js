'use strict';

// ─── State ────────────────────────────────────────────────────────────
const state = {
  category:    'all',
  filter:      'none',
  search:      '',
  sort:        'default',
  lbIndex:     0,
  lbFilterOn:  false,
  zoomed:      false,
  touchStartX: 0,
};

// ─── DOM ──────────────────────────────────────────────────────────────
const grid        = document.getElementById('galleryGrid');
const emptyState  = document.getElementById('emptyState');
const resultsCount= document.getElementById('resultsCount');
const catRow      = document.getElementById('catRow');
const filterRow   = document.getElementById('filterRow');
const searchInput = document.getElementById('searchInput');
const sortSelect  = document.getElementById('sortSelect');
const lightbox    = document.getElementById('lightbox');
const lbBackdrop  = document.getElementById('lbBackdrop');
const lbImg       = document.getElementById('lbImg');
const lbLoader    = document.getElementById('lbLoader');
const lbPrev      = document.getElementById('lbPrev');
const lbNext      = document.getElementById('lbNext');
const lbClose     = document.getElementById('lbClose');
const lbCounter   = document.getElementById('lbCounter');
const lbTitle     = document.getElementById('lbTitle');
const lbCat       = document.getElementById('lbCat');
const lbThumbs    = document.getElementById('lbThumbs');
const lbZoomIn    = document.getElementById('lbZoomIn');
const lbZoomOut   = document.getElementById('lbZoomOut');
const lbDownload  = document.getElementById('lbDownload');
const lbFilterBtn = document.getElementById('lbFilterBtn');
const scrollTop   = document.getElementById('scrollTop');

// ─── Data model ───────────────────────────────────────────────────────
const allItems = Array.from(grid.querySelectorAll('.gallery-item'));

const itemData = allItems.map(el => ({
  el,
  cat:   el.dataset.cat,
  title: el.dataset.title,
  src:   el.querySelector('img').src,
  alt:   el.querySelector('img').alt,
}));

let visible = [];

// ─── Apply all filters ────────────────────────────────────────────────
function applyAll() {
  const q = state.search.toLowerCase().trim();

  // 1. filter
  let result = itemData.filter(d => {
    const matchCat    = state.category === 'all' || d.cat === state.category;
    const matchSearch = !q || d.title.toLowerCase().includes(q) || d.cat.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // 2. sort
  if (state.sort === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
  else if (state.sort === 'za') result.sort((a, b) => b.title.localeCompare(a.title));

  visible = result;

  // 3. reorder DOM + toggle visibility
  const visSet = new Set(result.map(d => d.el));

  result.forEach((d, i) => {
    grid.insertBefore(d.el, emptyState);
    d.el.classList.remove('hidden');
    d.el.style.animationDelay = `${i * 28}ms`;
    d.el.style.animation = 'none';
    void d.el.offsetWidth;
    d.el.style.animation = '';
  });

  itemData.forEach(d => {
    if (!visSet.has(d.el)) d.el.classList.add('hidden');
  });

  // 4. css image filters
  applyImageFilters();

  // 5. ui feedback
  const count = result.length;
  emptyState.hidden = count > 0;
  resultsCount.innerHTML = count > 0
    ? `<strong>${count}</strong> image${count !== 1 ? 's' : ''}`
    : '';
}

// ─── CSS image filters ────────────────────────────────────────────────
function applyImageFilters() {
  itemData.forEach(d => {
    if (state.filter === 'none') d.el.removeAttribute('data-active-filter');
    else d.el.setAttribute('data-active-filter', state.filter);
  });
}

// ─── Category ─────────────────────────────────────────────────────────
catRow.addEventListener('click', e => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  catRow.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.category = btn.dataset.cat;
  applyAll();
});

// ─── Image Filter ─────────────────────────────────────────────────────
filterRow.addEventListener('click', e => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  filterRow.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  state.filter = chip.dataset.filter;
  applyAll();
  if (lightbox.classList.contains('open')) syncLbFilter();
});

// ─── Search ───────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  state.search = searchInput.value;
  applyAll();
});

// ─── Sort ─────────────────────────────────────────────────────────────
sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value;
  applyAll();
});

// ═══════════════════════════════════════════════════════════════════════
//  LIGHTBOX
// ═══════════════════════════════════════════════════════════════════════

// Open via card click
grid.addEventListener('click', e => {
  const item = e.target.closest('.gallery-item');
  if (!item) return;
  const idx = visible.findIndex(d => d.el === item);
  if (idx === -1) return;
  openLightbox(idx);
});

function openLightbox(idx) {
  state.lbIndex    = idx;
  state.zoomed     = false;
  state.lbFilterOn = false;
  lbFilterBtn.classList.remove('active');
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  buildThumbs();
  renderLbSlide();
}

function renderLbSlide() {
  const d = visible[state.lbIndex];
  if (!d) return;

  lbLoader.classList.remove('gone');
  lbImg.style.opacity = '0';

  const tmp = new Image();
  tmp.onload = () => {
    lbImg.src = d.src;
    lbImg.alt = d.alt;
    lbImg.style.opacity = '1';
    lbLoader.classList.add('gone');
    lbImg.classList.remove('slide-in');
    void lbImg.offsetWidth;
    lbImg.classList.add('slide-in');
    syncLbFilter();
  };
  tmp.src = d.src;

  lbCounter.textContent = `${state.lbIndex + 1} / ${visible.length}`;
  lbTitle.textContent   = d.title;
  lbCat.textContent     = d.cat.charAt(0).toUpperCase() + d.cat.slice(1);

  // reset zoom
  state.zoomed = false;
  lbImg.classList.remove('zoomed');

  // highlight thumb
  lbThumbs.querySelectorAll('.lb-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === state.lbIndex);
  });
  const activeThumb = lbThumbs.querySelector('.lb-thumb.active');
  if (activeThumb) activeThumb.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

function buildThumbs() {
  lbThumbs.innerHTML = '';
  visible.forEach((d, i) => {
    const t = document.createElement('div');
    t.className = 'lb-thumb' + (i === state.lbIndex ? ' active' : '');
    t.innerHTML = `<img src="${d.src}" alt="${d.alt}" loading="lazy" />`;
    t.addEventListener('click', () => { state.lbIndex = i; renderLbSlide(); });
    lbThumbs.appendChild(t);
  });
}

// Navigate
function goPrev() {
  if (!visible.length) return;
  state.lbIndex = (state.lbIndex - 1 + visible.length) % visible.length;
  renderLbSlide();
}
function goNext() {
  if (!visible.length) return;
  state.lbIndex = (state.lbIndex + 1) % visible.length;
  renderLbSlide();
}

lbPrev.addEventListener('click', goPrev);
lbNext.addEventListener('click', goNext);

// Close
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lbImg.src = '';
}

lbClose.addEventListener('click', closeLightbox);
lbBackdrop.addEventListener('click', closeLightbox);

// Zoom
lbZoomIn.addEventListener('click', () => { state.zoomed = true; lbImg.classList.add('zoomed'); });
lbZoomOut.addEventListener('click', () => { state.zoomed = false; lbImg.classList.remove('zoomed'); });
lbImg.addEventListener('click', e => {
  if (e.target !== lbImg) return;
  state.zoomed = !state.zoomed;
  lbImg.classList.toggle('zoomed', state.zoomed);
});

// Download
lbDownload.addEventListener('click', () => {
  const d = visible[state.lbIndex];
  if (!d) return;
  const a = document.createElement('a');
  a.href = d.src; a.download = d.title.replace(/\s+/g, '_') + '.jpg';
  a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.click();
});

// Filter toggle in lightbox
lbFilterBtn.addEventListener('click', () => {
  state.lbFilterOn = !state.lbFilterOn;
  lbFilterBtn.classList.toggle('active', state.lbFilterOn);
  syncLbFilter();
});

function syncLbFilter() {
  // Remove all lb filter classes
  Array.from(lbImg.classList)
    .filter(c => c.startsWith('lb-'))
    .forEach(c => lbImg.classList.remove(c));

  if (state.lbFilterOn && state.filter !== 'none') {
    lbImg.classList.add(`lb-${state.filter}`);
  }
}

// ─── Keyboard ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  const map = {
    'ArrowLeft': goPrev,
    'ArrowRight': goNext,
    'Escape': closeLightbox,
  };
  if (map[e.key]) { e.preventDefault(); map[e.key](); }
  if (e.key === '+' || e.key === '=') { state.zoomed = true; lbImg.classList.add('zoomed'); }
  if (e.key === '-') { state.zoomed = false; lbImg.classList.remove('zoomed'); }
});

// ─── Touch / Swipe ────────────────────────────────────────────────────
lightbox.addEventListener('touchstart', e => {
  state.touchStartX = e.touches[0].clientX;
}, { passive: true });

lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - state.touchStartX;
  if (Math.abs(dx) < 40) return;
  dx < 0 ? goNext() : goPrev();
});

// ─── Scroll to top ────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  scrollTop.classList.toggle('visible', window.scrollY > 320);
}, { passive: true });

scrollTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ─── Init ─────────────────────────────────────────────────────────────
applyAll();
