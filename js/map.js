const debugLog = (message, data = null) => {
    console.log(`[Map Debug] ${message}`, data || '');
};

const getMarkerRadius = () => {
    const width = window.innerWidth;
    if (width <= 480) return 2;  // Smaller on mobile
    if (width <= 768) return 3;
    return 5;
};

const getMarkerWeight = () => {
    const width = window.innerWidth;
    if (width <= 768) return 1;
    return 2;
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
        radius: getMarkerRadius(),
        color: '#666',
        weight: getMarkerWeight(),
        fillColor: '#2563eb',
        fillOpacity: 0.9
    },
    closed: {
        radius: getMarkerRadius(),
        color: '#666',
        weight: getMarkerWeight(),
        fillColor: '#fff',
        fillOpacity: 0.7
    }
};

const map = L.map('map', {
    center: [39.5501, -105.7821],
    zoom: 7,
    zoomControl: window.innerWidth > 768,
    touchZoom: true,
    dragging: true,
    maxBounds: L.latLngBounds([36.993076, -109.045223], [41.003444, -102.041524]),
    maxBoundsViscosity: 1.0
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

const updateMarkerSizes = () => {
    map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
            const radius = getMarkerRadius();
            const weight = getMarkerWeight();
            layer.setRadius(radius);
            layer.setStyle({ weight: weight });
        }
    });
};

const debouncedUpdateMarkerSizes = _.debounce(updateMarkerSizes, 250);

function updateMapPadding() {
    const currentBounds = map.getBounds();
    const padding = window.innerWidth <= 768 ? [10, 10] : [40, 40];
    map.fitBounds(currentBounds, {
        padding: padding,
        maxZoom: window.innerWidth <= 768 ? 11 : 10,
        animate: false
    });
}

function sendHeight() {
    const mapElement = document.getElementById('map');
    const footerElement = document.querySelector('.footer');
    const mapHeight = mapElement.offsetHeight;
    const footerHeight = footerElement.offsetHeight;
    const extraSpace = window.innerWidth <= 768 ? 20 : 0;
    const totalHeight = mapHeight + footerHeight + extraSpace;
    
    window.parent.postMessage({
        type: 'resize',
        height: totalHeight,
        source: 'resize'
    }, '*');
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    debouncedUpdateMarkerSizes();
    
    // Handle zoom control
    if (map.zoomControl) {
        if (window.innerWidth <= 768) {
            map.removeControl(map.zoomControl);
        }
    } else if (window.innerWidth > 768) {
        map.addControl(new L.Control.Zoom({ position: 'topleft' }));
    }
    
    // Update padding and send height
    updateMapPadding();
    resizeTimeout = setTimeout(sendHeight, 250);
});

const addSites = (data) => {
    const validSites = data.filter(site => 
        site.Lattitude && site.Longitude && 
        !isNaN(site.Lattitude) && !isNaN(site.Longitude)
    );
    
    if (validSites.length === 0) {
        console.warn('No valid sites found');
        return;
    }
    
    // Calculate the bounds of all points
    const bounds = L.latLngBounds(
        validSites.map(site => [site.Lattitude, site.Longitude])
    );
    
    validSites.forEach(site => {
        try {
            const style = { ...siteStyles[site.ProjectStatus.toLowerCase()] };
            style.radius = getMarkerRadius();
            style.weight = getMarkerWeight();
            
            const marker = L.circleMarker(
                [site.Lattitude, site.Longitude],
                style
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
            
            marker.on('click', function() {
                this.openPopup();
            });
        } catch (error) {
            console.error(`Error adding site marker: ${site["Site\nName"]}`, error);
        }
    });
    
    // Calculate center point of bounds
    const center = bounds.getCenter();
    const isMobile = window.innerWidth <= 768;
    
    // Adjust bounds for mobile to focus more on the central cluster
    if (isMobile) {
        // Shrink the bounds by 20% for mobile to zoom in more on the central cluster
        const latSpread = (bounds.getNorth() - bounds.getSouth()) * 0.2;
        const lngSpread = (bounds.getEast() - bounds.getWest()) * 0.2;
        bounds.extend([center.lat + latSpread, center.lng + lngSpread]);
        bounds.extend([center.lat - latSpread, center.lng - lngSpread]);
    }
    
    map.fitBounds(bounds, {
        padding: isMobile ? [10, 10] : [40, 40],
        maxZoom: isMobile ? 11 : 10
    });
};

const legend = L.control({ 
    position: window.innerWidth <= 768 ? 'bottomleft' : 'bottomright' 
});

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
        
        const countiesLayer = L.geoJSON(counties, { style: countyStyle }).addTo(map);
        addCountyLabels(counties);
        addSites(sites);
        
        map.getContainer().classList.remove('map-loading');
        debugLog('Map initialization complete');
        
        // Only send height after map loads if it's significantly different
        setTimeout(function() {
            const mapElement = document.getElementById('map');
            const footerElement = document.querySelector('.footer');
            const totalHeight = mapElement.offsetHeight + footerElement.offsetHeight;
            
            // Only send if the height is significantly different
            const currentHeight = window.innerHeight;
            if (Math.abs(totalHeight - currentHeight) > currentHeight * 0.1) {
                sendHeight();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error loading map data:', error);
        debugLog('Failed to load map data', error);
        map.getContainer().classList.remove('map-loading');
    }
};

document.addEventListener('DOMContentLoaded', loadData);