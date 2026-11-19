import { createProgressStore } from './progress-store.js';
import { renderTrophyList, renderGuidePanel } from './trophy-views.js';
import { ROADMAP_STAGES, renderRoadmap, renderRoadmapSummary } from './platinum-roadmap.js';

window.__shotReady = false;

const elements = {
  guideView: document.querySelector('#guideView'),
  roadmapView: document.querySelector('#roadmapView'),
  list: document.querySelector('#trophyList'),
  guidePanel: document.querySelector('#guidePanel'),
  search: document.querySelector('#searchInput'),
  grade: document.querySelector('#gradeFilter'),
  status: document.querySelector('#statusFilter'),
  sort: document.querySelector('#sortOrder'),
  spoilers: document.querySelector('#spoilerToggle'),
  visibleCount: document.querySelector('#visibleCount'),
  listHeading: document.querySelector('#listHeading'),
  progressValue: document.querySelector('#progressValue'),
  progressFill: document.querySelector('#progressFill'),
  progressCaption: document.querySelector('#progressCaption'),
  saveStatus: document.querySelector('#saveStatus'),
  roadmapSummary: document.querySelector('#roadmapSummary'),
  roadmapContent: document.querySelector('#roadmapContent'),
  toast: document.querySelector('#toast'),
};

const KIND_TITLES = {
  all: 'All trophies',
  story: 'Story trophies',
  missable: 'Missable watchlist',
  collectibles: 'Collectibles & discovery',
  activities: 'Activities & challenges',
  online: 'Online trophies',
};
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const ui = { view: 'guide', kind: 'all', selectedId: 17, roadmapStage: 2 };
let drawVersion = 0;
let toastTimer;

function scheduleDrawnFlag() {
  const version = ++drawVersion;
  window.__shotReady = false;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (version === drawVersion) window.__shotReady = true;
  }));
}

function notify(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
}

