/**
 * Builds a Phantom deeplink URL with appropriate parameters
 * 
 * @param path The Phantom endpoint path (e.g., 'connect', 'disconnect', etc.)
 * @param params URLSearchParams containing necessary parameters
 * @returns The complete URL as a string
 */
export const buildUrl = (path: string, params: URLSearchParams): string => {
  return `https://phantom.app/ul/v1/${path}?${params.toString()}`;
};