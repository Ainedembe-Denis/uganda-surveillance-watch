// Main JavaScript for Uganda Surveillance Watch Dashboard

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadSpywareEncyclopedia();
    loadIncidents();
    loadSurveyCharts();
    fetchSurveillanceWatchAPI();
});

// 1. Initialize Map
function initMap() {
    // Center on Uganda
    const map = L.map('vendor-map').setView([1.3733, 32.2903], 3);

    // Use a dark minimalist base map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Add target marker for Uganda
    const ugandaMarker = L.circleMarker([1.3733, 32.2903], {
        radius: 8,
        fillColor: "#f59e0b",
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    ugandaMarker.bindPopup("<b>Target: Uganda</b><br>Multiple documented spyware incidents.");

    // Add known vendor HQs (Static fallback while API loads)
    const vendors = [
        { name: "NSO Group (Pegasus)", coords: [31.5, 34.75], country: "Israel" },
        { name: "Gamma Group (FinFisher)", coords: [51.5, -0.12], country: "UK" },
        { name: "Intellexa (Predator)", coords: [37.98, 23.72], country: "Greece" },
        { name: "Huawei (Safe City)", coords: [22.54, 114.05], country: "China" }
    ];

    vendors.forEach(v => {
        const marker = L.circleMarker(v.coords, {
            radius: 5,
            fillColor: "#00d4ff",
            color: "#fff",
            weight: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        marker.bindPopup(`<b>Vendor: ${v.name}</b><br>HQ: ${v.country}`);

        // Draw line to Uganda
        const latlngs = [v.coords, [1.3733, 32.2903]];
        const polyline = L.polyline(latlngs, {
            color: 'rgba(0, 212, 255, 0.4)',
            weight: 2,
            dashArray: '5, 10'
        }).addTo(map);
    });
}

// 2. Fetch Live Data from Surveillance Watch API
async function fetchSurveillanceWatchAPI() {
    try {
        // Fetch entities. Using a proxy or local fallback if CORS fails.
        // For demonstration, we'll try direct fetch, but many APIs require backend proxies.
        console.log("Attempting to fetch live data from Surveillance Watch...");
        
        // Note: Direct fetch might hit CORS. If so, we rely on the curated JSON.
        const response = await fetch('https://www.surveillancewatch.io/api/v1/entities');
        if (!response.ok) throw new Error('API fetch failed');
        
        const data = await response.json();
        console.log("Successfully fetched Surveillance Watch data:", data.items.length, "entities");
        
        // We could dynamically add pins to the map here based on data.items
        // For now, we log it to prove live API integration works.

    } catch (error) {
        console.log("Live API fetch failed (likely CORS), relying on curated database.", error);
    }
}

// 3. Load Spyware Encyclopedia from Local JSON
async function loadSpywareEncyclopedia() {
    const container = document.getElementById('spyware-list');
    
    try {
        const response = await fetch('data/spyware.json');
        const spywareList = await response.json();
        
        container.innerHTML = ''; // Clear loading text
        
        spywareList.forEach(item => {
            const card = document.createElement('div');
            // Determine class based on type
            let typeClass = 'mercenary';
            if (item.type.toLowerCase().includes('stalker')) typeClass = 'stalkerware';
            if (item.type.toLowerCase().includes('law')) typeClass = 'law-enforcement';
            
            card.className = `spyware-card ${typeClass}`;
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title">${item.name}</div>
                    <div class="card-meta">${item.developer} | ${item.hq}</div>
                </div>
                <div class="card-desc">
                    <strong>Type:</strong> ${item.type}<br>
                    ${item.details}
                </div>
                <div class="uganda-context">
                    <strong>⚠️ Uganda Context:</strong> ${item.uganda_context}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = '<div class="loading" style="color:red">Error loading data. Ensure running via local server.</div>';
    }
}

// 4. Load Incident Timeline
async function loadIncidents() {
    const container = document.getElementById('incident-timeline');
    
    try {
        const response = await fetch('data/incidents.json');
        const incidents = await response.json();
        
        container.innerHTML = '';
        
        incidents.sort((a,b) => a.year - b.year).forEach(inc => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-year">${inc.year}</div>
                <div class="timeline-content">
                    <h3>${inc.incident}</h3>
                    <p><strong>Tool:</strong> ${inc.tool}</p>
                    <p><strong>Actor:</strong> ${inc.actor}</p>
                    <p>${inc.description}</p>
                    <p style="font-size:0.75rem; color:#00d4ff; margin-top:0.5rem">Source: ${inc.source}</p>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        container.innerHTML = '<div class="loading" style="color:red">Error loading timeline.</div>';
    }
}

// 5. Load Survey Data and Render Charts
async function loadSurveyCharts() {
    try {
        const response = await fetch('data/survey.json');
        const data = await response.json();
        
        // Chart default config for dark theme
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.1)';

        // Render Privacy Concern Chart (Doughnut)
        new Chart(document.getElementById('privacyConcernChart'), {
            type: data.privacy_concern.type,
            data: {
                labels: data.privacy_concern.labels,
                datasets: [{
                    data: data.privacy_concern.data,
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: data.privacy_concern.title, color: '#e2e8f0' },
                    legend: { position: 'bottom' }
                }
            }
        });

        // Render Adaptation Chart (Horizontal Bar)
        new Chart(document.getElementById('adaptationChart'), {
            type: data.behavioral_adaptation.type,
            data: {
                labels: data.behavioral_adaptation.labels,
                datasets: [{
                    label: '% of Respondents',
                    data: data.behavioral_adaptation.data,
                    backgroundColor: '#00d4ff',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: {
                    title: { display: true, text: data.behavioral_adaptation.title, color: '#e2e8f0' },
                    legend: { display: false }
                }
            }
        });

    } catch (error) {
        console.error("Error loading survey charts:", error);
    }
}
