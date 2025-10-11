import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './components/theme-provider.tsx'

/**
 * @function createRoot
 * @description The entry point of the application. It creates a React root and renders the App component.
 * @param {HTMLElement} - The root element of the application.
 * @returns {void}
 */
createRoot(document.getElementById("root")!).render(
    <ThemeProvider>
        <App />
    </ThemeProvider>
);
