import {createRoot} from 'react-dom/client';
import Orchard from '../app/orchard';
import '../app/globals.css';
import config from './config.json';
window.__ORCHARD_CONFIG__=config;
createRoot(document.getElementById('root')!).render(<Orchard/>);
