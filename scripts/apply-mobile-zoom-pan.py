from pathlib import Path

index_path = Path('index.html')
globals_path = Path('src/styles/globals.css')

index = index_path.read_text(encoding='utf-8')
old_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
new_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />'
if old_viewport in index:
    index = index.replace(old_viewport, new_viewport, 1)
elif new_viewport not in index:
    raise SystemExit('Viewport meta tag not found in expected form')
index_path.write_text(index, encoding='utf-8')

globals_css = globals_path.read_text(encoding='utf-8')
marker = '/* ===== Mobile pinch zoom and horizontal pan freedom ===== */'
block = r'''

/* ===== Mobile pinch zoom and horizontal pan freedom ===== */
/*
 * The app shell intentionally clips normal layout overflow, but on touch devices
 * the user must still be able to pinch-zoom and pan the visual viewport in both
 * directions. These rules override only the horizontal clipping behavior while
 * keeping the responsive width constraints that prevent accidental overflow at 100%.
 */
@media (max-width: 1023px), (pointer: coarse) {
  html {
    overflow-x: auto !important;
    overscroll-behavior-x: auto !important;
    touch-action: pan-x pan-y pinch-zoom;
  }

  body,
  #root {
    overflow-x: visible !important;
    overscroll-behavior-x: auto !important;
    touch-action: pan-x pan-y pinch-zoom;
  }

  .future-app-shell,
  .app-content-row,
  .app-main,
  .mobile-page-shell {
    overflow-x: auto !important;
    overscroll-behavior-x: auto !important;
    touch-action: pan-x pan-y pinch-zoom;
  }

  .app-main {
    -webkit-overflow-scrolling: touch;
  }
}
'''
if marker not in globals_css:
    globals_css = globals_css.rstrip() + block + '\n'
globals_path.write_text(globals_css, encoding='utf-8')

print('Mobile pinch zoom and horizontal pan patch applied.')
