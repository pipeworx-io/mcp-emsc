# mcp-emsc

EMSC (European-Mediterranean Seismological Centre) MCP — wraps the

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_earthquakes` | Search seismic events from EMSC (European-Mediterranean Seismological Centre) via the FDSN-standard seismicportal.eu API. Global coverage with especially strong Europe/Mediterranean reporting — complements USGS. Filter by UTC time range, magnitude, and location (either a bounding box OR a center point + radius in degrees). Times are UTC ISO 8601, depth in km, and place names come from the Flynn-Engdahl region. Example: search_earthquakes({ start: "2026-01-01", end: "2026-02-01", minmag: 5.0, orderby: "magnitude" }) or search_earthquakes({ lat: 38.0, lon: 23.7, maxradius: 5, minmag: 3 }). |
| `recent_earthquakes` | Get recent earthquakes from EMSC (European-Mediterranean Seismological Centre): the last N days above a minimum magnitude, newest first. Convenience wrapper over the FDSN event API. Global coverage, strong in Europe/Mediterranean. Times are UTC ISO 8601, depth in km. Example: recent_earthquakes({ days: 7, minmag: 4 }). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "emsc": {
      "url": "https://gateway.pipeworx.io/emsc/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Emsc data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
