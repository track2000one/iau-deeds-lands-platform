const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

const replaceOnce = (content, from, to, label) => {
  if (!content.includes(from)) {
    throw new Error(`Pattern not found for ${label}`);
  }
  return content.replace(from, to);
};

const utilPath = 'src/app/utils/mapNavigation.ts';
write(utilPath, `export type MapCoordinates = {\n  latitude: number;\n  longitude: number;\n};\n\nconst toFiniteNumber = (value: unknown) => {\n  if (value === null || value === undefined || value === '') return null;\n  const number = Number(value);\n  return Number.isFinite(number) ? number : null;\n};\n\nexport const normalizeMapCoordinates = (value: unknown): MapCoordinates | null => {\n  if (!value) return null;\n\n  let candidate: unknown = value;\n\n  if (typeof candidate === 'string') {\n    const trimmed = candidate.trim();\n    if (!trimmed) return null;\n\n    try {\n      candidate = JSON.parse(trimmed);\n    } catch {\n      const parts = trimmed.split(',').map((part) => part.trim());\n      if (parts.length >= 2) {\n        candidate = { latitude: parts[0], longitude: parts[1] };\n      } else {\n        return null;\n      }\n    }\n  }\n\n  if (Array.isArray(candidate) && candidate.length >= 2) {\n    candidate = { latitude: candidate[0], longitude: candidate[1] };\n  }\n\n  if (typeof candidate !== 'object' || candidate === null) return null;\n\n  const record = candidate as Record<string, unknown>;\n  const latitude = toFiniteNumber(record.latitude ?? record.lat ?? record.y);\n  const longitude = toFiniteNumber(record.longitude ?? record.lng ?? record.lon ?? record.x);\n\n  if (latitude === null || longitude === null) return null;\n  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;\n\n  return { latitude, longitude };\n};\n\nexport const formatMapCoordinate = (value: unknown, digits = 4) => {\n  const number = toFiniteNumber(value);\n  return number === null ? '-' : number.toFixed(digits);\n};\n\nexport const getGoogleMapsUrl = (coordinates: MapCoordinates) => {\n  const query = encodeURIComponent(\`${'${coordinates.latitude}'},${'${coordinates.longitude}'}\`);\n  return \`https://www.google.com/maps/search/?api=1&query=${'${query}'}\`;\n};\n\nexport const shouldOpenExternalMap = () => {\n  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;\n\n  const userAgent = navigator.userAgent || '';\n  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);\n  const coarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)').matches) && window.innerWidth <= 1180;\n\n  return mobileUserAgent || coarsePointer;\n};\n\nexport const openGoogleMapsLocation = (coordinates: MapCoordinates, newTab = false) => {\n  if (typeof window === 'undefined') return;\n  const url = getGoogleMapsUrl(coordinates);\n\n  if (newTab) {\n    window.open(url, '_blank', 'noopener,noreferrer');\n    return;\n  }\n\n  window.location.assign(url);\n};\n`);

// Normalize deed coordinates coming from the backend (stored as String in Prisma).
const contextPath = 'src/context/DeedContext.tsx';
let context = read(contextPath);
context = replaceOnce(
  context,
  "import { api, isApiEnabled } from '../lib/api';",
  "import { api, isApiEnabled } from '../lib/api';\nimport { normalizeMapCoordinates } from '../app/utils/mapNavigation';",
  'DeedContext import'
);
context = replaceOnce(
  context,
  "    area: Number(deed.area || 0),\n    attachments: Array.isArray(deed.attachments) ? deed.attachments : [],",
  "    area: Number(deed.area || 0),\n    coordinates: normalizeMapCoordinates(deed.coordinates) || undefined,\n    attachments: Array.isArray(deed.attachments) ? deed.attachments : [],",
  'DeedContext coordinate normalization'
);
write(contextPath, context);

// Mobile map button: open Google Maps directly. Desktop keeps internal map page.
const deedsPath = 'src/app/pages/AllDeedsPage.tsx';
let deeds = read(deedsPath);
deeds = replaceOnce(
  deeds,
  "import { toast } from 'sonner';",
  "import { toast } from 'sonner';\nimport { normalizeMapCoordinates, openGoogleMapsLocation, shouldOpenExternalMap } from '../utils/mapNavigation';",
  'AllDeeds map utility import'
);
deeds = replaceOnce(
  deeds,
  "  const confirmDelete = () => {\n    if (deedToDelete && isAdmin) {\n      deleteDeed(deedToDelete);\n      toast.success(t('deed.deletedSuccessfully'));\n      setDeleteDialogOpen(false);\n      setDeedToDelete(null);\n    }\n  };",
  "  const confirmDelete = () => {\n    if (deedToDelete && isAdmin) {\n      deleteDeed(deedToDelete);\n      toast.success(t('deed.deletedSuccessfully'));\n      setDeleteDialogOpen(false);\n      setDeedToDelete(null);\n    }\n  };\n\n  const handleMapOpen = React.useCallback((deed: any) => {\n    const coordinates = normalizeMapCoordinates(deed?.coordinates);\n\n    if (!coordinates) {\n      toast.error('لا توجد إحداثيات صالحة لهذا الصك');\n      return;\n    }\n\n    if (shouldOpenExternalMap()) {\n      openGoogleMapsLocation(coordinates);\n      return;\n    }\n\n    navigate(`/maps/${deed.id}`);\n  }, [navigate]);",
  'AllDeeds map click handler'
);
deeds = deeds.replace("{deed.coordinates ? 'متوفرة' : 'غير متوفرة'}", "{normalizeMapCoordinates(deed.coordinates) ? 'متوفرة' : 'غير متوفرة'}");
deeds = deeds.replace("{deed.coordinates && (", "{normalizeMapCoordinates(deed.coordinates) && (");
deeds = deeds.replace("onClick={() => navigate(`/maps/${deed.id}`)}", "onClick={() => handleMapOpen(deed)}");
write(deedsPath, deeds);

