import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

// ─── City Coordinates ────────────────────────────────────────────────
const CITY_COORDS = {
    // Indian Metros
    Mumbai: [19.0760, 72.8777],
    Delhi: [28.7041, 77.1025],
    Chennai: [13.0827, 80.2707],
    Kolkata: [22.5726, 88.3639],
    Bangalore: [12.9716, 77.5946],
    Hyderabad: [17.3850, 78.4867],
    // Tier-1
    Ahmedabad: [23.0225, 72.5714],
    Pune: [18.5204, 73.8567],
    Jaipur: [26.9124, 75.7873],
    Lucknow: [26.8467, 80.9462],
    Kanpur: [26.4499, 80.3319],
    Surat: [21.1702, 72.8311],
    Nagpur: [21.1458, 79.0882],
    Indore: [22.7196, 75.8577],
    Bhopal: [23.2599, 77.4126],
    Patna: [25.6093, 85.1376],
    Vadodara: [22.3072, 73.1812],
    Ludhiana: [30.9010, 75.8573],
    // Tier-2
    Coimbatore: [11.0168, 76.9558],
    Visakhapatnam: [17.6868, 83.2185],
    Kochi: [9.9312, 76.2673],
    Mangalore: [12.9141, 74.8560],
    Mysore: [12.2958, 76.6394],
    Thiruvananthapuram: [8.5241, 76.9366],
    Guwahati: [26.1445, 91.7362],
    Chandigarh: [30.7333, 76.7794],
    Dehradun: [30.3165, 78.0322],
    Ranchi: [23.3441, 85.3096],
    Raipur: [21.2514, 81.6296],
    Bhubaneswar: [20.2961, 85.8245],
    Goa: [15.2993, 74.1240],
    Amritsar: [31.6340, 74.8723],
    Jodhpur: [26.2389, 73.0243],
    Udaipur: [24.5854, 73.7125],
    Varanasi: [25.3176, 82.9739],
    Agra: [27.1767, 78.0081],
    Rajkot: [22.3039, 70.8022],
    Nashik: [20.0063, 73.7897],
    Aurangabad: [19.8762, 75.3433],
    Madurai: [9.9252, 78.1198],
    Vijayawada: [16.5062, 80.6480],
    Jammu: [32.7266, 74.8570],
    Srinagar: [34.0837, 74.7973],
    // International
    Shanghai: [31.2304, 121.4737],
    Hamburg: [53.5511, 9.9937],
    Dubai: [25.2048, 55.2708],
    Singapore: [1.3521, 103.8198],
    Rotterdam: [51.9244, 4.4777],
    London: [51.5074, -0.1278],
    'New York': [40.7128, -74.0060],
    'Los Angeles': [34.0522, -118.2437],
    Tokyo: [35.6762, 139.6503],
    Sydney: [-33.8688, 151.2093],
    'São Paulo': [-23.5505, -46.6333],
    Lagos: [6.5244, 3.3792],
    Nairobi: [-1.2921, 36.8219],
    Istanbul: [41.0082, 28.9784],
    Bangkok: [13.7563, 100.5018],
    'Hong Kong': [22.3193, 114.1694],
    Colombo: [6.9271, 79.8612],
    Dhaka: [23.8103, 90.4125],
    Karachi: [24.8607, 67.0011],
    Jeddah: [21.4858, 39.1925],
}

// Airport coordinates
const AIRPORTS = {
    Mumbai: [19.0896, 72.8656],
    Delhi: [28.5562, 77.1000],
    Chennai: [12.9941, 80.1709],
    Kolkata: [22.6547, 88.4467],
    Bangalore: [13.1986, 77.7066],
    Hyderabad: [17.2403, 78.4294],
    Kochi: [10.1520, 76.3920],
    Ahmedabad: [23.0773, 72.6347],
    Pune: [18.5822, 73.9197],
    Goa: [15.3808, 73.8314],
    Jaipur: [26.8242, 75.8122],
    Dubai: [25.2532, 55.3657],
    Singapore: [1.3644, 103.9915],
    Shanghai: [31.1443, 121.8083],
    Hamburg: [53.6304, 9.9882],
    Rotterdam: [51.9569, 4.4372],
}

