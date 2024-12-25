import type { HttpSearchParams, RequestSource } from '@/types';

export const extractURLFromRequestSource = (requestSource: RequestSource) => {
  if (requestSource instanceof URL) {
    return requestSource.toString();
  }

  if (requestSource instanceof Request) {
    return requestSource.url;
  }

  return requestSource;
};

const resolveSearchParams = (searchParams: HttpSearchParams) => {
  return searchParams ? new URLSearchParams(searchParams) : null;
};

export const appendSearchParamsToURL = (
  searchParams: HttpSearchParams,
  baseURL: string
) => {
  const resolvedSearchParams = resolveSearchParams(searchParams);

  const url = new URL(baseURL);

  if (!url) {
    throw new Error('Base URL is not valid');
  }

  if (resolvedSearchParams) {
    url.search = resolvedSearchParams?.toString();
  }

  return url.toString();
};

export const appendPrefixToRequestSource = (
  requestSource: RequestSource,
  prefixURL: RequestSource,
  searchParams?: HttpSearchParams
) => {
  const url = extractURLFromRequestSource(requestSource);

  if (!prefixURL) {
    return url;
  }

  if (url?.startsWith('/')) {
    throw new Error(
      `'RequestSource' cannot starts with '/' when using a prefixURL`
    );
  }

  const normalizedURL = prefixURL + url;

  if (searchParams) {
    return appendSearchParamsToURL(searchParams, normalizedURL);
  }

  return normalizedURL;
};
