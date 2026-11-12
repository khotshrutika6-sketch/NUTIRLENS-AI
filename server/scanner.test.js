import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import analyzeHandler from "../api/scanner/analyze.js";
import recalculateHandler from "../api/scanner/recalculate.js";
import { fetchWithTimeout } from "./scanner.js";

const originalFetch = globalThis.fetch;
const originalEnvironment = { ...process.env };
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value) {
      this.body = JSON.parse(value);
    },
  };
}

function request(body, token = "test-id-token") {
  return {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body,
  };
}

beforeEach(() => {
  process.env.FIREBASE_API_KEY = "test-firebase-key";
  process.env.FIREBASE_PROJECT_ID = "test-project";
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.NUTRITION_API_KEY = "test-usda-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
});

test("external provider requests time out with a clear 504 error", async () => {
  globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new Error("Request aborted")), { once: true });
  });
  await assert.rejects(
    fetchWithTimeout("https://example.test", {}, 5, "Test provider"),
    (error) => error.status === 504 && /Test provider did not respond within/.test(error.message),
  );
});

test("analyze authenticates, identifies foods, and scales real database values by portion", async () => {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("identitytoolkit.googleapis.com")) return response({ users: [{ localId: "user-1" }] });
    if (url.includes("generativelanguage.googleapis.com")) {
      assert.match(url, /models\/gemini-3\.8-flash:generateContent/);
      const requestBody = JSON.parse(init.body);
      assert.equal(requestBody.generationConfig.responseMimeType, "application/json");
      return response({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                mealName: "Rice bowl",
                items: [{ name: "Rice", estimatedWeightG: 150, confidence: 0.91, uncertainIngredients: [] }],
                notes: "Visual estimate.",
                freshness: { label: "Looks Fresh", observations: [], uncertain: true },
              }),
            }],
          },
        }],
      });
    }
    if (url.includes("/foods/search")) {
      assert.match(url, /dataType=Foundation/);
      assert.match(url, /dataType=SR\+Legacy/);
      return response({ foods: [{ fdcId: 123, description: "Rice, white, cooked", dataType: "SR Legacy" }] });
    }
    if (url.includes("/food/123")) {
      return response({
        fdcId: 123,
        description: "Rice, white, cooked",
        dataType: "SR Legacy",
        foodNutrients: [
          { nutrient: { number: "1008", name: "Energy", unitName: "kcal" }, amount: 130 },
          { nutrient: { number: "1005", name: "Carbohydrate, by difference", unitName: "g" }, amount: 28 },
          { nutrient: { number: "1003", name: "Protein", unitName: "g" }, amount: 2.7 },
        ],
      });
    }
    throw new Error(`Unexpected API request: ${url}`);
  };

  const res = mockResponse();
  await analyzeHandler(request({ mimeType: "image/png", imageBase64: png }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.items[0].nutrition.calories.value, 195);
  assert.equal(res.body.items[0].nutrition.carbohydrates.value, 42);
  assert.equal(res.body.items[0].nutrition.protein.value, 4.05);
  assert.equal(res.body.items[0].nutrition.fat, null);
  assert.equal(res.body.totals.calories.value, 195);
  assert.equal(res.body.totals.fat, null);
});

test("analyze rejects unauthenticated and unsupported image requests", async () => {
  const unauthorized = mockResponse();
  await analyzeHandler(request({ mimeType: "image/png", imageBase64: png }, ""), unauthorized);
  assert.equal(unauthorized.statusCode, 401);

  globalThis.fetch = async () => response({ users: [{ localId: "user-1" }] });
  const invalidImage = mockResponse();
  await analyzeHandler(request({ mimeType: "image/gif", imageBase64: png }), invalidImage);
  assert.equal(invalidImage.statusCode, 400);
});

test("analyze reports Gemini credential and model configuration failures clearly", async () => {
  globalThis.fetch = async (input) => {
    if (String(input).includes("identitytoolkit.googleapis.com")) return response({ users: [{ localId: "user-1" }] });
    return response({ error: "provider error details are not exposed" }, 403);
  };
  const res = mockResponse();
  await analyzeHandler(request({ mimeType: "image/png", imageBase64: png }), res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /Gemini rejected the configured API key/);
  assert.doesNotMatch(res.body.error, /provider error details/);
});

test("analyze surfaces safe provider details for other Gemini failures", async () => {
  globalThis.fetch = async (input) => {
    if (String(input).includes("identitytoolkit.googleapis.com")) return response({ users: [{ localId: "user-1" }] });
    return response({ error: { message: "Invalid request: unsupported image content" } }, 400);
  };
  const res = mockResponse();
  await analyzeHandler(request({ mimeType: "image/png", imageBase64: png }), res);
  assert.equal(res.statusCode, 502);
  assert.equal(
    res.body.error,
    "Gemini request failed (HTTP 400): Invalid request: unsupported image content",
  );
});

test("analyze reports USDA credential failures instead of returning empty nutrition", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("identitytoolkit.googleapis.com")) return response({ users: [{ localId: "user-1" }] });
    if (url.includes("generativelanguage.googleapis.com")) {
      return response({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                mealName: "Rice",
                items: [{ name: "Rice", estimatedWeightG: 100, confidence: 0.9 }],
              }),
            }],
          },
        }],
      });
    }
    if (url.includes("/foods/search")) return response({ error: "invalid key" }, 403);
    throw new Error(`Unexpected API request: ${url}`);
  };
  const res = mockResponse();
  await analyzeHandler(request({ mimeType: "image/png", imageBase64: png }), res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /USDA FoodData Central rejected the configured API key/);
});

test("recalculate uses returned per-100g nutrients without another provider lookup", async () => {
  globalThis.fetch = async () => response({ users: [{ localId: "user-1" }] });
  const res = mockResponse();
  await recalculateHandler(request({
    items: [{
      name: "Rice",
      weightG: 200,
      nutritionPer100g: { calories: { value: 130, unit: "kcal" } },
    }],
  }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.items[0].nutrition.calories.value, 260);
  assert.equal(res.body.totals.calories.value, 260);
  assert.equal(res.body.totals.protein, null);
});
