import { NextResponse } from 'next/server';

// POST { image: "data:image/jpeg;base64,..." } -> { title, items, calories, protein, carbs, fat, confidence }
// Calls Gemini Vision server-side so GEMINI_API_KEY never reaches the browser.

const MAX_IMAGE_CHARS = 6_000_000; // ~4.5MB decoded; the client already downscales to 1024px JPEG
const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|heic|heif));base64,([A-Za-z0-9+/]+=*)$/;

const PROMPT =
  'Kamu adalah ahli gizi. Identifikasi setiap item makanan di foto ini beserta estimasi gramasinya, ' +
  'lalu hitung total kalori (kcal), protein, karbohidrat, dan lemak (gram) untuk seluruh porsi di foto. ' +
  'Gunakan nama makanan Bahasa Indonesia. title = ringkasan singkat isi piring (maks 60 karakter). ' +
  'confidence = keyakinanmu 0-100. Jika foto bukan makanan, kembalikan items kosong dan semua angka 0.';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    items: { type: 'ARRAY', items: { type: 'STRING' } },
    calories: { type: 'NUMBER' },
    protein: { type: 'NUMBER' },
    carbs: { type: 'NUMBER' },
    fat: { type: 'NUMBER' },
    confidence: { type: 'NUMBER' },
  },
  required: ['title', 'items', 'calories', 'protein', 'carbs', 'fat', 'confidence'],
};

const num = (v: unknown, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));

// The Android app (Capacitor WebView) runs on https://localhost and calls this deployed route cross-origin.
const APP_ORIGINS = new Set(['https://localhost', 'capacitor://localhost']);

function withCors(req: Request, res: Response) {
  const origin = req.headers.get('origin');
  if (origin && APP_ORIGINS.has(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export function OPTIONS(req: Request) {
  return withCors(req, new Response(null, { status: 204 }));
}

export async function POST(req: Request) {
  return withCors(req, await analyze(req));
}

async function analyze(req: Request) {
  let image: unknown;
  try {
    ({ image } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Body harus JSON { image }' }, { status: 400 });
  }
  if (typeof image !== 'string') return NextResponse.json({ error: 'Field image wajib berupa data URL' }, { status: 400 });
  if (image.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: 'Foto terlalu besar' }, { status: 413 });
  const match = DATA_URL_RE.exec(image);
  if (!match) return NextResponse.json({ error: 'Format foto tidak didukung' }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY belum diatur di .env.local' }, { status: 500 });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: match[1], data: match[2] } }, { text: PROMPT }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
      }),
    });
  } catch (e) {
    console.error('Gemini fetch failed', e);
    return NextResponse.json({ error: 'Tidak bisa menghubungi Gemini' }, { status: 502 });
  }
  if (!res.ok) {
    console.error('Gemini error', res.status, await res.text());
    return NextResponse.json({ error: `Gemini menolak permintaan (${res.status})` }, { status: 502 });
  }

  let parsed: Record<string, unknown>;
  try {
    const data = await res.json();
    parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
  } catch {
    return NextResponse.json({ error: 'Respons AI tidak terbaca' }, { status: 502 });
  }

  const items = Array.isArray(parsed.items) ? parsed.items.filter((i): i is string => typeof i === 'string').slice(0, 12) : [];
  if (items.length === 0) return NextResponse.json({ error: 'Makanan tidak terdeteksi di foto' }, { status: 422 });

  return NextResponse.json({
    title: (typeof parsed.title === 'string' && parsed.title.trim().slice(0, 80)) || items.join(', '),
    items,
    calories: num(parsed.calories, 5000),
    protein: num(parsed.protein, 500),
    carbs: num(parsed.carbs, 1000),
    fat: num(parsed.fat, 500),
    confidence: num(parsed.confidence, 100),
  });
}
