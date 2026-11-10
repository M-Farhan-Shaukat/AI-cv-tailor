<?php

namespace Tests\Feature;

use App\Enums\ResumeTemplate;
use App\Services\ResumeDesign;
use App\Services\ResumeDesignExtractor;
use App\Services\ResumeTailor;
use App\Services\ResumeTextExtractor;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;
use ZipArchive;

class ResumeDesignTest extends TestCase
{
    public function test_it_reads_the_design_of_a_docx_resume(): void
    {
        $styles = '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>'
            .'<w:pPrDefault><w:pPr><w:spacing w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
            .'<w:style w:type="paragraph" w:styleId="SectionHeading"><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6"/></w:pBdr></w:pPr>'
            .'<w:rPr><w:b/><w:caps/><w:color w:val="1F4E79"/><w:sz w:val="26"/></w:rPr></w:style>';

        $body = $this->paragraph('Jane Doe', '<w:jc w:val="center"/>', '<w:b/><w:color w:val="1F4E79"/><w:sz w:val="48"/>')
            .$this->paragraph('Laravel Developer', '<w:jc w:val="center"/>', '<w:sz w:val="24"/>')
            .$this->paragraph('jane@example.com | +1 555 123 4567', '<w:jc w:val="center"/>')
            .$this->paragraph('Work Experience', '<w:pStyle w:val="SectionHeading"/>')
            .$this->paragraph('Developer at Acme, building web services in Laravel for internal products.')
            .$this->paragraph('Technical Skills', '<w:pStyle w:val="SectionHeading"/>')
            .$this->paragraph('PHP, Laravel, MySQL')
            .$this->paragraph('Education', '<w:pStyle w:val="SectionHeading"/>')
            .$this->paragraph('BSc Computer Science')
            .'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="1080" w:bottom="720" w:left="1080"/></w:sectPr>';

        $design = $this->extract($this->docx($body, $styles));

        $this->assertSame('docx', $design['source']);
        $this->assertSame('serif', $design['font']);
        $this->assertSame('Georgia', $design['font_name']);
        $this->assertSame(11.0, $design['body_size']);
        $this->assertSame(24.0, $design['name_size']);
        $this->assertSame(12.0, $design['headline_size']);
        $this->assertSame(13.0, $design['heading_size']);
        $this->assertSame('#1f4e79', $design['name_color']);
        $this->assertSame('#1f4e79', $design['heading_color']);
        $this->assertSame('center', $design['header_align']);
        $this->assertTrue($design['heading_uppercase']);
        $this->assertTrue($design['heading_rule']);
        $this->assertSame('letter', $design['page_size']);
        $this->assertSame(19.05, $design['margins']['left']);
        $this->assertSame(12.7, $design['margins']['top']);
        $this->assertSame(['experience', 'skills', 'education'], array_slice($design['section_order'], 0, 3));
        $this->assertSame('Work Experience', $design['section_titles']['experience']);
        $this->assertSame('Technical Skills', $design['section_titles']['skills']);
    }

    public function test_a_pdf_rendered_in_a_design_is_read_back_as_the_same_design(): void
    {
        $design = ResumeDesign::normalize([
            'font' => 'serif',
            'body_size' => 10.5,
            'name_size' => 24,
            'headline_size' => 12,
            'headline_bold' => false,
            'heading_size' => 12,
            'name_color' => '#1f4e79',
            'heading_color' => '#7a4fa8',
            'header_align' => 'center',
            'heading_uppercase' => true,
            'heading_rule' => true,
            'page_size' => 'letter',
            'section_order' => ['experience', 'summary', 'skills', 'education'],
            'section_titles' => ['experience' => 'Work History', 'summary' => 'Profile'],
        ]);

        $html = app(ResumeTailor::class)->render($this->resume(), $design);
        $path = tempnam(sys_get_temp_dir(), 'cv').'.pdf';
        file_put_contents($path, Pdf::loadHTML($html)->setPaper('letter')->output());

        $extracted = $this->extract(new UploadedFile($path, 'cv.pdf', 'application/pdf', null, true));

        $this->assertSame('pdf', $extracted['source']);
        foreach (['font', 'body_size', 'name_size', 'headline_size', 'headline_bold', 'heading_size', 'name_color', 'heading_color', 'header_align', 'heading_uppercase', 'heading_rule', 'page_size'] as $key) {
            $this->assertSame($design[$key], $extracted[$key], "Design value [$key] did not survive the round trip.");
        }
        $this->assertSame(['experience', 'summary', 'skills', 'education'], array_slice($extracted['section_order'], 0, 4));
        $this->assertSame('WORK HISTORY', $extracted['section_titles']['experience']);
    }

