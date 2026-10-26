<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tailored_resumes', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->nullable()->index();
            $table->string('original_filename')->nullable();
            $table->longText('job_description');
            $table->longText('extracted_cv_text')->nullable();
            $table->longText('tailored_cv_json')->nullable();
            $table->longText('tailored_cv_html')->nullable();
            $table->integer('match_score')->nullable()->default(0);
            $table->string('pdf_path')->nullable();
            $table->json('ats_keywords')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tailored_resumes');
    }
};
