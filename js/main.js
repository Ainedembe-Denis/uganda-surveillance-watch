// Uganda Surveillance Dashboard - Core Logic

let surveillanceData = [];
let mapInstance;

let chartsInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchSurveillanceWatchAPI();
    fetchMitreAttackAPI();
    fetchWikipediaSpywareAPI();
    loadIncidentsVertical();
});

// --- Map Logic ---
function initMap() {
    const mapContainer = document.getElementById('vendor-map');
    
    // Clear out any loading states or old content
    mapContainer.innerHTML = '';

    // Calculate exact dimensions to prevent off-center rendering
    const width = mapContainer.clientWidth || mapContainer.getBoundingClientRect().width;
    const height = mapContainer.clientHeight || 550;

    mapInstance = Globe()(mapContainer)
        .width(width)
        .height(height)
        .backgroundColor('rgba(0,0,0,0)') // Transparent to allow CSS radial gradient to show through
        .showGlobe(true)
        // Using Blue Marble for realistic oceans and continents
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .pointOfView({ lat: 1.3733, lng: 32.2903, altitude: 2.0 }) // Centered on Uganda
        .arcColor(() => '#38bdf8')
        .arcAltitude(null)
        .arcAltitudeAutoScale(0.2)
        .arcStroke(0.4)
        .arcDashLength(0.9)
        .arcDashGap(0.1)
        .arcDashAnimateTime(2000)
        .arcsTransitionDuration(1000)
        .pointAltitude(0.01)
        .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.2)')
        .polygonCapColor(() => 'rgba(0,0,0,0)')
        .polygonSideColor(() => 'rgba(0,0,0,0)');

    // Cyber atmosphere glow
    mapInstance.showAtmosphere(true).atmosphereColor('#38bdf8').atmosphereAltitude(0.15);
    
    // Disabled auto-rotate by default, but remains rotatable by cursor
    mapInstance.controls().autoRotate = false;
    mapInstance.controls().enableZoom = true;
    
    // Load Vector Country Borders for distinct demarcations overlaid on the realistic globe
    fetch('https://unpkg.com/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(countries => {
            mapInstance.polygonsData(countries.features);
        })
        .catch(err => console.error("Could not load country polygons:", err));

    // Handle window resize to keep globe centered
    window.addEventListener('resize', () => {
        mapInstance.width(mapContainer.clientWidth);
        mapInstance.height(mapContainer.clientHeight);
    });
}

function renderMapPins(entities) {
    const ugandaCoords = { lat: 1.3733, lng: 32.2903 };
    
    const arcsData = [];
    // Anchor Uganda point
    const pointsData = [
        { lat: ugandaCoords.lat, lng: ugandaCoords.lng, name: '<b>Target Area: Uganda</b><br>Focus of empirical research', color: '#fbbf24', radius: 1.2 }
    ];

    entities.forEach(entity => {
        if (entity.headquarters && entity.headquarters.latitude && entity.headquarters.longitude) {
            const hqLat = entity.headquarters.latitude;
            const hqLng = entity.headquarters.longitude;
            const targetsUganda = entity.providingTo && entity.providingTo.some(c => c.name === 'Uganda');
            
            const typeStr = entity.types && entity.types.length > 0 ? entity.types.map(t => t.name).join(', ') : 'Vendor';
            
            pointsData.push({
                lat: hqLat,
                lng: hqLng,
                name: `<b>${entity.name}</b><br>${entity.headquarters.name}<br><i>${typeStr}</i>`,
                color: targetsUganda ? '#ef4444' : '#1e3a8a',
                radius: targetsUganda ? 0.6 : 0.4
            });

            if (targetsUganda) {
                arcsData.push({
                    startLat: hqLat,
                    startLng: hqLng,
                    endLat: ugandaCoords.lat,
                    endLng: ugandaCoords.lng
                });
            }
        }
    });

    mapInstance.arcsData(arcsData);
    mapInstance.pointsData(pointsData)
        .pointColor('color')
        .pointRadius('radius')
        .pointLabel('name');
}

