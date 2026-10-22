# mondrAIn

**mondrAIn** is a desktop application for playful, visual exploration of images through transformations. Users bring a single image into the app, try different effects, and compare outcomes without committing to a destructive edit pipeline. The product is meant to feel immediate and experimental: upload, pick an effect, see the result, try another.

---

## Vision

mondrAIn treats image editing as **reversible inspection**, not as layered document history. The app is a sandbox where each transformation is a lens on the same source material. Users learn how an image behaves under different operations (tone, symbolization, color rearrangement, geometry) without managing stacks of edits or worrying that one choice locks in the next.

The experience should be:

- **Local and self-contained** — runs on the user’s machine as a desktop app; the working set is one loaded image and its derived previews.
- **Visual-first** — the canvas (or preview area) is the center of attention; controls are simple entry points into effects, not a full photo-editing suite.
- **Low ceremony** — loading an image and applying an effect should require minimal steps; format and filename should not drive behavior.
- **Honest about the source** — every effect is a fresh read of the original pixels, so comparisons between effects stay fair and predictable.

mondrAIn is not positioned as a replacement for professional retouching tools. It is a focused instrument for **seeing the same image in many ways**—grayscale structure, ASCII representation, permuted colors, flipped or mirrored geometry—and for building intuition about digital images as data.

---

## Capabilities (product scope)

The application is centered on a small, coherent set of transformations:

| Area | Intent |
|------|--------|
| **Grayscale** | Reduce the image to luminance so structure, contrast, and composition stand out without color. |
| **ASCII** | Map regions of the image to character density or symbols so the picture becomes readable text-art while preserving broad tonal layout. |
| **Swap / shift colors** | Reorder or offset color channels (or analogous color assignments) to produce surreal or systematic palette variations from the same pixel grid. |
| **Flip / mirror** | Reflect the image horizontally, vertically, or both, for symmetry studies and quick geometric checks. |

New work in this repository should stay aligned with this scope: effects that operate on the loaded pixel grid, produce a clear preview, and respect the independence rules below—not open-ended plugin ecosystems or unrelated desktop features unless the product direction explicitly changes.

---

## General knowledge

Agents and contributors should treat the following as fixed product truths unless the user or maintainers explicitly revise them.

### Pixel grid model

- Whenever the user uploads an image, treat it as a **grid (matrix) of pixels**. The file format (PNG, JPEG, BMP, etc.) and the file name are **irrelevant** to how transformations are defined; they are only a means to populate width, height, and per-cell color (or luminance) values.
- All logic—grayscale, ASCII mapping, color swap/shift, flip/mirror—reasons about **cells in that grid**, not about paths, extensions, or container metadata.

### Independent transformations

- **All transformations are applied to the original image.** If a user applies transformation A and then applies transformation B, the two operations are **independent of each other**: B does not run on the output of A unless the product direction explicitly changes.
- In practice: the app keeps one canonical **source bitmap** (the uploaded pixel grid). Each effect reads from that source and produces its own result for display or export. Switching effects or re-running an effect does not accumulate hidden state from prior effects.
- This supports side-by-side mental models (“what does ASCII do vs. grayscale on *this* photo?”) and keeps behavior easy to explain and test.

---

## Tone for implementation (when work begins)

This document describes **idea and vision**, not a build plan. When implementation starts elsewhere:

- Prefer clarity of the pixel model and source-image semantics over feature breadth.
- Keep the desktop UX oriented around **one image, many views**, not multi-document projects.
- Preserve the independence rule in architecture (single source buffer, effect functions as `source → preview`) so user expectations match behavior.

Questions about stack choice, UI framework, or file I/O belong in separate technical docs; they are out of scope for this file.
