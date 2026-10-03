# Hadal: the expedition

A made-up expedition to the bottom of the Mariana Trench, 10,935 m down. Astra drew the first version (the jellyfish and the hydrophone), Claude Code took it the rest of the way for [Ship Notes](https://x.com/shipnotesai).

**[Dive in live](https://aqualang89.github.io/shipnotes-components/worlds/hadal-expedition/)**, sound on. The first Hadal, the one with the red can, is still in [worlds/hadal](../hadal).

## On the way down

- Red goes first. Light fades per meter the way it does in pure water (red 0.36, green 0.07, blue 0.023), so the jellyfish loses its red in the first 20 m. The site's coral buttons lose it too.
- At 200 m about 1% of the sunlight is left, and three in four animals make their own light. You can reveal the jellies' structure.
- Around 850 m a Cuvier's beaked whale passes, seen only by the plankton it lights up.
- Below 1,000 m there's no sun. Your cursor (or finger) is the lamp: anything that doesn't glow on its own shows up only in its beam.
- A red Atolla jellyfish hides in the dark. Tap it and it flashes its blue alarm. Something bigger answers.
- A humpback anglerfish fishes with a lure full of bacteria. Keep your light on it.
- In the abyss, tune the hydrophone until the lander on the floor answers.
- The last fish at 8,336 m, then the floor at 10,935 m: the lander, amphipods on the bait, the first warm light in 10 km.
- After the bottom: a field guide to the five animals, a chart with Everest to scale, and a postcard you can save as a PNG.
- Every sound is synthesized in the browser.

## Run it

Open `index.html`. No build, no libraries, no network, no images: the whole ocean is lines on one Canvas 2D.

| File | What it is |
| --- | --- |
| `index.html` | the page: zones, field guide, chart, field notes with sources |
| `style.css` | layout, type, motion |
| `app.js` | depth from scroll, HUD, the lamp, taps, sound, field guide, chart, postcard, `hadal.renderAt()` for frame-by-frame capture |
| `scene.js` | the ocean: one light model, snow in three layers, the animals drawn as lines with volume |
| `assets/` | Barlow and Barlow Condensed, SIL OFL |

`prefers-reduced-motion` starts paused. Runs at 60 fps on an Intel Iris Xe laptop, at 1440 and 390 px.

## Facts used

- Challenger Deep 10,935 ± 6 m: Greenaway et al., 2021. Everest 8,848.86 m: 2020 survey.
- Light in water and why deep animals are red: NOAA Ocean Exploration.
- Three in four animals in open water make light: Martini and Haddock, Scientific Reports, 2017.
- Atolla wyvillei, Praya dubia, Melanocetus johnsonii: MBARI Deep-Sea Guide, WHOI.
- Deepest fish filmed, 8,336 m: University of Western Australia, 2023.
- Hirondellea gigas and sunken wood: Kobayashi et al., PLOS ONE, 2012.
- Cuvier's beaked whale, 2,992 m and 137.5 minutes: Schorr et al., PLOS ONE, 2014.

The expedition, the lander and its signal are made up. The animals are drawn by hand in code, close to life but not to scale.

MIT, see the repo [LICENSE](../../LICENSE).
