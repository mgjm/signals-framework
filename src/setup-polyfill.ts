import { Signal } from 'signal-polyfill';

if (!('Signal' in window)) {
  (window as any).Signal = Signal;
}
