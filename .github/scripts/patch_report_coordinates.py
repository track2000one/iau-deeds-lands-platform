from pathlib import Path

path = Path('src/app/pages/ReportsPage.tsx')
text = path.read_text(encoding='utf-8')

old = """  const formatCoordinates = (coordinates: any) => {
    if (!coordinates) return '-';

    if (typeof coordinates === 'string') {
      return coordinates;
    }

    if (
      typeof coordinates.latitude === 'number' &&
      typeof coordinates.longitude === 'number'
    ) {
      return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    }

    return '-';
  };"""

new = """  const formatCoordinates = (coordinates: any) => {
    if (!coordinates) return '-';

    const formatPair = (latitude: unknown, longitude: unknown) => {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '-';

      return `${lat.toFixed(6)}° N  |  ${lng.toFixed(6)}° E`;
    };

    if (typeof coordinates === 'object') {
      return formatPair(
        coordinates.latitude ?? coordinates.lat,
        coordinates.longitude ?? coordinates.lng ?? coordinates.lon
      );
    }

    if (typeof coordinates === 'string') {
      const raw = coordinates.trim();
      if (!raw) return '-';

      // Supports JSON, historical object strings using single quotes,
      // and plain coordinate pairs such as "26.405396, 50.178053".
      const normalizedJson = raw.replace(/'/g, '"');
      try {
        const parsed = JSON.parse(normalizedJson);
        if (parsed && typeof parsed === 'object') {
          const formatted = formatPair(
            parsed.latitude ?? parsed.lat,
            parsed.longitude ?? parsed.lng ?? parsed.lon
          );
          if (formatted !== '-') return formatted;
        }
      } catch {
        // Continue with tolerant text parsing for historical records.
      }

      const latitudeMatch = raw.match(/(?:latitude|lat)\\s*['\"]?\\s*[:=]\\s*['\"]?\\s*(-?\\d+(?:\\.\\d+)?)/i);
      const longitudeMatch = raw.match(/(?:longitude|lng|lon)\\s*['\"]?\\s*[:=]\\s*['\"]?\\s*(-?\\d+(?:\\.\\d+)?)/i);

      if (latitudeMatch && longitudeMatch) {
        return formatPair(latitudeMatch[1], longitudeMatch[1]);
      }

      const pairMatch = raw.match(/(-?\\d+(?:\\.\\d+)?)\\s*[,،]\\s*(-?\\d+(?:\\.\\d+)?)/);
      if (pairMatch) {
        return formatPair(pairMatch[1], pairMatch[2]);
      }

      return raw;
    }

    return '-';
  };"""

if old not in text:
    raise SystemExit('Target formatCoordinates block not found')

text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('ReportsPage coordinates formatter updated successfully')
