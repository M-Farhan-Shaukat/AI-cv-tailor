<?php

namespace App\Enums;

use App\Services\ResumeDesign;

/**
 * Designs the tailored resume can be rendered in. Every template is ATS-safe: one column, real text headings,
 * no tables, icons or graphics, dark text on white and embedded fonts with a Unicode map, so only the look
 * changes and the text an ATS parses stays identical. "Original" keeps the design extracted from the uploaded CV.
 */
enum ResumeTemplate: string
{
    case Original = 'original';
    case Modern = 'modern';
    case Tech = 'tech';
    case Corporate = 'corporate';
    case Ocean = 'ocean';
    case Fresh = 'fresh';
    case Royal = 'royal';
    case Bold = 'bold';
    case Classic = 'classic';
    case Executive = 'executive';
    case Traditional = 'traditional';
    case Academic = 'academic';
    case Elegant = 'elegant';
    case Slate = 'slate';
    case Compact = 'compact';
    case Minimal = 'minimal';

    public function label(): string
    {
        return match ($this) {
            self::Original => 'Match my CV',
            default => ucfirst($this->value),
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Original => 'Fonts, colours and layout of your uploaded CV',
            self::Modern => 'Helvetica with navy accents',
            self::Tech => 'Fira Sans, teal accent bars',
            self::Corporate => 'Calibri-style Carlito, blue heading bands',
            self::Ocean => 'Lato, deep blue rules and job titles',
            self::Fresh => 'PT Sans, emerald headings, ruled header',
            self::Royal => 'Lato, purple accent bars',
            self::Bold => 'Uppercase name, charcoal heading bands',
            self::Classic => 'Times, centred header, ruled headings',
            self::Executive => 'Large serif name, refined and spacious',
            self::Traditional => 'Cambria-style Caladea, double rules',
            self::Academic => 'PT Serif, centred, formal',
            self::Elegant => 'Crimson Text, burgundy, spaced name',
            self::Slate => 'IBM Plex Serif, slate grey accents',
            self::Compact => 'Tighter spacing to fit more on a page',
            self::Minimal => 'Plain sans-serif, no rules',
        };
    }

    /**
     * Whether the template needs the Pro plan (see config/billing.php for the free ones).
     */
    public function isPremium(): bool
    {
        return ! in_array($this->value, (array) config('billing.free_templates', []), true);
    }

    public function category(): string
    {
        return match ($this) {
            self::Original => 'Your CV',
            self::Modern, self::Tech, self::Corporate, self::Ocean, self::Fresh, self::Royal, self::Bold => 'Modern',
            self::Classic, self::Executive, self::Traditional, self::Academic, self::Elegant, self::Slate => 'Classic',
            self::Compact, self::Minimal => 'Simple',
        };
    }

