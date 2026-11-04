<?php

return [

    'csp_enabled' => (bool) env('SECURITY_CSP_ENABLED', true),

    'csp_policy' => (string) env(
        'SECURITY_CSP_POLICY',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 http://127.0.0.1:5173; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com http://localhost:5173; img-src 'self' data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss: http://localhost:5173 http://127.0.0.1:5173; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    ),

];
