const priceFormat = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

export function formatEventDate(dateValue) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateValue))
}

export function formatEventTime(dateValue) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(dateValue))
}

export function formatEventPrice(price) {
  const value = Number(price || 0)
  return value === 0 ? 'Free' : priceFormat.format(value)
}
