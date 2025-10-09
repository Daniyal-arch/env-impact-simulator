import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, X } from 'lucide-react';

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
  const layersRef = useRef({});
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    treeLoss: true,
    treeGain: false,
    forestCover: false,
    fireAlerts: false,
    primaryForest: false,
    protectedAreas: false
  });

  // GFW Tile Layer URLs
  const GFW_LAYERS = {
    treeLoss: {
      url: 'https://tiles.globalforestwatch.org/umd_tree_cover_loss/v1.9/tcd_30/{z}/{x}/{y}.png',
      name: 'Tree Cover Loss',
      color: '#ff0080',
      opacity: 0.7
    },
    treeGain: {
      url: 'https://tiles.globalforestwatch.org/umd_tree_cover_gain/v202206/{z}/{x}/{y}.png',
      name: 'Tree Cover Gain',
      color: '#00ff00',
      opacity: 0.6
    },
    forestCover: {
      url: 'https://tiles.globalforestwatch.org/umd_tree_cover_density_2000/v1.6/{z}/{x}/{y}.png',
      name: 'Forest Cover (2000)',
      color: '#228B22',
      opacity: 0.6
    },
    fireAlerts: {
      url: 'https://tiles.globalforestwatch.org/nasa_viirs_fire_alerts/latest/{z}/{x}/{y}.png',
      name: 'Fire Alerts (VIIRS)',
      color: '#ff6600',
      opacity: 0.8
    },
    primaryForest: {
      url: 'https://tiles.globalforestwatch.org/umd_regional_primary_forest_2001/v201901/{z}/{x}/{y}.png',
      name: 'Primary Forest',
      color: '#004d00',
      opacity: 0.6
    },
    protectedAreas: {
      url: 'https://tiles.globalforestwatch.org/wdpa_protected_areas/v202102/{z}/{x}/{y}.png',
      name: 'Protected Areas',
      color: '#0066cc',
      opacity: 0.5
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);

      // Add base map (Satellite view)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      // Add labels overlay
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        maxZoom: 19,
        pane: 'shadowPane'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Add country boundary if geometry provided
    if (geometry) {
      // Remove existing boundary
      map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
          map.removeLayer(layer);
        }
      });

      const geoJsonLayer = L.geoJSON(geometry, {
        style: {
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0,
          fillColor: 'transparent'
        }
      }).addTo(map);

      // Fit map to country bounds
      map.fitBounds(geoJsonLayer.getBounds(), {
        padding: [50, 50],
        maxZoom: 8
      });
    }

    // Update GFW layers based on active state
    Object.keys(activeLayers).forEach(layerKey => {
      // Remove existing layer
      if (layersRef.current[layerKey]) {
        map.removeLayer(layersRef.current[layerKey]);
        delete layersRef.current[layerKey];
      }

      // Add layer if active
      if (activeLayers[layerKey]) {
        const layerConfig = GFW_LAYERS[layerKey];
        const tileLayer = L.tileLayer(layerConfig.url, {
          opacity: layerConfig.opacity,
          maxZoom: 12
        });
        
        tileLayer.addTo(map);
        layersRef.current[layerKey] = tileLayer;
      }
    });

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        Object.values(layersRef.current).forEach(layer => {
          mapInstanceRef.current.removeLayer(layer);
        });
      }
    };
  }, [geometry, activeLayers]);

  const toggleLayer = (layerKey) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height: '500px', width: '100%' }} className="rounded-lg shadow-md" />
      
      {/* Layer Control Button */}
      <button
        onClick={() => setShowLayerControl(!showLayerControl)}
        className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md hover:bg-gray-50 z-1000"
        title="Toggle Layers"
      >
        <Layers className="w-5 h-5 text-gray-700" />
      </button>

      {/* Layer Control Panel */}
      {showLayerControl && (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl z-1000 w-64">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Map Layers</h3>
            <button onClick={() => setShowLayerControl(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            {Object.entries(GFW_LAYERS).map(([key, config]) => (
              <label
                key={key}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={activeLayers[key]}
                  onChange={() => toggleLayer(key)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: config.color }}
                  ></div>
                  <span className="text-sm text-gray-700">{config.name}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="p-3 border-t bg-gray-50 text-xs text-gray-600">
            <p>Data from Global Forest Watch</p>
            <p className="mt-1">Updated: 2024</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded shadow-md z-1000 max-w-xs">
        <div className="text-sm font-medium mb-2">Active Layers</div>
        <div className="space-y-1 text-xs">
          {Object.entries(activeLayers)
            .filter(([_, active]) => active)
            .map(([key, _]) => {
              const config = GFW_LAYERS[key];
              return (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: config.color }}
                  ></div>
                  <span className="text-gray-700">{config.name}</span>
                </div>
              );
            })}
          {Object.values(activeLayers).every(v => !v) && (
            <p className="text-gray-500 italic">No layers active</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForestMap;