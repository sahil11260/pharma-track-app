/**
 * KavyaPharm MR Live Tracking JS
 */

(function () {
    "use strict";

    const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
    const USERS_API_BASE = `${API_BASE}/api/users`;
    const MR_LOCATIONS_API_BASE = `${API_BASE}/api/mr-locations`;

    const REFRESH_MS = 15000;
    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

    let map;
    let markers = {}; // Store markers by MR ID
    let mrList = [];
    let refreshTimer = null;

    // --- Auth & API Helpers ---
    function getAuthHeader() {
        const token = localStorage.getItem("kavya_auth_token") || localStorage.getItem("token");
        if (!token) return {};
        return { Authorization: `Bearer ${token}` };
    }

    async function apiJson(url, options) {
        const res = await fetch(url, Object.assign({
            headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader())
        }, options || {}));
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `HTTP ${res.status}`);
        }
        if (res.status === 204) return null;
        return await res.json();
    }

    // --- Map Initialization ---
    function initMap() {
        // Default view: India (Nagpur - center)
        map = L.map('map', {
            zoomControl: false // Using custom buttons
        }).setView([21.1458, 79.0882], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Control handlers
        document.getElementById('zoomInBtn').onclick = () => map.zoomIn();
        document.getElementById('zoomOutBtn').onclick = () => map.zoomOut();
        document.getElementById('centerMapBtn').onclick = () => centerMap();
    }

    function centerMap() {
        const markerGroup = new L.featureGroup(Object.values(markers));
        if (markerGroup.getLayers().length > 0) {
            map.fitBounds(markerGroup.getBounds().pad(0.1));
        } else {
            map.setView([21.1458, 79.0882], 12);
        }
    }

    // --- Marker Helpers ---
    function createCustomMarker(status) {
        let color = status === 'online' ? '#28a745' : '#6c757d';
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${color}; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>`,
            iconSize: [15, 15],
            iconAnchor: [7, 7]
        });
    }

    function formatLastUpdate(updatedAt) {
        if (!updatedAt) return "Never";
        const ts = new Date(updatedAt).getTime();
        if (!isFinite(ts)) return "Unknown";
        const diff = Date.now() - ts;
        if (diff < 15000) return "Just now";
        if (diff < 60000) return `${Math.max(1, Math.floor(diff / 1000))} sec ago`;
        if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} min ago`;
        return `${Math.max(1, Math.floor(diff / 3600000))} hr ago`;
    }

    function isOnlineFromUpdatedAt(updatedAt) {
        if (!updatedAt) return false;
        const ts = new Date(updatedAt).getTime();
        if (!isFinite(ts)) return false;
        return (Date.now() - ts) <= ONLINE_THRESHOLD_MS;
    }

    // --- MR Loading ---
    async function loadMRs() {
        try {
            const userObj = JSON.parse(localStorage.getItem("kavya_user") || "{}");
            const currentName = userObj.name || localStorage.getItem("signup_name") || "";
            const currentEmail = userObj.email || localStorage.getItem("signup_email") || "";

            const users = await apiJson(`${USERS_API_BASE}?manager=${encodeURIComponent(currentName || currentEmail)}&role=MR`);
            
            if (Array.isArray(users)) {
                mrList = users;
                populateSelector(users);
                startRefreshingLocations(currentName || currentEmail);
            }
        } catch (e) {
            console.error("Failed to load MRs:", e);
        }
    }

    function populateSelector(users) {
        const selector = document.getElementById('mrSelector');
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.name;
            selector.appendChild(opt);
        });

        selector.onchange = (e) => {
            const val = e.target.value;
            filterMarkers(val);
        };
    }

    function filterMarkers(val) {
        Object.keys(markers).forEach(id => {
            if (val === 'all' || id == val) {
                markers[id].addTo(map);
            } else {
                map.removeLayer(markers[id]);
            }
        });
        centerMap();
    }

    async function refreshLocations(managerIdentifier) {
        console.log("[TRACKING] Refreshing locations for manager:", managerIdentifier);
        const selector = document.getElementById('mrSelector');
        const currentFilter = selector ? selector.value : 'all';

        let online = 0;
        let offline = 0;

        let locations = [];
        try {
            const url = `${MR_LOCATIONS_API_BASE}?manager=${encodeURIComponent(managerIdentifier || '')}`;
            console.log("[TRACKING] Fetching URL:", url);
            const res = await apiJson(url);
            locations = Array.isArray(res) ? res : [];
            console.log("[TRACKING] Received locations:", locations.length, locations);
        } catch (e) {
            console.error("Failed to load MR locations:", e);
            locations = [];
        }

        const locationMap = {};
        locations.forEach(l => {
            if (l && l.mrId != null) {
                locationMap[l.mrId] = l;
            }
        });

        (mrList || []).forEach(u => {
            const loc = locationMap[u.id] || null;
            const hasCoords = loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
            const onlineNow = loc && (loc.status === 'online' || isOnlineFromUpdatedAt(loc.updatedAt));

            if (onlineNow) online++; else offline++;
            
            console.log(`[TRACKING] MR ${u.name} (ID: ${u.id}): hasCoords=${hasCoords}, online=${onlineNow}`);

            if (!hasCoords) {
                if (markers[u.id]) {
                    map.removeLayer(markers[u.id]);
                    delete markers[u.id];
                }
                return;
            }

            const latlng = [loc.latitude, loc.longitude];
            const badgeClass = onlineNow ? 'bg-success' : 'bg-secondary';
            const badgeText = onlineNow ? 'Online' : 'Offline';

            const popupHtml = `
                <div class="p-1">
                    <div class="fw-bold">${u.name || (loc.mrName || '')}</div>
                    <div class="text-muted small">${u.territory || loc.territory || 'Default Territory'}</div>
                    <div class="mt-1 small"><span class="badge ${badgeClass}">${badgeText}</span></div>
                    <div class="mt-1 small text-secondary">Last update: ${formatLastUpdate(loc.updatedAt)}</div>
                </div>
            `;

            if (!markers[u.id]) {
                markers[u.id] = L.marker(latlng, { icon: createCustomMarker(onlineNow ? 'online' : 'offline') })
                    .bindPopup(popupHtml);
            } else {
                markers[u.id].setLatLng(latlng);
                markers[u.id].setIcon(createCustomMarker(onlineNow ? 'online' : 'offline'));
                markers[u.id].setPopupContent(popupHtml);
            }

            if (currentFilter === 'all' || String(u.id) === String(currentFilter)) {
                markers[u.id].addTo(map);
            } else {
                map.removeLayer(markers[u.id]);
            }
        });

        const onlineEl = document.getElementById('onlineCount');
        const offlineEl = document.getElementById('offlineCount');
        if (onlineEl) onlineEl.textContent = String(online);
        if (offlineEl) offlineEl.textContent = String(offline);

        centerMap();
    }

    function startRefreshingLocations(managerIdentifier) {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        refreshLocations(managerIdentifier);
        refreshTimer = setInterval(() => refreshLocations(managerIdentifier), REFRESH_MS);
    }

    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        initMap();
        loadMRs();
        
        // Handle Sidebar Profile (Global Profile Load)
        if (typeof window.populateProfile === 'function') {
            window.populateProfile();
        }
    });

})();
