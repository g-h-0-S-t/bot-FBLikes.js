javascript:

'use strict';

/*
 * MIT License
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
 * SOFTWARE.
 */

(() => {
    /*
     * Configuration for selectors and timing
     * LIKE_BUTTON_SELECTOR: Targets the Like button
     * REMOVE_REACTION_SELECTOR: Targets Remove Like/Love/Haha/Care buttons
     * NEXT_BUTTON_SELECTOR: Targets the Next photo button
     * MAX_RETRIES: Number of retries for finding elements (set low for speed)
     * RETRY_DELAY: Delay between retries in milliseconds (set low for speed)
     */
    const CONFIG = {
        LIKE_BUTTON_SELECTOR: '[aria-label="Like"][class*="x1i10hfl x1qjc9v5"]',
        REMOVE_REACTION_SELECTOR: '[aria-label="Remove Like"][class*="x1i10hfl x1qjc9v5"],[aria-label="Remove Love"][class*="x1i10hfl x1qjc9v5"],[aria-label="Remove Haha"][class*="x1i10hfl x1qjc9v5"],[aria-label="Remove Care"][class*="x1i10hfl x1qjc9v5"]',
        NEXT_BUTTON_SELECTOR: '[aria-label="Next photo"]',
        MAX_RETRIES: 5,
        RETRY_DELAY: 200
    };

    /*
     * Operation tracking variables
     * operationCount: Tracks total operations
     * likedCount: Tracks successful likes
     * nextCount: Tracks successful next button clicks
     * maxRetryLog: Limits retry log spam
     */
    let operationCount = 0;
    let likedCount = 0;
    let nextCount = 0;
    let maxRetryLog = 5;

    /*
     * Logging utility with timestamp and operation details
     * Formats logs with blue color and bold text
     * Includes operation counts and performance timestamp
     */
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

    /*
     * Checks if an element is clickable
     * Returns true if element exists, is visible, and not disabled
     */
    const isElementClickable = (element) => {
        return element && element.offsetParent !== null && !element.disabled;
    };

    /*
     * Attempts to click an element identified by selector
     * Retries up to maxRetries with minimal delay for speed
     * Parameters:
     * - selector: CSS selector for the element
     * - name: Descriptive name for logging
     * - onSuccess: Callback after successful click
     * - onFail: Callback if element is missing after max retries
     * - retry: Current retry attempt
     * - maxRetries: Maximum number of retries
     * - retryDelay: Delay between retries in milliseconds
     */
    const clickWithRetry = (selector, name, onSuccess, onFail, retry = 1, maxRetries = CONFIG.MAX_RETRIES, retryDelay = CONFIG.RETRY_DELAY) => {
        operationCount++;
        log(`Attempting ${name} operation (retry ${retry})`, { selector });

        try {
            const element = document.querySelector(selector);
            if (!element) {
                if (retry >= maxRetries) {
                    log(`${name} not found after ${maxRetries} retries, taking fail path`);
                    if (onFail) setTimeout(onFail, 0);
                    return;
                }
                if (retry <= maxRetryLog) {
                    log(`${name} not found, retrying...`);
                }
                setTimeout(() => clickWithRetry(selector, name, onSuccess, onFail, retry + 1, maxRetries, retryDelay), retryDelay);
                return;
            }

            if (!isElementClickable(element)) {
                if (retry >= maxRetries) {
                    log(`${name} found but not clickable after ${maxRetries} retries, taking fail path`);
                    if (onFail) setTimeout(onFail, 0);
                    return;
                }
                if (retry <= maxRetryLog) {
                    log(`${name} found but not clickable, retrying...`, { element });
                }
                setTimeout(() => clickWithRetry(selector, name, onSuccess, onFail, retry + 1, maxRetries, retryDelay), retryDelay);
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
            if (retry >= maxRetries) {
                log(`${name} operation failed after ${maxRetries} retries`, { error: error.message });
                if (onFail) setTimeout(onFail, 0);
                return;
            }
            setTimeout(() => clickWithRetry(selector, name, onSuccess, onFail, retry + 1, maxRetries, retryDelay), retryDelay);
        }
    };

    /*
     * Checks if the post is already reacted to
     * Returns true if any Remove Like/Love/Haha/Care button is found
     */
    const isPostReacted = () => {
        return !!document.querySelector(CONFIG.REMOVE_REACTION_SELECTOR);
    };

    /*
     * Main cycle to check reactions, like, and navigate to next photo
     * Checks for Remove buttons first; if found, skips to next
     * Otherwise, attempts to like with retries, then moves to next
     */
    const runCycle = () => {
        log('Starting new cycle');

        /*
         * Check for any Remove Like/Love/Haha/Care buttons
         * If found, skip liking and move to next photo
         */
        if (isPostReacted()) {
            log('Post already reacted, moving to next');
            clickWithRetry(
                CONFIG.NEXT_BUTTON_SELECTOR,
                'Next photo button (already reacted)',
                () => {
                    log('Cycle completed (already reacted), restarting');
                    setTimeout(runCycle, 0);
                },
                () => {
                    log('Next button not found after max retries, restarting cycle');
                    setTimeout(runCycle, 0);
                }
            );
            return;
        }

        /*
         * No reaction found, attempt to like
         * On success, move to next; on failure after retries, move to next
         */
        clickWithRetry(
            CONFIG.LIKE_BUTTON_SELECTOR,
            'Like button',
            () => clickWithRetry(
                CONFIG.NEXT_BUTTON_SELECTOR,
                'Next photo button',
                () => {
                    log('Cycle completed, restarting');
                    setTimeout(runCycle, 0);
                },
                () => {
                    log('Next button not found after max retries, restarting cycle');
                    setTimeout(runCycle, 0);
                }
            ),
            () => clickWithRetry(
                CONFIG.NEXT_BUTTON_SELECTOR,
                'Next photo button (no-like fallback)',
                () => {
                    log('No-like fallback cycle completed, restarting');
                    setTimeout(runCycle, 0);
                },
                () => {
                    log('Next button not found after max retries, restarting cycle');
                    setTimeout(runCycle, 0);
                }
            )
        );
    };

    /*
     * Initialize the automation
     * Starts the cycle with no initial delay
     */
    log('🚀 Initializing hyper-optimized FB Likes automation');
    setTimeout(runCycle, 0);
})();
