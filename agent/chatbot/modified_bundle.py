modified_bundle = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pydantic AI Chat</title>

    <!-- 1) Inject from your rendezvous backend: -->
    <script>
      // filled dynamically, e.g. "http://127.0.0.1:54334"
      window.__PYAICHAT_API_BASE__ = "{{LOCAL_BASE_URL_FROM_SERVER}}";

      (function () {
        const base = (window.__PYAICHAT_API_BASE__ || '').replace(/\\/$/, '');
        if (!base) return;

        const originalFetch = window.fetch.bind(window);

        window.fetch = (input, init) => {
          // string / URL
          if (typeof input === 'string' || input instanceof URL) {
            const url = input.toString();

            if (url.startsWith('/api/')) {
              return originalFetch(base + url, init);
            }

            if (url.startsWith(window.location.origin + '/api/')) {
              const path = url.slice(window.location.origin.length);
              return originalFetch(base + path, init);
            }

            return originalFetch(input, init);
          }

          // Request object
          if (input instanceof Request) {
            const url = input.url;

            if (url.startsWith(window.location.origin + '/api/')) {
              const path = url.slice(window.location.origin.length);
              const newReq = new Request(base + path, {
                ...input,
                headers: input.headers,
              });
              return originalFetch(newReq, init);
            }

            return originalFetch(input, init);
          }

          return originalFetch(input, init);
        };
      })();
    </script>

    <!-- 2) Then load the actual UI bundle from CDN -->
    <script
      type="module"
      crossorigin
      src="https://cdn.jsdelivr.net/npm/@pydantic/ai-chat-ui@0.0.2/dist/assets/index-C92CwI6w.js">
    </script>
    <link
      rel="stylesheet"
      crossorigin
      href="https://cdn.jsdelivr.net/npm/@pydantic/ai-chat-ui@0.0.2/dist/assets/index-CJuyZ47I.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>"""
