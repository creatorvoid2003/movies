# Movies — Free Virtual Cinema

> **AI developer handoff and project source of truth.** Read this document and inspect the repository before changing code. This file describes the product requirements, current state, architecture direction, and ordered roadmap. Planned features are not necessarily implemented.

## 1. Project identity

- **Name:** Movies
- **Repository:** `creatorvoid2003/movies`
- **Branch:** `main`
- **Product:** A free, browser-based virtual cinema.
- **Development context:** Android-first; the owner manages the project primarily from an Android phone.
- **Budget:** Zero. Use genuinely free/open-source tools and free service tiers only.
- **Core goal:** Let people watch an authorized film together online in a shared room, with synchronized playback and optional voice/video communication.

This is not a paid streaming subscription service. Viewers must not pay to join rooms or watch films. Do not add tickets, subscriptions, payment gateways, paid APIs, paid-only features, or automatic billing unless the owner explicitly changes this requirement.

## 2. Product requirements

### Viewer experience

A viewer should eventually be able to:
1. Open the website on Android, another phone, tablet, or desktop.
2. Browse a library of available films.
3. Create or join a public or private viewing room.
4. Watch the same film as other room members with synchronized playback.
5. See participant video tiles while the film remains the main focus.
6. Choose when to enable or disable their own microphone and camera.
7. Talk with participants through voice chat.
8. Use room text chat and share an invitation to a private room.

### Administrator experience

An authorized administrator should eventually be able to:
1. Sign in to a protected admin area.
2. Select a film file from their own phone/computer storage.
3. Upload it into project-controlled cloud storage.
4. Add/edit film title, description, poster, genre/category, and metadata.
5. Publish/unpublish the film.
6. See upload progress and clear error/success states.

**Storage requirement:** The administrator uploads a file from their device to cloud storage. The website must not depend on the administrator's phone staying online or serving the movie. Once uploaded, the film must remain available independently of that device.

## 3. Non-negotiable constraints

### Zero budget
- Prefer open-source tools and free service tiers.
- Do not introduce paid APIs, paid hosting, paid storage, paid TURN services, or paid build tools as required dependencies.
- Check current free-tier quotas, bandwidth, file-size limits, regional availability, and terms before choosing a provider; limits change.
- Never promise unlimited storage, uploads, viewers, rooms, or bandwidth.
- If a feature cannot reliably operate within free limits, explain the limitation and propose a genuinely free alternative or smaller initial scope. Do not silently introduce a paid dependency.

### Mobile-first
- Prioritize Android phone layouts and touch controls, while supporting tablet and desktop.
- Keep pages lightweight for slower mobile connections.
- Use accessible labels, keyboard focus styles, readable contrast, and clear permission/error messages.
- Give the owner short, sequential instructions when their action is required.

### Code quality
- Keep code clean, minimal, structured, and maintainable.
- Inspect existing files and functions before editing.
- Reuse existing code where sensible. Avoid duplicate files, duplicate handlers, unnecessary abstractions, and needless dependencies.
- Make one small, testable feature at a time.
- Keep secrets out of frontend code and Git history.
- Never claim a feature works merely because its interface exists.

### Film rights
Only upload films the administrator owns or is authorized to distribute, including public-domain or appropriately licensed works. Do not build DRM bypasses or unauthorized film distribution features. The uploader is responsible for confirming distribution rights.

## 4. Current repository structure

