import { useState, useEffect } from 'react'
import './index.css'
import * as api from './api'

// ─── Mode Icons & Colors ─────────────────────────────────────────────
const MODE_CONFIG = {
  road: { icon: '🚛', label: 'Road', color: '#f59e0b' },
  ocean: { icon: '🚢', label: 'Ocean', color: '#3b82f6' },
  air: { icon: '✈️', label: 'Air', color: '#a855f7' },
  rail: { icon: '🚂', label: 'Rail', color: '#10b981' },
}

// ─── Sidebar Navigation ──────────────────────────────────────────────
function Sidebar({ activePage, setActivePage }) {
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'mode-selector', icon: '🧠', label: 'Mode Selector' },
    { id: 'carriers', icon: '🏆', label: 'Carrier Rankings' },
    { id: 'risk', icon: '⚠️', label: 'Risk Analysis' },
    { id: 'optimizer', icon: '⚡', label: 'Optimizer' },
    { id: 'what-if', icon: '🔮', label: 'What-If Simulator' },
    { id: 'bid-parser', icon: '📄', label: 'Bid Parser' },
    { id: 'chat', icon: '💬', label: 'AI Co-Pilot' },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">🧠</div>
        <div>
          <h2>CarrierAI</h2>
          <div className="brand-subtitle">Procurement Co-Pilot</div>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-section-title">Navigation</div>
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', padding: '12px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <div style={{ marginBottom: '4px' }}>🟢 All 4 Brains Active</div>
        <div>v1.0.0 — Hackathon Build</div>
      </div>
    </div>
  )
}

