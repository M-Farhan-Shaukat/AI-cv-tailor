import { Link } from '@inertiajs/react';
import React from 'react';
import LegalDocument from '../../Components/LegalDocument';

export default function Terms({ updatedAt, contactEmail, seo }) {
    const sections = [
        {
            id: 'agreement',
            title: 'Agreement to these terms',
            body: <p>By using ResumeTailor AI you agree to these terms and to our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the service.</p>,
        },
        {
            id: 'the-service',
            title: 'The service',
            body: (
                <p>
                    ResumeTailor AI scores CVs against job descriptions, rewrites CVs to match a job, creates downloadable resumes and
                    shows job listings from third-party providers. Features and plan limits may change over time; we will describe the
                    current limits on the <Link href="/pricing">pricing page</Link>.
                </p>
            ),
        },
        {
            id: 'accounts',
            title: 'Accounts',
            body: <p>You must give accurate details when you create an account and keep your password secure. You are responsible for activity on your account. You must be at least 16 years old to use the service.</p>,
        },
        {
            id: 'your-content',
            title: 'Your content',
            body: (
                <p>
                    You keep ownership of the CVs and information you upload. You give us permission to store and process that content,
                    including through our AI service provider, only to provide the service to you. You confirm that you have the right to
                    upload it and that the information in your CV is true.
                </p>
            ),
        },
        {
            id: 'ai-output',
            title: 'AI-generated content',
            body: (
                <p>
                    Tailored resumes are produced automatically. We design them to use only information from your CV or skills you
                    confirm, but you must review every resume before you use it and make sure it is accurate. ATS scores are an estimate
                    of keyword match, not a promise of how any employer's system will rank you. We do not guarantee interviews or job offers.
                </p>
            ),
        },
        {
            id: 'job-listings',
            title: 'Job listings',
            body: <p>Job listings come from third-party providers. We do not employ, endorse or verify the employers, and listings may be out of date. Always check the details on the original posting before applying.</p>,
        },
        {
            id: 'billing',
            title: 'Subscriptions and billing',
            body: (
                <ul>
                    <li>Pro is a subscription billed monthly or yearly through Stripe at the price shown when you subscribe.</li>
                    <li>Subscriptions renew automatically until cancelled. You can cancel any time from Profile &amp; billing; Pro stays active until the end of the period you paid for.</li>
                    <li>Except where the law requires otherwise, payments are not refundable for partly used periods.</li>
                    <li>"Unlimited" tailoring is subject to a fair-use limit to protect the service for everyone.</li>
                </ul>
            ),
        },
        {
            id: 'acceptable-use',
            title: 'Acceptable use',
            body: (
                <>
                    <p>You must not:</p>
                    <ul>
                        <li>upload content you do not have the right to use, or content that is unlawful or harmful;</li>
                        <li>use the service to create false or misleading CVs;</li>
                        <li>try to get around plan limits, for example with multiple accounts or automated requests;</li>
                        <li>scrape, overload, reverse engineer or interfere with the service.</li>
                    </ul>
                    <p>We may suspend or close accounts that break these rules.</p>
                </>
            ),
        },
        {
            id: 'liability',
            title: 'Disclaimers and liability',
            body: (
                <p>
                    The service is provided "as is". To the extent the law allows, we are not liable for indirect or consequential
                    losses, or for decisions employers make about your applications. Our total liability to you is limited to the
                    amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer law.
                </p>
            ),
        },
        {
            id: 'changes',
            title: 'Changes and termination',
            body: <p>We may update these terms; the "last updated" date shows the latest version, and continuing to use the service means you accept it. You can stop using the service and delete your account at any time.</p>,
        },
        {
            id: 'contact',
            title: 'Contact',
            body: <p>Questions about these terms can be sent to <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or through our <Link href="/contact">contact page</Link>.</p>,
        },
    ];

    return (
        <LegalDocument
            seo={seo}
            title="Terms of Service"
            lead="The rules for using ResumeTailor AI, in plain language."
            updatedAt={updatedAt}
            sections={sections}
        />
    );
}
