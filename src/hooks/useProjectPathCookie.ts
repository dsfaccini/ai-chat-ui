import { useEffect, useState } from 'react';

interface SlugEntry {
  slug: string;
  lastAccess: number;
  projectPath?: string;
}

const COOKIE_NAME = 'pydantic_chat_slugs';

function getCurrentSlug(): string {
  const hostParts = window.location.hostname.split('.');
  return hostParts.length > 2 ? hostParts[0] : hostParts.join('.');
}

function readProjectPathFromCookie(): string {
  const raw = document.cookie.split('; ').find(c => c.startsWith(COOKIE_NAME + '='));
  if (!raw) return '';
  try {
    const slugs = JSON.parse(decodeURIComponent(raw.split('=')[1])) as SlugEntry[];
    const slug = getCurrentSlug();
    const entry = slugs.find(s => s.slug === slug);
    return entry?.projectPath ?? '';
  } catch {
    return '';
  }
}

export function useProjectPathCookie(projectPath: string) {
  useEffect(() => {
    if (!projectPath) return;
    const raw = document.cookie.split('; ').find(c => c.startsWith(COOKIE_NAME + '='));
    let slugs: SlugEntry[] = [];
    if (raw) {
      try {
        slugs = JSON.parse(decodeURIComponent(raw.split('=')[1])) as SlugEntry[];
      } catch {}
    }
    const hostParts = window.location.hostname.split('.');
    const slug = hostParts.length > 2 ? hostParts[0] : hostParts.join('.');
    const entry: SlugEntry = { slug, lastAccess: Date.now(), projectPath };
    const idx = slugs.findIndex(s => s.slug === slug);
    if (idx >= 0) slugs[idx] = entry;
    else slugs.push(entry);
    if (slugs.length > 20) slugs = slugs.slice(-20);
    const cookieData = encodeURIComponent(JSON.stringify(slugs));
    const baseDomain = hostParts.slice(-2).join('.');
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${COOKIE_NAME}=${cookieData}; expires=${expires}; domain=.${baseDomain}; path=/; SameSite=Lax`;
  }, [projectPath]);
}

export function useProjectPathFromCookie(): string {
  const [projectPath, setProjectPath] = useState<string>(() => readProjectPathFromCookie());

  useEffect(() => {
    // Re-read on mount in case cookie changed
    setProjectPath(readProjectPathFromCookie());
  }, []);

  return projectPath;
}
