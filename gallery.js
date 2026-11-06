document.addEventListener('DOMContentLoaded', function () {

  const PAGE_SIZE = 20; // 4 列 × 5 行

  const CATS = ['gallery-photo', 'gallery-photobook', 'gallery-magazine', 'gallery-card'];
  const TAB_LABELS = {
    'gallery-photo': '生写',
    'gallery-photobook': '写真',
    'gallery-magazine': '杂志',
    'gallery-card': '小卡'
  };

  let currentCat  = 'gallery-photo';
  let currentPage = 1;

  // ===== 动态创建分类区块 =====
  const rootEl = document.getElementById('galleryRoot');
  rootEl.innerHTML = CATS.map(catId => `
    <div id="${catId}" class="video-sub-page${catId === currentCat ? ' active' : ''}">
      <div id="${catId}-list"></div>
      <div id="${catId}-detail" class="detail-view">
        <div class="back-to-list">← 返回${TAB_LABELS[catId]}列表</div>
        <div class="gallery-detail-content"></div>
      </div>
    </div>
  `).join('');

  // ===== 工具 =====
  function toImageArray(images) {
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') return images ? [images] : [];
    return [];
  }

  function getEls(catId) {
    return {
      listEl: document.getElementById(catId + '-list'),
      detailEl: document.getElementById(catId + '-detail')
    };
  }

  function syncUrl(mutate) {
    const url = new URL(location.href);
    mutate(url.searchParams);
    history.replaceState(null, '', url);
  }

  function setActiveTab(catId) {
    document.querySelectorAll('.tab-btn[data-subtarget]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-subtarget') === catId);
    });
    document.querySelectorAll('.video-sub-page').forEach(p => {
      p.classList.toggle('active', p.id === catId);
    });
  }

  // ===== 详情渲染 =====
  function renderBlock(s, item, index) {
    if (typeof s === 'string') {
      return s ? `<img src="${s}" alt="${item.name} ${index + 1}">` : '';
    }
    if (s && typeof s === 'object') {
      if (s.spacer) return `<div class="gallery-spacer"></div>`;
      if (s.text)   return `<p class="gallery-inline-text">${s.text}</p>`;
    }
    return '';
  }

  function renderDetail(item) {
    const blocks = toImageArray(item.images)
      .map((s, i) => renderBlock(s, item, i))
      .filter(Boolean)
      .join('');

    return `
      <h3 class="gallery-title">${item.name}</h3>
      <div class="gallery-desc">${item.desc || ''}</div>
      <div class="gallery-body">${blocks}</div>
    `;
  }

  // ===== 列表渲染（带分页） =====
  function renderList(catId) {
    const { listEl } = getEls(catId);
    if (!listEl) return;

    const items = galleryData[catId] || [];
    const totalPage = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (currentPage > totalPage) currentPage = totalPage;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = `<div class="card-grid">${pageItems.map(it => `
      <a class="media-card" data-gallery-id="${it.id}" href="gallery.html?item=${it.id}">
        <div class="poster">
          ${it.poster
            ? `<img src="${it.poster}" alt="${it.name}">`
            : `<div class="poster-empty">暂未更新</div>`}
        </div>
        <div class="media-name">${it.name}</div>
      </a>`).join('')}</div>`;

    listEl.querySelectorAll('.media-card').forEach(card => {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        const item = items.find(it => it.id === this.getAttribute('data-gallery-id'));
        if (item) openDetail(catId, item);
      });
    });

    renderPagination(totalPage);
  }

  // ===== 打开详情 =====
  function openDetail(catId, item) {
    const { listEl, detailEl } = getEls(catId);
    detailEl.querySelector('.gallery-detail-content').innerHTML = renderDetail(item);
    listEl.style.display = 'none';
    detailEl.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    syncUrl(p => p.set('item', item.id));
  }

  // ===== 分页条 =====
  function renderPagination(totalPage) {
    const box = document.getElementById('galleryPagination');
    if (!box) return;

    if (totalPage <= 1) {
      box.innerHTML = '';
      return;
    }

    const cur = currentPage;
    const pages = [];

    pages.push(`<button class="page-btn" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''}>‹</button>`);

    const show = new Set([1, totalPage, cur, cur - 1, cur + 1, cur - 2, cur + 2]);
    const list = [...show].filter(p => p >= 1 && p <= totalPage).sort((a, b) => a - b);

    let prev = 0;
    list.forEach(p => {
      if (prev && p - prev > 1) pages.push(`<span class="page-ellipsis">…</span>`);
      pages.push(`<button class="page-btn ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`);
      prev = p;
    });

    pages.push(`<button class="page-btn" data-page="${cur + 1}" ${cur === totalPage ? 'disabled' : ''}>›</button>`);
    pages.push(`
      <span class="page-jump">
        <input type="number" min="1" max="${totalPage}" value="${cur}" id="galleryPageJumpInput">
        <span>/ ${totalPage} 页</span>
      </span>
    `);

    box.innerHTML = pages.join('');

    function goToPage(p) {
      if (p < 1 || p > totalPage || p === currentPage) return;
      currentPage = p;
      renderList(currentCat);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      syncUrl(params => {
        if (currentPage === 1) params.delete('page');
        else params.set('page', currentPage);
      });
    }

    box.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        goToPage(parseInt(btn.getAttribute('data-page'), 10));
      });
    });

    const input = document.getElementById('galleryPageJumpInput');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const p = parseInt(input.value, 10);
        if (p >= 1 && p <= totalPage) goToPage(p);
        else input.value = currentPage;
      });
    }
  }

  // ===== 二级 tab 切换 =====
  document.querySelectorAll('.tab-btn[data-subtarget]').forEach(button => {
    button.addEventListener('click', function () {
      const targetId = this.getAttribute('data-subtarget');

      setActiveTab(targetId);
      currentCat = targetId;
      currentPage = 1;
      renderList(targetId);

      syncUrl(p => {
        p.set('tab', targetId.replace('gallery-', ''));
        p.delete('page');
        p.delete('item');
      });
    });
  });

  // ===== 返回列表（事件委托） =====
  rootEl.addEventListener('click', function (e) {
    const btn = e.target.closest('.back-to-list');
    if (!btn) return;

    const pageEl = btn.closest('.video-sub-page');
    const catId = pageEl.id;

    pageEl.querySelector('.detail-view').classList.remove('active');
    document.getElementById(catId + '-list').style.display = 'block';

    syncUrl(p => p.delete('item'));
  });

  // ===== 首次加载 =====
  const params = new URLSearchParams(location.search);

  // 1. 有 item 直接打开详情
  const galleryId = params.get('item');
  if (galleryId) {
    for (const catId of CATS) {
      const found = (galleryData[catId] || []).find(x => x.id === galleryId);
      if (found) {
        currentCat = catId;
        setActiveTab(catId);
        openDetail(catId, found);
        return;
      }
    }
  }

  // 2. 读 page
  const initPage = parseInt(params.get('page'), 10);
  if (initPage > 1) currentPage = initPage;

  // 3. 读 tab（URL 用短名：photo / photobook / magazine / card）
  const catId = 'gallery-' + (params.get('tab') || 'photo');
  if (galleryData[catId]) {
    currentCat = catId;
    setActiveTab(catId);
  }

  // 4. 渲染当前分类
  renderList(currentCat);
});