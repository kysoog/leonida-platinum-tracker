import { loadTrophyDocument, renderTrophyGuide, renderTrophySummary } from './trophy-views.js';
import { createProgressStore } from './progress-store.js';
let roadmapApi;
let roadmapModulePromise;
async function requireRoadmap() {
  roadmapModulePromise ??= import('./platinum-roadmap.js');
  roadmapApi = await roadmapModulePromise;
  return roadmapApi;
}

const SESSION_KEY = 'leonida-platinum-ui-v2';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const elements = {
  guideView: $('#guideView'), roadmapView: $('#roadmapView'), list: $('#trophyList'), guide: $('#trophyGuide'),
  resultCount: $('#resultCount'), browserTitle: $('#browserTitle'), empty: $('#emptyState'), toast: $('#toast'),
  spoiler: $('#spoilerToggle'), progressValue: $('#progressValue'), progressFill: $('#progressFill'), storage: $('#storageStatus'),
};

let documentData;
let trophies = [];
let trophyById = new Map();
let store;
let toastTimer;
let state = { view: 'guide', kind: 'all', grade: 'all', earned: 'all', search: '', roadmapStage: 1, selected: null };

try {
  const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
  if (saved && typeof saved === 'object') {
    if (['guide', 'roadmap'].includes(saved.view)) state.view = saved.view;
    state.roadmapStage = Number.isInteger(saved.roadmapStage) && saved.roadmapStage >= 1 && saved.roadmapStage <= 6 ? saved.roadmapStage : 1;
  }
} catch { /* A clean session is a valid fallback. */ }

function persistUi() {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ view: state.view, roadmapStage: state.roadmapStage })); } catch { /* UI state is optional. */ }
}

function toast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2300);
}

function matches(trophy) {
  if (state.kind !== 'all' && trophy.kind !== state.kind) return false;
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.earned === 'earned' && !store.has(trophy.name)) return false;
  if (state.earned === 'open' && store.has(trophy.name)) return false;
  const query = state.search.trim().toLocaleLowerCase();
  if (!query) return true;
  return [trophy.name, trophy.description, trophy.guide, trophy.unlockContext, trophy.progressCheck, ...trophy.sources.map((source) => source.label)]
    .join(' ').toLocaleLowerCase().includes(query);
}

function renderProgress() {
  const count = store.count();
  elements.progressValue.textContent = `${count} / ${trophies.length}`;
  elements.progressFill.style.width = `${count / trophies.length * 100}%`;
  elements.storage.textContent = store.status();
  elements.storage.style.color = store.isPersistent() ? '' : '#934821';
}

function renderActiveFilters() {
  const active = (selector, attribute, value) => $$(selector).forEach((button) => {
    const current = button.dataset[attribute] === value;
    button.classList.toggle('is-active', current);
    button.setAttribute('aria-pressed', String(current));
  });
  active('[data-kind]', 'kind', state.kind);
  active('[data-grade]', 'grade', state.grade);
  active('[data-state]', 'state', state.earned);
}

function renderList() {
  const visible = trophies.filter(matches);
  const fragment = document.createDocumentFragment();
  visible.forEach((trophy, listIndex) => {
    fragment.append(renderTrophySummary({
      trophy,
      isEarned: store.has(trophy.name),
      isSelected: state.selected === trophy.id,
      isSearched: Boolean(state.search.trim()),
      hideStorySpoilers: store.hideStorySpoilers(),
      listIndex,
    }));
  });
  elements.list.replaceChildren(fragment);
  elements.resultCount.textContent = `${visible.length} shown`;
  elements.browserTitle.textContent = state.kind === 'missable' ? 'Potential missable' : 'Trophy desk';
  elements.empty.hidden = visible.length !== 0;
  renderActiveFilters();
}

function renderGuide() {
  const trophy = trophyById.get(state.selected);
  elements.guide.hidden = !trophy;
  if (trophy) renderTrophyGuide(elements.guide, trophy, store);
}

async function renderRoadmapView() {
  const roadmap = await requireRoadmap();
  if (state.view !== 'roadmap') return;
  roadmap.renderRoadmapSummary($('#roadmapSummary'), trophies, store);
  roadmap.renderRoadmap($('#roadmapRoute'), trophies, store, state.roadmapStage);
}

