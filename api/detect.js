const MAX_BYTES = 4 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const user = process.env.SIGHTENGINE_USER;
  const secret = process.env.SIGHTENGINE_SECRET;
  if (!user || !secret) return res.status(500).json({ error: "Server is missing API keys." });

  const type = (req.headers["content-type"] || "").split(";")[0];
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) {
    return res.status(415).json({ error: "Please use a JPG, PNG, WebP or GIF image." });
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) return res.status(413).json({ error: "Image is over 4 MB." });
    chunks.push(chunk);
  }

  const form = new FormData();
  form.append("media", new Blob([Buffer.concat(chunks)], { type }), "upload");
  form.append("models", "genai");
  form.append("api_user", user);
  form.append("api_secret", secret);

  try {
    const r = await fetch("https://api.sightengine.com/1.0/check.json", { method: "POST", body: form });
    const data = await r.json();
    if (data.status !== "success") {
      return res.status(502).json({ error: (data.error && data.error.message) || "Detector failed." });
    }
    return res.status(200).json({ ai: data.type.ai_generated });
  } catch (e) {
    return res.status(502).json({ error: "Could not reach the detector." });
  }
}
