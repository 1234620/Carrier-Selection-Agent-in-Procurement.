import { useState, useRef } from 'react'
import './index.css'
import * as api from './api'
import { Ribbons } from './components/Ribbons'
import { ModeIcon } from './components/ModeIcons'

const MODE_CONFIG = {
  road: { label: 'Road', color: '#C4841D' },
  ocean: { label: 'Ocean', color: '#2B6CB0' },
  air: { label: 'Air', color: '#805AD5' },
  rail: { label: 'Rail', color: '#2D8659' },
}

const CITIES = [
  'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Hyderabad',
  'Ahmedabad', 'Pune', 'Jaipur', 'Ludhiana', 'Coimbatore', 'Visakhapatnam',
  'Nagpur', 'Indore', 'Guwahati', 'Shanghai', 'Hamburg', 'Dubai',
  'Singapore', 'Rotterdam',
]

const COMMODITIES = [
  'electronics', 'pharmaceuticals', 'textiles', 'auto_parts', 'fmcg',
  'chemicals', 'steel', 'agri_products', 'gems_jewelry', 'machinery',
]

const PRIORITIES = [
  { id: 'cost', label: 'Lowest Cost', desc: 'Optimize for minimum shipment cost' },
  { id: 'speed', label: 'Fastest', desc: 'Minimize transit time' },
  { id: 'reliability', label: 'Most Reliable', desc: 'Maximize on-time delivery rate' },
  { id: 'sustainability', label: 'Greenest', desc: 'Minimize carbon emissions' },
]