// --- Live API & Encyclopedia Logic ---
async function fetchSurveillanceWatchAPI() {
    const container = document.getElementById('spyware-list');
    container.innerHTML = '<div class="loading-state">Downloading Intelligence Feed...</div>';
    
    let data;
    try {
        const localResponse = await fetch('data/surveillance_entities.json');
        if (localResponse.ok) {
            data = await localResponse.json();
        } else {
            const response = await fetch('https://www.surveillancewatch.io/api/v1/entities');
            if (!response.ok) throw new Error('Network response was not ok');
            data = await response.json();
        }
    } catch (e) {
        // Fallback to CORS proxy
        try {
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://www.surveillancewatch.io/api/v1/entities');
            const proxyResponse = await fetch(proxyUrl);
            data = await proxyResponse.json();
        } catch (e2) {
            container.innerHTML = '<div class="loading-state" style="color:red">Failed to load data.</div>';
            return;
        }
    }

    surveillanceData = data.items;
    
    // Custom Sorting: Prioritize Uganda, then neighbors, then rest
    surveillanceData.sort((a, b) => {
        const aUganda = a.providingTo && a.providingTo.some(c => c.name === 'Uganda') ? 1 : 0;
        const bUganda = b.providingTo && b.providingTo.some(c => c.name === 'Uganda') ? 1 : 0;
        
        if (aUganda !== bUganda) return bUganda - aUganda; // Uganda targeting at the top
        
        // Secondary sort: Neighbors (Kenya, Rwanda, Tanzania)
        const neighbors = ['Kenya', 'Rwanda', 'Tanzania'];
        const aNeighbor = a.providingTo && a.providingTo.some(c => neighbors.includes(c.name)) ? 1 : 0;
        const bNeighbor = b.providingTo && b.providingTo.some(c => neighbors.includes(c.name)) ? 1 : 0;
        
        if (aNeighbor !== bNeighbor) return bNeighbor - aNeighbor;
        
        return a.name.localeCompare(b.name); // Alphabetical for the rest
    });

    renderEncyclopedia(surveillanceData);
    renderMapPins(surveillanceData);
}

// Helper to clean UTF-8 encoding artifacts from API text
function sanitizeText(str) {
    if (!str) return '';
    try {
        const txt = document.createElement('textarea');
        txt.innerHTML = str;
        return txt.value
            .replace(/\u2013/g, '\u2013').replace(/\u2018/g, "'")
            .replace(/\u2019/g, "'").replace(/\u201C/g, '"')
            .replace(/\u201D/g, '"').replace(/\u2026/g, '...')
            .replace(/[\u0080-\u009F]/g, '');
    } catch(e) { return str; }
}

function renderEncyclopedia(entities) {
    const container = document.getElementById('spyware-list');
    container.innerHTML = '';

    entities.forEach((item, index) => {
        const targetsUganda = item.providingTo && item.providingTo.some(c => c.name === 'Uganda');
        const hq = item.headquarters ? item.headquarters.name : 'Unknown HQ';
        
        let desc = 'No description available.';
        if (item.description && item.description.root && item.description.root.children) {
            try { desc = sanitizeText(item.description.root.children[0].children[0].text); } catch(e) {}
        }

        const div = document.createElement('div');
        div.className = 'list-item';
        div.onclick = () => openModal(index);
        
        div.innerHTML = `
            <div class="item-header">
                <div class="item-title">${item.name}</div>
                <div class="item-meta">${hq}</div>
            </div>
            <div class="item-desc">${desc}</div>
            ${targetsUganda ? '<div class="alert-tag">Linked to Uganda</div>' : ''}
        `;
        container.appendChild(div);
    });
}

