# Blender botanical collection

The editable master project is `garden-60-models.blend`. Each named collection
contains one species/quality model. The contact sheet shows all 60 exports.

Production assets are in `www/models/flowers/`: twelve species, five qualities
per species, with a manifest of URLs, sizes and actual exported triangle counts.
The web app loads them only when needed. The largest model is below 2 MB.

Rebuild from the repository root with an installed Blender 5.2:

```text
node scripts/export-flower-recipes.js
blender --background --factory-startup --python scripts/build-blender-flowers.py
node --test tests/blender-assets.test.js
```

Geometry is authored with distinct botanical structures and explicit UVs:
annular petals with separated angular sectors and layer heights; convex rose
petals wrapping a compact flower centre; offset tulip
cup shells; spherical hydrangea floret spacing; tiered hyacinth flowers;
individual lily-of-the-valley bells; iris standards/falls; and orchid blossoms
on a flowering arch. Thin edges are generated with Blender Solidify modifiers.
Flower stems and leaves are included; the app keeps each specimen's existing pot.

GLBs include pigment colours, UVs, normals and botanical role metadata. The app
reuses each item's diffuse, vein, bump and roughness maps on the imported meshes,
preserving template, pattern seed, wear and grade. The quality comparison control
continues to be available only to administrators. Seed, sprout and bud previews
continue to use their existing growth-stage geometry.

The build is deterministic. The collection is a stylised botanical asset set;
intentional attachment overlaps remain at stems, calyxes and flower centres.

Validation covers every GLB with the actual Three.js loader, finite attributes,
index bounds, UVs/normals, camera bounds, five distinct forms per species,
material reuse, source caching, independent disposal and failed-download retry.
`node scripts/check-blender-ui.js` checks the real mobile-size browser preview
and six loaded shelf models, and saves screenshots under `screenshots/blender/`.
