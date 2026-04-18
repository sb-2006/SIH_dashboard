import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';

const MapboxExample = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  useEffect(() => {
mapboxgl.accessToken = "MAPBOX_TOKEN_GOES_HERE";

    if (mapContainerRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        center: [76.2673, 9.9312], // starting position [lng, lat]
        zoom: 9 // starting zoom
      });
// 10.04440072722204, 76.32880180376287
// 10.027188055282442, 76.30862296138723
// 10.00100606320165, 76.31006562790994 palarivattoam
// 9.997000711118094, 76.29502973314477 JLN statdium
// 9.970730228934686, 76.29155430219876 mg road
// 9.96954402834553, 76.29167334054236 ernalkulum railway statsion
// 9.969523557975279, 76.31723752024725 vyttila
// 9.95471779402356, 76.34640079266518 sn junction
//  Aluva
          new mapboxgl.Marker()
      .setLngLat([76.35021866728692, 10.116168841189038])
      .addTo(mapRef.current);
// cochin univarsity
          new mapboxgl.Marker()
      .setLngLat([76.31846983878278, 10.052933615793775])
      .addTo(mapRef.current);
//kaloor
 
          new mapboxgl.Marker()
      .setLngLat([76.29168747109925, 9.996756469603197])
      .addTo(mapRef.current);

//town hall
          new mapboxgl.Marker()
      .setLngLat([76.28906462787582, 9.992343845357038])
      .addTo(mapRef.current);

// mg road
          new mapboxgl.Marker({color: 'red'})
      .setLngLat([76.28213542921326, 9.98398182548758])
      .addTo(mapRef.current);

//ernakulum
          new mapboxgl.Marker({color: 'red'})
      .setLngLat([76.28896703352845, 9.969467924739781])
      .addTo(mapRef.current);

//sn jucntion
          new mapboxgl.Marker({color: 'red'})
      .setLngLat([76.34615732239023, 9.956491373221308])
      .addTo(mapRef.current);
    }
  }, []);

  return (
    <div
      style={{ minHeight: '400px' }}
      ref={mapContainerRef}
      className="map-container h-full w-full rounded-lg"
    />
  );
};

export default MapboxExample;