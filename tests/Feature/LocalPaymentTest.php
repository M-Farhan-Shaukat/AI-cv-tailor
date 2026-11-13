<?php

namespace Tests\Feature;

use App\Enums\PaymentChannel;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\User;
use App\Services\Payments\EasypaisaGateway;
use App\Services\Payments\JazzCashGateway;
use App\Services\UsageQuota;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocalPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected const SALT = 'salt1234salt';

    protected const HASH_KEY = 'ABCDEFGHIJKLMNOP';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'billing.prices.monthly.amount' => 2799,
            'billing.prices.yearly.amount' => 21999,
            'billing.prices.monthly.stripe_price' => null,
            'billing.prices.yearly.stripe_price' => null,
            'billing.pro_monthly_tailors' => 0,
            'billing.channels.jazzcash' => [...config('billing.channels.jazzcash'), 'enabled' => true, 'mode' => 'sandbox', 'merchant_id' => 'MC123', 'password' => 'pass', 'integrity_salt' => self::SALT],
            'billing.channels.easypaisa' => [...config('billing.channels.easypaisa'), 'enabled' => true, 'mode' => 'sandbox', 'store_id' => '555', 'hash_key' => self::HASH_KEY, 'username' => 'api', 'password' => 'secret', 'account_number' => '654321'],
            'billing.channels.bank_transfer' => ['enabled' => true, 'bank_name' => 'Meezan Bank', 'account_title' => 'Resume Tailor', 'account_number' => '0101234567', 'iban' => null, 'instructions' => null],
        ]);
    }

    public function test_the_pricing_page_shows_rupee_prices_and_only_ready_channels(): void
    {
        config(['billing.channels.easypaisa.username' => null]);

        $this->actingAs(User::factory()->create())
            ->get('/pricing')
            ->assertInertia(fn (Assert $page) => $page
                ->where('prices.0.amount', 2799)
                ->where('prices.0.amount_label', 'Rs 2,799')
                ->where('prices.1.monthly_equivalent_label', 'Rs 1,833')
                ->where('prices.0.available', true)
                ->where('prices.0.stripe', false)
                ->has('channels', 2)
                ->where('channels.0.value', 'jazzcash')
                ->where('channels.1.value', 'bank_transfer'));
    }

    public function test_a_disabled_channel_cannot_be_used(): void
    {
        config(['billing.channels.jazzcash.enabled' => false]);

        $this->actingAs(User::factory()->create())
            ->post('/billing/pay/jazzcash/monthly')
            ->assertRedirect(route('pricing'))
            ->assertSessionHasErrors('billing');

        $this->assertDatabaseCount('payments', 0);
        $this->actingAs(User::factory()->create())->post('/billing/pay/paypal/monthly')->assertNotFound();
    }

    public function test_jazzcash_checkout_posts_a_signed_form_to_jazzcash(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/billing/pay/jazzcash/monthly', [], ['X-Inertia' => 'true'])->assertStatus(409);

        $payment = Payment::query()->sole();
        $this->assertSame(2799, $payment->amount);
        $this->assertSame(PaymentChannel::JazzCash, $payment->channel);
        $this->assertLessThanOrEqual(20, strlen($payment->reference));

        $response = $this->actingAs($user)->get("/billing/payments/{$payment->id}/checkout")
            ->assertOk()
            ->assertSee('action="https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"', false)
            ->assertSee('name="pp_Amount" value="279900"', false)
            ->assertSee($payment->reference);

        $this->assertStringContainsString('https://sandbox.jazzcash.com.pk', (string) $response->headers->get('Content-Security-Policy'));

        $this->actingAs(User::factory()->create())->get("/billing/payments/{$payment->id}/checkout")->assertNotFound();
    }

    public function test_a_signed_jazzcash_success_gives_pro_once_without_touching_the_session(): void
    {
        $user = User::factory()->create();
        $payment = Payment::factory()->for($user)->create();

        $response = $this->post('/payments/jazzcash/return', $this->jazzCashReply($payment, '000'));

        $response->assertRedirect(route('billing.payments.show', $payment));
        $this->assertEmpty(array_filter($response->headers->getCookies(), fn ($cookie): bool => $cookie->getName() === config('session.cookie')));

        $user->refresh();
        $this->assertSame(PaymentStatus::Paid, $payment->fresh()->status);
        $this->assertTrue(app(UsageQuota::class)->isPro($user));
        $this->assertSame(UsageQuota::SOURCE_PAID, app(UsageQuota::class)->entitlement($user)['source']);
        $paidUntil = $user->pro_paid_until;
        $this->assertTrue($paidUntil->between(now()->addMonth()->subMinute(), now()->addMonth()->addMinute()));

        $this->post('/payments/jazzcash/return', $this->jazzCashReply($payment, '000'))->assertRedirect();
        $this->assertTrue($user->fresh()->pro_paid_until->equalTo($paidUntil));
    }

    public function test_forged_or_mismatched_jazzcash_replies_never_give_pro(): void
    {
        $user = User::factory()->create();
        $payment = Payment::factory()->for($user)->create();

        $forged = [...$this->jazzCashReply($payment, '000'), 'pp_SecureHash' => str_repeat('A', 64)];
        $this->post('/payments/jazzcash/return', $forged)->assertRedirect(route('pricing', ['payment' => 'invalid']));
        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);

        $this->post('/payments/jazzcash/return', $this->jazzCashReply($payment, '000', amount: 100))->assertRedirect();
        $this->assertSame(PaymentStatus::Failed, $payment->fresh()->status);
        $this->assertNull($user->fresh()->pro_paid_until);
    }

    public function test_a_declined_or_voucher_jazzcash_payment_does_not_give_pro(): void
    {
        $declined = Payment::factory()->create();
        $voucher = Payment::factory()->create();

        $this->post('/payments/jazzcash/return', $this->jazzCashReply($declined, '121'));
        $this->post('/payments/jazzcash/return', $this->jazzCashReply($voucher, '124'));

        $this->assertSame(PaymentStatus::Failed, $declined->fresh()->status);
        $this->assertSame(PaymentStatus::Pending, $voucher->fresh()->status);
        $this->assertNull($voucher->user->fresh()->pro_paid_until);
    }

    public function test_easypaisa_checkout_encrypts_the_request_with_the_hash_key(): void
    {
        $payment = Payment::factory()->channel(PaymentChannel::Easypaisa)->create();
        $fields = app(EasypaisaGateway::class)->checkoutFields($payment, 'https://example.test/back', 'jane@example.com');

        $decrypted = openssl_decrypt(base64_decode($fields['merchantHashedReq']), 'AES-128-ECB', self::HASH_KEY, OPENSSL_RAW_DATA);

        $this->assertSame('2799.0', $fields['amount']);
        $this->assertStringStartsWith('amount=2799.0&autoRedirect=1&emailAddr=jane@example.com&expiryDate=', $decrypted);
        $this->assertStringEndsWith("&orderRefNum={$payment->reference}&postBackURL=https://example.test/back&storeId=555", $decrypted);
    }

    public function test_easypaisa_auth_token_is_posted_to_the_confirm_page(): void
    {
        $this->get('/payments/easypaisa/return?auth_token=tok123')
            ->assertOk()
            ->assertSee('action="https://easypaystg.easypaisa.com.pk/easypay/Confirm.jsf"', false)
            ->assertSee('name="auth_token" value="tok123"', false);
    }

    public function test_easypaisa_payments_are_given_only_after_easypaisa_confirms_them(): void
    {
        $payment = Payment::factory()->channel(PaymentChannel::Easypaisa)->create();
        Http::fake(['easypaystg.easypaisa.com.pk/*' => Http::sequence()
            ->push(['responseCode' => '0000', 'transactionStatus' => 'PENDING'])
            ->push(['responseCode' => '0000', 'transactionStatus' => 'PAID', 'transactionAmount' => 2799.0, 'transactionId' => '998877'])]);

        $this->get("/payments/easypaisa/return?status=0000&orderRefNumber={$payment->reference}")
            ->assertRedirect(route('billing.payments.show', $payment));
        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);

        $this->actingAs($payment->user)->post("/billing/payments/{$payment->id}/refresh")->assertRedirect();

        $this->assertSame(PaymentStatus::Paid, $payment->fresh()->status);
        $this->assertSame('998877', $payment->fresh()->gateway_transaction_id);
        Http::assertSent(fn ($request): bool => $request->hasHeader('Credentials', base64_encode('api:secret')) && $request['orderId'] === $payment->reference && $request['storeId'] === '555');
    }

    public function test_an_easypaisa_payment_with_a_different_amount_is_not_given_pro(): void
    {
        $payment = Payment::factory()->channel(PaymentChannel::Easypaisa)->create();
        Http::fake(['easypaystg.easypaisa.com.pk/*' => Http::response(['responseCode' => '0000', 'transactionStatus' => 'PAID', 'transactionAmount' => 10.0])]);

        $this->get("/payments/easypaisa/return?orderRefNumber={$payment->reference}");

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertNull($payment->user->fresh()->pro_paid_until);
    }

    public function test_a_bank_transfer_is_reviewed_by_an_admin_before_pro_starts(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($user)->post('/billing/pay/bank_transfer/yearly')->assertRedirect();
        $payment = Payment::query()->sole();

        $this->actingAs($user)->get("/billing/payments/{$payment->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->component('Billing/Payment', false)
                ->where('payment.amount_label', 'Rs 21,999')
                ->where('bank.account_title', 'Resume Tailor'));

        $this->actingAs(User::factory()->create())->get("/billing/payments/{$payment->id}")->assertNotFound();

        $this->actingAs($user)->post("/billing/payments/{$payment->id}/proof", [
            'payer_reference' => 'FT123456',
            'proof' => UploadedFile::fake()->image('receipt.png'),
        ])->assertSessionHasNoErrors();

        $payment->refresh();
        $this->assertSame(PaymentStatus::AwaitingReview, $payment->status);
        Storage::disk('local')->assertExists($payment->proof_path);
        $this->assertFalse(app(UsageQuota::class)->isPro($user->fresh()));

        $this->actingAs($user)->get("/admin/payments/{$payment->id}/proof")->assertForbidden();
        $this->actingAs($admin)->get("/admin/payments/{$payment->id}/proof")->assertOk();

        $this->actingAs($admin)->post("/admin/payments/{$payment->id}/approve")->assertRedirect();

        $this->assertSame(PaymentStatus::Paid, $payment->fresh()->status);
        $this->assertSame($admin->id, $payment->fresh()->reviewed_by);
        $this->assertTrue($user->fresh()->pro_paid_until->between(now()->addYear()->subMinute(), now()->addYear()->addMinute()));
        $this->actingAs($admin)->post("/admin/payments/{$payment->id}/approve")->assertSessionHasErrors('payment');
    }

    public function test_a_transfer_reference_can_only_be_used_once_and_rejections_need_a_note(): void
    {
        Payment::factory()->awaitingReview()->create(['payer_reference' => 'FT999']);
        $payment = Payment::factory()->channel(PaymentChannel::BankTransfer)->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($payment->user)->post("/billing/payments/{$payment->id}/proof", ['payer_reference' => 'FT999'])->assertSessionHasErrors('payer_reference');

        $this->actingAs($admin)->post("/admin/payments/{$payment->id}/reject", ['note' => ''])->assertSessionHasErrors('note');
        $this->actingAs($admin)->post("/admin/payments/{$payment->id}/reject", ['note' => 'No transfer found'])->assertRedirect();

        $this->assertSame(PaymentStatus::Rejected, $payment->fresh()->status);
        $this->assertSame('No transfer found', $payment->fresh()->admin_note);
        $this->assertNull($payment->user->fresh()->pro_paid_until);
    }

    public function test_paying_again_adds_time_after_the_pro_already_paid_for(): void
    {
        $user = User::factory()->create(['pro_paid_until' => now()->addDays(10)]);
        $payment = Payment::factory()->for($user)->create(['interval' => 'monthly']);

        $this->post('/payments/jazzcash/return', $this->jazzCashReply($payment, '000'));

        $this->assertTrue($user->fresh()->pro_paid_until->between(now()->addDays(10)->addMonth()->subMinute(), now()->addDays(10)->addMonth()->addMinute()));
    }

    public function test_only_admins_see_the_payments_list(): void
    {
        Payment::factory()->awaitingReview()->create();

        $this->actingAs(User::factory()->create())->get('/admin/payments')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())
            ->get('/admin/payments?status=awaiting_review')
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Payments/Index', false)->has('payments.data', 1)->where('awaitingReview', 1));
    }

    public function test_super_admins_switch_on_a_channel_in_settings_with_its_secrets_encrypted(): void
    {
        config(['billing.channels.jazzcash' => [...config('billing.channels.jazzcash'), 'enabled' => false, 'merchant_id' => null, 'password' => null, 'integrity_salt' => null]]);

        $this->actingAs(User::factory()->superAdmin()->create())->put('/admin/settings/jazzcash', [
            'enabled' => true,
            'mode' => 'sandbox',
            'merchant_id' => 'MC777',
            'password' => 'jc-password',
            'integrity_salt' => 'jc-salt-value',
        ])->assertSessionHasNoErrors();

        $this->assertTrue(app(JazzCashGateway::class)->isConfigured());
        $this->assertTrue((bool) config('billing.channels.jazzcash.enabled'));
        $this->assertStringNotContainsString('jc-salt-value', (string) DB::table('settings')->where('key', 'site.jazzcash')->value('value'));
    }

    /**
     * A reply as JazzCash posts it back, signed with the integrity salt.
     *
     * @return array<string, string>
     */
    protected function jazzCashReply(Payment $payment, string $code, ?int $amount = null): array
    {
        $reply = [
            'pp_Version' => '1.1',
            'pp_TxnType' => 'MWALLET',
            'pp_Language' => 'EN',
            'pp_MerchantID' => 'MC123',
            'pp_TxnRefNo' => $payment->reference,
            'pp_Amount' => (string) (($amount ?? $payment->amount) * 100),
            'pp_TxnCurrency' => 'PKR',
            'pp_TxnDateTime' => now()->format('YmdHis'),
            'pp_BillReference' => 'pro'.$payment->id,
            'pp_ResponseCode' => $code,
            'pp_ResponseMessage' => 'Thank you for Using JazzCash',
            'pp_RetreivalReferenceNo' => '201113123456',
        ];

        $reply['pp_SecureHash'] = app(JazzCashGateway::class)->secureHash($reply);

        return $reply;
    }
}
