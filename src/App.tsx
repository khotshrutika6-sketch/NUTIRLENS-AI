import { useEffect, useMemo, useState, type ReactNode } from "react"
import { signInWithEmail, signInWithGoogle, auth } from "./firebase"
import { onAuthStateChanged } from "firebase/auth"
import {
  analyzeMealWithGemini,
  DEFAULT_GEMINI_KEY,
  type MealAnalysis,
} from "./gemini"



type Step = "auth" | "plans" | "profile" | "dashboard" | "sensor" | "scanner" | "analytics" | "history" | "settings"

type IconName = "home" | "scan" | "sensor" | "chart" | "history" | "settings" | "plus" | "camera" | "upload" | "check" | "alert" | "leaf"

const FOOD_IMAGE =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85"

function AiMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 2C0 .895 0.895 0 2 0h12c1.105 0 2 .895 2 2v12c0 1.105-.895 2-2 2H2c-1.105 0-2-.895-2-2V2Z"
        fill="#2C2C2C"
      />
      <path
        d="M9.5 8c.276 0 .501.224.495.5-.033 1.355-.196 2.586-.451 3.521-.143.521-.321.979-.54 1.318-.204.317-.532.661-1.004.661s-.799-.344-1.003-.661c-.219-.339-.397-.797-.539-1.318a10.94 10.94 0 0 1-.116-.476c-.067-.313.187-.594.507-.577.23.013.427.18.478.405.03.134.062.263.095.385.13.474.274.822.414 1.039.083.128.246.128.329 0 .14-.217.284-.565.413-1.039.228-.834.384-1.974.416-3.258.007-.276.23-.5.506-.5ZM4.454 6.342c.312-.067.594.188.578.507-.012.23-.18.428-.405.479-.134.03-.263.062-.384.095-.474.13-.822.274-1.039.414-.128.083-.128.246 0 .329.217.14.565.284 1.039.414.824.224 1.944.378 3.208.414h.056c.273.004.493.227.493.5 0 .278-.228.504-.506.5l-.069-.001c-1.324-.036-2.527-.199-3.445-.449-.521-.142-.979-.32-1.318-.539C2.345 8.801 2 8.473 2 8.001c0-.471.345-.799.662-1.003.339-.219.797-.397 1.318-.54.15-.04.309-.08.474-.116ZM8.504 6.007c1.353.033 2.583.197 3.517.451.521.143.979.321 1.318.54.317.204.662.532.662 1.003 0 .472-.345.8-.662 1.004-.339.219-.797.397-1.318.539-.15.041-.31.079-.475.115-.313.067-.594-.188-.578-.507.012-.23.18-.428.405-.478.134-.03.263-.062.385-.095.474-.129.822-.274 1.039-.414.128-.083.128-.245 0-.328-.217-.14-.565-.285-1.039-.414-.823-.224-1.944-.379-3.208-.414l-.053-.001A.504.504 0 0 1 8 6.504c0-.278.227-.504.504-.497ZM8 2c.472 0 .8.345 1.004.662.219.339.397.797.54 1.318.04.15.079.309.115.474.067.312-.189.594-.508.578a.507.507 0 0 1-.478-.405c-.03-.134-.061-.263-.094-.384-.13-.474-.275-.822-.415-1.04-.083-.128-.245-.128-.328 0-.14.218-.285.566-.414 1.04-.227.834-.383 1.973-.416 3.257A.506.506 0 0 1 6.5 8c-.276 0-.501-.224-.494-.5.032-1.354.196-2.585.451-3.52.142-.521.321-.979.539-1.318C7.201 2.345 7.528 2 8 2Z"
        fill="white"
      />
    </svg>
  )
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </>
    ),
    scan: (
      <>
        <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    sensor: (
      <>
        <rect x="5" y="4" width="14" height="16" rx="3" />
        <path d="M9 8h6M8 13c2.5-2 5.5-2 8 0M10 16c1.3-1 2.7-1 4 0" />
      </>
    ),
    chart: <path d="M3 20V10M9 20V4M15 20v-7M21 20H2" />,
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 13.5v-3l-2-.7-.5-1.2.9-1.9-2.1-2.1-1.9.9-1.2-.5-.7-2h-3l-.7 2-1.2.5-1.9-.9-2.1 2.1.9 1.9-.5 1.2-2 .7v3l2 .7.5 1.2-.9 1.9 2.1 2.1 1.9-.9 1.2.5.7 2h3l.7-2 1.2-.5 1.9.9 2.1-2.1-.9-1.9.5-1.2Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    camera: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4Z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M4 15v5h16v-5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <path d="m12 3 10 18H2Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    leaf: (
      <>
        <path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z" />
        <path d="M5 19c4-5 8-8 13-11" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand--light" : ""}`}>
      <span className="brand-mark">
        <AiMark size={30} />
        <i>
          <Icon name="leaf" size={15} />
        </i>
      </span>
      <strong>
        NutriLens <em>AI</em>
      </strong>
    </div>
  )
}

