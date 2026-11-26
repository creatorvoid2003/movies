import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigin = "https://creatorvoid2003.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
});

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== allowedOrigin) return json({ error: "Origin not allowed." }, 403);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    let secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (secretKeysJson) {
      try { secretKey = JSON.parse(secretKeysJson).default || secretKey; } catch { /* legacy key fallback */ }
    }
    if (!supabaseUrl || !secretKey) return json({ error: "Playback service is not configured." }, 503);
    const body = await request.json();
    const filmId = typeof body?.filmId === "string" ? body.filmId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(filmId)) {
      return json({ error: "A valid film ID is required." }, 400);
    }
    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: film, error: filmError } = await admin.from("films")
      .select("id,title,owner_id,provider,provider_file_id")
      .eq("id", filmId).eq("published", true).maybeSingle();
    if (filmError) {
      console.error("Published film lookup failed:", filmError.message);
      return json({ error: "Could not verify this film right now." }, 500);
    }
    if (!film || film.provider !== "supabase" || !film.provider_file_id) {
      return json({ error: "This film is not available for public playback." }, 404);
    }
    const storagePath = film.provider_file_id;
    if (!storagePath.startsWith(film.owner_id + "/") || storagePath.split("/").length < 3) {
      return json({ error: "The film storage reference is invalid." }, 404);
    }
    const { data: signed, error: signedError } = await admin.storage.from("film-videos").createSignedUrl(storagePath, 600);
    if (signedError || !signed?.signedUrl) {
      console.error("Signed playback URL failed:", signedError?.message);
      return json({ error: "A temporary playback link could not be created." }, 503);
    }
    return json({ filmId: film.id, title: film.title, signedUrl: signed.signedUrl, expiresIn: 600 });
  } catch (error) {
    console.error("Playback request failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "The playback request could not be completed." }, 400);
  }
});