// ─── Landing Page ─────────────────────────────────────────────────────
function LandingPage({ onStart }) {
  return (
    <div className="landing-page">
      <div className="landing-ribbon-bg">
        <Ribbons
          baseThickness={50}
          colors={['#ffffff', '#aaaaaa']}
          speedMultiplier={0.4}
          maxAge={800}
          pointCount={60}
          enableFade={true}
          enableShaderEffect={true}
          effectAmplitude={2}
          backgroundColor={[0, 0, 0, 0]}
        />
      </div>
      <div className="landing-content">
        <div className="landing-badge">AI-Powered Logistics Intelligence</div>
        <h1 className="landing-title">
          <span className="landing-title-line">Carrier</span>
          <span className="landing-title-accent">AI</span>
        </h1>
        <p className="landing-subtitle">
          Four AI brains working together to find the optimal carrier, mode, and
          route for every shipment — across road, ocean, air, and rail.
        </p>
        <button className="landing-cta" onClick={onStart}>
          Start Planning
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        <div className="landing-stats">
          <div className="landing-stat">
            <span className="landing-stat-value">40+</span>
            <span className="landing-stat-label">Carriers</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-value">4</span>
            <span className="landing-stat-label">AI Brains</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-value">40+</span>
            <span className="landing-stat-label">Routes</span>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Top Bar ─────────────────────────────────────────────────────────
function TopBar({ onNewPlan, onHome, hasResults }) {
  return (
    <div className="topbar">
      <div className="topbar-brand" onClick={onHome} style={{ cursor: 'pointer' }}>
        <div className="topbar-logo">C</div>
        <div>
          <div className="topbar-title">CarrierAI</div>
          <div className="topbar-subtitle">Intelligent Logistics</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {hasResults && (
          <button className="btn-new-plan" onClick={onNewPlan}>← New Shipment</button>
        )}
        <div className="topbar-status">System Active</div>
      </div>
    </div>
  )
}


// ─── Step 1: Shipment Input ──────────────────────────────────────────
function ShipmentInput({ onSubmit }) {
  const [form, setForm] = useState({
    origin: 'Mumbai',
    destination: 'Delhi',
    weight_tons: 20,
    commodity: 'electronics',
    fragility: 'medium',
    deadline_days: 14,
    budget_inr: '',
    priority: 'cost',
    urgency: 'standard',
    distance_km: 1400,
    value_inr: 5000000,
  })

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = () => {
    const payload = { ...form }
    if (!payload.budget_inr) delete payload.budget_inr
    else payload.budget_inr = +payload.budget_inr
    payload.weight_tons = +payload.weight_tons
    payload.deadline_days = +payload.deadline_days
    payload.distance_km = +payload.distance_km
    payload.value_inr = +payload.value_inr
    onSubmit(payload)
  }

  return (
    <div style={{ animation: 'fadeInUp 0.6s ease' }}>
      <div className="form-header">
        <h1>Configure Your Shipment</h1>
        <p>Fill in your shipment details and our four AI brains will analyze 40+ carriers to find the optimal solution.</p>
      </div>

      <div className="card form-card">
        {/* Route Section */}
        <div className="form-section-label">Route & Cargo</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Origin</label>
            <select value={form.origin} onChange={e => update('origin', e.target.value)}>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Destination</label>
            <select value={form.destination} onChange={e => update('destination', e.target.value)}>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Weight (tons)</label>
            <input type="number" value={form.weight_tons} onChange={e => update('weight_tons', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Commodity Type</label>
            <select value={form.commodity} onChange={e => update('commodity', e.target.value)}>
              {COMMODITIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="form-divider" />

        {/* Constraints Section */}
        <div className="form-section-label">Constraints</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Fragility</label>
            <select value={form.fragility} onChange={e => update('fragility', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Deadline (days)</label>
            <input type="number" value={form.deadline_days} onChange={e => update('deadline_days', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Budget (₹) — Optional</label>
            <input type="number" value={form.budget_inr} onChange={e => update('budget_inr', e.target.value)} placeholder="No limit" />
          </div>
          <div className="form-group">
            <label>Urgency</label>
            <select value={form.urgency} onChange={e => update('urgency', e.target.value)}>
              <option value="economy">Economy</option>
              <option value="standard">Standard</option>
              <option value="express">Express</option>
            </select>
          </div>
        </div>

        <div className="form-divider" />

        {/* Priority Section */}
        <div className="form-section-label">Optimization Priority</div>
        <div className="priority-grid">
          {PRIORITIES.map(p => (
            <div
              key={p.id}
              className={`priority-option ${form.priority === p.id ? 'selected' : ''}`}
              onClick={() => update('priority', p.id)}
            >
              <div className="priority-label">{p.label}</div>
              <div className="priority-desc">{p.desc}</div>
            </div>
          ))}
        </div>

        <button className="btn-generate" onClick={handleSubmit}>
          Generate Shipping Plan
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}


// ─── Loading ─────────────────────────────────────────────────────────
function LoadingAnimation({ step }) {
  const steps = [
    { label: 'Analyzing transport modes', brain: 'Brain 0 — Mode Selector' },
    { label: 'Scoring carrier performance', brain: 'Brain 1 — Carrier Analyst' },
    { label: 'Assessing route risks', brain: 'Brain 2 — Risk Predictor' },
    { label: 'Optimizing allocation', brain: 'Brain 3 — Strategist' },
    { label: 'Building your shipping plan', brain: 'Final Assembly' },
  ]

  return (
    <div className="loading-overlay">
      <div className="loading-brain" />
      <div className="loading-text">Generating Your Plan</div>
      <div className="loading-sub">Analyzing 40+ carriers across road, rail, ocean, and air</div>
      <div className="loading-steps">
        {steps.map((s, i) => (
          <div key={i} className={`loading-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            <div className="loading-step-dot">
              {i < step ? '✓' : (i + 1)}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.brain}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


// ─── Results View ────────────────────────────────────────────────────
function ResultsView({ plan, shipmentForm }) {
  const [whatIfForm, setWhatIfForm] = useState({ ...shipmentForm })
  const [whatIfResult, setWhatIfResult] = useState(null)
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)

  const rec = plan.recommendation
  const recModeConf = MODE_CONFIG[rec.mode] || {}

  const handleWhatIf = async () => {
    setWhatIfLoading(true)
    try {
      const payload = { ...whatIfForm }
      payload.weight_tons = +payload.weight_tons
      payload.deadline_days = +payload.deadline_days
      if (!payload.budget_inr) delete payload.budget_inr
      else payload.budget_inr = +payload.budget_inr
      const result = await api.recomputePlan(payload)
      setWhatIfResult(result)
    } catch (e) { console.error(e) }
    setWhatIfLoading(false)
  }

  const handleChat = async (question) => {
    const q = question || chatInput
    if (!q.trim()) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: q }])
    setChatLoading(true)
    try {
      const data = await api.chatWithAgent(q)
      setChatMessages(prev => [...prev, { role: 'ai', text: data.response }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Unable to process that question.' }])
    }
    setChatLoading(false)
  }

  return (
    <div className="results-container" style={{ animation: 'fadeInUp 0.5s ease' }}>
      {/* Route Header */}
      <div className="route-header">
        <div className="route-city">{plan.shipment.origin}</div>
        <div className="route-arrow">
          <div className="route-arrow-line" />
          <div className="route-meta">{plan.shipment.weight_tons}t · {plan.shipment.commodity.replace(/_/g, ' ')}</div>
        </div>
        <div className="route-city">{plan.shipment.destination}</div>
      </div>

      {/* Recommended Plan */}
      <div className="section">
        <div className="recommendation-card">
          <div className="rec-badge">AI Recommended</div>
          <div className="rec-main">
            <div className="rec-mode-icon" style={{ color: recModeConf.color }}>
              <ModeIcon mode={rec.mode} size={36} color={recModeConf.color} />
            </div>
            <div className="rec-details">
              <h2>{recModeConf.label} Freight</h2>
              <div className="rec-carrier">
                via <strong>{rec.carrier}</strong> · Score: {rec.composite_score}/100
              </div>
            </div>
          </div>
          <div className="rec-kpis">
            <div className="rec-kpi">
              <div className="rec-kpi-value">₹{rec.estimated_cost_inr?.toLocaleString()}</div>
              <div className="rec-kpi-label">Estimated Cost</div>
            </div>
            <div className="rec-kpi">
              <div className="rec-kpi-value">{rec.transit_days} days</div>
              <div className="rec-kpi-label">Transit Time</div>
            </div>
            <div className="rec-kpi">
              <div className="rec-kpi-value" style={{ color: rec.risk_level === 'low' ? 'var(--success)' : rec.risk_level === 'high' ? 'var(--danger)' : 'var(--warning)' }}>
                {rec.risk_level?.toUpperCase()}
              </div>
              <div className="rec-kpi-label">Risk Level</div>
            </div>
            <div className="rec-kpi">
              <div className="rec-kpi-value">{rec.carbon_kg?.toLocaleString()} kg</div>
              <div className="rec-kpi-label">CO₂ Emissions</div>
            </div>
            <div className="rec-kpi">
              <div className="rec-kpi-value">{rec.reliability_score}%</div>
              <div className="rec-kpi-label">Reliability</div>
            </div>
            <div className="rec-kpi">
              <div className="rec-kpi-value">{rec.ai_confidence}%</div>
              <div className="rec-kpi-label">AI Confidence</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-divider" />

      {/* Mode Comparison */}
      <div className="section">
        <div className="section-title">Transport Mode Comparison</div>
        <div className="section-subtitle">All modes analyzed and ranked by your priority: {plan.shipment.priority}</div>
        <div className="mode-comparison-grid">
          {plan.mode_comparison.map((mode, idx) => {
            const mc = MODE_CONFIG[mode.mode] || {}
            return (
              <div key={mode.mode} className={`mode-compare-card ${idx === 0 ? 'recommended' : ''}`}>
                <div className="mode-compare-header">
                  <ModeIcon mode={mode.mode} size={22} color={mc.color} />
                  <span className="mode-compare-name">{mc.label}</span>
                  <span className="mode-compare-score" style={{ color: mc.color }}>{mode.composite_score}</span>
                </div>
                <div className="mode-compare-stats">
                  <div className="mode-stat">
                    <span className="mode-stat-label">Cost</span>
                    <span className="mode-stat-value">₹{mode.estimated_cost_inr?.toLocaleString()}</span>
                  </div>
                  <div className="mode-stat">
                    <span className="mode-stat-label">Transit</span>
                    <span className="mode-stat-value">{mode.transit_days} days</span>
                  </div>
                  <div className="mode-stat">
                    <span className="mode-stat-label">Risk</span>
                    <span className="mode-stat-value">
                      <span className={`risk-badge ${mode.risk_level}`}>{mode.risk_level}</span>
                    </span>
                  </div>
                  <div className="mode-stat">
                    <span className="mode-stat-label">CO₂</span>
                    <span className="mode-stat-value">{mode.carbon_kg?.toLocaleString()} kg</span>
                  </div>
                  <div className="mode-stat">
                    <span className="mode-stat-label">Confidence</span>
                    <span className="mode-stat-value">{mode.ai_confidence}%</span>
                  </div>
                  <div className="mode-stat">
                    <span className="mode-stat-label">Best Carrier</span>
                    <span className="mode-stat-value" style={{ fontSize: '0.72rem' }}>{mode.best_carrier}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="section-divider" />

      {/* Carrier Alternatives */}
      {plan.carrier_alternatives?.length > 0 && (
        <>
          <div className="section">
            <div className="section-title">
              Carrier Alternatives — <span className={`mode-badge ${rec.mode}`}>
                <ModeIcon mode={rec.mode} size={14} /> {recModeConf.label}
              </span>
            </div>
            <div className="section-subtitle">Top carriers ranked for {plan.shipment.origin} → {plan.shipment.destination}</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="carrier-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Carrier</th>
                    <th>Cost (₹)</th>
                    <th>Reliability</th>
                    <th>Transit</th>
                    <th>Risk</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.carrier_alternatives.map((c, i) => (
                    <tr key={c.id || i}>
                      <td>
                        <span className={`carrier-rank ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : 'rx'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td className="mono">₹{c.estimated_cost_inr?.toLocaleString()}</td>
                      <td>{c.reliability}%</td>
                      <td className="mono">{c.transit_days}d</td>
                      <td>
                        <span className={`risk-badge ${c.risk_score < 30 ? 'low' : c.risk_score < 60 ? 'medium' : 'high'}`}>
                          {c.risk_score < 30 ? 'Low' : c.risk_score < 60 ? 'Med' : 'High'}
                        </span>
                      </td>
                      <td>
                        <div className="score-bar-inline">
                          <span className="mono" style={{ color: c.score > 70 ? 'var(--success)' : c.score > 40 ? 'var(--warning)' : 'var(--danger)' }}>{c.score}</span>
                          <div className="score-track"><div className={`score-fill ${c.score > 70 ? 'high' : c.score > 40 ? 'medium' : 'low'}`} style={{ width: `${c.score}%` }} /></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="section-divider" />
        </>
      )}

      {/* What-If */}
      <div className="section">
        <div className="section-title">What-If Scenario</div>
        <div className="section-subtitle">Adjust parameters to see how the recommendation changes</div>
        <div className="card">
          <div className="whatif-controls">
            <div className="whatif-slider">
              <label>
                <span>Urgency</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{whatIfForm.urgency}</span>
              </label>
              <select value={whatIfForm.urgency} onChange={e => setWhatIfForm(f => ({ ...f, urgency: e.target.value }))}>
                <option value="economy">Economy</option>
                <option value="standard">Standard</option>
                <option value="express">Express</option>
              </select>
            </div>
            <div className="whatif-slider">
              <label>
                <span>Priority</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{whatIfForm.priority}</span>
              </label>
              <select value={whatIfForm.priority} onChange={e => setWhatIfForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="cost">Lowest Cost</option>
                <option value="speed">Fastest</option>
                <option value="reliability">Most Reliable</option>
                <option value="sustainability">Greenest</option>
              </select>
            </div>
            <div className="whatif-slider">
              <label>
                <span>Deadline</span>
                <span className="mono" style={{ color: 'var(--text)' }}>{whatIfForm.deadline_days} days</span>
              </label>
              <input type="range" min="1" max="60" value={whatIfForm.deadline_days} onChange={e => setWhatIfForm(f => ({ ...f, deadline_days: +e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={handleWhatIf} disabled={whatIfLoading}>
              {whatIfLoading ? 'Recomputing...' : 'Simulate Changes →'}
            </button>
          </div>

          {whatIfResult && (
            <div className="whatif-result">
              <div className="whatif-result-header">
                <ModeIcon mode={whatIfResult.recommendation.mode} size={24} color={MODE_CONFIG[whatIfResult.recommendation.mode]?.color} />
                <div>
                  <div className="whatif-result-title">
                    {whatIfResult.recommendation.mode === rec.mode ? 'Same recommendation' : `Switched to ${MODE_CONFIG[whatIfResult.recommendation.mode]?.label}`}: {whatIfResult.recommendation.carrier}
                  </div>
                  <div className="whatif-result-meta">
                    Score: {whatIfResult.recommendation.composite_score}/100 ·
                    Cost: ₹{whatIfResult.recommendation.estimated_cost_inr?.toLocaleString()} ·
                    Transit: {whatIfResult.recommendation.transit_days}d ·
                    Risk: {whatIfResult.recommendation.risk_level}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section-divider" />

      {/* Explanation */}
      <div className="section">
        <div className="section-title">Why This Recommendation?</div>
        <div className="card">
          <div className="explanation-panel">
            {plan.explanation.why_recommended.map((reason, i) => (
              <div className="explanation-item" key={i}>
                <div className="explanation-dot" />
                <div>{reason}</div>
              </div>
            ))}
          </div>

          {plan.explanation.why_not_others?.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why not other modes?</div>
              {plan.explanation.why_not_others.map((item, i) => (
                <div className="why-not-item" key={i}>
                  <span className="why-not-mode" style={{ color: MODE_CONFIG[item.mode]?.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ModeIcon mode={item.mode} size={16} color={MODE_CONFIG[item.mode]?.color} />
                    {item.mode}
                  </span>
                  <span className="why-not-reason">{item.reason}</span>
                  <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.composite_score}/100</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section-divider" />

      {/* AI Chat */}
      <div className="section">
        <div className="section-title">Ask the AI</div>
        <div className="section-subtitle">Have a question about this recommendation?</div>
        <div className="card">
          <div className="suggested-questions">
            {[
              `Why was ${rec.carrier} selected?`,
              `Why not ${plan.mode_comparison[1]?.mode || 'rail'}?`,
              `What's the carbon impact of ${rec.mode}?`,
              `Is there a cheaper option?`,
            ].map((q, i) => (
              <button key={i} className="suggested-q" onClick={() => handleChat(q)}>{q}</button>
            ))}
          </div>
          <div className="chat-section">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-response ${msg.role === 'user' ? 'user-msg' : ''}`} style={{ marginTop: 8 }}>
                {msg.text}
              </div>
            ))}
            {chatLoading && <div className="chat-response" style={{ animation: 'pulse 1s infinite', marginTop: 8 }}>Thinking...</div>}
          </div>
          <div className="chat-input-row" style={{ marginTop: 14 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Ask anything about this shipment plan..." />
            <button onClick={() => handleChat()} disabled={chatLoading}>Ask</button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Main App ────────────────────────────────────────────────────────
function App() {
  const [phase, setPhase] = useState('landing')  // landing → input → loading → results
  const [plan, setPlan] = useState(null)
  const [shipmentForm, setShipmentForm] = useState(null)
  const [loadingStep, setLoadingStep] = useState(0)

  const handleSubmit = async (formData) => {
    setShipmentForm(formData)
    setPhase('loading')
    setLoadingStep(0)

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev >= 4) { clearInterval(stepInterval); return 4 }
        return prev + 1
      })
    }, 600)

    try {
      const result = await api.generatePlan(formData)
      clearInterval(stepInterval)
      setLoadingStep(5)
      setTimeout(() => {
        setPlan(result)
        setPhase('results')
      }, 400)
    } catch (e) {
      clearInterval(stepInterval)
      console.error(e)
      setPhase('input')
    }
  }

  const handleNewPlan = () => {
    setPhase('input')
    setPlan(null)
    setShipmentForm(null)
  }

  const handleHome = () => {
    setPhase('landing')
    setPlan(null)
    setShipmentForm(null)
  }

  // Landing page is full-screen, no topbar
  if (phase === 'landing') {
    return <LandingPage onStart={() => setPhase('input')} />
  }

  return (
    <>
      <TopBar onNewPlan={handleNewPlan} onHome={handleHome} hasResults={phase === 'results'} />
      <div className="page-container">
        {phase === 'input' && <ShipmentInput onSubmit={handleSubmit} />}
        {phase === 'loading' && <LoadingAnimation step={loadingStep} />}
        {phase === 'results' && plan && <ResultsView plan={plan} shipmentForm={shipmentForm} />}
      </div>
    </>
  )
}

export default App
