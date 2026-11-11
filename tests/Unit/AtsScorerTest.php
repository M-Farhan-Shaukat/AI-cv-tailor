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

    public function test_each_check_reports_a_status_a_fix_and_the_points_the_fix_is_worth(): void
    {
        $cv = "Jane Doe\njane@example.com\nSummary\nBuilt services in Laravel.\nSkills\nDocker\nExperience\nDeveloper at Acme";

        $report = (new AtsScorer)->score($cv, [
            ['term' => 'Laravel', 'importance' => 'required'],
            ['term' => 'Kubernetes', 'importance' => 'required'],
            ['term' => 'Docker', 'importance' => 'preferred'],
        ], 'Backend Engineer');

        $breakdown = $report['breakdown'];

        $this->assertSame('warn', $breakdown['keywords']['status']);
        $this->assertSame(
            'Add these required keywords if you have the experience: Kubernetes. Show Docker in an experience or project bullet, not only in your skills list.',
            $breakdown['keywords']['tip'],
        );
        $this->assertSame((int) round((100 - $breakdown['keywords']['score']) * 70 / 100), $breakdown['keywords']['gain']);

        $this->assertSame('fail', $breakdown['job_title']['status']);
        $this->assertSame('Use the exact job title "Backend Engineer" in your headline or summary.', $breakdown['job_title']['tip']);
        $this->assertSame(10, $breakdown['job_title']['gain']);

        $this->assertSame('Add a clear heading for: Education.', $breakdown['sections']['tip']);
        $this->assertSame('Add a phone number as plain text at the top.', $breakdown['contact']['tip']);
        $this->assertSame(5, $breakdown['contact']['gain']);
    }

    public function test_a_passing_check_has_no_tip_and_no_gain(): void
    {
        $cv = "Jane Doe\njane@example.com\n+44 20 7946 0958\nSummary\nLaravel Developer\nExperience\nBuilt Laravel apps\nSkills\nLaravel\nEducation\nBSc";

        $breakdown = (new AtsScorer)->score($cv, [['term' => 'Laravel', 'importance' => 'required']], 'Laravel Developer')['breakdown'];

        foreach ($breakdown as $check) {
            $this->assertSame('pass', $check['status']);
            $this->assertNull($check['tip']);
            $this->assertSame(0, $check['gain']);
        }
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

    public function test_keywords_only_in_the_skills_section_get_partial_credit(): void
    {
        $report = (new AtsScorer)->scoreKeywords(
            'Built REST APIs with Laravel.',
            [
                ['term' => 'Laravel', 'importance' => 'required'],
                ['term' => 'Docker', 'importance' => 'required'],
            ],
            'Docker, Kubernetes',
        );

        $this->assertSame(93, $report['score']);
        $this->assertSame(1, $report['skills_only']);
        $this->assertSame(['Docker'], $report['skills_only_terms']);
        $this->assertTrue($report['matched'][0]['in_context']);
        $this->assertFalse($report['matched'][1]['in_context']);
    }

    public function test_a_listed_only_keyword_caps_the_overall_score_at_95(): void
    {
        $resume = "Jane Doe\njane@example.com | +1 555 123 4567\nSummary\nLaravel Developer skilled in PHP MySQL Git REST Docker AWS Redis React Vue.\nExperience\nBuilt apps.\nSkills\nKubernetes\nEducation\nBSc";

        $report = (new AtsScorer)->score($resume, [
            ['term' => 'Laravel'], ['term' => 'PHP'], ['term' => 'MySQL'], ['term' => 'Git'],
            ['term' => 'REST'], ['term' => 'Docker'], ['term' => 'AWS'], ['term' => 'Redis'],
            ['term' => 'React'], ['term' => 'Vue'], ['term' => 'Kubernetes'],
        ], 'Laravel Developer');

        $this->assertSame(1, $report['skills_only']);
        $this->assertSame(95, $report['score']);
    }

    public function test_spelling_variants_of_a_keyword_count_as_matches(): void
    {
        $report = (new AtsScorer)->scoreKeywords(
            'Built NodeJS and Java Script services, exposed a REST API, wrote unit tests and deployed to Front-end teams. Evaluated new technologies.',
            [
                ['term' => 'Node.js'],
                ['term' => 'JavaScript'],
                ['term' => 'REST APIs'],
                ['term' => 'unit testing'],
                ['term' => 'Frontend'],
                ['term' => 'technology'],
            ],
        );

        $this->assertSame([], $report['missing']);
    }

    public function test_spelling_tolerance_does_not_create_false_matches(): void
    {
        $report = (new AtsScorer)->scoreKeywords('Expressed interest in JavaScript and docking stations.', [
            ['term' => 'Express'],
            ['term' => 'Java'],
            ['term' => 'Docker'],
        ]);

        $this->assertSame([], $report['matched']);
    }

    public function test_date_ranges_are_not_mistaken_for_a_phone_number(): void
    {
        $scorer = new AtsScorer;

        $this->assertSame(50, $scorer->score("jane@example.com\nAcme | 2019 - 2022\nBeta | Jan 2016 - Dec 2018", [])['breakdown']['contact']['score']);

        foreach (['+92 301 0017469', '(555) 123-4567', '+44 20 7946 0958', '0301-0017469'] as $phone) {
            $this->assertSame(100, $scorer->score("jane@example.com\n{$phone}", [])['breakdown']['contact']['score'], $phone);
        }
    }

    public function test_only_heading_lines_count_as_sections(): void
    {
        $scorer = new AtsScorer;

        $this->assertSame('experience', $scorer->sectionKeyForHeading('Relevant Work Experience'));
        $this->assertSame('skills', $scorer->sectionKeyForHeading('TECHNICAL SKILLS & TOOLS:'));
        $this->assertSame('projects', $scorer->sectionKeyForHeading('Key Projects'));
        $this->assertNull($scorer->sectionKeyForHeading('Software engineer with experience'));
        $this->assertNull($scorer->sectionKeyForHeading('Skills: PHP, Laravel'));
        $this->assertNull($scorer->sectionKeyForHeading('Education 2016 - 2020'));

        $report = $scorer->score("Jane Doe\nSoftware engineer with experience\nGreat skills in teams", [], '');
        $this->assertSame(0, $report['breakdown']['sections']['score']);
    }

    public function test_a_related_role_title_gets_partial_title_credit(): void
    {
        $scorer = new AtsScorer;

        $this->assertSame(50, $scorer->score('Software Developer at Acme', [], 'Senior Software Engineer')['breakdown']['job_title']['score']);
        $this->assertSame(70, $scorer->score('Software Engineer at Acme', [], 'Senior Software Engineer')['breakdown']['job_title']['score']);
        $this->assertSame(0, $scorer->score('Data Analyst at Acme', [], 'Senior Software Engineer')['breakdown']['job_title']['score']);
    }
}
