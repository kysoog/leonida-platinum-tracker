export function isSpoilerProtected(trophy) {
  return trophy.kind === 'story' || trophy.story === true;
}

export function trophyIsMasked(trophy, store) {
  return store.hideStorySpoilers() && isSpoilerProtected(trophy) && !store.has(trophy.name);
}

function earnedCheckbox(trophy, store) {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'earned-check';
  box.checked = store.has(trophy.name);
  box.dataset.earnedId = String(trophy.id);
  box.setAttribute('aria-label', `Mark ${trophy.name} ${box.checked ? 'not earned' : 'earned'}`);
  return box;
}

function badge(text, className) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

export function renderTrophyList(container, trophies, store, selectedId) {
  const fragment = document.createDocumentFragment();
  if (trophies.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-list';
    empty.innerHTML = '<strong>No trophies on this path.</strong><span>Clear a filter or try another search.</span>';
    fragment.append(empty);
  }

  for (const trophy of trophies) {
    const masked = trophyIsMasked(trophy, store);
    const row = document.createElement('article');
    row.className = `trophy-row${selectedId === trophy.id ? ' is-selected' : ''}${store.has(trophy.name) ? ' is-earned' : ''}${masked ? ' is-masked' : ''}`;
    row.dataset.trophyRow = String(trophy.id);

    const checkWrap = document.createElement('div');
    checkWrap.className = 'check-wrap';
    checkWrap.append(earnedCheckbox(trophy, store));

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'trophy-open';
    open.dataset.openTrophy = String(trophy.id);
    open.setAttribute('aria-label', `Open guide for ${masked ? 'hidden story trophy' : trophy.name}`);

    const topLine = document.createElement('span');
    topLine.className = 'trophy-topline';
    topLine.append(badge(trophy.grade.toUpperCase(), `grade-badge ${trophy.grade}`));
    if (trophy.missable) topLine.append(badge('MISSABLE WATCH', 'missable-badge'));
    const index = document.createElement('span');
    index.className = 'trophy-index';
    index.textContent = `#${String(trophy.id).padStart(2, '0')}`;
    topLine.append(index);

    const name = document.createElement('strong');
    name.className = 'trophy-name';
    name.dataset.trophyName = String(trophy.id);
    name.textContent = masked ? `Story trophy #${String(trophy.id).padStart(2, '0')} · hidden` : trophy.name;

    const description = document.createElement('span');
    description.className = 'trophy-description';
    description.dataset.trophyDescription = String(trophy.id);
    description.textContent = masked ? 'Protected until earned. Disable spoiler shield to reveal the official name and condition.' : trophy.description;

    const footer = document.createElement('span');
    footer.className = 'trophy-row-footer';
    footer.textContent = masked ? 'SPOILER SHIELD ACTIVE' : `${trophy.kind.toUpperCase()} · STAGE ${trophy.roadmapStage}`;
    const arrow = document.createElement('i');
    arrow.textContent = '↗';
    footer.append(arrow);

    open.append(topLine, name, description, footer);
    row.append(checkWrap, open);
    fragment.append(row);
  }
  container.replaceChildren(fragment);
}

export function renderGuidePanel(container, trophy, store) {
  if (!trophy) {
    container.innerHTML = '<div class="guide-empty"><span>FIELD NOTE</span><strong>Select a trophy.</strong><p>Its route, tracking advice and sources will open here.</p></div>';
    return;
  }
  const masked = trophyIsMasked(trophy, store);
  const earned = store.has(trophy.name);
  container.replaceChildren();

  const scroll = document.createElement('div');
  scroll.className = `guide-scroll${trophy.missable ? ' missable-guide-layout' : ''}`;
  scroll.dataset.guideFor = String(trophy.id);

  const heading = document.createElement('div');
  heading.className = 'guide-heading';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = masked ? 'SPOILER-PROTECTED FIELD NOTE' : `FIELD NOTE ${String(trophy.id).padStart(2, '0')} / ${trophy.kind.toUpperCase()}`;
  const title = document.createElement('h2');
  title.textContent = masked ? 'Story trophy hidden' : trophy.name;
  heading.append(eyebrow, title);

  const badges = document.createElement('div');
  badges.className = 'guide-badges';
  badges.append(badge(trophy.grade.toUpperCase(), `grade-badge ${trophy.grade}`));
  if (trophy.missable) badges.append(badge('MISSABLE WATCH', 'missable-badge'));
  badges.append(badge(earned ? 'EARNED' : 'NOT EARNED', earned ? 'earned-badge' : 'remaining-badge'));
  heading.append(badges);
  scroll.append(heading);

  if (masked) {
    const shield = document.createElement('div');
    shield.className = 'masked-guide';
    shield.innerHTML = '<span class="shield-symbol" aria-hidden="true">×</span><h3>The story stays unspoiled.</h3><p>The official name, description and guide are covered. Earn this trophy to reveal it here, or turn off “Hide story spoilers” in the tracker controls.</p><small>Your checklist position and grade remain visible, so progress still makes sense.</small>';
    scroll.append(shield);
    container.append(scroll);
    return;
  }

  const official = document.createElement('section');
  official.className = 'official-condition';
  const officialLabel = document.createElement('span');
  officialLabel.textContent = 'OFFICIAL UNLOCK CONDITION';
  const officialText = document.createElement('p');
  officialText.textContent = trophy.description;
  official.append(officialLabel, officialText);
  scroll.append(official);

  if (trophy.missable) {
    const warning = document.createElement('section');
    warning.className = 'missable-callout';
    warning.innerHTML = '<strong>FINISH IT BEFORE THE FINALE</strong><p>This named mission, strand or setup gets a cautious missable flag. The official list does not confirm whether later replay is possible; a fresh manual save is the safe route.</p>';
    scroll.append(warning);
  }

  const guide = document.createElement('section');
  guide.className = 'guide-body';
  const guideLabel = document.createElement('span');
  guideLabel.className = 'section-label';
  guideLabel.textContent = ' YOUR ROUTE ';
  guide.append(guideLabel);
  for (const paragraphText of trophy.guide.split(/\n\n+/)) {
    const paragraph = document.createElement('p');
    paragraph.textContent = paragraphText;
    guide.append(paragraph);
  }
  scroll.append(guide);

  const checkpoint = document.createElement('section');
  checkpoint.className = 'checkpoint-note';
  const checkpointTitle = document.createElement('strong');
  checkpointTitle.textContent = 'PROGRESS CHECK';
  const checkpointText = document.createElement('p');
  checkpointText.textContent = trophy.progressCheck;
  checkpoint.append(checkpointTitle, checkpointText);
  scroll.append(checkpoint);

  const route = document.createElement('div');
  route.className = 'guide-route-tag';
  route.innerHTML = `<span>PLATINUM ROUTE</span><strong>STAGE ${trophy.roadmapStage} · ${trophy.stageName}</strong>`;
  scroll.append(route);

  const sources = document.createElement('section');
  sources.className = 'source-ledger';
  const sourceTitle = document.createElement('h3');
  sourceTitle.textContent = 'SOURCES & CERTAINTY';
  sources.append(sourceTitle);
  for (const source of trophy.sources) {
    const item = document.createElement('div');
    item.className = 'source-item';
    const label = document.createElement('strong');
    label.textContent = source.label;
    const use = document.createElement('p');
    use.textContent = source.use;
    item.append(label, use);
    sources.append(item);
  }
  scroll.append(sources);
  container.append(scroll);
}
