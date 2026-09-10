const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

export function resolveBackendFileUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const configuredBaseUrl = new URL(API_BASE_URL);
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;

  if (normalizedPath === configuredBaseUrl.pathname || normalizedPath.startsWith(`${configuredBaseUrl.pathname}/`)) {
    return `${configuredBaseUrl.origin}${normalizedPath}`;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}
