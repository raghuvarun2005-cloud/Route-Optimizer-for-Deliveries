// Delivery Route Optimizer JavaScript - Google Maps Real-Time Traffic & Routing

let map = null;
let googleMap = null;
let googleTrafficLayer = null;
let isGoogleMapsActive = false;

let locationMarkers = {};
let roadPolylines = [];
let routePolyline = null;
let currentLocations = [];
let currentRoads = [];
let dashboardChartInstance = null;

// Animation & Re-routing state
let deliveryMarker = null;
let animationPolylineCoords = [];
let isAnimating = false;
let animationIndex = 0;
let animationReqId = null;
let currentRouteData = null;
let isManualStart = false;
let isManualDest = false;

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

async function initApp() {
    initNavigation();
    initLeafletMap();
    initGoogleMapsTrafficLayer();
    await loadLocations();
    await loadRoads();
    initOptimizerForm();
    initManualInputToggles();
    initGPSLocation();
    initPlaceSearchAutocomplete();
    initAnimationAndTrafficRerouteControls();
    initModals();
    initThemeToggle();

    renderMapNodes();
    renderMapRoads();
}

/* 1. NAVIGATION & TAB SWITCHING */
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item[data-tab]");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute("data-tab");

            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            document.querySelectorAll(".view-panel").forEach(panel => panel.classList.remove("active"));
            const targetPanel = document.getElementById(`view-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add("active");
            }

            if (targetTab === "optimizer" && map) {
                setTimeout(() => map.invalidateSize(), 200);
            } else if (targetTab === "dashboard") {
                loadDashboardData();
            } else if (targetTab === "locations") {
                loadLocationsTable();
            } else if (targetTab === "roads") {
                loadRoadsTable();
            } else if (targetTab === "orders") {
                loadOrdersTable();
            } else if (targetTab === "drivers") {
                loadDriversTable();
            } else if (targetTab === "traffic") {
                loadTrafficController();
            } else if (targetTab === "history") {
                loadHistoryTable();
            } else if (targetTab === "analytics") {
                loadAnalyticsCharts();
            }
        });
    });

    const toggleBtn = document.getElementById("toggleSidebar");
    const sidebar = document.getElementById("sidebar");
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });
    }
}

/* 2. LEAFLET MAP INITIALIZATION */
function initLeafletMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    map = L.map("map", {
        zoomControl: false
    }).setView([12.965, 77.605], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);
}

/* 3. GOOGLE MAPS REAL-TIME TRAFFIC LAYER INITIALIZATION */
function initGoogleMapsTrafficLayer() {
    const btnToggle = document.getElementById("btnToggleGmapsTraffic");
    const leafletMapContainer = document.getElementById("map");
    const googleMapContainer = document.getElementById("googleMap");

    if (!btnToggle) return;

    btnToggle.addEventListener("click", () => {
        isGoogleMapsActive = !isGoogleMapsActive;

        if (isGoogleMapsActive) {
            btnToggle.classList.add("active");
            btnToggle.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Switch to Leaflet View';
            leafletMapContainer.style.display = "none";
            googleMapContainer.style.display = "block";

            if (!googleMap && window.google && window.google.maps) {
                // Initialize Google Map with Real-Time Traffic Layer
                googleMap = new google.maps.Map(googleMapContainer, {
                    center: { lat: 12.965, lng: 77.605 },
                    zoom: 13,
                    mapId: "DEMO_MAP_ID",
                    disableDefaultUI: false,
                    zoomControl: true,
                    styles: [
                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] }
                    ]
                });

                // Attach Google Maps Real-Time Traffic Layer
                googleTrafficLayer = new google.maps.TrafficLayer();
                googleTrafficLayer.setMap(googleMap);
            }
        } else {
            btnToggle.classList.remove("active");
            btnToggle.innerHTML = '<i class="fa-solid fa-layer-group"></i> Google Real-Time Traffic';
            googleMapContainer.style.display = "none";
            leafletMapContainer.style.display = "block";
            if (map) setTimeout(() => map.invalidateSize(), 100);
        }
    });
}

/* 4. MANUAL INPUT TOGGLES */
function initManualInputToggles() {
    const btnStartToggle = document.getElementById("toggleManualStart");
    const btnDestToggle = document.getElementById("toggleManualDest");

    const startSelect = document.getElementById("startLocation");
    const startInput = document.getElementById("manualStartInput");

    const destSelect = document.getElementById("destLocation");
    const destInput = document.getElementById("manualDestInput");

    if (btnStartToggle && startSelect && startInput) {
        btnStartToggle.addEventListener("click", () => {
            isManualStart = !isManualStart;
            if (isManualStart) {
                startSelect.style.display = "none";
                startInput.style.display = "block";
                btnStartToggle.textContent = "Use Select Dropdown";
            } else {
                startSelect.style.display = "block";
                startInput.style.display = "none";
                btnStartToggle.textContent = "Enter Custom Text";
            }
        });
    }

    if (btnDestToggle && destSelect && destInput) {
        btnDestToggle.addEventListener("click", () => {
            isManualDest = !isManualDest;
            if (isManualDest) {
                destSelect.style.display = "none";
                destInput.style.display = "block";
                btnDestToggle.textContent = "Use Select Dropdown";
            } else {
                destSelect.style.display = "block";
                destInput.style.display = "none";
                btnDestToggle.textContent = "Enter Custom Text";
            }
        });
    }
}

/* 5. GPS & PLACE SEARCH AUTOCOMPLETE */
function initGPSLocation() {
    const btnGPS = document.getElementById("btnUseGPS");
    if (!btnGPS) return;

    btnGPS.addEventListener("click", () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        btnGPS.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locating GPS...';

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                try {
                    const res = await fetch("/api/locations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name: "My GPS Location",
                            address: `Current Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                            category: "Customer",
                            lat: lat,
                            lng: lng
                        })
                    });

                    const data = await res.json();
                    await loadLocations();
                    renderMapNodes();

                    const startSelect = document.getElementById("startLocation");
                    if (startSelect && data.id) {
                        startSelect.value = data.id;
                    }

                    map.setView([lat, lng], 15);
                    btnGPS.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i> Location Set!';
                    setTimeout(() => {
                        btnGPS.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Use GPS Location';
                    }, 3000);
                } catch (err) {
                    btnGPS.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Use GPS Location';
                }
            },
            () => {
                alert("GPS Permission denied. Using default node network.");
                btnGPS.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Use GPS Location';
            }
        );
    });
}

