import { GRADE_TITLES, isSpoilerProtected } from './trophy-views.js';

export const ROADMAP_STAGES = [
  {
    id: 1, short: 'Story + insurance', name: 'Run the story, save the meditation', note: '12 story milestones',
    description: 'Finish the five-chapter story and its named missions. In Chapter 1, after Down to Earth, accept Lucia’s balcony meditation before Chapter 2. Keep manual saves at chapter boundaries because there is no mission replay; other story trophies are automatic.',
  },
  {
    id: 2, short: 'Character work', name: 'Close character and partner strands', note: 'Avail. after story',
    description: 'Work the Andy, Kenton, Billy, Randy, Tyrone and Bret questlines plus the two co-op setups. Some contacts pause temporarily, but all trophy-related strands return and remain available after the story. Only the Chapter 1 meditation needs a hard deadline.',
  },
  {
    id: 3, short: 'World craft', name: 'Bank the unusual one-offs', note: 'Free-roam / crime craft',
    description: 'Clear the VCIA departure, Rhino, stealth jewellery job, map fog, showroom Banshee, Kingpin valuables, UFO and other specific conditions while travelling. Robberies and criminal-profile actions feed the broader 100% sweep at the same time.',
  },
  {
    id: 4, short: 'Activity mastery', name: 'Master races, ranges and collections', note: 'Medals + activity types',
    description: 'Complete all 42 Shooting Range golds, win at all 14 drone hubs, clear 20 unique races, sample all nine activity types and work toward 250 unique stunts. Continue to 200 vehicle scans and 50 challenges while routing between activities.',
  },
  {
    id: 5, short: 'The 100% sweep', name: 'Reconcile the full completion ledger', note: '≈100 hours / Stage 2 of 3',
    description: 'After the story, use Progress > Stats > 100% Completion. Finish 100 optional tasks, 39 gang operations, all 8 vaults, 70/80 challenges, 42 drone trials, 300 stunts and 15 Target Decks. The in-game checklist is authoritative; this tracker’s 55 ticks are not a 100% substitute.',
  },
  {
    id: 6, short: 'Final audit', name: 'Close strangers, then platinum', note: '≈10 hours / Stage 3 of 3',
    description: 'Strangers & Freaks do not feed 100% Completion, so close eight qualifying strands now if any remain. Then compare all 54 base trophies against the console list. Vice Got a Price! is the final audit, not a separate activity.',
  },
];

function routeTrophyName(trophy, store) {
  if (store.hideStorySpoilers() && isSpoilerProtected(trophy) && !store.has(trophy.name)) {
    return `Story trophy #${String(trophy.id).padStart(2, '0')} · hidden`;
  }
  return trophy.name;
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function renderRoadmap(container, trophies, store, selectedStage) {
  const activeStage = ROADMAP_STAGES.find((stage) => stage.id === selectedStage) ?? ROADMAP_STAGES[0];
  const fragment = document.createDocumentFragment();
  const timeline = node('nav', 'route-timeline');
  timeline.setAttribute('aria-label', 'Ordered platinum roadmap stages');
  const timelineTitle = node('div', 'timeline-title');
  timelineTitle.append(node('span', '', 'EARNING ORDER'), node('strong', '', '6 stages / 55 trophies'));
  timeline.append(timelineTitle);

  for (const stage of ROADMAP_STAGES) {
    const stageTrophies = trophies.filter((trophy) => trophy.roadmapStage === stage.id);
    const earned = stageTrophies.filter((trophy) => store.has(trophy.name)).length;
    const button = node('button', `route-stage${stage.id === activeStage.id ? ' is-active' : ''}`);
    button.type = 'button';
    button.dataset.roadmapStage = String(stage.id);
    button.title = stage.note;
    button.append(node('span', 'stage-number', String(stage.id).padStart(2, '0')));
    const copy = node('span');
    copy.append(node('strong', '', stage.short), node('small', '', stage.note));
    button.append(copy, node('b', '', `${earned}/${stageTrophies.length}`));
    timeline.append(button);
  }
  const saveNote = node('div', 'route-save-note');
  saveNote.append(
    node('span', '', 'THE ONE HARD WINDOW'),
    node('strong', '', 'Chapter 1 · after Down to Earth · before Chapter 2'),
    node('p', '', 'Balcony meditation · 1 of 18. Trophy necessity is unconfirmed; use this cheap insurance.'),
  );
  timeline.append(saveNote);

  const detail = node('section', 'stage-detail');
  const stageTrophies = trophies.filter((trophy) => trophy.roadmapStage === activeStage.id).sort((a, b) => a.roadmapOrder - b.roadmapOrder);
  const earned = stageTrophies.filter((trophy) => store.has(trophy.name)).length;
  const heading = node('header', 'stage-detail-header');
  const headingCopy = node('div');
  headingCopy.append(node('p', 'eyebrow', `STAGE ${String(activeStage.id).padStart(2, '0')} / 06 · ${earned} OF ${stageTrophies.length} EARNED`), node('h2', '', activeStage.name));
  heading.append(headingCopy, node('span', 'stage-stamp', String(activeStage.id).padStart(2, '0')));
  const description = node('p', 'stage-description', activeStage.description);
  const list = node('div', 'stage-trophy-list');

  for (const trophy of stageTrophies) {
    const open = node('button', `stage-trophy${store.has(trophy.name) ? ' is-earned' : ''}`);
    open.type = 'button';
    open.dataset.openTrophy = String(trophy.id);
    open.append(node('span', '', String(trophy.roadmapOrder).padStart(2, '0')));
    const copy = node('span');
    copy.append(node('strong', '', routeTrophyName(trophy, store)));
    const concealed = store.hideStorySpoilers() && isSpoilerProtected(trophy) && !store.has(trophy.name);
    copy.append(node('small', '', concealed ? 'Spoiler-protected story milestone; automatic in its chapter.' : trophy.unlockContext));
    const flags = node('span', 'stage-flags');
    if (trophy.missable) flags.append(node('b', 'missable-badge', 'CH.1 WINDOW'));
    flags.append(node('b', 'stage-grade', GRADE_TITLES[trophy.grade]), node('i', `grade-token ${trophy.grade}`));
    open.append(copy, flags);
    list.append(open);
  }
  detail.append(heading, description, list);
  fragment.append(timeline, detail);
  container.replaceChildren(fragment);
}

export function renderRoadmapSummary(container, trophies, store) {
  const missables = trophies.filter((trophy) => trophy.missable);
  const earned = store.count();
  container.replaceChildren();
  const completion = node('div');
  completion.append(node('span', '', 'LOCAL ROUTE COMPLETION'), node('strong', '', `${earned} / ${trophies.length}`));
  const meter = node('div', 'route-meter');
  const fill = node('i');
  fill.style.width = `${(earned / trophies.length) * 100}%`;
  meter.append(fill);
  const watch = node('div');
  const count = node('strong', '', `${missables.length} flagged `);
  count.append(node('small', '', 'potential'));
  watch.append(node('span', '', 'CONSERVATIVE MISSABLE WATCH'), count);
  const note = node('p');
  note.append(node('b', '', 'One evidence-backed window. '), document.createTextNode('Only the Chapter 1 meditation gets a deadline; necessity is unconfirmed. Every other strand remains recoverable.'));
  container.append(completion, meter, watch, note);
}
