// Kegagalan jaringan/server sementara, BUKAN berarti user logout
export function isTransientAuthError(error: { name?: string; status?: number } | null | undefined) {
  if (!error) return false
  return error.name === 'AuthRetryableFetchError' || (typeof error.status === 'number' && error.status >= 500)
}