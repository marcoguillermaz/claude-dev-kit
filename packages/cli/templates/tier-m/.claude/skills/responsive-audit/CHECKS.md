# responsive-audit — Check Reference

Scripts and patterns referenced by SKILL.md. Run as-is or adapt to your stack.

## Static pre-check patterns

### S1 — Viewport unit font trap
```
text-\[[0-9.]+vw\]|font-size.*[0-9]vw|fontSize.*vw
```

### S2 — overflow:hidden on html/body
```
(html|body).*overflow.*hidden|overflow.*hidden.*(html|body)
```

### S3 — Images without responsive width constraint

Adapt to your stack - the pattern must find `<img>` tags missing a responsive width class or style.

| Stack | Pattern |
|---|---|
| React + Tailwind | `<img(?![^>]*className[^>]*(w-full\|max-w\|object-))` |
| HTML + Tailwind | `<img(?![^>]*class[^>]*(w-full\|max-w\|object-))` |
| HTML + vanilla CSS | `<img(?![^>]*style[^>]*(max-width\|width:\s*100))` |
| Generic | `<img` then manually verify each hit has a width constraint |

## DOM check scripts

Run via `browser_evaluate` at the indicated step.

### Preflight validation (Step 5 — before screenshot)

```js
({
  loaded: document.readyState === 'complete',
  hasMain: (document.querySelector('main')?.innerText?.length ?? 0) > 30,
  noError: !document.title.toLowerCase().includes('error') &&
            !document.body.innerText.includes('Application error') &&
            !document.body.innerText.includes('500'),
  vpWidth: window.innerWidth
})
```

### Overflow check (Step 5 — after screenshot)

```js
(() => {
  const htmlW = document.documentElement.scrollWidth;
  const vpW = window.innerWidth;
  const tables = Array.from(document.querySelectorAll('table'));
  const tableOverflows = tables.map(t => ({
    el: t.className.split(' ').slice(0,3).join('.'),
    hasScrollWrapper: !!t.closest('[class*="overflow-x"]'),
    overflowPx: Math.max(0, t.scrollWidth - vpW)
  })).filter(t => t.overflowPx > 0);
  return {
    hasHorizontalScroll: htmlW > vpW,
    overflowPx: Math.max(0, htmlW - vpW),
    offendingElements: Array.from(document.querySelectorAll('*'))
      .filter(el => el.scrollWidth > vpW)
      .slice(0, 5)
      .map(el => el.tagName + (el.className ? '.' + el.className.split(' ').slice(0,3).join('.') : '')),
    tableOverflows
  };
})()
```

### Tap target check (Step 5 — BP0 + BP1 only)

```js
(() => {
  const interactives = Array.from(document.querySelectorAll('button, a[href], [role="button"], input, select'));
  const tooSmall = interactives
    .map(el => {
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent ?? el.getAttribute('aria-label') ?? '').slice(0,30).trim(),
        tag: el.tagName,
        w: Math.round(r.width),
        h: Math.round(r.height),
        ok: r.width >= 44 && r.height >= 44,
        recommended: r.width >= 48 && r.height >= 48
      };
    })
    .filter(x => !x.ok && x.w > 0 && x.h > 0);

  const rects = interactives.map(el => el.getBoundingClientRect());
  const spacingViolations = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const hGap = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      const vGap = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
      const gap = Math.min(hGap === 0 ? Infinity : hGap, vGap === 0 ? Infinity : vGap);
      if (gap < 8 && gap >= 0 && gap !== Infinity) {
        spacingViolations.push({
          a: (interactives[i].textContent ?? '').slice(0,20).trim(),
          b: (interactives[j].textContent ?? '').slice(0,20).trim(),
          gapPx: Math.round(gap)
        });
        if (spacingViolations.length >= 5) break;
      }
    }
    if (spacingViolations.length >= 5) break;
  }

  return { tooSmall, spacingViolations };
})()
```

### Sidebar/nav collapse check (Step 5 — BP0 + BP1 only)

```js
(() => {
  const sidebar = document.querySelector('aside, nav[class*="sidebar"], [data-sidebar], [class*="sidebar"]');
  const sidebarVisible = sidebar
    ? (getComputedStyle(sidebar).display !== 'none' &&
       getComputedStyle(sidebar).visibility !== 'hidden' &&
       getComputedStyle(sidebar).opacity !== '0' &&
       sidebar.getBoundingClientRect().width > 100)
    : null;
  const hamburger = document.querySelector(
    '[aria-label*="menu" i], [aria-label*="nav" i], [aria-controls*="sidebar" i], button[class*="hamburger"], button[class*="mobile-menu"]'
  );
  return {
    sidebarFound: !!sidebar,
    sidebarVisibleAtMobile: sidebarVisible,
    hamburgerFound: !!hamburger,
    hamburgerText: hamburger ? (hamburger.getAttribute('aria-label') ?? hamburger.textContent?.slice(0,20)) : null
  };
})()
```

### WCAG 1.4.4 resize text (Step 5b)

Apply:
```js
document.documentElement.style.fontSize = '200%';
return { applied: true, rootFontSize: getComputedStyle(document.documentElement).fontSize };
```

Reset after checking:
```js
document.documentElement.style.fontSize = '';
```
