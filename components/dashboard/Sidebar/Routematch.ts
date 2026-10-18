/** "/dashboard/labour/" and "/dashboard/labour" are the same page */
const normalize = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

/**
 * Which menu item is the current page? The longest href that the path starts with.
 * So "/dashboard/labour/abc" picks "/dashboard/labour" (not "/dashboard"), and "/dashboard" picks only itself.
 */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  const path = normalize(pathname);
  const matches = hrefs.filter((href) => {
    const h = normalize(href);
    return path === h || path.startsWith(`${h}/`);
  });
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}