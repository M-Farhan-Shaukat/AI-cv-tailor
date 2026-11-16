<?php

namespace App\Support;

/**
 * Character-set conversion for the PDF parser that survives PHP builds whose iconv only knows a few
 * encodings (Wasmer's WASI PHP rejects CP1252, the encoding most PDFs use for WinAnsi text).
 */
class PdfTextEncoding
{
    /**
     * Convert with iconv when the runtime supports the encoding, otherwise fall back to mbstring.
     */
    public static function convert(string $fromEncoding, string $toEncoding, string $text): string|false
    {
        $converted = @\iconv($fromEncoding, $toEncoding, $text);

        if ($converted !== false) {
            return $converted;
        }

        if (! str_starts_with(strtoupper($toEncoding), 'UTF-8')) {
            return false;
        }

        return self::toUtf8WithMbstring($fromEncoding, $text);
    }

    /**
     * Encodings mbstring cannot read (MacRoman) are read as Windows-1252, which keeps the ASCII text intact.
     */
    public static function toUtf8WithMbstring(string $fromEncoding, string $text): string
    {
        $mbstringEncoding = match (strtoupper($fromEncoding)) {
            'ISO-8859-1', 'LATIN1' => 'ISO-8859-1',
            default => 'Windows-1252',
        };

        return mb_scrub(mb_convert_encoding($text, 'UTF-8', $mbstringEncoding), 'UTF-8');
    }
}
