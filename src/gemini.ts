// Gemini AI Vision Service for NutriLens AI

export interface FoodDetection {
  label: string;
  confidence: number;
  position?: { top?: string; left?: string; right?: string; bottom?: string };
}

export interface MealAnalysis {
  mealName: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugars: number;
  freshnessScore: number; // 0 - 100
  qualityBadge: string; // e.g. "Looks Fresh 98%" or "Optimal Nutrition"
  insight: string;
  minerals: Array<{
    name: string;
    value: string;
    percent: number;
  }>;
  detections: FoodDetection[];
}

export const DEFAULT_GEMINI_KEY =
  (import.meta.env?.VITE_GEMINI_API_KEY as string) ||
  (typeof window !== "undefined"
    ? localStorage.getItem("NUTRILENS_GEMINI_KEY") || ""
    : "");

export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Converts a File object into base64 and mimeType
 */
export async function fileToBase64(
  file: File
): Promise<{ mimeType: string; base64Data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64Data] = result.split(";base64,");
      const mimeType = header.replace("data:", "") || file.type || "image/jpeg";
      resolve({ mimeType, base64Data });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Analyzes a meal image using Google Gemini 2.5 Flash Multimodal Vision
 */
export async function analyzeMealWithGemini(
  imageSource: File | { mimeType: string; base64Data: string },
  apiKey: string = DEFAULT_GEMINI_KEY
): Promise<MealAnalysis> {
  let mimeType: string;
  let base64Data: string;

  if (imageSource instanceof File) {
    const converted = await fileToBase64(imageSource);
    mimeType = converted.mimeType;
    base64Data = converted.base64Data;
  } else {
    mimeType = imageSource.mimeType;
    base64Data = imageSource.base64Data;
  }

  const prompt = `You are NutriLens AI, an advanced computer vision nutritionist.
Analyze this meal photo in detail. Return only valid JSON adhering strictly to this schema:
{
  "mealName": "Concise name of the meal or main food item",
  "calories": integer estimated calories (kcal),
  "carbs": integer carbohydrates in grams,
  "protein": integer protein in grams,
  "fat": integer fats in grams,
  "fiber": integer dietary fiber in grams,
  "sugars": integer sugars in grams,
  "freshnessScore": integer from 50 to 99 representing food freshness and quality percentage,
  "qualityBadge": "Looks Fresh XX%" or similar short label,
  "insight": "1-2 sentences of actionable nutritional wisdom or dietitian insight about this meal",
  "minerals": [
    { "name": "Sodium", "value": "e.g. 320mg", "percent": integer 0-100 of RDA },
    { "name": "Potassium", "value": "e.g. 480mg", "percent": integer 0-100 of RDA },
    { "name": "Iron", "value": "e.g. 15%", "percent": integer 0-100 of RDA },
    { "name": "Vitamin C", "value": "e.g. 25%", "percent": integer 0-100 of RDA }
  ],
  "detections": [
    {
      "label": "Identified item with % confidence (e.g. Avocado Toast · 97%)",
      "confidence": float 0.0 - 1.0,
      "position": { "top": "string percentage", "left": "string percentage" }
    }
  ]
}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("No response generated from Gemini Vision.");
  }

  // Parse JSON response safely
  try {
    const parsed: MealAnalysis = JSON.parse(rawText);
    return parsed;
  } catch (err) {
    console.error("Failed to parse Gemini response:", rawText, err);
    throw new Error("Invalid response format from Gemini AI.");
  }
}