function initPlaceSearchAutocomplete() {
    const input = document.getElementById("placeSearchInput");
    const dropdown = document.getElementById("searchResultsDropdown");
    const btnClear = document.getElementById("btnClearSearch");

    if (!input || !dropdown) return;

    let debounceTimer = null;

    input.addEventListener("input", () => {
        const query = input.value.trim();
        if (btnClear) btnClear.style.display = query ? "block" : "none";

        if (query.length < 3) {
            dropdown.style.display = "none";
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchPlacesFromNominatim(query);
        }, 400);
    });

    if (btnClear) {
        btnClear.addEventListener("click", () => {
            input.value = "";
            dropdown.style.display = "none";
            btnClear.style.display = "none";
        });
    }

    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}

async function fetchPlacesFromNominatim(query) {
    const dropdown = document.getElementById("searchResultsDropdown");
    dropdown.innerHTML = '<div class="search-item"><i class="fa-solid fa-spinner fa-spin"></i> Searching place...</div>';
    dropdown.style.display = "block";

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`;
        const res = await fetch(url);
        const results = await res.json();

        if (!results || results.length === 0) {
            dropdown.innerHTML = '<div class="search-item">No places found.</div>';
            return;
        }

        dropdown.innerHTML = results.map(item => `
            <div class="search-item" onclick="selectSearchedPlace('${escapeQuotes(item.display_name)}', ${item.lat}, ${item.lon})">
                <i class="fa-solid fa-location-dot text-danger"></i>
                <div>
                    <strong>${escapeQuotes(item.display_name.split(',')[0])}</strong><br>
                    <small style="color: var(--text-muted);">${escapeQuotes(item.display_name)}</small>
                </div>
            </div>
        `).join("");
    } catch (err) {
        dropdown.innerHTML = '<div class="search-item">Search error.</div>';
    }
}

function escapeQuotes(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function selectSearchedPlace(displayName, lat, lng) {
    const dropdown = document.getElementById("searchResultsDropdown");
    dropdown.style.display = "none";

    const shortName = displayName.split(',')[0].trim();

    try {
        const res = await fetch("/api/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: shortName,
                address: displayName,
                category: "Customer",
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            })
        });

        const newLoc = await res.json();
        await loadLocations();
        renderMapNodes();

        const destSelect = document.getElementById("destLocation");
        if (destSelect && newLoc.id) {
            destSelect.value = newLoc.id;
        }

        map.setView([lat, lng], 15);
        alert(`📍 Set "${shortName}" as destination!`);
    } catch (err) {
        console.error("Error adding place location:", err);
    }
}

/* 6. API DATA FETCHING */
async function loadLocations() {
    try {
        const res = await fetch("/api/locations");
        currentLocations = await res.json();
        populateLocationSelects(currentLocations);
        return currentLocations;
    } catch (err) {
        console.error("Failed to load locations:", err);
    }
}

async function loadRoads() {
    try {
        const res = await fetch("/api/roads");
        currentRoads = await res.json();
        return currentRoads;
    } catch (err) {
        console.error("Failed to load roads:", err);
    }
}

function populateLocationSelects(locations) {
    const startSelect = document.getElementById("startLocation");
    const destSelect = document.getElementById("destLocation");

    if (!startSelect || !destSelect) return;

    startSelect.innerHTML = '<option value="">Select Start Point...</option>';
    destSelect.innerHTML = '<option value="">Select Destination...</option>';

    locations.forEach(loc => {
        const opt1 = document.createElement("option");
        opt1.value = loc.id;
        opt1.textContent = `${loc.name} (${loc.category})`;

        const opt2 = document.createElement("option");
        opt2.value = loc.id;
        opt2.textContent = `${loc.name} (${loc.category})`;

        startSelect.appendChild(opt1);
        destSelect.appendChild(opt2);
    });

    if (locations.length >= 4) {
        startSelect.value = locations[0].id;
        destSelect.value = locations[1].id;
    }
}

/* 7. MAP RENDERING */
function renderMapNodes() {
    if (!map) return;

    Object.values(locationMarkers).forEach(marker => map.removeLayer(marker));
    locationMarkers = {};

    currentLocations.forEach(loc => {
        const customIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `<div style="
                background-color: ${loc.category === 'Depot' ? '#f59e0b' : '#3b82f6'};
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
            "><i class="fa-solid ${loc.category === 'Depot' ? 'fa-warehouse' : 'fa-location-dot'}"></i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
            .bindPopup(`
                <div style="font-family: var(--font-family); padding: 4px;">
                    <strong style="color: #0f172a; font-size: 14px;">${loc.name}</strong><br>
                    <span style="color: #64748b; font-size: 12px;">${loc.address}</span><br>
                    <span class="badge badge-success" style="margin-top: 6px;">${loc.category}</span>
                </div>
            `)
            .addTo(map);

        locationMarkers[loc.id] = marker;
    });
}

