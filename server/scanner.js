import { firebaseConfig } from "../shared/firebase-config.js";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const AUTH_TIMEOUT_MS = 5_000;
const GEMINI_TIMEOUT_MS = 20_000;
const NUTRITION_TIMEOUT_MS = 5_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const NUTRIENTS = [
  { key: "calories", names: ["Energy"], ids: [1008, 2047, 2048], unit: "kcal" },
  { key: "carbohydrates", names: ["Carbohydrate, by difference"], ids: [1005], unit: "g" },
  { key: "protein", names: ["Protein"], ids: [1003], unit: "g" },
  { key: "fat", names: ["Total lipid (fat)"], ids: [1004], unit: "g" },
  { key: "fiber", names: ["Fiber, total dietary"], ids: [1079], unit: "g" },
  { key: "sugar", names: ["Sugars, total including NLEA"], ids: [2000, 2001], unit: "g" },
  { key: "sodium", names: ["Sodium, Na"], ids: [1093], unit: "mg" },
  { key: "potassium", names: ["Potassium, K"], ids: [1092], unit: "mg" },
  { key: "calcium", names: ["Calcium, Ca"], ids: [1087], unit: "mg" },
  { key: "iron", names: ["Iron, Fe"], ids: [1089], unit: "mg" },
  { key: "magnesium", names: ["Magnesium, Mg"], ids: [1090], unit: "mg" },
  { key: "vitaminA", names: ["Vitamin A, RAE"], ids: [1106], unit: "µg RAE" },
  { key: "vitaminC", names: ["Vitamin C, total ascorbic acid"], ids: [1162], unit: "mg" },
  { key: "vitaminD", names: ["Vitamin D (D2 + D3)"], ids: [1114], unit: "µg" },
  { key: "vitaminB12", names: ["Vitamin B-12"], ids: [1178], unit: "µg" },
];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function methodNotAllowed(req, res, allowed) {
  if (req.method === allowed) return false;
  res.setHeader("Allow", allowed);
  send(res, 405, { error: "Method not allowed." });
  return true;
}

async function fetchWithTimeout(url, options, timeoutMs, serviceName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw Object.assign(
        new Error(`${serviceName} did not respond within ${Math.round(timeoutMs / 1000)} seconds. Please try again.`),
        { status: 504 },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function authenticate(req) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw Object.assign(new Error("Please sign in to scan and save meals."), { status: 401 });

  const apiKey = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey;

  const response = await fetchWithTimeout(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    },
    AUTH_TIMEOUT_MS,
    "Sign-in verification",
  );
  if (!response.ok) throw Object.assign(new Error("Your session expired. Please sign in again."), { status: 401 });

  const result = await response.json();
  const user = result.users?.[0];
  if (!user?.localId) {
    throw Object.assign(new Error("Your session could not be verified."), { status: 401 });
  }
  return { uid: user.localId };
}

