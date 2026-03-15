declare module '@point-of-sale/receipt-printer-encoder' {
  interface ColumnDefinition {
    width: number
    align?: 'left' | 'center' | 'right'
  }

  interface EncoderOptions {
    columns?: number
    language?: string
  }

  class ReceiptPrinterEncoder {
    constructor(options?: EncoderOptions)
    initialize(): this
    align(value: 'left' | 'center' | 'right'): this
    bold(value: boolean): this
    line(value: string): this
    text(value: string): this
    newline(value?: number): this
    rule(options?: { style?: string }): this
    table(columns: ColumnDefinition[], data: string[][]): this
    cut(value?: 'full' | 'partial'): this
    encode(): Uint8Array
  }

  export default ReceiptPrinterEncoder
}
