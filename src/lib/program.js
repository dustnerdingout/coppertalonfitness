import { MORE } from './exercisesMore.js'

// Exercise library + body part focuses.
//
// Exercise fields
//   sets      number of working sets
//   reps      [low, high] rep range for double progression
//   inc       lbs added when every set hits the top of the range (reps/seconds for bw/time)
//   start     suggested first-session weight (lbs). "per hand" exercises note it in the cue
//   kind      'weight' | 'bw' (bodyweight reps) | 'time' (seconds)
//   muscle    primary muscle group, used for the sets-per-muscle breakdown

const W = (name, muscle, sets, reps, inc, start, cue) => ({ name, muscle, sets, reps, inc, start, kind: 'weight', cue })

export const EXERCISES = {
  // Chest
  bench:        W('Barbell Bench Press',      'Chest', 3, [6, 10], 5, 75, 'Shoulder blades pinned, bar to mid chest.'),
  dbBench:      W('DB Bench Press',           'Chest', 3, [8, 12], 5, 35, 'Weight per hand. Elbows about 45° from your sides.'),
  machinePress: W('Machine Chest Press',      'Chest', 3, [8, 12], 10, 70, 'Control the way back, full stretch.'),
  inclineDb:    W('Incline DB Press',         'Chest', 3, [8, 12], 5, 30, 'Weight per hand. Bench at about 30°.'),
  inclineBar:   W('Incline Barbell Press',    'Chest', 3, [6, 10], 5, 65, 'Bar to upper chest, wrists stacked.'),
  pushup:       { name: 'Push-Up', muscle: 'Chest', sets: 3, reps: [6, 20], inc: 1, start: 0, kind: 'bw', cue: 'Body in a straight line. Elevate hands to make it easier.' },
  cableFly:     W('Cable Fly',                'Chest', 3, [12, 15], 5, 20, 'Hug a big tree, squeeze in the middle.'),
  inclineCableFly: W('Incline Cable Fly',     'Chest', 3, [12, 15], 5, 15, 'Bench at 30°, hands meet above the upper chest.'),
  pecDeck:      W('Pec Deck',                 'Chest', 3, [12, 15], 10, 60, 'Soft elbows, slow squeeze.'),

  // Triceps
  pushdown:     W('Rope Pushdown',            'Triceps', 3, [10, 15], 5, 35, 'Elbows pinned, split the rope at the bottom.'),
  ohTriExt:     W('Overhead Cable Extension', 'Triceps', 3, [10, 15], 5, 30, 'Big stretch behind the head.'),
  skull:        W('EZ Bar Skull Crusher',     'Triceps', 3, [8, 12], 5, 40, 'Lower to the forehead, elbows stay in.'),
  closeGrip:    W('Close Grip Bench',         'Triceps', 3, [6, 10], 5, 65, 'Hands shoulder width, elbows tucked.'),

  // Back
  pulldown:     W('Lat Pulldown',             'Back', 3, [8, 12], 5, 70, 'Elbows to back pockets.'),
  closePulldown:W('Close Grip Pulldown',      'Back', 3, [8, 12], 5, 70, 'Lean back slightly, pull to upper chest.'),
  cableRow:     W('Seated Cable Row',         'Back', 3, [8, 12], 5, 70, 'Pull elbows back, pause at the ribs.'),
  chestSupRow:  W('Chest Supported Row',      'Back', 3, [8, 12], 10, 70, 'Chest stays on the pad, squeeze blades.'),
  dbRow:        W('One Arm DB Row',           'Back', 3, [8, 12], 5, 40, 'Pull the dumbbell to your hip.'),
  barbellRow:   W('Barbell Row',              'Back', 3, [6, 10], 5, 75, 'Hinge to 45°, bar to belly button.'),
  straightArm:  W('Straight Arm Pulldown',    'Back', 3, [12, 15], 5, 30, 'Arms long, sweep to the thighs.'),

  // Biceps
  dbCurl:       W('DB Curl',                  'Biceps', 3, [8, 12], 5, 20, 'Weight per hand. No swinging.'),
  ezCurl:       W('EZ Bar Curl',              'Biceps', 3, [8, 12], 5, 40, 'Elbows at your sides.'),
  hammer:       W('Hammer Curl',              'Biceps', 3, [10, 12], 5, 20, 'Weight per hand. Thumbs up.'),
  inclineCurl:  W('Incline DB Curl',          'Biceps', 3, [10, 12], 5, 15, 'Weight per hand. Let the arms hang back.'),
  cableCurl:    W('Cable Curl',               'Biceps', 3, [10, 15], 5, 30, 'Constant tension, slow lower.'),
  preacher:     W('Preacher Curl',            'Biceps', 3, [8, 12], 5, 30, 'Full stretch at the bottom.'),

  // Shoulders
  ohp:          W('Overhead Press',           'Shoulders', 3, [6, 10], 5, 45, 'Glutes tight, press straight up past the face.'),
  dbOhp:        W('Seated DB Press',          'Shoulders', 3, [8, 12], 5, 25, 'Weight per hand. Press slightly in front.'),
  arnold:       W('Arnold Press',             'Shoulders', 3, [8, 12], 5, 20, 'Weight per hand. Rotate palms out as you press.'),
  lateralRaise: W('DB Lateral Raise',         'Shoulders', 3, [12, 15], 5, 10, 'Weight per hand. Lead with the elbows.'),
  cableLateral: W('Cable Lateral Raise',      'Shoulders', 3, [12, 15], 5, 10, 'Behind the body, raise to shoulder height.'),
  rearDelt:     W('Reverse Pec Deck',         'Shoulders', 3, [12, 15], 10, 50, 'Arms wide, squeeze the rear delts.'),
  facePull:     W('Face Pull',                'Shoulders', 3, [12, 15], 5, 30, 'Pull to the eyebrows, thumbs back.'),

  // Legs
  squat:        W('Back Squat',               'Quads', 3, [6, 10], 10, 95, 'Brace, sit between the hips, drive up.'),
  gobletSquat:  W('Goblet Squat',             'Quads', 3, [8, 12], 5, 40, 'Elbows inside the knees, chest tall.'),
  hackSquat:    W('Hack Squat',               'Quads', 3, [8, 12], 10, 90, 'Feet mid platform, full depth.'),
  legPress:     W('Leg Press',                'Quads', 3, [10, 15], 10, 140, 'Full range, no bouncing.'),
  legExt:       W('Leg Extension',            'Quads', 3, [12, 15], 10, 50, 'Pause at the top.'),
  splitSquat:   W('DB Split Squat',           'Quads', 3, [8, 12], 5, 20, 'Weight per hand. Front heel stays down.'),
  lunge:        W('Walking Lunge',            'Quads', 3, [10, 12], 5, 20, 'Weight per hand. Reps per leg.'),
  stepUp:       W('DB Step-Up',               'Quads', 3, [8, 12], 5, 20, 'Weight per hand. Drive through the top foot.'),
  trapDl:       W('Trap Bar Deadlift',        'Hamstrings & Glutes', 3, [5, 8], 10, 135, 'Push the floor away, chest tall.'),
  rdl:          W('Romanian Deadlift',        'Hamstrings & Glutes', 3, [8, 12], 10, 95, 'Hips back, soft knees, feel the hamstrings.'),
  dbRdl:        W('DB Romanian Deadlift',     'Hamstrings & Glutes', 3, [8, 12], 5, 35, 'Weight per hand. Hips back, flat back.'),
  hipThrust:    W('Hip Thrust',               'Hamstrings & Glutes', 3, [8, 12], 10, 95, 'Chin tucked, lock out with the glutes.'),
  legCurl:      W('Leg Curl',                 'Hamstrings & Glutes', 3, [10, 15], 5, 50, 'Hips down, slow lower.'),
  gluteKickback:W('Cable Glute Kickback',     'Hamstrings & Glutes', 3, [12, 15], 5, 20, 'Reps per leg. Squeeze at the top, no arching.'),
  calfRaise:    W('Standing Calf Raise',      'Calves', 3, [10, 15], 10, 90, 'Full stretch, pause at the top.'),
  seatedCalf:   W('Seated Calf Raise',        'Calves', 3, [12, 15], 10, 45, 'Slow stretch at the bottom, hold the top.'),

  // Core
  plank:        { name: 'Plank', muscle: 'Core', sets: 3, reps: [30, 60], inc: 5, start: 0, kind: 'time', cue: 'Squeeze glutes, ribs down.' },
  deadBug:      { name: 'Dead Bug', muscle: 'Core', sets: 3, reps: [8, 15], inc: 1, start: 0, kind: 'bw', cue: 'Low back glued to the floor.' },
  hangingKnee:  { name: 'Hanging Knee Raise', muscle: 'Core', sets: 3, reps: [8, 15], inc: 1, start: 0, kind: 'bw', cue: 'Curl the pelvis up, no swinging.' },
  cableCrunch:  W('Cable Crunch',             'Core', 3, [10, 15], 5, 50, 'Round the spine, elbows to knees.'),
  russianTwist: { name: 'Russian Twist', muscle: 'Core', sets: 3, reps: [16, 30], inc: 2, start: 0, kind: 'bw', cue: 'Total reps. Rotate from the ribs, feet down if needed.' },
  legRaise:     { name: 'Lying Leg Raise', muscle: 'Core', sets: 3, reps: [8, 15], inc: 1, start: 0, kind: 'bw', cue: 'Low back pressed down, lower slowly.' },
}

