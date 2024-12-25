import {
  appendPrefixToRequestSource,
  appendSearchParamsToURL,
  extractURLFromRequestSource,
} from './url';

describe('URL utils', () => {
  describe('extractURLFromRequestSource', () => {
    it('should return the URL string if requestSource is an instance of URL', () => {
      const url = new URL('https://example.com');
      expect(extractURLFromRequestSource(url)).toBe('https://example.com/');
    });

    it('should return the URL string if requestSource is an instance of Request', () => {
      const request = new Request('https://example.com');
      expect(extractURLFromRequestSource(request)).toBe('https://example.com/');
    });

    it('should return the requestSource if it is a string', () => {
      const url = 'https://example.com';
      expect(extractURLFromRequestSource(url)).toBe(url);
    });
  });

  describe('appendSearchParamsToURL', () => {
    it('should append search params to the base URL', () => {
      const searchParams = { baz: 'qux', foo: 'bar' };
      const baseURL = 'https://example.com';
      const result = appendSearchParamsToURL(searchParams, baseURL);
      expect(result).toBe('https://example.com/?baz=qux&foo=bar');
    });

    it('should return the base URL if searchParams is null', () => {
      const baseURL = 'https://example.com';
      const result = appendSearchParamsToURL(null, baseURL);
      expect(result).toBe('https://example.com/');
    });
  });

  describe('appendPrefixToRequestSource', () => {
    it('should append prefix to the request source URL', () => {
      const requestSource = 'path/to/resource';
      const prefixURL = 'https://example.com/';
      const result = appendPrefixToRequestSource(requestSource, prefixURL);
      expect(result).toBe('https://example.com/path/to/resource');
    });

    it('should throw an error if requestSource starts with "/"', () => {
      const requestSource = '/path/to/resource';
      const prefixURL = 'https://example.com/';
      expect(() =>
        appendPrefixToRequestSource(requestSource, prefixURL)
      ).toThrow(
        `'RequestSource' cannot starts with '/' when using a prefixURL`
      );
    });

    it('should return the request source URL if prefixURL is not provided', () => {
      const requestSource = 'https://example.com/path/to/resource';
      const result = appendPrefixToRequestSource(requestSource, null);
      expect(result).toBe('https://example.com/path/to/resource');
    });
  });
});
