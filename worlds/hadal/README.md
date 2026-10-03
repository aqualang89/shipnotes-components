# Hadal

Scroll to the bottom of the ocean, 10,935 m down. Built with Claude Code for [Ship Notes](https://x.com/shipnotesai).

**[Dive in live](https://aqualang89.github.io/shipnotes-components/worlds/hadal/)**, sound on.

## What happens on the way down

- The water takes the colors the way real water does: red goes first, blue lasts longest. A red can rides along and turns black by about 20 m.
- The HUD shows depth, pressure and how much sunlight is left.
- Below 1,000 m there's no sun. Your cursor (or finger) is the only light. The jellyfish drift out of the beam.
- Tap the water: a wave of light runs through the marine snow and the jellyfish flash back.
- Scroll fast and the snow streaks into rain. It also parts around your cursor.
- A glowing siphonophore stretches across several screens around 3,000 m.
- At the bottom the torch finds the floor, and Everest gets drawn to scale. It fits with about 2 km of water above its peak.
- Sound is synthesized in the browser: the rumble gets lower as you sink, there's a whale near 1,000 m and sonar on every tap.

## Run it

Open `index.html`. No build, no server, no network: Three.js and the font are in the folder. It also works served from any static host.

| File | What it is |
| --- | --- |
| `index.html` | page, zones, text, HUD |
| `hadal.js` | the scene: water color by depth, snow, jellyfish, siphonophore, floor, torch, sound, post effects |
| `vendor/three-r180.js` | Three.js r180, MIT |
| `fonts/` | Barlow Condensed Bold, SIL OFL |

`prefers-reduced-motion` slows the snow and stops the drifting. Phones get half the particles.

## Facts used

Challenger Deep 10,935 m (Greenaway et al., 2021). Everest 8,848.86 m (2020 survey). About 3 in 4 animals in open water make light (Martini and Haddock, 2017). Pressure grows about 1 atm per 10 m. Creatures and their colors are artistic, not species-accurate.

MIT, see the repo [LICENSE](../../LICENSE).
