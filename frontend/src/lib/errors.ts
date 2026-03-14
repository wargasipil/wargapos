/** Strip the Connect RPC "[code] " prefix from error messages. */
export function stripError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.replace(/^\[.*?\]\s*/, '')
}
