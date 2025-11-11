import json
from pathlib import Path
from typing import Any

BASE_DOMAIN = 'pydantic.work'

CONFIG_DIR_NAME = '.pydantic-work'
CONFIG_FILE_NAME = 'config.json'


def get_project_root() -> Path:
    """Get the project root directory (current working directory)."""
    return Path.cwd()


def get_config_dir() -> Path:
    """Get the config directory for the current project."""
    project_root = get_project_root()
    config_dir = project_root / CONFIG_DIR_NAME
    if config_dir.exists():
        return config_dir

    config_dir.mkdir(exist_ok=True)

    # Create .gitignore in config dir
    gitignore_path = config_dir / '.gitignore'
    if not gitignore_path.exists():
        gitignore_path.write_text('*\n')

    return config_dir


def get_config_path() -> Path:
    """Get the config file path."""
    return get_config_dir() / CONFIG_FILE_NAME


def load_config() -> dict[str, Any] | None:
    """Load config from disk."""
    config_path = get_config_path()
    if not config_path.exists():
        return None

    try:
        with open(config_path) as f:
            return json.load(f)
    except Exception as e:
        print(f'⚠️  Warning: Failed to load config: {e}')
        return None


def save_config(config: dict[str, Any]) -> None:
    """Save config to disk."""
    config_path = get_config_path()
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
