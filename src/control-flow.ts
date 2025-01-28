import { for_, index, show } from './symbols';
import { JSX, ValueOrSignal } from './types';

export type ShowProps<T> = {
  when: Signal<T | undefined | null | false>;
  fallback?: JSX.Element;
  children: JSX.Element | ((item: Signal<T>) => JSX.Element);
};

export function Show<T>(props: ShowProps<T>): JSX.Element {
  return {
    element: show,
    props,
  };
}

export type ForProps<T> = {
  each: ValueOrSignal<T[]>;
  fallback?: JSX.Element;
  children: (item: T, index: Signal<number>) => JSX.Element;
};

export function For<T>(props: ForProps<T>): JSX.Element {
  return {
    element: for_,
    props,
  }
}
export type IndexProps<T> = {
  each: ValueOrSignal<T[]>;
  fallback?: JSX.Element;
  children: (item: Signal<T>, index: number) => JSX.Element;
};

export function Index<T>(props: IndexProps<T>): JSX.Element {
  return {
    element: index,
    props,
  }
}
