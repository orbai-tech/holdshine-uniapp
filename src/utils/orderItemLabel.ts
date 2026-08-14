/** 行规格文案：sku_name · option_name… */

type SpecOption = { option_id?: number; option_name?: string | null; name?: string | null }

export function formatItemSpec(input: {
  sku_name?: string | null
  spec_name?: string | null
  options?: SpecOption[] | string[] | null
  addons?: string[] | null
}): string {
  const parts: string[] = []
  const sku = (input.sku_name || input.spec_name || '').trim()
  if (sku) parts.push(sku)

  for (const option of input.options ?? []) {
    if (typeof option === 'string') {
      const name = option.trim()
      if (name) parts.push(name)
      continue
    }
    const name = (option.option_name || option.name || '').trim()
    if (name) parts.push(name)
  }

  for (const addon of input.addons ?? []) {
    const name = String(addon || '').trim()
    if (name) parts.push(name)
  }

  return parts.join(' · ')
}
