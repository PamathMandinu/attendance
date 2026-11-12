// ============================================================
// TIMETABLE DATA - Year 2, Semester I (Faculty of Technological Studies, Univ. of Vavuniya)
// Edit THIS file when a new timetable is published.
//   day: 1=Mon ... 5=Fri   type: "T" theory, "P" practical, "" none   hours: lecture hours
// Practicals are 2 hours (two 55-minute slots), theory / AUX are 1 hour.
// ============================================================

const COURSES = {
  TICT2113: { name: "Data Structures and Algorithms",     color: "#f59e0b" },
  TICT2122: { name: "Statistics for Technology",          color: "#ef5b3c" },
  TICT2134: { name: "Advanced Computer Programming",      color: "#14b8a6" },
  TICT2142: { name: "Multimedia Design and Technologies", color: "#eab308" },
  TICT2153: { name: "Human Computer Interaction",         color: "#ec4899" },
  AUX2113:  { name: "English Language II",                color: "#a855f7" },
};

const TIMETABLES = [
  {
    id: "temp",
    name: "Temporary timetable",
    prefix: "s",            // slot ids s0..s9 (same as app v1, so old marks keep working)
    from: "2026-10-12",
    slots: [
      { day: 1, code: "TICT2134", type: "P", start: "08:00", end: "09:50", hours: 2, room: "TCL1, TCL2" },
      { day: 1, code: "TICT2113", type: "P", start: "13:00", end: "14:50", hours: 2, room: "TCL1, TCL2" },
      { day: 2, code: "AUX2113",  type: "",  start: "13:55", end: "14:50", hours: 1, room: "TLH2" },
      { day: 3, code: "TICT2134", type: "P", start: "08:00", end: "09:50", hours: 2, room: "TCL1, TCL2" },
      { day: 3, code: "TICT2113", type: "T", start: "10:10", end: "11:05", hours: 1, room: "TLH2" },
      { day: 4, code: "TICT2134", type: "T", start: "10:10", end: "11:05", hours: 1, room: "TLH2" },
      { day: 4, code: "TICT2142", type: "T", start: "11:05", end: "12:00", hours: 1, room: "TLH2" },
      { day: 4, code: "TICT2153", type: "P", start: "15:10", end: "17:00", hours: 2, room: "TCL1, TCL2" },
      { day: 5, code: "TICT2153", type: "T", start: "08:55", end: "09:50", hours: 1, room: "TLH2" },
      { day: 5, code: "TICT2122", type: "T", start: "10:10", end: "11:05", hours: 1, room: "TLH2" },
    ],
  },
  {
    id: "final",
    name: "Final timetable",
    prefix: "f",
    // The PDF header says "Effect from 02.11.2026". You said the temporary one runs until 5 Nov,
    // so the app switches on 6 Nov. You can change this date in Settings (no code edit needed).
    from: "2026-11-06",
    slots: [
      // Monday
      { day: 1, code: "TICT2113", type: "P", start: "15:10", end: "17:00", hours: 2, room: "TCL1, TCL2" },
      // Tuesday
      { day: 2, code: "TICT2134", type: "T", start: "08:00", end: "08:55", hours: 1, room: "TLH2" },
      { day: 2, code: "TICT2134", type: "P", start: "10:10", end: "12:00", hours: 2, room: "TCL1, TCL2" },
      { day: 2, code: "AUX2113",  type: "",  start: "13:55", end: "14:50", hours: 1, room: "TLH1" },
      { day: 2, code: "TICT2153", type: "T", start: "15:10", end: "16:05", hours: 1, room: "TLH2" },
      { day: 2, code: "TICT2142", type: "T", start: "16:05", end: "17:00", hours: 1, room: "TLH1" },
      // Wednesday
      { day: 3, code: "TICT2153", type: "P", start: "08:00", end: "09:50", hours: 2, room: "TCL1, TCL2" },
      { day: 3, code: "TICT2113", type: "T", start: "10:10", end: "11:05", hours: 1, room: "TLH1" },
      { day: 3, code: "AUX2113",  type: "",  start: "11:05", end: "12:00", hours: 1, room: "TLH1" },
      // Thursday
      { day: 4, code: "TICT2142", type: "T", start: "08:00", end: "08:55", hours: 1, room: "TLH1" },
      { day: 4, code: "TICT2122", type: "T", start: "08:55", end: "09:50", hours: 1, room: "TLH2" },
      { day: 4, code: "TICT2122", type: "T", start: "16:05", end: "17:00", hours: 1, room: "TLH1" },
      // Friday
      { day: 5, code: "TICT2134", type: "T", start: "08:00", end: "08:55", hours: 1, room: "TLH2" },
      { day: 5, code: "TICT2153", type: "T", start: "08:55", end: "09:50", hours: 1, room: "TLH1" },
      { day: 5, code: "TICT2113", type: "T", start: "10:10", end: "11:05", hours: 1, room: "TLH1" },
      { day: 5, code: "AUX2113",  type: "",  start: "13:55", end: "14:50", hours: 1, room: "TLH1" },
      { day: 5, code: "TICT2134", type: "P", start: "15:10", end: "17:00", hours: 2, room: "TCL1, TCL2" },
    ],
  },
];

