# Cloud storage architecture decision

**Status:** Multi-provider design approved; Google Drive and OneDrive are the first planned integrations. No accounts connected yet.  
**Date checked:** 2026-11-24  
**Project constraint:** Zero budget, Android-first, authorized films only


## Current implementation status — 2026-11-24

The Movies project is connected to Supabase project `whyguixombtnvfullffz`. The following first-stage storage implementation is now configured:

- Private bucket: `film-videos` (public access disabled).
- Per-file maximum: 50 MiB, the current Supabase Free-plan maximum upload size.
- Accepted MIME types: MP4, WebM, Ogg video and QuickTime/MOV.
- Storage policies: authenticated administrators only, with each object restricted to a folder named for that administrator's auth user ID.
- Draft metadata fields: `storage_path`, `upload_status`, and `uploaded_at`.
- Studio upload flow: resumable TUS upload with progress reporting; video bytes are stored separately from draft metadata.
- Public playback/publishing: not enabled. Uploaded objects remain private and this implementation does not provide a public playback URL.

The Supabase Free project also has a limited total storage allowance (currently 1 GB) and bandwidth/egress allowances. A 50 MiB per-file ceiling does not mean the project can store unlimited films. Monitor actual project usage in Supabase and stop uploads before reaching the project quota. The upload feature must be tested with a small, authorized video before relying on it.

This is a first-stage private upload implementation, not the final multi-provider architecture described below. Google Drive and OneDrive remain future integrations and are not connected.

## 1. Decision summary

The owner approved a **multi-provider storage system**, starting with:
1. Google Drive
2. Microsoft OneDrive

Movies should be able to connect more providers later through a common storage adapter interface. The owner can connect one or more accounts, choose a destination when uploading a film, and see which provider stores each film.

This approval is for the architecture and implementation direction only. **No Google or Microsoft account has been connected, no OAuth app has been registered, and no credentials or tokens have been created.**

Cloudflare R2 remains an optional future storage adapter, not the default. The project must remain zero-budget: do not enable paid plans, add payment details, or accept overage charges. Personal cloud storage is not unlimited public streaming infrastructure. Provider quotas, API limits, account terms, download restrictions and concurrency limits still apply.

## 2. Current provider comparison

Quotas and prices below were checked against official provider pages on 2026-11-24. They can change; re-check before implementation.

| Provider | Published free allowance / relevant limit | Assessment |
|---|---|---|
| Cloudflare R2 Standard | 10 GB-month storage; 1 million Class A requests/month; 10 million Class B requests/month; no internet-egress fee | Leading candidate for film objects. Still limited storage and request quotas. |
| Supabase Storage Free | 1 GB storage; 5 GB cached and 5 GB uncached egress; pricing page lists 50 MB max upload size on Free | Useful for small images/files and application data, but not a good first choice for full-length film files. |
| Firebase Cloud Storage | Current pricing lists different free allowances depending on bucket type, including 5 GB-month storage and 100 GB/month download for certain newer buckets; confirm exact project/bucket eligibility | Possible alternative, but bucket/pricing distinctions need careful verification. |
| Backblaze B2 | Current pricing starts at a paid per-TB storage rate; includes free egress up to 3× average monthly stored data under published conditions | Not a zero-cost storage choice for this project. |

Official references:
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 product: https://www.cloudflare.com/products/r2/
- Supabase pricing: https://supabase.com/pricing
- Supabase storage bandwidth: https://supabase.com/docs/guides/storage/serving/bandwidth
- Firebase pricing: https://firebase.google.com/pricing/
- Backblaze B2 pricing: https://www.backblaze.com/cloud-storage/pricing

## 3. Multi-provider architecture

### Storage connections

Create a Storage Manager in the protected Studio area. It should show:
- Connected provider and account label.
- Connection health and last successful check.
- Approximate provider quota/usage only where the provider API makes it available.
- Files stored by that connection.
- A reconnect action when authorization expires.
- A disconnect action that revokes or removes the app's authorization where supported.

Initial provider order:
1. Google Drive.
2. Microsoft OneDrive.
3. Additional providers only after the first two are stable.

Do not ask the owner to paste access tokens, refresh tokens, client secrets, or passwords into chat or browser code. Use each provider's official OAuth authorization flow. Request only the minimum scopes needed. Explain the requested access before the owner authorizes it.

### Common storage adapter

Keep provider-specific API code behind one interface. The rest of Movies should call common operations such as:
- `connectAccount()`
- `listAuthorizedFiles()`
- `uploadFile()`
- `getFileMetadata()`
- `createPlaybackAccess()`
- `deleteStoredFile()`
- `disconnectAccount()`