// Make the internal maps page defensive against legacy/string coordinate formats.
const mapsPath = 'src/app/pages/MapsPage.tsx';
let maps = read(mapsPath);
maps = replaceOnce(
  maps,
  "import { ScrollArea } from '../components/ui/scroll-area';",
  "import { ScrollArea } from '../components/ui/scroll-area';\nimport { formatMapCoordinate, normalizeMapCoordinates, openGoogleMapsLocation } from '../utils/mapNavigation';",
  'MapsPage map utility import'
);
maps = replaceOnce(
  maps,
  "  const deedsWithCoordinates = useMemo(() => {\n    return deeds.filter(deed => deed.coordinates);\n  }, [deeds]);",
  "  const deedsWithCoordinates = useMemo(() => {\n    return deeds.filter((deed) => Boolean(normalizeMapCoordinates((deed as any).coordinates)));\n  }, [deeds]);",
  'MapsPage valid coordinate filter'
);
maps = replaceOnce(
  maps,
  "  const selectedDeed = useMemo(() => {\n    return selectedDeedId ? deeds.find(d => d.id === selectedDeedId) : null;\n  }, [selectedDeedId, deeds]);",
  "  const selectedDeed = useMemo(() => {\n    return selectedDeedId ? deeds.find(d => d.id === selectedDeedId) : null;\n  }, [selectedDeedId, deeds]);\n\n  const selectedCoordinates = useMemo(() => {\n    return normalizeMapCoordinates((selectedDeed as any)?.coordinates);\n  }, [selectedDeed]);",
  'MapsPage selected coordinates'
);
maps = replaceOnce(
  maps,
  "  const openInGoogleMaps = (lat: number, lng: number) => {\n    const url = `https://www.google.com/maps?q=${lat},${lng}`;\n    window.open(url, '_blank');\n  };",
  "  const openInGoogleMaps = (lat: number, lng: number) => {\n    openGoogleMapsLocation({ latitude: lat, longitude: lng }, true);\n  };",
  'MapsPage Google Maps opener'
);
maps = replaceOnce(
  maps,
  "  // Calculate center point\n  const centerPoint = useMemo(() => {\n    if (selectedDeed?.coordinates) {\n      return selectedDeed.coordinates;\n    }\n    if (deedsWithCoordinates.length > 0) {\n      const avgLat = deedsWithCoordinates.reduce((sum, d) => sum + d.coordinates!.latitude, 0) / deedsWithCoordinates.length;\n      const avgLng = deedsWithCoordinates.reduce((sum, d) => sum + d.coordinates!.longitude, 0) / deedsWithCoordinates.length;\n      return { latitude: avgLat, longitude: avgLng };\n    }\n    return { latitude: 26.3927, longitude: 50.0438 }; // Default: Dammam\n  }, [selectedDeed, deedsWithCoordinates]);",
  "  // Calculate center point using only validated numeric coordinates.\n  const centerPoint = useMemo(() => {\n    if (selectedCoordinates) return selectedCoordinates;\n\n    const validCoordinates = deedsWithCoordinates\n      .map((deed) => normalizeMapCoordinates((deed as any).coordinates))\n      .filter((value): value is { latitude: number; longitude: number } => Boolean(value));\n\n    if (validCoordinates.length > 0) {\n      const avgLat = validCoordinates.reduce((sum, value) => sum + value.latitude, 0) / validCoordinates.length;\n      const avgLng = validCoordinates.reduce((sum, value) => sum + value.longitude, 0) / validCoordinates.length;\n      return { latitude: avgLat, longitude: avgLng };\n    }\n\n    return { latitude: 26.3927, longitude: 50.0438 }; // Default: Dammam\n  }, [selectedCoordinates, deedsWithCoordinates]);",
  'MapsPage center point'
);
maps = maps.replace("{selectedDeed && selectedDeed.coordinates && (", "{selectedDeed && selectedCoordinates && (");
maps = maps.replace(/selectedDeed\.coordinates!\.latitude/g, 'selectedCoordinates.latitude');
maps = maps.replace(/selectedDeed\.coordinates!\.longitude/g, 'selectedCoordinates.longitude');
maps = maps.replace(
  "{deed.coordinates?.latitude.toFixed(4)}, {deed.coordinates?.longitude.toFixed(4)}",
  "{formatMapCoordinate(normalizeMapCoordinates((deed as any).coordinates)?.latitude)}, {formatMapCoordinate(normalizeMapCoordinates((deed as any).coordinates)?.longitude)}"
);
write(mapsPath, maps);

console.log('Mobile Google Maps navigation and coordinate normalization applied.');
