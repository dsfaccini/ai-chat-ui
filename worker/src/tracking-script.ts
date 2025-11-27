export function trackingScript(slug: string, baseDomain: string) {
  return `
<script>
(function() {
    const COOKIE_NAME = 'pydantic_chat_slugs';
    const COOKIE_DOMAIN = '.${baseDomain}'; // Leading dot makes it work for all subdomains
    const MAX_SLUGS = 20;
    const slug = ${JSON.stringify(slug)};

    function getCookie(name) {
        const value = '; ' + document.cookie;
        const parts = value.split('; ' + name + '=');
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    function setCookie(name, value, domain) {
        // Set cookie for 1 year, accessible across all subdomains
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = name + '=' + value + '; expires=' + expires + '; domain=' + domain + '; path=/; SameSite=Lax';
    }

    function trackSlug() {
        // Load existing slugs from cookie
        let slugs = [];
        const cookieValue = getCookie(COOKIE_NAME);
        if (cookieValue) {
            try {
                slugs = JSON.parse(decodeURIComponent(cookieValue));
            } catch (e) {
                slugs = [];
            }
        }

        // Update or add this slug
        const existingIndex = slugs.findIndex(s => s.slug === slug);
        const slugData = {
            slug: slug,
            lastAccess: Date.now()
        };

        if (existingIndex >= 0) {
            slugs[existingIndex] = slugData;
        } else {
            slugs.push(slugData);
        }

        // Sort by lastAccess and keep only most recent
        slugs.sort((a, b) => b.lastAccess - a.lastAccess);
        if (slugs.length > MAX_SLUGS) {
            slugs = slugs.slice(0, MAX_SLUGS);
        }

        // Save back to cookie
        const cookieData = encodeURIComponent(JSON.stringify(slugs));
        setCookie(COOKIE_NAME, cookieData, COOKIE_DOMAIN);

        console.log('[Pydantic Chat] Tracked slug via cookie:', slug);
    }

    trackSlug();
})();
</script>
`
}
