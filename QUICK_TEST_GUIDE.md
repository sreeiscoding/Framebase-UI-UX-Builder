# Quick Start: Testing Your Fixes

**Start Dev Server**
```bash
npm run dev
```

Open: <http://localhost:3000/workspace>

**Run the Tests**
1. Basic selection. Steps: click a text element. Expected: outline appears and property panel updates.
2. Property panel updates. Steps: adjust spacing or alignment. Expected: canvas updates immediately.
3. Cross-page selection. Steps: select an element on page 1, then page 2. Expected: active page switches.
4. Element dragging. Steps: drag an element to a new position. Expected: position persists.
5. Page dragging. Steps: drag page background. Expected: page moves, elements stay relative.
6. Canvas panning. Steps: drag empty canvas. Expected: view pans.
7. Text editing. Steps: double-click text, edit, blur. Expected: content updates.
8. Header height. Steps: inspect top bar. Expected: 64px height with no truncation.
9. Platform switch. Steps: toggle web and mobile. Expected: frame width changes.
10. View mode. Steps: toggle full and workspace view. Expected: sidebar shows or hides correctly.

**Debug Tips**
- If selection fails, confirm the page activates and the element has `data-canvas-element='true'`.
- If the property panel does not update, verify `selectedElementId` changes in workspace context.
- If dragging fails, ensure you are interacting with the correct target (element vs page vs empty canvas).
