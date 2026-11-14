# Cube Tutor

An iPhone app that teaches you to solve a 3×3 cube using the beginner (layer-by-layer) method.

- **9 lessons**: pieces and notation, then the white cross, white corners, middle layer, yellow cross, yellow edges, yellow corner placement and corner twisting.
- **Practice**: each lesson gives you a real case to solve. Use **Show me** for a step-by-step hint.
- **Solve with me**: a guided solve of a random scramble, move by move, with the textbook algorithm shown for how you are holding the cube.
- **Free play**: swipe stickers to turn layers, scramble, undo, and tap **Help** to get a guided solve from your current position.
- Real-time 3D cube: physically based materials, studio lighting and soft shadows. Works fully offline.

## Getting the IPA

Each push runs the **Build unsigned IPA** GitHub Actions workflow. To download the build:

1. Open **Actions** → **Build unsigned IPA** → the latest green run.
2. Under **Artifacts**, download **CubeTutor-unsigned-ipa**. GitHub delivers it as a `.zip`.
3. Unzip it to get `CubeTutor-unsigned.ipa`.

The IPA is **unsigned**. Sign it with your own certificate and provisioning profile (for example with Sideloadly, AltStore or Xcode/`codesign`), then install it.

- Bundle ID: `com.example.cubetutor`. Change it during signing if your tool or profile needs a different one.
- Minimum iOS version: 16.0. arm64 (any iPhone that runs iOS 16).
- No entitlements, extensions or embedded frameworks, so it signs with a free Apple ID.

## How it's built

- `CubeTutor/`: a minimal SwiftUI shell (`CubeTutorApp.swift`) hosting a `WKWebView`, plus haptics.
- `webapp/`: the app itself (Three.js and vanilla JS), bundled by esbuild into a single offline `CubeTutor/web/index.html`.
  - `src/cube.js`: the logical cube model (the single source of truth).
  - `src/solver.js`: the beginner-method solver that produces teachable steps.
  - `src/render.js`: the 3D renderer, turn animation and swipe input.
  - `src/lessons.js`: the lesson content.
  - `npm test`: verifies move directions, solves hundreds of random scrambles, and checks that every lesson demo resolves.
- `project.yml`: the XcodeGen spec. CI runs `xcodegen generate`, then an unsigned `xcodebuild` for `iphoneos`.

To build locally on a Mac:

```bash
cd webapp && npm ci && npm test && npm run build && cd ..
brew install xcodegen && xcodegen generate
open CubeTutor.xcodeproj
```
