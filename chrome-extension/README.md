# Minerva Tab Group (Chrome extension)

Keeps the Minerva app (`http://localhost:8123`) in a single, reused tab that
lives in a blue tab group named **minerva**, pinned as the first group.

Chrome tab groups can't be controlled from the command line or AppleScript, so
this small extension is the reliable way to manage them. `server.py` already
reuses the existing tab on macOS; this extension adds the group behavior and
also de-duplicates Minerva tabs on any platform.

## Install (once)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `chrome-extension/` folder.

That's it. Next time you run `python3 server.py`:

- If a Minerva tab already exists, it is reused (duplicates are closed).
- The tab is placed in a **blue** group titled **minerva**, moved to the front.

## Notes / limitations

- Color is `blue` (the second color in Chrome's group palette). Valid colors:
  grey, blue, red, yellow, green, pink, purple, cyan, orange. Chrome has no
  white group color.
- "First group" means leftmost, after any pinned tabs.
- If you keep Minerva tabs open in two different windows, the extension keeps
  the most recently loaded one and closes the other.
- To change the name/color, edit `GROUP_TITLE` / `GROUP_COLOR` in
  `background.js` and reload the extension from `chrome://extensions`.
