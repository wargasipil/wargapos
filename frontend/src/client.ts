import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { AuthService }        from './gen/wargapos/auth/v1/auth_pb'
import { UserService }        from './gen/wargapos/user/v1/user_pb'
import { ProductService }     from './gen/wargapos/product/v1/product_pb'
import { TransactionService } from './gen/wargapos/transaction/v1/transaction_pb'

// In dev, Vite proxies /wargapos/* → http://localhost:8080
// In production, set VITE_API_BASE_URL to your API endpoint
const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
})

export const authClient        = createClient(AuthService, transport)
export const userClient        = createClient(UserService, transport)
export const productClient     = createClient(ProductService, transport)
export const transactionClient = createClient(TransactionService, transport)
