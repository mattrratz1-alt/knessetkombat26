/**
 * Resolve a file from `public/` for GitHub Pages.
 * Handles missing trailing slash on project URLs
 * (e.g. user.github.io/repo → user.github.io/repo/).
 */
export function assetUrl(relPath) {
  const path = String(relPath || '').replace(/^\.\//, '')
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  const { origin, pathname } = window.location
  let dir = pathname
  if (dir.endsWith('/index.html')) {
    dir = dir.slice(0, -'index.html'.length)
  } else if (!dir.endsWith('/')) {
    dir += '/'
  }
  return `${origin}${dir}${path}`
}