// ------------------------------------------------------------
// REVISED TIMETABLE - "Effect from 09.11.2026" (xlsx) + the TICT 2122 / 2134 swap notice
//
// IMPORTANT - how to update a timetable WITHOUT losing anyone's attendance:
//   1. Never edit an old timetable above. Add a NEW timetable with a new "from" date.
//   2. Slot ids are tied to day + time (not to the course). When a slot only changes its
//      course or room, KEEP its id, so marks already saved for that time slot stay attached.
//      A brand-new time slot gets a brand-new id (never reuse an id for a different time).
//   3. Attendance is stored in each person's account, not in this file, so changing this
//      file never deletes anyone's data.
// ------------------------------------------------------------
const REVISED_FROM = "2026-11-09";
// Date the TICT 2122 <-> TICT 2134 theory swap starts (notice: "from this week onwards").
// If the first swapped lecture was later than Monday 9 Nov, change this date only.
const SWAP_FROM = "2026-11-09";

TIMETABLES.push({
  id: "rev",
  name: "Revised timetable (9 Nov)",
  from: REVISED_FROM,
  slots: [
    // Monday
    { id: "f0",  day: 1, code: "TICT2113", type: "P", start: "15:10", end: "17:00", hours: 2, room: "TCL1, TCL2" },
    // Tuesday
    { id: "f1",  day: 2, code: "TICT2134", type: "T", start: "08:00", end: "08:55", hours: 1, room: "TLH2" },
    { id: "f2",  day: 2, code: "TICT2134", type: "P", start: "10:10", end: "12:00", hours: 2, room: "TCL1, TCL2" },
    { id: "f3",  day: 2, code: "AUX2113",  type: "",  start: "13:55", end: "14:50", hours: 1, room: "TLH2" },
    { id: "f4",  day: 2, code: "TICT2142", type: "T", start: "15:10", end: "16:05", hours: 1, room: "TLH2" },
    // Wednesday
    { id: "f6",  day: 3, code: "TICT2153", type: "P", start: "08:00", end: "09:50", hours: 2, room: "TCL1, TCL2" },
    { id: "f7",  day: 3, code: "TICT2113", type: "T", start: "10:10", end: "11:05", hours: 1, room: "TLH1" },
    { id: "f8",  day: 3, code: "AUX2113",  type: "",  start: "11:05", end: "12:00", hours: 1, room: "TLH1" },
    // Thursday
    { id: "f9",  day: 4, code: "TICT2142", type: "T", start: "08:00", end: "08:55", hours: 1, room: "TLH2" },
    { id: "f10", day: 4, code: "TICT2122", type: "T", start: "08:55", end: "09:50", hours: 1, room: "TLH2" },
    { id: "f17", day: 4, code: "TICT2153", type: "T", start: "15:10", end: "16:05", hours: 1, room: "TLH1" },
    { id: "f11", day: 4, code: "TICT2122", type: "T", start: "16:05", end: "17:00", hours: 1, room: "TLH1" },
    // Friday
    { id: "f12", day: 5, code: "TICT2134", type: "T", start: "08:00", end: "08:55", hours: 1, room: "TLH2" },
    { id: "f13", day: 5, code: "TICT2153", type: "T", start: "08:55", end: "09:50", hours: 1, room: "TLH2" },
    { id: "f14", day: 5, code: "TICT2113", type: "T", start: "10:10", end: "11:05", hours: 1, room: "TLH1" },
    { id: "f15", day: 5, code: "AUX2113",  type: "",  start: "13:55", end: "14:50", hours: 1, room: "TLH1" },
    { id: "f16", day: 5, code: "TICT2134", type: "P", start: "15:10", end: "17:00", hours: 2, room: "TCL1, TCL2" },
  ],
});

// Notice: the TICT 2122 and TICT 2134 theory slots were permanently exchanged.
//   Tue 08:00-08:55 TLH2: TICT 2134 -> TICT 2122     Thu 08:55-09:50 TLH2: TICT 2122 -> TICT 2134
// Same slot ids as above, only the course changes (so marks on those time slots stay valid).
const SWAP = { f1: "TICT2122", f10: "TICT2134" };
TIMETABLES.push({
  id: "swap",
  name: "Revised timetable (9 Nov, TICT 2122/2134 swapped)",
  from: SWAP_FROM,
  slots: TIMETABLES[2].slots.map((s) => Object.assign({}, s, SWAP[s.id] ? { code: SWAP[s.id] } : {})),
});

// Give ids to slots that have none (temp = s0.., final = f0..). Slots with an explicit id keep it.
TIMETABLES.forEach((t) => t.slots.forEach((s, i) => { if (!s.id) s.id = t.prefix + i; }));

// Default semester range (editable in Settings). 14 teaching weeks from 12 Oct 2026.
// If the mid-semester vacation falls inside this range, add it under Settings > Holidays.
const DEFAULT_SEMESTER = { start: "2026-10-12", end: "2027-01-15" };
