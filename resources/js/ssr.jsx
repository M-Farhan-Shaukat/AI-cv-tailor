import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import ReactDOMServer from 'react-dom/server';

/*
 * Server-side rendering entry: renders each page to HTML in Node so crawlers (and visitors before the
 * JavaScript loads) see the full page. Browser-only code such as Bootstrap's JavaScript stays in app.jsx.
 */
createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => title,
        resolve: (name) => {
            const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
            return pages[`./Pages/${name}.jsx`];
        },
        setup: ({ App, props }) => <App {...props} />,
    }),
);
