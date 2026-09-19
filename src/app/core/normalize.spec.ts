import { makeModelKey, normalizeKey } from './normalize';

describe('normalize', () => {
  it('нормализует марку и модель в ключ каталога', () => {
    expect(makeModelKey('Lada', 'Vesta')).toBe('lada_vesta');
    expect(makeModelKey('  Toyota  ', 'Camry-70 ')).toBe('toyota_camry_70');
  });

  it('приводит к нижнему регистру и убирает лишние символы', () => {
    expect(normalizeKey('  BMW X5! ')).toBe('bmw_x5');
  });

  it('работает с кириллицей', () => {
    expect(makeModelKey('Лада', 'Веста')).toBe('лада_веста');
  });

  it('возвращает только непустую часть, если одна из строк пустая', () => {
    expect(makeModelKey('', 'Vesta')).toBe('vesta');
    expect(makeModelKey('Lada', '')).toBe('lada');
    expect(makeModelKey('', '')).toBe('');
  });
});
