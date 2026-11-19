import axios from 'axios';

const REPORT_URL = '/client-errors';

/**
 * Name, size and type of the first file in a FormData body, plus whether the browser can still read it.
 * "readable: false" means the phone revoked access to the picked file before it could be uploaded.
 */
async function describeUpload(data) {
    if (typeof FormData === 'undefined' || !(data instanceof FormData)) {
        return null;
    }
    const file = [...data.values()].find((value) => value instanceof Blob);
    if (!file) {
        return null;
    }

    let readable = true;
    try {
        await file.slice(0, 1).arrayBuffer();
    } catch {
        readable = false;
    }

    return { name: file.name || null, size: file.size, type: file.type || null, readable };
}

/**
 * Tells the server about a call that never got a response, so it shows up in Admin → Request logs.
 */
async function report(error) {
    const config = error.config || {};
    const payload = {
        method: (config.method || 'get').toUpperCase(),
        url: config.url || '',
        code: error.code || null,
        message: error.message || null,
        elapsed_ms: config.metadata?.startedAt ? Date.now() - config.metadata.startedAt : null,
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
        connection: typeof navigator !== 'undefined' ? navigator.connection?.effectiveType || null : null,
        page: typeof window !== 'undefined' ? window.location.pathname : null,
        file: await describeUpload(config.data),
    };

    const send = () => axios.post(REPORT_URL, payload, { headers: { Accept: 'application/json' } });
    try {
        await send();
    } catch {
        setTimeout(() => send().catch(() => {}), 3000);
    }
}

/**
 * Times every axios call and reports the ones that fail without any response from the server.
 */
export function installClientErrorReporter() {
    axios.interceptors.request.use((config) => {
        config.metadata = { startedAt: Date.now() };
        return config;
    });

    axios.interceptors.response.use(undefined, (error) => {
        const isReport = (error.config?.url || '').includes(REPORT_URL);
        if (!error.response && error.config && !isReport && !axios.isCancel(error)) {
            report(error).catch(() => {});
        }
        return Promise.reject(error);
    });
}
