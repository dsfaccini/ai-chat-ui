"""CLI entry point for Pydantic Chat."""

from __future__ import annotations as _annotations

import argparse
import importlib
import importlib.metadata
import secrets
import socket
import sys

import httpx
import questionary  # type: ignore[import-untyped]
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai import Agent

from .cli.config_file import (
    get_config_path,
    load_config,
    save_config,
    BASE_DOMAIN,
)
from .cli.slug_generation import prompt_for_slug

from .cli.agent_discovery import find_agents


def get_version() -> str:
    """Get the package version."""
    try:
        return importlib.metadata.version('pydantic-work')
    except importlib.metadata.PackageNotFoundError:
        return 'dev'


def get_free_port(preferred_port: int | None = None) -> int:
    """Get a free port, optionally trying a preferred port first."""
    if preferred_port:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('127.0.0.1', preferred_port))
            sock.close()
            return preferred_port
        except OSError:
            pass

    # Get any free port
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


def register_with_worker(slug: str, token: str, port: int) -> tuple[bool, str]:
    """
    Register the local server with the Cloudflare Worker.

    Returns: (success, message)
    """
    url = f'https://{BASE_DOMAIN}/register'

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                url,
                json={'slug': slug, 'token': token, 'port': port},
            )

            if response.status_code == 200:
                return True, 'Registration successful'
            elif response.status_code == 403:
                error_data = response.json()
                if error_data.get('error') == 'token_mismatch':
                    return False, 'token_mismatch'
                return False, f'Registration failed: {error_data}'
            else:
                return False, f'Registration failed with status {response.status_code}'
    except Exception as e:
        return False, f'Network error: {e}'


def load_agent_from_string(agent_string: str) -> Agent:
    """
    Load an agent from a string like 'module.path:agent_name'.
    Similar to uvicorn's app loading.
    """
    if ':' not in agent_string:
        raise ValueError(
            f"Invalid agent string '{agent_string}'. "
            f"Expected format: 'module.path:agent_variable' (e.g., 'src.golden_gate_bridge:agent')"
        )

    module_path, agent_name = agent_string.split(':', 1)

    try:
        module = importlib.import_module(module_path)
    except ImportError as e:
        raise ValueError(f"Failed to import module '{module_path}': {e}")

    try:
        agent = getattr(module, agent_name)
    except AttributeError:
        raise ValueError(f"Module '{module_path}' has no attribute '{agent_name}'")

    if not isinstance(agent, Agent):
        raise ValueError(
            f"'{agent_string}' is not a PydanticAI Agent instance. "
            f'Got {type(agent).__name__}'
        )

    return agent