function renderMapRoads() {
    if (!map) return;

    roadPolylines.forEach(pl => map.removeLayer(pl));
    roadPolylines = [];

    const locMap = {};
    currentLocations.forEach(l => locMap[l.id] = l);

    currentRoads.forEach(road => {
        const u = locMap[road.source_id];
        const v = locMap[road.target_id];

        if (u && v) {
            const isHeavyTraffic = road.traffic_multiplier >= 1.8;
            const polyline = L.polyline([[u.lat, u.lng], [v.lat, v.lng]], {
                color: isHeavyTraffic ? '#ef4444' : '#64748b',
                weight: isHeavyTraffic ? 4 : 2,
                opacity: isHeavyTraffic ? 0.9 : 0.4,
                dashArray: isHeavyTraffic ? null : '5, 8'
            }).addTo(map);

            polyline.bindTooltip(`${road.name}: ${road.distance_km} km (${road.traffic_multiplier}x traffic)`);
            roadPolylines.push(polyline);
        }
    });
}

/* 8. ROUTE OPTIMIZER FORM */
function initOptimizerForm() {
    const form = document.getElementById("optimizerForm");
    const btnReset = document.getElementById("btnReset");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            let startId = null;
            let destId = null;

            if (isManualStart) {
                const manualText = document.getElementById("manualStartInput").value.trim();
                if (!manualText) { alert("Please type a manual start address."); return; }
                startId = await geocodeAndCreateLocation(manualText, "Manual Start Point");
            } else {
                startId = parseInt(document.getElementById("startLocation").value);
            }

            if (isManualDest) {
                const manualText = document.getElementById("manualDestInput").value.trim();
                if (!manualText) { alert("Please type a manual destination address."); return; }
                destId = await geocodeAndCreateLocation(manualText, "Manual Destination Point");
            } else {
                destId = parseInt(document.getElementById("destLocation").value);
            }

            const vehicleType = document.getElementById("vehicleType").value;
            const avoidTraffic = document.getElementById("avoidTrafficToggle").checked;

            if (!startId || !destId) {
                alert("Please specify valid start and destination points.");
                return;
            }

            try {
                const response = await fetch("/api/optimize-route", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        start_id: startId,
                        destination_id: destId,
                        vehicle_type: vehicleType,
                        avoid_traffic: avoidTraffic,
                        optimize_by: "time"
                    })
                });

                const data = await response.json();

                if (data.found) {
                    currentRouteData = data;
                    renderOptimizedRouteOnMap(data);
                    renderRouteResultsCard(data);
                    showSwiggyTrackerCard(data);
                } else {
                    alert(data.message || "No accessible route found.");
                }
            } catch (err) {
                console.error("Error optimizing route:", err);
                alert("Failed to compute shortest path route.");
            }
        });
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            stopDeliveryBoyAnimation();
            if (routePolyline) {
                map.removeLayer(routePolyline);
                routePolyline = null;
            }
            document.getElementById("routeResultsCard").style.display = "none";
            document.getElementById("swiggyTrackerCard").style.display = "none";
            document.getElementById("trafficRerouteBanner").style.display = "none";
            map.setView([12.965, 77.605], 13);
        });
    }
}