    /**
     * Design values (see {@see ResumeDesign}) laid over the CV's own design. Section order, section titles and
     * page size always come from the CV. Every template starts from the same base so nothing from the CV's
     * styling (its typeface, colours or heading style) leaks into a preset.
     *
     * @return array<string, mixed>
     */
    public function designOverrides(): array
    {
        if ($this === self::Original) {
            return [];
        }

        $base = [
            'font' => 'sans', 'font_name' => '', 'typeface' => '', 'body_size' => 10.0, 'name_size' => 20.0,
            'headline_size' => 11.5, 'headline_bold' => true, 'heading_size' => 11.5, 'line_height' => 1.3,
            'text_color' => '#1f2933', 'name_color' => '#111111', 'heading_color' => '#111111', 'accent_color' => '',
            'header_align' => 'left', 'heading_uppercase' => true, 'heading_rule' => true, 'heading_style' => 'rule',
            'name_uppercase' => false, 'header_rule' => false,
            'margins' => ['top' => 13.0, 'right' => 16.0, 'bottom' => 13.0, 'left' => 16.0],
        ];

        return [...$base, ...match ($this) {
            self::Modern => [
                'name_size' => 22.0, 'headline_size' => 12.0, 'heading_size' => 12.5, 'line_height' => 1.38,
                'name_color' => '#1f4e79', 'heading_color' => '#1f4e79', 'heading_uppercase' => false,
                'margins' => ['top' => 14.0, 'right' => 16.0, 'bottom' => 14.0, 'left' => 16.0],
            ],
            self::Tech => [
                'typeface' => 'fira-sans', 'body_size' => 9.75, 'line_height' => 1.25, 'name_size' => 21.0, 'heading_size' => 11.0, 'name_color' => '#0f3d3e',
                'heading_color' => '#0f766e', 'accent_color' => '#115e59', 'heading_style' => 'bar',
            ],
            self::Corporate => [
                'typeface' => 'carlito', 'body_size' => 10.5, 'line_height' => 1.22, 'name_size' => 22.0, 'heading_size' => 11.5,
                'name_color' => '#1e3a8a', 'heading_color' => '#1e3a8a', 'heading_style' => 'band', 'header_rule' => true,
            ],
            self::Ocean => [
                'typeface' => 'lato', 'line_height' => 1.24, 'name_size' => 22.0, 'heading_size' => 11.5, 'name_color' => '#075985',
                'heading_color' => '#075985', 'accent_color' => '#0c4a6e', 'heading_uppercase' => false,
            ],
            self::Fresh => [
                'typeface' => 'pt-sans', 'body_size' => 10.0, 'line_height' => 1.25, 'name_size' => 22.0, 'name_color' => '#065f46',
                'heading_color' => '#047857', 'heading_style' => 'plain', 'header_rule' => true, 'header_align' => 'center',
            ],
            self::Royal => [
                'typeface' => 'lato', 'line_height' => 1.24, 'name_size' => 22.0, 'name_color' => '#4c1d95', 'heading_color' => '#5b21b6',
                'accent_color' => '#4c1d95', 'heading_style' => 'bar', 'heading_uppercase' => false, 'heading_size' => 12.5,
            ],
            self::Bold => [
                'typeface' => 'lato', 'line_height' => 1.24, 'name_size' => 24.0, 'name_uppercase' => true, 'headline_size' => 12.0,
                'heading_color' => '#1f2937', 'heading_style' => 'band', 'text_color' => '#111827',
            ],
            self::Classic => [
                'font' => 'serif', 'body_size' => 10.5, 'headline_bold' => false, 'text_color' => '#111111',
                'header_align' => 'center', 'margins' => ['top' => 16.0, 'right' => 18.0, 'bottom' => 16.0, 'left' => 18.0],
            ],
            self::Executive => [
                'font' => 'serif', 'body_size' => 10.5, 'name_size' => 24.0, 'headline_size' => 12.0, 'headline_bold' => false,
                'line_height' => 1.42, 'text_color' => '#222222', 'name_color' => '#222222', 'heading_color' => '#3d3d3d',
                'header_align' => 'center', 'margins' => ['top' => 18.0, 'right' => 20.0, 'bottom' => 18.0, 'left' => 20.0],
            ],
            self::Traditional => [
                'typeface' => 'caladea', 'body_size' => 10.5, 'line_height' => 1.22, 'name_size' => 21.0, 'text_color' => '#1a1a1a',
                'name_color' => '#1a1a1a', 'heading_color' => '#1f2937', 'heading_style' => 'double',
            ],
            self::Academic => [
                'typeface' => 'pt-serif', 'body_size' => 9.25, 'name_size' => 20.0, 'headline_bold' => false, 'text_color' => '#111111',
                'header_align' => 'center', 'heading_uppercase' => false, 'heading_size' => 12.0, 'line_height' => 1.25,
                'margins' => ['top' => 14.0, 'right' => 17.0, 'bottom' => 14.0, 'left' => 17.0],
            ],
            self::Elegant => [
                'typeface' => 'crimson-text', 'body_size' => 10.5, 'name_size' => 24.0, 'name_uppercase' => true,
                'headline_bold' => false, 'line_height' => 1.18, 'text_color' => '#1c1917', 'name_color' => '#7f1d1d',
                'heading_color' => '#7f1d1d', 'accent_color' => '#1c1917', 'header_align' => 'center',
            ],
            self::Slate => [
                'typeface' => 'ibm-plex-serif', 'body_size' => 9.5, 'line_height' => 1.25, 'name_size' => 21.0, 'text_color' => '#1e293b',
                'name_color' => '#334155', 'heading_color' => '#334155', 'accent_color' => '#0f172a',
                'heading_style' => 'plain', 'header_rule' => true,
            ],
            self::Compact => [
                'body_size' => 9.5, 'name_size' => 16.0, 'headline_size' => 10.5, 'heading_size' => 10.5,
                'line_height' => 1.22, 'text_color' => '#111111',
                'margins' => ['top' => 10.0, 'right' => 12.0, 'bottom' => 10.0, 'left' => 12.0],
            ],
            self::Minimal => [
                'headline_bold' => false, 'heading_size' => 10.5, 'line_height' => 1.4, 'text_color' => '#222222',
                'heading_color' => '#555555', 'heading_style' => 'plain',
                'margins' => ['top' => 16.0, 'right' => 18.0, 'bottom' => 16.0, 'left' => 18.0],
            ],
        }];
    }

    /**
     * What the picker needs to draw a miniature of the template.
     *
     * @return array{font: string, align: string, name_color: string, heading_color: string, heading_style: string, name_uppercase: bool, dense: bool}|null
     */
    public function preview(): ?array
    {
        if ($this === self::Original) {
            return null;
        }

        $design = $this->designOverrides();
        $typeface = ResumeDesign::TYPEFACES[$design['typeface']] ?? null;

        return [
            'font' => $typeface['family'] ?? ($design['font'] === 'serif' ? 'Times New Roman' : 'Helvetica'),
            'align' => $design['header_align'],
            'name_color' => $design['name_color'],
            'heading_color' => $design['heading_color'],
            'heading_style' => $design['heading_style'],
            'name_uppercase' => $design['name_uppercase'],
            'dense' => $design['body_size'] < 10,
        ];
    }

    /**
     * @return array<int, array{value: string, label: string, description: string, category: string, premium: bool, preview: array<string, mixed>|null}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $template): array => [
                'value' => $template->value,
                'label' => $template->label(),
                'description' => $template->description(),
                'category' => $template->category(),
                'premium' => $template->isPremium(),
                'preview' => $template->preview(),
            ],
            self::cases(),
        );
    }
}
