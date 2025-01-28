import { ForProps, IndexProps, ShowProps } from "./control-flow";
import { effect } from "./signals";
import { for_, fragment, index, show } from "./symbols";
import { Child, Children, FragmentProps, JSX, ValueOrSignal } from "./types";

type Cleanup = () => void;
type Cleanups = Cleanup[];

let cleanups: Cleanups | null = null;

export function onCleanup(cleanup: Cleanup) {
  if (cleanups === null) {
    throw new Error('not in a render context');
  }
  cleanups.push(cleanup);
}


function removeOnCleanup(target: Node, node: Node) {
  onCleanup(() => {
    target.removeChild(node);
  })
}

export function createEffect(cb: () => void) {
  onCleanup(effect(cb));
}

export function render(target: Node, element: JSX.Element) {
  return renderWithCleanup((node) => {
    target.appendChild(node);
    removeOnCleanup(target, node);
  }, element);
}

type Target = (node: Node) => void;

function renderWithCleanup(target: Target, element: JSX.Element) {
  const oldCleanups = cleanups;
  try {
    cleanups = [];
    renderInner(target, element);
    const newCleanups = cleanups;
    return () => {
      for (const cleanup of newCleanups) {
        cleanup();
      }
      newCleanups.length = 0;
    };
  } finally {
    cleanups = oldCleanups;
  }
}

function renderInner(target: Target, { element, props }: JSX.Element) {
  switch (typeof element) {
    case 'string':
      return renderIntrinsic(target, element as any, props);
    case 'function':
      const result = element(props);
      return renderInner(target, result);
    case 'symbol':
      switch (element) {
        case fragment:
          return renderFragment(target, props);
        case show:
          return renderShow(target, props as any);
        case for_:
          return renderFor(target, props as any);
        case index:
          return renderIndex(target, props as any);
        default:
          throw new Error(`unsupported element symbol: ${element.description}`)
      }
    default:
      throw new Error(`unsupported element type ${typeof element}: ${element}`)
  }
}

function isSignal<T>(signal: ValueOrSignal<T>): signal is Signal<T> {
  return typeof signal === 'object' && signal && typeof (signal as Signal<T>).get === 'function';
}

function renderIntrinsic<K extends keyof JSX.IntrinsicElements>(target: Target, tag: K, props: JSX.IntrinsicElements[K]) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props as any)) {
    if (key === 'children') {
      renderChildren((node) => {
        element.appendChild(node);
      }, value as Children);
    } else {
      const index = key.indexOf(':');
      if (index !== -1) {
        const k = key.slice(index + 1);
        switch (key.slice(0, index)) {
          case 'on':
            element.addEventListener(k, value as any);
            break;
          default:
            throw new Error(`unknown property: ${key}`);
        }
      } else {
        if (isSignal(value)) {
          createEffect(() => {
            element[key as keyof HTMLElementTagNameMap[K]] = value.get() as any;
          });
        } else {
          element[key as keyof HTMLElementTagNameMap[K]] = value as any;
        }
      }
    }
  }
  target(element);
}

function renderChildren(target: Target, children?: Children) {
  if (Array.isArray(children)) {
    for (const child of children) {
      renderChild(target, child);
    }
  } else if (children !== undefined) {
    renderChild(target, children);
  }
}

function renderChild(target: Target, child: Child) {
  switch (typeof child) {
    case 'string':
      target(document.createTextNode(child));
      break;
    case 'number':
      target(document.createTextNode(child + ''));
      break;
    case 'object':
      if (isSignal(child)) {
        const text = document.createTextNode('');
        target(text);
        createEffect(() => {
          text.textContent = child.get() + '';
        });
      } else {
        return renderInner(target, child);
      }
      break;
    default:
      throw new Error(`unsupported child type: ${typeof child}`);
  }
}

function renderFragment(target: Target, { children }: FragmentProps) {
  renderChildren(target, children);
}


function createMarker(target: Target, name: string): Target {
  const marker = document.createComment(name);
  target(marker);

  return (node: Node) => {
    const parent = marker.parentElement;
    if (parent) {
      parent.insertBefore(node, marker);
      removeOnCleanup(parent, node);
    }
  };
}

function renderShow<T>(target: Target, { when, fallback, children }: ShowProps<T>) {
  const innerTarget = createMarker(target, 'show');

  const is_true = new Signal.Computed(() => {
    const value = when.get();
    return value !== false && value !== null && value !== undefined;
  });

  let cleanup: Cleanup | null = null;
  onCleanup(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });
  createEffect(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    let child: JSX.Element;

    if (is_true.get()) {
      child = typeof children === 'function' ? {
        element: () => children(when as Signal<T>),
        props: {},
      } : children;
    } else {
      if (!fallback) {
        return;
      }
      child = fallback;
    }

    cleanup = renderWithCleanup(innerTarget, child);
  });
}