async function geocodeAndCreateLocation(queryText, category) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&limit=1&countrycodes=in`;
        const res = await fetch(url);
        const results = await res.json();

        if (results && results.length > 0) {
            const place = results[0];
            const name = place.display_name.split(',')[0].trim();

            const createRes = await fetch("/api/locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name,
                    address: place.display_name,
                    category: category,
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lon)
                })
            });

            const newLoc = await createRes.json();
            await loadLocations();
            renderMapNodes();
            return newLoc.id;
        }
    } catch (err) {
        console.error("Geocoding manual address error:", err);
    }
    return 1;
}

function renderOptimizedRouteOnMap(routeData) {
    if (!map) return;

    if (routePolyline) {
        map.removeLayer(routePolyline);
    }

    const coords = routeData.coordinates;

    routePolyline = L.polyline(coords, {
        color: '#10b981',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(routePolyline.getBounds(), { padding: [60, 60] });
}

function renderRouteResultsCard(data) {
    const card = document.getElementById("routeResultsCard");
    if (!card) return;

    document.getElementById("resDistance").textContent = `${data.total_distance_km} km`;
    document.getElementById("resTime").textContent = `${data.total_time_mins} mins`;
    document.getElementById("resFuel").textContent = `${data.fuel_liters} L`;
    document.getElementById("resCO2").textContent = `${data.co2_kg} kg`;

    const list = document.getElementById("directionsList");
    list.innerHTML = "";

    data.directions.forEach(dir => {
        const li = document.createElement("li");
        li.innerHTML = dir;
        list.appendChild(li);
    });

    card.style.display = "block";
    card.scrollIntoView({ behavior: "smooth" });
}

/* 9. DYNAMIC MID-ROUTE TRAFFIC ANALYSIS & RE-ROUTING ENGINE */
function showSwiggyTrackerCard(data) {
    const tracker = document.getElementById("swiggyTrackerCard");
    if (!tracker) return;

    document.getElementById("liveETAMins").textContent = Math.ceil(data.total_time_mins);
    document.getElementById("liveStatusText").textContent = "Driving along optimal path...";
    document.getElementById("liveDistText").textContent = `Remaining: ${data.total_distance_km} km`;
    document.getElementById("deliveryProgressFill").style.width = "0%";

    document.getElementById("btnStartAnimation").style.display = "inline-flex";
    document.getElementById("btnPauseAnimation").style.display = "none";

    tracker.style.display = "flex";

    animationPolylineCoords = interpolatePolyline(data.coordinates, 250);
    animationIndex = 0;

    createOrUpdateDeliveryMarker(animationPolylineCoords[0]);
}

function initAnimationAndTrafficRerouteControls() {
    const btnStart = document.getElementById("btnStartAnimation");
    const btnPause = document.getElementById("btnPauseAnimation");
    const btnTrafficJam = document.getElementById("btnSimulateTrafficJam");
    const btnTriggerReroute = document.getElementById("btnTriggerMidDriveReroute");
    const btnLaunchDrive = document.getElementById("btnLaunchLiveDrive");

    if (btnStart) btnStart.addEventListener("click", startDeliveryBoyAnimation);
    if (btnPause) btnPause.addEventListener("click", pauseDeliveryBoyAnimation);
    if (btnLaunchDrive) {
        btnLaunchDrive.addEventListener("click", () => {
            showSwiggyTrackerCard(currentRouteData);
            startDeliveryBoyAnimation();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (btnTrafficJam) {
        btnTrafficJam.addEventListener("click", async () => {
            if (!currentRouteData || currentRouteData.path_nodes.length < 2) return;

            if (currentRoads.length > 0) {
                const targetRoad = currentRoads[0];
                await fetch(`/api/roads/${targetRoad.id}/traffic`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ traffic_multiplier: 3.0 })
                });

                await loadRoads();
                renderMapRoads();
            }

            const banner = document.getElementById("trafficRerouteBanner");
            if (banner) {
                document.getElementById("rerouteBannerText").textContent = "⚡ Severe Traffic Congestion (+14 min delay) detected on current road path!";
                banner.style.display = "flex";
            }
        });
    }

    if (btnTriggerReroute) {
        btnTriggerReroute.addEventListener("click", async () => {
            if (!currentRouteData || currentRouteData.path_nodes.length < 2) return;

            const midNodeId = currentRouteData.path_nodes[Math.floor(currentRouteData.path_nodes.length / 2)].id;
            const destNodeId = currentRouteData.path_nodes[currentRouteData.path_nodes.length - 1].id;

            try {
                const res = await fetch("/api/reroute-mid-drive", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        current_node_id: midNodeId,
                        destination_id: destNodeId,
                        vehicle_type: currentRouteData.vehicle_type,
                        avoid_traffic: true
                    })
                });

                const data = await res.json();
                if (data.new_route && data.new_route.found) {
                    currentRouteData = data.new_route;
                    renderOptimizedRouteOnMap(data.new_route);
                    renderRouteResultsCard(data.new_route);
                    showSwiggyTrackerCard(data.new_route);

                    document.getElementById("trafficRerouteBanner").style.display = "none";
                    alert("⚡ Dynamic Re-Routing Complete! Delivery vehicle re-routed via fast bypass road saving ~10 mins.");
                }
            } catch (err) {
                console.error("Re-routing error:", err);
            }
        });
    }
}

function createOrUpdateDeliveryMarker(latLng) {
    if (!map) return;

    const scooterIcon = L.divIcon({
        className: 'delivery-scooter-pin',
        html: `
            <div class="scooter-pulse-ring"></div>
            <div class="scooter-circle">
                <i class="fa-solid fa-truck-fast"></i>
            </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
    });

    if (!deliveryMarker) {
        deliveryMarker = L.marker(latLng, { icon: scooterIcon }).addTo(map);
    } else {
        deliveryMarker.setLatLng(latLng);
    }
}

