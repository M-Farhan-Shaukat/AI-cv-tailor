<?php

/**
 * Router for PHP's built-in web server (used on Wasmer Edge).
 *
 * Without a router, `php -S` answers any URL that looks like a file (e.g. /sitemap.xml, /robots.txt)
 * with a 404 when no such file exists in public/, so Laravel never sees it. Real files are served
 * as-is; everything else goes to Laravel's front controller.
 */
$publicPath = __DIR__.'/public';

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '');

if ($uri !== '/' && is_file($publicPath.$uri)) {
    return false;
}

require_once $publicPath.'/index.php';
