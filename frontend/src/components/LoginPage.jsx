import { useState, useEffect, useRef } from 'react'

/* ─── Eye-Tracking Pupil (no white eyeball, just a dot) ─────────── */
function Pupil({ size = 12, maxDistance = 5, color = '#1A1A1B', forceLookX, forceLookY }) {
    const [mouseX, setMouseX] = useState(0)
    const [mouseY, setMouseY] = useState(0)
    const ref = useRef(null)

    useEffect(() => {
        const onMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY) }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    const pos = (() => {
        if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
        if (!ref.current) return { x: 0, y: 0 }
        const r = ref.current.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dx = mouseX - cx, dy = mouseY - cy
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance)
        const a = Math.atan2(dy, dx)
        return { x: Math.cos(a) * dist, y: Math.sin(a) * dist }
    })()

    return (
        <div ref={ref} style={{
            width: size, height: size, borderRadius: '50%', backgroundColor: color,
            transform: `translate(${pos.x}px, ${pos.y}px)`, transition: 'transform 0.1s ease-out',
        }} />
    )
}

/* ─── Eyeball (white circle with pupil inside) ───────────────────── */
function EyeBall({ size = 48, pupilSize = 16, maxDistance = 10, isBlinking = false, forceLookX, forceLookY }) {
    const [mouseX, setMouseX] = useState(0)
    const [mouseY, setMouseY] = useState(0)
    const ref = useRef(null)

    useEffect(() => {
        const onMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY) }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    const pos = (() => {
        if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
        if (!ref.current) return { x: 0, y: 0 }
        const r = ref.current.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dx = mouseX - cx, dy = mouseY - cy
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance)
        const a = Math.atan2(dy, dx)
        return { x: Math.cos(a) * dist, y: Math.sin(a) * dist }
    })()

    return (
        <div ref={ref} style={{
            width: size, height: isBlinking ? 2 : size, borderRadius: '50%', backgroundColor: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'height 0.15s ease', overflow: 'hidden',
        }}>
            {!isBlinking && (
                <div style={{
                    width: pupilSize, height: pupilSize, borderRadius: '50%', backgroundColor: '#1A1A1B',
                    transform: `translate(${pos.x}px, ${pos.y}px)`, transition: 'transform 0.1s ease-out',
                }} />
            )}
        </div>
    )
}

/* ─── Character Position Calculator ──────────────────────────────── */
function useCharacterPosition(ref, mouseX, mouseY) {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 }
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 3
    const dx = mouseX - cx, dy = mouseY - cy
    return {
        faceX: Math.max(-15, Math.min(15, dx / 20)),
        faceY: Math.max(-10, Math.min(10, dy / 30)),
        bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    }
}


