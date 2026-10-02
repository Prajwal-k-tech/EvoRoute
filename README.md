# EvoRoute

An interactive routing simulator built for a Data Structures 2 course project. Create a network, switch between distance-vector and link-state models, and inspect how routing tables change after a link failure.

[Demo](https://prajwal-k-tech.github.io/EvoRoute/)

## Simulation

- Add routers and links with configurable bandwidth.
- Animate routing updates and inspect per-router tables and step logs.
- Compare a RIP-style hop-count model, with 16 treated as unreachable, against an OSPF-style link-state model using flooding and Dijkstra's algorithm.
- Explore count-to-infinity behavior after link failures.

The implementation uses an adjacency-list graph, a custom min-heap and map-based tables. Link-state costs are rounded from `10,000 / bandwidth_in_Mbps`.

These are simplified browser simulations for learning. They do not exchange real routing packets or establish compliance with the complete RIP/OSPF specifications. Convergence in a demonstration is not evidence of universally loop-free behavior.

## Run locally

Use Node.js 22 and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:9002`.

```sh
npm run build
```

The Next.js configuration exports static files into `out/` with the production base path `/EvoRoute`. Serve that directory under the same path when checking the export.

## Source

- `src/app/page.tsx`: simulation state, updates and visualization controls.
- `src/lib/data-structures.ts`: graph and min-heap implementations.
- `src/lib/types.ts`: router, route and packet types.
- `src/components/`: network canvas, tables and controls.

Built by Prajwal K for coursework in October 2025. Older submission and presentation documents remain in the repository as course artifacts.
