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

TIMETABLES.forEach((t) => t.slots.forEach((s, i) => { s.id = t.prefix + i; }));

// Default semester range (editable in Settings). 14 teaching weeks from 12 Oct 2026.
// If the mid-semester vacation falls inside this range, add it under Settings > Holidays.
const DEFAULT_SEMESTER = { start: "2026-10-12", end: "2027-01-15" };
