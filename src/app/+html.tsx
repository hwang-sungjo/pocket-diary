import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const serviceWorkerRegistration = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .catch(function (error) {
        console.error('Pocket Diary service worker registration failed:', error);
      });
  });
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="application-name" content="Pocket Diary" />
        <meta name="theme-color" content="#F4F1E8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {process.env.NODE_ENV === 'production' ? (
          <script
            dangerouslySetInnerHTML={{ __html: serviceWorkerRegistration }}
          />
        ) : null}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
