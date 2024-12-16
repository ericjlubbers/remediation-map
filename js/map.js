const map = L.map('map');

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd'
}).addTo(map);

const countyStyle = feature => ({
    color: '#fff',
    weight: feature.properties.name === 'Weld' ? 3 : 2,
    opacity: 1,
    fillOpacity: feature.properties.name === 'Weld' ? 0 : 0.25,
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

fetch('data/colorado-counties.json')
    .then(response => response.json())
    .then(counties => {
        L.geoJSON(counties, {
            style: countyStyle
        }).addTo(map);
        
        counties.features.forEach(county => {
            const bounds = L.geoJSON(county).getBounds();
            const center = turf.centerOfMass(county).geometry.coordinates;
            
            const label = L.marker([center[1], center[0]], {
                icon: L.divIcon({
                    className: `county-label ${county.properties.name === 'Weld' ? 'weld-county' : ''}`,
                    html: `<div>${county.properties.name}</div>`,
                    iconSize: [120, 20],
                    iconAnchor: [60, 10]
                })
            }).addTo(map);
            
            map.on('zoomend', () => {
                const countyPixelBounds = bounds.toBBoxString().split(',').map(Number);
                const width = Math.abs(countyPixelBounds[2] - countyPixelBounds[0]);
                const height = Math.abs(countyPixelBounds[3] - countyPixelBounds[1]);
                label.getElement().style.display = width < 100 || height < 50 ? 'none' : 'block';
            });
        });
    });

fetch('data/remediation_projects.json')
    .then(response => response.json())
    .then(data => {
        const bounds = L.latLngBounds();
        
        data.forEach(site => {
            if (site.Lattitude && site.Longitude) {
                const marker = L.circleMarker(
                    [site.Lattitude, site.Longitude],
                    siteStyles[site.ProjectStatus.toLowerCase()]
                ).addTo(map);
                
                bounds.extend([site.Lattitude, site.Longitude]);
                
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
        
        map.fitBounds(bounds, { padding: [20, 20] });
    });

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