export const GRADE_TITLES = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
export const DATA_URL = './data/trophies.json';

export async function loadTrophyDocument() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Trophy data request failed: HTTP ${response.status}`);
  const document = await response.json();
  const levels = new Set(Object.keys(GRADE_TITLES));
  if (!document || !Array.isArray(document.trophies)) throw new Error('The trophy document does not contain a trophies array.');
  if (document.trophies.length !== 55) throw new Error('This edition requires the official 55-trophy list.');
  const names = new Set();
  for (const [position, trophy] of document.trophies.entries()) {
    if (!trophy.name?.trim() || !trophy.description?.trim() || !trophy.guide?.trim()) throw new Error(`Incomplete trophy at position ${position + 1}.`);
    if (trophy.guide.length < 180 || !trophy.unlockContext?.trim() || !trophy.progressCheck?.trim()) throw new Error(`Guide needs concrete placement, steps and an earned check at ${trophy.name}.`);
    if (!levels.has(trophy.grade) || names.has(trophy.name)) throw new Error(`Invalid grade or duplicate name at ${trophy.name}.`);
    if (!Array.isArray(trophy.sources) || trophy.sources.length === 0) throw new Error(`No cited source for ${trophy.name}.`);
    for (const source of trophy.sources) {
      if (!source.label?.trim() || !/^https:\/\//.test(source.url ?? '')) throw new Error(`Incomplete source for ${trophy.name}.`);
    }
    names.add(trophy.name);
  }
  return document;
}

// Only main-story and character-strand quests are masked. Activities and collection
// objectives remain readable so spoiler mode never destroys the platinum route.
export function isSpoilerProtected(trophy) {
  return trophy.story === true && !['platinum'].includes(trophy.grade);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderTrophySummary({ trophy, isEarned, isSelected, isSearched, hideStorySpoilers, listIndex }) {
  const row = element('article', `trophy-row${isSelected ? ' is-selected' : ''}${isEarned ? ' is-earned' : ''}`);
  row.dataset.trophyRow = String(trophy.id);
  const open = element('button');
  open.type = 'button';
  open.className = 'trophy-open';
  open.dataset.openTrophy = String(trophy.id);
  open.setAttribute('aria-label', `Read independently written guide for ${trophy.name}${trophy.missable ? ', potential Chapter 1 missable' : ''}`);

  const meta = element('span', 'grade-line');
  const grade = element('i', `grade-token ${trophy.grade}`);
  meta.append(grade, document.createTextNode(`${String(listIndex).padStart(2, '0')} · ${GRADE_TITLES[trophy.grade]} • ${trophy.id}/55`));
  if (trophy.missable) {
    const award = element('b', 'mini-award', 'CH.1 WATCH');
    award.style.color = '#934821';
    meta.append(award);
  } else if (!isEarned && hideStorySpoilers && isSpoilerProtected(trophy)) {
    meta.append(element('span', 'mini-award', 'STORY HIDDEN'));
  } else if (isEarned) {
    meta.append(element('span', 'mini-award', 'EARNED'));
  }

  const concealed = hideStorySpoilers && isSpoilerProtected(trophy) && !isEarned;
  const name = element('strong', 'trophy-name', concealed ? `Story trophy #${String(trophy.id).padStart(2, '0')} · hidden` : trophy.name);
  name.dataset.trophyName = String(trophy.id);
  const condition = element('span', 'trophy-description', concealed ? 'Official condition protected. Story mission completion unlocks it naturally.' : trophy.description);
  condition.dataset.trophyDescription = String(trophy.id);
  const context = element('span', 'context-line', concealed ? 'AUTO STORY · finish its chapter' : trophy.unlockContext);
  open.append(meta, name, condition, context);

  const label = element('label', 'earned-control');
  const box = element('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.dataset.earnedId = String(trophy.id);
  box.setAttribute('aria-label', `Mark ${trophy.name} earned`);
  label.append(box, element('span', 'check-box'));
  row.append(open, label);
  return row;
}

export function renderTrophyGuide(container, trophy, store) {
  const scroll = element('div', 'guide-scroll');
  const heading = element('header', 'guide-heading');
  const close = element('button', '', '×');
  close.type = 'button';
  close.dataset.closeGuide = '';
  close.setAttribute('aria-label', 'Close selected trophy guide');
  close.title = 'Close guide';
  heading.append(close);

  const meta = element('p', 'guide-title-grade');
  meta.append(element('i', `grade-token ${trophy.grade}`), document.createTextNode(`${store.has(trophy.name) ? 'EARNED' : 'NOT EARNED'} · ${GRADE_TITLES[trophy.grade]} · official ${trophy.id}/55`));
  const title = element('h2', '', trophy.name);
  title.id = 'guideTitle';
  const context = element('p', 'guide-context', trophy.unlockContext);
  heading.append(meta, title, context);

  const condition = element('div', 'official-condition');
  condition.append(element('span', '', 'PLAYSTATION / OFFICIAL UNLOCK DESCRIPTION'), element('p', '', trophy.description));
  scroll.append(heading, condition);

  if (trophy.missableWindow) {
    const window = element('aside', 'missable-window');
    window.append(
      element('span', '', 'POTENTIAL MISSABLE / CONSERVATIVE ROUTE'),
      element('strong', '', trophy.missableWindow),
      element('small', '', 'Jason’s kitchen → follow Lucia to balcony → Accept before Chapter 2. Keep a chapter save; trophy necessity is unconfirmed.'),
    );
    scroll.append(window);
  }

  const authored = element('section', 'original-guide');
  authored.append(element('h3', '', 'FIELD NOTE / THIS MANUAL’S OWN WORDS'));
  const copy = element('div', 'guide-copy');
  for (const paragraph of trophy.guide.split(/\n\n+/)) copy.append(element('p', '', paragraph));
  authored.append(copy);
  authored.append(element('p', 'guide-basis', `Research beside these steps: ${trophy.sources.map((source) => source.label).join(' + ')}. Named links are pinned below.`));
  scroll.append(authored);

  const route = element('div', 'route-reference');
  route.append(element('span', 'stage-square', String(trophy.roadmapStage).padStart(2, '0')));
  route.append(element('span', ''));
  route.lastChild.append(element('strong', '', trophy.stageName), element('small', '', `PLATINUM ROUTE · POSITION ${trophy.roadmapOrder}/55`));
  scroll.append(route);

  const note = element('aside', 'progress-note');
  note.append(element('span', '', 'WHEN TO MARK IT EARNED'), element('strong', '', trophy.progressCheck));
  scroll.append(note);

  const sources = element('section', 'guide-sources');
  sources.append(element('h3', '', 'RESEARCH SOURCES / LINKS OPEN ONLY WHEN SELECTED'));
  for (const source of trophy.sources) {
    const entry = element('div', 'source-entry');
    const link = element('a', '', source.label);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    entry.append(link, element('p', '', source.use));
    sources.append(entry);
  }
  // Keep bibliography visible while long route copy scrolls independently.
  container.replaceChildren(scroll, sources);
  container.setAttribute('aria-labelledby', 'guideTitle');
}
