import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../app/data/trophies.json', import.meta.url);
const document = JSON.parse(readFileSync(path, 'utf8'));

const MISSABLE = new Set([8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27, 29, 33, 34]);
const STORY = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27]);
const COLLECTIBLES = new Set([28, 30, 31, 35, 42, 54, 55]);
const STAGES = {
  1: [2, 3, 4, 5, 6, 7],
  2: [8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27, 29, 33, 34],
  3: [36, 37, 38, 39, 40, 41, 44, 45, 46, 47, 48, 49, 50, 51],
  4: [15, 16, 17, 18, 19, 20, 21, 32],
  5: [14, 28, 30, 31, 35, 42, 43, 52, 53, 54, 55],
  6: [1],
};
const STAGE_NAMES = {
  1: 'Run the story spine',
  2: 'Close every named strand',
  3: 'Learn Leonida’s systems',
  4: 'Master the activities',
  5: 'Sweep to 100%',
  6: 'Audit, then platinum',
};
const COUNT_NOTES = {
  17: '42 Shooting Range challenges',
  18: '14 Top Fun Drone Race locations',
  28: '18 meditation spots',
  42: '52 areas of Leonida',
  43: '9 gangs',
  48: '500 logged choices',
  54: '8 garage properties',
};

const notes = {
  1: {
    guide: 'Treat this as the audit at the end of the route, not a fifty-sixth objective. Earn every one of the other 54 trophies, including A Long Road for 100% Completion, then check for gaps by grade and kind in this tracker.\n\nBefore the final cleanup, leave a manual save with all remaining activities accessible. The platinum has no separate location or challenge in the official description; if it has not appeared, another base trophy is still missing.',
    progressCheck: '54 / 54 other trophies earned. This tracker’s checklist is useful for the audit; the console’s own trophy list is the final authority.',
  },
  2: {
    guide: 'Prioritise Gone Fishing when it appears in the story route and finish the mission through its completion screen. Follow the current objective rather than detouring into side activities; the official condition is completion, not a particular score, time or approach.\n\nNo optional requirement is stated in the list. If the trophy does not appear, confirm that the mission actually ended instead of assuming that reaching its last objective was enough.',
    progressCheck: 'Gone Fishing is marked complete and the trophy has unlocked. One completion is sufficient; no medal target is given.',
  },
  3: {
    guide: 'Finish every required mission and transition belonging to Chapter 1. Continue until the story moves into Chapter 2; completing only the last active objective is not the same as closing the chapter.\n\nUse this chapter break as a housekeeping point: make a manual save, then tick the trophy. The description gives no optional challenge or performance condition, so do not add one to your route.',
    progressCheck: 'Chapter 1 is complete and Chapter 2 has begun. There is no collectible or score requirement in the official trigger.',
  },
  4: {
    guide: 'Advance the central story until Chapter 2 is fully complete and Chapter 3 starts. If you are using side missions for money or practice, return to the next main objective afterwards so the chapter does not remain open accidentally.\n\nKeep a manual save at this second chapter break. That is route planning rather than an official requirement, but it gives you a clean return point for any named side work you postponed.',
    progressCheck: 'The story records Chapter 2 complete. Tick only on the chapter-completion unlock, not on starting its final mission.',
  },
  5: {
    guide: 'Complete the remaining main-story chain for Chapter 3 and play into the transition to Chapter 4. The unlock condition is the chapter itself, so a mission replay or a high score is unnecessary unless the game separately asks for one to progress.\n\nBefore moving on, compare the chapter trophies already earned in this checklist. Catching a missing chapter milestone now is easier than diagnosing an incomplete platinum audit later.',
    progressCheck: 'Chapter 3 completion is recorded and Chapter 4 is available. No optional collectible count is attached to this trophy.',
  },
  6: {
    guide: 'Finish Chapter 4 by following its main objectives to the chapter close. Resist saving every open-world task for this point: named strands in Stage 2 of the roadmap should already be cleared or consciously scheduled before the finale.\n\nThe official text identifies chapter completion only. Any preparation, equipment or route suggestion here is practical planning, not an additional hidden unlock condition.',
    progressCheck: 'Chapter 4 is closed. Check that the other four chapter trophies and the final-mission trophy are the only story-spine entries left.',
  },
  7: {
    guide: 'Complete the final mission and continue through its conclusion until the unlock is recorded. This gold trophy is the end of the story spine, not the end of the platinum route: full completion and all remaining activity, collection and action trophies still matter.\n\nCreate a fresh manual save immediately before starting the finale as a precaution. The official list does not establish whether every side strand remains replayable afterwards.',
    progressCheck: 'The final mission is complete. All six earlier story-spine entries should also be earned before the Stage 5 completion sweep.',
  },
  8: {
    guide: 'Complete Breakfast Run as soon as its mission strand is available, then confirm the mission end rather than leaving during a follow-up objective. Its official unlock is completion of that named mission, with no stated rating or collectible requirement.\n\nThis guide flags it as a cautious missable watch because it is a named side mission. That does not assert it becomes permanently unavailable; finishing before the finale simply removes the replay question.',
    progressCheck: 'Breakfast Run shows a completed result. Untick if you only started the mission or finished an earlier mission in its strand.',
  },
  9: {
    guide: 'Follow The Cartel Heist mission through preparation, execution and its completion result. Planning and escape suggestions would depend on details the official text does not provide, so this route does not invent a required approach.\n\nClear it during Stage 2 alongside the other named missions. Save beforehand if you want to retry freely, and tick the trophy only after the entire heist mission is complete.',
    progressCheck: 'The Cartel Heist is complete, including any closing sequence. The official condition does not ask for a particular loot value or medal.',
  },
  10: {
    guide: 'Complete Child’s Play from mission start to its closing result. If it belongs to a chain, use the next-objective marker to return to the correct strand rather than confusing its title with a generic activity of a similar theme.\n\nNo score, time limit or optional objective appears in the official condition. The missable watch is a routing precaution for a named mission, not evidence that the mission can never be replayed.',
    progressCheck: 'Child’s Play has a completed result. Starting it or finishing only an intermediate objective does not satisfy the description.',
  },
  11: {
    guide: 'Finish Headliners and remain through any concluding scene until the mission is recorded complete. Return to its strand if other activities interrupt you instead of assuming partial progress will unlock the trophy.\n\nThe spelling DWNFALL is intentional and preserved from PlayStation’s list. Use Headliners, not the trophy title, when searching your mission history or planning the strand.',
    progressCheck: 'Headliners is complete. No performance target is stated; completion alone is the useful checkpoint.',
  },
  12: {
    guide: 'Complete VCIA Takedown during the named-mission cleanup. Treat every phase as part of the same job until the game produces a completion result; an escape or combat phase by itself is not enough.\n\nVCIA is kept exactly as the official description names it. This guide adds no unverified airport route or required tactic, only the safe instruction to finish the mission before the story finale.',
    progressCheck: 'VCIA Takedown is marked complete. A nearby activity or an earlier setup mission should not be counted as this trophy.',
  },
  13: {
    guide: 'Play Operation Savage Glory to its mission-complete result. If the strand offers multiple approaches, choose the one you can finish reliably; the official text does not require a specific method, difficulty or rating.\n\nThis is the last named mission in the initial story block, so use it as the point to inspect the other Breakfast Run through VCIA Takedown entries before continuing the route.',
    progressCheck: 'Operation Savage Glory is complete. The previous five named-mission trophies should also be checked off.',
  },
  14: {
    guide: 'Reach 100% Completion after clearing the game’s required completion categories, not merely every trophy in this app. Trophy progress and game completion are different ledgers: the official condition explicitly asks for the latter.\n\nLate in Stage 5, compare the in-game completion display with your remaining activity and collectible work, then finish the incomplete categories. Exactly which categories the game counts is not stated in the trophy description, so this guide does not invent a percentage formula.',
    progressCheck: 'The game itself reads 100% Completion. A full checklist here helps, but only the in-game percentage proves this gold trophy’s condition.',
  },
  15: {
    guide: 'Build up 250 successfully recorded Stunts over the course of normal driving instead of leaving the whole counter to the end. Favour attempts you can land and repeat safely; a crash that is not registered as a completed stunt is not progress.\n\nThe official description gives a cumulative count and does not say 250 different stunt sites. Use the game’s own record to verify what registers before settling into a repeatable route. Any farming circuit is a preference, not an official requirement.',
    progressCheck: '250 Stunts recorded. Inspect the counter after a small test batch so you know which successful attempts the game accepts.',
  },
  16: {
    guide: 'Sample every distinct activity type at least once. Keep a handwritten list of activity categories as you encounter their icons or introductions, and play each long enough for the game to register participation rather than walking away at the opening prompt.\n\nThe trophy says each type, so repeating several events of one type cannot replace a missing category. The official description does not enumerate the categories here; reconcile them in-game instead of trusting an invented list.',
    progressCheck: 'Every activity category has one recorded attempt. Review the list by category, not by total number of events played.',
  },
  17: {
    guide: 'Earn gold in every one of the 42 Shooting Range challenges noted with the official-list count. Work one challenge at a time: learn its target pattern, use a retry to correct the specific reason you missed gold, and record the medal before moving on.\n\nA silver or personal-best score is not a substitute for gold. Gold all 42 rather than completing 42 with mixed medals; the trophy’s wording makes medal quality and full coverage equally important.',
    progressCheck: '42 of 42 Shooting Range challenges show gold. The kit supplies the count; the official description supplies the all-gold requirement.',
  },
  18: {
    guide: 'Win a Top Fun Drone Race at each of the 14 locations recorded with the official-list count. Location coverage is the key: repeated wins at one comfortable course do not satisfy the every-location wording.\n\nMaintain a 14-line location checklist using the names shown in the game, and mark only wins. Practice runs and second-place finishes are useful for learning a course but should not change your count.',
    progressCheck: '14 distinct Top Fun Drone Race locations each have a win. Check for locations visited but not yet won.',
  },
  19: {
    guide: 'Win 20 different races. Keep the event names or map labels in a list and cross each off after a first-place finish; unlike a simple 20-win grind, this wording requires variety.\n\nDo not count losses, practice sessions or another win on a course already checked off. Races used for Top Fun have their own location condition, so track their separate requirements rather than assuming either trophy automatically finishes the other.',
    progressCheck: '20 unique race names each carry a win. Your checklist should contain no duplicate course.',
  },
  20: {
    guide: 'Take part in Cal’s fishing challenge and finish with a winning result against Cal. Catching fish beside Cal or completing an unrelated fishing activity is not the stated condition; the opponent and challenge result both matter.\n\nThe official text does not specify bait, water, species or score, so use the challenge’s displayed rules. Retry if necessary and tick only when Cal is beaten.',
    progressCheck: 'Cal’s challenge ends in your win. A general fishing catch or unrelated angler challenge does not count.',
  },
  21: {
    guide: 'Choose an arcade game and play it through to a completed result. Reaching a game-over screen may differ from completing the game, so check its own objective or ending rather than assuming any short session qualifies.\n\nNo particular cabinet, score or difficulty is named in the official condition. Pick the game you understand best; one finished arcade game is enough for this bronze trophy.',
    progressCheck: 'One arcade title shows a completed run. Merely inserting a credit or attempting the opening level is not the checkpoint.',
  },
  22: {
    guide: 'Follow Andy’s mission strand to its final mission and complete that last job. Earlier favours for Andy do not satisfy the wording; continue until no subsequent mission in his strand is required.\n\nHandle the strand before the finale under the cautious missable-watch rule. The official description names the endpoint but gives no required choice, reward or rating.',
    progressCheck: 'Andy’s final mission is complete. Do not tick after the first or penultimate Andy mission.',
  },
  23: {
    guide: 'Work through Kenton’s jobs in order and complete his final mission. If his next appearance is not obvious, finish other active objectives and recheck the available stranger markers rather than assuming the strand ended early.\n\nThat marker-search step is practical inference, not a quoted game mechanic. The certain condition is completion of Kenton’s last mission, ideally before the final story mission.',
    progressCheck: 'Kenton’s strand has reached and completed its final job, not just one encounter with the character.',
  },
  24: {
    guide: 'Complete Billy’s whole mission strand, ending with his final mission. Keep it separate from riding-related free-roam activities: the trophy title does not replace the explicit official condition.\n\nSave before the last job if you want a safety net, and finish this named strand during Stage 2. No vehicle, medal or time requirement is provided by the trophy text.',
    progressCheck: 'Billy’s final mission is complete. A motorcycle activity or an earlier Billy encounter should remain unchecked for this trophy.',
  },
  25: {
    guide: 'Complete eight full mission strands for strangers across Leonida. Track strand names, not individual missions: a three-job strand still contributes one of the eight required strands.\n\nNamed characters such as Andy, Kenton, Billy, Randy and Tyrone have their own final-mission trophies and provide useful jobs to reconcile against this total, but the official text does not explicitly list which eight count. Use the game’s strand records rather than assuming overlap.',
    progressCheck: '8 completed stranger strands. Your notes should show eight distinct characters or strands with all their missions finished.',
  },
  26: {
    guide: 'Continue Randy’s missions until you complete the final mission in his strand. Supply & Demand is tied to that named endpoint; cash earned or deliveries made elsewhere are not substitutes.\n\nClear the strand with the other character work before the finale. Any preparation advice beyond following Randy’s objectives would be speculative because the official description gives no mission details.',
    progressCheck: 'Randy’s last mission is complete. Partial business or delivery progress does not prove this trophy’s condition.',
  },
  27: {
    guide: 'Finish Tyrone’s mission chain and specifically complete its final mission. Keep following the strand after intermediate rewards; the unlock condition is not simply meeting Tyrone or finishing one job for him.\n\nUse a manual save before the closing job as optional insurance. The missable flag reflects cautious route order, never an unsupported claim that the game removes Tyrone after a particular chapter.',
    progressCheck: 'Tyrone’s final job has a completed result and the other named stranger strands are being tracked separately.',
  },
  28: {
    guide: 'Meditate at all 18 spots across Leonida, using the count supplied with the official-list notes. Record each location only after the meditation interaction completes; discovering a viewpoint or standing nearby should not count as meditating.\n\nSweep by region to reduce backtracking and keep the in-game place names in your checklist. This guide intentionally supplies no unverified coordinates or collectible map.',
    progressCheck: '18 distinct meditation spots completed. Separate locations visited from locations where the meditation interaction actually finished.',
  },
  29: {
    guide: 'Hunt the unique animal requested for Bret and finish the associated hand-in or closing objective if the mission asks for one. The target is Bret’s unique hunt, not an arbitrary rare animal encountered while exploring.\n\nThe official text does not identify a species or location, so none is invented here. Accept and track Bret’s hunt before the finale, then tick only when its unique target is complete.',
    progressCheck: 'Bret’s requested unique animal hunt is complete. Ordinary hunting progress remains separate.',
  },
  30: {
    guide: 'Complete three Collectible Card sets, not merely three individual cards. When you find a card, identify its set and update that set’s collected / total count; then prioritise the sets nearest completion instead of collecting without a plan.\n\nThe official wording does not name the sets or their card totals. Use the game’s collection display for those facts, and keep three separate set-completion checkmarks.',
    progressCheck: '3 complete card sets. A pile of loose cards from different sets does not qualify until at least three sets are closed.',
  },
  31: {
    guide: 'WAiNK It at 100 distinct locations and keep a region-by-region tally. Because the description says locations, repeat interactions at one place are not a reliable substitute for travelling to new ones.\n\nRecord only when the game confirms the interaction. No official list of those locations is supplied in the trophy description, so this guide avoids fabricated coordinates and relies on your own discovered-place notes.',
    progressCheck: '100 confirmed WAiNK It locations. Check for duplicates if your personal tally and the game’s progress disagree.',
  },
  32: {
    guide: 'Complete 50 Challenges as a cumulative activity goal. Mix short, reliable challenges into the activity stage rather than treating this as one long event, and log only results the game records as completed.\n\nThe official wording does not explicitly say 50 different challenges. Test whether a repeat increments the in-game counter before farming it; that test is safer than asserting either unique or repeatable credit without evidence.',
    progressCheck: '50 challenge completions recorded. Failed or abandoned attempts stay out of the count.',
  },
  33: {
    guide: 'With your partner present, reach a 4 star Wanted Level, then lose that wanted level and fully escape with the partner. Plan the getaway before provoking the response so you are not improvising the partner requirement at the hardest point.\n\nBreaking pursuit or hiding briefly is not enough if the heat remains; wait until the escape is clearly complete. The approach is general series experience, while the 4 star, partner and escape conditions come from the official text.',
    progressCheck: 'A 4 star Wanted Level has been completely lost with your partner and the escape finished. Lower wanted levels do not count.',
  },
  34: {
    guide: 'Rob three shops back-to-back with your partner while retaining the same Wanted Level throughout. Choose three nearby targets before starting and move directly between them; escaping, losing the heat or abandoning the partner breaks the stated sequence.\n\nThe wanted level must not be lost between shops, so do not follow the instinct to hide after robbery one. This routing advice follows the official sequence and does not assume a particular shop layout.',
    progressCheck: '3 consecutive partner shop robberies with the Wanted Level continuously retained. Reset your count if the heat disappears.',
  },
  35: {
    guide: 'Discover 100 vehicles and keep the record varied by make or model as shown in your discovery notes. Test what action causes a new vehicle to register—seeing one at a distance may not be enough—then use that confirmed action thereafter.\n\nThe description gives no purchase requirement, so do not assume every vehicle must be bought. This is a discovery target; registrations for Scooter Bros and garage ownership belong to separate trophies.',
    progressCheck: '100 recorded vehicle discoveries. Compare the in-game discovery record with your notes and remove duplicates.',
  },
  36: {
    guide: 'Set up five enemies in reach before activating Combat Focus, then take down all five during that single use. Starting the ability and searching for targets wastes the limited window; grouping targets first is the practical route.\n\nThe count resets when that use ends, so takedowns across two activations cannot be added together. The official condition does not prescribe a weapon or encounter, and this guide adds none.',
    progressCheck: '5 enemy takedowns inside one Combat Focus activation. If the effect ends at four, start a fresh five-target attempt.',
  },
  37: {
    guide: 'Make an unscheduled departure at VCIA. The most cautious interpretation is to use an available non-routine way to leave rather than following a normal scheduled departure, but the official description does not define the exact accepted method.\n\nTest one plausible departure method at a time and note the unlock. Vehicle type, route and destination are deliberately not fabricated; only VCIA and the unscheduled nature of the departure are explicit facts.',
    progressCheck: 'The trophy unlocks after an unscheduled VCIA departure. Because the trigger is vague, no invented flight number or fixed vehicle can serve as a checkpoint.',
  },
  38: {
    guide: 'Treat the Rhino clue as the lead: Rhino is the military tank name used in earlier Grand Theft Auto games, but this official description gives no required number or explicit action. Do not trust a made-up “destroy five tanks” instruction.\n\nWhen a Rhino becomes available, make a manual save and test the obvious tank interactions separately—obtaining, using or escaping one—until the actual unlock resolves. Those are investigative hypotheses from series knowledge, not confirmed GTA VI steps.',
    progressCheck: 'Only the unlock confirms this vague trigger. The list supplies no tank count, location or mission name to track.',
  },
  39: {
    guide: 'Complete a jewelry store robbery without detection. Prepare an exit first, avoid the store’s detection conditions during the approach and robbery, and leave without an alert if the activity continues into an escape phase.\n\nThe condition is stealth, not a particular loot total or a no-damage rule. Unless the game’s own activity adds extra constraints, do not invent them. If detected, restart from a clean save before trying again.',
    progressCheck: 'One jewelry store robbery completes with no detection. A detected robbery followed by a successful police escape is not equivalent.',
  },
  40: {
    guide: 'Rob five Bank Vaults and escape after each required robbery. Maintain a five-entry log with a successful escape beside each vault; reaching the vault or taking its contents without getting away does not complete the whole wording.\n\nThe official text does not say five different banks or five in one session, so this guide does not impose those restrictions. Rely on the game’s counter to establish whether revisiting a bank adds credit.',
    progressCheck: '5 Bank Vault robberies each followed by escape. A vault entered without an escape remains unfinished for your log.',
  },
  41: {
    guide: 'Rob an Armored Truck and complete the escape. Commit to both halves: stopping or accessing the truck is only the robbery phase, while the trophy also explicitly requires getting away.\n\nNo particular road, weapon or wanted-level strategy is named. Use a vehicle and route you can control, then clear pursuit or the activity’s escape state before ticking the entry.',
    progressCheck: 'One Armored Truck robbery plus a completed escape. Truck destruction or loot collection alone is not enough.',
  },
  42: {
    guide: 'Explore every part of Leonida, using the 52-area count supplied with the official-list notes. Divide the map into regions, clear undiscovered labels or fog systematically, and verify each of the 52 areas instead of relying on total travel time.\n\nCrossing a boundary may not always register the intended area, so confirm discovery before moving on. Exact area names and boundaries are not in the trophy text and are not invented here.',
    progressCheck: '52 of 52 Leonida areas discovered according to the kit’s count note. Recheck regions where you travelled but saw no discovery confirmation.',
  },
  43: {
    guide: 'Rob an Illegal Operation belonging to each of the 9 gangs noted with the official-list count. Track this by gang, underlining the faction after one of its operations is successfully robbed; multiple operations for one gang do not replace a missing faction.\n\nThe official condition does not require every operation on the map. Nine correctly distributed robberies—one per gang—are the target, with no invented compound locations.',
    progressCheck: '9 distinct gangs each have one completed Illegal Operation robbery. Check your list for duplicate factions.',
  },
  44: {
    guide: 'Go to Ocean Beach and enjoy a cocktail somewhere with the required view. Order or use the venue’s cocktail interaction and remain through the action rather than simply walking past the bar.\n\nThe place and activity are explicit; a particular venue name, time of day and drink recipe are not. Choosing a suitable ocean-facing venue is practical inference, so confirm completion through the unlock.',
    progressCheck: 'The cocktail-with-a-view interaction completes on Ocean Beach. Having a drink elsewhere does not satisfy the named location.',
  },
  45: {
    guide: 'Use a vehicle to smash your way out of a vehicle showroom. The literal reading is to get a showroom vehicle and break through the showroom’s exit or window in the vehicle, echoing a classic crime-movie exit.\n\nThat sequence is a direct interpretation of the official clue, not a sourced mission walkthrough. No specific dealership is stated, so try this where the game provides a drivable showroom vehicle and a breakable exit.',
    progressCheck: 'A showroom exit by vehicle smash triggers the unlock. Simply purchasing a car or walking out is not the described action.',
  },
  46: {
    guide: 'Visit the Kolt & Associates bowling alley and complete the requested follow-through during a bowl. Use the alley’s own control prompt to finish the throwing motion rather than assuming a visit or a single pin collision is enough.\n\nThe exact input and scoring requirement are not stated in the trophy description, so none is invented. The named venue and follow-through are the reliable facts.',
    progressCheck: 'A proper bowling follow-through is registered at Kolt & Associates. Ordinary bowling elsewhere does not meet the named-venue condition.',
  },
  47: {
    guide: 'The official clue establishes a partnership with mass appeal but gives no venue, audience size or activity. Treat this as a partner-discovery objective and try shared public activities together, recording what you attempted instead of pursuing an invented location.\n\n“Mass appeal” may describe the nature of a partnership event, but that is interpretation rather than confirmed mechanics. Make a save before experimentation and let only the unlock prove the requirement.',
    progressCheck: 'No numeric counter is official. Track attempted partner activities and tick only on the trophy, not on an assumed popularity score.',
  },
  48: {
    guide: 'Continue making meaningful choices until the game records the target of 500 choices supplied in the kit’s PSN count note. Story decisions and interactive partner moments are sensible places to watch the counter, but the official description does not enumerate which choices qualify.\n\nDo not add a fabricated mission list. Observe which categories move the in-game count, then repeat eligible decision content where the game permits until 500 is reached.',
    progressCheck: '500 choices according to the kit’s count note. The trophy text itself supplies no chapter-specific split or time limit.',
  },
  49: {
    guide: 'The direct reading of “Second time’s the charm” is to retry something after failing and succeed on the next attempt. If you fail an activity, use its immediate retry and complete it rather than switching to a different task.\n\nThat interpretation is flagged because the official description does not name the activity or confirm whether both attempts must be consecutive. It is a purposeful first test, not a guaranteed hidden trigger.',
    progressCheck: 'A failure followed by a successful second attempt is the suggested test. Only the trophy confirms that the game accepted it.',
  },
  50: {
    guide: 'Investigate a genuinely unusual world encounter when you find one and stay through any resulting scene or interaction. The vague official question gives no named character, coordinate or collectible, so a reliable guide should not manufacture them.\n\nKeep a short log of strange events you witness and revisit one only if the game offers a clear continuation. This is deliberately an exploration prompt, not a false claim of a fixed alien or paranormal location.',
    progressCheck: 'The unlock is the only confirmed checkpoint. No official count, time or map location is available in the description.',
  },
  51: {
    guide: 'Perform a melee drive-by that bowls a person over: approach from a moving vehicle, use the available melee attack and knock the target down with that attack. A firearm drive-by or simply hitting someone with the vehicle does not match the explicit wording.\n\nThe precise control prompt depends on the game’s vehicle combat interface and is not given here. Check the displayed controls before attempting it in a safe, low-pressure setting.',
    progressCheck: 'One melee drive-by knockdown. Separate melee credit from vehicle-collision credit when judging an attempt.',
  },
  52: {
    guide: 'Earn a cumulative $250,000 by laundering Marked Bills through your contacts. Use the contact process whenever you have eligible bills and keep a running total of confirmed laundering returns rather than gross shop income or ordinary cash.\n\nThe description sets a dollar total and a method, not a single-transaction requirement. Repeated smaller jobs are therefore a reasonable route; specific contact names and payout rates are not supplied and are not guessed.',
    progressCheck: '$250,000 earned specifically through contacts laundering Marked Bills. Unmarked money and unrelated sales stay outside the tally.',
  },
  53: {
    guide: 'Spend $100,000 across all shops, keeping a simple total from purchase receipts. The wording covers spending across shops generally rather than requiring one transaction or one retailer, so regular equipment, clothing and other shop purchases can be accumulated as eligible.\n\nProperty purchases have their own trophy and should not be counted here unless the game’s shop-spending stat includes them. Track the confirmed category instead of assuming every cash expense qualifies.',
    progressCheck: '$100,000 of qualifying shop purchases. This is spending, not money earned, and garage ownership is tracked separately.',
  },
  54: {
    guide: 'Purchase all 8 garage properties listed with the official-list count note. Build the money first, then buy every distinct garage and keep an owned / available checklist; owning multiple vehicles in one garage does not add properties.\n\nThe official text does not require a particular vehicle collection or customisation level. Eight owned garage properties are the entire stated target, with no invented addresses.',
    progressCheck: '8 of 8 garage properties owned. Reconcile property ownership rather than total parking spaces or vehicles.',
  },
  55: {
    guide: 'Register 10 vehicles through the Scooter Bros app. After each registration, confirm that the vehicle appears in the app’s record before adding it to your checklist; merely riding or storing a vehicle is not the stated action.\n\nUse ten individual vehicles and note their model names to avoid duplicates. The official text supplies no required model, location or reward tier, so choose vehicles you can register reliably.',
    progressCheck: '10 vehicles visibly registered in Scooter Bros. Discovering vehicles and registering them are separate counters.',
  },
};