// ─── Dashboard Page ──────────────────────────────────────────────────
function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.fetchDashboardSummary().then(data => {
      setSummary(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (!summary) return <div>Failed to load dashboard</div>

  const perf = summary.mode_performance || {}

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📊 Procurement Dashboard</h1>
        <p>Multi-modal carrier performance overview — Indian geography</p>
      </div>

      <div className="stats-grid section">
        <StatCard icon="🚛" value={summary.overview?.total_carriers || 0} label="Total Carriers" />
        <StatCard icon="🗺️" value={summary.overview?.total_lanes || 0} label="Active Lanes" />
        <StatCard icon="📦" value={summary.overview?.total_shipments || 0} label="Total Shipments" />
        <StatCard icon="🧠" value="4" label="AI Brains Active" accent />
      </div>

      <div className="section">
        <h3 className="section-title">🚀 Mode Performance Comparison</h3>
        <div className="mode-grid">
          {Object.entries(MODE_CONFIG).map(([mode, cfg]) => {
            const stats = perf[mode] || {}
            return (
              <div className={`mode-card ${mode}`} key={mode}>
                <div className="mode-icon">{cfg.icon}</div>
                <div className="mode-name">{cfg.label} Freight</div>
                <div className="mode-stats">
                  <div className="mode-stat-row"><span className="label">Shipments</span><span className="value">{stats.count || 0}</span></div>
                  <div className="mode-stat-row"><span className="label">Avg Cost (₹)</span><span className="value">₹{(stats.avg_cost_inr || 0).toLocaleString()}</span></div>
                  <div className="mode-stat-row"><span className="label">OTD Rate</span><span className="value">{stats.otd_rate || 0}%</span></div>
                  <div className="mode-stat-row"><span className="label">Volume (tons)</span><span className="value">{(stats.total_volume_tons || 0).toLocaleString()}</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">🗺️ Top Lanes</h3>
        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th>Route</th><th>Type</th><th>Available Modes</th></tr>
            </thead>
            <tbody>
              {(summary.top_lanes || []).map((lane, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{lane.lane}</td>
                  <td><span className="mode-badge road" style={{ textTransform: 'capitalize' }}>{lane.type?.replace('_', ' ')}</span></td>
                  <td>{(lane.modes || []).map(m => <span key={m} className={`mode-badge ${m}`} style={{ marginRight: 4 }}>{MODE_CONFIG[m]?.icon} {m}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Mode Selector Page ──────────────────────────────────────────────
function ModeSelectorPage() {
  const [form, setForm] = useState({
    origin: 'Mumbai', destination: 'Delhi', weight_tons: 20,
    commodity: 'electronics', urgency: 'standard', deadline_days: 14,
    fragility: 'medium', temp_sensitive: false, distance_km: 1400,
    value_inr: 5000000,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const cities = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Ludhiana', 'Coimbatore', 'Visakhapatnam', 'Nagpur', 'Indore', 'Guwahati', 'Shanghai', 'Hamburg', 'Dubai', 'Singapore', 'Rotterdam']
  const commodities = ['electronics', 'pharmaceuticals', 'textiles', 'auto_parts', 'fmcg', 'chemicals', 'steel', 'agri_products', 'gems_jewelry', 'machinery']

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const data = await api.selectMode(form)
      setResult(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🧠 Brain 0: Mode Selector</h1>
        <p>AI recommends the optimal transport mode based on shipment attributes</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">📦 Shipment Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div className="input-group">
              <label>Origin</label>
              <select value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })}>
                {cities.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Destination</label>
              <select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}>
                {cities.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Weight (tons)</label>
              <input type="number" value={form.weight_tons} onChange={e => setForm({ ...form, weight_tons: +e.target.value })} />
            </div>
            <div className="input-group">
              <label>Commodity</label>
              <select value={form.commodity} onChange={e => setForm({ ...form, commodity: e.target.value })}>
                {commodities.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Urgency</label>
              <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}>
                <option value="economy">Economy</option>
                <option value="standard">Standard</option>
                <option value="express">Express</option>
              </select>
            </div>
            <div className="input-group">
              <label>Deadline (days)</label>
              <input type="number" value={form.deadline_days} onChange={e => setForm({ ...form, deadline_days: +e.target.value })} />
            </div>
            <div className="input-group">
              <label>Fragility</label>
              <select value={form.fragility} onChange={e => setForm({ ...form, fragility: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div className="input-group">
              <label>Value (₹)</label>
              <input type="number" value={form.value_inr} onChange={e => setForm({ ...form, value_inr: +e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Analyzing...' : '🧠 Recommend Mode'}
          </button>
        </div>

        <div className="card">
          <h3 className="card-title">📊 AI Recommendation</h3>
          {result ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: '3rem' }}>{MODE_CONFIG[result.recommended_mode]?.icon}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: 8 }}>
                  {MODE_CONFIG[result.recommended_mode]?.label?.toUpperCase()} Recommended
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Confidence: {(result.confidence * 100).toFixed(1)}% · Method: {result.method}
                </div>
              </div>

              <div className="prob-bar-container">
                {Object.entries(result.mode_probabilities || {}).map(([mode, prob]) => (
                  <div className="prob-bar-row" key={mode}>
                    <span className="prob-bar-label">{MODE_CONFIG[mode]?.icon} {mode}</span>
                    <div className="prob-bar">
                      <div className={`prob-bar-fill ${mode}`} style={{ width: `${prob * 100}%` }}>
                        {(prob * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {result.recommendation_text && (
                <div className="explanation-text" style={{ marginTop: 16 }}>
                  {result.recommendation_text}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</div>
              Configure shipment details and click<br />"Recommend Mode" to get AI insights
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Carrier Rankings Page ───────────────────────────────────────────
function CarrierRankingsPage() {
  const [origin, setOrigin] = useState('Mumbai')
  const [destination, setDestination] = useState('Delhi')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const cities = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Nagpur']

  const handleScore = async () => {
    setLoading(true)
    try {
      const data = await api.scoreCarriers({ origin, destination, weight_tons: 20, distance_km: 1000, commodity: 'electronics', urgency: 'standard', deadline_days: 14, fragility: 'medium', value_inr: 5000000 })
      setResult(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🏆 Brain 1: Carrier Rankings</h1>
        <p>AHP-TOPSIS scoring with mode-specific weight profiles</p>
      </div>

      <div className="card section" style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div className="input-group">
          <label>Origin</label>
          <select value={origin} onChange={e => setOrigin(e.target.value)}>{cities.map(c => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="input-group">
          <label>Destination</label>
          <select value={destination} onChange={e => setDestination(e.target.value)}>{cities.map(c => <option key={c}>{c}</option>)}</select>
        </div>
        <button className="btn btn-primary" onClick={handleScore} disabled={loading}>
          {loading ? '⏳' : '🏆'} Score Carriers
        </button>
      </div>

      {result?.summary && (
        <div className="card section">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h3>📌 {result.summary.lane} — {result.summary.carriers_scored} carriers scored</h3>
            {result.summary.overall_best && (
              <div style={{ padding: '6px 14px', background: 'rgba(99,102,241,0.15)', borderRadius: 20, fontSize: '0.8rem' }}>
                🏆 Best: <strong>{result.summary.overall_best.carrier}</strong> via {result.summary.overall_best.mode?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {result?.by_mode && Object.entries(result.by_mode).map(([mode, carriers]) => (
        <div className="section" key={mode}>
          <h3 className="section-title">{MODE_CONFIG[mode]?.icon} {MODE_CONFIG[mode]?.label} Carriers</h3>
          {carriers.slice(0, 5).map((carrier, idx) => (
            <div className="leaderboard-item" key={carrier.id}>
              <div className={`leaderboard-rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default'}`}>
                #{idx + 1}
              </div>
              <div className="leaderboard-info">
                <div className="leaderboard-name">{carrier.name}</div>
                <div className="leaderboard-details">
                  {carrier.id} · {mode === 'road' ? `OTD: ${(carrier.otd_rate * 100).toFixed(0)}%` : mode === 'ocean' ? `Reliability: ${(carrier.schedule_reliability * 100).toFixed(0)}%` : mode === 'air' ? `Flights/wk: ${carrier.flights_per_week}` : `Wagons: ${carrier.wagon_fleet?.toLocaleString()}`}
                </div>
              </div>
              <div>
                <span className="leaderboard-score" style={{ color: MODE_CONFIG[mode]?.color }}>
                  {carrier.topsis_score}
                </span>
                <div className="score-bar">
                  <div className={`score-bar-fill ${carrier.topsis_score > 70 ? 'high' : carrier.topsis_score > 40 ? 'medium' : 'low'}`} style={{ width: `${carrier.topsis_score}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Risk Analysis Page ──────────────────────────────────────────────
function RiskPage() {
  const [form, setForm] = useState({
    origin: 'Mumbai', destination: 'Delhi', weight_tons: 20,
    commodity: 'electronics', urgency: 'standard', deadline_days: 14,
    fragility: 'medium', temp_sensitive: false, distance_km: 1400,
    value_inr: 5000000,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const cities = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Nagpur', 'Dubai', 'Singapore', 'Shanghai', 'Hamburg', 'Rotterdam']

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const data = await api.predictRisk(form)
      setResult(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>⚠️ Brain 2: Risk Analysis</h1>
        <p>Mode-specific delay prediction and risk assessment</p>
      </div>

      <div className="card section" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="input-group">
          <label>Origin</label>
          <select value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })}>{cities.map(c => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="input-group">
          <label>Destination</label>
          <select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}>{cities.map(c => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="input-group">
          <label>Weight (tons)</label>
          <input type="number" value={form.weight_tons} onChange={e => setForm({ ...form, weight_tons: +e.target.value })} style={{ width: 80 }} />
        </div>
        <div className="input-group">
          <label>Urgency</label>
          <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}>
            <option value="economy">Economy</option><option value="standard">Standard</option><option value="express">Express</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>
          {loading ? '⏳' : '⚠️'} Analyze Risk
        </button>
      </div>

      {result && (
        <>
          <div className="stats-grid section">
            {Object.entries(result.risk_by_mode || {}).map(([mode, risk]) => (
              <div className="stat-card" key={mode}>
                <div className="flex-between">
                  <span style={{ fontSize: '1.5rem' }}>{MODE_CONFIG[mode]?.icon}</span>
                  <span className={`risk-badge ${risk.risk_level}`}>{risk.risk_level?.toUpperCase()}</span>
                </div>
                <div className="stat-value" style={{ color: risk.risk_level === 'low' ? 'var(--success)' : risk.risk_level === 'medium' ? 'var(--warning)' : 'var(--danger)' }}>
                  {risk.risk_score}
                </div>
                <div className="stat-label">{MODE_CONFIG[mode]?.label} Risk Score</div>
                <div className="score-bar" style={{ width: '100%' }}>
                  <div className={`score-bar-fill ${risk.risk_score < 30 ? 'high' : risk.risk_score < 60 ? 'medium' : 'low'}`} style={{ width: `${risk.risk_score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="section">
            <h3 className="section-title">🛡️ Safest Mode: <span style={{ color: 'var(--success)' }}>{MODE_CONFIG[result.safest_mode]?.icon} {result.safest_mode?.toUpperCase()}</span></h3>
          </div>

          {Object.entries(result.risk_by_mode || {}).map(([mode, risk]) => (
            risk.risk_alerts?.length > 0 && (
              <div className="section" key={`alerts-${mode}`}>
                <h3 className="section-title">{MODE_CONFIG[mode]?.icon} {MODE_CONFIG[mode]?.label} Alerts</h3>
                {risk.risk_alerts.map((alert, i) => (
                  <div className={`alert ${alert.severity}`} key={i}>
                    <div>{alert.message}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.8 }}>Impact: {alert.impact}</div>
                  </div>
                ))}
              </div>
            )
          ))}
        </>
      )}
    </div>
  )
}

// ─── Optimizer Page ──────────────────────────────────────────────────
function OptimizerPage() {
  const [weights, setWeights] = useState({ cost: 0.35, risk: 0.25, carbon: 0.20, time: 0.20 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleOptimize = async () => {
    setLoading(true)
    try {
      const data = await api.optimizeAllocation({ shipments: [], weights })
      setResult(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>⚡ Brain 3: Cross-Modal Optimizer</h1>
        <p>Multi-objective MILP — simultaneous mode + carrier allocation</p>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <h3 className="card-title">🎛️ Optimization Weights</h3>
          {Object.entries(weights).map(([key, val]) => (
            <div className="slider-container" key={key} style={{ marginTop: 16 }}>
              <div className="flex-between">
                <label style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{key}</label>
                <span className="mono" style={{ color: 'var(--accent-blue)' }}>{(val * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="100" value={val * 100} onChange={e => setWeights({ ...weights, [key]: +e.target.value / 100 })} />
            </div>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={handleOptimize} disabled={loading}>
            {loading ? '⏳ Optimizing...' : '⚡ Run Optimization'}
          </button>
        </div>

        <div className="card">
          <h3 className="card-title">📊 Optimization Results</h3>
          {result ? (
            <div style={{ marginTop: 16 }}>
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat-card">
                  <div className="stat-label">Total Cost</div>
                  <div className="stat-value" style={{ fontSize: '1.3rem' }}>₹{(result.summary?.total_cost_inr || 0).toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Carbon (kg CO₂)</div>
                  <div className="stat-value" style={{ fontSize: '1.3rem' }}>{(result.summary?.total_carbon_kg || 0).toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Risk Score</div>
                  <div className="stat-value" style={{ fontSize: '1.3rem' }}>{result.summary?.avg_risk_score}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Carriers Used</div>
                  <div className="stat-value" style={{ fontSize: '1.3rem' }}>{result.summary?.unique_carriers_used}</div>
                </div>
              </div>

              {result.savings_analysis && (
                <div className={`delta-card ${result.savings_analysis.savings_inr > 0 ? 'positive' : 'negative'}`} style={{ marginTop: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>💰 Savings vs Naive</div>
                    <div className="delta-value" style={{ color: result.savings_analysis.savings_inr > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      ₹{Math.abs(result.savings_analysis.savings_inr).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{result.savings_analysis.savings_pct}% optimization gain</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Mode Distribution</div>
                {Object.entries(result.summary?.mode_distribution_pct || {}).map(([mode, pct]) => (
                  <div className="prob-bar-row" key={mode} style={{ marginBottom: 4 }}>
                    <span className="prob-bar-label">{MODE_CONFIG[mode]?.icon} {mode}</span>
                    <div className="prob-bar">
                      <div className={`prob-bar-fill ${mode}`} style={{ width: `${pct}%` }}>{pct}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚡</div>
              Adjust weights and click "Run Optimization"<br />to find the optimal allocation
            </div>
          )}
        </div>
      </div>

      {result?.allocations && (
        <div className="card section">
          <h3 className="card-title">📋 Allocation Details (Top 10)</h3>
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Shipment</th><th>Route</th><th>Mode</th><th>Carrier</th><th>Cost (₹)</th><th>Risk</th><th>CO₂ (kg)</th></tr>
            </thead>
            <tbody>
              {result.allocations.slice(0, 10).map((a, i) => (
                <tr key={i}>
                  <td className="mono">{a.shipment_id}</td>
                  <td>{a.origin} → {a.destination}</td>
                  <td><span className={`mode-badge ${a.allocated_mode}`}>{MODE_CONFIG[a.allocated_mode]?.icon} {a.allocated_mode}</span></td>
                  <td>{a.allocated_carrier}</td>
                  <td className="mono">₹{a.allocated_cost_inr?.toLocaleString()}</td>
                  <td><span className={`risk-badge ${a.risk_score < 30 ? 'low' : a.risk_score < 60 ? 'medium' : 'high'}`}>{a.risk_score}</span></td>
                  <td className="mono">{a.carbon_kg?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── What-If Simulator Page ──────────────────────────────────────────
function WhatIfPage() {
  const [shiftFrom, setShiftFrom] = useState('air')
  const [shiftTo, setShiftTo] = useState('rail')
  const [shiftPct, setShiftPct] = useState(30)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSimulate = async () => {
    setLoading(true)
    try {
      const data = await api.whatIfAnalysis({ shift_from: shiftFrom, shift_to: shiftTo, shift_pct: shiftPct })
      setResult(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🔮 What-If Simulator</h1>
        <p>Explore modal shift scenarios — see cost, carbon, and risk impact in real-time</p>
      </div>

      <div className="card section">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group">
            <label>Shift FROM</label>
            <select value={shiftFrom} onChange={e => setShiftFrom(e.target.value)}>
              {Object.entries(MODE_CONFIG).map(([m, c]) => <option key={m} value={m}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div style={{ fontSize: '1.5rem', paddingBottom: 8 }}>→</div>
          <div className="input-group">
            <label>Shift TO</label>
            <select value={shiftTo} onChange={e => setShiftTo(e.target.value)}>
              {Object.entries(MODE_CONFIG).map(([m, c]) => <option key={m} value={m}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
            <label>Shift Percentage: <span className="mono" style={{ color: 'var(--accent-blue)' }}>{shiftPct}%</span></label>
            <input type="range" min="5" max="100" value={shiftPct} onChange={e => setShiftPct(+e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleSimulate} disabled={loading}>
            {loading ? '⏳ Simulating...' : '🔮 Simulate'}
          </button>
        </div>
      </div>

      {result?.delta && (
        <div className="stats-grid section">
          <DeltaCard label="Cost Impact" value={`₹${Math.abs(result.delta.cost_change_inr).toLocaleString()}`} pct={result.delta.cost_change_pct} inverted />
          <DeltaCard label="Carbon Impact" value={`${Math.abs(result.delta.carbon_change_kg).toLocaleString()} kg CO₂`} pct={result.delta.carbon_change_pct} inverted />
          <DeltaCard label="Risk Impact" value={`${Math.abs(result.delta.risk_change).toFixed(1)} pts`} pct={result.delta.risk_change} inverted />
        </div>
      )}

      {result && (
        <div className="grid-2 section">
          <div className="card">
            <h3 className="card-title">📊 Baseline</h3>
            <div style={{ marginTop: 12 }}>
              <div className="mode-stat-row"><span className="label">Total Cost</span><span className="value mono">₹{(result.baseline?.total_cost_inr || 0).toLocaleString()}</span></div>
              <div className="mode-stat-row"><span className="label">Carbon</span><span className="value mono">{(result.baseline?.total_carbon_kg || 0).toLocaleString()} kg</span></div>
              <div className="mode-stat-row"><span className="label">Avg Risk</span><span className="value mono">{result.baseline?.avg_risk_score}</span></div>
              <div style={{ marginTop: 12 }}>
                {Object.entries(result.baseline?.mode_distribution_pct || {}).map(([mode, pct]) => (
                  <div className="prob-bar-row" key={mode} style={{ marginBottom: 4 }}>
                    <span className="prob-bar-label">{MODE_CONFIG[mode]?.icon}</span>
                    <div className="prob-bar"><div className={`prob-bar-fill ${mode}`} style={{ width: `${pct}%` }}>{pct}%</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title">🔮 Scenario</h3>
            <div style={{ marginTop: 12 }}>
              <div className="mode-stat-row"><span className="label">Total Cost</span><span className="value mono">₹{(result.scenario?.total_cost_inr || 0).toLocaleString()}</span></div>
              <div className="mode-stat-row"><span className="label">Carbon</span><span className="value mono">{(result.scenario?.total_carbon_kg || 0).toLocaleString()} kg</span></div>
              <div className="mode-stat-row"><span className="label">Avg Risk</span><span className="value mono">{result.scenario?.avg_risk_score}</span></div>
              <div style={{ marginTop: 12 }}>
                {Object.entries(result.scenario?.mode_distribution_pct || {}).map(([mode, pct]) => (
                  <div className="prob-bar-row" key={mode} style={{ marginBottom: 4 }}>
                    <span className="prob-bar-label">{MODE_CONFIG[mode]?.icon}</span>
                    <div className="prob-bar"><div className={`prob-bar-fill ${mode}`} style={{ width: `${pct}%` }}>{pct}%</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bid Parser Page ─────────────────────────────────────────────────
function BidParserPage() {
  const [bidText, setBidText] = useState(`Carrier: TCI Freight Services
Route: Mumbai to Delhi
Mode: Road (FTL)
Rate: ₹3.50 per ton-km
Vehicle: 20ft Container
Fuel Surcharge: 12%
Transit: 3 days
Min Weight: 10 tons`)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleParse = async () => {
    setLoading(true)
    try {
      const data = await api.parseBid(bidText)
      setResult(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const sampleBids = {
    road: `Carrier: VRL Logistics\nRoute: Mumbai to Delhi\nMode: Road (FTL)\nRate: ₹3.50 per ton-km\nVehicle: 20ft Container\nFuel Surcharge: 12%\nTransit: 3 days\nMin Weight: 10 tons`,
    ocean: `Carrier: Maersk Line\nRoute: JNPT Mumbai to Rotterdam\nMode: Ocean FCL\nRate: $1,850 per TEU\nBAF: $220\nTHC Origin: $180\nTHC Destination: $250\nISPS: $15\nTransit: 28 days\nContainer: 40HC\nFree Days: 14`,
    air: `Carrier: Emirates SkyCargo\nRoute: Mumbai to Dubai\nMode: Air Cargo\nRate: $3.50 per kg (45+ kg bracket)\nFuel Surcharge: $0.85 per kg\nSecurity: $0.12 per kg\nTransit: 8 hours\nMin Weight: 45 kg`,
    rail: `Carrier: CONCOR\nRoute: Delhi to Mumbai (DFC)\nMode: Rail Container\nRate: ₹1.80 per ton-km\nWagon: Container flat\nTerminal Handling: ₹5,000\nTransit: 4 days\nCapacity: 65 tons per wagon`,
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📄 Bid Parser</h1>
        <p>LLM-powered multi-format bid extraction and normalization</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {Object.entries(sampleBids).map(([mode, text]) => (
          <button key={mode} className="btn btn-secondary" onClick={() => setBidText(text)}>
            {MODE_CONFIG[mode]?.icon} {mode} sample
          </button>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">📝 Bid Input</h3>
          <textarea
            value={bidText}
            onChange={e => setBidText(e.target.value)}
            style={{ width: '100%', height: 250, marginTop: 12, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem' }}
            placeholder="Paste carrier bid text here..."
          />
          <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={handleParse} disabled={loading}>
            {loading ? '⏳ Parsing...' : '🔍 Parse & Normalize'}
          </button>
        </div>

        <div className="card">
          <h3 className="card-title">📊 Parsed Result</h3>
          {result ? (
            <div style={{ marginTop: 12 }}>
              {result.mode && (
                <div style={{ marginBottom: 16 }}>
                  <span className={`mode-badge ${result.mode}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                    {MODE_CONFIG[result.mode]?.icon} {result.mode?.toUpperCase()} Freight
                  </span>
                </div>
              )}
              {result.carrier_name && <div className="mode-stat-row"><span className="label">Carrier</span><span className="value">{result.carrier_name}</span></div>}
              {result.origin && <div className="mode-stat-row"><span className="label">Route</span><span className="value">{result.origin} → {result.destination}</span></div>}

              {result.normalization && (
                <>
                  <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>💰 Normalized Costs</h4>
                  {Object.entries(result.normalization).filter(([k, v]) => typeof v === 'number').map(([key, val]) => (
                    <div className="mode-stat-row" key={key}>
                      <span className="label">{key.replace(/_/g, ' ')}</span>
                      <span className="value mono">{typeof val === 'number' ? val.toLocaleString() : val}</span>
                    </div>
                  ))}
                </>
              )}

              {result.usd_per_ton_km !== undefined && (
                <div style={{ marginTop: 16, padding: 12, background: 'rgba(99,102,241,0.1)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cross-Modal Normalized</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                    ${result.usd_per_ton_km} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>USD/ton-km</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📄</div>
              Paste a bid and click "Parse" to see<br />normalized cross-modal costs
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Chat Page ───────────────────────────────────────────────────────
function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I\'m your AI Procurement Co-Pilot. I can help you with:\n\n• Carrier recommendations for any route\n• Risk assessment across transport modes\n• Cost comparisons and optimization\n• Carbon footprint analysis\n\nTry asking: "Which carrier is cheapest for Mumbai to Delhi?" or "Compare road vs rail for Chennai to Kolkata"' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const data = await api.chatWithAgent(userMsg)
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'I couldn\'t process that request.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error communicating with the AI backend. Make sure the server is running.' }])
    }
    setLoading(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>💬 AI Co-Pilot</h1>
        <p>Natural language interface — ask anything about carriers, routes, and logistics</p>
      </div>

      <div className="card" style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <pre>{msg.content}</pre>
            </div>
          ))}
          {loading && (
            <div className="chat-message assistant">
              <span style={{ animation: 'pulse 1s infinite' }}>🧠 Thinking...</span>
            </div>
          )}
        </div>
        <div className="chat-input-area">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about carriers, routes, costs, risks..."
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared Components ───────────────────────────────────────────────
function StatCard({ icon, value, label, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={accent ? { background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function DeltaCard({ label, value, pct, inverted }) {
  const isPositive = inverted ? pct < 0 : pct > 0
  return (
    <div className={`stat-card`}>
      <div className="stat-label">{label}</div>
      <div className="delta-value" style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
        {pct > 0 ? '+' : ''}{pct?.toFixed(1)}%
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{value}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ fontSize: '3rem', animation: 'pulse 1s infinite' }}>🧠</div>
      <div style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Loading AI Brains...</div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────
function App() {
  const [activePage, setActivePage] = useState('dashboard')

  const pages = {
    'dashboard': <DashboardPage />,
    'mode-selector': <ModeSelectorPage />,
    'carriers': <CarrierRankingsPage />,
    'risk': <RiskPage />,
    'optimizer': <OptimizerPage />,
    'what-if': <WhatIfPage />,
    'bid-parser': <BidParserPage />,
    'chat': <ChatPage />,
  }

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        {pages[activePage]}
      </main>
    </div>
  )
}

export default App
