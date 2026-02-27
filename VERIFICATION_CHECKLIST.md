# System Fix Verification Checklist

**Architecture**
- [ ] Viewport height is fixed (no auto expansion).
- [ ] Infinite canvas pans and zooms via transform only.
- [ ] Pages are absolutely positioned and draggable.
- [ ] Elements are absolutely positioned within pages.

**Header Layout**
- [ ] Header height is 64px via `h-16`.

**Selection and Property Panel**
- [ ] Clicking an element on an inactive page activates the page.
- [ ] Selected element shows ring, offset, and shadow styling.
- [ ] Property panel updates when selection changes.

**Drag Separation**
- [ ] Canvas pan only triggers on empty canvas.
- [ ] Page drag only triggers on page background.
- [ ] Element drag only triggers on element interaction.

**View and Platform Toggles**
- [ ] Platform switch updates frame size.
- [ ] View mode toggle updates layout without breaking selection.

**Build Checks**
- [ ] TypeScript has no errors.
- [ ] Next.js build succeeds.

**Manual Tests**
1. Test 1: Basic element selection. Steps: open workspace, click a text element. Expected: outline appears and property panel updates.
2. Test 2: Property panel updates. Steps: change spacing or alignment in the panel. Expected: canvas updates immediately.
3. Test 3: Cross-page selection. Steps: click an element on page 1, then page 2. Expected: active page changes and selection follows.
4. Test 4: Element dragging. Steps: drag an element and release. Expected: new position persists.
5. Test 5: Page dragging. Steps: drag page background. Expected: page moves, elements stay relative.
6. Test 6: Canvas panning. Steps: drag empty canvas. Expected: view pans, pages move together.
7. Test 7: Text editing. Steps: double-click text element, edit, blur. Expected: content updates.
8. Test 8: Header height. Steps: inspect top bar. Expected: 64px height with no truncation.
9. Test 9: Platform switch. Steps: toggle web and mobile. Expected: frame width changes correctly.
10. Test 10: View mode. Steps: toggle full and workspace view. Expected: sidebar visibility updates without layout glitches.
