export type AppRoute = 'home' | 'catalog' | 'configure' | 'studio' | 'review' | 'product' | 'quotation' | 'quotations';

export interface RouteInfo {
  route: AppRoute;
  path: string;
  frameId?: string;
  quotationId?: string;
  isPrintMode?: boolean;
  search?: string;
  queryParams?: Record<string, string>;
}

/**
 * Resolves any browser pathname into a strongly-typed AppRoute with optional parameters.
 */
export function parseRoute(pathname: string): RouteInfo {
  if (typeof pathname !== 'string') {
    return { route: 'home', path: '/' };
  }

  const [rawPath, rawSearch] = pathname.split('?');
  const clean = rawPath.replace(/\/+$/, '') || '/';
  const search = rawSearch 
    ? `?${rawSearch}` 
    : (typeof window !== 'undefined' ? window.location.search : '');

  const queryParams: Record<string, string> = {};
  if (search) {
    try {
      const sp = new URLSearchParams(search);
      sp.forEach((val, key) => {
        queryParams[key] = val;
      });
    } catch {
      // fallback
    }
  }

  if (clean === '/' || clean === '') {
    return { route: 'home', path: '/', search, queryParams };
  }

  if (clean === '/catalog' || clean.startsWith('/catalog/')) {
    const parts = clean.split('/');
    return { route: 'catalog', path: '/catalog', frameId: parts[2], search, queryParams };
  }

  if (clean === '/product' || clean.startsWith('/product/')) {
    const parts = clean.split('/');
    return { route: 'product', path: clean, frameId: parts[2], search, queryParams };
  }

  if (
    clean === '/configurator' ||
    clean === '/configure' ||
    clean.startsWith('/configurator/') ||
    clean.startsWith('/configure/')
  ) {
    const parts = clean.split('/');
    return { route: 'configure', path: clean, frameId: parts[2], search, queryParams };
  }

  if (clean === '/studio' || clean === '/3d-studio' || clean.startsWith('/studio/')) {
    const parts = clean.split('/');
    return { route: 'studio', path: '/studio', frameId: parts[2], search, queryParams };
  }

  if (clean === '/review' || clean === '/quote' || clean === '/dossier') {
    return { route: 'review', path: '/review', search, queryParams };
  }

  if (clean === '/quotations' || clean === '/saved-quotations') {
    return { route: 'quotations', path: '/quotations', search, queryParams };
  }

  if (clean === '/quotation' || clean.startsWith('/quotation/')) {
    const parts = clean.split('/').filter(Boolean);
    let quotationId: string | undefined;
    if (parts[1]) {
      try {
        quotationId = decodeURIComponent(parts[1]);
      } catch {
        quotationId = parts[1];
      }
    }
    const isPrintMode = parts[2] === 'print';
    return {
      route: 'quotation',
      path: clean,
      quotationId,
      isPrintMode,
      search,
      queryParams,
    };
  }

  return { route: 'home', path: '/', search, queryParams };
}

/**
 * Helper to get the canonical URL path for a given route.
 */
export function getRoutePath(route: AppRoute, frameId?: string): string {
  switch (route) {
    case 'home':
      return '/';
    case 'catalog':
      return frameId ? `/catalog/${frameId}` : '/catalog';
    case 'product':
      return frameId ? `/product/${frameId}` : '/catalog';
    case 'configure':
      return frameId ? `/configurator/${frameId}` : '/configurator';
    case 'studio':
      return frameId ? `/studio/${frameId}` : '/studio';
    case 'review':
      return '/review';
    case 'quotations':
      return '/quotations';
    case 'quotation':
      return frameId ? `/quotation/${frameId}` : '/review';
    default:
      return '/';
  }
}

