import { useCallback, useEffect, useState } from 'react';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

export interface Route {
  path: string;
  segments: string[];
}

function readHash(): Route {
  const raw = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const clean = path.split('?')[0];
  return {
    path: clean === '/' ? '/' : clean.replace(/\/+$/, ''),
    segments: clean.split('/').filter(Boolean),
  };
}

export function navigate(path: string): void {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = target;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => readHash());
  useEffect(() => {
    const onChange = () => {
      setRoute(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, ...rest }: LinkProps) {
  const onClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      navigate(to);
      rest.onClick?.(event);
    },
    [to, rest],
  );
  return (
    <a href={`#${to}`} {...rest} onClick={onClick}>
      {children}
    </a>
  );
}