```text
movies/
├── index.html
├── library.html
├── film.html
├── rooms.html
├── watch.html
├── admin.html
├── README.md
└── assets/
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

Keep this structure unless a clear need justifies a small, organized extension. Add new modules in descriptive folders rather than allowing one script to become unmaintainable.

## 5. Current implementation status

The project currently has a static frontend built with plain HTML, CSS, and browser JavaScript.

### Implemented
- [x] Responsive home page and navigation (`index.html`)
- [x] Library page layout, search field, and category filter controls (`library.html`)
- [x] Viewing-room layout (`watch.html`)
- [x] Shared styling (`assets/css/style.css`)
- [x] Shared browser interactions (`assets/js/app.js`)
- [x] Home-page join dialog interaction
- [x] Library empty-state and search/filter messaging
- [x] Show/hide participant mini-screen strip
- [x] Participant video-tile placeholders
- [x] User-initiated local microphone permission/capture control
- [x] User-initiated local camera permission/capture control
- [x] Local camera preview in the host's own mini-screen
- [x] Stop local media tracks when leaving the viewing page

### Exact meaning of local media support

The browser requests microphone or camera access only after the user presses the relevant control. Camera video can appear in the local preview. This is a **local-device test only**:
- Microphone audio is not transmitted to other participants.
- Camera video is not transmitted to other participants.
- Participant tiles are placeholders, not connected people.
- There is no WebRTC peer connection or signaling service.
- Media capture normally requires HTTPS (or localhost) and browser permission.

Do not describe the current site as having working group voice chat or live video calls.

### Not implemented
- [ ] Backend/database integration
- [ ] Registration, login, logout, and session handling
- [ ] Admin roles and protected admin pages
- [ ] Cloud film storage and secure uploads
- [ ] Film metadata database and published library
- [ ] Real film playback
- [ ] Room creation, membership, private invites, and access control
- [ ] Synchronized play, pause, seek, and playback position
- [ ] WebRTC connections and secure signaling
- [ ] Real group voice chat and participant video
- [ ] Real-time text chat
- [ ] Production deployment and end-to-end testing

A disabled button, visual placeholder, or local browser API test is not a completed backend feature.

## 6. Architecture direction (proposed, not yet configured)

### Frontend
Continue with lightweight HTML, CSS, and vanilla JavaScript unless a demonstrated requirement justifies a framework. Avoid unnecessary build tooling.

### Backend, authentication, database, realtime
**Supabase is a candidate**, not a confirmed active integration. It could provide:
- Authentication and sessions.
- Database records for profiles, films, rooms, room members, and chat.
- Row Level Security (RLS).
- Realtime room updates, chat, and potentially WebRTC signaling.

Before implementing it, inspect the actual project configuration and current free-tier limits. Do not assume a project is connected because a config file exists. Browser code may contain only the project URL and publishable/anon key with correctly configured RLS. Never commit a service-role key.

Supabase Realtime could carry WebRTC offer/answer and ICE-candidate signaling, but signaling must be authenticated and restricted to members of the relevant room. Do not broadcast private signaling to all users.

### Cloud storage and uploads
The exact cloud-storage provider has not been finalized. Verify its free tier and terms before choosing it.

Expected flow:
1. Admin selects a file from local device storage.
2. Backend verifies the user's administrator role.
3. Backend grants a narrowly scoped upload authorization or securely handles the upload.
4. File is stored in cloud object storage.
5. Database stores film metadata and the object reference, not provider secrets.
6. Published films are made available to authorized viewers through a safe playback mechanism.

Include file type/size validation, upload progress, failure handling, and retry behavior. Never put storage secret keys in frontend code. Do not make a private bucket public merely for convenience; use short-lived signed access where supported.

### Playback and processing
Start with browser-supported formats and a modest initial file-size limit. Verify Android and desktop browser compatibility. HLS may be considered if it materially improves delivery. Do not add transcoding until a genuinely free and reliable method is verified; transcoding needs CPU, memory, and storage and should not be assumed to run for free on a phone or serverless tier.

### Synchronized playback
Use one authoritative room playback state, including:
- Film identifier
- Playing/paused state
- Current playback position
- Last state-change timestamp
- Host/controller identity or permission
- Version/update timestamp to reject stale updates

Room members receive updates in realtime. Clients can estimate expected playback position and correct drift. Decide who controls playback (for example, the host) and enforce it on the backend; do not trust hidden buttons or client-side checks as security.

### Voice/video
Use browser WebRTC for participant media. Requirements:
- Ask for camera/microphone permission only after explicit user action.
- Show clear mic/camera state and a reliable way to stop tracks.
- Exchange session descriptions and ICE candidates through authenticated room signaling.
- Validate room membership before allowing signaling.
- Handle join/leave, permission denial, connection failure, and reconnection.
- Test on mobile browsers and limited bandwidth.
- Understand that STUN helps peers discover network paths but does not guarantee connectivity. Some networks require a TURN relay; investigate free availability and quotas before promising reliability.
- Never turn on a participant's camera or microphone without their explicit action.

Start with two devices. Peer-to-peer mesh calling becomes more demanding as participant count increases. Do not promise a room-size limit until it has been measured under realistic network conditions.

## 7. Suggested data model

This is a starting point to review, not an existing database schema. Keep the first version minimal.

### profiles
- `id`: authentication user ID
- `display_name`
- `role`: user or administrator
- `created_at`

### films
- `id`, `title`, `description`, `genre`
- `poster_path` (optional)
- `storage_path`, `mime_type`, `file_size`
- `duration_seconds` (optional)
- `published`, `uploaded_by`, `created_at`

### rooms
- `id`, `name` (optional), `host_user_id`
- `film_id` (nullable until selected)
- `is_private`, secure invite-token reference/hash
- `playback_state`, `playback_position_seconds`
- `state_changed_at`, `created_at`

### room_members
- `room_id`, `user_id`, `role`, `joined_at`
- Enforce uniqueness for each room/user pair.

### chat_messages
- `id`, `room_id`, `user_id`, `message`, `created_at`

Use ephemeral realtime messages for WebRTC signaling where practical; avoid permanently storing sensitive connection details without a clear reason.

### Security rules
- Enable RLS on tables exposed through the client API.
- Users can read/update only permitted fields of their own profile.
- Only admins can create/edit/publish films or upload objects.
- Only room members can read that room's private data and chat.
- Only authorized room members can send signaling events.
- Only the host or authorized controllers can update shared playback state.
- Validate permissions server-side/database-side. Hiding a button is not security.
- Never trust a client-supplied role, room ID, invite token, or storage path without checking it.

## 8. Ordered implementation roadmap

Build one stage at a time. Do not attempt the entire platform in one large change.

### Stage 1 — Stabilize frontend
- Inspect all pages and scripts.
- Check links, mobile layout, console errors, and accessibility.
- Make local media controls and placeholders accurately described.
- Remove misleading states and keep the interface consistent.

**Done when:** All pages load on phone and desktop sizes, controls behave as described, and no interface falsely claims a backend feature is active.

### Stage 2 — Backend foundation
- Confirm provider and free-tier limits.
- Configure authentication and sessions.
- Create the minimal schema.
- Enable and test RLS.
- Add safe frontend configuration without secrets.

**Done when:** Users can register/sign in/out and ordinary users cannot perform admin actions or access unauthorized records.

### Stage 3 — Admin uploads
- Build a protected admin page.
- Select a file from local device storage.
- Validate file type and size on the backend.
- Implement secure cloud upload authorization.
- Save metadata and support progress/error/retry/publish states.

**Done when:** An admin uploads a permitted test film; it remains available when the admin device is offline; ordinary users cannot upload or publish films.

### Stage 4 — Library and playback
- Load published films from the database.
- Connect search and genre filtering to real records.
- Display film details/posters where available.
- Play a stored test film on Android and desktop.
- Handle unsupported formats and playback errors.

**Done when:** Another device can play a published test film without depending on the uploader's device.

### Stage 5 — Rooms and sync
- Implement create/join/leave.
- Add private invitations and membership checks.
- Add room presence.
- Establish one authoritative playback controller.
- Synchronize play, pause, and seek.
- Test late joins and reconnects.

**Done when:** Two devices in one room play the same film and remain acceptably synchronized through play, pause, and seek.

### Stage 6 — WebRTC voice/video
- Implement authenticated room signaling.
- Connect two devices using WebRTC.
- Share audio/video only after each participant opts in.
- Connect participant mini-screen elements to remote streams.
- Add mute, camera-off, leave-call, and connection states.
- Test denied permissions, network changes, and reconnection.
- Verify TURN needs and free-tier limitations.

**Done when:** Two authorized participants can hear one another and optionally see one another, while unauthorized users cannot join the media session.

### Stage 7 — Chat and release
- Add room text chat with validation and sensible limits.
- Add loading, empty, error, and offline states.
- Test privacy and authorization.
- Test Android and desktop browsers.
- Document setup, deployment, and known limits.
- Deploy only after the owner chooses and configures a free hosting option.

**Done when:** The core journey works from sign-in through joining a room, watching together, communicating, and leaving safely within verified free-tier limits.

## 9. Instructions for every AI coding agent

### Before changing code
1. Read this README fully.
2. Inspect the current branch and repository tree.
3. Fetch the latest version of every file to be changed.
4. Check existing functions, styles, IDs, and behavior before adding anything.
5. Identify the smallest complete next task.
6. If a provider, schema, or product decision is missing, ask the owner or present options before making an irreversible choice.

### While changing code
1. Make focused, minimal changes.
2. Preserve working behavior and the existing visual direction.
3. Use semantic HTML and accessible controls.
4. Handle unsupported browser APIs, denied permissions, and failed network requests.
5. Never expose secrets, private room tokens, or privileged database keys.
6. Never weaken RLS or room authorization to make a demo work.
7. Do not use fake data that could be mistaken for real users, films, or connections.
8. Do not add dependencies without explaining why.
9. Do not overwrite unrelated owner changes.

### After changing code
1. Review the final diff.
2. Run available checks/tests where possible.
3. Verify links, element IDs, and script references.
4. State exactly what changed.
5. State what was tested and what could not be tested.
6. List remaining limitations and the next smallest step.
7. Update this README when architecture, status, setup, or decisions materially change.

**Honesty rule:** A GitHub commit is not a deployment. Never claim the site is live, a database connected, a film uploaded, a room created, or users connected unless that exact behavior was verified.

## 10. Working with the owner

- The owner primarily develops/manages this project from an Android phone.
- Give short, sequential instructions when owner action is needed.
- Prefer making authorized repository changes directly rather than asking the owner to paste large code blocks.
- Never ask the owner to reveal passwords, service-role keys, private tokens, or secrets in chat.
- Explain where configuration values belong and how to store them safely.
- Keep explanations understandable without sacrificing technical accuracy.
- Confirm before introducing a paid service, changing the free product model, or making a major architecture decision.

## 11. Recommended next task

The first frontend page set is now in place: home, library, film details, viewing room, and Studio preview. Perform a real browser review on Android and desktop, checking navigation, responsive layout, form behavior, media permissions, and accessibility. Fix issues found before connecting services.

After that review, confirm the backend provider and its current free-tier limits. Then implement authentication, administrator roles, database policies, and cloud storage in that order. Do not expose the Studio page as a real admin area until server-side role checks and storage permissions are in place. Prove the core flow with two devices first.

## 12. Definition of success

Movies succeeds when someone can use a phone or computer to browse an authorized film library, join a public or private room, watch the same film in sync with others, and optionally communicate through voice/video—while administrator-uploaded films remain available from cloud storage and the service stays within genuinely free operating limits.


## 13. Development log

### 2026-11-24 — Local media control reliability

Updated the viewing-room preview and local media handling:

- Added a dedicated, accessible live status label for local media state.
- Added screen-reader status announcements for permission and device errors.
- Added clearer handling for denied permissions, missing devices, and devices that cannot start.
- Updated the UI if a media track ends unexpectedly.
- Kept microphone and camera capture local to the current device; no audio/video is transmitted to other participants.
- Kept the existing no-framework, no-extra-dependency approach.

**Files changed:** `watch.html`, `assets/js/app.js`.

**Verification:** GitHub file updates completed. A live browser test on Android and a second-device test have not yet been performed. Do not treat this as verified group calling.

**Next owner test:** Open the viewing page over HTTPS on Android, try the microphone and camera controls, deny permission once to inspect the error message, then grant permission and confirm the camera preview appears and turns off when requested.

The next engineering decision remains the backend provider and authentication/room-membership design. WebRTC signaling should wait until those foundations are confirmed.


## 14. Development log

### 2026-11-24 — Frontend visual and usability refinement

Refined the existing three-page frontend without introducing a framework or additional dependency.

- Added keyboard-accessible skip links and main-content landmarks.
- Added current-page navigation semantics.
- Refined the shared visual system, page backgrounds, navigation, buttons, panels, empty states, and viewing-room surfaces.
- Improved mobile spacing and touch-control sizing.
- Added sticky desktop navigation, clearer focus states, reduced-motion handling, and more consistent responsive behavior.
- Improved the library's empty-state status so search and category selection do not imply that a populated catalogue exists.

**Files changed:** `index.html`, `library.html`, `watch.html`, `assets/css/style.css`, `assets/js/app.js`.

**Verification:** Changes were committed to GitHub. No live Android/desktop browser visual regression test has been performed in this task. The library remains an empty-state frontend; search and category controls do not query real film records until a backend/catalogue is implemented.

**Next frontend QA:** Open all three pages on a narrow Android screen and a desktop viewport; verify navigation, skip links, dialog close behavior, library status messages, mini-screen toggle, and local camera/microphone controls. Fix any layout issues found before backend integration.


## 15. Development log

### 2026-11-24 — Studio and film-detail frontend pages

Added two frontend-only pages:
- `admin.html`: a Studio dashboard layout with honest placeholder metrics, a local file picker, metadata fields, rights confirmation, and a draft-preview interaction.
- `film.html`: a reusable film-detail layout with poster placeholder, metadata, description, and links to the library and viewing-room preview.
- Extended shared CSS for the Studio and film-detail layouts, including mobile breakpoints.
- Added small browser-side form interactions. File selection is local only; no file is uploaded or persisted.
- Added Studio preview links to the home and library footers.

**Important limitations:** Studio is not protected by authentication or administrator roles. The file picker does not upload to cloud storage. Drafts are not saved. Film details are a neutral template, not a real film record. The viewing room still has no connected playback, room sync, chat, or remote voice/video.

**Verification:** GitHub commits completed for the two new pages and shared assets. No live browser, mobile, or desktop visual test was performed. Review the pages over the deployed preview before beginning backend work.


## 16. Development log

### 2026-11-24 — Room creation and invitation frontend

Added `rooms.html` with:
- A create-room form with room name, public/private access selection, and a future film selector.
- A join-room form for invitation codes.
- Clear private-room access messaging and links to the viewing-room preview.
- Responsive styling and lightweight form feedback.

**Important:** Forms are frontend previews only. They do not create rooms, generate invitation codes, verify codes, authenticate users, or connect participants. Those actions require a secure backend and room membership checks.

**Verification:** Repository files and navigation links were checked after the update. No live browser test was performed.


## Frontend demo interactions

The Rooms and Viewing Room pages include a browser-only prototype to make the frontend testable before backend work begins:

- Create a local room preview and generate a short invitation code.
- Open the room preview or join it by code in the same browser profile.
- Copy the local room URL where browser clipboard permission is available.
- Send and view demo chat messages saved in that browser's local storage.
- Display the selected room name, access mode, and local preview code.

These interactions are not live multi-user features. Local storage is not shared across devices or browser profiles, room codes are not secure invitations, and demo chat is not transmitted to anyone. The camera and microphone controls also remain local device previews only. Do not present any of these as connected services.


## Local cinema player prototype

The Viewing Room includes a browser-based local video player prototype:

- Select a video from the current device (browser-supported formats such as MP4 or WebM).
- Play and pause, seek, view elapsed/total time, mute, adjust volume, change playback speed, and use fullscreen.
- Optionally add a WebVTT (.vtt) subtitle file.
- Selected files use temporary browser object URLs and are released when the page is closed.

**Limitations:** This does not upload the video, make it available to another viewer, create a persistent catalogue entry, or synchronize playback across a room. Browser codec support varies by device. No sample film or copyrighted media is bundled with the project.


## Studio catalogue management preview

The Studio page now supports a browser-local catalogue workflow:

- Save film metadata as a draft preview after selecting a local video and confirming sharing rights.
- Search entries by title, category, or description and filter by draft/published-preview status.
- Edit metadata, move an entry between draft and published-preview states, or delete an entry.
- View draft and published-preview counts.

**Important limitations:** Catalogue metadata is stored in this browser's local storage only. The selected video file itself is not uploaded, copied into persistent storage, or retained by the catalogue. A "Published preview" is only a local interface state; it does not publish a film to the public library or make it available to other devices. The Studio page is still not authenticated or protected by administrator roles. Storage and active-room metrics remain unavailable until backend services are connected.

**Verification:** The JavaScript syntax and expected interface hooks were checked after the GitHub updates. A live Android/desktop browser test, storage quota test, and cross-device test have not been performed.


## Library and film detail frontend connection

The Explore library and film detail page now read the Studio catalogue's browser-local entries:

- Entries marked "Published preview" appear as responsive film cards.
- Search matches title, category, and description; category chips filter the same entries.
- Each card opens a film detail URL with its catalogue ID.
- Film details display the saved title, category, description, and selected filename.
- The viewing-room preview receives the selected film title from the film detail link.

**Limitations:** This is a same-browser preview connection using local storage. It does not publish films to other users, provide real poster uploads, or store playable video files. The viewing-room player still requires a local file selection; the catalogue's filename is metadata only. Real shared catalogue and cloud playback require backend storage and database integration.

**Verification:** JavaScript syntax and interface hooks were checked after the changes. No live browser test or cross-device test was performed.

## 17. Development log

### 2026-11-24 — Navigation consistency and mobile usability

- Standardized the main navigation destinations across the film, rooms, viewing-room, and Studio pages.
- Added the missing About and How it works destinations where appropriate.
- Marked the Rooms destination as the current section on the viewing-room page and preserved the Studio current-page state.
- Changed narrow-screen navigation to a horizontally scrollable row so links remain readable instead of being compressed.
- Kept the navigation keyboard reachable and retained semantic navigation labels and current-page attributes.

**Files changed:** `film.html`, `rooms.html`, `watch.html`, `admin.html`, `assets/css/style.css`.

**Verification:** Static repository checks are required after the update. No live Android browser or touch-device visual test has been performed.

## 18. Studio poster selection preview

The Studio form now allows an optional poster image alongside a selected video:

- Accepts JPG, PNG, and WebP images up to 8 MB before browser-side compression.
- Resizes artwork to a maximum of 640 × 900 pixels and compresses it to JPEG for a smaller local preview.
- Shows the selected poster before saving and preserves it when editing an entry.
- Displays saved poster artwork in Studio catalogue cards, Explore film cards, and film detail pages.
- Falls back to the generated title artwork when no poster is selected.

**Important limitations:** Posters are compressed into browser local storage with the catalogue metadata. They are not uploaded or shared between devices. Browser storage can fill up, in which case the entry may not save. Video files remain on the selecting device and are not uploaded. The poster selection limit is not a cloud upload limit.

**Verification:** JavaScript syntax and static interface hooks were checked. Image compression, browser storage capacity, and visual rendering still need a live Android browser test.


## 19. Studio video-file preparation preview

The Studio video picker now performs a local file check before a draft can be prepared:

- Recognizes common video filename extensions: MP4, M4V, WebM, Ogg/OGV, and MOV. MP4 and WebM are the preferred initial formats; codec support still varies by browser and device.
- Rejects unrecognized extensions and files explicitly identified by the browser as non-video.
- Displays the selected filename, file size, reported MIME type, duration, and video dimensions when the browser can read them.
- Uses a temporary object URL only to inspect video metadata, then revokes it after inspection, on replacement, or when leaving the page.
- Stores available metadata with the local catalogue entry so it can be shown in Studio.
- Shows a clear message when metadata cannot be read. A successful metadata check does not guarantee that the entire film will play correctly.

**Important limitations:** This is local file preparation, not an upload. The selected video remains on the current device and is not copied into local storage or cloud storage. No upload progress is displayed because no upload service is connected. There is no assumed maximum video size; a real limit must come from the selected storage provider and be enforced by the backend. The Studio page is still an unsecured frontend preview.

**Verification:** Static checks should cover JavaScript syntax, file-type validation, metadata event handling, temporary object-URL cleanup, and catalogue field rendering. A real Android browser test with multiple sample formats and large files has not yet been performed.


## 20. Studio local video playback check

The Studio file picker now provides a browser video player for the currently selected file:

- Shows a local preview with native playback controls after a recognized video file is selected.
- Lets the Studio operator manually test picture and audio before saving the catalogue draft.
- Reports when playback starts or when the browser cannot decode the selected file, with a practical format suggestion.
- Keeps the selected file in a temporary browser object URL; the URL is released when another file is selected, the editor is reset, an existing entry is opened for editing, or the page is closed.
- The player is hidden when no new file is selected. Editing an existing catalogue entry does not imply that its original video file is available.

**Important limitations:** The preview plays only on the current device. It does not upload, publish, stream to a room, or share the film with other viewers. Playback success on one browser/device does not guarantee playback on every device. The video file itself is still not saved in the local catalogue or cloud storage.

**Verification:** JavaScript syntax and static hooks for the preview player, playback/error feedback, and object-URL cleanup should be checked. Actual playback, sound, and mobile-browser behavior still require testing on an Android device with sample files.