Each provider adapter translates those operations into the provider's API and returns normalized metadata. Do not pretend all providers support identical upload sizes, resumable upload, byte-range streaming, quota reporting, or deletion behavior. Expose capability flags and handle unsupported operations.

### Provider-specific notes

**Google Drive**
- Use the official Google OAuth flow and Google Drive API.
- Prefer the narrow `drive.file` scope with a user-driven file picker where it supports the intended workflow. It limits the app to files created/opened/shared with the app; do not silently request access to the user's entire Drive.
- Google documents downloading binary file content using `files.get` with `alt=media`. Verify the required permissions and range/stream behavior for the exact file types and account before enabling video playback.
- Google marks broad Drive scopes such as `drive.readonly` and `drive` as restricted; avoid them unless the feature genuinely requires them and all applicable verification/policy requirements can be met.

**Microsoft OneDrive**
- Use Microsoft identity platform OAuth and Microsoft Graph delegated permissions.
- Request the least-privileged file permissions that support the chosen flow. Do not request tenant-wide or all-file access unnecessarily.
- Microsoft Graph's file content endpoint redirects to a temporary preauthenticated download URL. Microsoft documents partial byte-range downloads against that URL, which is relevant to video seeking. Treat the URL as a short-lived secret: never store it permanently or expose it in logs.
- Re-fetch playback access when the temporary URL expires.

Official API references:
- Google Drive download/export: https://developers.google.com/workspace/drive/api/guides/manage-downloads
- Google Drive file download endpoint: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get
- Google Drive OAuth scopes: https://developers.google.com/identity/protocols/oauth2/scopes
- Microsoft Graph file content: https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0

### Security and privacy requirements

- OAuth authorization-code flow with PKCE where supported; validate state and redirect URIs.
- Keep refresh tokens and client secrets on a trusted server only, encrypted at rest. Never put them in HTML, JavaScript, localStorage, GitHub, logs, or database fields readable by ordinary clients.
- Access tokens should be short-lived and used only server-side where possible.
- Associate every connection with the authenticated Movies account that authorized it.
- Check admin role and film access before issuing playback access.
- Do not expose provider file IDs, tokens, or preauthenticated download URLs to other viewers unless absolutely required; prefer a server-controlled playback gateway that supports byte ranges.
- Make disconnect/revocation and account deletion clear. Removing a connection should stop future access; explain what happens to catalogue records and files.
- Keep an audit trail for connect, upload, publish, unpublish, delete, and disconnect events without logging credentials.
- Follow Google and Microsoft API terms, OAuth verification requirements, user-data policies and account eligibility rules. Do not bypass age, consent, verification, or other provider requirements. If an adult/guardian authorization is required by a provider's rules, pause and ask for the appropriate help rather than bypassing it.

### Important playback limitation

A Drive or OneDrive account is personal cloud storage, not a guaranteed video CDN. A working file download API does not guarantee that a provider permits or can sustain public multi-viewer streaming. Before launch, verify provider terms and test:
- HTML video playback and seeking using byte-range requests.
- Two separate viewer devices.
- Multiple simultaneous viewers.
- API throttling and temporary URL expiry.
- Owner disconnect, password/security changes, revoked consent and expired tokens.

If a provider cannot reliably or permissibly serve the intended viewers, keep it as an import/source provider and copy authorized films into a dedicated storage service only if a genuinely free and policy-compliant option is available.

## 4. Proposed architecture (provider-independent)

Keep film metadata and room state separate from the large video objects.

### Application database

The database stores:
- Film ID, title, description, genre, poster reference, duration, MIME type and file size.
- A storage provider identifier and opaque object key/path.
- Upload status: pending, uploaded, failed, published, or archived.
- Uploader ID and timestamps.

The database must not store provider secret keys or rely on a permanent public URL as the only identifier.

### Object storage

The object store holds:
- Original authorized film file.
- Optional poster image (if not stored in a separate image service).
- Optional future subtitle files.

Use a private bucket by default. A viewer should receive a short-lived playback URL only after the backend verifies that the film is published and the viewer is allowed to access it. Do not place storage credentials in browser JavaScript.

### Upload flow

1. Admin signs in.
2. Backend verifies the user's administrator role.
3. Admin selects a supported video from the phone.
4. Backend validates file size, MIME type, extension, quota headroom and upload permission.
5. Backend creates a narrowly scoped upload authorization.
6. Browser uploads directly to object storage, with progress and cancellation feedback.
7. Backend verifies the stored object and records its size/type.
8. Film remains a draft until the admin explicitly publishes it.
9. Backend blocks new uploads before the free quota is exceeded.

For large files, investigate multipart/resumable upload support before implementation. Do not load an entire large video into browser memory. A failed or interrupted upload must not create a published film record.

### Playback flow

