import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ForestMap = ({ countryIso, year, geometry }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20, 0], 2);

      // Add base map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing layers except base map
map.eachLayer((layer) => {
  // Only check attribution if it exists
  if (layer instanceof L.TileLayer) {
    if (!layer.options.attribution || !layer.options.attribution.includes("OpenStreetMap")) {
      map.removeLayer(layer);
    }
  }

  if (layer instanceof L.GeoJSON) {
    map.removeLayer(layer);
  }
});


    // Add GFW tree cover loss layer
    if (year) {
      const gfwUrl = `https://tiles.globalforestwatch.org/umd_tree_cover_loss/v1.9/tcd_30/{z}/{x}/{y}.png`;
      
      L.tileLayer(gfwUrl, {
        opacity: 0.7,
        maxZoom: 12
      }).addTo(map);
    }

    // Add country boundary if geometry provided
    if (geometry) {
  const geoJsonLayer = L.geoJSON(geometry, {
    style: {
      color: '#ef4444',
      weight: 2,
      fillOpacity: 0,
      fillColor: 'transparent'
    }
  }).addTo(map);

  // Fit map to country bounds with padding
  map.fitBounds(geoJsonLayer.getBounds(), {
    padding: [50, 50],
    maxZoom: 6
  });
}
    return () => {
      // Cleanup
    };
  }, [year, geometry, countryIso]);

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height: '500px', width: '100%' }} className="rounded-lg shadow-md" />
      <div className="absolute top-4 right-4 bg-white p-3 rounded shadow-md z-1000">
        <div className="text-sm font-medium mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-600 mr-2"></div>
            <span>Forest Loss</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-600 mr-2"></div>
            <span>Forest Cover</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForestMap;