import React from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
} from '@vis.gl/react-google-maps';
import { WorldBuilding } from '../types/game';

interface LuandaGoogleMapProps {
  buildings: WorldBuilding[];
  playerPos: { x: number; z: number };
  waypointId: string | null;
  onSelectBuilding: (b: WorldBuilding) => void;
}

// Reference center: Luanda, Angola
const LUANDA_CENTER = { lat: -8.839, lng: 13.2894 };

/**
 * Projects 3D game coordinates (x, z) onto Luanda, Angola geographic coordinates
 * so players can view their live position and districts (including Talatona & Viana)
 * on Google Maps.
 */
function worldToLatLng(x: number, z: number): { lat: number; lng: number } {
  return {
    lat: LUANDA_CENTER.lat - z * 0.00072,
    lng: LUANDA_CENTER.lng + x * 0.00078,
  };
}

export const LuandaGoogleMap: React.FC<LuandaGoogleMapProps> = ({
  buildings,
  playerPos,
  waypointId,
  onSelectBuilding,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const playerLatLng = worldToLatLng(playerPos.x, playerPos.z);

  if (!apiKey) {
    return (
      <div className="w-full h-72 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center p-6 text-center text-xs text-zinc-400">
        Chave da API do Google Maps não configurada. Utilize o Mapa Tático 2D ou configure a chave nas definições.
      </div>
    );
  }

  return (
    <div className="w-full h-72 rounded-xl overflow-hidden border border-zinc-800">
      <APIProvider apiKey={apiKey} language="pt" region="AO">
        <GoogleMap
          style={{ width: '100%', height: '100%' }}
          defaultCenter={playerLatLng}
          defaultZoom={12}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {buildings.map((b) => {
            const pos = worldToLatLng(b.x, b.z);
            const isSelected = waypointId === b.id;
            return (
              <AdvancedMarker
                key={b.id}
                position={pos}
                title={`${b.name} (${b.district})`}
                onClick={() => onSelectBuilding(b)}
              >
                <Pin
                  background={isSelected ? '#f59e0b' : '#18181b'}
                  borderColor={isSelected ? '#ffffff' : '#f59e0b'}
                  glyphColor="#ffffff"
                />
              </AdvancedMarker>
            );
          })}

          <AdvancedMarker position={playerLatLng} title="Sua Posição Atual">
            <Pin
              background="#10b981"
              borderColor="#ffffff"
              glyphColor="#ffffff"
            />
          </AdvancedMarker>
        </GoogleMap>
      </APIProvider>
    </div>
  );
};