type ForEntry<T> = {
  item: T,
  index: Signal.State<number>,
  nodes: Node[],
  marker: Comment,
  cleanup?: Cleanup,
};

function renderFor<T>(target: Target, { each, fallback, children }: ForProps<T>) {
  const marker = document.createComment('for');
  target(marker);

  const innerTarget = (node: Node) => {
    const parent = marker.parentElement;
    if (parent) {
      parent.insertBefore(node, marker);
      removeOnCleanup(parent, node);
    }
  };

  const itemsSignal = isSignal(each) ? each : { get: () => each };

  const entryMap = new Map<T, ForEntry<T>>();
  const entryArray: ForEntry<T>[] = [];

  let cleanupFallback: Cleanup | null = null;
  onCleanup(() => {
    if (cleanupFallback) {
      cleanupFallback();
      cleanupFallback = null;
    }
    for (const entry of entryArray) {
      if (entry.cleanup) {
        entry.cleanup();
      }
      for (const node of entry.nodes) {
        node.parentNode?.removeChild(node);
      }
    }
    entryMap.clear();
    entryArray.length = 0;
  });
  createEffect(() => {
    const items = itemsSignal.get();
    const len = items.length;
    if (cleanupFallback) {
      cleanupFallback();
      cleanupFallback = null;
    }

    if (len === 0 && fallback) {
      cleanupFallback = renderWithCleanup(innerTarget, fallback)
    }

    const removedEntries = new Set<ForEntry<T>>();

    for (let i = 0; i < len; i++) {
      const item = items[i];
      const entry = entryMap.get(item);

      const nextMarker = entryArray[i]?.marker ?? marker;

      if (!entry) {
        const entry: ForEntry<T> = {
          item,
          index: new Signal.State(i),
          nodes: [],
          marker: document.createComment('for-item: ' + item),
        };
        nextMarker.parentNode?.insertBefore(entry.marker, nextMarker);
        entry.nodes.push(entry.marker);

        entry.cleanup = renderWithCleanup((node: Node) => {
          nextMarker.parentNode?.insertBefore(node, nextMarker);
          entry.nodes.push(node);
        }, {
          element: () => children(item, entry.index),
          props: {},
        });
        entryMap.set(item, entry);
        entryArray.splice(i, 0, entry);
        continue;
      }

      entry.index.set(i);

      if (removedEntries.has(entry)) {
        removedEntries.delete(entry);
        for (const node of entry.nodes) {
          nextMarker.parentNode?.insertBefore(node, nextMarker);
        }
        entryArray.splice(i, 0, entry);
        continue;
      }

      while (entryArray[i] !== entry) {
        if (entryArray.length <= i) {
          throw new Error('duplicate for item');
        }
        const [removed] = entryArray.splice(i, 1);
        removedEntries.add(removed);
      }
    }

    while (entryArray.length > len) {
      removedEntries.add(entryArray.pop()!);
    }

    for (const entry of removedEntries) {
      if (entry.cleanup) {
        entry.cleanup();
      }
      for (const node of entry.nodes) {
        node.parentNode?.removeChild(node);
      }
      entryMap.delete(entry.item);
    }
  });
}

function renderIndex<T>(target: Target, { each, fallback, children }: IndexProps<T>) {
  const innerTarget = createMarker(target, 'index');

  const items = isSignal(each) ? each : { get: () => each };
  const length = new Signal.Computed(() => items.get().length);

  let cleanupFallback: Cleanup | null = null;
  const cleanupArray: Cleanup[] = [];
  onCleanup(() => {
    if (cleanupFallback) {
      cleanupFallback();
      cleanupFallback = null;
    }
    for (const cleanup of cleanupArray) {
      cleanup();
    }
    cleanupArray.length = 0;
  });
  createEffect(() => {
    const len = length.get();
    if (cleanupFallback) {
      cleanupFallback();
      cleanupFallback = null;
    }

    if (len === 0 && fallback) {
      cleanupFallback = renderWithCleanup(innerTarget, fallback)
    }

    while (cleanupArray.length > len) {
      cleanupArray.pop()!();
    }

    while (cleanupArray.length < len) {
      const index = cleanupArray.length;
      const item = new Signal.Computed(() => items.get()[index]);
      cleanupArray.push(renderWithCleanup(innerTarget, {
        element: () => children(item, index),
        props: {},
      }));
    }
  });
}
