import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './components/theme-provider.tsx'

createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </HelmetProvider>
);
