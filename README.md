# Latent Studio

Explorer for new architectural dimensions

> Proof of Concept (PoC) originating from master thesis research in architectural massing synthesis using 3D Generative Adversarial Networks (3DGAN) and latent space interaction.

---
## Overview
Latent Studio is a lightweight web-based viewer and mixer for procedurally generated architectural volumetric studies. It exposes—visually and interactively—regions of a trained 3DGAN latent space by letting a user browse combinatorial model indices and selectively visualize sub‑meshes (parts) via an interactive slider.

This prototype demonstrates how early‑stage architectural ideation can be accelerated by coupling:
- A large curated dataset of voxelized / meshed massings
- 3DGAN training to learn a rich latent distribution
- Systematic latent vector interpolation and sampling
- A minimal WebGL (three.js) front‑end for exploration
- Open AEC data exchange through Speckle (reference stream linked below)

The result: an extendable catalogue of intermediate typologies ("shapes" and "scapes") surfaced for rapid design space scanning before committing to detailed BIM / parametric workflows.

---
## Thesis & Attribution
Latent Studio is a project of **IAAC — Institute for Advanced Architecture of Catalonia** developed in the **Master in Advanced Computation for Architecture and Design (MaCAD)** Final Thesis 2022‑2023 by:

- **Author / Researcher:** Alberto Carro Novo  
- **Advisory / Course Context:** MaCAD 22/23 Final Thesis with Oana Taut

If referencing academically, please cite the thesis context and IAAC MaCAD program year (2022‑2023). A formal BibTeX entry can be added later if/when the written document DOI or archive link is published.

---
## Modules (Conceptual Pipeline)
| Module | Purpose | Status in this PoC |
| ------ | ------- | ------------------ |
| 1. Training | Progressive 3DGAN training on curated massing dataset; periodic latent snapshotting | External (not in repo) — illustrated via captured frames |
| 2. Interpolation Matrix | Systematic generation of intermediate latent blends to map continuity | External (artefacts not bundled) |
| 3. UI Shape Mixer | Web interface to select index pair → load model → reveal component slices | Implemented here |

---
## Live Data Reference
Speckle stream (illustrative dataset publication):  
https://speckle.xyz/streams/61ee3c1a7b

---
## Repository Structure
```
index.html          # Main HTML shell / UI ribbons / overlays
style.css           # Visual theme, ribbons, glass & blur effects
three_script.js     # Scene setup, model loading, transform controls, slider logic
assets/             # UI images, context model, branding assets
Models/             # 3DM model files (named AB.3dm by index pair)
---
## Quick Start (Local)
No build step required (pure static assets).

1. Clone or download.
2. Serve locally (optional but recommended for consistent path handling):
   - Python (3.x): `python -m http.server 8000`
   - Or VS Code Live Server extension.
3. Open: http://localhost:8000/

---
## Acknowledgements
- IAAC MaCAD Faculty & peers
- Speckle open source community
- Three.js maintainers
- Broader research in 3D GANs / volumetric generative modeling

---
"Explorer for new architectural dimensions"