function requireImage(body) {
  const mimeType = body?.mimeType;
  const base64 = body?.imageBase64;
  if (typeof mimeType !== "string" || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw Object.assign(new Error("Choose a JPG, PNG, or WEBP image."), { status: 400 });
  }
  if (typeof base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw Object.assign(new Error("The selected image could not be read. Please choose it again."), { status: 400 });
  }
  const image = Buffer.from(base64, "base64");
  if (image.length === 0 || image.length > MAX_IMAGE_BYTES || image.toString("base64") !== base64) {
    throw Object.assign(new Error("Images must be smaller than 3 MB."), { status: 413 });
  }

  const validSignature =
    (mimeType === "image/jpeg" && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) ||
    (mimeType === "image/png" && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === "image/webp" && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP");
  if (!validSignature) {
    throw Object.assign(new Error("The image contents do not match the selected file type."), { status: 400 });
  }
  return { mimeType, base64 };
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 4_300_000) {
        reject(Object.assign(new Error("Image payload is too large."), { status: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("Invalid request body."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function extractJson(text) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(clean);
  } catch {
    throw Object.assign(new Error("The vision service returned an unreadable response. Please try another photo."), { status: 502 });
  }
}

async function identifyFood(image) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("Gemini is not configured. Add GEMINI_API_KEY to the server environment."), { status: 503 });

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const prompt = `Examine this food photograph. Return only JSON with this exact shape:
{"mealName":"short meal title","items":[{"name":"specific visible food item","estimatedWeightG":150,"confidence":0.92,"visibleIngredients":["clearly visible ingredient"],"uncertainIngredients":["ingredient only if visible but uncertain"]}],"notes":"visual portion estimate caveat","freshness":{"label":"Looks Fresh|Needs Attention|Visible Spoilage Signs","observations":["only visible signs"],"uncertain":true}}
Identify each distinct food on the plate, including Indian dishes and visible sides/garnishes. Give each item's total visible portion in grams and confidence between 0 and 1. Put confidently visible ingredients in visibleIngredients and uncertain visible ingredients in uncertainIngredients. Do not list hidden or inferred ingredients. Only create a separate item for a component when it has its own visible portion to estimate; avoid double counting ingredients. If no food is visible, return {"mealName":"","items":[],"notes":"No food detected","freshness":{"label":"Needs Attention","observations":[],"uncertain":true}}. Assess appearance only, never claim food is safe or unsafe. Do not return nutrition values, bounding boxes, or health advice.`;
  const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ inlineData: { mimeType: image.mimeType, data: image.base64 } }, { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  };
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetchWithTimeout(requestUrl, requestOptions, GEMINI_TIMEOUT_MS, "Gemini");
    if (response.status !== 503 || attempt === 1) break;
    console.warn("Gemini returned HTTP 503; retrying once after a brief delay.");
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.error("Gemini authentication failed with HTTP", response.status);
      throw Object.assign(
        new Error("Gemini rejected the configured API key. Verify GEMINI_API_KEY in Vercel and confirm the Generative Language API is enabled for that key."),
        { status: 503 },
      );
    }
    if (response.status === 404) {
      console.error("Gemini model was not found. Check GEMINI_MODEL.");
      throw Object.assign(
        new Error(`Gemini model "${model}" was not found. Set GEMINI_MODEL to a supported model ID such as gemini-3.8-flash in Vercel.`),
        { status: 503 },
      );
    }
    let providerMessage = "";
    try {
      const providerError = await response.json();
      if (typeof providerError?.error?.message === "string") {
        providerMessage = providerError.error.message
          .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]")
          .slice(0, 400);
      }
    } catch {
      // Some provider failures return an empty or non-JSON response.
    }
    console.error("Gemini request failed with HTTP", response.status, providerMessage || "(no provider message)");
    throw Object.assign(
      new Error(
        providerMessage
          ? `Gemini request failed (HTTP ${response.status}): ${providerMessage}`
          : response.status === 429
            ? "Gemini is busy. Please wait a moment and try again."
            : `Gemini is temporarily unavailable (HTTP ${response.status}). Please try again shortly.`,
      ),
      { status: response.status === 429 ? 429 : 502 },
    );
  }
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw Object.assign(new Error("Gemini did not return a food analysis. Please try another image."), { status: 502 });

  const data = extractJson(text);
  if (!Array.isArray(data.items)) throw Object.assign(new Error("Gemini returned an invalid food analysis. Please try again."), { status: 502 });
  const items = data.items.slice(0, 8).flatMap((item) => {
    if (typeof item?.name !== "string" || !item.name.trim()) return [];
    const weight = Number(item.estimatedWeightG);
    const confidence = Number(item.confidence);
    if (!Number.isFinite(weight) || weight < 1 || weight > 3000 || !Number.isFinite(confidence)) return [];
    return [{
      name: item.name.trim().slice(0, 100),
      estimatedWeightG: Math.round(weight),
      confidence: Math.max(0, Math.min(1, confidence)),
      visibleIngredients: Array.isArray(item.visibleIngredients)
        ? item.visibleIngredients.filter((entry) => typeof entry === "string").slice(0, 12)
        : [],
      uncertainIngredients: Array.isArray(item.uncertainIngredients)
        ? item.uncertainIngredients.filter((entry) => typeof entry === "string").slice(0, 8)
        : [],
    }];
  });
  return {
    mealName: typeof data.mealName === "string" && data.mealName.trim()
      ? data.mealName.trim().slice(0, 120)
      : items.map((item) => item.name).join(" + ").slice(0, 120),
    items,
    notes: typeof data.notes === "string" ? data.notes.slice(0, 300) : "Portion sizes are visual estimates.",
    freshness: normalizeFreshness(data.freshness),
  };
}

function normalizeFreshness(value) {
  const allowed = new Set(["Looks Fresh", "Needs Attention", "Visible Spoilage Signs"]);
  if (!allowed.has(value?.label)) return null;
  return {
    label: value.label,
    observations: Array.isArray(value?.observations)
      ? value.observations.filter((entry) => typeof entry === "string").slice(0, 5)
      : [],
    uncertain: true,
  };
}

function normalizedName(value) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\b(cooked|prepared|with|and)\b/g, " ").replace(/\s+/g, " ").trim();
}

function matchScore(query, candidate) {
  const queryWords = normalizedName(query).split(" ").filter(Boolean);
  const candidateWords = normalizedName(candidate).split(" ").filter(Boolean);
  if (!queryWords.length || !candidateWords.length) return 0;
  const overlap = queryWords.filter((word) => candidateWords.includes(word)).length / queryWords.length;
  return overlap + (normalizedName(candidate).includes(normalizedName(query)) ? 0.35 : 0);
}

