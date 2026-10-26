<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Smalot\PdfParser\Parser as PdfParser;
use ZipArchive;

class ResumeTextExtractor
{
    /**
     * Extract plain text from an uploaded PDF or DOCX resume.
     */
    public function extract(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension());

        $text = match ($extension) {
            'pdf' => (new PdfParser)->parseFile($file->getPathname())->getText(),
            'docx' => $this->extractDocx($file->getPathname()),
            default => '',
        };

        return $this->clean($text);
    }

    protected function extractDocx(string $path): string
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            return '';
        }

        $xml = $zip->getFromName('word/document.xml') ?: '';
        $zip->close();

        $xml = str_replace(['</w:p>', '<w:br/>', '<w:tab/>'], ["\n", "\n", "\t"], $xml);

        return html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    protected function clean(string $text): string
    {
        $text = str_replace("\r", '', $text);
        $text = preg_replace('/[ \t]+/u', ' ', $text);
        $text = preg_replace('/\n\s*\n+/u', "\n\n", $text);

        return trim($text);
    }
}