// --- Modal Logic ---
function openModal(entityIndex) {
    const item = surveillanceData[entityIndex];
    if (!item) return;

    document.getElementById('modalTitle').innerText = item.name;
    
    const typeStr = item.types && item.types.length > 0 ? item.types.map(t => t.name).join(', ') : 'Vendor';
    const hq = item.headquarters ? item.headquarters.name : 'Unknown HQ';
    document.getElementById('modalMeta').innerText = `HQ: ${hq} | Classification: ${typeStr}`;

    const targetsUganda = item.providingTo && item.providingTo.some(c => c.name === 'Uganda');
    const alertBox = document.getElementById('modalAlert');
    if (targetsUganda) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `<strong>Relevant to Chapter 4:</strong> This vendor is explicitly documented as providing surveillance capabilities to Uganda.`;
    } else {
        alertBox.style.display = 'none';
    }

    let desc = 'No detailed description available.';
    if (item.description && item.description.root && item.description.root.children) {
        try { desc = item.description.root.children[0].children[0].text; } catch(e) {}
    }
    document.getElementById('modalDesc').innerText = desc;

    // Sanitize description
    if (item.description && item.description.root && item.description.root.children) {
        try { desc = sanitizeText(item.description.root.children[0].children[0].text); } catch(e) {}
    }

    // Targets list -- hide if no data
    const targetsSection = document.getElementById('modalTargetsSection');
    const targetsList = document.getElementById('modalTargets');
    targetsList.innerHTML = '';
    if (item.providingTo && item.providingTo.length > 0) {
        item.providingTo.forEach(t => {
            const li = document.createElement('li');
            li.innerText = t.name;
            if (t.name === 'Uganda') li.style.fontWeight = 'bold';
            targetsList.appendChild(li);
        });
        if (targetsSection) targetsSection.style.display = 'block';
    } else {
        if (targetsSection) targetsSection.style.display = 'none';
    }

    // Funders list -- hide if no data
    const fundersSection = document.getElementById('modalFundersSection');
    const fundersList = document.getElementById('modalFunders');
    fundersList.innerHTML = '';
    if (item.funders && item.funders.length > 0) {
        item.funders.forEach(f => {
            const li = document.createElement('li');
            li.innerText = f.name;
            fundersList.appendChild(li);
        });
        if (fundersSection) fundersSection.style.display = 'block';
    } else {
        if (fundersSection) fundersSection.style.display = 'none';
    }

    document.getElementById('entityModal').classList.add('active');
}

function closeModal() {
    document.getElementById('entityModal').classList.remove('active');
}

// Close modal on outside click
document.getElementById('entityModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('entityModal')) closeModal();
});

