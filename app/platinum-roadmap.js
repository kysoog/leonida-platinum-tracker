import { isSpoilerProtected } from './trophy-views.js';

export const ROADMAP_STAGES = [
  { id: 1, short: 'Story spine', name: 'Run the story spine', note: 'Chapters + finale', description: 'Play Gone Fishing through the final mission. Chapter and finale trophies are route milestones, not grind targets. Keep a separate manual save before the finale so every side strand stays reachable.' },
  { id: 2, short: 'Loose ends', name: 'Close every named strand', note: 'Cautious missable watch', description: 'Finish named story missions, stranger strands and the two partner setups before committing to the endgame. These flags are conservative: the official list names the work but does not promise post-game replay.' },
  { id: 3, short: 'World craft', name: 'Learn Leonida’s systems', note: 'Combat + discovery', description: 'Clear the one-off combat, robbery and exploration actions while travelling between activity markers. Bank each unusual action now instead of trying to reconstruct it after the collectible sweep.' },
  { id: 4, short: 'Mastery', name: 'Master the activities', note: 'Races + challenges', description: 'Move from one completion to repeated wins and gold medals. Stunt, race and challenge counters are cumulative; the Shooting Range and drone-location requirements need deliberate checklists.' },
  { id: 5, short: 'Completion', name: 'Sweep to 100%', note: 'Collections + economy', description: 'Track each collectible family separately, finish the remaining exploration and gang work, then settle money and property targets. Use the game’s completion display to reconcile the final 100% requirement.' },
  { id: 6, short: 'Platinum', name: 'Audit, then platinum', note: 'Final verification', description: 'Compare all 54 base trophies against this checklist. A Long Road must already record 100% Completion; Vice Got a Price! follows when every other official trophy is earned.' },
];

function routeTrophyName(trophy, store) {
  if (store.hideStorySpoilers() && isSpoilerProtected(trophy) && !store.has(trophy.name)) {
    return `Story trophy #${String(trophy.id).padStart(2, '0')} · hidden`;
  }
  return trophy.name;
}

// Kept separate from the checklist so the route can be read as a plan, not another filter.
export function renderRoadmap(container, trophies, store, selectedStage) {
  const activeStage = ROADMAP_STAGES.find((stage) => stage.id === selectedStage) ?? ROADMAP_STAGES[0];
  const fragment = document.createDocumentFragment();
  const timeline = document.createElement('nav');
  timeline.className = 'route-timeline';
  timeline.setAttribute('aria-label', 'Platinum roadmap stages');

  const timelineTitle = document.createElement('div');
  timelineTitle.className = 'timeline-title';
  timelineTitle.innerHTML = '<span>THE ORDER</span><strong>6 stages / 55 trophies</strong>';
  timeline.append(timelineTitle);

  for (const stage of ROADMAP_STAGES) {
    const stageTrophies = trophies.filter((trophy) => trophy.roadmapStage === stage.id);
    const earned = stageTrophies.filter((trophy) => store.has(trophy.name)).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `route-stage${stage.id === activeStage.id ? ' is-active' : ''}`;
    button.dataset.roadmapStage = String(stage.id);
    const number = document.createElement('span');
    number.className = 'stage-number';
    number.textContent = String(stage.id).padStart(2, '0');
    const copy = document.createElement('span');
    copy.innerHTML = `<strong>${stage.short}</strong><small>${stage.note}</small>`;
    const count = document.createElement('b');
    count.textContent = `${earned}/${stageTrophies.length}`;
    button.append(number, copy, count);
    timeline.append(button);
  }

  const saveNote = document.createElement('div');
  saveNote.className = 'route-save-note';
  saveNote.innerHTML = '<span>SAFE ROUTE RULE</span><strong>Make a manual save before the final mission.</strong><p>Finish every flagged strand first. Replay support is never assumed.</p>';
  timeline.append(saveNote);

  const detail = document.createElement('section');
  detail.className = 'stage-detail';
  const stageTrophies = trophies
    .filter((trophy) => trophy.roadmapStage === activeStage.id)
    .sort((a, b) => a.roadmapOrder - b.roadmapOrder);
  const earned = stageTrophies.filter((trophy) => store.has(trophy.name)).length;
  const heading = document.createElement('header');
  heading.className = 'stage-detail-header';
  heading.innerHTML = `<div><p class="eyebrow">STAGE ${String(activeStage.id).padStart(2, '0')} / 06 · ${earned} OF ${stageTrophies.length} EARNED</p><h2>${activeStage.name}</h2></div><span class="stage-stamp">${String(activeStage.id).padStart(2, '0')}</span>`;
  const description = document.createElement('p');
  description.className = 'stage-description';
  description.textContent = activeStage.description;
  const list = document.createElement('div');
  list.className = 'stage-trophy-list';
  for (const trophy of stageTrophies) {
    const open = document.createElement('button');
    open.type = 'button';
    open.className = `stage-trophy${store.has(trophy.name) ? ' is-earned' : ''}`;
    open.dataset.routeTrophy = String(trophy.id);
    const index = document.createElement('span');
    index.textContent = String(trophy.roadmapOrder).padStart(2, '0');
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = routeTrophyName(trophy, store);
    const trigger = document.createElement('small');
    trigger.textContent = store.hideStorySpoilers() && isSpoilerProtected(trophy) && !store.has(trophy.name)
      ? 'Spoiler-protected official name and unlock condition.'
      : trophy.description;
    copy.append(title, trigger);
    const flags = document.createElement('span');
    flags.className = 'stage-flags';
    if (trophy.missable) flags.innerHTML = '<b class="missable-badge">MISSABLE WATCH</b>';
    const grade = document.createElement('i');
    grade.className = `grade-dot ${trophy.grade}`;
    flags.append(grade);
    open.append(index, copy, flags);
    list.append(open);
  }
  detail.append(heading, description, list);
  fragment.append(timeline, detail);
  container.replaceChildren(fragment);
}

export function renderRoadmapSummary(container, trophies, store) {
  const missables = trophies.filter((trophy) => trophy.missable);
  const earned = store.count();
  container.innerHTML = `
    <div><span>ROUTE COMPLETION</span><strong>${earned}<small> / ${trophies.length}</small></strong></div>
    <div class="route-meter"><i style="width:${(earned / trophies.length) * 100}%"></i></div>
    <div><span>MISSABLE WATCHLIST</span><strong>${missables.length}<small> flagged</small></strong></div>
    <p><b>Why flagged?</b> Named missions and one-setup partner actions are handled before the finale. This is safe routing from official descriptions, not a fabricated claim that replay is impossible.</p>`;
}
