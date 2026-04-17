const { formatDuration } = require('../../src/lib/time-format');

describe('formatDuration', () => {
  test('returns "刚刚" for less than 1 minute', () => {
    expect(formatDuration(Date.now() - 30 * 1000)).toBe('刚刚');
  });

  test('returns minutes for < 1 hour', () => {
    expect(formatDuration(Date.now() - 12 * 60 * 1000)).toBe('12分');
  });

  test('returns hours for < 24 hours', () => {
    expect(formatDuration(Date.now() - 2 * 60 * 60 * 1000)).toBe('2小时');
  });

  test('returns "1天" for between 24 and 48 hours', () => {
    expect(formatDuration(Date.now() - 25 * 60 * 60 * 1000)).toBe('1天');
  });

  test('returns days for >= 48 hours', () => {
    expect(formatDuration(Date.now() - 3 * 24 * 60 * 60 * 1000)).toBe('3天');
  });

  test('returns "---" for undefined timestamp', () => {
    expect(formatDuration(undefined)).toBe('---');
  });
});