// --- MITRE ATT&CK Logic ---
async function fetchMitreAttackAPI() {
    const container = document.getElementById('mitre-list');
    try {
        const response = await fetch('https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json');
        if (!response.ok) throw new Error('MITRE fetch failed');
        const data = await response.json();
        
        const techniques = data.objects.filter(obj => obj.type === 'attack-pattern');
        const keywords = ['spyware', 'surveillance', 'screen capture', 'audio capture', 'location tracking', 'exfiltration', 'keylog', 'microphone'];
        
        const relevant = techniques.filter(t => {
            const n = t.name.toLowerCase();
            const d = t.description ? t.description.toLowerCase() : '';
            return keywords.some(k => n.includes(k) || d.includes(k));
        });

        container.innerHTML = '';
        relevant.slice(0, 20).forEach(t => {
            const id = t.external_references?.find(ref => ref.source_name === 'mitre-attack')?.external_id || '';
            const desc = t.description ? t.description.substring(0, 150) + '...' : '';
            const url = t.external_references[0].url;
            
            const div = document.createElement('div');
            div.className = 'list-item';
            div.onclick = () => window.open(url, '_blank');
            div.innerHTML = `
                <div class="item-header">
                    <div class="item-title">${id}: ${t.name}</div>
                </div>
                <div class="item-desc">${desc}</div>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = '<div class="loading-state" style="color:red">Failed to load MITRE data.</div>';
    }
}

// --- Wikipedia Spyware List Logic ---
async function fetchWikipediaSpywareAPI() {
    const container = document.getElementById('wiki-list');
    try {
        // Step 1: Fetch the links from the page
        const listResponse = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_spyware_programs&prop=links&format=json&origin=*');
        if (!listResponse.ok) throw new Error('Wiki fetch failed');
        const listData = await listResponse.json();
        
        // Filter out meta-namespaces and generic terms discovered during browser testing
        const genericTerms = [
            'malware', 'spyware', 'rootkit', 'adware', 'trojan', 'facebook', 'google account', 
            'web search engine', 'domain name system', 'wayback machine', 'settlement (litigation)', 
            'pop-up window', 'hosts file', 'international mobile subscriber identity', 'coercion', 
            'complaint', 'divx', 'kazaa', 'magicjack', 'movieland', 'state attorney general', 
            'washington (state)', 'weatherbug', 'wildtangent', 'federal trade commission',
            'adguard', 'broadcom inc.', 'better business bureau', 'class action', 'electronic frontier foundation',
            'internet service provider', 'ip address', 'keylogger', 'mac address', 'phishing', 'ransomware',
            'smartphone', 'social engineering (security)', 'software bug', 'software update', 'united states department of justice'
        ];
        
        let validTitles = listData.parse.links
            .filter(link => link.ns === 0 && !genericTerms.some(term => link['*'].toLowerCase() === term))
            .map(link => link['*'])
            .slice(0, 20); // API limit for titles is 50, we take 20 for safety/speed
            
        if (validTitles.length === 0) {
            container.innerHTML = '<div>No records found.</div>';
            return;
        }

        // Step 2: Fetch the extracts for these specific titles
        const titlesQuery = validTitles.map(encodeURIComponent).join('|');
        // Critical: Must use exintro=1 and exlimit=max to get extracts for multiple pages at once. exsentences limits the API to 1 page!
        const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exlimit=max&titles=${titlesQuery}&format=json&origin=*`;
        
        const extractResponse = await fetch(extractUrl);
        const extractData = await extractResponse.json();
        
        const pages = Object.values(extractData.query.pages);
        
        container.innerHTML = '';

        // Render the list
        pages.forEach(item => {
            // Some pages might not have extracts if they are redirects or empty
            if (!item.extract || item.extract.length < 10) return;
            
            const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`;
            
            const div = document.createElement('div');
            div.className = 'list-item';
            div.onclick = () => window.open(url, '_blank');
            div.innerHTML = `
                <div class="item-header">
                    <div class="item-title">${item.title}</div>
                </div>
                <div class="item-desc">${item.extract}</div>
            `;
            container.appendChild(div);
        });
        
        if (container.innerHTML === '') {
            container.innerHTML = '<div>No detailed records found.</div>';
        }
        
    } catch (e) {
        console.error("Wiki Error:", e);
        container.innerHTML = '<div class="loading-state" style="color:red">Failed to load Wikipedia data.</div>';
    }
}

// --- Local Curated Data ---
async function loadIncidents() {
    const container = document.getElementById('incident-timeline');
    if (!container) return;
    try {
        const response = await fetch('data/incidents.json');
        const incidents = await response.json();
        container.innerHTML = '';
        incidents.sort((a,b) => a.year - b.year).forEach(inc => {
            const div = document.createElement('div');
            div.className = 'timeline-event';
            div.innerHTML = `
                <div class="t-year">${inc.year}</div>
                <div class="t-title">${inc.incident}</div>
                <div class="t-desc">${inc.description}</div>
                ${inc.link ? `<a href="${inc.link}" target="_blank" class="t-citation">Source: ${inc.source} ↗</a>` : `<div class="t-citation" style="color:var(--text-muted);text-decoration:none">Source: ${inc.source}</div>`}
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = '<div class="loading-state">Static incident data unavailable.</div>';
    }
}

async function loadSurveyCharts() {
    try {
        const response = await fetch('data/survey.json');
        const data = await response.json();
        
        // Register the DataLabels plugin
        Chart.register(ChartDataLabels);
        
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#64748b';

        new Chart(document.getElementById('privacyConcernChart'), {
            type: 'doughnut',
            data: {
                labels: data.privacy_concern.labels,
                datasets: [{
                    data: data.privacy_concern.data,
                    backgroundColor: ['#1e3a8a', '#0f766e', '#cbd5e1', '#e2e8f0'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: { 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'right', labels: { boxWidth: 12 } },
                    datalabels: {
                        color: '#ffffff',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value * 100 / sum).toFixed(0) + "%";
                            // Only show label if slice is big enough
                            return value > 10 ? percentage : null;
                        }
                    }
                } 
            }
        });

        new Chart(document.getElementById('adaptationChart'), {
            type: 'bar',
            data: {
                labels: data.behavioral_adaptation.labels,
                datasets: [{
                    label: '% of Respondents',
                    data: data.behavioral_adaptation.data,
                    backgroundColor: '#0f766e',
                    borderRadius: 4
                }]
            },
            options: { 
                indexAxis: 'y', 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        color: '#0f766e',
                        anchor: 'end',
                        align: 'end',
                        font: { weight: 'bold', size: 11 },
                        formatter: (value) => value + '%'
                    }
                },
                scales: { 
                    x: { grid: { display: false }, max: 100 }, 
                    y: { grid: { display: false } } 
                },
                layout: {
                    padding: { right: 40 } // Give space for the labels
                }
            }
        });
    } catch (e) {
        console.error("Survey load error:", e);
    }
}

// --- Dynamic Tab Switching & Rendering ---
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(`tab-${tabId}`).classList.add('active');
    // Activate selected tab button
    document.getElementById(`btn-${tabId}`).classList.add('active');
    
    // Perform tab-specific activations
    if (tabId === 'threats') {
        // Force the 3D Globe map to resize and re-center inside its column container
        setTimeout(() => {
            if (mapInstance) {
                const mapContainer = document.getElementById('vendor-map');
                const width = mapContainer.clientWidth || mapContainer.getBoundingClientRect().width;
                const height = mapContainer.clientHeight || 550;
                mapInstance.width(width).height(height);
            }
            window.dispatchEvent(new Event('resize'));
        }, 120);
    } else if (tabId === 'survey') {
        // Dynamically initialize Chart.js charts to avoid 0-width hidden canvas rendering issue
        if (!chartsInitialized) {
            loadSurveyCharts();
            chartsInitialized = true;
        }
    }
}

// --- Vertical Academic Timeline Loader ---
async function loadIncidentsVertical() {
    const container = document.getElementById('incident-timeline-vertical');
    if (!container) return;
    try {
        const response = await fetch('data/incidents.json');
        const incidents = await response.json();
        container.innerHTML = '';
        incidents.sort((a, b) => b.year - a.year).forEach(inc => {
            const item = document.createElement('div');
            item.className = 'timeline-item-vertical';
            item.innerHTML = `
                <div class="timeline-content-vertical">
                    <span class="t-year">${inc.year}</span>
                    <h3 class="t-title">${inc.incident}</h3>
                    <p class="t-desc">${inc.description}</p>
                    ${inc.link ? `<a href="${inc.link}" target="_blank" class="t-citation">Source: ${inc.source} ↗</a>` : `<span style="color:var(--text-muted);font-size:0.75rem;font-weight:600;">Source: ${inc.source}</span>`}
                </div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        console.error("Timeline vertical error:", e);
        container.innerHTML = '<div class="loading-state" style="color:red">Failed to load timeline data.</div>';
    }
}

