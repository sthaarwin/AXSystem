# AXSystem — System Design Canvas

A Material Design 3 (dark) interactive canvas for visually designing system architectures. Drag components from the palette onto the canvas, connect them, configure node properties, and export/import architecture JSON.

**Features**
- Drag-and-drop palette of architectural components (compute, networking, storage, queues)
- Material 3 dark styled nodes with icons, badges, and connection handles
- Connect nodes with directional animated edges to represent traffic
- Per-node configuration drawer (name, instance count, strategy, cost, latency)
- Real-time cost estimation and traffic simulation toggle
- Export and import architecture JSON

**Tech Stack**
- React + TypeScript
- React Flow (node rendering, drag/position, edges)
- Tailwind CSS with Material 3 dark tokens
- Vite for build/dev

## Development

Prerequisites: Node.js (use nvm to install if needed)

```sh
git clone https://github.com/sthaarwin/AXSystem.git
cd AXSystem
npm install
npm run dev
```

## Scripts
- `npm run dev` — Start development server
- `npm run build` — Build production bundle
- `npm run preview` — Preview production build

## Contributing
Open issues or pull requests. For major changes, open an issue to discuss first.

## License
MIT

See the `src/` directory for implementation details and `components/` for UI building blocks.
