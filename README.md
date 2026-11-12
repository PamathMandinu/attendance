# BICT Attendance Tracker v2 (Year 2 - Semester I)

Free web app (PWA) with login + cloud sync. Works offline, installs on a phone like an app.

## What's new in v2
- Temporary AND final timetable, switching automatically on a date you can change in Settings
- Attendance counted in lecture HOURS per course unit (handbook 3.6.3)
- Cancelled lectures (tap "Cancelled"), extra / makeup lectures, holidays + vacation weeks
- Login (email or Google) and cloud sync, so each student has private data on every device
- Your old v1 marks are imported automatically



## Updating the app later
- Changed a file (e.g. data.js for a new timetable)? Upload it again to the GitHub repo (Add file -> Upload files, same name replaces it). Reload the app twice.
- Timetable change date: Settings -> "Final timetable starts on".

## Good to know
- Data is stored on the phone first, then synced. Offline marks sync when internet returns.
- "Reset all attendance" also clears the cloud copy.
- Logging out removes the data from that phone only (it stays in the account).
- The Firebase keys in firebase-config.js are public by design. Security comes from the rules in step 5.
