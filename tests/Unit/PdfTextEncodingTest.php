<?php

namespace Tests\Unit;

use App\Support\PdfTextEncoding;
use PHPUnit\Framework\TestCase;

class PdfTextEncodingTest extends TestCase
{
    public function test_windows_1252_text_converts_to_utf8_without_iconv(): void
    {
        $this->assertSame('“Senior” café – dev', PdfTextEncoding::toUtf8WithMbstring('CP1252', "\x93Senior\x94 caf\xe9 \x96 dev"));
    }

    public function test_encodings_mbstring_cannot_read_keep_their_ascii_text(): void
    {
        $this->assertSame('Laravel Developer', PdfTextEncoding::toUtf8WithMbstring('MACINTOSH', 'Laravel Developer'));
    }

    public function test_pdf_parser_namespace_resolves_iconv_to_the_fallback_shim(): void
    {
        $this->assertTrue(function_exists('Smalot\PdfParser\iconv'));
        $this->assertSame('“hi”', \Smalot\PdfParser\iconv('CP1252', 'UTF-8//TRANSLIT//IGNORE', "\x93hi\x94"));
    }

    public function test_unsupported_source_encoding_falls_back_instead_of_failing(): void
    {
        $this->assertSame('plain text', PdfTextEncoding::convert('NOT-A-REAL-ENCODING', 'UTF-8//IGNORE', 'plain text'));
    }
}