async function lookupFood(query) {
  const apiKey = process.env.NUTRITION_API_KEY || process.env.USDA_API_KEY;
  if (!apiKey) throw Object.assign(new Error("USDA FoodData Central is not configured. Add USDA_API_KEY to the server environment."), { status: 503 });

  const params = new URLSearchParams({ query, pageSize: "10", api_key: apiKey });
  params.append("dataType", "Foundation");
  params.append("dataType", "SR Legacy");
  const search = await fetchWithTimeout(
    `https://api.nal.usda.gov/fdc/v1/foods/search?${params}`,
    {},
    NUTRITION_TIMEOUT_MS,
    "Nutrition database search",
  );
  if (!search.ok) {
    if (search.status === 401 || search.status === 403) {
      throw Object.assign(new Error("USDA FoodData Central rejected the configured API key. Verify USDA_API_KEY in Vercel."), { status: 503 });
    }
    throw new Error("FoodData Central search is currently unavailable.");
  }
  const { foods = [] } = await search.json();
  if (!foods.length) return null;

  const best = foods
    .map((food) => ({ food, score: matchScore(query, food.description || "") }))
    .sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 0.7) return null;

  const detailsResponse = await fetchWithTimeout(
    `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(best.food.fdcId)}?api_key=${encodeURIComponent(apiKey)}`,
    {},
    NUTRITION_TIMEOUT_MS,
    "Nutrition database lookup",
  );
  if (!detailsResponse.ok) {
    if (detailsResponse.status === 401 || detailsResponse.status === 403) {
      throw Object.assign(new Error("USDA FoodData Central rejected the configured API key. Verify USDA_API_KEY in Vercel."), { status: 503 });
    }
    throw new Error("FoodData Central nutrient details are currently unavailable.");
  }
  const food = await detailsResponse.json();
  const nutrientsPer100g = Object.fromEntries(NUTRIENTS.map(({ key, ids, names, unit }) => {
    const found = (food.foodNutrients || []).find((entry) => {
      const id = entry.nutrient?.number ?? entry.nutrient?.id ?? entry.number ?? entry.nutrientId;
      const name = entry.nutrient?.name ?? entry.nutrientName;
      return ids.includes(Number(id)) || names.includes(name);
    });
    let amount = Number(found?.amount ?? found?.value);
    const nutrientUnit = found?.nutrient?.unitName ?? found?.unitName ?? unit;
    if (!Number.isFinite(amount)) return [key, null];
    if (key === "calories" && (nutrientUnit === "kJ" || Number(found?.nutrient?.number) === 2048)) amount /= 4.184;
    if (key === "calories" && !["kcal", "kcal"].includes(nutrientUnit.toLowerCase())) return [key, null];
    return [key, { value: amount, unit }];
  }));
  return { fdcId: food.fdcId, description: food.description, dataType: food.dataType, nutrientsPer100g };
}

function calculateTotals(items) {
  return Object.fromEntries(NUTRIENTS.map(({ key, unit }) => {
    const values = items.map((item) => item.nutritionPer100g?.[key]?.value);
    if (values.some((value) => !Number.isFinite(value))) return [key, null];
    const total = items.reduce((sum, item) => sum + item.nutritionPer100g[key].value * item.estimatedWeightG / 100, 0);
    return [key, { value: Math.round(total * 100) / 100, unit }];
  }));
}

async function attachNutrition(items) {
  if (!(process.env.NUTRITION_API_KEY || process.env.USDA_API_KEY)) {
    throw Object.assign(new Error("USDA FoodData Central is not configured. Add USDA_API_KEY to the server environment."), { status: 503 });
  }
  let lookupError = false;
  const analyzed = await Promise.all(items.map(async (item) => {
    try {
      const match = await lookupFood(item.name);
      if (!match) {
        return { ...item, nutritionSource: null, nutritionMatch: null, nutritionPer100g: null };
      }
      return {
        ...item,
        nutritionSource: "USDA FoodData Central",
        nutritionMatch: { description: match.description, fdcId: match.fdcId, dataType: match.dataType },
        nutritionPer100g: match.nutrientsPer100g,
      };
    } catch (error) {
      if (error.status === 503) throw error;
      lookupError = true;
      return { ...item, nutritionSource: null, nutritionMatch: null, nutritionPer100g: null };
    }
  }));
  return { items: analyzed, totals: calculateTotals(analyzed), lookupError };
}

function scaleNutrition(per100g, weight) {
  if (!per100g) return null;
  return Object.fromEntries(NUTRIENTS.map(({ key, unit }) => {
    const amount = per100g[key]?.value;
    return [key, Number.isFinite(amount) ? { value: Math.round(amount * weight / 100 * 100) / 100, unit } : null];
  }));
}

export {
  attachNutrition,
  authenticate,
  calculateTotals,
  fetchWithTimeout,
  identifyFood,
  methodNotAllowed,
  normalizeFreshness,
  readBody,
  requireImage,
  scaleNutrition,
  send,
};
