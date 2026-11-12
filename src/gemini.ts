import { auth } from "./firebase"

export interface FoodDetection {
  label: string
  confidence: number
  position?: { top?: string; left?: string; right?: string; bottom?: string }
}

export interface MealAnalysis {
  mealName: string
  calories: number | null
  carbs: number | null
  protein: number | null
  fat: number | null
  fiber: number | null
  sugars: number | null
  freshnessScore: number | null
  qualityBadge: string
  insight: string
  minerals: Array<{ name: string; value: string; percent?: number }>
  detections: FoodDetection[]
}

export const DEFAULT_GEMINI_KEY = ""
export const GEMINI_MODEL = "gemini-2.5-flash"

export async function fileToBase64(file: File): Promise<{ mimeType: string; base64Data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected image could not be read."))
        return
      }
      resolve({
        mimeType: file.type,
        base64Data: reader.result.slice(reader.result.indexOf(",") + 1),
      })
    }
    reader.onerror = () => reject(new Error("The selected image could not be read."))
    reader.readAsDataURL(file)
  })
}

export async function analyzeMealWithGemini(
  imageSource: File | { mimeType: string; base64Data: string },
  _legacyApiKey?: string,
): Promise<MealAnalysis> {
  const user = auth.currentUser
  if (!user) throw new Error("Please sign in before analysing a meal.")

  const image = imageSource instanceof File ? await fileToBase64(imageSource) : imageSource
  const token = await user.getIdToken()
  const response = await fetch("/api/scanner/analyze", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mimeType: image.mimeType, imageBase64: image.base64Data }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Unable to analyze this meal.")

  const totals = result.totals || {}
  const amount = (key: string) => (Number.isFinite(totals[key]?.value) ? totals[key].value : null)
  return {
    mealName: result.mealName,
    calories: amount("calories"),
    carbs: amount("carbohydrates"),
    protein: amount("protein"),
    fat: amount("fat"),
    fiber: amount("fiber"),
    sugars: amount("sugar"),
    freshnessScore: null,
    qualityBadge: result.freshness?.label || "Visual appearance only",
    insight: result.notes || "Food identification and nutrition lookup are separate.",
    minerals: ["sodium", "potassium", "calcium", "iron", "magnesium", "vitaminA", "vitaminC", "vitaminD", "vitaminB12"]
      .map((key) => ({ name: key, value: amount(key) === null ? "N/A" : `${amount(key)} ${totals[key].unit}` })),
    detections: (result.items || []).map((item: { name: string; confidence: number }) => ({
      label: item.name,
      confidence: item.confidence,
    })),
  }
}