1. Viewer opens a published film.
2. Backend checks publication and access rules.
3. Backend issues a time-limited read URL or securely proxies the file.
4. Browser plays the file using the HTML video element.
5. Storage must support HTTP byte-range requests so seeking and resuming can work.
6. Configure CORS narrowly for the website origin and expose headers required for range-based playback.
7. Never make a private film publicly readable just to simplify playback.

A successful upload does not prove Android playback compatibility. Test an authorized, small MP4 encoded with H.264 video and AAC audio on at least two devices before expanding formats.

## 5. Optional R2 implementation outline (future option only)

If R2 is approved:
- Create a private Standard storage bucket.
- Use an S3-compatible server-side integration or a small trusted backend/Worker to issue short-lived upload and download authorizations.
- Keep R2 access key ID and secret exclusively in server-side secrets.
- Use opaque object keys, not user-supplied filenames as storage paths.
- Configure CORS for the exact production/preview origins needed, the required methods, and range-related headers.
- Support browser video range reads and verify seeking.
- Track storage and operation usage; stop uploads before quota limits are reached.
- Keep the object key in the database and generate short-lived playback access after authorization.
- Test delete/unpublish behavior so removing a catalogue entry does not accidentally leave an exposed object.

R2 is object storage, not a complete video streaming/transcoding platform. It does not automatically convert uploads into adaptive HLS renditions. Do not promise transcoding, adaptive bitrate streaming, unlimited concurrent viewers, or guaranteed global playback from this choice alone.

## 6. Supabase's possible role

Supabase is currently used by Movies for authentication, relational metadata, RLS, room-related data, and the first-stage private film upload bucket. Its Free storage allowance is limited (currently 1 GB) with limited cached/uncached egress, so it is not a long-term high-volume full-length film host. Google Drive and OneDrive remain future storage integrations. Never reuse credentials or settings from the separate LearnHoliday project, and never request or commit a service-role key.

## 7. Zero-budget safeguards

- Do not enable a paid plan or automatic overage billing.
- Do not ask the owner to enter payment details to continue this prototype.
- Set conservative upload limits based on the verified free quota.
- Show remaining storage and explain that uploads may be paused when the free allowance is nearly used.
- Keep a delete/unpublish process and a clear data-retention policy.
- Avoid duplicate copies of large videos unless required.
- Do not claim that many people can watch simultaneously until real device/network tests have measured bandwidth, request usage, and playback.
- Only upload films the owner has the rights to distribute.

## 8. Implementation gates

Do not write provider-specific upload code until all of these are true:

- [ ] Owner approves Cloudflare R2 or selects another provider.
- [ ] Current account eligibility and free-tier signup requirements are verified.
- [ ] No payment method or paid upgrade is required for the agreed prototype.
- [ ] Website hosting/backend choice is known.
- [ ] Admin authentication and server-side role checks exist.
- [ ] Upload authorization and private read access are designed.
- [ ] Quota monitoring and hard-stop behavior are defined.
- [ ] A small authorized test video is available for two-device testing.

## 9. Implementation gates

Do not write provider-specific upload or OAuth code until all of these are true:

- [x] Owner approves Google Drive and OneDrive as the first provider integrations.
- [ ] Confirm the website backend and trusted server-side token storage.
- [ ] Create provider developer app registrations using official flows and review required consent/verification.
- [ ] Confirm the owner's account eligibility and any age/guardian requirements without bypassing them.
- [ ] Select minimum OAuth scopes for both providers.
- [ ] Define the normalized storage adapter and account-connection schema.
- [ ] Implement authentication and server-side administrator checks.
- [ ] Test secure upload and playback with a small authorized video on two devices.
- [ ] Confirm provider terms, throttling, range requests and multi-viewer suitability.

## 10. Next smallest task

Design the backend connection records and OAuth callback flow for Google Drive first, then OneDrive using the same adapter contract. Do not start with frontend buttons alone: the secure server-side token vault and authentication must exist before a connection can be considered real.


## Public film publishing (2026-11-26)

The `film-videos` bucket remains private. Admins publish a draft by creating a row in `public.films` with `provider = 'supabase'` and `provider_file_id` set to the private Storage object path. The draft stores the linked `published_film_id`. Public library queries are filtered to `published = true`.

The public `get-film-playback` Edge Function uses a server-side service-role credential, checks that the requested film is currently published and that its object path belongs to the film owner, then returns a signed URL with a 6-hour lifetime. The service-role credential is never included in the browser bundle. Unpublishing immediately removes the row from the public catalogue and causes subsequent playback-link requests to be rejected. Existing signed URLs remain valid only until their 6-hour expiry.

This feature is not a DRM system and cannot prevent viewers from sharing a valid temporary URL or recording content. It does not promise unlimited viewers, storage, or bandwidth. Test on a signed-out second device before treating public playback as production-ready.
