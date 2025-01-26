type StripNever<T> = Pick<T, {
  [K in keyof T]: T[K] extends never ? never : K
}[keyof T]>;


export type Child = ValueOrSignal<number | string | JSX.Element>;
export type Children = Child | Child[];

export type CommonElementProps = {
  children?: Children,
};

export type ValueOrSignal<T> = T | Signal<T>;

type ValueOrSignalNotNever<T> = T extends never ? never : ValueOrSignal<T>;

type IntrinsicElementProps<T extends HTMLElement> = Partial<StripNever<{
  [K in keyof T]: ValueOrSignalNotNever<Extract<T[K], boolean | number | string>>
}>> & {
  [E in `on:${keyof HTMLElementEventMap}`]?: (event: HTMLElementEventMap[E extends `on:${infer K}` ? K : never]) => void
} & CommonElementProps;

export type Component<P> = (props: P) => JSX.Element;

export type FragmentProps = CommonElementProps;

export namespace JSX {
  export type ElementType = keyof IntrinsicElements | ((props: any) => Element);

  export type Element = {
    element: string | symbol | Component<object>,
    props: object,
  };

  export type IntrinsicElements = {
    [E in keyof HTMLElementTagNameMap]: IntrinsicElementProps<Required<HTMLElementTagNameMap[E]>>
  };


  export type ElementChildrenAttribute = {
    children: {};
  };
}