function Button({
  children,
  kind = "primary",
  onClick,
  type = "button",
}: {
  children: ReactNode
  kind?: "primary" | "outline" | "light"
  onClick?: () => void
  type?: "button" | "submit"
}) {
  return (
    <button type={type} className={`button button--${kind}`} onClick={onClick}>
      {children}
    </button>
  )
}

function Card({
  children,
  className = "",
  mint = false,
}: {
  children: ReactNode
  className?: string
  mint?: boolean
}) {
  return (
    <section className={`card ${mint ? "card--mint" : ""} ${className}`}>
      {children}
    </section>
  )
}

function FlowDots({ current }: { current: number }) {
  return (
    <div className="flow-dots" aria-label={`Step ${current} of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={n <= current ? "done" : ""}>
          {n < current ? <Icon name="check" size={12} /> : n}
        </span>
      ))}
    </div>
  )
}

function Auth({ next }: { next: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmail(email, password);
      next();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      next();
    } catch (err: any) {
      setError(err.message || 'Google sign‑in failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-copy">
        <Brand />
        <span className="eyebrow">Your food, finally fluent</span>
        <h1>
          Eat wiser.
          <br />
          Waste less.
        </h1>
        <p>
          AI food intelligence and a connected pantry, wrapped in one
          beautifully simple health journal.
        </p>
        <div className="auth-proof">
          <span>98%</span>
          <p>
            freshness detection
            <br />
            confidence
          </p>
        </div>
      </div>
      <Card className="auth-card">
        <FlowDots current={1} />
        <div className="auth-heading">
          <span className="spark">
            <AiMark size={34} />
          </span>
          <h2>Welcome to NutriLens</h2>
          <p>Sign in or create your account to begin.</p>
        </div>
        <div className="sso-grid">
          <Button kind="outline" onClick={handleGoogle}>
            <b className="google-g">G</b> Continue with Google
          </Button>
          <Button kind="outline">
            <b>●</b> Continue with Apple
          </Button>
        </div>
        <div className="or">
          <span />
          or continue with email
          <span />
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div className="form-meta">
            <label className="check-label">
              <input type="checkbox" defaultChecked /> Keep me signed in
            </label>
            <button type="button">Forgot password?</button>
          </div>
          <Button type="submit">
            Log In / Sign Up <span>→</span>
          </Button>
        </form>
        <small className="legal">
          By continuing, you agree to our Terms and Privacy Policy.
        </small>
      </Card>
    </div>
  );
}

const plans = [
  {
    name: "Free Lens",
    price: "$0",
    note: "Start your food journal",
    features: [
      "5 AI scans per day",
      "Basic calorie logging",
      "7-day meal history",
    ],
    action: "Start free",
  },
  {
    name: "Pro Lens",
    price: "$9.99",
    note: "Your complete food intelligence toolkit",
    features: [
      "Unlimited Gemini AI scans",
      "Macro & micronutrient breakdown",
      "Visual freshness detection",
      "30-day IoT history",
    ],
    action: "Subscribe & Continue",
    featured: true,
  },
  {
    name: "Family + Hardware",
    price: "$19.99",
    note: "A connected pantry for everyone",
    features: [
      "Everything in Pro",
      "Pre-configured ESP32 + DHT22",
      "Sensor kit shipped to your door",
      "Up to 5 family profiles",
    ],
    action: "Choose bundle",
  },
]

function Plans({ next, back }: { next: () => void; back: () => void }) {
  const [yearly, setYearly] = useState(true)
  return (
    <div className="flow-page">
      <FlowHeader step={2} back={back} />
      <div className="flow-title">
        <span className="eyebrow">Choose your path</span>
        <h1>Choose Your NutriLens Plan</h1>
        <p>
          Start simple or unlock the full intelligence of your food and pantry.
        </p>
      </div>
      <div className="billing">
        <button
          className={!yearly ? "active" : ""}
          onClick={() => setYearly(false)}
        >
          Monthly
        </button>
        <button
          className={yearly ? "active" : ""}
          onClick={() => setYearly(true)}
        >
          Yearly <span>Save 20% + Free IoT Kit</span>
        </button>
      </div>
      <div className="plan-grid">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            mint={plan.featured}
            className={`plan ${plan.featured ? "plan--featured" : ""}`}
          >
            {plan.featured && <div className="popular">★ Most Popular</div>}
            <h2>{plan.name}</h2>
            <p>{plan.note}</p>
            <div className="price">
              <strong>
                {yearly && plan.price !== "$0"
                  ? plan.name === "Pro Lens"
                    ? "$7.99"
                    : "$15.99"
                  : plan.price}
              </strong>
              <span>/ month</span>
            </div>
            <div className="dash" />
            <ul>
              {plan.features.map((f) => (
                <li key={f}>
                  <i>
                    <Icon name="check" size={14} />
                  </i>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              kind={plan.featured ? "primary" : "outline"}
              onClick={plan.featured ? next : undefined}
            >
              {plan.action}
            </Button>
          </Card>
        ))}
      </div>
      <button className="skip" onClick={next}>
        Decide later and continue with Free Lens →
      </button>
    </div>
  )
}

function FlowHeader({ step, back }: { step: number; back: () => void }) {
  return (
    <header className="flow-header">
      <Brand />
      <FlowDots current={step} />
      <button onClick={back}>← Back</button>
    </header>
  )
}

function Profile({ next, back }: { next: () => void; back: () => void }) {
  const [weight, setWeight] = useState(58)
  const [target, setTarget] = useState(54)
  const [goal, setGoal] = useState("Maintain Health")
  const calories = useMemo(
    () => Math.round(1750 + weight * 4.3 - (weight - target) * 18),
    [weight, target],
  )
  return (
    <div className="flow-page profile-page">
      <FlowHeader step={3} back={back} />
      <div className="flow-title">
        <span className="eyebrow">A plan shaped around you</span>
        <h1>Set Up Your Health Metrics</h1>
        <p>
          A few details help us create more useful, personal nutrition targets.
        </p>
      </div>
      <div className="onboarding-grid">
        <Card className="metrics-form">
          <div className="section-label">
            <span>01</span>
            <div>
              <h2>Body metrics</h2>
              <p>Adjust the sliders to match you.</p>
            </div>
          </div>
          <div className="slider-grid">
            <label>
              Current weight <strong>{weight} kg</strong>
              <input
                type="range"
                min="40"
                max="120"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
              />
            </label>
            <label>
              Target weight <strong>{target} kg</strong>
              <input
                type="range"
                min="40"
                max="120"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="input-grid">
            <label>
              Height (cm)
              <input type="number" defaultValue="165" />
            </label>
            <label>
              Age
              <input type="number" defaultValue="27" />
            </label>
            <label>
              Biological sex
              <select defaultValue="female">
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Prefer not to say</option>
              </select>
            </label>
          </div>
          <div className="section-label">
            <span>02</span>
            <div>
              <h2>Primary health goal</h2>
              <p>Choose what matters most right now.</p>
            </div>
          </div>
          <div className="goal-grid">
            {[
              ["🥑", "Weight Loss"],
              ["💪", "Muscle Gain"],
              ["🥗", "Maintain Health"],
              ["🍞", "Reduce Food Waste"],
            ].map(([icon, name]) => (
              <button
                key={name}
                className={goal === name ? "selected" : ""}
                onClick={() => setGoal(name)}
              >
                <b>{icon}</b>
                <span>{name}</span>
              </button>
            ))}
          </div>
          <label className="activity">
            Activity level
            <select defaultValue="moderate">
              <option value="sedentary">Sedentary</option>
              <option value="moderate">Moderately Active</option>
              <option value="very">Very Active</option>
            </select>
          </label>
        </Card>
        <Card className="target-card" mint>
          <span className="mini-badge">Your daily target</span>
          <h2>
            {calories.toLocaleString()} <small>kcal</small>
          </h2>
          <p>Calculated from your profile and goal.</p>
          <div className="macro-ring">
            <div>
              <strong>50%</strong>
              <span>Carbs</span>
            </div>
          </div>
          <div className="macro-legend">
            <span>
              <i className="carb" />
              Carbs <strong>50%</strong>
            </span>
            <span>
              <i className="protein" />
              Protein <strong>25%</strong>
            </span>
            <span>
              <i className="fat" />
              Fats <strong>25%</strong>
            </span>
          </div>
          <div className="target-note">
            <AiMark size={24} />
            <p>
              We’ll fine-tune these targets as NutriLens learns from your meals.
            </p>
          </div>
          <Button onClick={next}>Complete Setup & Launch Dashboard →</Button>
        </Card>
      </div>
    </div>
  )
}

const PRESET_MEALS = [
  {
    name: "Avocado Egg Toast",
    icon: "🥑",
    img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      mealName: "Avocado Egg Toast",
      calories: 450,
      carbs: 42,
      protein: 18,
      fat: 22,
      fiber: 8,
      sugars: 3,
      freshnessScore: 98,
      qualityBadge: "Looks Fresh 98%",
      insight: "Balanced and fiber-rich. Add berries for an extra antioxidant boost.",
      minerals: [
        { name: "Sodium", value: "320mg", percent: 64 },
        { name: "Potassium", value: "480mg", percent: 78 },
        { name: "Iron", value: "15%", percent: 45 },
        { name: "Vitamin C", value: "25%", percent: 62 },
      ],
      detections: [
        { label: "Avocado Toast · 97%", confidence: 0.97, position: { top: "28%", left: "18%" } },
        { label: "Poached Egg · 96%", confidence: 0.96, position: { bottom: "24%", right: "20%" } },
      ],
    },
  },
  {
    name: "Mediterranean Grain Bowl",
    icon: "🥗",
    img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      mealName: "Mediterranean Grain Bowl",
      calories: 485,
      carbs: 58,
      protein: 21,
      fat: 16,
      fiber: 12,
      sugars: 6,
      freshnessScore: 96,
      qualityBadge: "High Vitality 96%",
      insight: "Rich in diverse phytonutrients and prebiotic fibers that strengthen digestive health.",
      minerals: [
        { name: "Sodium", value: "410mg", percent: 52 },
        { name: "Potassium", value: "620mg", percent: 85 },
        { name: "Iron", value: "28%", percent: 72 },
        { name: "Vitamin C", value: "45%", percent: 90 },
      ],
      detections: [
        { label: "Quinoa Greens · 98%", confidence: 0.98, position: { top: "35%", left: "25%" } },
        { label: "Crispy Chickpeas · 94%", confidence: 0.94, position: { bottom: "30%", right: "22%" } },
      ],
    },
  },
  {
    name: "Wild Salmon Fillet",
    icon: "🍣",
    img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      mealName: "Wild Salmon with Asparagus",
      calories: 520,
      carbs: 12,
      protein: 44,
      fat: 31,
      fiber: 5,
      sugars: 2,
      freshnessScore: 99,
      qualityBadge: "Peak Fresh 99%",
      insight: "High in long-chain Omega-3 EPA/DHA fatty acids and premium lean protein for metabolic longevity.",
      minerals: [
        { name: "Sodium", value: "280mg", percent: 40 },
        { name: "Potassium", value: "710mg", percent: 92 },
        { name: "Iron", value: "18%", percent: 55 },
        { name: "Vitamin C", value: "35%", percent: 70 },
      ],
      detections: [
        { label: "Grilled Salmon · 99%", confidence: 0.99, position: { top: "25%", left: "30%" } },
        { label: "Tender Asparagus · 97%", confidence: 0.97, position: { bottom: "25%", left: "20%" } },
      ],
    },
  },
  {
    name: "Organic Acai Bowl",
    icon: "🍓",
    img: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      mealName: "Acai Superfood Bowl",
      calories: 360,
      carbs: 52,
      protein: 9,
      fat: 14,
      fiber: 11,
      sugars: 24,
      freshnessScore: 97,
      qualityBadge: "Antioxidant Rich 97%",
      insight: "Loaded with anthocyanins and healthy fats from seeds. Great restorative breakfast or snack.",
      minerals: [
        { name: "Sodium", value: "65mg", percent: 12 },
        { name: "Potassium", value: "390mg", percent: 60 },
        { name: "Iron", value: "14%", percent: 42 },
        { name: "Vitamin C", value: "85%", percent: 95 },
      ],
      detections: [
        { label: "Acai Puree · 98%", confidence: 0.98, position: { top: "40%", left: "30%" } },
        { label: "Fresh Blueberries · 96%", confidence: 0.96, position: { top: "20%", right: "25%" } },
      ],
    },
  },
]

interface MealLogItem {
  icon: string
  name: string
  weight: string
  calories: string
  carbs: string
  protein: string
  time: string
}

function Dashboard({
  restart,
  step,
  setStep,
  onSignOut,
}: {
  restart: () => void
  step: Step
  setStep: (s: Step) => void
  onSignOut?: () => void
}) {
  const [image, setImage] = useState(PRESET_MEALS[0].img)
  const [analysis, setAnalysis] = useState<MealAnalysis>(PRESET_MEALS[0].analysis)
  const [activePreset, setActivePreset] = useState<string>("Avocado Egg Toast")
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState("Gemini AI is analyzing your meal…")
  const [scanError, setScanError] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("NUTRILENS_GEMINI_KEY") || DEFAULT_GEMINI_KEY
  })
  const [keyInput, setKeyInput] = useState(apiKey)
  const [testResult, setTestResult] = useState<string | null>(null)

  const [mealLogs, setMealLogs] = useState<MealLogItem[]>([
    {
      icon: "🥑",
      name: "Avocado Egg Toast",
      weight: "240g",
      calories: "450",
      carbs: "42g",
      protein: "18g",
      time: "Breakfast · 8:40 AM",
    },
    {
      icon: "🥗",
      name: "Garden Power Bowl",
      weight: "310g",
      calories: "386",
      carbs: "48g",
      protein: "24g",
      time: "Lunch · 1:15 PM",
    },
    {
      icon: "🥜",
      name: "Apple & Almonds",
      weight: "130g",
      calories: "270",
      carbs: "31g",
      protein: "8g",
      time: "Snack · 4:20 PM",
    },
  ])

  // Total daily consumed calories
  const totalCaloriesConsumed = useMemo(() => {
    return mealLogs.reduce((sum, item) => sum + (parseInt(item.calories, 10) || 0), 0)
  }, [mealLogs])

  const handleSaveApiKey = () => {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    localStorage.setItem("NUTRILENS_GEMINI_KEY", trimmed)
    setApiKey(trimmed)
    setTestResult("API Key saved successfully!")
    setTimeout(() => {
      setTestResult(null)
      setShowKeyModal(false)
    }, 1200)
  }

  // Handle preset selection
  const selectPreset = (preset: (typeof PRESET_MEALS)[0]) => {
    setActivePreset(preset.name)
    setImage(preset.img)
    setAnalysis(preset.analysis)
    setScanError(null)
  }

  // Handle file upload or camera photo
  const fileChange = async (file?: File) => {
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setImage(previewUrl)
    setActivePreset("")
    setScanning(true)
    setScanError(null)
    setScanStatus("Analyzing photo with Gemini 2.5 Flash Vision…")

    try {
      const result = await analyzeMealWithGemini(file, apiKey)
      setAnalysis(result)

      // Automatically append to today's meal log
      const now = new Date()
      const timeStr = `Scanned · ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      const newItem: MealLogItem = {
        icon: "🍽️",
        name: result.mealName,
        weight: "280g",
        calories: `${result.calories}`,
        carbs: `${result.carbs}g`,
        protein: `${result.protein}g`,
        time: timeStr,
      }
      setMealLogs((prev) => [newItem, ...prev])
    } catch (err: any) {
      console.error("Gemini Scan Error:", err)
      setScanError(err.message || "Failed to scan meal with Gemini AI. Please check your API key.")
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="app">
      {/* Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="api-modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="api-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AiMark size={24} />
                <h3 style={{ font: "700 18px var(--display)", margin: 0 }}>Gemini Vision API Key</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                style={{ border: 0, background: "transparent", fontSize: "16px", cursor: "pointer", fontWeight: 800 }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
              Your meal photo scanner uses Google's <strong>Gemini 2.5 Flash</strong> vision model for calorie estimation, nutrient breakdown, and freshness analysis.
            </p>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
              Google Gemini API Key
              <input
                className="api-input"
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter AQ... or AIza... key"
              />
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "14px 0 0" }}>
              <span style={{ fontSize: "10px", color: "#166534", background: "#dcfce7", padding: "4px 8px", borderRadius: "99px", fontWeight: 800 }}>
                ● Active (50 models ready)
              </span>
              <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "auto" }}>
                Model: gemini-2.5-flash
              </span>
            </div>
            {testResult && (
              <p style={{ fontSize: "11px", color: "#166534", fontWeight: 700, margin: "10px 0 0" }}>{testResult}</p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <Button kind="outline" onClick={() => setShowKeyModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveApiKey}>
                Save Key
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar */}
      <aside className="sidebar">
        <Brand light />
        <nav>
          {([
            ["home", "Dashboard", "dashboard"],
            ["scan", "AI Scanner", "scanner"],
            ["sensor", "IoT Telemetry", "sensor"],
            ["chart", "Analytics", "analytics"],
            ["history", "Meal History", "history"],
            ["settings", "Settings", "settings"],
          ] as [IconName, string, Step][]).map(([icon, label, target]) => (
            <button
              key={label}
              className={step === target ? "active" : ""}
              onClick={() => setStep(target)}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <Icon name="leaf" />
          <strong>Little wins add up.</strong>
          <p>You saved 1.4 kg of food this month.</p>
        </div>
      </aside>

      <div className="app-main">
        {/* Topbar */}
        <header className="topbar">
          <div className="top-pills">
            <button
              className={step === "dashboard" || step === "scanner" ? "active" : ""}
              onClick={() => setStep("scanner")}
            >
              Scanner
            </button>
            <button
              className={step === "sensor" ? "active" : ""}
              onClick={() => setStep("sensor")}
            >
              IoT Monitor
            </button>
            <button
              className={step === "analytics" ? "active" : ""}
              onClick={() => setStep("analytics")}
            >
              Analytics
            </button>
          </div>
          <div className="top-actions">
            <button
              className="gemini-pill gemini-pill-btn"
              onClick={() => setShowKeyModal(true)}
              title="Click to manage Gemini API Key"
            >
              <AiMark size={20} />
              <span>Gemini 2.5 Flash</span>
              <i />
            </button>
            <div className="profile">
              <span>SK</span>
              <div>
                <strong>Shrutika Khot</strong>
                <small>Pro Member</small>
              </div>
            </div>
            {onSignOut && (
              <Button kind="light" onClick={onSignOut}>
                Sign Out
              </Button>
            )}
          </div>
        </header>

        {/* View Switcher based on `step` */}
        {step === "sensor" ? (
          <IoTTelemetry restart={() => setStep("dashboard")} />
        ) : step === "analytics" ? (
          <AnalyticsView totalCalories={totalCaloriesConsumed} restart={() => setStep("dashboard")} />
        ) : step === "history" ? (
          <MealHistoryView mealLogs={mealLogs} restart={() => setStep("dashboard")} />
        ) : step === "settings" ? (
          <SettingsView
            apiKey={apiKey}
            onOpenKeyModal={() => setShowKeyModal(true)}
            onSignOut={onSignOut}
            restart={() => setStep("dashboard")}
          />
        ) : (
          /* Default: Dashboard / Scanner */
          <main className="dashboard">
            <div className="dashboard-title">
              <div>
                <span className="eyebrow">Gemini Vision Lab</span>
                <h1>What’s on your plate?</h1>
              </div>
              <div
                className="gemini-pill gemini-pill-btn"
                onClick={() => setShowKeyModal(true)}
                title="Gemini API Key active"
              >
                <AiMark size={23} />
                <span>Powered by Gemini 2.5 Flash</span>
                <i /> Ready
              </div>
            </div>

            {/* Preset Test Meals Selector */}
            <div className="preset-bar">
              <span>Instant Test Meals:</span>
              {PRESET_MEALS.map((p) => (
                <button
                  key={p.name}
                  className={`preset-chip ${activePreset === p.name ? "active" : ""}`}
                  onClick={() => selectPreset(p)}
                >
                  <span>{p.icon}</span> {p.name}
                </button>
              ))}
            </div>

            {scanError && (
              <div className="scanner-error">
                <span>⚠️ {scanError}</span>
                <button
                  onClick={() => setShowKeyModal(true)}
                  style={{ border: 0, background: "#fff", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontWeight: 700 }}
                >
                  Configure API Key
                </button>
              </div>
            )}

            <div className="scanner-layout">
              {/* Vision Card with Preview */}
              <Card className="vision-card">
                <div className="vision-head">
                  <div>
                    <h2>Live meal analysis</h2>
                    <p>Upload a photo or capture with camera for instant AI nutritional breakdown.</p>
                  </div>
                  <span className="fresh">● {analysis.qualityBadge || "Looks Fresh 98%"}</span>
                </div>
                <div className="food-preview">
                  {image ? (
                    <img src={image} alt={analysis.mealName || "Meal ready for AI analysis"} />
                  ) : (
                    <div className="empty-preview">
                      <Icon name="camera" size={38} />
                      <p>Your meal preview will appear here</p>
                    </div>
                  )}

                  {/* Dynamic Bounding Detection Tags */}
                  {analysis.detections &&
                    analysis.detections.map((det, idx) => {
                      const pos = det.position || {
                        top: idx === 0 ? "28%" : "65%",
                        left: idx === 0 ? "18%" : "60%",
                      }
                      return (
                        <span
                          key={det.label}
                          className={`box ${idx === 1 ? "box--egg" : "box--toast"}`}
                          style={{
                            top: pos.top,
                            left: pos.left,
                            right: pos.right,
                            bottom: pos.bottom,
                          }}
                        >
                          {det.label}
                        </span>
                      )
                    })}

                  {/* Scanning Overlay */}
                  {scanning && (
                    <div className="scanning">
                      <AiMark size={44} />
                      <strong>Gemini 2.5 Flash is analyzing your plate…</strong>
                      <span className="scanner-status">{scanStatus}</span>
                    </div>
                  )}
                </div>

                {/* Dropzone with Camera / File Upload */}
                <label className="dropzone">
                  <Icon name="upload" />
                  <div>
                    <strong>Upload meal photo</strong>
                    <span>Click to choose file or snap photo with camera</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => fileChange(e.target.files?.[0])}
                  />
                  <Button kind="outline">
                    <Icon name="camera" size={17} /> Choose image
                  </Button>
                </label>
              </Card>

              {/* Nutrition Card with Live AI Metrics */}
              <Card className="nutrition-card" mint>
                <div className="nutrition-head">
                  <div>
                    <span className="mini-badge">Gemini Estimate</span>
                    <h2>{analysis.mealName}</h2>
                  </div>
                  <strong>
                    {analysis.calories} <small>kcal</small>
                  </strong>
                </div>
                <div className="macro-stats">
                  <div>
                    <span>Carbohydrates</span>
                    <strong>{analysis.carbs}g</strong>
                    <small>Fiber {analysis.fiber || 6}g · Sugars {analysis.sugars || 3}g</small>
                  </div>
                  <div>
                    <span>Protein</span>
                    <strong>{analysis.protein}g</strong>
                    <small>High biological value</small>
                  </div>
                  <div>
                    <span>Fats</span>
                    <strong>{analysis.fat}g</strong>
                    <small>Healthy lipids</small>
                  </div>
                </div>

                <h3>Key minerals & vitamins</h3>
                {(analysis.minerals && analysis.minerals.length > 0
                  ? analysis.minerals
                  : [
                      { name: "Sodium", value: "320mg", percent: 64 },
                      { name: "Potassium", value: "480mg", percent: 78 },
                      { name: "Iron", value: "15%", percent: 45 },
                      { name: "Vitamin C", value: "25%", percent: 62 },
                    ]
                ).map((mineral) => (
                  <div className="mineral" key={mineral.name}>
                    <span>{mineral.name}</span>
                    <div>
                      <i style={{ width: `${mineral.percent}%` }} />
                    </div>
                    <strong>{mineral.value}</strong>
                  </div>
                ))}

                <div className="ai-note">
                  <AiMark size={24} />
                  <p>
                    <strong>Gemini insight:</strong> {analysis.insight}
                  </p>
                </div>
              </Card>
            </div>

            {/* IoT Pantry Notification */}
            <div className="iot-banner">
              <span>
                <Icon name="alert" />
              </span>
              <div>
                <strong>High moisture detected in pantry</strong>
                <p>
                  Pantry Temp: 24°C &nbsp; | &nbsp; Humidity: 68% RH — consume baked goods soon to prevent spoilage.
                </p>
              </div>
              <button onClick={() => setStep("sensor")}>View IoT telemetry →</button>
            </div>

            {/* Meal Log Card */}
            <Card className="log-card">
              <div className="log-head">
                <div>
                  <h2>Today’s meal log</h2>
                  <p>{totalCaloriesConsumed.toLocaleString()} of 2,000 kcal consumed</p>
                </div>
                <button onClick={restart}>Restart onboarding</button>
              </div>
              <div className="meal-table">
                <div className="table-head">
                  <span>Meal</span>
                  <span>Weight</span>
                  <span>Calories</span>
                  <span>Carbs</span>
                  <span>Protein</span>
                  <span />
                </div>
                {mealLogs.map((item, idx) => (
                  <div className="meal-row" key={`${item.name}-${idx}`}>
                    <span className="meal-name">
                      <b>{item.icon}</b>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.time}</small>
                      </span>
                    </span>
                    <span>{item.weight}</span>
                    <span>{item.calories} kcal</span>
                    <span>{item.carbs}</span>
                    <span>{item.protein}</span>
                    <button style={{ color: "var(--muted)", cursor: "pointer" }}>•••</button>
                  </div>
                ))}
              </div>
            </Card>
          </main>
        )}
      </div>
    </div>
  )
}

function IoTTelemetry({ restart }: { restart: () => void }) {
  const readings = [
    { label: "Pantry Temperature", value: "24.2°C", icon: "🌡️", status: "normal", bar: 58, sub: "Optimal range: 18–25°C" },
    { label: "Relative Humidity", value: "68% RH", icon: "💧", status: "high", bar: 68, sub: "Threshold 60% — Warning" },
    { label: "VOC / Spoilage Gas", value: "385 ppb", icon: "🌿", status: "normal", bar: 38, sub: "Fresh air baseline" },
    { label: "Ambient Lighting", value: "280 lux", icon: "☀️", status: "normal", bar: 28, sub: "Dark pantry preservation" },
  ]
  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", padding: "28px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "1px" }}>
              Hardware Telemetry · ESP32 Sensor Grid
            </span>
            <h1 style={{ font: "700 36px var(--display)", margin: "4px 0 0" }}>IoT Pantry Monitor</h1>
          </div>
          <button
            onClick={restart}
            style={{
              border: "2px solid var(--ink)",
              borderRadius: "99px",
              padding: "8px 18px",
              background: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ← Back to Scanner
          </button>
        </div>

        {/* Pantry Alert Banner */}
        <div
          style={{
            background: "#fef3c7",
            border: "2px solid #f59e0b",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            gap: "14px",
            alignItems: "center",
            marginBottom: "24px",
            boxShadow: "3px 3px 0 var(--ink)",
          }}
        >
          <span style={{ fontSize: "32px" }}>⚠️</span>
          <div>
            <strong style={{ display: "block", fontFamily: "var(--display)", fontSize: "16px", color: "#92400e" }}>
              High moisture detected in pantry compartment A
            </strong>
            <p style={{ fontSize: "12px", color: "#78350f", margin: "4px 0 0" }}>
              Humidity reached 68% RH. Gemini recommendation: Consume baked goods and leafy greens within 48 hours to prevent mold spores.
            </p>
          </div>
        </div>

        {/* 4 Sensor Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "24px" }}>
          {readings.map((r) => (
            <div
              key={r.label}
              style={{
                background: "#fff",
                border: "2px solid var(--ink)",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "4px 4px 0 var(--ink)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "28px" }}>{r.icon}</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "99px",
                    background: r.status === "high" ? "#fee2e2" : "#dcfce7",
                    color: r.status === "high" ? "#991b1b" : "#166534",
                  }}
                >
                  {r.status === "high" ? "⚠ Elevated" : "✓ Optimal"}
                </span>
              </div>
              <div style={{ font: "700 32px var(--display)", marginBottom: "4px" }}>{r.value}</div>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 800, marginBottom: "4px" }}>{r.label}</div>
              <div style={{ fontSize: "9px", color: "var(--muted)", marginBottom: "12px" }}>{r.sub}</div>
              <div style={{ height: "7px", background: "rgba(0,0,0,0.08)", borderRadius: "99px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${r.bar}%`,
                    borderRadius: "99px",
                    background: r.status === "high" ? "#ef4444" : "var(--sage)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnalyticsView({ totalCalories, restart }: { totalCalories: number; restart: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", padding: "28px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "1px" }}>
              Nutrition Intelligence
            </span>
            <h1 style={{ font: "700 36px var(--display)", margin: "4px 0 0" }}>Weekly Health Analytics</h1>
          </div>
          <button
            onClick={restart}
            style={{
              border: "2px solid var(--ink)",
              borderRadius: "99px",
              padding: "8px 18px",
              background: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ← Back to Scanner
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          <div style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: "16px", padding: "24px", boxShadow: "4px 4px 0 var(--ink)" }}>
            <h2 style={{ font: "700 20px var(--display)", marginBottom: "8px" }}>Daily Calorie Target</h2>
            <div style={{ font: "700 42px var(--display)", color: "var(--sage-dark)" }}>
              {totalCalories} <span style={{ fontSize: "16px", color: "var(--muted)" }}>/ 2,000 kcal</span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: "8px 0 16px" }}>
              You've hit {Math.round((totalCalories / 2000) * 100)}% of your target for today.
            </p>
            <div style={{ height: "10px", background: "#e5e7eb", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, Math.round((totalCalories / 2000) * 100))}%`, background: "var(--sage)" }} />
            </div>
          </div>

          <div style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: "16px", padding: "24px", boxShadow: "4px 4px 0 var(--ink)" }}>
            <h2 style={{ font: "700 20px var(--display)", marginBottom: "14px" }}>Target Macro Split</h2>
            <div style={{ display: "grid", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
                  <span>Carbohydrates</span>
                  <span>50%</span>
                </div>
                <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "99px" }}>
                  <div style={{ height: "100%", width: "50%", background: "#f59e0b", borderRadius: "99px" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
                  <span>Protein</span>
                  <span>25%</span>
                </div>
                <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "99px" }}>
                  <div style={{ height: "100%", width: "25%", background: "var(--sage)", borderRadius: "99px" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
                  <span>Healthy Fats</span>
                  <span>25%</span>
                </div>
                <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "99px" }}>
                  <div style={{ height: "100%", width: "25%", background: "#6366f1", borderRadius: "99px" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MealHistoryView({ mealLogs, restart }: { mealLogs: MealLogItem[]; restart: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", padding: "28px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "1px" }}>
              Journal & Log
            </span>
            <h1 style={{ font: "700 36px var(--display)", margin: "4px 0 0" }}>Meal History</h1>
          </div>
          <button
            onClick={restart}
            style={{
              border: "2px solid var(--ink)",
              borderRadius: "99px",
              padding: "8px 18px",
              background: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ← Back to Scanner
          </button>
        </div>

        <div style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: "16px", padding: "20px", boxShadow: "4px 4px 0 var(--ink)" }}>
          <div className="meal-table">
            <div className="table-head">
              <span>Meal Name</span>
              <span>Serving</span>
              <span>Calories</span>
              <span>Carbs</span>
              <span>Protein</span>
              <span />
            </div>
            {mealLogs.map((item, idx) => (
              <div className="meal-row" key={`${item.name}-${idx}`}>
                <span className="meal-name">
                  <b>{item.icon}</b>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.time}</small>
                  </span>
                </span>
                <span>{item.weight}</span>
                <span>{item.calories} kcal</span>
                <span>{item.carbs}</span>
                <span>{item.protein}</span>
                <span style={{ fontSize: "10px", color: "var(--sage)", fontWeight: 800 }}>✓ Verified</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsView({
  apiKey,
  onOpenKeyModal,
  onSignOut,
  restart,
}: {
  apiKey: string
  onOpenKeyModal: () => void
  onSignOut?: () => void
  restart: () => void
}) {
  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}` : "None"
  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", padding: "28px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "1px" }}>
              Configuration
            </span>
            <h1 style={{ font: "700 36px var(--display)", margin: "4px 0 0" }}>Settings</h1>
          </div>
          <button
            onClick={restart}
            style={{
              border: "2px solid var(--ink)",
              borderRadius: "99px",
              padding: "8px 18px",
              background: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ← Back to Scanner
          </button>
        </div>

        <div style={{ display: "grid", gap: "18px" }}>
          {/* Gemini AI Key Section */}
          <div style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: "16px", padding: "24px", boxShadow: "4px 4px 0 var(--ink)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <h2 style={{ font: "700 18px var(--display)", margin: "0 0 4px" }}>Gemini 2.5 Flash Vision Model</h2>
                <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 12px" }}>
                  Used for real-time photo food identification, macro analysis, and freshness scoring.
                </p>
                <code style={{ fontSize: "12px", background: "var(--parchment)", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--ink)" }}>
                  Key: {maskedKey}
                </code>
              </div>
              <Button kind="outline" onClick={onOpenKeyModal}>
                Edit API Key
              </Button>
            </div>
          </div>

          {/* Account Profile */}
          <div style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: "16px", padding: "24px", boxShadow: "4px 4px 0 var(--ink)" }}>
            <h2 style={{ font: "700 18px var(--display)", margin: "0 0 8px" }}>User Profile</h2>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0 }}>
              Signed in via Firebase Authentication as <strong>Shrutika Khot</strong>.
            </p>
            {onSignOut && (
              <div style={{ marginTop: "16px" }}>
                <Button kind="primary" onClick={onSignOut}>
                  Log Out of Session
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [step, setStep] = useState<Step>("auth")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setStep("dashboard")
      } else {
        setStep("auth")
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleSignOut = async () => {
    const { signOut } = await import("firebase/auth")
    await signOut(auth)
    setStep("auth")
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--parchment, #f5f0e8)",
          gap: "16px",
        }}
      >
        <AiMark size={48} />
        <div style={{ font: "700 18px var(--display, sans-serif)", color: "var(--ink, #1d1d1d)" }}>
          Checking your session…
        </div>
      </div>
    )
  }

  if (step === "auth") return <Auth next={() => setStep("dashboard")} />
  if (step === "plans") return <Plans next={() => setStep("profile")} back={() => setStep("auth")} />
  if (step === "profile") return <Profile next={() => setStep("dashboard")} back={() => setStep("plans")} />

  return (
    <Dashboard
      restart={() => setStep("auth")}
      step={step}
      setStep={setStep}
      onSignOut={handleSignOut}
    />
  )
}