function render() {
  renderProgress();
  elements.spoiler.checked = store.hideStorySpoilers();
  elements.guideView.hidden = state.view !== 'guide';
  elements.roadmapView.hidden = state.view !== 'roadmap';
  $$('.view-tab').forEach((button) => {
    const active = button.dataset.viewTarget === state.view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  renderList();
  renderGuide();
  if (state.view === 'roadmap') void renderRoadmapView().catch((error) => toast(`Roadmap could not load: ${error.message}`));
}

function selectTrophy(id) {
  if (!trophyById.has(id)) return;
  state.selected = id;
  renderList();
  renderGuide();
  elements.guide.scrollTop = 0;
}

function openFromRoadmap(id) {
  state.view = 'guide';
  state.selected = id;
  persistUi();
  render();
}

function collectionButton(containerSelector, dataKey, after) {
  $(containerSelector).addEventListener('click', (event) => {
    const button = event.target.closest(`[data-${dataKey}]`);
    if (!button) return;
    after(button.dataset[dataKey]);
  });
}

collectionButton('#gradeFilters', 'grade', (grade) => { state.grade = grade; renderList(); });
collectionButton('#stateFilters', 'state', (earned) => { state.earned = earned; renderList(); });
$$('.kind-tabs').forEach((container) => container.addEventListener('click', (event) => {
  const button = event.target.closest('[data-kind]');
  if (!button) return;
  state.kind = button.dataset.kind;
  renderList();
}));
$$('.view-tab').forEach((button) => button.addEventListener('click', () => {
  state.view = button.dataset.viewTarget;
  persistUi();
  render();
}));

elements.list.addEventListener('click', (event) => {
  const open = event.target.closest('[data-open-trophy]');
  if (open) selectTrophy(Number(open.dataset.openTrophy));
});
elements.list.addEventListener('change', (event) => {
  const input = event.target.closest('[data-earned-id]');
  if (!input) return;
  const id = Number(input.dataset.earnedId);
  const trophy = trophyById.get(id);
  store.toggle(trophy.name);
  renderProgress();
  renderList();
  renderGuide();
});
elements.guide.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-guide]')) {
    state.selected = null;
    renderList();
    renderGuide();
  }
});
$('#roadmapRoute').addEventListener('click', (event) => {
  const stage = event.target.closest('[data-roadmap-stage]');
  if (stage) {
    state.roadmapStage = Number(stage.dataset.roadmapStage);
    persistUi();
    roadmapApi.renderRoadmap($('#roadmapRoute'), trophies, store, state.roadmapStage);
    return;
  }
  const trophy = event.target.closest('[data-open-trophy]');
  if (trophy) openFromRoadmap(Number(trophy.dataset.openTrophy));
});

$('#searchInput').addEventListener('input', (event) => { state.search = event.target.value; renderList(); });
elements.spoiler.addEventListener('change', () => { store.setSpoilers(elements.spoiler.checked); render(); });
$('#clearFilters').addEventListener('click', () => {
  state.kind = state.grade = state.earned = 'all';
  state.search = '';
  $('#searchInput').value = '';
  renderList();
});
$('[data-missable-shortcut]').addEventListener('click', () => {
  state.view = 'guide';
  state.kind = 'missable';
  state.grade = state.earned = 'all';
  state.search = '';
  $('#searchInput').value = '';
  state.selected = 28;
  persistUi();
  render();
});

$('#exportProgress').addEventListener('click', () => {
  const blob = new Blob([`${JSON.stringify(store.exportProgress(), null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-platinum-checklist.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Checklist exported as portable JSON.');
});
$('#importProgress').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const count = store.importProgress(JSON.parse(await file.text()));
    render();
    toast(`Checklist restored: ${count} of 55 earned.`);
  } catch (error) { toast(error.message); }
  event.target.value = '';
});

async function start() {
  try {
    documentData = await loadTrophyDocument();
    trophies = documentData.trophies;
    trophyById = new Map(trophies.map((trophy) => [trophy.id, trophy]));
    store = createProgressStore(trophies.map((trophy) => trophy.name));
    render();
  } catch (error) {
    const message = `The local field manual could not start: ${error.message}. Serve this app/ directory over HTTP rather than opening the file as file://.`;
    $('#loadError').textContent = message;
    $('#loadError').hidden = false;
  }
}

start();
