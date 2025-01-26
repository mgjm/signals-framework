import 'signals-framework/setup-polyfill';

import './style.css';

import { render } from 'signals-framework/render';
import { App } from './app';

const cleanup  =  render(document.body,<App reset={() => {
  cleanup();
}}/>);
