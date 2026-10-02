// Helpers for suite details shown on the public booking page.

/** Suite description in the page language, falling back to the other language. */
export function suiteDescription(suite, language) {
  if (!suite) {
    return '';
  }
  return language === 'es'
    ? (suite.descriptionEs || suite.descriptionEn || '')
    : (suite.descriptionEn || suite.descriptionEs || '');
}

/** Same rule as the backend: images shipped with the app (/suites/...) or https links. */
export function isValidPhotoUrl(url) {
  const value = String(url || '').trim();
  return /^(\/(?!\/)|https:\/\/)\S+$/.test(value) && value.length <= 500;
}
