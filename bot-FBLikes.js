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

(function () {
    /**document.querySelectorAll('span').forEach(function (v, i, a) {
        if (v.textContent === 'See All Photos') {
            v.click();
        }
    });**/
    setTimeout(function () {
        /**document.querySelector('[href^="https://www.facebook.com/photo.php?fbid="]').click();**/
        document.querySelector('[href*="/photo"]').click();
    }, 1000);
    var FBLikes = function () {
        setTimeout(function () {
            try {
                document.querySelector('[aria-label="Like"][class*="gs1a9yip"]').click();
            } catch {
                document.querySelector('[aria-label="Next photo"]').click();
            }
        }, 1500)
        setTimeout(function () {
            document.querySelector('[aria-label="Next photo"]').click();
        }, 2500)
    }
    setInterval(FBLikes, 4500);
})();
