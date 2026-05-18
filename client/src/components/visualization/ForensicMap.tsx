import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default Leaflet marker icons
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

interface ForensicMapProps {
  markers?: Array<{ lat: number; lng: number; label: string; type: 'tower' | 'suspect' }>;
  paths?: Array<[number, number]>;
}

export default function ForensicMap({ markers = [], paths = [] }: ForensicMapProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const center: [number, number] = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [20.5937, 78.9629];

  return (
    <div className="h-full w-full bg-[#020617]">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="h-full w-full"
        style={{ background: '#1E1E2D' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {markers.map((marker, i) => (
          <Marker key={i} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="text-xs font-mono">
                <p className="font-bold text-[#00d1ff] uppercase">{marker.type}</p>
                <p className="text-gray-600">{marker.label}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {paths.length > 1 && (
          <Polyline 
            positions={paths} 
            color="#00d1ff" 
            weight={3} 
            opacity={0.6} 
            dashArray="10, 10" 
          />
        )}
      </MapContainer>
    </div>
  );
}
