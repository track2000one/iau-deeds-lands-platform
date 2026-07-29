import L from 'leaflet';
import customMapPinImage from '../assets/custom-map-pin.png';

/**
 * Unified custom map marker used across add / view / edit map experiences.
 * The same marker is also applied as Leaflet's default icon so any plain
 * <Marker /> in the app automatically uses the branded red pin image.
 */
export const customMapMarkerIcon = L.icon({
  iconUrl: customMapPinImage,
  iconSize: [60, 60],
  iconAnchor: [30, 56],
  popupAnchor: [0, -52],
  tooltipAnchor: [0, -46],
  className: 'app-map-pin-icon',
});

export const configureLeafletDefaultMarker = (): void => {
  delete (L.Icon.Default.prototype as unknown as {
    _getIconUrl?: unknown;
  })._getIconUrl;

  L.Marker.prototype.options.icon = customMapMarkerIcon;

  L.Icon.Default.mergeOptions({
    iconUrl: customMapPinImage,
    iconRetinaUrl: customMapPinImage,
    shadowUrl: undefined,
    iconSize: [60, 60],
    iconAnchor: [30, 56],
    popupAnchor: [0, -52],
    tooltipAnchor: [0, -46],
    className: 'app-map-pin-icon',
  });
};

configureLeafletDefaultMarker();