let nextOrder = 1;
const orderById = new Map();
for (const stage of Object.keys(STAGES)) {
  for (const id of STAGES[stage]) orderById.set(id, nextOrder++);
}

if (document.trophies.length !== 55 || orderById.size !== 55) throw new Error('Expected exactly 55 routed trophies.');
for (const trophy of document.trophies) {
  const id = trophy.id;
  const note = notes[id];
  if (!note) throw new Error(`Missing authored note for trophy ${id}.`);
  const stage = Number(Object.keys(STAGES).find((key) => STAGES[key].includes(id)));
  trophy.guide = note.guide;
  trophy.progressCheck = note.progressCheck;
  trophy.kind = MISSABLE.has(id) ? 'missable' : COLLECTIBLES.has(id) ? 'collectibles' : id <= 7 ? 'story' : 'activities';
  trophy.missable = MISSABLE.has(id);
  trophy.story = STORY.has(id);
  trophy.roadmapStage = stage;
  trophy.stageName = STAGE_NAMES[stage];
  trophy.roadmapOrder = orderById.get(id);
  trophy.sources = [
    {
      label: 'Official PS5 trophy list',
      use: 'The trophy’s name, description, grade, unlock trigger and explicit numeric targets. PlayStation’s wording is unchanged above.',
    },
    {
      label: 'Field Manual route analysis',
      use: 'Original practical sequence written for this guide. Setup and farming suggestions are inference from the trigger; no unverified map or mission detail is asserted.',
    },
  ];
  if (COUNT_NOTES[id]) {
    trophy.sources.push({
      label: 'Kit’s official-list count note',
      use: `${COUNT_NOTES[id]}. The starter’s PlayStation count metadata supplies this target; it supplies no collectible locations.`,
    });
  }
}

writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${document.trophies.length} trophies, ${document.trophies.filter((trophy) => trophy.guide.trim()).length} nonblank guides, ${nextOrder - 1} roadmap positions.`);
