<?php

namespace App\Services;

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

        return [
            'source' => in_array($design['source'], ['pdf', 'docx', 'text', 'default'], true) ? $design['source'] : 'default',
            'font' => in_array($design['font'], ['sans', 'serif', 'mono'], true) ? $design['font'] : $defaults['font'],
            'font_name' => mb_substr(preg_replace('/[^\w .-]/u', '', (string) $design['font_name']), 0, 60),
            'body_size' => self::clamp($design['body_size'], 8, 13, $defaults['body_size']),
            'name_size' => self::clamp($design['name_size'], 12, 32, $defaults['name_size']),
            'headline_size' => self::clamp($design['headline_size'], 8, 18, $defaults['headline_size']),
            'headline_bold' => (bool) $design['headline_bold'],
            'heading_size' => self::clamp($design['heading_size'], 8.5, 18, $defaults['heading_size']),
            'line_height' => self::clamp($design['line_height'], 1.1, 1.8, $defaults['line_height']),
            'text_color' => self::color($design['text_color'], $defaults['text_color']),
            'name_color' => self::color($design['name_color'], $defaults['name_color']),
            'heading_color' => self::color($design['heading_color'], $defaults['heading_color']),
            'header_align' => $design['header_align'] === 'center' ? 'center' : 'left',
            'heading_uppercase' => (bool) $design['heading_uppercase'],
            'heading_rule' => (bool) $design['heading_rule'],
            'page_size' => $design['page_size'] === 'letter' ? 'letter' : 'a4',
            'margins' => collect($defaults['margins'])
                ->map(fn (float $default, string $side) => self::clamp($margins[$side] ?? null, 6, 30, $default))
                ->all(),
            'section_order' => $order,
            'section_titles' => $titles,
        ];
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
