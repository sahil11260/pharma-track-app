/**
 * KavyaPharm MR Live Tracking JS
 */

(function () {
    "use strict";

    const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
    const USERS_API_BASE = `${API_BASE}/api/users`;

    let map;
    let markers = {}; // Store markers by MR ID
    let mrList = [];

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
                mockLocations(users); // Mock initial locations since real-time API is being built
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

    // --- Mock Location Logic ---
    function mockLocations(users) {
        let online = 0;
        let offline = 0;

        users.forEach((u, index) => {
            const isOnline = Math.random() > 0.3; // Randomly mock status
            if (isOnline) online++; else offline++;

            // Mock coordinates around Nagpur
            const lat = 21.1458 + (Math.random() - 0.5) * 0.1;
            const lng = 79.0882 + (Math.random() - 0.5) * 0.1;

            const marker = L.marker([lat, lng], {
                icon: createCustomMarker(isOnline ? 'online' : 'offline')
            }).bindPopup(`
                <div class="p-1">
                    <div class="fw-bold">${u.name}</div>
                    <div class="text-muted small">${u.territory || 'Default Territory'}</div>
                    <div class="mt-1 small"><span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}">${isOnline ? 'Online' : 'Offline'}</span></div>
                    <div class="mt-1 small text-secondary">Last update: Just now</div>
                </div>
            `);

            markers[u.id] = marker;
            marker.addTo(map);
        });

        document.getElementById('onlineCount').textContent = online;
        document.getElementById('offlineCount').textContent = offline;
        
        centerMap();
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
