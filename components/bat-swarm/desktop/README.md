BAT SWARM / SHIP NOTES

Windows 10/11 x64. No Node, npm or separate runtime needed for this download.

1. Extract the whole ZIP to a folder you can write to.
2. Start "Bat Swarm.exe". Keep all the other files next to it.
3. Look for the small bat in the system tray, sometimes under the ^ arrow.

Move your cursor, then leave it still. The bats find visible window edges to
sleep on. Move or close a window and its bats drop, open their wings, and fly.
One wrapped bat takes a little longer to wake up when its window moves.
The overlay passes mouse clicks through to your applications.

Right-click the tray bat to pause, change the colony size, turn wing sounds on,
or quit. Sound starts off. The app does not start automatically with Windows.
There is no installer, administrator requirement, network service or account.

This is an unsigned independent app. Windows SmartScreen may warn about an
unrecognised publisher. Review the source and download provenance before
choosing whether to run it. Do not disable Windows security globally.

Known limits:
- Windows only, x64. macOS and ARM builds are not included.
- Fullscreen foreground applications hide the colony on that display.
- Protected desktops (UAC/lock screen) and elevated applications can limit
  access to normal mouse/window events. The app should stay unprivileged.
- Multi-monitor/DPI conversion is implemented, but this release was tested
  on one 150% display. Mixed-DPI physical monitors still need a hardware test.
- This release is a portable folder. Do not distribute just the EXE.

Privacy: the local helper reads window rectangles, classes, z order, foreground
client area and cursor position. It does not read window titles, documents,
typed keys or clipboard content, and it sends no network requests.

Source build (developers only):
  npm ci
  npm run build
  npm start

Electron 45.0.0 runtime. Preserve its LICENSE and LICENSES.chromium.html files.
Application source and bat artwork: MIT, Ship Notes / aqualang89.

In the repository, open a terminal in components/bat-swarm/desktop.
In the source ZIP, keep desktop and component beside each other.
The build supports both source layouts.
The build copies the shared painter and sound module into desktop/component.
The built EXE is a helper; use npm start to run the desktop app from source.
