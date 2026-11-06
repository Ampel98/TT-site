// video.js
document.addEventListener('DOMContentLoaded', function () {

  const TAB_MAP = {
    series:     'sub-series',
    variety:    'sub-variety',
    mv:         'sub-mv',
    other:      'sub-other',
    live:       'sub-live',
    stage:      'sub-stage',
    event:      'sub-event',
    group:      'sub-group',
    commercial: 'sub-commercial',
    magazine:   'sub-magazine',
    interview:  'sub-interview'
  };

const DATA_SOURCES = {
  series: {
    file: 'data/series.js',
    containerId: 'series-list-view',
    data: () => window.seriesData,
    type: 'series'
  },
  variety: {
    file: 'data/variety.js',
    containerId: 'variety-list-view',
    data: () => window.varietyData,
    type: 'variety'
  },
  mv: {
    file: 'data/mv.js',
    containerId: 'mv-list-view',
    data: () => window.mvData,
    type: 'mv'
  },
  other: {
    file: 'data/other.js',
    containerId: 'other-list-view',
    data: () => window.otherData,
    type: 'other'
  },
  live: {
    file: 'data/live.js',
    containerId: 'live-list-view',
    data: () => window.liveData,
    type: 'live'
  },
  stage: {
    file: 'data/stage.js',
    containerId: 'stage-list-view',
    data: () => window.stageData,
    type: 'stage'
  },
  event: {
    file: 'data/event.js',
    containerId: 'event-list-view',
    data: () => window.eventData,
    type: 'event'
  },
  group: {
    file: 'data/group.js',
    containerId: 'group-list-view',
    data: () => window.groupVideoData,
    type: 'group'
  },
  commercial: {
    file: 'data/commercial.js',
    containerId: 'commercial-list-view',
    data: () => window.commercialData,
    type: 'commercial'
  },
  magazine: {
    file: 'data/magazine.js',
    containerId: 'magazine-list-view',
    data: () => window.magazineData,
    type: 'magazine'
  },
  interview: {
    file: 'data/interview.js',
    containerId: 'interview-list-view',
    data: () => window.interviewData,
    type: 'interview'
  }
};

const loadedScripts = {};

function loadTabData(tab) {
  const src = DATA_SOURCES[tab];

  if (!src) return Promise.reject(new Error('未知分类'));

  // 已加载的数据直接使用
  if (src.data()) return Promise.resolve();

  // 防止重复加载
  if (loadedScripts[tab]) return loadedScripts[tab];

  loadedScripts[tab] = new Promise((resolve, reject) => {
    const script = document.createElement('script');

    script.src = src.file;

    script.onload = () => {
      if (src.data()) {
        resolve();
      } else {
        delete loadedScripts[tab];
        reject(new Error('数据文件未正确初始化：' + src.file));
      }
    };

    script.onerror = () => {
      delete loadedScripts[tab];
      reject(new Error('数据加载失败：' + src.file));
    };

    document.body.appendChild(script);
  });

  return loadedScripts[tab];
}

  const STAGE_ORDER = [
    '特殊公演', '时之卷', 'N.E.W', '以爱之名', '专属派对',
    '十八个闪耀瞬间', '我的太阳', '前所未有', '逆流而上', '剧场女神'
  ];

  // 按 type 决定卡片副标题的取法
  const SUBTEXT_RULES = {
    mv:         it => (it.year || it.date || '').trim(),
    variety:    it => (it.year || it.date || '').trim(),
    series:     it => [it.role, it.year].filter(Boolean).join(' · '),
    live:       () => '',
    magazine:   () => '',
    interview:  () => '',
    other:      () => '',
    group:      () => '',
    stage:      () => ''
  };

  const PAGE_SIZE = 20;

  let currentTab   = 'series';
  let currentGroup = '';
  let currentYear  = '';
  let currentPage  = 1;

  // ===== 工具 =====
  function syncUrl(mutate) {
    const url = new URL(location.href);
    mutate(url.searchParams);
    history.replaceState(null, '', url);
  }

  // ===== 分组提取（兼容 groups 扁平 / groups 分组 / items） =====
  function getGroups(src) {
    const data = src.data();
    if (!data) return [];

    const groupBy = (arr, getTitle) => {
      const map = new Map();
      arr.forEach(it => {
        const cat = String(getTitle(it) || '未分类').trim() || '未分类';
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat).push(it);
      });
      return Array.from(map, ([title, items]) => ({ title, items }));
    };

    if (Array.isArray(data.groups)) {
      const hasItems = data.groups.some(g => g && Array.isArray(g.items));
      if (hasItems) return data.groups.filter(g => g && String(g.title || '').trim());
      return groupBy(data.groups, it => it.group || it.category);
    }
    if (Array.isArray(data.items)) {
      return groupBy(data.items, it => it.group || it.category);
    }
    return [];
  }

  function flattenItems(groups) {
    return groups.flatMap(g =>
      (g.items || []).map(it => ({ ...it, _groupTitle: String(g.title || '').trim() }))
    );
  }

  function getNumericDate(item) {
    let d = String(item.date || item.year || '').replace(/[^\d]/g, '');
    if (d.length === 4) d += '0000';
    return parseInt(d, 10) || 0;
  }

  function applyFilters(items) {
    const groupNeed = String(currentGroup || '').trim();
    return items.filter(it => {
      if (groupNeed && String(it._groupTitle || '').trim() !== groupNeed) return false;
      if (currentYear) {
        const y = String(it.year || (it.date || '').slice(0, 4) || '').trim();
        if (y !== currentYear) return false;
      }
      return true;
    });
  }

  // ===== 卡片 =====
  function renderCard(it, type) {
    const subText = SUBTEXT_RULES[type] ? SUBTEXT_RULES[type](it) : (it.date || it.year || '').trim();

    const posterHtml = it.poster
      ? `<img src="${it.poster}" alt="${it.name}" loading="lazy" decoding="async">`
      : `<div class="poster-empty">暂未更新</div>`;

    return `
      <a class="media-card" href="detail.html?type=${type}&id=${it.id}">
        <div class="poster">${posterHtml}</div>
        <div class="info">
          <div class="media-name">${it.name}</div>
          ${subText ? `<div class="media-date">${subText}</div>` : ''}
        </div>
      </a>`;
  }

  // ===== 页面渲染 =====
  function renderPage() {
    const src = DATA_SOURCES[currentTab];
    if (!src) return;

    const c = document.getElementById(src.containerId);
    if (!c) return;

    const groups   = getGroups(src);
    const filtered = applyFilters(flattenItems(groups));
    filtered.sort((a, b) => getNumericDate(b) - getNumericDate(a));

    const totalPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPage) currentPage = totalPage;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    c.innerHTML = pageItems.length
      ? `<div class="card-grid">${pageItems.map(it => renderCard(it, src.type)).join('')}</div>`
      : '<p style="color:#888;padding:20px 0;">没有符合条件的内容</p>';

    renderPagination(totalPage);
  }

  // ===== 分页 =====
  function renderPagination(totalPage) {
    const box = document.getElementById('videoPagination');
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
        <input type="number" min="1" max="${totalPage}" value="${cur}" id="pageJumpInput">
        <span>/ ${totalPage} 页</span>
      </span>
    `);

    box.innerHTML = pages.join('');

    function goToPage(p) {
      if (p < 1 || p > totalPage || p === currentPage) return;
      currentPage = p;
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      syncUrl(params => {
        if (currentPage === 1) params.delete('page');
        else params.set('page', currentPage);
      });
    }

    box.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => goToPage(parseInt(btn.getAttribute('data-page'), 10)));
    });

    const input = document.getElementById('pageJumpInput');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const p = parseInt(input.value, 10);
        if (p >= 1 && p <= totalPage) goToPage(p);
        else input.value = currentPage;
      });
    }
  }

  // ===== 过滤器 =====
  function renderFilterButtons(box, items, activeValue, onPick) {
    box.innerHTML =
      `<button class="filter-btn active" data-value="">全部</button>` +
      items.map(({ value, label }) =>
        `<button class="filter-btn${value === activeValue ? ' active' : ''}" data-value="${value}">${label}</button>`
      ).join('');

    box.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        box.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onPick(btn.getAttribute('data-value') || '');
      });
    });
  }

  function buildFilters(groups) {
    const groupBox = document.getElementById('filterGroup');
    const yearBox  = document.getElementById('filterYear');
    if (!groupBox || !yearBox) return;

    const validGroups = (groups || [])
      .filter(g => g && String(g.title || '').trim())
      .sort((a, b) => {
        const ia = STAGE_ORDER.indexOf(a.title);
        const ib = STAGE_ORDER.indexOf(b.title);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });

    renderFilterButtons(
      groupBox,
      validGroups.map(g => ({ value: String(g.title).trim(), label: String(g.title).trim() })),
      currentGroup,
      val => { currentGroup = val; currentPage = 1; renderPage(); }
    );

    const years = new Set();
    validGroups.forEach(g => (g.items || []).forEach(it => {
      const y = String(it.year || (it.date || '').slice(0, 4) || '').trim();
      if (/^\d{4}$/.test(y)) years.add(y);
    }));

    renderFilterButtons(
      yearBox,
      [...years].sort((a, b) => b - a).map(y => ({ value: y, label: y })),
      currentYear,
      val => { currentYear = val; currentPage = 1; renderPage(); }
    );
  }

  // ===== tab 切换 =====
  function activateTab(tabKey, pushState) {
    const targetId = TAB_MAP[tabKey] || 'sub-series';
    currentTab   = TAB_MAP[tabKey] ? tabKey : 'series';
    currentGroup = '';
    currentYear  = '';
    currentPage  = 1;

    document.querySelectorAll('.tab-btn[data-subtarget]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-subtarget') === targetId);
    });
    document.querySelectorAll('.video-sub-page').forEach(p => {
      p.classList.toggle('active', p.id === targetId);
    });

const tab = currentTab;
const src = DATA_SOURCES[tab];

if (src) {
  const container = document.getElementById(src.containerId);

  if (container && !src.data()) {
    container.innerHTML = '<p style="padding:20px;color:#888;">正在加载...</p>';
  }

  loadTabData(tab)
    .then(() => {
      // 防止快速切换分类时显示错误的数据
      if (currentTab !== tab) return;

      buildFilters(getGroups(src));
      renderPage();
    })
    .catch(error => {
      console.error(error);

      if (currentTab === tab && container) {
        container.innerHTML =
          '<p style="padding:20px;color:#888;">数据加载失败，请刷新重试。</p>';
      }
    });
}

    if (pushState !== false) {
      syncUrl(params => {
        params.set('tab', currentTab);
        params.delete('page');
      });
    }
  }

  document.querySelectorAll('.tab-btn[data-subtarget]').forEach(button => {
    button.addEventListener('click', function () {
      activateTab(this.getAttribute('data-tab'), true);
    });
  });

  // ===== 初始化 =====
  const params = new URLSearchParams(location.search);
  activateTab(params.get('tab') || 'series', false);

  const initialPage = parseInt(params.get('page'), 10);
  if (initialPage > 1) {
    currentPage = initialPage;
    renderPage();
  }
});