import { Link } from '@inertiajs/react';
import React from 'react';
import LegalDocument from '../../Components/LegalDocument';

export default function Privacy({ updatedAt, contactEmail, seo }) {
    const sections = [
        {
            id: 'who-we-are',
            title: 'Who we are',
            body: (
                <p>
                    ResumeTailor AI ("we", "us") provides an online service that scores CVs against job descriptions, tailors CVs and
                    shows matching job listings. This policy explains what personal data we collect, why, and the choices you have.
                    Questions about it can be sent to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
                </p>
            ),
        },
        {
            id: 'data-we-collect',
            title: 'Information we collect',
            body: (
                <ul>
                    <li><strong>Account details:</strong> your name, email address and password (stored only as a secure hash) when you create an account.</li>
                    <li><strong>CVs and job descriptions:</strong> the text extracted from CVs you upload, the job descriptions you paste, and the tailored resumes and scores we create from them.</li>
                    <li><strong>Usage information:</strong> your IP address, browser session and the number of CVs you tailor, which we use to apply plan limits and keep the service secure.</li>
                    <li><strong>Payment information:</strong> if you subscribe, payments are handled by Stripe. We receive your subscription status and a customer reference, never your full card number.</li>
                    <li><strong>Messages:</strong> anything you send us through the contact form.</li>
                    <li><strong>Job search data:</strong> searches, saved jobs and alerts you create.</li>
                </ul>
            ),
        },
        {
            id: 'how-we-use',
            title: 'How we use your information',
            body: (
                <ul>
                    <li>To score and tailor your CV, and to match you with job listings.</li>
                    <li>To run your account, subscription and plan limits.</li>
                    <li>To send emails you asked for, such as job alerts and password resets.</li>
                    <li>To keep the service secure, prevent abuse and fix problems.</li>
                    <li>To show advertising to visitors on the free plan (see Advertising below).</li>
                </ul>
            ),
        },
        {
            id: 'ai-processing',
            title: 'AI processing of your CV',
            body: (
                <p>
                    To extract job keywords and rewrite your CV, the text of your CV and the job description are sent to a third-party
                    AI service provider that processes it on our behalf. We send only the text needed for the request. The ATS score
                    itself is calculated on our own servers. Please do not include information in your CV that you do not want processed,
                    such as identity or bank numbers.
                </p>
            ),
        },
        {
            id: 'cookies',
            title: 'Cookies',
            body: (
                <>
                    <p>We use a small number of cookies that are essential for the site to work: a session cookie that keeps you signed in and a security cookie that protects forms. These cannot be switched off.</p>
                    <p>If advertising is shown, Google and its partners may also set cookies, as described in the next section. You can block or delete cookies in your browser settings, although some parts of the site may then stop working.</p>
                </>
            ),
        },
        {
            id: 'advertising',
            title: 'Advertising',
            body: (
                <>
                    <p>We may show ads served by Google AdSense to visitors who are not on the Pro plan. In connection with this:</p>
                    <ul>
                        <li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.</li>
                        <li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.</li>
                        <li>You may opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer">Google Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info/choices" target="_blank" rel="noreferrer">www.aboutads.info</a>.</li>
                        <li>Learn more in <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">how Google uses information from sites that use its services</a>.</li>
                    </ul>
                    <p>Visitors in the European Economic Area, the United Kingdom and Switzerland are asked for consent before personalised ads are shown. Pro members never see ads.</p>
                </>
            ),
        },
        {
            id: 'sharing',
            title: 'Who we share information with',
            body: (
                <>
                    <p>We do not sell your personal information. We share it only with service providers that help us run the service, and only as needed:</p>
                    <ul>
                        <li>hosting and email providers;</li>
                        <li>the AI service provider that processes CV text (see above);</li>
                        <li>Stripe, for payments;</li>
                        <li>job listing providers, which receive the search terms used to fetch listings (not your CV);</li>
                        <li>Google, for advertising on the free plan.</li>
                    </ul>
                    <p>We may also disclose information when the law requires it or to protect the rights and safety of our users.</p>
                </>
            ),
        },
        {
            id: 'retention',
            title: 'How long we keep it',
            body: (
                <p>
                    We keep your account and saved data until you delete your account. Tailored resumes created without an account are
                    kept only as long as needed to show you the result and apply plan limits. Billing records are kept as long as tax law
                    requires. Contact messages are deleted once they are no longer needed to help you.
                </p>
            ),
        },
        {
            id: 'your-rights',
            title: 'Your rights and choices',
            body: (
                <>
                    <p>You can see, update and delete your account details at any time on your <Link href="/profile">profile page</Link>, and delete your uploaded CVs on the My resumes page. Deleting your account removes your saved resumes and job data.</p>
                    <p>Depending on where you live, you may also have the right to request a copy of your data, ask us to correct or delete it, or object to how we use it. Email us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a> and we will respond within 30 days.</p>
                </>
            ),
        },
        {
            id: 'security',
            title: 'Security',
            body: <p>We use encrypted connections (HTTPS), hashed passwords and encrypted storage for sensitive keys, and we limit who can access personal data. No service can be completely secure, so please use a strong, unique password.</p>,
        },
        {
            id: 'children',
            title: 'Children',
            body: <p>The service is intended for people aged 16 and over who are looking for work. We do not knowingly collect information from children under 16.</p>,
        },
        {
            id: 'changes',
            title: 'Changes to this policy',
            body: <p>We may update this policy as the service changes. We will change the "last updated" date above and, for significant changes, let account holders know by email or on the site.</p>,
        },
    ];

    return (
        <LegalDocument
            seo={seo}
            title="Privacy Policy"
            lead="What we collect, why we collect it, and the choices you have."
            updatedAt={updatedAt}
            sections={sections}
        />
    );
}
