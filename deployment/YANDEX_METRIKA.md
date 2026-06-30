# Yandex Metrika

Counter ID:

```env
YANDEX_METRIKA_ID=110270689
```

The project uses Next.js + React, so implement Yandex Metrika for SPA navigation:

- initialize the counter once;
- store ID in env variable YANDEX_METRIKA_ID;
- add noscript fallback;
- do not duplicate the script on route changes;
- send pageview/hit events when Next.js route changes without full reload;
- enabled options: ssr, webvisor, clickmap, accurateTrackBounce, trackLinks, ecommerce: "dataLayer".

Source counter code is included in the main technical specification.
