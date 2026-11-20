import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { AuthProvider } from './auth';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './i18n';
import { ToastProvider } from './components/ui/toast';
import { ConfirmProvider } from './components/ui/dialog';
import { ThemeProvider } from './theme';
import { ActivityProvider } from './activity';
import './install';

// The service worker shows phone alerts (public/sw.js). It does no caching. Registering it on load
// also lets browsers that require one offer "Install app".
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => undefined); });
}

function FeedbackProviders({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <ToastProvider closeLabel={t('dismiss')}>
      <ConfirmProvider closeLabel={t('dismiss')}>{children}</ConfirmProvider>
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <FeedbackProviders>
            <AuthProvider>
              <ActivityProvider>
                <App />
              </ActivityProvider>
            </AuthProvider>
          </FeedbackProviders>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
