<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tailored_resumes', function (Blueprint $table) {
            $table->integer('original_score')->nullable()->default(0)->after('match_score');
            $table->json('score_report')->nullable()->after('ats_keywords');
        });
    }

    public function down(): void
    {
        Schema::table('tailored_resumes', function (Blueprint $table) {
            $table->dropColumn(['original_score', 'score_report']);
        });
    }
};
