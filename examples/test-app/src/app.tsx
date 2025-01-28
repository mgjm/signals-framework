import { SignalArray } from "signal-utils/array";
import { For,  Show, createEffect, onCleanup } from "signals-framework";

import styles from './app.module.css';

function Loop({values}: {
  values: Signal<number[]>,
}) {
  return <For each={values}>
    {(item, index) => <>{index}: {item}<br/></>}
  </For>
}

export function App({reset}: {
  reset: () =>void,
}) {
  const signal = new Signal.State('htpps://mgjm.dev');
  const counter = new Signal.State(0);
  createEffect(() => {
    console.log('counter changed:', counter.get());
  });
  const values = new SignalArray<number>([]);
  const values2 = new Signal.State<number[]>([]);
  const values3 = new Signal.State<number[]>([]);
  const interval = setInterval(() => {
    counter.set(counter.get() + 1);
    for(let i = 0; i < values.length; i++) {
      values[i]--;
    }
    values.push(counter.get());
    values2.set([...values2.get().map(v => v -1), counter.get()]);
    const v3 = [counter.get(), ...values3.get()];
    v3.push(...v3.splice((Math.random() * v3.length )| 0, 1));
    values3.set(v3);
  }, 1000);
  onCleanup(() => {
    clearInterval(interval);
  });
  const even = new Signal.Computed(() => counter.get() % 3 === 0 ? false : counter.get() );
  return <>
      <a href={signal}>Home</a>
      <hr />
      <h1>Signals Framework</h1>
      <div>Counter: {counter}</div>
      <br/>
      <Show when={even}>
        <Loop values={values3} />
      </Show>
      <button className={styles.button} on:click={reset}>Close</button>
    </>;
}

