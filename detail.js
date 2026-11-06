// detail.js
document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(location.search);
  const type = params.get('type');
  const id = params.get('id');
  const root = document.getElementById('detail-body');
  const backLink = document.getElementById('back-link');

  if (backLink && type) backLink.href = `video.html?tab=${type}`;

  const CONFIG = {
    series:     { data: () => seriesData,     sections: ['synopsis', 'full', 'bts', 'stills'] },
    variety:    { data: () => varietyData,    sections: ['synopsis', 'full', 'bts'] },
    mv:         { data: () => mvData,         sections: ['synopsis', 'full', 'dance', 'bts'] },
    other:      { data: () => otherData,      sections: ['synopsis', 'videos'] },
    live:       { data: () => liveData,       sections: ['synopsis', 'videos'] },
    stage:      { data: () => stageData,      sections: ['synopsis', 'full'] },
    event:      { data: () => eventData,      sections: ['synopsis', 'videos'] },
    group:      { data: () => groupVideoData, sections: ['synopsis', 'full'] },
    commercial: { data: () => commercialData, sections: ['synopsis', 'full', 'stills'] },
    magazine:   { data: () => magazineData,   sections: ['synopsis', 'videos', 'stills'] },
    interview:  { data: () => interviewData,  sections: ['synopsis', 'full', 'stills'] }
  };

  const SECTION_TITLES = {
    synopsis: '简介', full: '正片', dance: '舞蹈版',
    bts: '花絮', stills: '剧照', videos: '播放'
  };

  const META_FIELDS = [
    ['role', '角色'], ['platform', '平台'], ['episodes', '集数'],
    ['year', '年份'], ['director', '导演'], ['cast', '主演'],
    ['artist', '歌手'], ['album', '专辑'], ['date', '日期'],
    ['group', '公演'], ['team', '队伍'], ['brand', '品牌'], ['type', '类型']
  ];

  const PLAY_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const DL_ICON   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>`;

  const cfg = CONFIG[type];
  if (!cfg) {
    root.innerHTML = '<p style="color:#fff;text-align:center;padding:60px 0;">未知分类</p>';
    return;
  }

  // ===== 查找条目（兼容 groups 扁平 / groups 分组 / items 三种结构） =====
  function findItem(sourceData, targetId) {
    if (!sourceData) return null;
    if (Array.isArray(sourceData.groups)) {
      const flat = sourceData.groups.find(it => it && it.id === targetId);
      if (flat) return flat;
      for (const g of sourceData.groups) {
        const found = (g.items || []).find(it => it.id === targetId);
        if (found) return found;
      }
    } else if (Array.isArray(sourceData.items)) {
      return sourceData.items.find(it => it.id === targetId) || null;
    }
    return null;
  }

  const item = findItem(cfg.data(), id);
  if (!item) {
    root.innerHTML = '<p style="color:#fff;text-align:center;padding:60px 0;">未找到内容</p>';
    return;
  }

  document.title = `${item.name} | HTT`;

  // ===== 工具函数 =====
  function toArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val ? [val] : [];
    if (val == null) return [];
    return [val];
  }

  function renderVideoList(list, emptyText) {
    const arr = typeof list === 'string'
      ? (list ? [{ label: '视频', type: 'link', url: list }] : [])
      : toArray(list);

    if (!arr.length) {
      return `<p style="color:#888;padding:20px 0;">${emptyText}</p>`;
    }

    return `<div class="video-list">${arr.map(v => {
      if (v.type === 'iframe' && v.embed) {
        return `
          <div class="video-item">
            <div class="video-header"><span class="video-label">${v.label || '视频'}</span></div>
            <div class="video-frame">
              <iframe src="${v.embed}" allowfullscreen scrolling="no" frameborder="0"></iframe>
            </div>
          </div>`;
      }

      const actions = [];
      if (v.url)      actions.push(`<a href="${v.url}" target="_blank">${PLAY_ICON} 播放</a>`);
      if (v.download) actions.push(`<a href="${v.download}" target="_blank">${DL_ICON} 下载</a>`);

      const coverHtml = v.cover
        ? `<a href="${v.url}" target="_blank" class="video-cover"><img src="${v.cover}" alt="${v.label}" loading="lazy" decoding="async"></a>`
        : '';

      return `
        <div class="video-item">
          <div class="video-header">
            <span class="video-label">${v.label || '视频'}</span>
            <div class="video-actions">${actions.join('')}</div>
          </div>
          ${coverHtml}
        </div>`;
    }).join('')}</div>`;
  }

  function renderStills(list) {
    const arr = toArray(list).filter(Boolean);
    if (!arr.length) return '';

    const inner = arr.map(s => {
      let thumbUrl, fullUrl, pos, tx, ty, scale;

      if (typeof s === 'object' && s && s.src) {
        thumbUrl = s.thumb || s.src;
        fullUrl  = s.src;
        ({ pos, tx, ty, scale } = s);
      } else {
        thumbUrl = fullUrl = s;
      }

      const styleParts = [];
      if (pos) styleParts.push(`object-position:${pos}`);

      const t = [];
      if (tx !== undefined || ty !== undefined) t.push(`translate(${tx || '0'}, ${ty || '0'})`);
      if (scale !== undefined && scale !== 1) t.push(`scale(${scale})`);
      if (t.length) styleParts.push(`transform:${t.join(' ')}`);

      const style = styleParts.length ? ` style="${styleParts.join(';')}"` : '';
      return `<a href="${fullUrl}" target="_blank"><img src="${thumbUrl}" loading="lazy" alt="剧照"${style}></a>`;
    }).join('');

    return `
      <section class="section-block">
        <h2 class="section-title">${SECTION_TITLES.stills}</h2>
        <div class="stills-grid">${inner}</div>
      </section>`;
  }

  // ===== 板块渲染 =====
  function buildSection(key) {
    const title = SECTION_TITLES[key];

    if (key === 'synopsis') {
      return `
        <section class="section-block">
          <h2 class="section-title">${title}</h2>
          <p class="synopsis">${item.synopsis || '暂无简介'}</p>
        </section>`;
    }

    if (key === 'full') {
      return `
        <section class="section-block">
          <h2 class="section-title">${title}</h2>
          ${renderVideoList(item.fullVideo || [], '暂无正片资源')}
        </section>`;
    }

    if (key === 'dance') {
      const arr = toArray(item.danceVideo).filter(Boolean);
      if (!arr.length) return '';
      return `
        <section class="section-block">
          <h2 class="section-title">${title}</h2>
          ${renderVideoList(arr, '')}
        </section>`;
    }

    if (key === 'bts') {
      const arr = toArray(item.behindScenes).filter(Boolean);
      if (!arr.length) return '';
      return `
        <section class="section-block">
          <h2 class="section-title">${title}</h2>
          ${renderVideoList(arr, '')}
        </section>`;
    }

    if (key === 'stills') {
      return renderStills(item.stills);
    }

    if (key === 'videos') {
      return `
        <section class="section-block">
          <h2 class="section-title">${title}</h2>
          ${renderVideoList(item.videos || [], '暂无播放资源')}
        </section>`;
    }

    return '';
  }

  // ===== 顶部信息 =====
  const metaHtml = META_FIELDS
    .filter(([k]) => item[k])
    .map(([k, label]) => `<div class="row"><span class="k">${label}</span><span>${item[k]}</span></div>`)
    .join('');

  // ===== 下载区 =====
  const downloads = toArray(item.downloads);
  const downloadHtml = downloads.length
    ? `
      <section class="section-block">
        <h2 class="section-title">下载地址</h2>
        <div class="download-list">
          ${downloads.map(d => `
            <div class="download-item-wrap">
              ${d.desc ? `<div class="dl-title" style="color:#ddd;font-size:18px;margin-bottom:10px;">${d.desc}</div>` : ''}
              ${d.cover ? `<div class="dl-cover-wrap"><img src="${d.cover}" alt="${d.label || '下载'}" loading="lazy" decoding="async"></div>` : ''}
              <div class="download-item">
                <span class="dl-label">${d.label || '下载'}</span>
                ${d.mediaInfo ? `<span class="dl-mediaInfo">${d.mediaInfo}</span>` : ''}
                ${d.code ? `<span class="dl-code">提取码：${d.code}</span>` : ''}
                ${d.url ? `<a href="${d.url}" target="_blank">前往下载</a>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>`
    : '';

  // ===== 渲染 =====
  const posterHtml = item.poster
    ? `<img src="${item.poster}" alt="" fetchpriority="high" decoding="async">`
    : `<div class="poster-empty" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#666;font-size:14px;letter-spacing:2px;">暂未更新</div>`;

  root.innerHTML = `
    <div class="hero">
      <div class="poster">${posterHtml}</div>
      <div class="info">
        <h1>${item.name}</h1>
        <div class="meta">${metaHtml || '<div class="row"><span class="k">信息</span><span>—</span></div>'}</div>
      </div>
    </div>

    ${cfg.sections.map(buildSection).join('')}

    ${downloadHtml}
  `;
});