// Big multi-joint lifts. The workout builder puts these first and gives them longer rest.
export const COMPOUND = new Set([
  'bench', 'dbBench', 'machinePress', 'inclineDb', 'inclineBar', 'pushup', 'closeGrip',
  'pulldown', 'closePulldown', 'cableRow', 'chestSupRow', 'dbRow', 'barbellRow',
  'ohp', 'dbOhp', 'arnold',
  'squat', 'gobletSquat', 'hackSquat', 'legPress', 'splitSquat', 'lunge', 'stepUp',
  'trapDl', 'rdl', 'dbRdl', 'hipThrust',
])

// Each focus is a list of slots. A slot is a pool of interchangeable variations.
// anchor: the main lift. It sticks with whatever you did last so progressive overload has room to work.
// Other slots rotate to the variation you've done least recently, so workouts stay fresh.
export const FOCUSES = {
  push: {
    name: 'Chest & Triceps', short: 'Chest/Tri',
    slots: [
      { pool: ['bench', 'dbBench', 'machinePress'], anchor: true },
      { pool: ['inclineDb', 'inclineBar', 'pushup'] },
      { pool: ['cableFly', 'pecDeck'] },
      { pool: ['lateralRaise', 'cableLateral'] },
      { pool: ['pushdown', 'skull', 'ohTriExt', 'closeGrip'] },
      { pool: ['ohTriExt', 'pushdown', 'skull'] },
    ],
  },
  pull: {
    name: 'Back & Biceps', short: 'Back/Bi',
    slots: [
      { pool: ['pulldown', 'closePulldown'], anchor: true },
      { pool: ['cableRow', 'chestSupRow', 'dbRow', 'barbellRow'] },
      { pool: ['straightArm', 'dbRow', 'cableRow'] },
      { pool: ['facePull', 'rearDelt'] },
      { pool: ['dbCurl', 'ezCurl', 'cableCurl'] },
      { pool: ['hammer', 'inclineCurl', 'preacher'] },
    ],
  },
  legs: {
    name: 'Legs & Core', short: 'Legs',
    slots: [
      { pool: ['squat', 'hackSquat', 'legPress'], anchor: true },
      { pool: ['rdl', 'trapDl', 'dbRdl'] },
      { pool: ['splitSquat', 'lunge', 'stepUp'] },
      { pool: ['legCurl', 'hipThrust', 'legExt'] },
      { pool: ['calfRaise'] },
      { pool: ['plank', 'deadBug', 'hangingKnee', 'cableCrunch'] },
    ],
  },
  shoulders: {
    name: 'Shoulders & Arms', short: 'Shoulders',
    slots: [
      { pool: ['ohp', 'dbOhp'], anchor: true },
      { pool: ['lateralRaise', 'cableLateral'] },
      { pool: ['rearDelt', 'facePull'] },
      { pool: ['ezCurl', 'dbCurl', 'hammer', 'cableCurl'] },
      { pool: ['pushdown', 'ohTriExt', 'skull'] },
      { pool: ['hangingKnee', 'cableCrunch', 'plank'] },
    ],
  },
  full: {
    name: 'Full Body', short: 'Full',
    slots: [
      { pool: ['squat', 'legPress', 'gobletSquat'], anchor: true },
      { pool: ['bench', 'dbBench', 'inclineDb'] },
      { pool: ['cableRow', 'chestSupRow', 'pulldown'] },
      { pool: ['rdl', 'hipThrust', 'dbRdl'] },
      { pool: ['lateralRaise', 'facePull', 'dbOhp'] },
      { pool: ['plank', 'deadBug'] },
    ],
  },
}

