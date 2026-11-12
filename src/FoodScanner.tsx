import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { auth, db, storage } from "./firebase"

type NutrientKey =
  | "calories"
  | "carbohydrates"
  | "protein"
  | "fat"
  | "fiber"
  | "sugar"
  | "sodium"
  | "potassium"
  | "calcium"
  | "iron"
  | "magnesium"
  | "vitaminA"
  | "vitaminC"
  | "vitaminD"
  | "vitaminB12"

type NutritionValue = { value: number; unit: string } | null
type Nutrition = Record<NutrientKey, NutritionValue>

interface FoodItem {
  name: string
  estimatedWeightG: number
  confidence: number
  visibleIngredients: string[]
  uncertainIngredients: string[]
  nutritionSource: string | null
  nutritionMatch: { description: string; fdcId: number; dataType: string } | null
  nutritionPer100g: Nutrition | null
  nutrition: Nutrition | null
}

interface MealAnalysis {
  mealName: string
  items: FoodItem[]
  notes: string
  freshness: {
    label: "Looks Fresh" | "Needs Attention" | "Visible Spoilage Signs"
    observations: string[]
    uncertain: true
  } | null
  totals: Nutrition
  nutritionWarning: string | null
}

interface SavedMeal extends MealAnalysis {
  id: string
  uid: string
  imageUrl: string
  imagePath: string
  scannedAt: Date
}

const NUTRIENTS: { key: NutrientKey; label: string }[] = [
  { key: "calories", label: "Calories" },
  { key: "carbohydrates", label: "Carbohydrates" },
  { key: "protein", label: "Protein" },
  { key: "fat", label: "Total fat" },
  { key: "fiber", label: "Dietary fibre" },
  { key: "sugar", label: "Sugar" },
  { key: "sodium", label: "Sodium" },
  { key: "potassium", label: "Potassium" },
  { key: "calcium", label: "Calcium" },
  { key: "iron", label: "Iron" },
  { key: "magnesium", label: "Magnesium" },
  { key: "vitaminA", label: "Vitamin A" },
  { key: "vitaminC", label: "Vitamin C" },
  { key: "vitaminD", label: "Vitamin D" },
  { key: "vitaminB12", label: "Vitamin B12" },
]

const DAY_SUMMARY: { key: NutrientKey; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbohydrates", label: "Carbohydrates", unit: "g" },
  { key: "fat", label: "Total fats", unit: "g" },
  { key: "fiber", label: "Dietary fibre", unit: "g" },
]

const MAX_FILE_BYTES = 3 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function localDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function nutritionValue(value: NutritionValue) {
  if (!value || !Number.isFinite(value.value)) return "N/A"
  const amount = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value.value)
  return `${amount} ${value.unit}`
}

function scaleNutrition(per100g: Nutrition | null, weight: number): Nutrition | null {
  if (!per100g) return null
  return Object.fromEntries(
    NUTRIENTS.map(({ key }) => {
      const entry = per100g[key]
      return [
        key,
        entry
          ? {
              value: Math.round((entry.value * weight) / 100 * 100) / 100,
              unit: entry.unit,
            }
          : null,
      ]
    }),
  ) as Nutrition
}

function sumNutrition(items: FoodItem[]): Nutrition {
  return Object.fromEntries(
    NUTRIENTS.map(({ key }) => {
      const values = items.map((item) => item.nutrition?.[key])
      if (values.length === 0 || values.some((value) => !value)) return [key, null]
      const first = values[0]!
      return [
        key,
        {
          value: Math.round(values.reduce((sum, value) => sum + value!.value, 0) * 100) / 100,
          unit: first.unit,
        },
      ]
    }),
  ) as Nutrition
}

function getErrorMessage(message: string, status: number) {
  if (status === 401) return "Your session expired. Sign in again to scan a meal."
  if (status === 413) return "This image is too large. Choose an image smaller than 3 MB."
  if (status === 429) return "The AI service is busy. Please wait a moment and try again."
  if (status === 503) return message
  if (status === 422) return message
  if (status >= 500) return message || "The scanner backend is temporarily unavailable. Check the deployment logs and try again."
  return message || "Please choose a valid food photo and try again."
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected image could not be read."))
        return
      }
      resolve(reader.result.slice(reader.result.indexOf(",") + 1))
    }
    reader.onerror = () => reject(new Error("The selected image could not be read."))
    reader.readAsDataURL(file)
  })
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`scanner-card ${className}`}>{children}</section>
}

function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="scanner-page-title">
      <div>
        <span className="scanner-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