    public function test_pdf_positions_and_colours_respect_the_transformation_matrix(): void
    {
        $content = ".24 0 0 -.24 0 841.92 cm\nq\n3.125 0 0 3.125 150 120 cm\n.48 .31 .66 rg\n0 86 696 1 re\nf\n"
            ."BT\n/F1 29.33 Tf\n1 0 0 -1 186 29 Tm\n<0030> Tj\n25.1 0 Td <0011> Tj\nET\n.2 .2 .2 rg\n"
            ."BT\n/F1 12.4 Tf\n1 0 0 -1 0 120 Tm\n(Body text) Tj\nET\nQ\n";

        $extractor = app(ResumeDesignExtractor::class);
        [$operations, $rules] = (fn () => $this->pdfTextOperations($content))->call($extractor);

        $this->assertCount(3, $operations);
        $this->assertEqualsWithDelta(22.0, $operations[0]['size'], 0.01);
        $this->assertEqualsWithDelta(9.3, $operations[2]['size'], 0.01);
        $this->assertEqualsWithDelta(36.0 + 186 * 0.75, $operations[0]['x'], 0.01);
        $this->assertEqualsWithDelta(841.92 - (120 + 29 * 3.125) * 0.24, $operations[0]['y'], 0.01);
        $this->assertGreaterThan($operations[0]['x'], $operations[1]['x']);
        $this->assertSame('#7a4fa8', $operations[0]['color']);
        $this->assertSame('#333333', $operations[2]['color']);
        $this->assertCount(1, $rules);
    }

    public function test_every_template_renders_a_pdf_whose_text_an_ats_can_read(): void
    {
        $tailor = app(ResumeTailor::class);
        $extractor = app(ResumeTextExtractor::class);

        foreach (ResumeTemplate::cases() as $template) {
            $design = ResumeDesign::withTemplate(['font_name' => 'Calibri'], $template);
            $html = $tailor->render($this->resume(), $design);
            $pdf = Pdf::loadHTML($html)->setOption('isFontSubsettingEnabled', true)->output();
            $path = tempnam(sys_get_temp_dir(), 'cv').'.pdf';
            file_put_contents($path, $pdf);

            $text = $extractor->extract(new UploadedFile($path, 'cv.pdf', 'application/pdf', null, true));

            $this->assertStringNotContainsString('<table', $html, "[{$template->value}] must stay table-free.");
            $this->assertStringContainsStringIgnoringCase('Jane Doe', $text, "[{$template->value}] name is not extractable.");
            $this->assertStringContainsString('Built REST APIs in Laravel', $text, "[{$template->value}] bullets are not extractable.");
            $this->assertStringContainsStringIgnoringCase('Experience', $text, "[{$template->value}] headings are not extractable.");

            $typeface = ResumeDesign::TYPEFACES[$design['typeface']] ?? null;
            if ($typeface !== null) {
                $this->assertStringContainsString(str_replace(' ', '', $typeface['family']), str_replace(['_', '-', ' '], '', $pdf), "[{$template->value}] font is not embedded.");
            }
        }
    }

    public function test_a_calibri_cv_keeps_its_look_with_the_bundled_carlito_font_but_templates_do_not_inherit_it(): void
    {
        $design = ResumeDesign::normalize(['font' => 'serif', 'font_name' => 'Calibri Light']);

        $this->assertSame('carlito', $design['typeface']);
        $this->assertSame('sans', $design['font']);
        $this->assertStringContainsString('font-family: "Carlito"', app(ResumeTailor::class)->render($this->resume(), $design));
        $this->assertStringContainsString('url("fonts/resume/Carlito-Bold.ttf")', app(ResumeTailor::class)->render($this->resume(), $design));

        $this->assertSame('', ResumeDesign::withTemplate($design, ResumeTemplate::Classic)['typeface']);
        $this->assertSame('lato', ResumeDesign::withTemplate($design, ResumeTemplate::Ocean)['typeface']);
    }