// Merge in the extra exercises and give each body part focus more variations to rotate through
Object.assign(EXERCISES, MORE)
for (const [id, e] of Object.entries(MORE)) if (e.compound) COMPOUND.add(id)

const MORE_POOLS = {
  push: [['neutralDbPress', 'declineBench'], ['smithIncline', 'machineIncline'], ['dbFly', 'inclineDbFly', 'lowCableFly'], ['uprightRow', 'frontRaise'], ['vBarPushdown', 'dbOhExt', 'kickback', 'tricepDip'], ['lyingDbExt', 'reversePushdown']],
  pull: [['underhandPulldown', 'bandPullUp'], ['tBarRow', 'machineHighRow', 'underhandRow'], ['oneArmCableRow', 'dbPullover', 'invertedRow'], ['rearDeltRaise', 'cableRearDelt'], ['bbCurl', 'spiderCurl', 'machinePreacher', 'concentrationCurl'], ['ropeHammer', 'zottman', 'reverseCurl']],
  legs: [['frontSquat', 'smithSquat', 'narrowLegPress'], ['goodMorning', 'sumoDl', 'singleLegRdl'], ['reverseLunge'], ['seatedLegCurl', 'gluteBridge', 'pullThrough', 'hipAbduction'], ['seatedCalf', 'legPressCalf', 'donkeyCalf', 'smithCalf'], ['abWheel', 'pallof', 'sidePlank', 'woodchop', 'bicycle']],
  shoulders: [['machineOhp', 'arnold', 'pushPress'], ['uprightRow', 'frontRaise'], ['rearDeltRaise', 'cableRearDelt'], ['bbCurl', 'concentrationCurl', 'zottman'], ['vBarPushdown', 'kickback', 'dbOhExt'], ['pallof', 'declineCrunch', 'abWheel']],
  full: [['frontSquat', 'dbSquat'], ['neutralDbPress', 'machineIncline'], ['tBarRow', 'machineHighRow', 'underhandPulldown'], ['gluteBridge', 'kbSwing', 'goodMorning'], ['arnold', 'rearDeltRaise'], ['sidePlank', 'pallof', 'abWheel']],
}
for (const [f, slots] of Object.entries(MORE_POOLS)) {
  slots.forEach((ids, i) => { for (const id of ids) if (!FOCUSES[f].slots[i].pool.includes(id)) FOCUSES[f].slots[i].pool.push(id) })
}

