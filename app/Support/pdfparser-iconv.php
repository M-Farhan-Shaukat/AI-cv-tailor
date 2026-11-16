<?php

namespace Smalot\PdfParser;

use App\Support\PdfTextEncoding;

if (! function_exists(__NAMESPACE__.'\iconv')) {
    /**
     * smalot/pdfparser calls iconv() unqualified from this namespace, so PHP resolves it here first.
     * This keeps resume uploads working where the runtime's iconv lacks CP1252 (Wasmer Edge).
     */
    function iconv(string $fromEncoding, string $toEncoding, string $text): string|false
    {
        return PdfTextEncoding::convert($fromEncoding, $toEncoding, $text);
    }
}
