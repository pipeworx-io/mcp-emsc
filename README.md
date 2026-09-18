# mcp-emsc

EMSC (European-Mediterranean Seismological Centre) MCP — wraps the

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/emsc/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Emsc data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/emsc_search_earthquakes \
  -H 'Content-Type: application/json' \
  -d '{"start":"2026-01-01","end":"2026-02-01","minmag":5,"orderby":"magnitude"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/emsc_search_earthquakes`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
