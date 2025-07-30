export type CardanoAddress = string

export type Lovelace = number

export interface SetupRequest {
}

export interface SetupResponse {
  message: string
  state: string
  apiKey: string
  apiKeyExpiration: string
  escrowL1Address: CardanoAddress
  balance: {
    ada: number
    lovelace: number
  }
  timestamp: string
}

export interface EscrowStartRequest {
  apiKey: string
}

export interface EscrowStartResponse {
  message: string
  state: string
  escrowId?: string
  timestamp?: string
}

export interface StatusRequest {
  apiKey: string
}

export interface EscrowStatusResponse {
  message: string
  state: string
  apiKeyExpiration: string
  escrowL1Address: CardanoAddress
  balance: {
    ada: number
    lovelace: Lovelace
  }
  timestamp: string
  escrowId?: string
  participants?: {
    buyer: CardanoAddress
    seller: CardanoAddress
  }
  amount?: Lovelace
  createdAt?: string
  updatedAt?: string
}

export interface BalanceResponse {
  balance: {
    ada: number
    lovelace: Lovelace
  }
  address: CardanoAddress
}

export interface PaymentRequest {
  apiKey: string
  amount: Lovelace
}

export interface PaymentResponse {
  message: string
  state: string
  balance: {
    ada: number
    lovelace: Lovelace
  }
}

export interface PaymentStatusResponse {
  paymentId: string
  state: string
  amount: Lovelace
  from?: CardanoAddress
  to?: CardanoAddress
}

export interface CloseRequest {
  apiKey: string
}

export interface CloseResponse {
  message: string
  state: string
  timestamp: string
}

export interface WithdrawalRequest {
  apiKey: string
  amount: Lovelace
  to: CardanoAddress
}

export interface WithdrawalResponse {
  message: string
  balance: {
    ada: number
    lovelace: Lovelace
  }
}

export interface RefundRequest {
  apiKey: string
  amount: Lovelace
  to: CardanoAddress
}

export interface RefundResponse {
  message: string
  balance: {
    ada: number
    lovelace: Lovelace
  }
}

export interface AbortRequest {
  apiKey: string
}

export interface AbortResponse {
  message: string
  state: string
  timestamp: string
}


export interface ErrorResponse {
  error: string
  code?: string
  details?: string
}

export interface HydraConfig {
  aliceHydraNodeUrl: string
  bobHydraNodeUrl: string
  pathPrefix: string
  targetNetwork: string
  sendLovelace: number
  tempFiles: {
    commitFile: string
    signedFile: string
    utxoFile: string
    txFile: string
  }
}

export interface UtxoData {
  [key: string]: {
    address: string
    value: {
      lovelace: number
    }
  }
}

export interface HydraMessage {
  tag: string
  transaction?: any
  utxo?: UtxoData
  [key: string]: any
}

export type HydraUser = 'alice' | 'bob'