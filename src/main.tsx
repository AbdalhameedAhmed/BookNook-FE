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
              <App />
            </AuthProvider>
          </FeedbackProviders>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
