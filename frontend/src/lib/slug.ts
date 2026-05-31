export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function uniqueSlug(base: string): string {
  return `${slugify(base) || 'product'}-${Math.random().toString(36).slice(2, 6)}`;
}
