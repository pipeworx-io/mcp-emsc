interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * EMSC (European-Mediterranean Seismological Centre) MCP — wraps the
 * seismicportal.eu FDSN event web service (no auth required).
 *
 * FDSN-standard event API. Global coverage with especially strong
 * Europe/Mediterranean reporting — complements USGS. All times are UTC ISO
 * 8601, depth is in km, and `flynn_region` is the human-readable place name.
 *
 * Tools:
 * - search_earthquakes: full FDSN filter search (time range, magnitude,
 *   bounding box OR center+radius, ordering)
 * - recent_earthquakes: convenience — last N days above a minimum magnitude
 */


const BASE = 'https://www.seismicportal.eu/fdsnws/event/1';
const UA = 'pipeworx-mcp-emsc/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_earthquakes',
    description:
      'Search seismic events from EMSC (European-Mediterranean Seismological Centre) via the FDSN-standard seismicportal.eu API. Global coverage with especially strong Europe/Mediterranean reporting — complements USGS. Filter by UTC time range, magnitude, and location (either a bounding box OR a center point + radius in degrees). Times are UTC ISO 8601, depth in km, and place names come from the Flynn-Engdahl region. Example: search_earthquakes({ start: "2026-01-01", end: "2026-02-01", minmag: 5.0, orderby: "magnitude" }) or search_earthquakes({ lat: 38.0, lon: 23.7, maxradius: 5, minmag: 3 }).',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start of UTC time window, ISO 8601 (e.g. "2026-01-01" or "2026-01-01T00:00:00").' },
        end: { type: 'string', description: 'End of UTC time window, ISO 8601.' },
        minmag: { type: 'number', description: 'Minimum magnitude (optional).' },
        maxmag: { type: 'number', description: 'Maximum magnitude (optional).' },
        minlat: { type: 'number', description: 'Bounding box southern latitude, -90 to 90 (optional).' },
        maxlat: { type: 'number', description: 'Bounding box northern latitude, -90 to 90 (optional).' },
        minlon: { type: 'number', description: 'Bounding box western longitude, -180 to 180 (optional).' },
        maxlon: { type: 'number', description: 'Bounding box eastern longitude, -180 to 180 (optional).' },
        lat: { type: 'number', description: 'Center latitude for circular search (use with lon + maxradius).' },
        lon: { type: 'number', description: 'Center longitude for circular search (use with lat + maxradius).' },
        maxradius: { type: 'number', description: 'Maximum radius in degrees from center lat/lon (optional).' },
        minradius: { type: 'number', description: 'Minimum radius in degrees from center lat/lon (optional).' },
        limit: { type: 'number', description: 'Maximum number of results, 1-1000 (default: 50).' },
        orderby: {
          type: 'string',
          enum: ['time', 'time-asc', 'magnitude', 'magnitude-asc'],
          description: 'Result ordering (default: "time", i.e. newest first).',
        },
      },
      required: [],
    },
  },
  {
    name: 'recent_earthquakes',
    description:
      'Get recent earthquakes from EMSC (European-Mediterranean Seismological Centre): the last N days above a minimum magnitude, newest first. Convenience wrapper over the FDSN event API. Global coverage, strong in Europe/Mediterranean. Times are UTC ISO 8601, depth in km. Example: recent_earthquakes({ days: 7, minmag: 4 }).',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'How many days back to look (default: 7).' },
        minmag: { type: 'number', description: 'Minimum magnitude to include (default: 4).' },
        limit: { type: 'number', description: 'Maximum number of results, 1-1000 (default: 50).' },
      },
      required: [],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_earthquakes':
      return searchEarthquakes(args);
    case 'recent_earthquakes':
      return recentEarthquakes(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function clampLimit(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : fallback;
  return Math.min(1000, Math.max(1, Math.floor(n)));
}

async function searchEarthquakes(args: Record<string, unknown>) {
  const params = new URLSearchParams({ format: 'json' });

  const passthrough = [
    'start', 'end', 'minmag', 'maxmag',
    'minlat', 'maxlat', 'minlon', 'maxlon',
    'lat', 'lon', 'maxradius', 'minradius', 'orderby',
  ] as const;
  for (const key of passthrough) {
    if (args[key] != null) params.set(key, String(args[key]));
  }
  if (!params.has('orderby')) params.set('orderby', 'time');
  params.set('limit', String(clampLimit(args.limit, 50)));

  return emscQuery(params);
}

async function recentEarthquakes(args: Record<string, unknown>) {
  const days = typeof args.days === 'number' ? args.days : 7;
  const minmag = typeof args.minmag === 'number' ? args.minmag : 4;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    format: 'json',
    start,
    minmag: String(minmag),
    orderby: 'time',
    limit: String(clampLimit(args.limit, 50)),
  });

  return emscQuery(params);
}

async function emscQuery(params: URLSearchParams) {
  const res = await fetch(`${BASE}/query?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });

  // FDSN returns 204 No Content when a valid query matches zero events.
  if (res.status === 204) return { count: 0, earthquakes: [] };

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EMSC: ${res.status} ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as EmscResponse;
  return formatQuakes(data);
}

interface EmscResponse {
  type: string;
  metadata?: { count?: number };
  features: Array<{
    id: string;
    geometry: { coordinates: [number, number, number] };
    properties: {
      mag: number | null;
      magtype: string | null;
      time: string;
      lastupdate: string | null;
      lat: number;
      lon: number;
      depth: number | null;
      flynn_region: string | null;
      evtype: string | null;
      auth: string | null;
      source_catalog: string | null;
      unid: string;
    };
  }>;
}

function formatQuakes(data: EmscResponse) {
  const features = data.features ?? [];
  return {
    count: data.metadata?.count ?? features.length,
    earthquakes: features.map((f) => {
      const p = f.properties;
      return {
        id: f.id,
        magnitude: p.mag,
        magnitude_type: p.magtype,
        place: p.flynn_region,
        time: p.time,
        updated: p.lastupdate,
        latitude: p.lat,
        longitude: p.lon,
        depth_km: p.depth,
        event_type: p.evtype,
        author: p.auth,
        catalog: p.source_catalog,
      };
    }),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
