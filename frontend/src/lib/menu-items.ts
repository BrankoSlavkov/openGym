// Every row a menuSheet would show, in order, the ones folded under "More" included
// (sheets.jsx MenuSheet: `items`, or `sections` of { title, items } and { more: [sections] }).
// Falsy rows are dropped, as the sheet drops them. For code and tests that look a row up by label.
interface MenuSection<T> { more?: MenuSection<T>[]; items?: (T | null | undefined | false)[] }
interface Menu<T> { sections?: MenuSection<T>[]; items?: (T | null | undefined | false)[] }

export function menuItemsOf<T>(menu: Menu<T>): T[] {
  const flat = (list: MenuSection<T>[] | undefined): (T | null | undefined | false)[] => (list || []).flatMap(g => g.more ? flat(g.more) : (g.items || []))
  return (menu.sections ? flat(menu.sections) : menu.items || []).filter((item): item is T => Boolean(item))
}
