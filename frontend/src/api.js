const API_BASE = 'http://localhost:8000/api';

export async function generatePlan(shipment) {
    const res = await fetch(`${API_BASE}/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipment),
    });
    return res.json();
}

export async function recomputePlan(shipment) {
    const res = await fetch(`${API_BASE}/recompute-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipment),
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
