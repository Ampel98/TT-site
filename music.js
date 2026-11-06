document.addEventListener('DOMContentLoaded', function () {

  const PAGE_SIZE = 20;

  // 置顶条目：按数组顺序永远排在最前面
  const PINNED_ORDER = ['httdg'];

  let currentFilter = 'all';
  let currentPage   = 1;

  const musicGrid          = document.getElementById('music-grid-container');
  const paginationBox      = document.getElementById('musicPagination');
  const musicList          = document.getElementById('music-list-view');
  const musicDetailView    = document.getElementById('music-detail-view');
  const musicDetailContent = document.getElementById('music-detail-content');

  // ===== 工具 =====
  function syncUrl(mutate) {
    const url = new URL(location.href);
    mutate(url.searchParams);
    history.replaceState(null, '', url);
  }

  function setActiveFilter(filter) {
    document.querySelectorAll('.tab-btn[data-filter]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-filter') === filter);
    });
  }

  // ===== 过滤 =====
  // 规则：PINNED_ORDER 里的条目永远置顶（按数组顺序），
  // 其余条目按 date 从新到旧自动排序；新加条目无需改这里。
  function getFilteredList() {
    const allIds = Object.keys(musicAlbums);

    const pinned = PINNED_ORDER.filter(id => musicAlbums[id]);

    const rest = allIds
      .filter(id => !PINNED_ORDER.includes(id) && musicAlbums[id])
      .sort((a, b) => {
        const da = String(musicAlbums[a].date || '').replace(/[^\d]/g, '');
        const db = String(musicAlbums[b].date || '').replace(/[^\d]/g, '');
        return db.localeCompare(da); // 倒序：新的在前
      });

    return [...pinned, ...rest].filter(id => {
      const album = musicAlbums[id];
      if (!album) return false;
      return currentFilter === 'all' || album.type === currentFilter;
    });
  }

  // ===== 列表渲染（带分页） =====
  function renderMusicPage() {
    const list = getFilteredList();
    const totalPage = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (currentPage > totalPage) currentPage = totalPage;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    musicGrid.innerHTML = pageItems.map(id => {
      const a = musicAlbums[id];
      if (!a) return '';
      const coverHtml = a.cover
        ? `<img src="${a.cover}" alt="${a.title}">`
        : `<div class="poster-empty">暂未更新</div>`;

      return `
        <a class="music-card" data-type="${a.type || ''}" data-album-id="${id}" href="music.html?album=${id}">
          <div class="cover">${coverHtml}</div>
          <div class="info">
            <div class="title">${a.title}</div>
            <div class="date">${a.date}</div>
          </div>
        </a>`;
    }).join('');

    bindCardClicks();
    renderPagination(totalPage);
  }

  // ===== 卡片点击 =====
  function bindCardClicks() {
    musicGrid.querySelectorAll('.music-card').forEach(card => {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        openAlbum(this.getAttribute('data-album-id'));
      });
    });
  }

  // ===== 分页条 =====
  function renderPagination(totalPage) {
    if (!paginationBox) return;

    if (totalPage <= 1) {
      paginationBox.innerHTML = '';
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
        <input type="number" min="1" max="${totalPage}" value="${cur}" id="musicPageJumpInput">
        <span>/ ${totalPage} 页</span>
      </span>
    `);

    paginationBox.innerHTML = pages.join('');

    function goToPage(p) {
      if (p < 1 || p > totalPage || p === currentPage) return;
      currentPage = p;
      renderMusicPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      syncUrl(params => {
        if (currentPage === 1) params.delete('page');
        else params.set('page', currentPage);
      });
    }

    paginationBox.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        goToPage(parseInt(btn.getAttribute('data-page'), 10));
      });
    });

    const input = document.getElementById('musicPageJumpInput');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const p = parseInt(input.value, 10);
        if (p >= 1 && p <= totalPage) goToPage(p);
        else input.value = currentPage;
      });
    }
  }

  // ===== 分类过滤 =====
  document.querySelectorAll('.tab-btn[data-filter]').forEach(button => {
    button.addEventListener('click', function () {
      currentFilter = this.getAttribute('data-filter');
      currentPage = 1;
      setActiveFilter(currentFilter);
      renderMusicPage();

      syncUrl(p => {
        if (currentFilter === 'all') p.delete('filter');
        else p.set('filter', currentFilter);
        p.delete('page');
      });
    });
  });

  // ===== 打开详情 =====
  function openAlbum(albumId) {
    const a = musicAlbums[albumId];
    if (!a) return;

    const tracks = a.tracks.map(t =>
      `<li><span class="track-name">${t.name}</span><span class="track-artist">${t.artist}</span></li>`
    ).join('');

    const plats = a.platforms.map(p =>
      `<a href="${p.url}" target="_blank" class="platform-btn">${p.name}</a>`
    ).join('');

    musicDetailContent.innerHTML = `
      <div class="detail-cover"><img src="${a.cover}" alt="${a.title}"></div>
      <div class="detail-info">
        <h3>${a.title}</h3>
        <div class="detail-meta">发行日期：${a.date}</div>
        <div class="section-label">曲目列表</div>
        <ul class="track-list">${tracks}</ul>
        <div class="section-label">试听平台</div>
        <div class="platform-links">${plats}</div>
      </div>`;

    musicList.style.display = 'none';
    musicDetailView.classList.add('active');

    syncUrl(p => p.set('album', albumId));
  }

  // ===== 返回列表 =====
  document.getElementById('back-to-music-btn').addEventListener('click', () => {
    musicDetailView.classList.remove('active');
    musicList.style.display = 'block';
    syncUrl(p => p.delete('album'));
  });

  // ===== 首次加载 =====
  const params = new URLSearchParams(location.search);

  const initFilter = params.get('filter');
  if (initFilter) {
    currentFilter = initFilter;
    setActiveFilter(initFilter);
  }

  const initPage = parseInt(params.get('page'), 10);
  if (initPage > 1) currentPage = initPage;

  renderMusicPage();

  const albumId = params.get('album');
  if (albumId && musicAlbums[albumId]) {
    openAlbum(albumId);
  }
});