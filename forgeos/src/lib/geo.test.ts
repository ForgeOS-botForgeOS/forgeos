import { describe, it, expect } from 'vitest';
import { DEFAULT_GYM, isPlaceholderGym } from './geo';

describe('isPlaceholderGym', () => {
  it('is true for the untouched default spot', () => {
    expect(isPlaceholderGym(DEFAULT_GYM)).toBe(true);
    expect(isPlaceholderGym({ lat: 52.52, lng: 13.405 })).toBe(true);
  });

  it('is false once the gym has been set to a real location', () => {
    expect(isPlaceholderGym({ lat: 48.1486, lng: 17.1077 })).toBe(false);
    expect(isPlaceholderGym({ lat: 52.52, lng: 13.4051 })).toBe(false);
  });

  it('matches the settings store default, so a fresh install counts as unset', async () => {
    const { useSettings } = await import('../state/settingsStore');
    expect(isPlaceholderGym(useSettings.getState().gym)).toBe(true);
  });
});