function startDeliveryBoyAnimation() {
    if (animationPolylineCoords.length === 0) return;

    isAnimating = true;
    document.getElementById("btnStartAnimation").style.display = "none";
    document.getElementById("btnPauseAnimation").style.display = "inline-flex";

    animateFrame();
}

function pauseDeliveryBoyAnimation() {
    isAnimating = false;
    if (animationReqId) cancelAnimationFrame(animationReqId);

    document.getElementById("btnStartAnimation").style.display = "inline-flex";
    document.getElementById("btnPauseAnimation").style.display = "none";
}

function stopDeliveryBoyAnimation() {
    pauseDeliveryBoyAnimation();
    if (deliveryMarker) {
        map.removeLayer(deliveryMarker);
        deliveryMarker = null;
    }
}

function animateFrame() {
    if (!isAnimating) return;

    animationIndex += 1;

    if (animationIndex >= animationPolylineCoords.length) {
        animationIndex = animationPolylineCoords.length - 1;
        createOrUpdateDeliveryMarker(animationPolylineCoords[animationIndex]);

        document.getElementById("liveStatusText").textContent = "🎉 Delivery Completed!";
        document.getElementById("liveDistText").textContent = "Arrived at Destination Point";
        document.getElementById("liveETAMins").textContent = "0";
        document.getElementById("deliveryProgressFill").style.width = "100%";

        pauseDeliveryBoyAnimation();
        alert("🚚 Delivery partner has successfully arrived at the destination address!");
        return;
    }

    const currentLatLng = animationPolylineCoords[animationIndex];
    createOrUpdateDeliveryMarker(currentLatLng);

    const progressPct = Math.round((animationIndex / (animationPolylineCoords.length - 1)) * 100);
    document.getElementById("deliveryProgressFill").style.width = `${progressPct}%`;

    if (currentRouteData) {
        const remainingKm = (currentRouteData.total_distance_km * (1 - (progressPct / 100))).toFixed(1);
        const remainingMins = Math.ceil(currentRouteData.total_time_mins * (1 - (progressPct / 100)));

        document.getElementById("liveDistText").textContent = `Remaining: ${remainingKm} km`;
        document.getElementById("liveETAMins").textContent = Math.max(remainingMins, 1);
    }

    animationReqId = requestAnimationFrame(animateFrame);
}

