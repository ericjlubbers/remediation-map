const debugLog = (message, data = null) => {
    console.log(`[Map Debug] ${message}`, data || '');
};

const countyStyle = feature => ({
    color: '#666',
    weight: feature.properties.name === 'Weld' ? 3 : 2,
    opacity: 1,
    fillOpacity: feature.properties.name === 'Weld' ? 0 : 0.25,
    fillColor: '#000',
    interactive: false
});

const siteStyles = {
    active: {
        radius: 5,
        color: '#666',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.9
    },
    closed: {
        radius: 5,
        color: '#666',
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 0.7
    }
};

const addCountyLabels = (counties) => {
    debugLog('Adding county labels');
    
    counties.features.forEach(county => {
        let center = turf.centerOfMass(county).geometry.coordinates;
        if (county.properties.name === 'Weld') {
            center = [center[0] + 0.1, center[1] + 0.05];
        }

        const div = document.createElement('div');
        div.textContent = county.properties.name;
        div.style.display = 'block';
        
        const label = new L.Marker([center[1], center[0]], {
            icon: new L.DivIcon({
                className: `county-label ${county.properties.name === 'Weld' ? 'weld-county' : ''}`,
                html: div,
                iconSize: [120, 20],
                iconAnchor: [60, 10]
            })
        });

        label.addTo(map);

        const checkVisibility = () => {
            const countyGeom = L.geoJSON(county);
            const bounds = countyGeom.getBounds();
            const labelPos = L.latLng(center[1], center[0]);
            const isInBounds = bounds.contains(labelPos);
            const pixelBounds = countyGeom.getBounds();
            const width = Math.abs(pixelBounds.getEast() - pixelBounds.getWest());
            const height = Math.abs(pixelBounds.getNorth() - pixelBounds.getSouth());
            
            div.style.display = (!isInBounds || width < 100 || height < 50) ? 'none' : 'block';
        };

        map.on('zoomend', checkVisibility);
        checkVisibility();
    });
};

const addSites = (data) => {
    const bounds = L.latLngBounds();
    let hasValidBounds = false;
    
    data.forEach(site => {
        if (site.Lattitude && site.Longitude) {
            const marker = L.circleMarker(
                [site.Lattitude, site.Longitude],
                siteStyles[site.ProjectStatus.toLowerCase()]
            ).addTo(map);
            
            bounds.extend([site.Lattitude, site.Longitude]);
            hasValidBounds = true;
            
            marker.bindPopup(`
                <div class="popup-content">
                    <h3>${site["Site\nName"] || "Unnamed Site"}</h3>
                    <p><strong>Status:</strong> ${site.ProjectStatus}</p>
                    <p><strong>Operator:</strong> ${site.Operator}</p>
                    <p><strong>Municipality:</strong> ${site.Municipality}</p>
                    <p><strong>Date Opened:</strong> ${site["Date\nOpened"]}</p>
                    ${site["Date\nClosed"] ? `<p><strong>Date Closed:</strong> ${site["Date\nClosed"]}</p>` : ''}
                </div>
            `);
            
            marker.on('mouseover', function(e) {
                this.openPopup();
            });
        }
    });
    
    if (hasValidBounds) {
        map.fitBounds(bounds, { padding: [20, 20] });
    }
};

const map = L.map('map');
map.getContainer().classList.add('map-loading');

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd'
}).addTo(map);

const legend = L.control({ position: 'bottomright' });
legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
        <h4>Site Status</h4>
        <div class="legend-item">
            <span class="legend-marker active"></span>
            Active
        </div>
        <div class="legend-item">
            <span class="legend-marker closed"></span>
            Closed
        </div>
    `;
    return div;
};
legend.addTo(map);

const loadData = async () => {
    try {
        debugLog('Starting data load');
        const [counties, sites] = await Promise.all([
            fetch('data/colorado-counties.json').then(r => r.json()),
            fetch('data/remediation_projects.json').then(r => r.json())
        ]);
        debugLog('Data fetched successfully', { countiesCount: counties.features.length, sitesCount: sites.length });
        
        L.geoJSON(counties, { style: countyStyle }).addTo(map);
        addCountyLabels(counties);
        addSites(sites);
        map.getContainer().classList.remove('map-loading');
        debugLog('Map initialization complete');
        
    } catch (error) {
        console.error('Error loading map data:', error);
        debugLog('Failed to load map data', error);
        map.getContainer().classList.remove('map-loading');
    }
};

document.addEventListener('DOMContentLoaded', loadData);