CHECKBOX_STYLE = questionary.Style(
    [
        ('pointer', 'fg:#E620E9 bold'),  # the pointer used to select
        ('selected', 'fg:#f9a4f7 bold'),  # style for a selected item of a checkbox
        ('highlighted', 'fg:#E620E9 bold'),  # the currently highlighted option
        ('separator', 'fg:#E620E9'),  # the highlight on selected options
        ('disabled', 'fg:#858585 italic'),
    ]
)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Run \033[38;2;230;32;233mPydantic Work\033[0m with a local agent',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  pydantic-work src.golden_gate_bridge:agent
  pydantic-work my_agent:my_agent_instance
  pydantic-work --localhost src.golden_gate_bridge:agent
        """,
    )
    parser.add_argument(
        'agent',
        help="Agent to load in format 'module.path:agent_variable' (e.g., 'src.golden_gate_bridge:agent')",
    )
    parser.add_argument(
        '--localhost',
        action='store_true',
        help='Run in localhost-only mode (skip registration)',
    )
    parser.add_argument(
        '--port',
        type=int,
        help='Port to bind to (default: auto-select free port)',
    )

    # Show help if no arguments provided
    if len(sys.argv) == 1:
        print(f'pydantic-work v{get_version()}\n')
        parser.print_help()

        # Prompt user to find agents
        print()
        should_find = questionary.confirm(
            'Find an agent?',
            default=True,
            style=CHECKBOX_STYLE,
        ).ask()

        if not should_find:
            sys.exit(0)

        # Discover agents
        print('\n🔍 Searching for agents...')
        agents = find_agents()

        if not agents:
            print('❌ No agents found in this codebase')
            print('\n💡 Learn how to create an agent:')
            print('   https://ai.pydantic.dev/examples/ag-ui/#agent-prompts')
            sys.exit(0)

        # Let user select an agent
        print(f'✅ Found {len(agents)} agent(s)\n')

        # Create choices from agent info
        choices = [agent.module_path for agent in agents]

        selected = questionary.select(
            'Select an agent:',
            choices=choices,
            style=CHECKBOX_STYLE,
        ).ask()

        if not selected:
            # User cancelled
            print('❌ Cancelled')
            sys.exit(0)

        # Create a mock args object with the selected agent
        class Args:
            def __init__(self):
                self.agent = selected
                self.localhost = False
                self.port = None

        args = Args()
    else:
        args = parser.parse_args()

    # Load the agent
    print(f'📦 Loading agent from {args.agent}... (this may take a few seconds)')
    try:
        agent_instance = load_agent_from_string(args.agent)
        print('✅ Agent loaded successfully')
    except Exception as e:
        error_msg = str(e)
        print(f'\n❌ Failed to load agent: {error_msg}')

        # Provide helpful hints for common errors
        if 'ANTHROPIC_API_KEY' in error_msg:
            print('\n💡 Tip: Set your API key in environment:')
            print('   export ANTHROPIC_API_KEY="your-key-here"')
            print('   Or add it to a .env file and run: source .env')
        elif 'OPENAI_API_KEY' in error_msg:
            print('\n💡 Tip: Set your API key in environment:')
            print('   export OPENAI_API_KEY="your-key-here"')
            print('   Or add it to a .env file and run: source .env')
        elif 'GOOGLE' in error_msg and 'API' in error_msg:
            print('\n💡 Tip: Set your API key in environment:')
            print('   export GOOGLE_API_KEY="your-key-here"')
            print('   Or add it to a .env file and run: source .env')

        sys.exit(1)

    # Import server and set up CORS (delayed to avoid premature agent initialization)
    from . import server

    # Add CORS middleware - allow browser JS from trusted origins
    server.app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r'^https?://((localhost|127\.0\.0\.1)(:\d+)?|.*\.pydantic\.work)$',
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    # Store the agent in app state
    server.app.state.agent = agent_instance

    # Load or create config
    config = load_config()

    if args.localhost:
        # Localhost-only mode
        print('\n🏠 Running in localhost-only mode (skipping registration)')
        port = args.port or get_free_port(config.get('port') if config else None)

        print(f'\n🚀 Starting server on http://127.0.0.1:{port}')
        print('   Open this URL in your browser to access the chat UI')

        # Run server
        uvicorn.run(
            server.app,
            host='127.0.0.1',
            port=port,
            reload=False,
        )
        return

    # Normal mode with registration
    if config:
        # Config exists - use stored values
        slug = config['slug']
        token = config['token']
        port = args.port or get_free_port(config.get('port'))

        print(f'\n📍 Project: {slug}')
        print(f'   Config loaded from {get_config_path()}')
    else:
        # First run - need to register
        print('\n🎉 First time running in this project!')

        # Prompt for slug
        slug = prompt_for_slug()
        token = generate_token()
        port = args.port or get_free_port()

        # Attempt registration
        print(f'\n📡 Registering {slug} with {BASE_DOMAIN}...')

        while True:
            success, message = register_with_worker(slug, token, port)

            if success:
                print(f'✅ {message}')
                # Save config
                save_config({'slug': slug, 'token': token, 'port': port})
                print(f'💾 Config saved to {get_config_path()}')
                break
            elif message == 'token_mismatch':
                print(f"❌ Slug '{slug}' is already taken by someone else")
                print('   Please choose a different slug')
                slug = prompt_for_slug()
                # Regenerate token for new slug
                token = generate_token()
            else:
                print(f'⚠️  Registration failed: {message}')
                print('   Falling back to localhost-only mode')
                # Save partial config anyway
                save_config({'slug': slug, 'token': token, 'port': port})
                break

    # Print URLs
    print('\n🚀 Starting server...')
    local_url = f'http://127.0.0.1:{port}'
    remote_url = (
        f'https://{slug}.{BASE_DOMAIN}/' if (config or 'slug' in locals()) else None
    )

    print(f'   Local:  {local_url}')
    if remote_url:
        print(f'   Remote: {remote_url}')

    # Detect available browsers
    import webbrowser
    import threading

    url_to_open = remote_url if remote_url else local_url

    # Build list of browser options
    browser_options: list[str] = []

    # Check for common browsers
    browser_map: dict[str, str | None] = {
        'Default browser': None,
        'Chrome': 'chrome',
        'Firefox': 'firefox',
        'Safari': 'safari',
        'Edge': 'edge',
        'Chromium': 'chromium',
    }

    # Always add default first
    browser_options.append('Default browser')

    # Try to detect available browsers
    for name, browser_id in list(browser_map.items())[1:]:  # Skip default
        if browser_id:
            try:
                webbrowser.get(browser_id)
                browser_options.append(name)
            except webbrowser.Error:
                pass

    # Add "Don't open browser" as last option
    browser_options.append("Don't open browser")

    # Ask user in a single question
    print()
    choice = questionary.select(
        'Open in browser?',
        choices=browser_options,
        default='Default browser',
        style=CHECKBOX_STYLE,
    ).ask()

    if choice and choice != "Don't open browser":
        # Open in browser after a short delay (let server start)
        def open_browser_delayed():
            import time

            time.sleep(1.5)  # Wait for server to start
            try:
                if choice == 'Default browser':
                    webbrowser.open(url_to_open)
                else:
                    # Try to open in the specific browser
                    browser_id = browser_map.get(choice)
                    if browser_id:
                        try:
                            browser = webbrowser.get(browser_id)
                            browser.open(url_to_open)
                        except webbrowser.Error:
                            print(
                                f'   ⚠️  {choice} not available, opening in default browser'
                            )
                            webbrowser.open(url_to_open)
            except Exception as e:
                print(f'   ⚠️  Failed to open browser: {e}')

        threading.Thread(target=open_browser_delayed, daemon=True).start()

    print()

    # Run server
    uvicorn.run(
        server.app,
        host='127.0.0.1',
        port=port,
        reload=False,
    )


if __name__ == '__main__':
    main()
