import { useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import DottedMap from 'dotted-map'

// City coordinates
const CITY_COORDS = {
    Mumbai: { lat: 19.076, lng: 72.8777 },
    Delhi: { lat: 28.6139, lng: 77.209 },
    Chennai: { lat: 13.0827, lng: 80.2707 },
    Kolkata: { lat: 22.5726, lng: 88.3639 },
    Bangalore: { lat: 12.9716, lng: 77.5946 },
    Hyderabad: { lat: 17.385, lng: 78.4867 },
    Ahmedabad: { lat: 23.0225, lng: 72.5714 },
    Pune: { lat: 18.5204, lng: 73.8567 },
    Jaipur: { lat: 26.9124, lng: 75.7873 },
    Lucknow: { lat: 26.8467, lng: 80.9462 },
    Kanpur: { lat: 26.4499, lng: 80.3319 },
    Surat: { lat: 21.1702, lng: 72.8311 },
    Nagpur: { lat: 21.1458, lng: 79.0882 },
    Indore: { lat: 22.7196, lng: 75.8577 },
    Bhopal: { lat: 23.2599, lng: 77.4126 },
    Patna: { lat: 25.6093, lng: 85.1376 },
    Vadodara: { lat: 22.3072, lng: 73.1812 },
    Ludhiana: { lat: 30.901, lng: 75.8573 },
    Coimbatore: { lat: 11.0168, lng: 76.9558 },
    Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
    Kochi: { lat: 9.9312, lng: 76.2673 },
    Mangalore: { lat: 12.9141, lng: 74.856 },
    Mysore: { lat: 12.2958, lng: 76.6394 },
    Thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
    Guwahati: { lat: 26.1445, lng: 91.7362 },
    Chandigarh: { lat: 30.7333, lng: 76.7794 },
    Dehradun: { lat: 30.3165, lng: 78.0322 },
    Ranchi: { lat: 23.3441, lng: 85.3096 },
    Shanghai: { lat: 31.2304, lng: 121.4737 },
    Hamburg: { lat: 53.5511, lng: 9.9937 },
    Dubai: { lat: 25.2048, lng: 55.2708 },
    Singapore: { lat: 1.3521, lng: 103.8198 },
    Rotterdam: { lat: 51.9244, lng: 4.4777 },
    London: { lat: 51.5074, lng: -0.1278 },
    'New York': { lat: 40.7128, lng: -74.006 },
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    Tokyo: { lat: 35.6762, lng: 139.6503 },
    Sydney: { lat: -33.8688, lng: 151.2093 },
    'São Paulo': { lat: -23.5505, lng: -46.6333 },
    Lagos: { lat: 6.5244, lng: 3.3792 },
    Nairobi: { lat: -1.2921, lng: 36.8219 },
    Istanbul: { lat: 41.0082, lng: 28.9784 },
    Bangkok: { lat: 13.7563, lng: 100.5018 },
    'Hong Kong': { lat: 22.3193, lng: 114.1694 },
    Colombo: { lat: 6.9271, lng: 79.8612 },
    Dhaka: { lat: 23.8103, lng: 90.4125 },
    Karachi: { lat: 24.8607, lng: 67.0011 },
    Jeddah: { lat: 21.4858, lng: 39.1925 },
}

const DEFAULT_ROUTES = [
    { start: 'Mumbai', end: 'Dubai' },
    { start: 'Delhi', end: 'London' },
    { start: 'Shanghai', end: 'Rotterdam' },
    { start: 'Singapore', end: 'Sydney' },
    { start: 'London', end: 'New York' },
    { start: 'Tokyo', end: 'Los Angeles' },
    { start: 'Mumbai', end: 'Singapore' },
    { start: 'Nairobi', end: 'Istanbul' },
]

export { CITY_COORDS }

const W = 800
const H = 400

export default function WorldMap({ origin, destination, lineColor = '#1A1A1B' }) {
    const svgRef = useRef(null)

    // Generate dotted map points
    const map = useMemo(() => new DottedMap({ height: 100, grid: 'diagonal' }), [])
    const dots = useMemo(() => {
        const points = map.getPoints()
        return points
    }, [map])

    const projectPoint = (lat, lng) => {
        const x = (lng + 180) * (W / 360)
        const y = (90 - lat) * (H / 180)
        return { x, y }
    }

    const createCurvedPath = (start, end) => {
        const midX = (start.x + end.x) / 2
        const midY = Math.min(start.y, end.y) - 50
        return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`
    }

    const hasUserRoute = origin && destination && origin !== destination &&
        CITY_COORDS[origin] && CITY_COORDS[destination]

    const routes = hasUserRoute
        ? [{ start: origin, end: destination }]
        : DEFAULT_ROUTES

    const staggerDelay = 0.4
    const animDuration = 2
    const totalTime = routes.length * staggerDelay + animDuration
    const fullCycle = totalTime + 2

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="worldmap-svg-full"
            preserveAspectRatio="xMidYMid slice"
            style={{ width: '100%', height: '100%', display: 'block' }}
        >
            <defs>
                <linearGradient id="wm-path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
                    <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <filter id="wm-glow">
                    <feMorphology operator="dilate" radius="0.5" />
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Dotted world map background — all dots in the same SVG */}
            {dots.map((pt, i) => {
                const { x, y } = projectPoint(pt.lat, pt.lng)
                return (
                    <circle
                        key={`dot-${i}`}
                        cx={x}
                        cy={y}
                        r="0.8"
                        fill="#1A1A1B"
                        opacity="0.18"
                    />
                )
            })}

            {/* Routes */}
            {routes.map((route, i) => {
                const sc = CITY_COORDS[route.start]
                const ec = CITY_COORDS[route.end]
                if (!sc || !ec) return null

                const sp = projectPoint(sc.lat, sc.lng)
                const ep = projectPoint(ec.lat, ec.lng)
                const path = createCurvedPath(sp, ep)

                const startTime = (i * staggerDelay) / fullCycle
                const endTime = (i * staggerDelay + animDuration) / fullCycle
                const resetTime = totalTime / fullCycle

                return (
                    <g key={`route-${i}`}>
                        <motion.path
                            d={path}
                            fill="none"
                            stroke="url(#wm-path-grad)"
                            strokeWidth={hasUserRoute ? '1.8' : '1'}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: [0, 0, 1, 1, 0] }}
                            transition={{
                                duration: fullCycle,
                                times: [0, startTime, endTime, resetTime, 1],
                                ease: 'easeInOut',
                                repeat: Infinity,
                            }}
                        />

                        <motion.circle
                            r={hasUserRoute ? '4' : '2.5'}
                            fill={lineColor}
                            initial={{ offsetDistance: '0%', opacity: 0 }}
                            animate={{
                                offsetDistance: [null, '0%', '100%', '100%', '100%'],
                                opacity: [0, 0, 1, 0, 0],
                            }}
                            transition={{
                                duration: fullCycle,
                                times: [0, startTime, endTime, resetTime, 1],
                                ease: 'easeInOut',
                                repeat: Infinity,
                            }}
                            style={{ offsetPath: `path('${path}')` }}
                        />

                        {/* Start point */}
                        <circle cx={sp.x} cy={sp.y} r={hasUserRoute ? '4' : '2.5'} fill={lineColor} filter="url(#wm-glow)" />
                        <circle cx={sp.x} cy={sp.y} r="3" fill={lineColor} opacity="0.4">
                            <animate attributeName="r" from="3" to={hasUserRoute ? '14' : '8'} dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                        </circle>

                        {/* End point */}
                        <circle cx={ep.x} cy={ep.y} r={hasUserRoute ? '4' : '2.5'} fill={lineColor} filter="url(#wm-glow)" />
                        <circle cx={ep.x} cy={ep.y} r="3" fill={lineColor} opacity="0.4">
                            <animate attributeName="r" from="3" to={hasUserRoute ? '14' : '8'} dur="2s" begin="0.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.5" to="0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                        </circle>

                        {/* City labels */}
                        <foreignObject x={sp.x - 50} y={sp.y - 28} width="100" height="22">
                            <div className="worldmap-label">{route.start}</div>
                        </foreignObject>
                        <foreignObject x={ep.x - 50} y={ep.y - 28} width="100" height="22">
                            <div className="worldmap-label">{route.end}</div>
                        </foreignObject>
                    </g>
                )
            })}
        </svg>
    )
}
