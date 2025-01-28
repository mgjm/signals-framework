import { JSX } from './types';

export type { JSX };

export function jsx(element: JSX.Element['element'], props: object, key?: string): JSX.Element {
  if (key !== undefined) {
    throw new Error('unexpected key');
  }
  return { element, props };
}

export { jsx as jsxs };

export { fragment as Fragment } from './symbols';

