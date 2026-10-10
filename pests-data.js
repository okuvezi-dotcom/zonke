// Built from src/pests.mjs by scripts/build.mjs. Edit the source, not this copy.
(() => {
// What a client can report, how fast we come, and what the trap data says to do about it.
// report.html, the client portal, the technician app and the trend analysis all read from here, so a
// sighting is triaged the same way wherever it comes in. Plain pest-control practice, no legal claims.

const PESTS = [
  { key: 'cockroach', name: 'Cockroaches', signs: 'Live or dead roaches, droppings like ground pepper, egg cases, a musty smell' },
  { key: 'rodent', name: 'Rats or mice', signs: 'Droppings, gnawed packaging or cables, grease marks along walls, scratching at night' },
  { key: 'fly', name: 'Flies', signs: 'House flies around bins and doors, small fruit or drain flies around sinks and floor drains' },
  { key: 'ant', name: 'Ants', signs: 'Trails to sugar, syrup or grease, often along skirting or out of cracks' },
  { key: 'stored', name: 'Weevils or moths in stock', signs: 'Beetles or larvae in flour, rice, maize meal or spices; webbing in packets' },
  { key: 'bird', name: 'Birds', signs: 'Pigeons or sparrows in the loading bay, droppings or nests near openings' },
  { key: 'other', name: 'Something else', signs: 'Bed bugs in staff quarters, termites, wasps, anything you are not sure about' },
];

// Where in the premises. `food` marks the places where activity puts food at risk.
const PLACES = [
  { key: 'prep', name: 'Prep or cooking area', food: true },
  { key: 'store', name: 'Dry store or pantry', food: true },
  { key: 'cold', name: 'Cold room, fridge or freezer', food: true },
  { key: 'dish', name: 'Dish or scullery area', food: true },
  { key: 'front', name: 'Front of house, where customers sit', food: true },
  { key: 'bins', name: 'Bin area or yard', food: false },
  { key: 'bay', name: 'Loading bay or back door', food: false },
  { key: 'washroom', name: 'Washrooms or change rooms', food: false },
  { key: 'office', name: 'Office or staff room', food: false },
];

const COUNTS = [
  { key: 'one', name: 'One' },
  { key: 'few', name: 'A few' },
  { key: 'many', name: 'Many, or every day' },
];

/**
 * How fast a sighting is answered.
 *   tonight  a crew comes after close tonight (or the next night if reported after 16:00)
 *   48h      a call-out within 48 hours
 *   visit    checked and treated at the next booked visit, which is never more than a month away
 */
const PRIORITY = {
  tonight: { label: 'Tonight', promise: 'A crew comes after you close tonight. Reported after 16:00, it is the next night.' },
  '48h': { label: 'Within 48 hours', promise: 'A technician comes within 48 hours, at night if you prefer.' },
  visit: { label: 'Next visit', promise: 'We check and treat it at your next booked visit, and call you first if it gets worse.' },
};

function triage({ pest, place, count }) {
  const where = PLACES.find((p) => p.key === place);
  const food = where?.food ?? true; // unknown place: assume the worst
  const urgentPest = pest === 'rodent' || pest === 'cockroach';
  if (pest === 'rodent' && food) return 'tonight';
  if (urgentPest && (place === 'front' || count === 'many')) return 'tonight';
  if (urgentPest || (food && count === 'many') || pest === 'other') return '48h';
  if (food) return '48h';
  return 'visit';
}

/**
 * Trap-station zones and what to do when activity rises in one. The technician app tags every bait
 * station and monitor with a zone; the trend analysis turns rising activity into this advice.
 */
const ZONES = {
  bay: { name: 'Loading bay', advice: 'Check the door sweep and the gap under the delivery door, and keep the door shut between deliveries.' },
  bins: { name: 'Bin area', advice: 'Empty and wash the bins more often, keep lids closed, and move the bins further from the back door.' },
  store: { name: 'Dry store', advice: 'Lift stock off the floor onto shelving, rotate the oldest stock first, and seal opened bags in tubs.' },
  prep: { name: 'Prep area', advice: 'Clean behind and under equipment tonight, and look for gaps around pipes and cables where they come through the wall.' },
  dish: { name: 'Dish area', advice: 'Fix dripping taps and leaks, and dry the area at close: roaches follow water.' },
  cold: { name: 'Cold room', advice: 'Check the door seal and the motor housing, where warmth and dust collect.' },
  front: { name: 'Front of house', advice: 'Clear food from under seating and service stations at close, and check the bar and coffee station drains.' },
  drains: { name: 'Floor drains', advice: 'Fit or replace drain covers, and add a drain treatment to the next visit.' },
  outside: { name: 'Outside perimeter', advice: 'Clear vegetation and rubble from the walls, and check for burrows along the boundary.' },
};

/** Activity a technician records at a station: 0 none, 1 low, 2 medium, 3 high. */
const ACTIVITY = ['None', 'Low', 'Medium', 'High'];

window.PESTDATA = { PESTS, PLACES, COUNTS, PRIORITY, triage };
})();
