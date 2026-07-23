import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

/**
 * Fixes Leaflet default marker assets when the app is bundled by Vite.
 *
 * Leaflet normally builds marker image URLs at runtime. After bundling,
 * those relative URLs can point to missing files. Importing the images
 * through Vite and assigning them explicitly keeps the marker stable in
 * local builds and Railway deployments.
 */
export const configureLeafletDefaultMarker = (): void => {
  delete (L.Icon.Default.prototype as unknown as {
    _getIconUrl?: unknown;
  })._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
  });
};

configureLeafletDefaultMarker();