    public function test_untrusted_typeface_heading_style_and_accent_values_are_rejected(): void
    {
        $design = ResumeDesign::normalize([
            'typeface' => '../../../etc/passwd',
            'heading_style' => 'band; } body { display: none',
            'heading_rule' => false,
            'accent_color' => 'red; } h1 { display: none',
            'text_color' => '#222222',
        ]);

        $this->assertSame('', $design['typeface']);
        $this->assertSame('plain', $design['heading_style']);
        $this->assertSame('#222222', $design['accent_color']);
        $this->assertStringNotContainsString('display: none', app(ResumeTailor::class)->render($this->resume(), $design));
    }

    public function test_render_uses_the_cv_headings_only_when_an_ats_recognises_them(): void
    {
        $html = app(ResumeTailor::class)->render($this->resume(), [
            'section_order' => ['education', 'experience'],
            'section_titles' => ['experience' => 'Relevant Work Experience', 'skills' => 'My Toolbox'],
            'heading_color' => 'red; } body { display: none',
            'margins' => ['top' => 999],
        ]);

        $this->assertMatchesRegularExpression('/<h2>Education<\/h2>.*<h2>Relevant Work Experience<\/h2>.*<h2>Professional Summary<\/h2>.*<h2>Skills<\/h2>/s', $html);
        $this->assertStringNotContainsString('My Toolbox', $html);
        $this->assertStringNotContainsString('display: none', $html);
        $this->assertStringContainsString('margin: 30mm', $html);
    }

    public function test_a_cv_without_readable_styles_keeps_its_section_order_from_the_text(): void
    {
        $file = $this->docx('<w:p><w:r><w:t>unstyled</w:t></w:r></w:p>', '', withNamespace: false);

        $design = app(ResumeDesignExtractor::class)->extract($file, "Jane Doe\nSKILLS\nPHP\nWORK HISTORY\nAcme\nEducation\nBSc");

        $this->assertSame('text', $design['source']);
        $this->assertSame(['skills', 'experience', 'education'], array_slice($design['section_order'], 0, 3));
        $this->assertSame('WORK HISTORY', $design['section_titles']['experience']);
        $this->assertSame(ResumeDesign::defaults()['font'], $design['font']);
    }

    /**
     * @return array<string, mixed>
     */
    protected function extract(UploadedFile $file): array
    {
        return app(ResumeDesignExtractor::class)->extract($file, app(ResumeTextExtractor::class)->extract($file));
    }

    /**
     * @return array<string, mixed>
     */
    protected function resume(): array
    {
        return [
            'name' => 'Jane Doe',
            'headline' => 'Laravel Developer',
            'contact' => ['email' => 'jane@example.com', 'phone' => '+1 555 123 4567', 'location' => 'Austin, TX'],
            'summary' => str_repeat('Laravel Developer building REST APIs and queues for SaaS products. ', 3),
            'skills' => [['category' => 'Backend', 'items' => ['PHP', 'Laravel', 'MySQL']]],
            'experience' => [[
                'title' => 'Developer', 'company' => 'Acme', 'location' => 'Remote', 'start_date' => 'Jan 2022', 'end_date' => 'Present',
                'bullets' => ['Built REST APIs in Laravel for internal products and partner integrations.', 'Cut query time by 40%.'],
            ]],
            'projects' => [],
            'education' => [['degree' => 'BSc Computer Science', 'institution' => 'State University', 'location' => '', 'start_date' => '2016', 'end_date' => '2020', 'details' => '']],
            'certifications' => [],
            'languages' => [],
        ];
    }

    protected function paragraph(string $text, string $paragraphProperties = '', string $runProperties = ''): string
    {
        return '<w:p><w:pPr>'.$paragraphProperties.'</w:pPr><w:r><w:rPr>'.$runProperties.'</w:rPr><w:t>'.$text.'</w:t></w:r></w:p>';
    }

    protected function docx(string $body, string $styles, bool $withNamespace = true): UploadedFile
    {
        $namespace = $withNamespace ? ' xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' : '';
        $path = tempnam(sys_get_temp_dir(), 'cv').'.docx';
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE);
        $zip->addFromString('word/document.xml', '<w:document'.$namespace.'><w:body>'.$body.'</w:body></w:document>');
        if ($styles !== '') {
            $zip->addFromString('word/styles.xml', '<w:styles'.$namespace.'>'.$styles.'</w:styles>');
        }
        $zip->close();

        return new UploadedFile($path, 'cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
    }
}
