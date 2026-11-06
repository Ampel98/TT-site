document.addEventListener('DOMContentLoaded', function () {

  // ===== 信息条目 =====
  const renderItems = items =>
    items.map(i => `<div class="bio-item"><span class="k">${i.label}</span><span class="v">${i.value}</span></div>`).join('');

  // ===== 社交图标：优先 svg，没有则用 img =====
  const renderIcon = s => s.svg || (s.icon ? `<img src="${s.icon}" alt="${s.name}">` : '');

  // ===== 社交列表 =====
  const renderSocials = list =>
    list.map(s => `<a href="${s.url}" target="_blank" class="social-icon-btn">${renderIcon(s)}<span>${s.name}</span></a>`).join('');

  // ===== 信息区 =====
  document.getElementById('bio-self-cols').innerHTML =
    `<div class="bio-col-items">${renderItems(bioData.selfItems)}</div>`;
  document.getElementById('bio-pet-cols').innerHTML =
    `<div class="bio-col-items">${renderItems(bioData.petItems)}</div>`;

  // ===== 社交平台 =====
  document.getElementById('bio-person-socials').innerHTML = renderSocials(bioData.selfSocials);
  document.getElementById('bio-studio-socials').innerHTML = renderSocials(bioData.studioSocials);
  document.getElementById('bio-pet-socials').innerHTML    = renderSocials(bioData.petSocials);
});