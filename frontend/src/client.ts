import { Code, ConnectError, createClient, type Interceptor } from '@connectrpc/connect'
import { BackupService } from './gen/wargapos/backup/v1/backup_pb'
import { createConnectTransport } from '@connectrpc/connect-web'
import { AuthService }        from './gen/wargapos/auth/v1/auth_pb'
import { UserService }        from './gen/wargapos/user/v1/user_pb'
import { ProductService }     from './gen/wargapos/product/v1/product_pb'
import { TransactionService } from './gen/wargapos/transaction/v1/transaction_pb'
import { TableService }       from './gen/wargapos/table/v1/table_pb'
import { SettingsService }    from './gen/wargapos/settings/v1/settings_pb'
import { StockService }      from './gen/wargapos/stock/v1/service_pb'
import { DeviceService }        from './gen/wargapos/device/v1/device_pb'
import { NotificationService } from './gen/wargapos/notification/v1/notification_pb'
import { IngredientService } from './gen/wargapos/ingredient/v1/service_pb'
import { useAuthStore } from './store/auth'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

// Raw transport (no interceptors) — used for authClient to avoid circular refresh calls.
const rawTransport = createConnectTransport({ baseUrl })
export const authClient = createClient(AuthService, rawTransport)

// Attach JWT to every request.
const authInterceptor: Interceptor = (next) => (req) => {
  const { token } = useAuthStore.getState()
  if (token) req.header.set('Authorization', `Bearer ${token}`)
  return next(req)
}

// Proactively refresh the access token when it is within 5 minutes of expiry.
const refreshInterceptor: Interceptor = (next) => async (req) => {
  const { token, refreshToken, expiresAt, setTokens, logout } = useAuthStore.getState()
  if (token && refreshToken && expiresAt) {
    const secsUntilExpiry = expiresAt - Math.floor(Date.now() / 1000)
    if (secsUntilExpiry < 5 * 60) {
      try {
        const res = await authClient.refreshToken({ refreshToken })
        setTokens(res.accessToken, res.refreshToken, Number(res.expiresAt))
      } catch {
        logout()
        window.location.href = '/login'
        return next(req)
      }
    }
  }
  return next(req)
}

// Redirect to /login on any Unauthenticated response.
const unauthInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req)
  } catch (err) {
    if (err instanceof ConnectError && err.code === Code.Unauthenticated) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    throw err
  }
}

// In dev, Vite proxies /wargapos/* → http://localhost:8080
// In production, set VITE_API_BASE_URL to your API endpoint
const transport = createConnectTransport({
  baseUrl,
  interceptors: [refreshInterceptor, unauthInterceptor, authInterceptor],
})

export const userClient        = createClient(UserService, transport)
export const productClient     = createClient(ProductService, transport)
export const transactionClient = createClient(TransactionService, transport)
export const tableClient       = createClient(TableService, transport)
export const settingsClient    = createClient(SettingsService, transport)
export const stockClient       = createClient(StockService, transport)
export const deviceClient        = createClient(DeviceService, transport)
export const notificationClient = createClient(NotificationService, transport)
export const backupClient        = createClient(BackupService, transport)
export const ingredientClient   = createClient(IngredientService, transport)

export async function uploadFile(file: File, token: string): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error('Upload failed')
  const { url } = await res.json()
  return url as string
}
