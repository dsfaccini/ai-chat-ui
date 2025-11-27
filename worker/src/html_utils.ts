export function patchGlobalFetch(apiBase: string): string {
	const safeBase = JSON.stringify(apiBase)

	return `
	  <script>
		window.__AI_CHAT_UI_API_BASE__ = ${safeBase};

		(function () {
		  var base = window.__AI_CHAT_UI_API_BASE__;
		  if (!base) return;
		  base = base.replace(/\\/$/, '');
		  var origFetch = window.fetch.bind(window);

		  window.fetch = function (input, init) {
			var url;
			var isRequest = false;

			if (typeof input === 'string' || input instanceof URL) {
			  url = input.toString();
			} else {
			  isRequest = true;
			  url = input.url;
			}

			if (url.startsWith('/api/')) {
			  url = base + url;
			} else if (url.startsWith(window.location.origin + '/api/')) {
			  url = base + url.slice(window.location.origin.length);
			} else {
			  return origFetch(input, init);
			}

			if (!isRequest) {
			  return origFetch(url, init);
			}

			var newReq = new Request(url, input);
			return origFetch(newReq, init);
		  };
		})();
	  </script>
	`
  }
