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
     * REACTION_CONTAINER_SELECTOR: Targets the container with reaction buttons
     * POLL_INTERVAL: Interval for polling buttons in milliseconds (set low for speed)
     */
    const CONFIG = {
        LOG_ENABLED: false,
        LIKE_BUTTON_SELECTOR: '[aria-label="Like"][class*="x1i10hfl x1qjc9v5"]',
        REMOVE_REACTION_SELECTOR: '[aria-label="Remove Like"][class*="x1i10hfl x1qjc9v5"],[aria-label="Remove Love"][class*="x1i10hfl x1qjc9v5"],[aria-label="Remove Haha"][class*="x1i10hfl x1qjc9v5"],[aria-label="Remove Care"][class*="x1i10hfl x1qjc9v5"],[aria-label="Remove Sad"][class*="x1i10hfl x1qjc9v5"]',
        NEXT_BUTTON_SELECTOR: '[aria-label^="Next"]',
        REACTION_CONTAINER_SELECTOR: '.x1q0g3np.xjkvuk6',
        POLL_INTERVAL: 0
    };

    /*
     * Operation tracking variables
     * operationCount: Tracks total operations
     * likedCount: Tracks successful likes
     * nextCount: Tracks successful next button clicks
     * maxPollLog: Limits polling log spam
     */
    let operationCount = 0;
    let likedCount = 0;
    let nextCount = 0;
    let maxPollLog = 10;

    /*
     * Logging utility with timestamp and operation details
     * Formats logs with blue color and bold text
     * Includes operation counts and performance timestamp
     */
    const log = (message, data = {}) => {
        if (!CONFIG.LOG_ENABLED) return;
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
     * Checks if the post is reactable by verifying the reaction container has exactly 3 div children
     * Returns true if the container exists and has 3 div children
     */
    const isPostReactable = () => {
        const container = document.querySelector(CONFIG.REACTION_CONTAINER_SELECTOR);
        if (!container) {
            log('Reaction container not found');
            return false;
        }
        const divChildren = Array.from(container.children).filter(child => child.tagName === 'DIV');
        const isReactable = divChildren.length >= 2;
        log(`Reaction container found, ${divChildren.length} div children, reactable: ${isReactable}`);
        return isReactable;
    };

    /*
     * Attempts to click an element identified by selector
     * Checks if element exists and is clickable before clicking
     * Parameters:
     * - selector: CSS selector for the element
     * - name: Descriptive name for logging
     * - onSuccess: Callback after successful click
     */
    const tryClick = (selector, name, onSuccess, matchAll) => {
        operationCount++;
        log(`Attempting ${name} operation`, { selector });

        try {
            const element = document.querySelector(selector);
            if (!element) {
                log(`${name} not found`);
                return false;
            }
            if (!isElementClickable(element)) {
                log(`${name} found but not clickable`);
                return false;
            }
            log(`${name} found and clickable, performing click`, { element });
            if (matchAll) {
                document?.querySelectorAll(selector)?.forEach((v)=>v.click());
            }
            else {
             element.click();   
            }
            if (name.includes('Like')) likedCount++;
            if (name.includes('Next')) nextCount++;
            log(`${name} click successful`);
            setTimeout(onSuccess, 0);
            return true;
        } catch (error) {
            log(`${name} operation error`, { error: error.message });
            return false;
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
     * Polls for buttons (Remove or Like) until one is found and actionable
     * If Remove button is found, clicks Next
     * If Like button is found and post is reactable, clicks Like then Next
     * If post is not reactable, clicks Next
     * Parameters:
     * - pollCount: Tracks polling attempts for logging
     */
    const pollForButtons = (pollCount = 1) => {
        operationCount++;
        if (pollCount <= maxPollLog) {
            log(`Polling for buttons (attempt ${pollCount})`);
        } else if (pollCount === maxPollLog + 1) {
            log(`Polling for buttons (suppressing future logs)`);
        }

        /*
         * Check for Remove buttons first
         * If found, click Next button
         */
        if (isPostReacted()) {
            log('Post already reacted, attempting to move to next');
            const clicked = tryClick(
                CONFIG.NEXT_BUTTON_SELECTOR,
                'Next photo button (already reacted)',
                () => {
                    log('Cycle completed (already reacted), restarting');
                    setTimeout(runCycle, 0);
                }
            );
            if (clicked) return;
        } else if (isPostReactable()) {
            /*
             * Post is reactable and not reacted, check for Like button
             * If found, click Like then Next
             */
            const clicked = tryClick(
                CONFIG.LIKE_BUTTON_SELECTOR,
                'Like button',
                () => {
                    log('Like successful, attempting to move to next');
                    tryClick(
                        CONFIG.NEXT_BUTTON_SELECTOR,
                        'Next photo button',
                        () => {
                            log('Cycle completed, restarting');
                            setTimeout(runCycle, 0);
                        }
                    );
                }
            );
            if (clicked) return;
        } else {
            /*
             * Post is not reactable, click Next
             */
            log('Post not reactable, attempting to move to next');
            const clicked = tryClick(
                CONFIG.NEXT_BUTTON_SELECTOR,
                'Next photo button (not reactable)',
                () => {
                    log('Cycle completed (not reactable), restarting');
                    setTimeout(runCycle, 0);
                }
            );
            if (clicked) return;
        }

        /*
         * No actionable buttons found, continue polling
         */
        setTimeout(() => pollForButtons(pollCount + 1), CONFIG.POLL_INTERVAL);
    };

    /*
     * Main cycle to initiate button polling
     * Starts polling for Remove or Like buttons
     */
    const runCycle = () => {
        log('Starting new cycle');
        pollForButtons();
    };

    /*
     * Initialize the automation
     * Starts the cycle with no initial delay
     */
    log('🚀 Initializing hyper-optimized FB Likes automation');
    setTimeout(runCycle, 0);
})();
