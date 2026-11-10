# BICT Attendance Tracker v2 (Year 2 - Semester I)

Free web app (PWA) with login + cloud sync. Works offline, installs on a phone like an app.

## What's new in v2
- Temporary AND final timetable, switching automatically on a date you can change in Settings
- Attendance counted in lecture HOURS per course unit (handbook 3.6.3)
- Cancelled lectures (tap "Cancelled"), extra / makeup lectures, holidays + vacation weeks
- Login (email or Google) and cloud sync, so each student has private data on every device
- Your old v1 marks are imported automatically

## Files
| File | What it does |
|---|---|
| index.html, style.css | page + design |
| data.js | **timetables** (edit here when a new timetable comes) |
| logic.js | calculations + sync merge (no screen code) |
| app.js | screens, buttons, saving, login/sync logic |
| cloud.js | talks to Firebase (login + database) |
| firebase-config.js | **your Firebase keys go here** |
| firestore.rules | database security rules (paste into Firebase) |
| sw.js, manifest.json, icon-*.png | offline + "Add to Home screen" |
| tests.js | `node tests.js` runs the logic tests |

---

## Part A: Firebase (free login + cloud database)  ~10 minutes
1. Open https://console.firebase.google.com and sign in with a Google account.
2. **Create a project** -> name it e.g. `bict-attendance` -> turn Google Analytics OFF -> Create.
3. Left menu **Build -> Authentication -> Get started -> Sign-in method**
   - enable **Email/Password** -> Save
   - (optional) enable **Google** -> choose your email as support email -> Save
4. Left menu **Build -> Firestore Database -> Create database**
   - choose a location close to Sri Lanka (e.g. `asia-south1` Mumbai or `asia-southeast1` Singapore). It cannot be changed later.
   - start in **production mode** -> Create
5. Firestore -> **Rules** tab -> delete everything -> paste the content of `firestore.rules` -> **Publish**.
6. Click the gear icon -> **Project settings -> General -> Your apps -> Web (</>)**
   - App nickname `attendance` -> Register app (do NOT tick Firebase Hosting) 
   - copy `apiKey`, `authDomain`, `projectId`, `appId` into **firebase-config.js**
7. Do Part B, then come back for step 8.
8. **Authentication -> Settings -> Authorized domains -> Add domain** -> `YOURUSERNAME.github.io`
   (without this, login on the website gives "unauthorized-domain").

The free "Spark" plan is far more than enough (no credit card needed).

## Part B: Put the app online for free (GitHub Pages)
1. Make a GitHub account (github.com) -> **New repository** -> name `attendance` -> **Public** -> Create.
2. **uploading an existing file** -> drag ALL the files from this folder (not the zip itself) -> Commit changes.
3. Repo **Settings -> Pages -> Build and deployment -> Deploy from a branch -> main / (root) -> Save**.
4. Wait 1-2 minutes. Your link: `https://YOURUSERNAME.github.io/attendance/`
5. Open that link on your phone in Chrome -> menu (three dots) -> **Add to Home screen / Install app**.
   iPhone: Safari -> Share -> Add to Home Screen.

(Quickest alternative: drag this folder onto https://app.netlify.com/drop. Then add the netlify domain in Firebase step 8.)

## Part C: Let friends use it
Send them the link. Each friend taps Settings -> Create account. Everyone's data is private:
the Firestore rules only let a person read/write their own document.

## Updating the app later
- Changed a file (e.g. data.js for a new timetable)? Upload it again to the GitHub repo (Add file -> Upload files, same name replaces it). Reload the app twice.
- Timetable change date: Settings -> "Final timetable starts on".

## Good to know
- Data is stored on the phone first, then synced. Offline marks sync when internet returns.
- "Reset all attendance" also clears the cloud copy.
- Logging out removes the data from that phone only (it stays in the account).
- The Firebase keys in firebase-config.js are public by design. Security comes from the rules in step 5.
