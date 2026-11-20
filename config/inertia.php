<?php

/*
 * Only the `pages` section is overridden; every other Inertia option keeps the package default.
 * This app's page components live in resources/js/Pages (capital P), which the package default
 * (resources/js/pages) misses on case-sensitive file systems, so page assertions in tests fail.
 */
return [

    'pages' => [

        'ensure_pages_exist' => false,

        'paths' => [

            resource_path('js/Pages'),

        ],

        'extensions' => [

            'js',
            'jsx',
            'ts',
            'tsx',

        ],

    ],

];