/* ═══════════════════════════════════════════════════════════════════ */
/*  LOGIN PAGE                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

export default function LoginPage({ onLogin }) {
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [mouseX, setMouseX] = useState(0)
    const [mouseY, setMouseY] = useState(0)
    const [isBlinking1, setIsBlinking1] = useState(false)
    const [isBlinking2, setIsBlinking2] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const [isLooking, setIsLooking] = useState(false)
    const [isPeeking, setIsPeeking] = useState(false)
    const [userType, setUserType] = useState('shipper') // shipper | carrier

    const char1Ref = useRef(null)
    const char2Ref = useRef(null)
    const char3Ref = useRef(null)
    const char4Ref = useRef(null)

    // Mouse tracking
    useEffect(() => {
        const onMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY) }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    // Blinking for character 1
    useEffect(() => {
        const blink = () => {
            const t = setTimeout(() => {
                setIsBlinking1(true)
                setTimeout(() => { setIsBlinking1(false); blink() }, 150)
            }, Math.random() * 4000 + 3000)
            return t
        }
        const t = blink()
        return () => clearTimeout(t)
    }, [])

    // Blinking for character 2
    useEffect(() => {
        const blink = () => {
            const t = setTimeout(() => {
                setIsBlinking2(true)
                setTimeout(() => { setIsBlinking2(false); blink() }, 150)
            }, Math.random() * 4000 + 3000)
            return t
        }
        const t = blink()
        return () => clearTimeout(t)
    }, [])

    // Characters look at each other when typing starts
    useEffect(() => {
        if (isTyping) {
            setIsLooking(true)
            const t = setTimeout(() => setIsLooking(false), 800)
            return () => clearTimeout(t)
        }
        setIsLooking(false)
    }, [isTyping])

    // Sneaky peek when password is visible
    useEffect(() => {
        if (password.length > 0 && showPassword) {
            const t = setTimeout(() => {
                setIsPeeking(true)
                setTimeout(() => setIsPeeking(false), 800)
            }, Math.random() * 3000 + 2000)
            return () => clearTimeout(t)
        }
        setIsPeeking(false)
    }, [password, showPassword, isPeeking])

    // Character positions
    const pos1 = useCharacterPosition(char1Ref, mouseX, mouseY)
    const pos2 = useCharacterPosition(char2Ref, mouseX, mouseY)
    const pos3 = useCharacterPosition(char3Ref, mouseX, mouseY)
    const pos4 = useCharacterPosition(char4Ref, mouseX, mouseY)

    const isHiding = password.length > 0 && !showPassword
    const isShowingPw = password.length > 0 && showPassword

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)
        await new Promise(r => setTimeout(r, 600))
        // Demo: accept anything
        if (email && password) {
            onLogin({ email, userType })
        } else {
            setError('Please enter both email and password.')
        }
        setIsLoading(false)
    }

    return (
        <div className="login-page">
            {/* Left — Animated Characters */}
            <div className="login-left">
                <div className="login-left-brand">
                    <div className="login-left-logo">C</div>
                    <span>CarrierAI</span>
                </div>

                <div className="login-characters-area">
                    <div className="login-characters">
                        {/* Character 1 — Tall dark (shipping container) */}
                        <div ref={char1Ref} className="login-char" style={{
                            left: 70, width: 170, backgroundColor: '#1A1A1B',
                            height: (isTyping || isHiding) ? 420 : 380,
                            borderRadius: '10px 10px 0 0', zIndex: 1,
                            transform: isShowingPw ? 'skewX(0deg)' :
                                (isTyping || isHiding) ? `skewX(${(pos1.bodySkew || 0) - 12}deg) translateX(40px)` :
                                    `skewX(${pos1.bodySkew || 0}deg)`,
                            transformOrigin: 'bottom center',
                        }}>
                            <div className="login-char-eyes" style={{
                                gap: 30,
                                left: isShowingPw ? 20 : isLooking ? 55 : 45 + pos1.faceX,
                                top: isShowingPw ? 35 : isLooking ? 65 : 40 + pos1.faceY,
                            }}>
                                <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking1}
                                    forceLookX={isShowingPw ? (isPeeking ? 4 : -4) : isLooking ? 3 : undefined}
                                    forceLookY={isShowingPw ? (isPeeking ? 5 : -4) : isLooking ? 4 : undefined} />
                                <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking1}
                                    forceLookX={isShowingPw ? (isPeeking ? 4 : -4) : isLooking ? 3 : undefined}
                                    forceLookY={isShowingPw ? (isPeeking ? 5 : -4) : isLooking ? 4 : undefined} />
                            </div>
                        </div>

                        {/* Character 2 — Medium dark gray */}
                        <div ref={char2Ref} className="login-char" style={{
                            left: 230, width: 115, height: 300, backgroundColor: '#4A4A4A',
                            borderRadius: '8px 8px 0 0', zIndex: 2,
                            transform: isShowingPw ? 'skewX(0deg)' :
                                isLooking ? `skewX(${(pos2.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)` :
                                    (isTyping || isHiding) ? `skewX(${(pos2.bodySkew || 0) * 1.5}deg)` :
                                        `skewX(${pos2.bodySkew || 0}deg)`,
                            transformOrigin: 'bottom center',
                        }}>
                            <div className="login-char-eyes" style={{
                                gap: 24,
                                left: isShowingPw ? 10 : isLooking ? 32 : 26 + pos2.faceX,
                                top: isShowingPw ? 28 : isLooking ? 12 : 32 + pos2.faceY,
                            }}>
                                <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking2}
                                    forceLookX={isShowingPw ? -4 : isLooking ? 0 : undefined}
                                    forceLookY={isShowingPw ? -4 : isLooking ? -4 : undefined} />
                                <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking2}
                                    forceLookX={isShowingPw ? -4 : isLooking ? 0 : undefined}
                                    forceLookY={isShowingPw ? -4 : isLooking ? -4 : undefined} />
                            </div>
                        </div>

                        {/* Character 3 — Warm beige semi-circle (dome/warehouse) */}
                        <div ref={char3Ref} className="login-char" style={{
                            left: 0, width: 230, height: 190, backgroundColor: '#D4C5A0',
                            borderRadius: '120px 120px 0 0', zIndex: 3,
                            transform: isShowingPw ? 'skewX(0deg)' : `skewX(${pos3.bodySkew || 0}deg)`,
                            transformOrigin: 'bottom center',
                        }}>
                            <div className="login-char-eyes" style={{
                                gap: 32,
                                left: isShowingPw ? 48 : 80 + (pos3.faceX || 0),
                                top: isShowingPw ? 85 : 85 + (pos3.faceY || 0),
                            }}>
                                <Pupil size={12} maxDistance={5} color="#1A1A1B"
                                    forceLookX={isShowingPw ? -5 : undefined} forceLookY={isShowingPw ? -4 : undefined} />
                                <Pupil size={12} maxDistance={5} color="#1A1A1B"
                                    forceLookX={isShowingPw ? -5 : undefined} forceLookY={isShowingPw ? -4 : undefined} />
                            </div>
                        </div>

                        {/* Character 4 — Light gray tall rounded (package) */}
                        <div ref={char4Ref} className="login-char" style={{
                            left: 300, width: 135, height: 220, backgroundColor: '#B0B0A8',
                            borderRadius: '70px 70px 0 0', zIndex: 4,
                            transform: isShowingPw ? 'skewX(0deg)' : `skewX(${pos4.bodySkew || 0}deg)`,
                            transformOrigin: 'bottom center',
                        }}>
                            <div className="login-char-eyes" style={{
                                gap: 24,
                                left: isShowingPw ? 20 : 50 + (pos4.faceX || 0),
                                top: isShowingPw ? 35 : 40 + (pos4.faceY || 0),
                            }}>
                                <Pupil size={12} maxDistance={5} color="#1A1A1B"
                                    forceLookX={isShowingPw ? -5 : undefined} forceLookY={isShowingPw ? -4 : undefined} />
                                <Pupil size={12} maxDistance={5} color="#1A1A1B"
                                    forceLookX={isShowingPw ? -5 : undefined} forceLookY={isShowingPw ? -4 : undefined} />
                            </div>
                            {/* Mouth */}
                            <div className="login-char-mouth" style={{
                                left: isShowingPw ? 10 : 38 + (pos4.faceX || 0),
                                top: isShowingPw ? 88 : 86 + (pos4.faceY || 0),
                            }} />
                        </div>
                    </div>
                </div>

                <div className="login-left-footer">
                    <span>Privacy Policy</span>
                    <span>Terms of Service</span>
                    <span>Contact</span>
                </div>
            </div>

            {/* Right — Login Form */}
            <div className="login-right">
                <div className="login-form-container">
                    {/* Mobile brand */}
                    <div className="login-mobile-brand">
                        <div className="login-left-logo">C</div>
                        <span>CarrierAI</span>
                    </div>

                    <div className="login-header">
                        <h1>Welcome back!</h1>
                        <p>Please enter your details to continue</p>
                    </div>

                    {/* User Type Toggle */}
                    <div className="login-toggle">
                        <button className={`login-toggle-btn ${userType === 'shipper' ? 'active' : ''}`}
                            onClick={() => setUserType('shipper')}>
                            Shipper
                        </button>
                        <button className={`login-toggle-btn ${userType === 'carrier' ? 'active' : ''}`}
                            onClick={() => setUserType('carrier')}>
                            Carrier
                        </button>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="login-field">
                            <label>{userType === 'carrier' ? 'Company Email' : 'Email'}</label>
                            <input type="email" placeholder={userType === 'carrier' ? 'ops@maersk.com' : 'you@company.com'}
                                value={email} autoComplete="off"
                                onChange={e => setEmail(e.target.value)}
                                onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} required />
                        </div>

                        <div className="login-field">
                            <label>Password</label>
                            <div className="login-password-wrapper">
                                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                                    value={password} onChange={e => setPassword(e.target.value)} required />
                                <button type="button" className="login-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="login-options">
                            <label className="login-checkbox-label">
                                <input type="checkbox" />
                                <span>Remember for 30 days</span>
                            </label>
                            <a href="#" className="login-forgot">Forgot password?</a>
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        <button type="submit" className="login-submit" disabled={isLoading}>
                            {isLoading ? 'Signing in...' : `Log in as ${userType === 'carrier' ? 'Carrier' : 'Shipper'}`}
                        </button>
                    </form>

                    <div className="login-signup">
                        Don't have an account? <a href="#">Sign Up</a>
                    </div>
                </div>
            </div>
        </div>
    )
}
