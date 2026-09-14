import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SignSpec } from '../../content/types';
import { SOURCE } from '../../lib/__tests__/factories';
import { SignSVG } from '../SignSVG';

const SHAPES: SignSpec['shape'][] = [
  'octagon',
  'triangle-down',
  'diamond',
  'rectangle-v',
  'rectangle-h',
  'pennant',
  'circle',
  'pentagon',
  'crossbuck',
];

function sign(shape: SignSpec['shape']): SignSpec {
  return {
    key: `k-${shape}`,
    name: `${shape} sign`,
    category: 'regulatory',
    shape,
    bg: '#ffffff',
    fg: '#000000',
    legend: 'STOP',
    meaning: 'meaning',
    action: 'action',
    source: SOURCE,
  };
}

afterEach(cleanup);

describe('SignSVG', () => {
  it('renders every shape in the union as local SVG with an accessible name', () => {
    for (const shape of SHAPES) {
      const { container, getByRole, unmount } = render(<SignSVG sign={sign(shape)} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.querySelectorAll('polygon, rect, circle').length).toBeGreaterThan(0);
      expect(getByRole('img').getAttribute('aria-label')).toBe(`${shape} sign`);
      expect(container.querySelector('image')).toBeNull();
      unmount();
    }
  });

  it('renders the legend text inside the sign', () => {
    const { container } = render(<SignSVG sign={sign('octagon')} />);
    expect(container.querySelector('text')?.textContent).toBe('STOP');
  });

  it('omits text when the sign has no legend', () => {
    const spec = { ...sign('diamond'), legend: undefined };
    const { container } = render(<SignSVG sign={spec} />);
    expect(container.querySelector('text')).toBeNull();
  });
});
