'use strict';

(() => {
    const LIKE_SELECTOR = '[aria-label="Like"][class*="x1i10hfl x1qjc9v5"]';
    const UNLIKE_SELECTOR = '[aria-label="Unlike"][class*="x1i10hfl x1qjc9v5"]';
    const REMOVE_SELECTOR = '[aria-label^="Remove"][class*="x1i10hfl x1qjc9v5"]';
    const LOVE_PICKER = '[aria-label="Love"]';
    const ALREADY_HEART = 'Remove Love reaction';

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const fire = (el, events) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        events.forEach(type => el.dispatchEvent(new MouseEvent(type, {
            bubbles: true, cancelable: true, view: window,
            clientX: cx, clientY: cy,
        })));
    };

    const waitFor = (selector, timeout = 5000) => new Promise(resolve => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) { obs.disconnect(); resolve(found); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
    });

    const getBtn = () =>
        document.querySelector(UNLIKE_SELECTOR) ||
        document.querySelector(REMOVE_SELECTOR) ||
        document.querySelector(LIKE_SELECTOR);

    const openPickerAndClickHeart = async (btn) => {
        // Phase 1: Hammer the hover sequence repeatedly to force picker open
        for (let attempt = 0; attempt < 3; attempt++) {
            fire(btn, ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']);
            await sleep(300);

            const heartBtn = document.querySelector(LOVE_PICKER);
            if (heartBtn) {
                // Keep the Like btn hovered so picker stays open
                fire(btn, ['mousemove']);
                await sleep(200);

                // Full event sequence on Love button
                fire(heartBtn, ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']);
                await sleep(100);
                fire(heartBtn, ['pointerdown', 'mousedown']);
                await sleep(50);
                fire(heartBtn, ['pointerup', 'mouseup', 'click']);
                await sleep(800);

                // Verify it worked
                const confirmBtn = getBtn();
                if (confirmBtn?.getAttribute('aria-label') === ALREADY_HEART) {
                    return true; // success
                }
                // Didn't stick — loop and retry
            }
        }
        return false;
    };

    const heartReactPost = async () => {
        let btn = getBtn();
        if (!btn) return;

        // Already hearted — nothing to do
        if (btn.getAttribute('aria-label') === ALREADY_HEART) return;

        // Phase 1: If already reacted (not a Like), remove the reaction first
        // so we start from a clean "Like" state
        const existingLabel = btn.getAttribute('aria-label');
        if (existingLabel !== 'Like') {
            btn.click(); // removes existing reaction
            await sleep(1000);
            // Wait for the Like button to come back
            btn = await waitFor(LIKE_SELECTOR, 3000);
            if (!btn) return;
        }

        // Phase 2: Attempt to open picker and click Heart up to 5 times total
        for (let round = 0; round < 5; round++) {
            btn = getBtn();
            if (!btn) break;
            if (btn.getAttribute('aria-label') === ALREADY_HEART) return; // done

            const success = await openPickerAndClickHeart(btn);
            if (success) return;

            // Picker approach failed this round — wait and retry
            await sleep(500);

            // Close any stray open picker by moving away
            fire(btn, ['mouseleave', 'pointerleave']);
            await sleep(300);
        }

        console.warn('[FBHearts] All attempts failed for this post.');
    };

    const advancePost = () => {
        document.querySelectorAll('[aria-label^="Next"]').forEach(v => v.click());
    };

    const FBHearts = async () => {
        await heartReactPost();
        await sleep(1500);
        advancePost();
        await sleep(2000);
        FBHearts();
    };

    FBHearts();
})();
