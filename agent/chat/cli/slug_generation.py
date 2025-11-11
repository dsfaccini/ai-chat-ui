import re
import sys
import subprocess
import questionary

from .config_file import BASE_DOMAIN, get_project_root


def get_git_username() -> str | None:
    """Try to get git username from git config."""
    try:
        # Try github.user first
        result = subprocess.run(
            ['git', 'config', 'github.user'],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()

        # Fall back to user.name
        result = subprocess.run(
            ['git', 'config', 'user.name'],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass

    return None


def sanitize_slug_part(s: str) -> str:
    """Sanitize a string to be slug-compatible."""
    # Convert to lowercase
    s = s.lower()
    # Replace spaces and underscores with hyphens
    s = s.replace(' ', '-').replace('_', '-')
    # Remove any characters that aren't alphanumeric or hyphens
    s = re.sub(r'[^a-z0-9-]', '', s)
    # Remove consecutive hyphens
    s = re.sub(r'-+', '-', s)
    # Remove leading/trailing hyphens
    s = s.strip('-')
    return s


def generate_suggested_slug() -> str:
    """Generate a suggested slug from git username and directory name."""
    git_user = get_git_username()
    dir_name = get_project_root().name

    parts: list[str] = []
    if git_user:
        parts.append(sanitize_slug_part(git_user))
    parts.append(sanitize_slug_part(dir_name))

    slug = '-'.join(parts)

    # Ensure it matches the regex and is within length limits
    slug = sanitize_slug_part(slug)
    if len(slug) > 63:
        slug = slug[:63]
    slug = slug.strip('-')

    # Validate with regex
    if not re.match(r'^[a-z0-9-]{1,63}$', slug):
        # Fallback to just directory name
        slug = sanitize_slug_part(dir_name)
        if len(slug) > 63:
            slug = slug[:63]
        slug = slug.strip('-')

    return slug or 'my-project'


def prompt_for_slug() -> str:
    """Prompt the user for a slug, with a suggested default."""
    suggested = generate_suggested_slug()

    print('\n🏷️  Choose a slug for your project')
    print(f'   This will be used as: https://{suggested}.{BASE_DOMAIN}/')

    while True:
        slug = questionary.text(
            'Slug:',
            default=suggested,
            instruction='(1-63 chars, lowercase alphanumeric and hyphens)',
        ).ask()

        if not slug:
            # User cancelled
            print('❌ Cancelled')
            sys.exit(0)

        slug = slug.strip()

        # Validate
        if not re.match(r'^[a-z0-9-]{1,63}$', slug):
            print(
                '❌ Invalid slug. Must be 1-63 characters, lowercase alphanumeric and hyphens only.\n'
            )
            continue

        return slug