function downloadJson(filename, payload) {
  const blobUrl = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

async function startFieldManual() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error(`Trophy data could not be loaded (${response.status}).`);
  const data = await response.json();
  const trophies = data.trophies;
  const officialNames = trophies.map((trophy) => trophy.name);
  const store = createProgressStore(officialNames);
  elements.spoilers.checked = store.hideStorySpoilers();

  function filteredTrophies() {
    const query = elements.search.value.trim().toLowerCase();
    const result = trophies.filter((trophy) => {
      if (ui.kind !== 'all' && trophy.kind !== ui.kind) return false;
      if (elements.grade.value !== 'all' && trophy.grade !== elements.grade.value) return false;
      if (elements.status.value === 'earned' && !store.has(trophy.name)) return false;
      if (elements.status.value === 'remaining' && store.has(trophy.name)) return false;
      if (query && !`${trophy.name} ${trophy.description} ${trophy.kind} ${trophy.guide}`.toLowerCase().includes(query)) return false;
      return true;
    });
    if (elements.sort.value === 'roadmap') result.sort((a, b) => a.roadmapOrder - b.roadmapOrder);
    if (elements.sort.value === 'grade') result.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
    return result;
  }

  function renderProgress() {
    const earned = store.count();
    const percentage = (earned / trophies.length) * 100;
    elements.progressValue.innerHTML = `${earned} <small>/ ${trophies.length}</small>`;
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressCaption.textContent = earned === trophies.length ? 'Leonida Legend — complete' : `${trophies.length - earned} remaining on your platinum run`;
    elements.spoilers.checked = store.hideStorySpoilers();
  }

  function renderKindCounts() {
    document.querySelectorAll('[data-kind]').forEach((button) => {
      const kind = button.dataset.kind;
      button.classList.toggle('is-active', ui.kind === kind);
      button.setAttribute('aria-pressed', String(ui.kind === kind));
      const count = kind === 'all' ? trophies.length : trophies.filter((trophy) => trophy.kind === kind).length;
      button.querySelector('b').textContent = String(count);
    });
  }

  function renderGuide() {
    const previousScroll = elements.list.scrollTop;
    const visible = filteredTrophies();
    renderTrophyList(elements.list, visible, store, ui.selectedId);
    elements.list.scrollTop = previousScroll;
    elements.visibleCount.textContent = `${visible.length} shown`;
    elements.listHeading.textContent = KIND_TITLES[ui.kind];
    renderGuidePanel(elements.guidePanel, trophies.find((trophy) => trophy.id === ui.selectedId), store);
    renderProgress();
    renderKindCounts();
  }

  function renderPlatinumRoute() {
    renderRoadmapSummary(elements.roadmapSummary, trophies, store);
    renderRoadmap(elements.roadmapContent, trophies, store, ui.roadmapStage);
    renderProgress();
  }

  function renderCurrentView() {
    if (ui.view === 'guide') renderGuide();
    else renderPlatinumRoute();
    scheduleDrawnFlag();
  }

  function switchView(view) {
    ui.view = view;
    elements.guideView.hidden = view !== 'guide';
    elements.roadmapView.hidden = view !== 'roadmap';
    document.querySelectorAll('.view-tab').forEach((button) => {
      const active = button.dataset.viewTarget === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    renderCurrentView();
  }

  document.querySelectorAll('[data-view-target]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.viewTarget));
  });

  document.querySelector('#kindFilters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (!button) return;
    ui.kind = button.dataset.kind;
    const firstVisible = filteredTrophies()[0];
    if (firstVisible && !filteredTrophies().some((trophy) => trophy.id === ui.selectedId)) ui.selectedId = firstVisible.id;
    elements.list.scrollTop = 0;
    renderGuide();
    scheduleDrawnFlag();
  });

  elements.list.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-trophy]');
    if (!open) return;
    ui.selectedId = Number(open.dataset.openTrophy);
    renderGuide();
    scheduleDrawnFlag();
  });

  elements.list.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-earned-id]');
    if (!checkbox) return;
    const trophy = trophies.find((item) => item.id === Number(checkbox.dataset.earnedId));
    store.toggle(trophy.name);
    elements.saveStatus.textContent = 'Progress saved just now';
    renderGuide();
    scheduleDrawnFlag();
  });

  elements.search.addEventListener('input', () => { elements.list.scrollTop = 0; renderGuide(); scheduleDrawnFlag(); });
  for (const control of [elements.grade, elements.status, elements.sort]) {
    control.addEventListener('change', () => { elements.list.scrollTop = 0; renderGuide(); scheduleDrawnFlag(); });
  }

  elements.spoilers.addEventListener('change', () => {
    store.setSpoilers(elements.spoilers.checked);
    renderGuide();
    scheduleDrawnFlag();
  });

  document.querySelector('#exportProgress').addEventListener('click', () => {
    downloadJson('leonida-progress.json', store.exportProgress());
    notify(`Checklist exported: ${store.count()} of ${trophies.length} earned.`);
    scheduleDrawnFlag();
  });

  document.querySelector('#importProgress').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const count = store.importProgress(JSON.parse(await file.text()));
      renderCurrentView();
      notify(`Checklist imported: ${count} of ${trophies.length} earned.`);
    } catch (error) {
      notify(error.message);
    } finally {
      event.target.value = '';
      scheduleDrawnFlag();
    }
  });

  elements.roadmapContent.addEventListener('click', (event) => {
    const stageButton = event.target.closest('[data-roadmap-stage]');
    if (stageButton) {
      ui.roadmapStage = Number(stageButton.dataset.roadmapStage);
      renderPlatinumRoute();
      scheduleDrawnFlag();
      return;
    }
    const trophyButton = event.target.closest('[data-route-trophy]');
    if (trophyButton) {
      ui.selectedId = Number(trophyButton.dataset.routeTrophy);
      ui.kind = 'all';
      switchView('guide');
    }
  });

  renderGuide();
  document.fonts.ready.then(scheduleDrawnFlag);
}

startFieldManual().catch((error) => {
  elements.guidePanel.innerHTML = `<div class="guide-empty"><strong>Guide could not start.</strong><p>${error.message}</p></div>`;
  throw error;
});
