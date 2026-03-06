const API_BASE = 'http://localhost:8000/api';

export async function fetchDashboardSummary() {
    const res = await fetch(`${API_BASE}/dashboard-summary`);
    return res.json();
}

export async function selectMode(shipment) {
    const res = await fetch(`${API_BASE}/select-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipment),
    });
    return res.json();
}

export async function scoreCarriers(shipment) {
    const res = await fetch(`${API_BASE}/score-carriers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipment),
    });
    return res.json();
}

export async function predictRisk(shipment) {
    const res = await fetch(`${API_BASE}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipment),
    });
    return res.json();
}

export async function optimizeAllocation(data) {
    const res = await fetch(`${API_BASE}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function whatIfAnalysis(data) {
    const res = await fetch(`${API_BASE}/what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function parseBid(bidText) {
    const res = await fetch(`${API_BASE}/parse-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid_text: bidText }),
    });
    return res.json();
}

export async function chatWithAgent(message) {
    const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    return res.json();
}

export async function fetchCarriers(mode = null) {
    const url = mode ? `${API_BASE}/carriers?mode=${mode}` : `${API_BASE}/carriers`;
    const res = await fetch(url);
    return res.json();
}

export async function fetchLanes(routeType = null) {
    const url = routeType ? `${API_BASE}/lanes?route_type=${routeType}` : `${API_BASE}/lanes`;
    const res = await fetch(url);
    return res.json();
}

export async function fetchShipments(limit = 20, mode = null) {
    let url = `${API_BASE}/shipments?limit=${limit}`;
    if (mode) url += `&mode=${mode}`;
    const res = await fetch(url);
    return res.json();
}
