// Kegagalan jaringan/server sementara, BUKAN berarti user logout
export function isTransientAuthError(
  error: { name?: string; status?: number; message?: string } | null | undefined
) {
  if (!error) return false
  if (error.name === 'AuthRetryableFetchError' || error.name === 'AuthUnknownError') return true
  if (error.status === 0 || (typeof error.status === 'number' && error.status >= 500)) return true
  return /fetch failed|network|timeout|timed out/i.test(error.message ?? '')
}