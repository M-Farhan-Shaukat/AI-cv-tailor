<?php

namespace Tests\Unit;

use App\Services\AtsScorer;
use PHPUnit\Framework\TestCase;

class AtsScorerTest extends TestCase
{
    public function test_required_keywords_weigh_more_than_preferred(): void
    {
        $report = (new AtsScorer)->scoreKeywords('Built REST APIs with Laravel.', [
            ['term' => 'Laravel', 'importance' => 'required'],
            ['term' => 'Docker', 'importance' => 'preferred'],
        ]);

        $this->assertSame(75, $report['score']);
        $this->assertSame(['Laravel'], array_column($report['matched'], 'term'));
        $this->assertSame(['Docker'], array_column($report['missing'], 'term'));
        $this->assertSame(1, $report['required_matched']);
        $this->assertSame(1, $report['required_total']);
    }

    public function test_matching_respects_word_boundaries_and_special_characters(): void
    {
        $report = (new AtsScorer)->scoreKeywords('Skills: Node.js, C++, CI/CD pipelines, JavaScript', [
            ['term' => 'Node.js'],
            ['term' => 'C++'],
            ['term' => 'CI/CD'],
            ['term' => 'Java'],
        ]);

        $this->assertSame(['Node.js', 'C++', 'CI/CD'], array_column($report['matched'], 'term'));
        $this->assertSame(['Java'], array_column($report['missing'], 'term'));
    }

    public function test_aliases_and_plurals_count_as_matches(): void
    {
        $report = (new AtsScorer)->scoreKeywords('Deployed microservices on AWS', [
            ['term' => 'Amazon Web Services', 'aliases' => ['AWS']],
            ['term' => 'microservice'],
        ]);

        $this->assertSame(100, $report['score']);
    }

    public function test_overall_score_combines_keywords_title_sections_and_contact(): void
    {
        $resume = "Jane Doe\njane@example.com | +1 555 123 4567\nSummary\nSoftware Engineer building Laravel apps.\nExperience\nAcme\nSkills\nLaravel\nEducation\nBSc";

        $report = (new AtsScorer)->score($resume, [
            ['term' => 'Laravel', 'importance' => 'required'],
            ['term' => 'Docker', 'importance' => 'preferred'],
        ], 'Senior Software Engineer');

        $this->assertSame(75, $report['breakdown']['keywords']['score']);
        $this->assertSame(70, $report['breakdown']['job_title']['score']);
        $this->assertSame(100, $report['breakdown']['sections']['score']);
        $this->assertSame(100, $report['breakdown']['contact']['score']);
        $this->assertSame((int) round(75 * 0.7 + 70 * 0.1 + 10 + 10), $report['score']);
    }

    public function test_missing_sections_and_contact_details_lower_the_score(): void
    {
        $report = (new AtsScorer)->score("Experience\nBuilt Laravel apps", [['term' => 'Laravel']], 'Laravel Developer');

        $this->assertSame(25, $report['breakdown']['sections']['score']);
        $this->assertSame(0, $report['breakdown']['contact']['score']);
        $this->assertSame(0, $report['breakdown']['job_title']['score']);
    }

    public function test_empty_keyword_list_scores_zero_for_keywords(): void
    {
        $this->assertSame(0, (new AtsScorer)->scoreKeywords('anything', [])['score']);
    }
}
