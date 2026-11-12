import { authenticate, calculateTotals, methodNotAllowed, scaleNutrition, send } from "../../server/scanner.js";

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "POST")) return;
  try {
    await authenticate(req);
    const body = req.body;
    if (!Array.isArray(body?.items) || body.items.length > 8) {
      return send(res, 400, { error: "Invalid food items." });
    }
    const items = body.items.map((item) => {
      const weight = Number(item.weightG);
      if (!Number.isFinite(weight) || weight < 1 || weight > 3000 || !item.nutritionPer100g) {
        throw Object.assign(new Error("Each food weight must be between 1 and 3000 grams."), { status: 400 });
      }
      return {
        ...item,
        estimatedWeightG: Math.round(weight),
        nutrition: scaleNutrition(item.nutritionPer100g, Math.round(weight)),
      };
    });
    return send(res, 200, { items, totals: calculateTotals(items) });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return send(res, status, { error: error.message || "Unable to recalculate nutrition." });
  }
};
