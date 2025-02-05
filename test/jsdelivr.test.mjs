/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-env mocha */
/* eslint-env serviceworker */
import assert from 'assert';
import { respondJsdelivr } from '../src/jsdelivr.mjs';

describe('Test jdelivr handler', () => {
  it('handles web-vitals request', async () => {
    const req = {};
    req.url = 'http://foo.bar.org/.rum/web-vitals';

    const storedFetch = global.fetch;

    try {
      // Mock the global fetch function
      global.fetch = (v, opts) => {
        assert.equal('jsdelivr', opts.backend);
        if (v.url === 'https://cdn.jsdelivr.net/npm/web-vitals') {
          const resp = {
            url: v.url,
            status: 200,
          };
          resp.headers = new Headers();
          resp.headers.append('xyz', 'abc');
          return resp;
        }
        return undefined;
      };

      const resp = await respondJsdelivr(req);

      assert.equal(200, resp.status);
      assert.equal('abc', resp.headers.get('xyz'));
      assert.equal('cross-origin', resp.headers.get('Cross-Origin-Resource-Policy'));
    } finally {
      global.fetch = storedFetch;
    }
  });

  it('handles redirects', async () => {
    const req = {
      url: 'http://foo.bar.org/npm/first',
    };

    const storedFetch = global.fetch;

    try {
      global.fetch = (v) => {
        if (v.url === 'https://cdn.jsdelivr.net/npm/first') {
          return {
            status: 302,
            headers: new Headers({
              Location: 'https://cdn.jsdelivr.net/npm/second',
            }),
          };
        } else if (v.url === 'https://cdn.jsdelivr.net/npm/second') {
          return {
            status: 301,
            headers: new Headers({
              Location: '/npm/third',
            }),
          };
        } else if (v.url === 'https://cdn.jsdelivr.net/npm/third') {
          return {
            status: 200,
            headers: new Headers({
              foo: 'bar',
            }),
          };
        }
        return null;
      };

      const resp = await respondJsdelivr(req);
      assert.equal(200, resp.status);
      assert.equal('bar', resp.headers.get('foo'));
    } finally {
      global.fetch = storedFetch;
    }
  });

  it('handles redirects 2', async () => {
    const req = {
      url: 'http://foo.bar.org/npm/first',
    };

    const storedFetch = global.fetch;

    try {
      global.fetch = (v) => {
        if (v.url === 'https://cdn.jsdelivr.net/npm/first') {
          return {
            status: 307,
            headers: new Headers({
              Location: 'https://cdn.jsdelivr.net/npm/second',
            }),
          };
        } else if (v.url === 'https://cdn.jsdelivr.net/npm/second') {
          return {
            status: 200,
            headers: new Headers({
              hi: 'ha',
            }),
          };
        }
        return null;
      };

      const resp = await respondJsdelivr(req);
      assert.equal(200, resp.status);
      assert.equal('ha', resp.headers.get('hi'));
    } finally {
      global.fetch = storedFetch;
    }
  });

  it('cleans up response', async () => {
    const req = {};
    req.url = 'http://foo.bar.org/.rum/@adobe/helix-rum-js?generation=42';

    const storedFetch = global.fetch;

    try {
      // Mock the global fetch function
      global.fetch = (v, opts) => {
        assert.equal('jsdelivr', opts.backend);
        if (v.url === 'https://cdn.jsdelivr.net/npm/@adobe/helix-rum-js') {
          const headers = new Headers();
          headers.append('foo', 'bar');
          headers.append('x-jsd-version', 'eek');
          headers.append('x-jsd-version-type', 'eek');
          headers.append('x-served-by', 'eek');
          headers.append('x-cache', 'eek');

          const resp = {
            headers,
            ok: true,
            status: 200,
          };
          return resp;
        }
        return undefined;
      };

      const resp = await respondJsdelivr(req);

      assert.equal(200, resp.status);
      assert.equal('bar', resp.headers.get('foo'));

      // Should clear these headers in the cleanupHeaders()
      assert(!resp.headers.has('x-jsd-version'));
      assert(!resp.headers.has('x-jsd-version-tyep'));
      assert(!resp.headers.has('x-served-by'));
      assert(!resp.headers.has('x-cache'));
    } finally {
      global.fetch = storedFetch;
    }
  });
});
