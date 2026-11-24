# Cloud storage architecture decision

**Status:** Research complete; provider not connected or approved yet  
**Date checked:** 2026-11-24  
**Project constraint:** Zero budget, Android-first, authorized films only

## 1. Decision summary

Cloudflare R2 is the leading candidate for storing film files because its Standard tier currently includes 10 GB-month of storage, 1 million Class A requests, 10 million Class B requests, and no internet-egress charge. This is a useful fit for a small prototype because repeated film playback can generate substantial download traffic.

This is **not** unlimited free hosting. The 10 GB storage allowance is small, request allowances are finite, and a growing film library can exceed the free tier. Do not enable paid usage, add a payment method, or accept overage charges as part of this project. Confirm account eligibility, signup requirements, current terms, and whether the free allowances can be used without billing details before setup.

**No provider has been selected or connected by this document.** The owner must approve the provider before implementation.

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

## 3. Proposed architecture (provider-independent)

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

## 4. R2-specific implementation outline (only after approval)

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

## 5. Supabase's possible role

Supabase remains a candidate for authentication, relational metadata, room membership, RLS, and realtime room events. Its Storage Free quota is currently only 1 GB with 10 GB total cached/uncached egress allowance, so it is not the preferred location for full-length films under this project's current requirements.

The Movies project has not been confirmed as connected to a Supabase project. Do not reuse credentials or settings from the separate LearnHoliday project. Before any Supabase work, the owner must explicitly confirm which project belongs to Movies. Never request or commit a service-role key.

## 6. Zero-budget safeguards

- Do not enable a paid plan or automatic overage billing.
- Do not ask the owner to enter payment details to continue this prototype.
- Set conservative upload limits based on the verified free quota.
- Show remaining storage and explain that uploads may be paused when the free allowance is nearly used.
- Keep a delete/unpublish process and a clear data-retention policy.
- Avoid duplicate copies of large videos unless required.
- Do not claim that many people can watch simultaneously until real device/network tests have measured bandwidth, request usage, and playback.
- Only upload films the owner has the rights to distribute.

## 7. Implementation gates

Do not write provider-specific upload code until all of these are true:

- [ ] Owner approves Cloudflare R2 or selects another provider.
- [ ] Current account eligibility and free-tier signup requirements are verified.
- [ ] No payment method or paid upgrade is required for the agreed prototype.
- [ ] Website hosting/backend choice is known.
- [ ] Admin authentication and server-side role checks exist.
- [ ] Upload authorization and private read access are designed.
- [ ] Quota monitoring and hard-stop behavior are defined.
- [ ] A small authorized test video is available for two-device testing.

## 8. Next smallest task

Ask the owner to confirm whether Cloudflare R2 is acceptable as the leading storage candidate. If approved, verify account setup requirements and design the minimal secure upload-signing endpoint before touching the Studio upload form. If not approved, compare another provider without connecting accounts or adding paid services.