// Railway station names for overlay
const RAILWAY_STATIONS = {
    Mumbai: 'Chhatrapati Shivaji Maharaj Terminus',
    Delhi: 'New Delhi Railway Station',
    Chennai: 'Chennai Central',
    Kolkata: 'Howrah Junction',
    Bangalore: 'Bangalore City Junction',
    Hyderabad: 'Secunderabad Junction',
    Jaipur: 'Jaipur Junction',
    Lucknow: 'Lucknow Charbagh',
    Ahmedabad: 'Ahmedabad Junction',
    Pune: 'Pune Junction',
    Nagpur: 'Nagpur Junction',
    Bhopal: 'Bhopal Junction',
    Patna: 'Patna Junction',
    Kanpur: 'Kanpur Central',
}

const MODE_COLORS = {
    road: '#C4841D',
    rail: '#2D8659',
    air: '#805AD5',
    ocean: '#2B6CB0',
}

const MODE_ICONS = {
    road: '🛣️',
    rail: '🚂',
    air: '✈️',
    ocean: '🚢',
}


// ─── Haversine distance ──────────────────────────────────────────────
function getDistance(a, b) {
    const R = 6371
    const dLat = (b[0] - a[0]) * Math.PI / 180
    const dLng = (b[1] - a[1]) * Math.PI / 180
    const lat1 = a[0] * Math.PI / 180
    const lat2 = b[0] * Math.PI / 180
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// ─── Generate curved geodesic arc points ─────────────────────────────
function geodesicArc(start, end, numPoints = 80) {
    const toRad = d => d * Math.PI / 180
    const toDeg = r => r * 180 / Math.PI

    const lat1 = toRad(start[0]), lng1 = toRad(start[1])
    const lat2 = toRad(end[0]), lng2 = toRad(end[1])

    const d = 2 * Math.asin(Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
    ))

    const points = []
    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints
        const A = Math.sin((1 - f) * d) / Math.sin(d)
        const B = Math.sin(f * d) / Math.sin(d)
        const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2)
        const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2)
        const z = A * Math.sin(lat1) + B * Math.sin(lat2)
        points.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))])
    }
    return points
}

// ─── Custom marker icon (SVG circle) ─────────────────────────────────
function createCityIcon(letter, color) {
    return L.divIcon({
        className: 'route-map-marker',
        html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${color};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:13px;font-family:inherit;
      border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${letter}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    })
}


