export const HEX = '0123456789abcdef'

export function randHex(n: number): string {
  let out = ''
  for (let i = 0; i < n; i++) out += HEX[Math.floor(Math.random() * 16)]
  return out
}
