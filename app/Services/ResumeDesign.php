<?php

namespace App\Services;

use App\Enums\ResumeTemplate;

/**
 * The visual design of a resume (fonts, sizes, colours, alignment, page set-up and section order/titles),
 * captured from the uploaded CV so the tailored resume can be rendered to look like the original.
 *
 * Every value is whitelisted or clamped here because it is written straight into the template's CSS.
 */
class ResumeDesign
{
    /**
     * Sections the tailored resume can contain, in the default order.
     */
    public const SECTIONS = ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'languages'];

    public const DEFAULT_TITLES = [
        'summary' => 'Professional Summary',
        'skills' => 'Skills',
        'experience' => 'Professional Experience',
        'projects' => 'Projects',
        'education' => 'Education',
        'certifications' => 'Certifications',
        'languages' => 'Languages',
    ];

    /**
     * Open-licence fonts bundled in public/fonts/resume (Regular and Bold). They embed as subset TrueType with a
     * Unicode map, so ATS parsers extract the text exactly like the built-in PDF fonts. "aliases" are CV font
     * names each one stands in for (Carlito and Caladea are metric-compatible with Calibri and Cambria).
     *
     * @var array<string, array{family: string, generic: string, regular: string, bold: string, aliases: array<int, string>}>
     */
    public const TYPEFACES = [
        'lato' => ['family' => 'Lato', 'generic' => 'sans', 'regular' => 'Lato-Regular.ttf', 'bold' => 'Lato-Bold.ttf', 'aliases' => ['lato']],
        'carlito' => ['family' => 'Carlito', 'generic' => 'sans', 'regular' => 'Carlito-Regular.ttf', 'bold' => 'Carlito-Bold.ttf', 'aliases' => ['carlito', 'calibri']],
        'caladea' => ['family' => 'Caladea', 'generic' => 'serif', 'regular' => 'Caladea-Regular.ttf', 'bold' => 'Caladea-Bold.ttf', 'aliases' => ['caladea', 'cambria']],
        'pt-sans' => ['family' => 'PT Sans', 'generic' => 'sans', 'regular' => 'PT_Sans-Web-Regular.ttf', 'bold' => 'PT_Sans-Web-Bold.ttf', 'aliases' => ['pt sans', 'ptsans']],
        'pt-serif' => ['family' => 'PT Serif', 'generic' => 'serif', 'regular' => 'PT_Serif-Web-Regular.ttf', 'bold' => 'PT_Serif-Web-Bold.ttf', 'aliases' => ['pt serif', 'ptserif']],
        'fira-sans' => ['family' => 'Fira Sans', 'generic' => 'sans', 'regular' => 'FiraSans-Regular.ttf', 'bold' => 'FiraSans-Bold.ttf', 'aliases' => ['fira sans', 'firasans']],
        'ibm-plex-serif' => ['family' => 'IBM Plex Serif', 'generic' => 'serif', 'regular' => 'IBMPlexSerif-Regular.ttf', 'bold' => 'IBMPlexSerif-Bold.ttf', 'aliases' => ['ibm plex serif', 'ibmplexserif']],
        'crimson-text' => ['family' => 'Crimson Text', 'generic' => 'serif', 'regular' => 'CrimsonText-Regular.ttf', 'bold' => 'CrimsonText-Bold.ttf', 'aliases' => ['crimson text', 'crimsontext']],
    ];

    /**
     * How section headings are set off: a hairline rule, a double rule, a left accent bar, a tinted band or nothing.
     */
    public const HEADING_STYLES = ['rule', 'double', 'bar', 'band', 'plain'];

    /**
     * @return array{
     *     source: string,
     *     font: string,
     *     font_name: string,
     *     body_size: float,
     *     name_size: float,
     *     headline_size: float,
     *     headline_bold: bool,
     *     heading_size: float,
     *     line_height: float,
     *     text_color: string,
     *     name_color: string,
     *     heading_color: string,
     *     header_align: string,
     *     heading_uppercase: bool,
     *     heading_rule: bool,
     *     heading_style: string,
     *     typeface: string,
     *     accent_color: string,
     *     name_uppercase: bool,
     *     header_rule: bool,
     *     page_size: string,
     *     margins: array{top: float, right: float, bottom: float, left: float},
     *     section_order: array<int, string>,
     *     section_titles: array<string, string>
     * }
     */
    public static function defaults(): array
    {
        return [
            'source' => 'default',
            'font' => 'sans',
            'font_name' => '',
            'body_size' => 10.0,
            'name_size' => 18.0,
            'headline_size' => 11.0,
            'headline_bold' => true,
            'heading_size' => 11.5,
            'line_height' => 1.35,
            'text_color' => '#111111',
            'name_color' => '#111111',
            'heading_color' => '#111111',
            'header_align' => 'left',
            'heading_uppercase' => true,
            'heading_rule' => true,
            'heading_style' => '',
            'typeface' => '',
            'accent_color' => '',
            'name_uppercase' => false,
            'header_rule' => false,
            'page_size' => 'a4',
            'margins' => ['top' => 14.0, 'right' => 16.0, 'bottom' => 14.0, 'left' => 16.0],
            'section_order' => self::SECTIONS,
            'section_titles' => [],
        ];
    }

    /**
     * Merge a (possibly partial or untrusted) design over the defaults and make every value safe to render.
     *
     * @param  array<string, mixed>|null  $design
     * @return array<string, mixed>
     */
    public static function normalize(?array $design): array
    {
        $defaults = self::defaults();
        $design = array_merge($defaults, is_array($design) ? $design : []);
        $margins = is_array($design['margins']) ? $design['margins'] : [];

        $order = collect(is_array($design['section_order']) ? $design['section_order'] : [])
            ->filter(fn ($key) => in_array($key, self::SECTIONS, true))
            ->merge(self::SECTIONS)
            ->unique()
            ->values()
            ->all();

        $titles = collect(is_array($design['section_titles']) ? $design['section_titles'] : [])
            ->filter(fn ($title, $key) => in_array($key, self::SECTIONS, true) && is_string($title))
            ->map(fn (string $title) => trim(preg_replace('/\s+/u', ' ', strip_tags($title))))
            ->filter(fn (string $title) => $title !== '' && mb_strlen($title) <= 40)
            ->all();

        $fontName = mb_substr(preg_replace('/[^\w .-]/u', '', (string) $design['font_name']), 0, 60);
        $typeface = self::resolveTypeface($design['typeface'], $fontName);
        $textColor = self::color($design['text_color'], $defaults['text_color']);

        return [
            'source' => in_array($design['source'], ['pdf', 'docx', 'text', 'default'], true) ? $design['source'] : 'default',
            'font' => $typeface !== '' ? self::TYPEFACES[$typeface]['generic'] : (in_array($design['font'], ['sans', 'serif', 'mono'], true) ? $design['font'] : $defaults['font']),
            'font_name' => $fontName,
            'body_size' => self::clamp($design['body_size'], 8, 13, $defaults['body_size']),
            'name_size' => self::clamp($design['name_size'], 12, 32, $defaults['name_size']),
            'headline_size' => self::clamp($design['headline_size'], 8, 18, $defaults['headline_size']),
            'headline_bold' => (bool) $design['headline_bold'],
            'heading_size' => self::clamp($design['heading_size'], 8.5, 18, $defaults['heading_size']),
            'line_height' => self::clamp($design['line_height'], 1.1, 1.8, $defaults['line_height']),
            'text_color' => $textColor,
            'name_color' => self::color($design['name_color'], $defaults['name_color']),
            'heading_color' => self::color($design['heading_color'], $defaults['heading_color']),
            'header_align' => $design['header_align'] === 'center' ? 'center' : 'left',
            'heading_uppercase' => (bool) $design['heading_uppercase'],
            'heading_rule' => (bool) $design['heading_rule'],
            'heading_style' => in_array($design['heading_style'], self::HEADING_STYLES, true)
                ? $design['heading_style']
                : ($design['heading_rule'] ? 'rule' : 'plain'),
            'typeface' => $typeface,
            'accent_color' => self::color($design['accent_color'], $textColor),
            'name_uppercase' => (bool) $design['name_uppercase'],
            'header_rule' => (bool) $design['header_rule'],
            'page_size' => $design['page_size'] === 'letter' ? 'letter' : 'a4',
            'margins' => collect($defaults['margins'])
                ->map(fn (float $default, string $side) => self::clamp($margins[$side] ?? null, 6, 30, $default))
                ->all(),
            'section_order' => $order,
            'section_titles' => $titles,
        ];
    }

    /**
     * The CV's design restyled with a template; section order, titles and page size stay the CV's own.
     *
     * @param  array<string, mixed>|null  $design
     * @return array<string, mixed>
     */
    public static function withTemplate(?array $design, ResumeTemplate $template): array
    {
        $styled = self::normalize([...self::normalize($design), ...$template->designOverrides()]);

        if ($template !== ResumeTemplate::Original && ! $styled['heading_uppercase']) {
            $styled['section_titles'] = array_map(
                fn (string $title) => mb_strtoupper($title) === $title ? mb_convert_case($title, MB_CASE_TITLE) : $title,
                $styled['section_titles'],
            );
        }

        return $styled;
    }

    /**
     * CSS font stack for the design. Dompdf's built-in Helvetica/Times/Courier only cover Latin-1,
     * so text with other characters falls back to the bundled DejaVu fonts.
     *
     * @param  array<string, mixed>  $design
     */
    public static function fontStack(array $design, bool $needsUnicode = false): string
    {
        $usesDejaVu = $needsUnicode || str_contains(strtolower((string) $design['font_name']), 'dejavu');
        $typeface = self::TYPEFACES[$design['typeface'] ?? ''] ?? null;

        if ($typeface !== null) {
            $fallback = $typeface['generic'] === 'serif'
                ? ($usesDejaVu ? '"DejaVu Serif", serif' : '"Times New Roman", Times, serif')
                : ($usesDejaVu ? '"DejaVu Sans", sans-serif' : 'Helvetica, Arial, sans-serif');

            return '"'.$typeface['family'].'", '.$fallback;
        }

        return match ($design['font']) {
            'serif' => $usesDejaVu ? '"DejaVu Serif", Georgia, serif' : '"Times New Roman", Times, Georgia, serif',
            'mono' => $usesDejaVu ? '"DejaVu Sans Mono", monospace' : 'Courier, "Courier New", monospace',
            default => $usesDejaVu ? '"DejaVu Sans", Arial, Helvetica, sans-serif' : 'Helvetica, Arial, sans-serif',
        };
    }

    /**
     * The heading the original CV used for a section, as long as an ATS still recognises it as that section.
     *
     * @param  array<string, mixed>  $design
     */
    public static function title(array $design, string $section, AtsScorer $scorer): string
    {
        $original = $design['section_titles'][$section] ?? null;

        if ($original !== null && $scorer->sectionKeyForHeading($original) === $section) {
            return $original;
        }

        return self::DEFAULT_TITLES[$section];
    }

    /**
     * The @font-face rules the design needs. The relative URL is what dompdf resolves against public/; the
     * root-relative one is the browser preview's fallback on pages below the site root.
     *
     * @param  array<string, mixed>  $design
     * @return array<int, array{family: string, weight: string, src: string}>
     */
    public static function fontFaces(array $design): array
    {
        $typeface = self::TYPEFACES[$design['typeface'] ?? ''] ?? null;

        if ($typeface === null) {
            return [];
        }

        return collect(['normal' => $typeface['regular'], 'bold' => $typeface['bold']])
            ->map(fn (string $file, string $weight) => [
                'family' => $typeface['family'],
                'weight' => $weight,
                'src' => 'url("fonts/resume/'.$file.'") format("truetype"), url("/fonts/resume/'.$file.'") format("truetype")',
            ])
            ->values()
            ->all();
    }

    /**
     * A light tint of a colour (mixed with white), used behind "band" headings so dark text stays readable.
     */
    public static function tint(string $color, float $whiteShare = 0.88): string
    {
        [$red, $green, $blue] = array_map('hexdec', str_split(ltrim($color, '#'), 2));

        return sprintf('#%02x%02x%02x', ...array_map(
            fn (int $channel) => (int) round($channel + (255 - $channel) * $whiteShare),
            [$red, $green, $blue],
        ));
    }

    /**
     * A bundled typeface key, either chosen directly or matched from the CV's font name ("Calibri" => Carlito).
     */
    protected static function resolveTypeface(mixed $typeface, string $fontName): string
    {
        if (is_string($typeface) && isset(self::TYPEFACES[$typeface])) {
            return $typeface;
        }

        $fontName = mb_strtolower($fontName);

        if ($fontName === '') {
            return '';
        }

        foreach (self::TYPEFACES as $key => $definition) {
            foreach ($definition['aliases'] as $alias) {
                if (str_contains($fontName, $alias)) {
                    return $key;
                }
            }
        }

        return '';
    }

    protected static function clamp(mixed $value, float $min, float $max, float $default): float
    {
        if (! is_numeric($value)) {
            return $default;
        }

        return round(max($min, min($max, (float) $value)), 2);
    }

    /**
     * Accept only a 6-digit hex colour dark enough to read on a white page.
     */
    protected static function color(mixed $value, string $default): string
    {
        if (! is_string($value) || ! preg_match('/^#?([0-9a-f]{6})$/i', trim($value), $matches)) {
            return $default;
        }

        [$red, $green, $blue] = array_map('hexdec', str_split($matches[1], 2));
        $luminance = (0.2126 * $red + 0.7152 * $green + 0.0722 * $blue) / 255;

        return $luminance > 0.75 ? $default : '#'.strtolower($matches[1]);
    }
}
