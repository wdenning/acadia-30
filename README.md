# Acadia 30

A tracker for the Acadia National Park Full 30 Peak Challenge (Peakery's list). Live at **https://wdenning.github.io/acadia-30/**

- **Comparative heights chart** in the style of Johnson's 1860s mountain charts, sorted by height or grouped by outing
- **Trail map**: OpenStreetMap trails and summits drawn in the site's own style, over shaded relief and contours (in feet) from USGS elevation data. Hover a trail to trace it; tap a summit to highlight the trails that reach it.
- **Rankings** by elevation and prominence, nine suggested outings, and a check-off list with summit dates
- **Installable app with an offline copy**: footer → *Download as app*. "Save offline copy" stores the page and the island's map (about 25 MB) for use with no signal.

It's static files with no build step, no server and no tracking. Checkmarks are saved only in each visitor's own browser.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole page: data, styles and script |
| `app.js` | Install prompt, offline copy, CSV downloads |
| `sw.js` | Service worker that serves the site and saved map tiles offline |
| `manifest.webmanifest`, icons | App name and icons for installing |
| `vendor/` | MapLibre GL JS 4.7.1, maplibre-contour 0.1.0 and the fonts, with their licenses |

When you change files that the service worker caches, bump `VERSION` in `sw.js` so returning visitors get the update.

## Testing locally

Install and offline features need a web server; they don't work when `index.html` is opened as a file.

```
cd acadia-30
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Credits

All sources are listed on the site under **Sources & data**. In short: peak list, elevations and prominence from [Peakery](https://peakery.com/challenges/acadia-national-park-full-30-peak-challenge/). Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), tiles from [OpenFreeMap](https://openfreemap.org). Elevation from [Terrain Tiles on AWS](https://registry.opendata.aws/terrain-tiles/) (USGS 3DEP). Built with [MapLibre GL JS](https://maplibre.org) and [maplibre-contour](https://github.com/onthegomap/maplibre-contour). Fonts under the SIL Open Font License via [Fontsource](https://fontsource.org).

Map positions come from OpenStreetMap. Carry a proper trail map when hiking.