function interpolatePolyline(coords, totalSteps) {
    if (coords.length < 2) return coords;

    const interpolated = [];
    const segments = coords.length - 1;
    const stepsPerSegment = Math.max(1, Math.floor(totalSteps / segments));

    for (let i = 0; i < segments; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];

        for (let s = 0; s < stepsPerSegment; s++) {
            const t = s / stepsPerSegment;
            const lat = p1[0] + (p2[0] - p1[0]) * t;
            const lng = p1[1] + (p2[1] - p1[1]) * t;
            interpolated.push([lat, lng]);
        }
    }

    interpolated.push(coords[coords.length - 1]);
    return interpolated;
}

/* 10. DASHBOARD & OTHER TAB LOADERS */
async function loadDashboardData() {
    try {
        const res = await fetch("/api/analytics");
        const analytics = await res.json();

        const grid = document.getElementById("dashMetrics");
        if (grid) {
            grid.innerHTML = `
                <div class="metric-card">
                    <div class="metric-icon icon-dist"><i class="fa-solid fa-box"></i></div>
                    <div class="metric-details">
                        <span class="metric-value">${analytics.total_orders}</span>
                        <span class="metric-label">Total Delivery Orders</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon icon-time"><i class="fa-solid fa-truck"></i></div>
                    <div class="metric-details">
                        <span class="metric-value">${analytics.active_drivers}</span>
                        <span class="metric-label">Active Fleet Drivers</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon icon-fuel"><i class="fa-solid fa-stopwatch"></i></div>
                    <div class="metric-details">
                        <span class="metric-value">${analytics.avg_route_time_mins} mins</span>
                        <span class="metric-label">Avg Route Duration</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon icon-co2"><i class="fa-solid fa-percent"></i></div>
                    <div class="metric-details">
                        <span class="metric-value">${analytics.efficiency_rate_pct}%</span>
                        <span class="metric-label">Network Efficiency Rate</span>
                    </div>
                </div>
            `;
        }

        renderDashboardChart();

        const nodesList = document.getElementById("dashNodesList");
        if (nodesList) {
            nodesList.innerHTML = currentLocations.map(loc => `
                <div style="padding: 10px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                    <div>
                        <strong>${loc.name}</strong><br>
                        <small style="color: var(--text-muted);">${loc.address}</small>
                    </div>
                    <span class="badge badge-success">${loc.category}</span>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error("Error loading dashboard data:", err);
    }
}

function renderDashboardChart() {
    const ctx = document.getElementById("dashboardChart");
    if (!ctx) return;

    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
    }

    dashboardChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'],
            datasets: [{
                label: 'Direct Road Time (Mins)',
                data: [35, 48, 40, 38, 52, 60, 42],
                backgroundColor: 'rgba(239, 68, 68, 0.6)'
            }, {
                label: 'Dijkstra Optimized Time (Mins)',
                data: [22, 28, 25, 24, 31, 35, 26],
                backgroundColor: 'rgba(16, 185, 129, 0.8)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

async function loadLocationsTable() {
    const tbody = document.getElementById("locationsTableBody");
    if (!tbody) return;

    const locs = await loadLocations();
    tbody.innerHTML = locs.map(l => `
        <tr>
            <td>${l.id}</td>
            <td><strong>${l.name}</strong></td>
            <td><span class="badge badge-success">${l.category}</span></td>
            <td>${l.address}</td>
            <td>${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}</td>
            <td>
                <button class="btn btn-outline" onclick="deleteLocationNode(${l.id})"><i class="fa-solid fa-trash text-danger"></i></button>
            </td>
        </tr>
    `).join("");
}

async function deleteLocationNode(id) {
    if (confirm("Are you sure you want to delete this location?")) {
        await fetch(`/api/locations/${id}`, { method: 'DELETE' });
        await loadLocations();
        await loadRoads();
        renderMapNodes();
        renderMapRoads();
        loadLocationsTable();
    }
}

async function loadRoadsTable() {
    const tbody = document.getElementById("roadsTableBody");
    if (!tbody) return;

    const roads = await loadRoads();
    tbody.innerHTML = roads.map(r => `
        <tr>
            <td>${r.id}</td>
            <td><strong>${r.name}</strong></td>
            <td>${r.source_name}</td>
            <td>${r.target_name}</td>
            <td>${r.distance_km} km</td>
            <td>${r.speed_limit_kph} km/h</td>
            <td><span class="${r.traffic_multiplier >= 1.8 ? 'text-danger' : 'text-success'}">${r.traffic_multiplier}x</span></td>
            <td>${r.is_one_way ? 'Yes' : 'No'}</td>
        </tr>
    `).join("");
}

async function loadOrdersTable() {
    const tbody = document.getElementById("ordersTableBody");
    if (!tbody) return;

    const res = await fetch("/api/orders");
    const orders = await res.json();

    tbody.innerHTML = orders.map(o => {
        let statusClass = "status-pending";
        if (o.status === "In Transit") statusClass = "status-transit";
        if (o.status === "Delivered") statusClass = "status-delivered";

        return `
            <tr>
                <td><strong>${o.order_code}</strong></td>
                <td>${o.customer_name}</td>
                <td>${o.destination_name}</td>
                <td>${o.weight_kg} kg</td>
                <td><span class="badge badge-success">${o.priority}</span></td>
                <td><span class="status-pill ${statusClass}">${o.status}</span></td>
                <td>${o.driver_name || 'Unassigned'}</td>
            </tr>
        `;
    }).join("");
}

async function loadDriversTable() {
    const tbody = document.getElementById("driversTableBody");
    if (!tbody) return;

    const res = await fetch("/api/drivers");
    const drivers = await res.json();

    tbody.innerHTML = drivers.map(d => `
        <tr>
            <td>${d.id}</td>
            <td><strong>${d.name}</strong></td>
            <td>${d.vehicle_type}</td>
            <td>${d.max_payload_kg} kg</td>
            <td><span class="badge badge-success">${d.status}</span></td>
            <td>${d.current_location_name || 'En Route'}</td>
        </tr>
    `).join("");
}

async function loadTrafficController() {
    const grid = document.getElementById("trafficControlsGrid");
    if (!grid) return;

    const res = await fetch("/api/traffic");
    const roads = await res.json();

    grid.innerHTML = roads.map(r => `
        <div class="traffic-item">
            <div class="traffic-item-header">
                <span class="traffic-road-name">${r.name}</span>
                <span class="traffic-factor-badge ${r.traffic_multiplier >= 1.8 ? 'traffic-heavy' : 'traffic-normal'}" id="traffic-badge-${r.id}">
                    ${r.traffic_multiplier}x Multiplier
                </span>
            </div>
            <small style="color: var(--text-muted);">${r.source_name} &rarr; ${r.target_name} (${r.distance_km} km)</small>
            <input type="range" min="1.0" max="3.0" step="0.1" value="${r.traffic_multiplier}" 
                   class="traffic-slider" onchange="updateRoadTrafficMultiplier(${r.id}, this.value)">
        </div>
    `).join("");
}

async function updateRoadTrafficMultiplier(roadId, val) {
    const trafficVal = parseFloat(val);
    await fetch(`/api/roads/${roadId}/traffic`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traffic_multiplier: trafficVal })
    });

    const badge = document.getElementById(`traffic-badge-${roadId}`);
    if (badge) {
        badge.textContent = `${trafficVal}x Multiplier`;
        badge.className = `traffic-factor-badge ${trafficVal >= 1.8 ? 'traffic-heavy' : 'traffic-normal'}`;
    }

    await loadRoads();
    renderMapRoads();
}

async function loadHistoryTable() {
    const tbody = document.getElementById("historyTableBody");
    if (!tbody) return;

    const res = await fetch("/api/history");
    const history = await res.json();

    tbody.innerHTML = history.map(h => `
        <tr>
            <td>${h.id}</td>
            <td>${h.start_name}</td>
            <td>${h.dest_name}</td>
            <td>${h.vehicle_type}</td>
            <td>${h.avoid_traffic ? 'Enabled' : 'Disabled'}</td>
            <td>${h.total_distance_km} km</td>
            <td>${h.total_time_mins} mins</td>
            <td>${h.created_at}</td>
        </tr>
    `).join("");
}

function loadAnalyticsCharts() {
    const ctx1 = document.getElementById("analyticsChart1");
    const ctx2 = document.getElementById("analyticsChart2");

    if (ctx1) {
        new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Fuel Saved (Liters)',
                    data: [42, 55, 60, 48, 72, 85, 90],
                    borderColor: '#10b981',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)'
                }]
            }
        });
    }

    if (ctx2) {
        new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Light Van', 'Medium Truck', 'Heavy Truck', 'Bike'],
                datasets: [{
                    data: [35, 40, 15, 10],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
                }]
            }
        });
    }
}

/* 11. MODALS & THEME */
function initModals() {
    const modal = document.getElementById("locationModal");
    const btnOpen = document.getElementById("btnAddLocationModal");
    const btnClose = modal ? modal.querySelector(".close-modal") : null;
    const form = document.getElementById("addLocationForm");

    if (btnOpen && modal) {
        btnOpen.addEventListener("click", () => modal.classList.add("active"));
    }

    if (btnClose && modal) {
        btnClose.addEventListener("click", () => modal.classList.remove("active"));
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("newLocName").value;
            const address = document.getElementById("newLocAddress").value;
            const category = document.getElementById("newLocCategory").value;
            const lat = parseFloat(document.getElementById("newLocLat").value);
            const lng = parseFloat(document.getElementById("newLocLng").value);

            await fetch("/api/locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, address, category, lat, lng })
            });

            modal.classList.remove("active");
            form.reset();
            await loadLocations();
            renderMapNodes();
            loadLocationsTable();
        });
    }
}

function initThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (btn) {
        btn.addEventListener("click", () => {
            document.body.classList.toggle("light-theme");
            const icon = btn.querySelector("i");
            if (document.body.classList.contains("light-theme")) {
                icon.className = "fa-solid fa-sun";
            } else {
                icon.className = "fa-solid fa-moon";
            }
        });
    }
}
