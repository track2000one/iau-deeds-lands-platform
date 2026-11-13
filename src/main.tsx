import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { installFormAccessibilityEnhancements } from './lib/formAccessibility';

// Leaflet's custom icon fix is imported by the map components that render markers.
// Avoid pulling the map engine into the initial login and dashboard bundle.
installFormAccessibilityEnhancements();

createRoot(document.getElementById('root')!).render(<App />);
