<?php

namespace Tests\Feature;

use App\Jobs\ComputeJobMatches;
use App\Models\TailoredResume;
use App\Models\User;
use App\Models\UserResume;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;
use ZipArchive;

class UserResumeTest extends TestCase
{
    use RefreshDatabase;

    protected const CV_TEXT = 'Jane Doe. jane@example.com. Laravel developer with Docker experience building REST APIs for three products.';

    public function test_guests_are_redirected_from_the_resume_library(): void
    {
        $this->get('/resumes')->assertRedirect(route('login'));
    }

    public function test_a_verified_user_can_view_the_resume_library(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/resumes')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Resumes/Index', false)
                ->has('resumes', 0)
            );
    }

    public function test_a_user_can_upload_a_primary_resume(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/resumes', ['cv_file' => $this->docx(self::CV_TEXT)])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('user_resumes', [
            'user_id' => $user->id,
            'original_filename' => 'cv.docx',
            'is_primary' => true,
        ]);
    }

    public function test_a_user_can_only_manage_their_own_resumes(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = UserResume::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)->patch("/resumes/{$resume->id}")->assertNotFound();
        $this->actingAs($other)->delete("/resumes/{$resume->id}")->assertNotFound();

        $this->assertDatabaseHas('user_resumes', ['id' => $resume->id]);
    }

    public function test_making_a_resume_primary_clears_the_previous_primary(): void
    {
        $user = User::factory()->create();
        $primary = UserResume::factory()->primary()->create(['user_id' => $user->id]);
        $other = UserResume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->patch("/resumes/{$other->id}")->assertRedirect();

        $this->assertFalse($primary->fresh()->is_primary);
        $this->assertTrue($other->fresh()->is_primary);
    }

    public function test_deleting_the_primary_resume_promotes_another_resume(): void
    {
        $user = User::factory()->create();
        $primary = UserResume::factory()->primary()->create(['user_id' => $user->id]);
        $other = UserResume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->delete("/resumes/{$primary->id}")->assertRedirect();

        $this->assertTrue($other->fresh()->is_primary);
    }

    public function test_job_scanning_uses_the_primary_resume_when_no_file_is_uploaded(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        UserResume::factory()->primary()->create([
            'user_id' => $user->id,
            'original_filename' => 'stored.docx',
            'extracted_text' => self::CV_TEXT,
        ]);

        $this->actingAs($user)
            ->post('/jobs/scan', ['search' => 'laravel'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        Queue::assertPushed(ComputeJobMatches::class, fn (ComputeJobMatches $job): bool => $job->cvText === self::CV_TEXT
            && $job->userId === $user->id);
    }

    public function test_job_scanning_saves_an_uploaded_cv_to_the_account(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/jobs/scan', ['cv_file' => $this->docx(self::CV_TEXT)])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('user_resumes', [
            'user_id' => $user->id,
            'original_filename' => 'cv.docx',
            'is_primary' => true,
        ]);
    }

    public function test_download_is_restricted_to_the_owning_account(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $tailored = TailoredResume::create([
            'user_id' => $owner->id,
            'session_id' => 'someone-else',
            'job_description' => 'JD',
            'tailored_cv_html' => '<html><body>CV</body></html>',
            'tailored_cv_json' => ['name' => 'Jane Doe'],
        ]);

        $this->actingAs($other)->get(route('resume.download', $tailored))->assertForbidden();
        $this->actingAs($owner)->get(route('resume.download', $tailored))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    protected function docx(string $text): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'cv').'.docx';
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE);
        $zip->addFromString('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>'.$text.'</w:t></w:r></w:p></w:body></w:document>');
        $zip->close();

        return new UploadedFile($path, 'cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
    }
}
