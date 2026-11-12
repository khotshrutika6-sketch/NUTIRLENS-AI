import {
  attachNutrition,
  authenticate,
  identifyFood,
  methodNotAllowed,
  readBody,
  requireImage,
  scaleNutrition,
  send,
} from "../../server/scanner.js";

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "POST")) return;
  try {
    await authenticate(req);
    const body = await readBody(req);
    const image = requireImage(body);
    const detection = await identifyFood(image);
    if (detection.items.length === 0) {
      return send(res, 422, { code: "no_food_detected", error: "No food could be identified in this image. Try a clear photo of the plate." });
    }

    const nutrition = await attachNutrition(detection.items);
    const items = nutrition.items.map((item) => ({
      ...item,
      nutrition: scaleNutrition(item.nutritionPer100g, item.estimatedWeightG),
    }));
    return send(res, 200, {
      ...detection,
      items,
      totals: nutrition.totals,
      nutritionWarning: nutrition.lookupError
        ? "Some FoodData Central lookups were unavailable; affected nutrients are shown as N/A."
        : null,
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 502;
    return send(res, status, { code: status === 401 ? "unauthorized" : "analysis_failed", error: error.message || "Unable to analyze this meal right now." });
  }
};