export const ROTATIONS = {
  ppl:  { name: 'Push / Pull / Legs', order: ['push', 'pull', 'legs'], desc: 'Chest & Triceps, Back & Biceps, Legs. Each body part once a week, hit hard.' },
  full: { name: 'Full Body × 3',      order: ['full', 'full', 'full'], desc: 'Everything every session. Great for fat loss and beginners.' },
  ulf:  { name: 'Upper / Lower / Full', order: ['push', 'legs', 'full'], desc: 'A mix: one upper push day, one leg day, one full body day.' },
  bro:  { name: 'Push / Pull / Legs / Shoulders', order: ['push', 'pull', 'legs', 'shoulders'], desc: 'Four focuses rotating across your three lift days.' },
}

export const RUN_TYPES = {
  easy:      { name: 'Easy Run',     short: 'Easy',      desc: 'Conversational pace. You should be able to talk in full sentences. Walk breaks are fine.' },
  intervals: { name: 'Interval Run', short: 'Intervals', desc: 'Run hard enough that talking is tough, then walk to recover.' },
  long:      { name: 'Long Run',     short: 'Long',      desc: 'Slow and steady. The goal is time on your feet, not speed.' },
}

export const MOBILITY = [
  { name: 'Cat Cow',                       dose: '10 slow reps' },
  { name: "World's Greatest Stretch",      dose: '5 per side' },
  { name: '90/90 Hip Switches',            dose: '10 total' },
  { name: 'Couch Stretch',                 dose: '60 sec per side' },
  { name: 'Thread the Needle',             dose: '8 per side' },
  { name: 'Hamstring Floss',               dose: '10 per side' },
  { name: 'Deep Squat Hold',               dose: '2 × 45 sec' },
  { name: 'Calf + Ankle Rocks',            dose: '15 per side' },
  { name: 'Foam Roll Quads, Calves, Back', dose: '5 min' },
]

// Session slot ids used in the weekly schedule
export const SLOTS = {
  lift:            { label: 'Strength',  tone: 'lift' },
  'run-easy':      { label: 'Easy Run',  tone: 'run' },
  'run-intervals': { label: 'Intervals', tone: 'run' },
  'run-long':      { label: 'Long Run',  tone: 'run' },
  mobility:        { label: 'Mobility',  tone: 'mobility' },
  rest:            { label: 'Full Rest', tone: 'rest' },
}

// 0 = Sunday. 3 lifts, 3 runs, 1 mobility, 1 full rest.
export const DEFAULT_SCHEDULE = {
  1: ['lift', 'run-easy'],
  2: ['run-intervals'],
  3: ['lift'],
  4: ['mobility'],
  5: ['lift'],
  6: ['run-long'],
  0: ['rest'],
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings & Glutes', 'Calves', 'Core']
