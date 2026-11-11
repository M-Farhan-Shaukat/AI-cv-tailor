import { usePage } from '@inertiajs/react';
import React, { useEffect, useRef } from 'react';

/**
 * One responsive AdSense unit. Renders nothing when ads are off, the ad unit is not configured or the
 * visitor is on Pro (the server sends no "ads" prop then). The AdSense script is loaded once, on the
 * first page that shows an ad, so tool and account pages never load it.
 */
export default function AdSlot({ slot = 'in_article', className = '' }) {
    const ads = usePage().props.ads;
    const adSlotId = ads?.slots?.[slot];
    const insRef = useRef(null);

    useEffect(() => {
        if (!ads?.client || !adSlotId || !insRef.current || insRef.current.dataset.adsbygoogleStatus) {
            return;
        }

        const scriptId = 'adsbygoogle-js';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.client)}`;
            document.head.appendChild(script);
        }

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // An ad blocker or a not-yet-approved account; the page works without the ad.
        }
    }, [ads?.client, adSlotId]);

    if (!ads?.client || !adSlotId) {
        return null;
    }

    return (
        <aside className={`rt-ad ${className}`} aria-label="Advertisement">
            <span className="rt-ad-label">Advertisement</span>
            <ins
                ref={insRef}
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={ads.client}
                data-ad-slot={adSlotId}
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </aside>
    );
}
