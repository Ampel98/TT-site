document.addEventListener('DOMContentLoaded', function () {

  // ===== 构建全量索引 =====
  function buildIndex() {
    const index = [];

    const pushItem = (it, type, mainType, subLabel, extraKeywords = []) => {
      index.push({
        name: it.name || it.title || '',
        type,
        mainType,
        subLabel,
        id: it.id || it.albumId || '',
        poster: it.poster || it.cover || '',
        date: it.date || it.year || '',
        keywords: [
          it.name, it.title, it.role, it.platform, it.cast,
          it.artist, it.album, it.date, it.year, it.synopsis,
          ...extraKeywords
        ].filter(Boolean).join(' ').toLowerCase()
      });
    };

    // 视频类数据源
    const videoSources = [
      { data: seriesData,     type: 'series',     subLabel: '影视' },
      { data: varietyData,    type: 'variety',    subLabel: '综艺' },
      { data: mvData,         type: 'mv',         subLabel: 'MV' },
      { data: otherData,      type: 'other',      subLabel: '其他' },
      { data: liveData,       type: 'live',       subLabel: '直播' },
      { data: stageData,      type: 'stage',      subLabel: '公演' },
      { data: eventData,      type: 'event',      subLabel: '活动' },
      { data: groupVideoData, type: 'group',      subLabel: '前团' },
      { data: commercialData, type: 'commercial', subLabel: '商务' },
      { data: magazineData,   type: 'magazine',   subLabel: '杂志' },
      { data: interviewData,  type: 'interview',  subLabel: '采访' }
    ];

    videoSources.forEach(src => {
      if (!src.data) return;
      // 兼容 { groups: [{items}] } 与 { items: [] } 两种结构
      const groups = Array.isArray(src.data.groups) ? src.data.groups : [];
      const items  = groups.length
        ? groups.flatMap(g => g.items || [])
        : (src.data.items || []);
      items.forEach(it => pushItem(it, src.type, '视频', src.subLabel));
    });

    // 音乐
    if (typeof musicAlbums !== 'undefined') {
      Object.keys(musicAlbums).forEach(key => {
        const a = musicAlbums[key];
        pushItem(
          { ...a, id: key, name: a.title },
          'music', '音乐', '音乐',
          [(a.tracks || []).map(t => `${t.name} ${t.artist}`).join(' ')]
        );
      });
    }

    // 相册
    if (typeof galleryData !== 'undefined') {
      Object.keys(galleryData).forEach(cat => {
        (galleryData[cat] || []).forEach(g => {
          pushItem(
            { ...g, poster: g.poster || (g.images && g.images[0]) || '' },
            'gallery', '相册', '相册'
          );
        });
      });
    }

    return index;
  }

  const INDEX = buildIndex();
  const box            = document.getElementById('searchResults');
  const searchInput    = document.getElementById('searchInput');
  const searchBtn      = document.getElementById('searchBtn');
  const catContainer   = document.getElementById('categoryTags');
  const navForm        = document.getElementById('navSearchForm');
  const navInput       = document.getElementById('navSearchInput');

  // ===== 状态 =====
  const PAGE_SIZE = 20;
  let currentKeyword  = '';
  let currentCategory = '全部';
  let currentPage     = 1;
  let filteredData    = [];

  // ===== 工具 =====
  function syncInputs(keyword) {
    searchInput.value = keyword;
    navInput.value    = keyword;
  }

  function syncUrl(keyword) {
    const newUrl = `${location.pathname}?q=${encodeURIComponent(keyword)}`;
    history.pushState({ path: newUrl }, '', newUrl);
  }

  function getLink(item) {
    if (item.type === 'music')   return `music.html?album=${item.id}`;
    if (item.type === 'gallery') return `gallery.html?item=${item.id}`;
    return `detail.html?type=${item.type}&id=${item.id}`;
  }

  // ===== 分类按钮 =====
  function renderTags() {
    const cats = ['全部', '视频', '音乐', '相册'];
    catContainer.innerHTML = cats.map(cat =>
      `<button class="tag-btn${currentCategory === cat ? ' active' : ''}" data-cat="${cat}">${cat}</button>`
    ).join('');

    catContainer.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.getAttribute('data-cat');
        currentPage = 1;
        renderTags();
        doSearch();
      });
    });
  }

  // ===== 搜索 =====
  function doSearch() {
    const kw = currentKeyword.toLowerCase();

    filteredData = INDEX.filter(it => {
      if (kw && !it.name.toLowerCase().includes(kw) && !it.keywords.includes(kw)) return false;
      if (currentCategory !== '全部' && it.mainType !== currentCategory) return false;
      return true;
    });

    renderPage();
  }

  // ===== 渲染当前页 =====
  function renderPage() {
    if (!filteredData.length) {
      box.innerHTML = `<p class="search-empty">没有找到与“${currentKeyword}”相关的内容</p>`;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageData = filteredData.slice(startIdx, startIdx + PAGE_SIZE);

    box.innerHTML = `
      <p class="search-result-title">找到 ${filteredData.length} 条结果</p>
      <div class="search-grid">
        ${pageData.map(it => `
          <a class="search-card" href="${getLink(it)}" target="_blank">
            <div class="poster">
              ${it.poster
                ? `<img src="${it.poster}" alt="${it.name}" loading="lazy">`
                : `<div class="poster-empty">暂未更新</div>`}
            </div>
            <div class="name">${it.name}</div>
            <div class="type">${it.subLabel}${it.date ? ` <span style="color:#666;margin:0 4px;">·</span> ${it.date}` : ''}</div>
          </a>`).join('')}
      </div>
      ${totalPages > 1 ? `<div class="pagination" id="pagination"></div>` : ''}
    `;

    if (totalPages > 1) renderPagination(totalPages);
  }

  // ===== 分页器 =====
  function renderPagination(totalPages) {
    const pageContainer = document.getElementById('pagination');
    if (!pageContainer) return;

    const cur = currentPage;
    const pages = new Set([1, totalPages, cur, cur - 1, cur + 1, cur - 2, cur + 2]);
    const list = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    const html = [];
    if (cur > 1) html.push(`<button class="page-btn" data-page="${cur - 1}">上一页</button>`);

    let prev = 0;
    list.forEach(p => {
      if (prev && p - prev > 1) html.push(`<span class="page-dots">...</span>`);
      html.push(`<button class="page-btn ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`);
      prev = p;
    });

    if (cur < totalPages) html.push(`<button class="page-btn" data-page="${cur + 1}">下一页</button>`);

    pageContainer.innerHTML = html.join('');
    pageContainer.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const p = parseInt(this.getAttribute('data-page'), 10);
        if (p === currentPage) return;
        currentPage = p;
        renderPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ===== 提交搜索（统一入口） =====
  function submitSearch(keyword) {
    currentKeyword = keyword.trim();
    currentPage = 1;
    syncInputs(currentKeyword);
    syncUrl(currentKeyword);
    doSearch();
  }

  // ===== 事件绑定 =====
  navForm.addEventListener('submit', e => {
    e.preventDefault();
    submitSearch(navInput.value);
  });

  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') submitSearch(searchInput.value);
  });

  searchBtn.addEventListener('click', () => submitSearch(searchInput.value));

  window.addEventListener('popstate', () => {
    const q = (new URLSearchParams(location.search).get('q') || '').trim();
    if (q !== currentKeyword) {
      currentKeyword = q;
      currentPage = 1;
      syncInputs(q);
      doSearch();
    }
  });

  // ===== 初始化 =====
  currentKeyword = (new URLSearchParams(location.search).get('q') || '').trim();
  syncInputs(currentKeyword);
  renderTags();
  doSearch();
});