import { useEffect, useMemo, useState, type ReactNode } from "react"
import { signInWithEmail, signInWithGoogle, auth } from "./firebase"
import { onAuthStateChanged } from "firebase/auth"


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

function Icon({ name, size = 20 }: { name: IconName size?: number }) {
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

function Plans({ next, back }: { next: () => void back: () => void }) {
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

function FlowHeader({ step, back }: { step: number back: () => void }) {
  return (
    <header className="flow-header">
      <Brand />
      <FlowDots current={step} />
      <button onClick={back}>← Back</button>
    </header>
  )
}

function Profile({ next, back }: { next: () => void back: () => void }) {
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

function Dashboard({ restart, step, setStep }: { restart: () => void; step: Step; setStep: (s: Step) => void }) {
  const [image, setImage] = useState(FOOD_IMAGE)
  const [scanning, setScanning] = useState(false)
  const fileChange = (file?: File) => {
    if (!file) return
    setImage(URL.createObjectURL(file))
    setScanning(true)
    window.setTimeout(() => setScanning(false), 1400)
  }
  return (
    <div className="app">
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
        <header className="topbar">
          <div className="top-pills">
            <button className="active">Scanner</button>
            <button>IoT Monitor</button>
            <button>Analytics</button>
          </div>
          <div className="top-actions">
            <div className="profile">
              <span>SR</span>
              <div>
                <strong>Shrutika</strong>
                <small>Pro Member</small>
              </div>
            </div>
            <Button kind="light">
              <Icon name="plus" size={17} /> Scan Meal
            </Button>
          </div>
        </header>
        <main className="dashboard">
          <div className="dashboard-title">
            <div>
              <span className="eyebrow">Gemini vision lab</span>
              <h1>What’s on your plate?</h1>
            </div>
            <div className="gemini-pill">
              <AiMark size={23} />
              <span>Powered by Gemini AI</span>
              <i /> Ready
            </div>
          </div>
          <div className="scanner-layout">
            <Card className="vision-card">
              <div className="vision-head">
                <div>
                  <h2>Live meal analysis</h2>
                  <p>Upload a photo and let Gemini decode the details.</p>
                </div>
                <span className="fresh">● Looks Fresh 98%</span>
              </div>
              <div className="food-preview">
                {image ? (
                  <img src={image} alt="Food meal ready for AI analysis" />
                ) : (
                  <div className="empty-preview">
                    <Icon name="camera" size={38} />
                    <p>Your meal preview will appear here</p>
                  </div>
                )}
                <span className="box box--toast">Avocado Toast · 97%</span>
                <span className="box box--egg">Poached Egg · 96%</span>
                {scanning && (
                  <div className="scanning">
                    <AiMark size={40} />
                    <strong>Gemini is analyzing your meal…</strong>
                  </div>
                )}
              </div>
              <label className="dropzone">
                <Icon name="upload" />
                <div>
                  <strong>Upload meal photo</strong>
                  <span>or click for live camera capture</span>
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
            <Card className="nutrition-card" mint>
              <div className="nutrition-head">
                <div>
                  <span className="mini-badge">AI estimate</span>
                  <h2>Avocado Egg Toast</h2>
                </div>
                <strong>
                  450 <small>kcal</small>
                </strong>
              </div>
              <div className="macro-stats">
                <div>
                  <span>Carbohydrates</span>
                  <strong>42g</strong>
                  <small>Fiber 8g · Sugars 3g</small>
                </div>
                <div>
                  <span>Protein</span>
                  <strong>18g</strong>
                  <small>High-quality protein</small>
                </div>
                <div>
                  <span>Fats</span>
                  <strong>22g</strong>
                  <small>Saturated 4g</small>
                </div>
              </div>
              <h3>Key minerals & vitamins</h3>
              {[
                ["Sodium", "320mg", 64],
                ["Potassium", "480mg", 78],
                ["Iron", "15%", 45],
                ["Vitamin C", "25%", 62],
              ].map(([name, value, width]) => (
                <div className="mineral" key={name}>
                  <span>{name}</span>
                  <div>
                    <i style={{ width: `${width}%` }} />
                  </div>
                  <strong>{value}</strong>
                </div>
              ))}
              <div className="ai-note">
                <AiMark size={24} />
                <p>
                  <strong>Gemini insight:</strong> Balanced and fiber-rich. Add
                  berries for an extra antioxidant boost.
                </p>
              </div>
            </Card>
          </div>
          <div className="iot-banner">
            <span>
              <Icon name="alert" />
            </span>
            <div>
              <strong>High moisture detected in pantry</strong>
              <p>
                Pantry Temp: 24°C &nbsp; | &nbsp; Humidity: 68% RH — consume
                baked goods soon.
              </p>
            </div>
            <button>View IoT telemetry →</button>
          </div>
          <Card className="log-card">
            <div className="log-head">
              <div>
                <h2>Today’s meal log</h2>
                <p>1,106 of 2,000 kcal consumed</p>
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
              {[
                ["🥑", "Avocado Egg Toast", "240g", "450", "42g", "18g"],
                ["🥗", "Garden Power Bowl", "310g", "386", "48g", "24g"],
                ["🥜", "Apple & Almonds", "130g", "270", "31g", "8g"],
              ].map(([icon, name, ...data]) => (
                <div className="meal-row" key={name}>
                  <span className="meal-name">
                    <b>{icon}</b>
                    <span>
                      <strong>{name}</strong>
                      <small>
                        {name.includes("Toast")
                          ? "Breakfast · 8:40 AM"
                          : name.includes("Bowl")
                            ? "Lunch · 1:15 PM"
                            : "Snack · 4:20 PM"}
                      </small>
                    </span>
                  </span>
                  {data.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                  <button>•••</button>
                </div>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}

function IoTTelemetry({ restart }: { restart: () => void }) {
  const readings = [
    { label: "Temperature", value: "24°C", icon: "🌡️", status: "normal", bar: 60 },
    { label: "Humidity", value: "68% RH", icon: "💧", status: "high", bar: 68 },
    { label: "CO₂ Level", value: "412 ppm", icon: "🌿", status: "normal", bar: 41 },
    { label: "Light Level", value: "280 lux", icon: "☀️", status: "normal", bar: 28 },
  ]
  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", padding: "32px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "1px" }}>Live Sensor Data</span>
            <h1 style={{ font: "700 36px var(--display)", margin: "4px 0 0" }}>IoT Telemetry</h1>
          </div>
          <button onClick={restart} style={{ border: "2px solid var(--ink)", borderRadius: "99px", padding: "8px 18px", background: "transparent", fontWeight: 800, cursor: "pointer" }}>← Back to Dashboard</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          {readings.map((r) => (
            <div key={r.label} style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: "16px", padding: "20px", boxShadow: "3px 3px 0 var(--ink)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "24px" }}>{r.icon}</span>
                <span style={{ fontSize: "9px", fontWeight: 800, padding: "4px 8px", borderRadius: "99px", background: r.status === "high" ? "#fef3c7" : "#dcfce7", color: r.status === "high" ? "#92400e" : "#166534" }}>
                  {r.status === "high" ? "⚠ High" : "✓ Normal"}
                </span>
              </div>
              <div style={{ font: "700 28px var(--display)", marginBottom: "4px" }}>{r.value}</div>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 800, marginBottom: "10px" }}>{r.label}</div>
              <div style={{ height: "6px", background: "rgba(0,0,0,0.08)", borderRadius: "99px" }}>
                <div style={{ height: "100%", width: `${r.bar}%`, borderRadius: "99px", background: r.status === "high" ? "#f59e0b" : "var(--sage)" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: "16px", padding: "20px", boxShadow: "3px 3px 0 var(--ink)" }}>
          <h2 style={{ font: "700 18px var(--display)", marginBottom: "12px" }}>Pantry Alert</h2>
          <div style={{ background: "#fef3c7", border: "1.5px solid #f59e0b", borderRadius: "10px", padding: "14px", display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "28px" }}>⚠️</span>
            <div>
              <strong style={{ display: "block", fontFamily: "var(--display)", fontSize: "14px" }}>High moisture detected in pantry</strong>
              <p style={{ fontSize: "11px", color: "#78350f", margin: "4px 0 0" }}>Humidity at 68% RH — consume baked goods soon to prevent mold.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function App() {
  const [step, setStep] = useState<Step>("auth");
  const [loading, setLoading] = useState(true); // wait for Firebase to resolve auth

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Already signed in — go to dashboard
        setStep("dashboard");
      } else {
        // No active session — must log in
        setStep("auth");
      }
      setLoading(false); // Firebase has responded, stop the spinner
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    setStep("auth");
  };

  // Show a loading screen while Firebase checks the session
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--parchment, #f5f0e8)",
        gap: "16px",
      }}>
        <AiMark size={48} />
        <div style={{ font: "700 18px var(--display, sans-serif)", color: "var(--ink, #1d1d1d)" }}>
          Checking your session…
        </div>
      </div>
    );
  }

  if (step === "auth") return <Auth next={() => setStep("dashboard")} />;
  if (step === "plans") return <Plans next={() => setStep("profile")} back={() => setStep("auth")} />;
  if (step === "profile") return <Profile next={() => setStep("dashboard")} back={() => setStep("plans")} />;
  if (step === "dashboard") return <Dashboard restart={() => setStep("auth")} step={step} setStep={setStep} />;
  if (step === "sensor") return <IoTTelemetry restart={() => setStep("dashboard")} />;
  if (step === "scanner") return <AIScannerPage step={step} setStep={setStep} />;
  if (step === "analytics") return <AnalyticsPage step={step} setStep={setStep} />;
  if (step === "history") return <MealHistoryPage step={step} setStep={setStep} />;
  if (step === "settings") return <SettingsPage step={step} setStep={setStep} onSignOut={handleSignOut} />;
  return null;
}


