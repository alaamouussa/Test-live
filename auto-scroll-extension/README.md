# Auto Scroll & HTML Extractor

A Chrome extension that auto-scrolls any page at the speed you choose and saves the page as an `.html` file.

## Install (unpacked)
1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `auto-scroll-extension` folder.
4. Pin the extension from the puzzle-piece menu so its icon is easy to reach.

## Use
1. Open any website and click the extension icon — the Auto Scroll side panel opens on the right.
2. Type a speed (pixels per step; one step every 50 ms — e.g. 50 ≈ 1000 px/second) and press **Start**.
3. The panel stays open while the page scrolls, so **Stop** is always one click away. The icon also
   shows a green **ON** badge while it runs.
4. To stop: press **Stop** in the panel, or press **Esc** on the page. It also stops by itself
   about 3 seconds after reaching the bottom (it waits so infinite-scroll pages can load more).
   The panel always shows the state of the tab you're looking at, and updates when you switch tabs.
5. While running, enter a new number and press **Update speed** to change speed.
6. Press **Extract HTML** to save the current page (including anything loaded while scrolling) to
   your Downloads folder.

## Notes
- The saved HTML is the page's current markup. Images and stylesheets still point to the original
  website, so the file looks best when you're online.
- Chrome doesn't allow extensions on `chrome://` pages or the Chrome Web Store.
