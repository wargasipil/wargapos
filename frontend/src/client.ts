import { createClient, type Interceptor } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { AuthService }        from './gen/wargapos/auth/v1/auth_pb'
import { UserService }        from './gen/wargapos/user/v1/user_pb'
import { ProductService }     from './gen/wargapos/product/v1/product_pb'
import { TransactionService } from './gen/wargapos/transaction/v1/transaction_pb'
import { TableService }       from './gen/wargapos/table/v1/table_pb'
import { SettingsService }    from './gen/wargapos/settings/v1/settings_pb'
import { StockService }      from './gen/wargapos/stock/v1/stock_pb'
import { useAuthStore } from './store/auth'

// Automatically attach the JWT from the auth store to every request.
// Public routes on the backend ignore a missing token; this just ensures
// authenticated routes get the header without each call site needing to add it.
const authInterceptor: Interceptor = (next) => (req) => {
  const { token } = useAuthStore.getState()
  if (token) req.header.set('Authorization', `Bearer ${token}`)
  return next(req)
}

// In dev, Vite proxies /wargapos/* → http://localhost:8080
// In production, set VITE_API_BASE_URL to your API endpoint
const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  interceptors: [authInterceptor],
})

export const authClient        = createClient(AuthService, transport)
export const userClient        = createClient(UserService, transport)
export const productClient     = createClient(ProductService, transport)
export const transactionClient = createClient(TransactionService, transport)
export const tableClient       = createClient(TableService, transport)
export const settingsClient    = createClient(SettingsService, transport)
export const stockClient       = createClient(StockService, transport)

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
