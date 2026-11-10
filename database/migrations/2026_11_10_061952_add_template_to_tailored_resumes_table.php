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
            $table->string('template', 20)->default('original')->after('design_profile');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tailored_resumes', function (Blueprint $table) {
            $table->dropColumn('template');
        });
    }
};
