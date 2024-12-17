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


// Initialize map with default view of Colorado
const map = L.map('map', {
    center: [39.5501, -105.7821],
    zoom: 6
});
map.getContainer().classList.add('map-loading');

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd'
}).addTo(map);

const addCountyLabels = (counties) => {
    debugLog('Adding county labels');
    
    counties.features.forEach(county => {
        try {
            let center = turf.centerOfMass(county);
            if (!center || !center.geometry) {
                console.warn(`Invalid geometry for county: ${county.properties.name}`);
                return;
            }
            
            let coordinates = center.geometry.coordinates;
            if (county.properties.name === 'Weld') {
                coordinates = [coordinates[0] + 0.1, coordinates[1] + 0.05];
            }

            const div = document.createElement('div');
            div.textContent = county.properties.name;
            div.style.display = 'block';
            
            const label = new L.Marker([coordinates[1], coordinates[0]], {
                icon: new L.DivIcon({
                    className: `county-label ${county.properties.name === 'Weld' ? 'weld-county' : ''}`,
                    html: div,
                    iconSize: [120, 20],
                    iconAnchor: [60, 10]
                })
            });

            label.addTo(map);

            const checkVisibility = () => {
                const zoom = map.getZoom();
                const isVisible = zoom > 7;
                div.style.display = isVisible ? 'block' : 'none';
            };

            map.on('zoomend', checkVisibility);
            checkVisibility();
        } catch (error) {
            console.error(`Error adding label for county: ${county.properties.name}`, error);
        }
    });
};

const addSites = (data) => {
    const validSites = data.filter(site => 
        site.Lattitude && site.Longitude && 
        !isNaN(site.Lattitude) && !isNaN(site.Longitude)
    );
    
    if (validSites.length === 0) {
        console.warn('No valid sites found');
        return;
    }
    
    const bounds = L.latLngBounds(
        validSites.map(site => [site.Lattitude, site.Longitude])
    );
    
    validSites.forEach(site => {
        try {
            const marker = L.circleMarker(
                [site.Lattitude, site.Longitude],
                siteStyles[site.ProjectStatus.toLowerCase()]
            ).addTo(map);
            
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
            
            marker.on('mouseover', function() {
                this.openPopup();
            });
        } catch (error) {
            console.error(`Error adding site marker: ${site["Site\nName"]}`, error);
        }
    });
    
    map.fitBounds(bounds, { padding: [20, 20] });
};

const loadData = async () => {
    try {
        debugLog('Starting data load');
        const [counties, sites] = await Promise.all([
            fetch('data/colorado-counties.json').then(r => r.json()),
            fetch('data/remediation_projects.json').then(r => r.json())
        ]);
        debugLog('Data fetched successfully', { countiesCount: counties.features.length, sitesCount: sites.length });
        
        const countiesLayer = L.geoJSON(counties, { style: countyStyle }).addTo(map);
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