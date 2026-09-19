/** Нормализация строки для ключа каталога: «Lada Vesta» → «lada_vesta». */
export function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\-.]+/g, '_')
    .replace(/[^a-zа-яё0-9_]/gi, '');
}

/** Ключ для поиска 3D-модели по марке и модели: makeModelKey('Lada', 'Vesta') → 'lada_vesta'. */
export function makeModelKey(make: string, model: string): string {
  const m = normalizeKey(make);
  const mod = normalizeKey(model);
  return m && mod ? `${m}_${mod}` : m || mod;
}
