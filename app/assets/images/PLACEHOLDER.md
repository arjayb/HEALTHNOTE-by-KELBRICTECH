The notebook/heartbeat/shield artwork (main screen) is specified in
CLAUDE_HANDOFF.md rule #4 as an allowed bundled raster asset. Not
included here — export it from the approved reference at 3x density
and place it in this directory, then point main_screen.dart's artwork
Container at it (currently a placeholder box).

App icon placeholders (android/app/src/main/res/mipmap-*/ic_launcher.png)
are also not generated — use `flutter_launcher_icons` or manually export
from a real design tool once the icon is finalized and approved.
