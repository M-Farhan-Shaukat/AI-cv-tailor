<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tailored_resumes', function (Blueprint $table) {
            $table->json('design_profile')->nullable()->after('tailored_cv_html');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tailored_resumes', function (Blueprint $table) {
            $table->dropColumn('design_profile');
        });
    }
};