// ─── RouteMap Component ──────────────────────────────────────────────
export default function RouteMap({ origin, destination, mode, transitTime }) {
    const mapContainerRef = useRef(null)
    const mapRef = useRef(null)
    const [routeInfo, setRouteInfo] = useState(null)
    const [mapStatus, setMapStatus] = useState('loading')

    useEffect(() => {
        if (!mapContainerRef.current) return

        // Clean up previous map
        if (mapRef.current) {
            mapRef.current.remove()
            mapRef.current = null
        }

        const originCoords = CITY_COORDS[origin]
        const destCoords = CITY_COORDS[destination]

        if (!originCoords || !destCoords) {
            setMapStatus('error')
            return
        }

        // Create map
        const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            attributionControl: true,
        })

        // Use OpenStreetMap tiles (free, no API key)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map)

        mapRef.current = map

        // Add city markers
        L.marker(originCoords, { icon: createCityIcon('O', '#1a1a1a') })
            .addTo(map).bindPopup(`<b>${origin}</b><br/>Origin`)
        L.marker(destCoords, { icon: createCityIcon('D', MODE_COLORS[mode] || '#1a1a1a') })
            .addTo(map).bindPopup(`<b>${destination}</b><br/>Destination`)

        // Route based on mode
        switch (mode) {
            case 'road':
                drawRoadRoute(map, originCoords, destCoords)
                break
            case 'rail':
                drawRailRoute(map, originCoords, destCoords)
                break
            case 'air':
                drawAirRoute(map, originCoords, destCoords)
                break
            case 'ocean':
                drawOceanRoute(map, originCoords, destCoords)
                break
            default:
                drawFallback(map, originCoords, destCoords)
        }

        // Fit bounds
        const bounds = L.latLngBounds([originCoords, destCoords])
        map.fitBounds(bounds, { padding: [50, 50] })

        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
    }, [origin, destination, mode])


    // ── Road: fetch route from OSRM (free, no API key) ──
    const drawRoadRoute = async (map, from, to) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`
            const res = await fetch(url)
            const data = await res.json()

            if (data.code === 'Ok' && data.routes?.[0]) {
                const route = data.routes[0]
                const coords = route.geometry.coordinates.map(c => [c[1], c[0]])

                L.polyline(coords, {
                    color: MODE_COLORS.road,
                    weight: 5,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round',
                }).addTo(map)

                // Fit to route bounds
                const routeBounds = L.latLngBounds(coords)
                map.fitBounds(routeBounds, { padding: [50, 50] })

                const distKm = Math.round(route.distance / 1000)
                const durationHrs = Math.round(route.duration / 3600 * 10) / 10
                const days = Math.floor(durationHrs / 24)
                const hours = Math.round(durationHrs % 24)

                setRouteInfo({
                    distance: `${distKm.toLocaleString()} km`,
                    duration: days > 0 ? `${days}d ${hours}h` : `${hours}h`,
                    durationTraffic: transitTime,
                    status: 'Route Available',
                    statusClass: 'clear',
                })
                setMapStatus('ready')
            } else {
                throw new Error('No route')
            }
        } catch {
            drawFallback(map, from, to, MODE_COLORS.road)
            const dist = Math.round(getDistance(from, to))
            setRouteInfo({
                distance: `~${dist.toLocaleString()} km`,
                duration: transitTime,
                durationTraffic: null,
                status: 'Approximate Route',
                statusClass: 'moderate',
            })
            setMapStatus('fallback')
        }
    }


    // ── Rail: simulated railway route (straight line through waypoints) ──
    const drawRailRoute = (map, from, to) => {
        // Railway routes roughly follow highway corridors — approximate with intermediate points
        const midLat = (from[0] + to[0]) / 2
        const midLng = (from[1] + to[1]) / 2
        // Slight curve to simulate rail path
        const offsetLat = (to[1] - from[1]) * 0.04
        const offsetLng = -(to[0] - from[0]) * 0.04

        const railPath = [
            from,
            [from[0] + (midLat - from[0]) * 0.4 + offsetLat * 0.5, from[1] + (midLng - from[1]) * 0.4 + offsetLng * 0.5],
            [midLat + offsetLat, midLng + offsetLng],
            [to[0] - (to[0] - midLat) * 0.4 + offsetLat * 0.5, to[1] - (to[1] - midLng) * 0.4 + offsetLng * 0.5],
            to,
        ]

        // Rail track style (dashed)
        L.polyline(railPath, {
            color: MODE_COLORS.rail,
            weight: 5,
            opacity: 0.85,
            dashArray: '12, 8',
            lineCap: 'round',
        }).addTo(map)

        // Add rail station markers
        const originStation = RAILWAY_STATIONS[origin] || `${origin} Station`
        const destStation = RAILWAY_STATIONS[destination] || `${destination} Station`

        L.circleMarker(from, { radius: 8, color: MODE_COLORS.rail, fillColor: '#fff', fillOpacity: 1, weight: 3 })
            .addTo(map).bindPopup(`<b>🚉 ${originStation}</b>`)
        L.circleMarker(to, { radius: 8, color: MODE_COLORS.rail, fillColor: '#fff', fillOpacity: 1, weight: 3 })
            .addTo(map).bindPopup(`<b>🚉 ${destStation}</b>`)

        const dist = Math.round(getDistance(from, to))
        setRouteInfo({
            distance: `~${dist.toLocaleString()} km`,
            duration: transitTime,
            durationTraffic: null,
            status: 'On Schedule',
            statusClass: 'clear',
            stations: `${originStation} → ${destStation}`,
        })
        setMapStatus('ready')
    }


    // ── Air: geodesic arc between airports ──
    const drawAirRoute = (map, from, to) => {
        const originAirport = AIRPORTS[origin] || from
        const destAirport = AIRPORTS[destination] || to

        // Draw geodesic arc
        const arcPoints = geodesicArc(originAirport, destAirport)
        L.polyline(arcPoints, {
            color: MODE_COLORS.air,
            weight: 3,
            opacity: 0.8,
            dashArray: '8, 6',
        }).addTo(map)

        // Airport markers
        L.circleMarker(originAirport, { radius: 7, color: MODE_COLORS.air, fillColor: '#fff', fillOpacity: 1, weight: 3 })
            .addTo(map).bindPopup(`<b>✈️ ${origin} Airport</b>`)
        L.circleMarker(destAirport, { radius: 7, color: MODE_COLORS.air, fillColor: '#fff', fillOpacity: 1, weight: 3 })
            .addTo(map).bindPopup(`<b>✈️ ${destination} Airport</b>`)

        // Plane icon at midpoint
        const mid = arcPoints[Math.floor(arcPoints.length / 2)]
        L.marker(mid, {
            icon: L.divIcon({
                className: 'route-map-plane',
                html: '<div style="font-size:24px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3))">✈️</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 14],
            }),
        }).addTo(map)

        const bounds = L.latLngBounds([originAirport, destAirport])
        map.fitBounds(bounds, { padding: [50, 50] })

        const dist = Math.round(getDistance(originAirport, destAirport))
        setRouteInfo({
            distance: `~${dist.toLocaleString()} km (direct)`,
            duration: transitTime,
            durationTraffic: null,
            status: 'Flight Route',
            statusClass: 'clear',
        })
        setMapStatus('ready')
    }


    // ── Ocean: curved sea route ──
    const drawOceanRoute = (map, from, to) => {
        const arcPoints = geodesicArc(from, to)
        L.polyline(arcPoints, {
            color: MODE_COLORS.ocean,
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 8',
        }).addTo(map)

        // Ship icon at midpoint
        const mid = arcPoints[Math.floor(arcPoints.length / 2)]
        L.marker(mid, {
            icon: L.divIcon({
                className: 'route-map-ship',
                html: '<div style="font-size:22px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3))">🚢</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            }),
        }).addTo(map)

        const dist = Math.round(getDistance(from, to))
        setRouteInfo({
            distance: `~${dist.toLocaleString()} km`,
            duration: transitTime,
            durationTraffic: null,
            status: 'Sea Route',
            statusClass: 'clear',
        })
        setMapStatus('ready')
    }


    // ── Fallback: straight dashed line ──
    const drawFallback = (map, from, to, color = '#999') => {
        L.polyline([from, to], {
            color,
            weight: 3,
            opacity: 0.5,
            dashArray: '6, 8',
        }).addTo(map)
    }


    const modeLabel = MODE_ICONS[mode] + ' ' + ({ road: 'Road', rail: 'Rail', air: 'Air', ocean: 'Ocean' }[mode] || mode)

    return (
        <div className="route-map-section">
            <div className="section-title">Route Overview</div>
            <div className="section-subtitle">{modeLabel} route from {origin} to {destination}</div>
            <div className="route-map-wrapper">
                <div ref={mapContainerRef} className="route-map-container" />

                {/* Floating Status Overlay */}
                {routeInfo && (
                    <div className="route-map-overlay">
                        <div className="map-overlay-title">{modeLabel} Route Summary</div>
                        <div className="map-overlay-grid">
                            <div className="map-overlay-item">
                                <span className="map-overlay-label">Distance</span>
                                <span className="map-overlay-value">{routeInfo.distance}</span>
                            </div>
                            <div className="map-overlay-item">
                                <span className="map-overlay-label">
                                    {routeInfo.durationTraffic ? 'Avg. Delivery' : 'Est. Transit'}
                                </span>
                                <span className="map-overlay-value">
                                    {routeInfo.durationTraffic || routeInfo.duration}
                                </span>
                            </div>
                            <div className="map-overlay-item">
                                <span className="map-overlay-label">Status</span>
                                <span className={`map-overlay-status ${routeInfo.statusClass}`}>
                                    {routeInfo.status}
                                </span>
                            </div>
                            {routeInfo.duration && routeInfo.durationTraffic && (
                                <div className="map-overlay-item">
                                    <span className="map-overlay-label">Route Time</span>
                                    <span className="map-overlay-value">{routeInfo.duration}</span>
                                </div>
                            )}
                            {routeInfo.stations && (
                                <div className="map-overlay-item full">
                                    <span className="map-overlay-label">Stations</span>
                                    <span className="map-overlay-value" style={{ fontSize: '0.7rem' }}>{routeInfo.stations}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Fallback / Error */}
                {mapStatus === 'fallback' && (
                    <div className="route-map-disclaimer">
                        ⚠️ Exact route unavailable — showing approximate path
                    </div>
                )}
                {mapStatus === 'error' && (
                    <div className="route-map-error">
                        <div className="route-map-error-icon">🗺️</div>
                        <div>City coordinates not available for this route.</div>
                    </div>
                )}
            </div>
        </div>
    )
}
