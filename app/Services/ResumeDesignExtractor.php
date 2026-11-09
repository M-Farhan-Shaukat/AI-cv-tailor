<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Smalot\PdfParser\Config as PdfConfig;
use Smalot\PdfParser\Element\ElementXRef;
use Smalot\PdfParser\Page as PdfPage;
use Smalot\PdfParser\Parser as PdfParser;
use Throwable;
use ZipArchive;

/**
 * Reads the visual design of an uploaded CV (fonts, sizes, colours, header alignment, heading style,
 * page set-up and section order/titles) so the tailored resume can be rendered in the same design.
 *
 * Both formats are reduced to a list of styled lines first; the design is then derived from those lines.
 * Anything that cannot be read falls back to the defaults in {@see ResumeDesign}.
 */
class ResumeDesignExtractor
{
    protected const WORD_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    protected const DRAWING_NAMESPACE = 'http://schemas.openxmlformats.org/drawingml/2006/main';

    /**
     * Refuse to inflate DOCX parts larger than this (zip-bomb guard).
     */
    protected const MAX_XML_BYTES = 10 * 1024 * 1024;

    protected const POINTS_TO_MM = 25.4 / 72;

    protected const TWIPS_TO_MM = 25.4 / 1440;

    public function __construct(public AtsScorer $scorer) {}

    /**
     * @return array<string, mixed> A normalized design (see {@see ResumeDesign::defaults()}).
     */
    public function extract(UploadedFile $file, string $text): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        try {
            [$lines, $page] = match ($extension) {
                'pdf' => $this->pdfLines($file->getPathname()),
                'docx' => $this->docxLines($file->getPathname()),
                default => [[], []],
            };
        } catch (Throwable) {
            [$lines, $page] = [[], []];
        }

