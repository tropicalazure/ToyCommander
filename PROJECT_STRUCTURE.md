
# ToyCommander Project Structure

This is the definitive map of the application. All development happens within these core directories.

## 📂 `src/ai` (Generative AI)
Genkit integration and AI agent logic.
- `genkit.ts`: Core AI initialization.
- `dev.ts`: Developer tool hooks.
- `flows/`: Workflow definitions for AI operations.

## 📂 `src/app` (Semantic Routing)
The app is organized by feature domain.
- `page.tsx`: Landing page.
- `toycontrols/`: Hardware control interfaces.
    - `host/[id]/`: Private room for the hardware owner.
    - `remote/[id]/`: Interface for the remote partner (controller).
- `games/`: The Interactive Hub for hardware-linked experiences.
    - `page.tsx`: Experience library.
    - `reactive-maze/`: Solo/Partner tactile navigation.
    - `rhythm-pulse/`: Advanced audio-sync visualization.

## 📂 `src/components` (Feature-Driven Modules)

### 📁 `ui/` (Design Primitives & Shell)
- Standardized ShadCN UI components (Button, Slider, etc.).
- `app-sidebar.tsx`: The primary navigation shell.
- `logo.tsx`: The ToyCommander brand identity.

### 📁 `features/toycontrols/` (Hardware Logic)
- `control-hub.tsx`: The unified hardware interface.
- `interaction-modes.tsx`: Orchestrator for Manual/Pattern/Audio modes.
- `manual-mode.tsx`: Precision touch and slider inputs.
- `patterns-mode.tsx`: Algorithmic vibration patterns.
- `audio-mode.tsx`: Real-time microphone analysis.
- `device-manager.tsx`: Bluetooth pairing and battery status.
- `connection-status.tsx`: Visual feedback for network/hardware states.

### 📁 `features/games/` (Interactive Content)
- `reactive-maze.tsx`: Game engine for the tactile maze.

## 📂 `src/hooks` (Logic Layer)
- `use-control-session.ts`: Firebase RTDB sync and session roles.
- `use-vibration-engine.ts`: Pattern math and audio analysis.
- `use-wake-lock.ts`: Prevents screen sleep.
- `use-mobile.tsx`: Responsive breakpoint detection.
- `use-toast.ts`: Global notification management.

## 📂 `src/lib` (Core Services)
- `buttplug/`: Hardware abstraction layer (WASM).
- `firebase.ts`: Realtime Database initialization.
- `vibration-patterns/`: Modular "plugin" logic for tactile sensations.
- `placeholder-images.json`: Master image asset registry.
- `placeholder-images.ts`: Image service for the application.
- `session-id.ts`: Friendly ID generation for rooms.
- `utils.ts`: Tailwind CSS utility merging.

## 📂 `src/types` (Global Definitions)
- `vibration.ts`: Interfaces for the modular tactile engine.
- `cdn-modules.d.ts`: Type declarations for external CDN modules.