export default function FoodScanner({
  view,
  onViewChange,
}: {
  view: "dashboard" | "scanner" | "history" | "analytics"
  onViewChange: (view: "scanner" | "history" | "analytics") => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null)
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({})
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [history, setHistory] = useState<SavedMeal[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => localDateValue(new Date()))
  const [selectedMeal, setSelectedMeal] = useState<SavedMeal | null>(null)
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const calculatedItems = useMemo(() => {
    if (!analysis) return []
    return analysis.items.map((item, index) => {
      const draft = weightDrafts[String(index)]
      const weight = draft !== undefined && Number(draft) >= 1 && Number(draft) <= 3000
        ? Math.round(Number(draft))
        : item.estimatedWeightG
      return {
        ...item,
        estimatedWeightG: weight,
        nutrition: scaleNutrition(item.nutritionPer100g, weight),
      }
    })
  }, [analysis, weightDrafts])

  const calculatedTotals = useMemo(() => sumNutrition(calculatedItems), [calculatedItems])
  const hasInvalidWeights = Object.values(weightDrafts).some((value) => {
    const weight = Number(value)
    return !Number.isFinite(weight) || weight < 1 || weight > 3000
  })
  const selectedDayMeals = useMemo(
    () => history.filter((meal) => localDateValue(meal.scannedAt) === selectedDate),
    [history, selectedDate],
  )
  const dailyTotals = useMemo(() => sumNutrition(selectedDayMeals.flatMap((meal) => meal.items)), [selectedDayMeals])

  useEffect(() => {
    const user = auth.currentUser
    if (!user) {
      setHistory([])
      setHistoryLoading(false)
      return
    }
    setHistoryLoading(true)
    const mealsQuery = query(collection(db, "users", user.uid, "meals"), orderBy("scannedAt", "desc"))
    return onSnapshot(
      mealsQuery,
      (snapshot) => {
        const meals = snapshot.docs.map((mealDoc) => {
          const data = mealDoc.data()
          return {
            ...data,
            id: mealDoc.id,
            scannedAt: data.scannedAt?.toDate?.() ?? new Date(),
          } as SavedMeal
        })
        setHistory(meals)
        setHistoryLoading(false)
      },
      (error) => {
        console.error("Could not load meal history:", error)
        setMessage("Meal history could not be loaded. Check your Firebase Firestore rules.")
        setHistoryLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const chooseFile = (selected?: File) => {
    if (!selected) return
    if (!ALLOWED_TYPES.has(selected.type)) {
      setMessage("Unsupported file format. Choose a JPG, JPEG, PNG, or WEBP image.")
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setMessage("Images must be smaller than 3 MB.")
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setAnalysis(null)
    setWeightDrafts({})
    setMessage("")
  }

  const analyze = async () => {
    if (!file) {
      setMessage("Choose or capture a food photo before analysing.")
      return
    }
    const user = auth.currentUser
    if (!user) {
      setMessage("Please sign in again before analysing a meal.")
      return
    }
    setScanning(true)
    setMessage("")
    setAnalysis(null)
    try {
      const imageBase64 = await fileToBase64(file)
      const token = await user.getIdToken()
      const response = await fetch("/api/scanner/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mimeType: file.type, imageBase64 }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(getErrorMessage(payload.error, response.status))
      const result = payload as MealAnalysis
      setAnalysis(result)
      if (result.nutritionWarning) setMessage(result.nutritionWarning)
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? "Network error: we couldn’t reach the scanner. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "The analysis failed. Please try again.",
      )
    } finally {
      setScanning(false)
    }
  }

  const saveMeal = async () => {
    const user = auth.currentUser
    if (!user || !analysis || !file) {
      setMessage("Sign in and analyse a meal before saving it.")
      return
    }
    if (hasInvalidWeights) {
      setMessage("Each portion must be between 1 and 3000 grams before the meal can be saved.")
      return
    }
    setSaving(true)
    setMessage("")
    let uploadedPath = ""
    try {
      const mealRef = doc(collection(db, "users", user.uid, "meals"))
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
      uploadedPath = `users/${user.uid}/meals/${mealRef.id}.${extension}`
      const imageRef = ref(storage, uploadedPath)
      await uploadBytes(imageRef, file, { contentType: file.type })
      const imageUrl = await getDownloadURL(imageRef)
      await setDoc(mealRef, {
        ...analysis,
        items: calculatedItems,
        totals: calculatedTotals,
        uid: user.uid,
        imageUrl,
        imagePath: uploadedPath,
        scannedAt: serverTimestamp(),
      })
      setMessage("Meal saved to your history.")
      onViewChange("history")
    } catch (error) {
      if (uploadedPath) {
        try {
          await deleteObject(ref(storage, uploadedPath))
        } catch (cleanupError) {
          console.error("Could not remove an image after a failed meal save:", cleanupError)
        }
      }
      console.error("Could not save meal:", error)
      setMessage("Couldn’t save this meal. Check your Firebase Storage and Firestore rules.")
    } finally {
      setSaving(false)
    }
  }

  const deleteMeal = async (meal: SavedMeal) => {
    const user = auth.currentUser
    if (!user || meal.uid !== user.uid) {
      setMessage("You can only delete meals from your own account.")
      return
    }
    setDeletingMealId(meal.id)
    setMessage("")
    try {
      if (meal.imagePath) {
        try {
          await deleteObject(ref(storage, meal.imagePath))
        } catch (error) {
          if ((error as { code?: string }).code !== "storage/object-not-found") throw error
        }
      }
      await deleteDoc(doc(db, "users", user.uid, "meals", meal.id))
      if (selectedMeal?.id === meal.id) setSelectedMeal(null)
    } catch (error) {
      console.error("Could not delete meal:", error)
      setMessage("Couldn’t delete this scan. Check your Firebase rules and try again.")
    } finally {
      setDeletingMealId(null)
    }
  }

  const renderDailySummary = () => (
    <div className="scanner-daily-grid">
      {DAY_SUMMARY.map(({ key, label }) => (
        <div className="scanner-daily-stat" key={key}>
          <span>{label}</span>
          <strong>{nutritionValue(dailyTotals[key])}</strong>
        </div>
      ))}
      <div className="scanner-daily-stat">
        <span>Meals scanned</span>
        <strong>{selectedDayMeals.length}</strong>
      </div>
    </div>
  )

  if (view === "history" || view === "analytics") {
    return (
      <div className="scanner-page">
        <PageTitle
          eyebrow={view === "analytics" ? "Daily nutrition summary" : "Your meal journal"}
          title={view === "analytics" ? "Nutrition by day" : "Meal history"}
          description="Your saved scans and nutrient totals, calculated from available database matches."
          action={
            <button className="scanner-secondary-button" onClick={() => onViewChange("scanner")}>
              + Scan a meal
            </button>
          }
        />
        <Card className="scanner-history-card">
          <label className="scanner-date-select">
            <span>Choose a date</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          {renderDailySummary()}
          {message && <div className="scanner-inline-message">{message}</div>}
        </Card>

        <div className="scanner-history-heading">
          <div>
            <h2>{view === "analytics" ? "Scans for this date" : "Saved meal reports"}</h2>
            <p>{selectedDayMeals.length} {selectedDayMeals.length === 1 ? "meal" : "meals"} · {selectedDate}</p>
          </div>
          {selectedMeal && (
            <button className="scanner-text-button" onClick={() => setSelectedMeal(null)}>
              Close report
            </button>
          )}
        </div>

        {selectedMeal && (
          <Card className="scanner-report-card">
            <div className="scanner-report-head">
              <img src={selectedMeal.imageUrl} alt={`Saved photo of ${selectedMeal.mealName}`} />
              <div>
                <span className="scanner-eyebrow">Saved report</span>
                <h3>{selectedMeal.mealName}</h3>
                <p>{selectedMeal.scannedAt.toLocaleString()}</p>
              </div>
            </div>
            <div className="scanner-food-list">
              {selectedMeal.items.map((item, index) => (
                <div className="scanner-food-row" key={`${item.name}-${index}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.estimatedWeightG} g · {Math.round(item.confidence * 100)}% visual confidence</span>
                    {item.visibleIngredients?.length > 0 && <small>Visible ingredients: {item.visibleIngredients.join(", ")}</small>}
                    <small>{item.nutritionMatch ? `${item.nutritionSource}: ${item.nutritionMatch.description}` : "No database match"}</small>
                    <details className="scanner-item-details">
                      <summary>View nutrient breakdown</summary>
                      <div>{NUTRIENTS.map(({ key, label }) => <span key={key}>{label}: {nutritionValue(item.nutrition?.[key] ?? null)}</span>)}</div>
                    </details>
                  </div>
                  <strong>{nutritionValue(item.nutrition?.calories ?? null)}</strong>
                </div>
              ))}
            </div>
            <div className="scanner-total-row">
              <span>Total meal nutrition</span>
              <strong>{nutritionValue(selectedMeal.totals.calories)}</strong>
            </div>
          </Card>
        )}

        {historyLoading ? (
          <div className="scanner-empty-state"><span className="scanner-spinner" /> Loading your meal history…</div>
        ) : selectedDayMeals.length === 0 ? (
          <div className="scanner-empty-state">No saved meals for this date yet.</div>
        ) : (
          <div className="scanner-history-list">
            {selectedDayMeals.map((meal) => (
              <Card className="scanner-history-item" key={meal.id}>
                <button className="scanner-history-open" onClick={() => setSelectedMeal(meal)}>
                  <img src={meal.imageUrl} alt="" />
                  <span>
                    <strong>{meal.mealName}</strong>
                    <small>{meal.scannedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {meal.items.length} detected items</small>
                  </span>
                  <b>{nutritionValue(meal.totals.calories)}</b>
                </button>
                <button
                  className="scanner-delete-button"
                  aria-label={`Delete ${meal.mealName}`}
                  disabled={deletingMealId === meal.id}
                  onClick={() => deleteMeal(meal)}
                >
                  {deletingMealId === meal.id ? "Deleting…" : "Delete"}
                </button>
              </Card>
            ))}
          </div>
        )}
        <p className="scanner-history-disclaimer">Daily totals include saved meals only. No personal nutrition targets are configured.</p>
      </div>
    )
  }

  return (
    <div className="scanner-page">
      <PageTitle
        eyebrow="NutriLens AI · Food intelligence"
        title="What’s on your plate?"
        description="Identify visible foods, estimate portions, and match their nutrients against a real food database."
        action={
          <button className="scanner-secondary-button" onClick={() => onViewChange("history")}>
            View meal history <span aria-hidden="true">→</span>
          </button>
        }
      />

      <div className="scanner-workspace">
        <Card className="scanner-upload-card">
          <div className="scanner-card-heading">
            <div>
              <span className="scanner-step-tag">01 · Image</span>
              <h2>Start with a meal photo</h2>
              <p>Clear photos from above help the AI identify individual foods.</p>
            </div>
            {file && (
              <button
                className="scanner-text-button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl)
                  setFile(null)
                  setPreviewUrl("")
                  setAnalysis(null)
                  setWeightDrafts({})
                  setMessage("")
                }}
              >
                Remove photo
              </button>
            )}
          </div>

          <div className={`scanner-preview ${previewUrl ? "has-image" : ""}`}>
            {previewUrl ? (
              <img src={previewUrl} alt="Selected meal ready for analysis" />
            ) : (
              <div className="scanner-placeholder">
                <span className="scanner-placeholder-icon">⌗</span>
                <strong>Your meal photo appears here</strong>
                <span>JPG, PNG or WEBP · up to 3 MB</span>
              </div>
            )}
            {scanning && (
              <div className="scanner-loading-overlay">
                <span className="scanner-spinner" />
                <strong>Looking closely at your meal</strong>
                <small>Identifying foods and checking nutrition records…</small>
              </div>
            )}
          </div>

          <div className="scanner-upload-actions">
            <button className="scanner-secondary-button" onClick={() => galleryRef.current?.click()}>
              <span aria-hidden="true">↑</span> Choose a photo
            </button>
            <button className="scanner-secondary-button" onClick={() => cameraRef.current?.click()}>
              <span aria-hidden="true">◎</span> Take a photo
            </button>
            <input
              ref={galleryRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                chooseFile(event.target.files?.[0])
                event.currentTarget.value = ""
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              hidden
              onChange={(event) => {
                chooseFile(event.target.files?.[0])
                event.currentTarget.value = ""
              }}
            />
          </div>

          {message && <div className={`scanner-inline-message ${message.includes("saved") ? "success" : ""}`}>{message}</div>}

          <button className="scanner-analyze-button" onClick={analyze} disabled={!file || scanning}>
            {scanning ? <><span className="scanner-spinner" /> Analysing your meal…</> : "Analyse my meal"}
          </button>
          <p className="scanner-privacy-note">Photos are analysed by the secure backend and saved only when you choose Save meal.</p>
        </Card>

        <Card className="scanner-result-card">
          <div className="scanner-card-heading">
            <div>
              <span className="scanner-step-tag">02 · Nutrition</span>
              <h2>{analysis?.mealName || "Your nutrition report"}</h2>
              <p>{analysis ? "Food identification and nutrition lookup are kept separate." : "Your report will appear after a photo is analysed."}</p>
            </div>
          </div>

          {!analysis ? (
            <div className="scanner-result-placeholder">
              <span>✳</span>
              <p>Recognised foods, actual database nutrients, and portion estimates will appear here.</p>
            </div>
          ) : (
            <>
              <div className="scanner-total-calories">
                <div>
                  <span>Total meal calories</span>
                  <strong>{nutritionValue(calculatedTotals.calories)}</strong>
                </div>
                <span className="scanner-source-pill">USDA FoodData Central</span>
              </div>

              <div className="scanner-nutrients">
                {NUTRIENTS.map(({ key, label }) => (
                  <div className="scanner-nutrient" key={key}>
                    <span>{label}</span>
                    <strong>{nutritionValue(calculatedTotals[key])}</strong>
                  </div>
                ))}
              </div>

              {analysis.nutritionWarning && <div className="scanner-inline-message">{analysis.nutritionWarning}</div>}

              <div className="scanner-food-heading">
                <h3>Detected foods</h3>
                <span>Adjust portion to update the report</span>
              </div>
              <div className="scanner-food-list">
                {calculatedItems.map((item, index) => (
                  <div className="scanner-food-row" key={`${item.name}-${index}`}>
                    <div className="scanner-food-info">
                      <strong>{item.name}</strong>
                      <span>{Math.round(item.confidence * 100)}% visual confidence</span>
                      {item.visibleIngredients?.length > 0 && (
                        <small>Visible ingredients: {item.visibleIngredients.join(", ")}</small>
                      )}
                      {item.uncertainIngredients.length > 0 && (
                        <small>Uncertain visible ingredients: {item.uncertainIngredients.join(", ")}</small>
                      )}
                      {item.nutritionMatch ? (
                        <small>{item.nutritionSource}: {item.nutritionMatch.description}</small>
                      ) : (
                        <small className="scanner-unmatched">No matching USDA record; nutrients are N/A.</small>
                      )}
                      <details className="scanner-item-details">
                        <summary>View nutrient breakdown</summary>
                        <div>{NUTRIENTS.map(({ key, label }) => <span key={key}>{label}: {nutritionValue(item.nutrition?.[key] ?? null)}</span>)}</div>
                      </details>
                    </div>
                    <div className="scanner-portion-control">
                      <label>
                        <input
                          type="number"
                          min="1"
                          max="3000"
                          value={weightDrafts[String(index)] ?? String(item.estimatedWeightG)}
                          onChange={(event) => {
                            setWeightDrafts((previous) => ({ ...previous, [String(index)]: event.target.value }))
                          }}
                          aria-label={`${item.name} estimated weight in grams`}
                        />
                        <span>g</span>
                      </label>
                      <strong>{nutritionValue(item.nutrition?.calories ?? null)}</strong>
                      {weightDrafts[String(index)] !== undefined && (Number(weightDrafts[String(index)]) < 1 || Number(weightDrafts[String(index)]) > 3000 || !Number.isFinite(Number(weightDrafts[String(index)]))) && (
                        <small className="scanner-weight-error">1–3000 g</small>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="scanner-analysis-note">{analysis.notes} Nutrition is sourced from matching USDA records; any missing value is shown as N/A.</p>

              <div className="scanner-freshness">
                <div>
                  <span className="scanner-step-tag">Visual freshness · separate assessment</span>
                  <strong>{analysis.freshness?.label || "Visual assessment unavailable"}</strong>
                  <small>{analysis.freshness?.observations.length ? analysis.freshness.observations.join(" · ") : "No reliable visual observations were returned."}</small>
                </div>
                <p>Appearance alone cannot establish food safety. Use your judgment; do not rely on this visual estimate.</p>
              </div>

              <button className="scanner-analyze-button scanner-save-button" onClick={saveMeal} disabled={saving || hasInvalidWeights}>
                {saving ? <><span className="scanner-spinner" /> Saving meal…</> : "Save meal to history"}
              </button>
            </>
          )}
        </Card>
      </div>

      {analysis && (
        <Card className="scanner-result-summary">
          <div className="scanner-summary-heading">
            <div>
              <span className="scanner-step-tag">03 · Daily intake</span>
              <h2>Saved meal totals</h2>
            </div>
            <button className="scanner-text-button" onClick={() => onViewChange("analytics")}>View daily summary →</button>
          </div>
          <div className="scanner-daily-grid">
            {DAY_SUMMARY.map(({ key, label }) => (
              <div className="scanner-daily-stat" key={key}>
                <span>{label} · this meal</span>
                <strong>{nutritionValue(calculatedTotals[key])}</strong>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