        return $this->fromLines($lines, $page, $lines === [] ? 'text' : $extension, $text);
    }

    /**
     * @param  array<int, array{text: string, size: ?float, bold: bool, color: ?string, font: ?string, align: string, rule: bool, caps: bool, y?: float}>  $lines
     * @param  array<string, mixed>  $page
     * @return array<string, mixed>
     */
    public function fromLines(array $lines, array $page, string $source, string $text): array
    {
        $design = ['source' => $source, ...$page];
        $lines = collect($lines)->filter(fn (array $line) => trim($line['text']) !== '')->values();

        [$order, $titles] = $this->sectionsFromLines($lines->isEmpty() ? $this->plainLines($text) : $lines);
        if ($order === [] && $lines->isNotEmpty()) {
            [$order, $titles] = $this->sectionsFromLines($this->plainLines($text));
        }

        $design['section_order'] = $order;
        $design['section_titles'] = $titles;

        if ($order === [] && $lines->isEmpty()) {
            $design['source'] = 'default';
        }

        if ($lines->isEmpty()) {
            return ResumeDesign::normalize($design);
        }

        $sized = $lines->filter(fn (array $line) => $line['size'] !== null);
        $bodySize = $this->weightedMode($sized, fn (array $line) => (string) (round($line['size'] * 2) / 2));
        $fontName = $this->weightedMode($lines->filter(fn (array $line) => filled($line['font'])), fn (array $line) => $line['font']);

        $design['body_size'] = $bodySize !== null ? (float) $bodySize : null;
        $design['font_name'] = $fontName ?? '';
        $design['font'] = $fontName !== null ? $this->fontCategory($fontName) : 'sans';
        $design['text_color'] = $this->weightedMode($lines->filter(fn (array $line) => $line['color'] !== null), fn (array $line) => $line['color']);

        $nameIndex = $lines->take(6)->keys()->sortByDesc(fn (int $index) => $lines[$index]['size'] ?? 0)->first() ?? 0;
        $nameLine = $lines[$nameIndex];
        $design['name_size'] = $nameLine['size'];
        $design['name_color'] = $nameLine['color'];
        $design['header_align'] = $nameLine['align'];

        $headlineLine = $lines->get($nameIndex + 1);
        if ($headlineLine !== null && ! $this->looksLikeContactLine($headlineLine['text']) && $this->scorer->sectionKeyForHeading($headlineLine['text']) === null) {
            $design['headline_size'] = $headlineLine['size'];
            $design['headline_bold'] = $headlineLine['bold'];
        }

        $headings = $this->styledHeadings($lines, (float) ($design['body_size'] ?? 0));
        if ($headings->isNotEmpty()) {
            $design['heading_size'] = $headings->pluck('size')->filter()->median();
            $design['heading_color'] = $this->weightedMode($headings->filter(fn (array $line) => $line['color'] !== null), fn (array $line) => $line['color']);
            $design['heading_uppercase'] = $headings->filter(fn (array $line) => $line['caps'] || $this->isUppercase($line['text']))->count() * 2 >= $headings->count();
            $design['heading_rule'] = $headings->where('rule', true)->count() * 2 >= $headings->count();
        }

        return ResumeDesign::normalize(array_filter($design, fn ($value) => $value !== null));
    }

    /**
     * Section headings in the order the CV uses them, with the CV's own wording.
     *
     * @param  Collection<int, array<string, mixed>>  $lines
     * @return array{0: array<int, string>, 1: array<string, string>}
     */
    protected function sectionsFromLines(Collection $lines): array
    {
        $titles = [];

        foreach ($lines as $line) {
            $key = $this->scorer->sectionKeyForHeading($line['text']);

            if ($key !== null && ! isset($titles[$key])) {
                $titles[$key] = trim($line['text'], " \t:|-*#\u{2022}");
            }
        }

        return [array_keys($titles), $titles];
    }

    /**
     * Heading lines that are styled as headings (bold, larger or upper-case), so a body line that happens
     * to read like a heading does not decide the heading style.
     *
     * @param  Collection<int, array<string, mixed>>  $lines
     * @return Collection<int, array<string, mixed>>
     */
    protected function styledHeadings(Collection $lines, float $bodySize): Collection
    {
        return $lines
            ->filter(fn (array $line) => $this->scorer->sectionKeyForHeading($line['text']) !== null)
            ->filter(fn (array $line) => $line['bold'] || $line['caps'] || $this->isUppercase($line['text'])
                || ($line['size'] !== null && $line['size'] > $bodySize + 0.4))
            ->values();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    protected function plainLines(string $text): Collection
    {
        return collect(preg_split('/\R/u', $text) ?: [])
            ->map(fn (string $line) => ['text' => trim($line), 'size' => null, 'bold' => false, 'color' => null, 'font' => null, 'align' => 'left', 'rule' => false, 'caps' => false])
            ->filter(fn (array $line) => $line['text'] !== '')
            ->values();
    }

    /**
     * @return array{0: array<int, array<string, mixed>>, 1: array<string, mixed>}
     */
    protected function pdfLines(string $path): array
    {
        $config = new PdfConfig;
        $config->setDataTmFontInfoHasToBeIncluded(true);

        $pages = array_slice((new PdfParser([], $config))->parseFile($path)->getPages(), 0, 2);
        if ($pages === []) {
            return [[], []];
        }

        $lines = [];
        $pageInfo = [];

        foreach ($pages as $pageNumber => $page) {
            [$items, $rules] = $this->pdfTextItems($page);
            $pageLines = $this->groupPdfItemsIntoLines($items);

            if ($pageLines === []) {
                continue;
            }

            $bodyLeft = (float) ($this->weightedMode(collect($pageLines), fn (array $line) => (string) round($line['x'])) ?? $pageLines[0]['x']);

            foreach ($pageLines as $index => $line) {
                $pageLines[$index]['align'] = $line['x'] - $bodyLeft > 25 ? 'center' : 'left';
            }

            $headingIndexes = collect($pageLines)
                ->filter(fn (array $line) => $this->scorer->sectionKeyForHeading($line['text']) !== null)
                ->keys();

            foreach ($rules as $ruleY) {
                $nearestHeading = $headingIndexes
                    ->filter(fn (int $index) => abs($pageLines[$index]['y'] - $ruleY) <= 1.8 * ($pageLines[$index]['size'] ?? 10))
                    ->sortBy(fn (int $index) => abs($pageLines[$index]['y'] - $ruleY))
                    ->first();

                if ($nearestHeading !== null) {
                    $pageLines[$nearestHeading]['rule'] = true;
                }
            }

            if ($pageNumber === 0) {
                $pageInfo = $this->pdfPageInfo($page, $pageLines, $bodyLeft);
            }

            array_push($lines, ...$pageLines);
        }

        return [$lines, $pageInfo];
    }

    /**
     * Pair each piece of text with its position, font, size and fill colour, and collect horizontal rules.
     *
     * Positions, sizes and colours come from walking the page's content stream with the full graphics state;
     * the decoded text comes from the parser. If the two disagree, the parser's own (less exact) positions are used.
     *
     * @return array{0: array<int, array{x: float, y: float, size: ?float, font: ?string, bold: bool, color: ?string, text: string}>, 1: array<int, float>}
     */
    protected function pdfTextItems(PdfPage $page): array
    {
        $texts = $page->getTextArray();
        [$operations, $rules] = $this->pdfTextOperations($this->pdfContentStream($page));

        if (count($operations) !== count($texts)) {
            $operations = array_map(fn (array $data) => [
                'x' => (float) ($data[0][4] ?? 0),
                'y' => (float) ($data[0][5] ?? 0),
                'size' => isset($data[3]) ? (float) $data[3] * (abs((float) ($data[0][3] ?? 1)) ?: 1.0) : null,
                'font_id' => (string) ($data[2] ?? ''),
                'color' => null,
            ], $page->getDataTm());
            $texts = array_column($page->getDataTm(), 1);
            $rules = [];
        }

        $fontNames = [];
        $items = [];

        foreach ($operations as $index => $operation) {
            $text = (string) ($texts[$index] ?? '');
            if ($text === '') {
                continue;
            }

            $fontId = $operation['font_id'];
            $fontNames[$fontId] ??= $this->pdfFontName($page, $fontId);
            $size = $operation['size'] !== null ? round($operation['size'], 2) : null;

            $items[] = [
                'x' => $operation['x'],
                'y' => $operation['y'],
                'size' => $size > 0 ? $size : null,
                'font' => $fontNames[$fontId] !== null ? $this->fontFamily($fontNames[$fontId]) : null,
                'bold' => $fontNames[$fontId] !== null && (bool) preg_match('/bold|black|heavy|semibold|demi/i', $fontNames[$fontId]),
                'color' => $operation['color'],
                'text' => $text,
            ];
        }

        return [$items, $rules];
    }

    protected function pdfFontName(PdfPage $page, string $fontId): ?string
    {
        if ($fontId === '' || $fontId === '-1') {
            return null;
        }

        try {
            return $page->getFont($fontId)?->getName() ?: null;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * The page's decoded content streams, concatenated.
     */
    protected function pdfContentStream(PdfPage $page): string
    {
        $contents = $page->get('Contents');
        $values = $contents?->getContent();

        if (! is_array($values)) {
            return is_string($values) ? $values : '';
        }

        return collect($values)
            ->map(fn ($section) => $section instanceof ElementXRef ? $section->getObject() : $section)
            ->filter(fn ($section) => is_object($section) && method_exists($section, 'getContent'))
            ->map(fn ($section) => (string) $section->getContent())
            ->implode("\n");
    }

    /**
     * Interpret the content stream: track the transformation matrix, text matrices, font and fill colour,
     * and record, for every text-showing operator, where on the page it draws, at what size and in what colour.
     * Long thin filled rectangles and horizontal lines are recorded as rules.
     *
     * @return array{0: array<int, array{x: float, y: float, size: ?float, font_id: string, color: string}>, 1: array<int, float>}
     */
    protected function pdfTextOperations(string $content): array
    {
        $identity = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
        $state = ['ctm' => $identity, 'fill' => '#000000', 'font_id' => '', 'font_size' => 0.0, 'leading' => 0.0];
        $stack = [];
        $textMatrix = $lineMatrix = $identity;
        $operations = [];
        $rules = [];
        $pathStart = null;

        foreach ($this->pdfOperators($content) as [$operator, $operands]) {
            $numbers = array_map('floatval', array_filter($operands, 'is_numeric'));

            switch ($operator) {
                case 'q':
                    $stack[] = $state;
                    break;
                case 'Q':
                    $state = array_pop($stack) ?? $state;
                    break;
                case 'cm':
                    if (count($numbers) === 6) {
                        $state['ctm'] = $this->multiplyMatrices(array_values($numbers), $state['ctm']);
                    }
                    break;
                case 'rg':
                case 'g':
                case 'k':
                case 'sc':
                case 'scn':
                    $state['fill'] = $this->pdfColor(array_values($numbers)) ?? $state['fill'];
                    break;
                case 'Tf':
                    $state['font_id'] = ltrim((string) ($operands[0] ?? ''), '/');
                    $state['font_size'] = (float) ($operands[1] ?? 0);
                    break;
                case 'TL':
                    $state['leading'] = (float) ($operands[0] ?? 0);
                    break;
                case 'BT':
                    $textMatrix = $lineMatrix = $identity;
                    break;
                case 'Tm':
                    if (count($numbers) === 6) {
                        $textMatrix = $lineMatrix = array_values($numbers);
                    }
                    break;
                case 'Td':
                case 'TD':
                    if (count($numbers) === 2) {
                        [$tx, $ty] = array_values($numbers);
                        $state['leading'] = $operator === 'TD' ? -$ty : $state['leading'];
                        $textMatrix = $lineMatrix = $this->multiplyMatrices([1, 0, 0, 1, $tx, $ty], $lineMatrix);
                    }
                    break;
                case 'T*':
                    $textMatrix = $lineMatrix = $this->multiplyMatrices([1, 0, 0, 1, 0, -$state['leading']], $lineMatrix);
                    break;
                case "'":
                case '"':
                    $textMatrix = $lineMatrix = $this->multiplyMatrices([1, 0, 0, 1, 0, -$state['leading']], $lineMatrix);
                    // no break: these operators also show text
                case 'Tj':
                case 'TJ':
                    $matrix = $this->multiplyMatrices($textMatrix, $state['ctm']);
                    $operations[] = [
                        'x' => $matrix[4],
                        'y' => $matrix[5],
                        'size' => abs($state['font_size']) * sqrt(abs($matrix[0] * $matrix[3] - $matrix[1] * $matrix[2])),
                        'font_id' => $state['font_id'],
                        'color' => $state['fill'],
                    ];
                    break;
                case 're':
                    if (count($numbers) === 4) {
                        [$x, $y, $width, $height] = array_values($numbers);
                        $scale = sqrt(abs($state['ctm'][0] * $state['ctm'][3] - $state['ctm'][1] * $state['ctm'][2]));
                        if (abs($height * $scale) <= 3 && abs($width * $scale) >= 100) {
                            $rules[] = $this->transformY($x, $y + $height / 2, $state['ctm']);
                        }
                    }
                    break;
                case 'm':
                    $pathStart = count($numbers) === 2 ? array_values($numbers) : null;
                    break;
                case 'l':
                    if ($pathStart !== null && count($numbers) === 2) {
                        [$x, $y] = array_values($numbers);
                        $scale = sqrt(abs($state['ctm'][0] * $state['ctm'][3] - $state['ctm'][1] * $state['ctm'][2]));
                        if (abs($y - $pathStart[1]) < 0.5 && abs(($x - $pathStart[0]) * $scale) >= 100) {
                            $rules[] = $this->transformY($pathStart[0], $pathStart[1], $state['ctm']);
                        }
                    }
                    $pathStart = count($numbers) === 2 ? array_values($numbers) : null;
                    break;
            }
        }

        return [$operations, $rules];
    }

    /**
     * Tokenize a PDF content stream into operators with their operands. Strings, arrays and dictionaries
     * are skipped over (their content is not needed), only names and numbers are kept as operands.
     *
     * @return \Generator<int, array{0: string, 1: array<int, string>}>
     */
    protected function pdfOperators(string $content): \Generator
    {
        $length = strlen($content);
        $operands = [];
        $offset = 0;

        while ($offset < $length) {
            $char = $content[$offset];

            if (ctype_space($char) || $char === '[' || $char === ']') {
                $offset++;

                continue;
            }

            if ($char === '%') {
                $offset = strcspn($content, "\r\n", $offset) + $offset;

                continue;
            }

            if ($char === '(') {
                $offset = $this->skipLiteralString($content, $offset);
                $operands[] = '';

                continue;
            }

            if ($char === '<') {
                if (($content[$offset + 1] ?? '') === '<') {
                    $offset = $this->skipDictionary($content, $offset);
                } else {
                    $end = strpos($content, '>', $offset);
                    $offset = $end === false ? $length : $end + 1;
                }
                $operands[] = '';

                continue;
            }

            preg_match('/\/?[^\s()<>\[\]{}\/%]*/A', $content, $match, 0, $offset);
            $token = $match[0] === '' ? $char : $match[0];
            $offset += strlen($token);

            if ($token[0] === '/' || is_numeric($token)) {
                $operands[] = $token;

                continue;
            }

            if ($token === 'BI') {
                $end = preg_match('/\sEI(?=\s|$)/', $content, $imageEnd, PREG_OFFSET_CAPTURE, $offset) ? $imageEnd[0][1] + 3 : $length;
                $offset = $end;
                $operands = [];

                continue;
            }

            yield [$token, $operands];
            $operands = [];
        }
    }

    protected function skipLiteralString(string $content, int $offset): int
    {
        $depth = 0;
        $length = strlen($content);

        for (; $offset < $length; $offset++) {
            $char = $content[$offset];

            if ($char === '\\') {
                $offset++;
            } elseif ($char === '(') {
                $depth++;
            } elseif ($char === ')' && --$depth === 0) {
                return $offset + 1;
            }
        }

        return $length;
    }

    protected function skipDictionary(string $content, int $offset): int
    {
        $depth = 0;
        $length = strlen($content);

        while ($offset < $length) {
            if (substr($content, $offset, 2) === '<<') {
                $depth++;
                $offset += 2;
            } elseif (substr($content, $offset, 2) === '>>') {
                $depth--;
                $offset += 2;
                if ($depth === 0) {
                    return $offset;
                }
            } elseif ($content[$offset] === '(') {
                $offset = $this->skipLiteralString($content, $offset);
            } else {
                $offset++;
            }
        }

        return $length;
    }

    /**
     * @param  array<int, float>  $operands  Gray (1), RGB (3) or CMYK (4) components in the 0-1 range.
     */
    protected function pdfColor(array $operands): ?string
    {
        $rgb = match (count($operands)) {
            1 => [$operands[0], $operands[0], $operands[0]],
            3 => $operands,
            4 => array_map(fn (float $component) => (1 - $component) * (1 - $operands[3]), array_slice($operands, 0, 3)),
            default => null,
        };

        if ($rgb === null) {
            return null;
        }

        return '#'.implode('', array_map(fn (float $component) => sprintf('%02x', (int) round(max(0, min(1, $component)) * 255)), $rgb));
    }

    /**
     * @param  array<int, float>  $new
     * @param  array<int, float>  $current
     * @return array<int, float>
     */
    protected function multiplyMatrices(array $new, array $current): array
    {
        return [
            $new[0] * $current[0] + $new[1] * $current[2],
            $new[0] * $current[1] + $new[1] * $current[3],
            $new[2] * $current[0] + $new[3] * $current[2],
            $new[2] * $current[1] + $new[3] * $current[3],
            $new[4] * $current[0] + $new[5] * $current[2] + $current[4],
            $new[4] * $current[1] + $new[5] * $current[3] + $current[5],
        ];
    }

    /**
     * @param  array<int, float>  $matrix
     */
    protected function transformY(float $x, float $y, array $matrix): float
    {
        return $matrix[1] * $x + $matrix[3] * $y + $matrix[5];
    }

    /**
     * Merge text pieces drawn on the same baseline into lines, top of the page first.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    protected function groupPdfItemsIntoLines(array $items): array
    {
        usort($items, fn (array $a, array $b) => [round($b['y']), $a['x']] <=> [round($a['y']), $b['x']]);

        $lines = [];
        foreach ($items as $item) {
            $last = count($lines) - 1;
            $tolerance = max(1.0, ($item['size'] ?? 10) * 0.25);

            if ($last >= 0 && abs($lines[$last]['y'] - $item['y']) <= $tolerance) {
                $previous = $lines[$last]['last_item'];
                $isGlyphByGlyph = mb_strlen($previous['text']) === 1 || mb_strlen($item['text']) === 1;
                $previousEnd = $previous['x'] + mb_strlen($previous['text']) * ($previous['size'] ?? 10) * 0.6;
                $needsSpace = ! $isGlyphByGlyph
                    && $item['x'] > $previousEnd + ($item['size'] ?? 10) * 0.3
                    && ! preg_match('/\s$/u', $lines[$last]['text']) && ! preg_match('/^\s/u', $item['text']);

                $lines[$last]['text'] .= ($needsSpace ? ' ' : '').$item['text'];
                $lines[$last]['chars'] += mb_strlen(trim($item['text']));
                $lines[$last]['last_item'] = $item;

                continue;
            }

            $lines[] = [
                'text' => $item['text'],
                'x' => $item['x'],
                'y' => $item['y'],
                'size' => $item['size'],
                'font' => $item['font'],
                'bold' => $item['bold'],
                'color' => $item['color'],
                'align' => 'left',
                'rule' => false,
                'caps' => false,
                'chars' => mb_strlen(trim($item['text'])),
                'last_item' => $item,
            ];
        }

        return array_map(function (array $line) {
            unset($line['last_item']);
            $line['text'] = trim(preg_replace('/\s+/u', ' ', $line['text']));

            return $line;
        }, $lines);
    }

    /**
     * Paper size, margins and line spacing of the first page.
     *
     * @param  array<int, array<string, mixed>>  $lines
     * @return array<string, mixed>
     */
    protected function pdfPageInfo(PdfPage $page, array $lines, float $bodyLeft): array
    {
        $mediaBox = $page->getDetails()['MediaBox'] ?? [0, 0, 595.28, 841.89];
        $width = (float) ($mediaBox[2] ?? 595.28) - (float) ($mediaBox[0] ?? 0);
        $height = (float) ($mediaBox[3] ?? 841.89) - (float) ($mediaBox[1] ?? 0);
        $top = $height - ($lines[0]['y'] + ($lines[0]['size'] ?? 12));
        $leftMargin = $bodyLeft * self::POINTS_TO_MM;

        $bodySize = (float) ($this->weightedMode(collect($lines)->filter(fn (array $line) => $line['size'] !== null), fn (array $line) => (string) $line['size']) ?? 10);
        $gaps = [];
        for ($index = 1; $index < count($lines); $index++) {
            $gap = $lines[$index - 1]['y'] - $lines[$index]['y'];
            if (abs(($lines[$index]['size'] ?? 0) - $bodySize) < 0.3 && abs(($lines[$index - 1]['size'] ?? 0) - $bodySize) < 0.3 && $gap > 0 && $gap < $bodySize * 2) {
                $gaps[] = $gap;
            }
        }

        return [
            'page_size' => abs($width - 612) < 6 ? 'letter' : 'a4',
            'margins' => [
                'top' => max(0, $top) * self::POINTS_TO_MM,
                'right' => $leftMargin,
                'bottom' => $leftMargin,
                'left' => $leftMargin,
            ],
            'line_height' => $gaps !== [] ? collect($gaps)->median() / $bodySize : null,
        ];
    }

    /**
     * @return array{0: array<int, array<string, mixed>>, 1: array<string, mixed>}
     */
    protected function docxLines(string $path): array
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            return [[], []];
        }

        $readPart = function (string $name) use ($zip): string {
            $stat = $zip->statName($name);

            return $stat !== false && $stat['size'] <= self::MAX_XML_BYTES ? (string) $zip->getFromName($name) : '';
        };

        $document = $this->loadXml($readPart('word/document.xml'));
        $styles = $this->loadXml($readPart('word/styles.xml'));
        $theme = $this->loadXml($readPart('word/theme/theme1.xml'));
        $zip->close();

        if ($document === null) {
            return [[], []];
        }

        $xpath = $this->wordXPath($document);
        $themeFonts = $this->docxThemeFonts($theme);
        $styleSheet = $this->docxStyles($styles, $themeFonts);
        $lines = [];

        foreach ($xpath->query('//w:body//w:p') as $paragraph) {
            $text = trim(collect($xpath->query('.//w:t|.//w:tab', $paragraph))
                ->map(fn (DOMElement $node) => $node->localName === 'tab' ? ' ' : $node->textContent)
                ->implode(''));

            if ($text === '') {
                continue;
            }

            $paragraphProperties = $xpath->query('w:pPr', $paragraph)->item(0);
            $styleId = $paragraphProperties ? $this->wordAttribute($xpath->query('w:pStyle', $paragraphProperties)->item(0), 'val') : null;
            $run = $xpath->query('.//w:r[w:t[normalize-space()]]', $paragraph)->item(0);
            $runProperties = $run ? $xpath->query('w:rPr', $run)->item(0) : null;
            $runStyleId = $runProperties ? $this->wordAttribute($xpath->query('w:rStyle', $runProperties)->item(0), 'val') : null;

            $properties = array_merge(
                $styleSheet['defaults'],
                $this->docxStyleChain($styleSheet['styles'], $styleId ?? $styleSheet['default_paragraph']),
                $this->docxParagraphProperties($xpath, $paragraphProperties),
                $runStyleId !== null ? $this->docxStyleChain($styleSheet['styles'], $runStyleId) : [],
                $this->docxRunProperties($xpath, $runProperties, $themeFonts),
            );

            $lines[] = [
                'text' => preg_replace('/\s+/u', ' ', $text),
                'size' => $properties['size'] ?? null,
                'bold' => $properties['bold'] ?? false,
                'color' => $properties['color'] ?? null,
                'font' => $properties['font'] ?? null,
                'align' => $properties['align'] ?? 'left',
                'rule' => $properties['rule'] ?? false,
                'caps' => $properties['caps'] ?? false,
                'chars' => mb_strlen($text),
            ];
        }

        return [$lines, $this->docxPageInfo($xpath, $styleSheet['defaults'])];
    }

    protected function loadXml(string $xml): ?DOMDocument
    {
        if ($xml === '') {
            return null;
        }

        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $loaded = $document->loadXML($xml, LIBXML_NONET | LIBXML_COMPACT);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $loaded ? $document : null;
    }

    protected function wordXPath(DOMDocument $document): DOMXPath
    {
        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('w', self::WORD_NAMESPACE);
        $xpath->registerNamespace('a', self::DRAWING_NAMESPACE);

        return $xpath;
    }

    protected function wordAttribute(mixed $element, string $name): ?string
    {
        if (! $element instanceof DOMElement || ! $element->hasAttributeNS(self::WORD_NAMESPACE, $name)) {
            return null;
        }

        return $element->getAttributeNS(self::WORD_NAMESPACE, $name);
    }

    /**
     * @return array{minor: ?string, major: ?string}
     */
    protected function docxThemeFonts(?DOMDocument $theme): array
    {
        if ($theme === null) {
            return ['minor' => null, 'major' => null];
        }

        $xpath = $this->wordXPath($theme);
        $typeface = fn (string $kind) => ($node = $xpath->query("//a:{$kind}Font/a:latin")->item(0)) instanceof DOMElement
            ? ($node->getAttribute('typeface') ?: null)
            : null;

        return ['minor' => $typeface('minor'), 'major' => $typeface('major')];
    }

    /**
     * @param  array{minor: ?string, major: ?string}  $themeFonts
     * @return array{defaults: array<string, mixed>, default_paragraph: ?string, styles: array<string, array{based_on: ?string, properties: array<string, mixed>}>}
     */
    protected function docxStyles(?DOMDocument $styles, array $themeFonts): array
    {
        $sheet = ['defaults' => [], 'default_paragraph' => null, 'styles' => []];
        if ($styles === null) {
            return $sheet;
        }

        $xpath = $this->wordXPath($styles);
        $sheet['defaults'] = array_merge(
            $this->docxParagraphProperties($xpath, $xpath->query('//w:docDefaults/w:pPrDefault/w:pPr')->item(0)),
            $this->docxRunProperties($xpath, $xpath->query('//w:docDefaults/w:rPrDefault/w:rPr')->item(0), $themeFonts),
        );

        foreach ($xpath->query('//w:style') as $style) {
            $id = $this->wordAttribute($style, 'styleId');
            if ($id === null) {
                continue;
            }

            if ($this->wordAttribute($style, 'type') === 'paragraph' && in_array($this->wordAttribute($style, 'default'), ['1', 'true', 'on'], true)) {
                $sheet['default_paragraph'] = $id;
            }

            $sheet['styles'][$id] = [
                'based_on' => $this->wordAttribute($xpath->query('w:basedOn', $style)->item(0), 'val'),
                'properties' => array_merge(
                    $this->docxParagraphProperties($xpath, $xpath->query('w:pPr', $style)->item(0)),
                    $this->docxRunProperties($xpath, $xpath->query('w:rPr', $style)->item(0), $themeFonts),
                ),
            ];
        }

        return $sheet;
    }

    /**
     * Properties of a style including everything it inherits through "basedOn".
     *
     * @param  array<string, array{based_on: ?string, properties: array<string, mixed>}>  $styles
     * @return array<string, mixed>
     */
    protected function docxStyleChain(array $styles, ?string $styleId): array
    {
        $chain = [];

        for ($depth = 0; $styleId !== null && isset($styles[$styleId]) && $depth < 10; $depth++) {
            array_unshift($chain, $styles[$styleId]['properties']);
            $styleId = $styles[$styleId]['based_on'];
        }

        return array_merge([], ...$chain);
    }

    /**
     * @return array<string, mixed>
     */
    protected function docxParagraphProperties(DOMXPath $xpath, mixed $properties): array
    {
        if (! $properties instanceof DOMElement) {
            return [];
        }

        $result = [];

        $alignment = $this->wordAttribute($xpath->query('w:jc', $properties)->item(0), 'val');
        if ($alignment !== null) {
            $result['align'] = $alignment === 'center' ? 'center' : 'left';
        }

        $bottomBorder = $xpath->query('w:pBdr/w:bottom', $properties)->item(0);
        if ($bottomBorder !== null) {
            $result['rule'] = ! in_array($this->wordAttribute($bottomBorder, 'val'), ['none', 'nil'], true);
        }

        $spacing = $xpath->query('w:spacing', $properties)->item(0);
        $line = $this->wordAttribute($spacing, 'line');
        if ($line !== null && in_array($this->wordAttribute($spacing, 'lineRule') ?? 'auto', ['auto'], true)) {
            $result['line'] = (int) $line;
        }

        return $result;
    }

    /**
     * @param  array{minor: ?string, major: ?string}  $themeFonts
     * @return array<string, mixed>
     */
    protected function docxRunProperties(DOMXPath $xpath, mixed $properties, array $themeFonts): array
    {
        if (! $properties instanceof DOMElement) {
            return [];
        }

        $result = [];
        $fonts = $xpath->query('w:rFonts', $properties)->item(0);
        $themeFont = $this->wordAttribute($fonts, 'asciiTheme');
        $font = $this->wordAttribute($fonts, 'ascii')
            ?? ($themeFont !== null ? $themeFonts[str_starts_with($themeFont, 'major') ? 'major' : 'minor'] : null);

        if ($font !== null) {
            $result['font'] = $font;
        }

        $size = $this->wordAttribute($xpath->query('w:sz', $properties)->item(0), 'val');
        if (is_numeric($size)) {
            $result['size'] = (float) $size / 2;
        }

        foreach (['bold' => 'w:b', 'caps' => 'w:caps'] as $key => $tag) {
            $toggle = $xpath->query($tag, $properties)->item(0);
            if ($toggle !== null) {
                $result[$key] = ! in_array($this->wordAttribute($toggle, 'val'), ['0', 'false', 'off'], true);
            }
        }

        $color = $this->wordAttribute($xpath->query('w:color', $properties)->item(0), 'val');
        if ($color !== null && preg_match('/^[0-9a-f]{6}$/i', $color)) {
            $result['color'] = '#'.strtolower($color);
        }

        return $result;
    }

    /**
     * @param  array<string, mixed>  $defaults
     * @return array<string, mixed>
     */
    protected function docxPageInfo(DOMXPath $xpath, array $defaults): array
    {
        $sections = $xpath->query('//w:body/w:sectPr|//w:body//w:pPr/w:sectPr');
        $section = $sections->item($sections->length - 1);
        $info = [];

        if (isset($defaults['line'])) {
            $info['line_height'] = $defaults['line'] / 240 * 1.17;
        }

        if ($section === null) {
            return $info;
        }

        $width = $this->wordAttribute($xpath->query('w:pgSz', $section)->item(0), 'w');
        if (is_numeric($width)) {
            $info['page_size'] = abs((int) $width - 12240) < 120 ? 'letter' : 'a4';
        }

        $margin = $xpath->query('w:pgMar', $section)->item(0);
        if ($margin !== null) {
            $info['margins'] = collect(['top', 'right', 'bottom', 'left'])
                ->mapWithKeys(fn (string $side) => [$side => is_numeric($value = $this->wordAttribute($margin, $side)) ? abs((int) $value) * self::TWIPS_TO_MM : null])
                ->all();
        }

        return $info;
    }

    /**
     * Strip the subset prefix and style suffix from a font name: "ABCDEF+Calibri-Bold" becomes "Calibri".
     */
    protected function fontFamily(string $fontName): string
    {
        $family = preg_replace('/^[A-Z]{6}\+/', '', trim($fontName));

        return trim(preg_split('/[-,]/', $family)[0] ?? $family) ?: $family;
    }

    protected function fontCategory(string $fontName): string
    {
        $name = strtolower($fontName);

        return match (true) {
            (bool) preg_match('/mono|courier|consolas|menlo|inconsolata|cmtt|lmmono/', $name) => 'mono',
            str_contains($name, 'sans') => 'sans',
            (bool) preg_match('/serif|times|georgia|garamond|cambria|palatino|antiqua|baskerville|bodoni|didot|caslon|minion|merriweather|lora|playfair|charter|century|bookman|^cmr|lmroman|computer ?modern|tinos|constantia|perpetua|nimbusrom|crimson|sylfaen|calisto|goudy/', $name) => 'serif',
            default => 'sans',
        };
    }

    protected function looksLikeContactLine(string $text): bool
    {
        return str_contains($text, '@') || preg_match_all('/\d/', $text) >= 7 || (bool) preg_match('/linkedin|github|https?:/i', $text);
    }

    protected function isUppercase(string $text): bool
    {
        return preg_match('/\p{L}/u', $text) === 1 && mb_strtoupper($text) === $text;
    }

    /**
     * The most common value, counting each line by its number of characters.
     *
     * @param  Collection<int, array<string, mixed>>  $lines
     */
    protected function weightedMode(Collection $lines, callable $key): ?string
    {
        return $lines
            ->groupBy(fn (array $line) => (string) $key($line))
            ->map(fn (Collection $group) => $group->sum(fn (array $line) => $line['chars'] ?? mb_strlen($line['text'])))
            ->sortDesc()
            ->keys()
            ->first();
    }
}
