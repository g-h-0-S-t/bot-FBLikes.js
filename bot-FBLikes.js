javascript:

'use strict';

/* MIT License
 * 
 * Copyright (c) 2021 gh0$t
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE. */

(() => {
    /* Configuration for selectors */
    const CONFIG = {
        LIKE_BUTTON_SELECTOR: '[aria-label="Like"][class*="x1i10hfl x1qjc9v5"]',
        NEXT_BUTTON_SELECTOR: '[aria-label="Next photo"]'
    };

    /* Operation tracking */
    let operationCount = 0;
    let likedCount = 0;
    let nextCount = 0;
    let maxRetryLog = 10;

    /* Logging utility with timestamp and operation details */
    const log = (message, data = {}) => {
        console.log(
            `%c[FBLikes ${new Date().toISOString()}] ${message}`,
            'color: #2196F3; font-weight: bold;',
            {
                operation: operationCount,
                liked: likedCount,
                next: nextCount,
                timestamp: performance.now().toFixed(2) + 'ms',
                ...data
            }
        );
    };

    /* Check if an element is clickable */
    const isElementClickable = (element) => {
        return element && element.offsetParent !== null && !element.disabled;
    };

    /* Attempts to click an element identified by selector
     * Retries infinitely with no delay until the element is found and clickable
     * Parameters:
     * - selector: CSS selector for the element
     * - name: Descriptive name for logging
     * - onSuccess: Called after successful click
     * - onFail: Called if element is missing on first try
     * - retry: Count of retry attempts
     */
    const clickWithRetry = (selector, name, onSuccess, onFail, retry = 1) => {
        operationCount++;
        log(`Attempting ${name} operation (retry ${retry})`, { selector });

        try {
            const element = document.querySelector(selector);
            if (!element) {
                if (retry === 1 && onFail) {
                    log(`${name} not found on first try, taking fail path`);
                    setTimeout(onFail, 0);
                } else {
                    if (retry <= maxRetryLog) {
                        log(`${name} not found, retrying...`);
                    } else if (retry === maxRetryLog + 1) {
                        log(`${name} not found, retrying (suppressing future retry logs)`);
                    }
                    setTimeout(() => clickWithRetry(selector, name, onSuccess, onFail, retry + 1), 0);
                }
                return;
            }

            if (!isElementClickable(element)) {
                if (retry <= maxRetryLog) {
                    log(`${name} found but not clickable, retrying...`, { element });
                } else if (retry === maxRetryLog + 1) {
                    log(`${name} found but not clickable, retrying (suppressing future retry logs)`);
                }
                setTimeout(() => clickWithRetry(selector, name, onSuccess, onFail, retry + 1), 0);
                return;
            }

            log(`${name} found and clickable, performing click`, { element });
            element.click();
            if (name.includes('Like')) likedCount++;
            if (name.includes('Next')) nextCount++;
            log(`${name} click successful`);
            setTimeout(onSuccess, 0);
        } catch (error) {
            log(`${name} operation error, retrying...`, { error: error.message });
            setTimeout(() => clickWithRetry(selector, name, onSuccess, onFail, retry + 1), 0);
        }
    };

    /* Main cycle to attempt liking and navigating to next photo */
    const runCycle = () => {
        log('Starting new cycle');
        /* Try to like; if no like button on first try, go next */
        clickWithRetry(
            CONFIG.LIKE_BUTTON_SELECTOR,
            'Like button',
            /* On success: after liking, move to next */
            () => clickWithRetry(
                CONFIG.NEXT_BUTTON_SELECTOR,
                'Next photo button',
                () => {
                    log('Cycle completed, restarting');
                    setTimeout(runCycle, 0);
                },
                null
            ),
            /* On fail: no like found, go next immediately */
            () => clickWithRetry(
                CONFIG.NEXT_BUTTON_SELECTOR,
                'Next photo button (no-like fallback)',
                () => {
                    log('No-like fallback cycle completed, restarting');
                    setTimeout(runCycle, 0);
                },
                null
            )
        );
    };

    /* Initialize the automation */
    log('🚀 Initializing hyper-optimized FB Likes automation');
    setTimeout(runCycle, 0);
})();
