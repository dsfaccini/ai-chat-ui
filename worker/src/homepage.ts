export const HOMEPAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/x-icon" href="https://pydantic.dev/favicon/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pydantic Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #fef2f4 0%, #fef6f9 50%, #fef2f8 100%);
            min-height: 100vh;
            padding: 2rem;
            color: #374151;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 3rem;
            padding-top: 2rem;
        }

        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #e92c86 0%, #d946a6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }

        .subtitle {
            font-size: 1.1rem;
            color: #9ca3af;
            font-weight: 400;
        }

        .slugs-container {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            border-radius: 1rem;
            padding: 2rem;
            box-shadow: 0 4px 6px -1px rgba(233, 44, 134, 0.1), 0 2px 4px -1px rgba(233, 44, 134, 0.06);
            border: 1px solid rgba(233, 44, 134, 0.1);
        }

        .slugs-header {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: #1f2937;
        }

        .slug-list {
            list-style: none;
        }

        .slug-item {
            margin-bottom: 0.75rem;
        }

        .slug-link {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.25rem;
            background: white;
            border-radius: 0.75rem;
            text-decoration: none;
            color: #374151;
            transition: all 0.2s ease;
            border: 1px solid rgba(233, 44, 134, 0.1);
        }

        .slug-link:hover {
            background: linear-gradient(135deg, #fef2f4 0%, #fef6f9 100%);
            border-color: rgba(233, 44, 134, 0.3);
            transform: translateX(4px);
            box-shadow: 0 4px 6px -1px rgba(233, 44, 134, 0.15);
        }

        .slug-name {
            font-weight: 500;
            font-size: 1rem;
            color: #e92c86;
        }

        .slug-time {
            font-size: 0.875rem;
            color: #9ca3af;
        }

        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: #9ca3af;
        }

        .empty-state-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }

        .empty-state-text {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
        }

        .empty-state-subtext {
            font-size: 0.9rem;
            color: #d1d5db;
        }

        footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            color: #d1d5db;
            font-size: 0.875rem;
        }

        footer a {
            color: #e92c86;
            text-decoration: none;
        }

        footer a:hover {
            text-decoration: underline;
        }

        .get-started {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            padding: 1.5rem;
            background: transparent;
            width: 500px;
        }

        .get-started h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 1rem;
        }

        .code-block {
            position: relative;
            background: #1f2937;
            border-radius: 8px;
            padding: 1rem;
            font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            color: #e5e7eb;
            overflow-x: auto;
        }

        .copy-button {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            padding: 0.375rem 0.75rem;
            background: #374151;
            border: 1px solid #4b5563;
            border-radius: 6px;
            color: #e5e7eb;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .copy-button:hover {
            background: #4b5563;
            border-color: #6b7280;
        }

        .copy-button.copied {
            background: #059669;
            border-color: #059669;
        }

        .get-started-links {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
            font-size: 0.875rem;
        }

        .get-started-links a {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #e92c86;
            text-decoration: none;
        }

        .get-started-links a:hover {
            text-decoration: underline;
        }

        .get-started-links img {
            width: 16px;
            height: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Pydantic Chat</h1>
            <p class="subtitle">Your recent projects</p>
        </header>

        <div class="get-started">
            <h3>Get Started</h3>
            <div class="code-block">
                <button class="copy-button" onclick="copyCommand()">Copy</button>
                <code>uvx pydantic-work your_module:agent</code>
            </div>
            <div class="get-started-links">
                <a href="https://github.com/dsfaccini/ai-chat-ui/tree/main/agent#readme" target="_blank">
                    <img src="https://github.githubassets.com/favicons/favicon-dark.svg" alt="GitHub">
                    Github
                </a>
                <a href="https://pypi.org/project/pydantic-work/" target="_blank">
                    <img src="https://pypi.org/static/images/logo-small.8998e9d1.svg" alt="PyPI">
                    PyPI
                </a>
            </div>
        </div>

        <div class="slugs-container">
            <h2 class="slugs-header">Recent Projects</h2>
            <ul class="slug-list" id="slug-list">
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <div class="empty-state-text">No projects yet</div>
                </div>
            </ul>
        </div>

        <footer>
            Powered by <a href="https://ai.pydantic.dev" target="_blank">Pydantic AI</a>
        </footer>
    </div>

    <script>
        // Get base domain from current location
        const BASE_DOMAIN = window.location.hostname;
        const COOKIE_NAME = 'pydantic_chat_slugs';

        // Copy command to clipboard
        function copyCommand() {
            const command = 'uvx pydantic-work your_module:agent';
            navigator.clipboard.writeText(command).then(() => {
                const button = document.querySelector('.copy-button');
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            });
        }

        // Cookie helpers
        function getCookie(name) {
            const value = '; ' + document.cookie;
            const parts = value.split('; ' + name + '=');
            if (parts.length === 2) {
                return parts.pop().split(';').shift();
            }
            return null;
        }

        // Load slugs from cookie
        function loadSlugs() {
            const cookieValue = getCookie(COOKIE_NAME);
            if (!cookieValue) return [];

            try {
                const slugs = JSON.parse(decodeURIComponent(cookieValue));
                return Array.isArray(slugs) ? slugs : [];
            } catch (e) {
                console.error('Failed to parse slugs from cookie:', e);
                return [];
            }
        }

        // Save slugs to cookie
        function saveSlugs(slugs) {
            const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
            const cookieData = encodeURIComponent(JSON.stringify(slugs));
            document.cookie = COOKIE_NAME + '=' + cookieData + '; expires=' + expires + '; domain=.' + BASE_DOMAIN + '; path=/; SameSite=Lax';
        }

        // Format timestamp to relative time
        function formatRelativeTime(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (seconds < 60) return 'just now';
            if (minutes < 60) return \`\${minutes}m ago\`;
            if (hours < 24) return \`\${hours}h ago\`;
            if (days < 7) return \`\${days}d ago\`;
            return new Date(timestamp).toLocaleDateString();
        }

        // Track slug access
        function trackSlugAccess(slug) {
            const slugs = loadSlugs();
            const existingIndex = slugs.findIndex(s => s.slug === slug);

            const slugData = {
                slug: slug,
                lastAccess: Date.now()
            };

            if (existingIndex >= 0) {
                // Update existing slug
                slugs[existingIndex] = slugData;
            } else {
                // Add new slug
                slugs.push(slugData);
            }

            // Keep only last 20 slugs
            if (slugs.length > 20) {
                slugs.splice(20);
            }

            saveSlugs(slugs);
        }

        // Render slugs list
        function renderSlugs() {
            const slugs = loadSlugs();
            const slugList = document.getElementById('slug-list');

            if (slugs.length === 0) {
                slugList.innerHTML = \`
                    <div class="empty-state">
                        <div class="empty-state-icon">💬</div>
                        <div class="empty-state-text">No projects yet</div>
                    </div>
                \`;
                return;
            }

            // Sort by lastAccess descending
            slugs.sort((a, b) => b.lastAccess - a.lastAccess);

            slugList.innerHTML = slugs.map(item => \`
                <li class="slug-item">
                    <a href="https://\${item.slug}.\${BASE_DOMAIN}/" class="slug-link" onclick="trackSlugAccess('\${item.slug}')">
                        <span class="slug-name">\${item.slug}</span>
                        <span class="slug-time">\${formatRelativeTime(item.lastAccess)}</span>
                        \${item.projectPath ? \`<div class="slug-path text-xs opacity-50 truncate mt-1">\${item.projectPath}</div>\` : ''}
                    </a>
                </li>
            \`).join('');
        }

        // Initialize on load
        renderSlugs();

        // Update relative times every minute
        setInterval(renderSlugs, 60000);
    </script>
</body>
</html>
`
