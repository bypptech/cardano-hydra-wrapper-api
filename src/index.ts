import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import 'dotenv/config'
import {
  SetupResponse,
  EscrowStartRequest,
  EscrowStartResponse,
  StatusRequest,
  EscrowStatusResponse,
  BalanceResponse,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  CloseRequest,
  CloseResponse,
  WithdrawalRequest,
  WithdrawalResponse,
  RefundRequest,
  RefundResponse,
  AbortRequest,
  AbortResponse,
  ErrorResponse
} from './types.js'
import HydraClient from './hydra.js'

const app = new Hono()
const hydraClient = new HydraClient()

interface ApiKeyData {
  apiKey: string
  expiration: Date
  senderAddress: string
  escrowL1Address: string
  createdAt: Date
}

const apiKeyStore = new Map<string, ApiKeyData>()

let currentHydraState: string = 'Idle'
let isClosingInitiated: boolean = false
async function updateHydraState(): Promise<string> {
  try {
    console.log('🔍 Fetching Hydra head status...')
    const headStatus = await hydraClient.getHeadStatus('alice')
    console.log(`🔍 Raw head status response:`, JSON.stringify(headStatus, null, 2))
    
    const actualHydraState = headStatus.tag || 'Idle'
    
    if (isClosingInitiated) {
      if (actualHydraState === 'HeadIsClosed') {
        currentHydraState = 'HeadIsClosed'
        console.log(`🔄 Close process progressed, state updated to: ${currentHydraState}`)
      } else if (actualHydraState === 'HeadIsFinalized') {
        isClosingInitiated = false
        currentHydraState = actualHydraState
        console.log(`🔄 Close process completed, state updated to: ${currentHydraState}`)
      } else if (actualHydraState === 'Open') {
        currentHydraState = 'Closing'
        console.log(`🔄 Close initiated but head still open, maintaining Closing state`)
      } else {
        currentHydraState = actualHydraState
        console.log(`🔄 Close process in progress, state updated to: ${currentHydraState}`)
      }
    } else {
      currentHydraState = actualHydraState
      console.log(`🔄 Hydra state updated: ${currentHydraState}`)
    }
    
    return currentHydraState
  } catch (error) {
    console.error('❌ Failed to update Hydra state:', error)
    return currentHydraState
  }
}

function validateApiKey(apiKey: string): ApiKeyData | null {
  const keyData = apiKeyStore.get(apiKey)
  if (!keyData) {
    return null
  }
  
  if (keyData.expiration < new Date()) {
    apiKeyStore.delete(apiKey)
    return null
  }
  
  return keyData
}

app.use('*', cors())
app.use('*', logger())

app.get('/', async (c: Context) => {
  return c.json({
    message: 'Cardano Hydra Escrow API Server',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.post('/setup', async (c: Context) => {
  try {
    console.log('🔧 Setting up ESCROW environment...')
    
    const apiKey = `escrw_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const apiKeyExpiration = new Date()
    apiKeyExpiration.setHours(apiKeyExpiration.getHours() + 24)
    
    console.log('📋 Getting Alice L1 Escrow wallet address...')
    const escrowL1Address = await hydraClient.getAliceL1Address()
    
    console.log('💰 Fetching Alice L1 balance...')
    const aliceL1Balance = await hydraClient.getAliceL1Balance()
    
    const apiKeyData: ApiKeyData = {
      apiKey,
      expiration: apiKeyExpiration,
      senderAddress: '',
      escrowL1Address,
      createdAt: new Date()
    }
    apiKeyStore.set(apiKey, apiKeyData)
    
    const hydraState = await updateHydraState()
    
    const response: SetupResponse = {
      message: 'ESCROW setup started',
      state: hydraState,
      apiKey,
      apiKeyExpiration: apiKeyExpiration.toISOString(),
      escrowL1Address,
      balance: aliceL1Balance,
      timestamp: new Date().toISOString()
    }
    
    console.log(`✅ ESCROW setup completed: Alice L1 address=${escrowL1Address}, API Key stored`)
    return c.json(response, 201)
  } catch (error) {
    console.error('❌ Setup endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Failed to setup ESCROW',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    return c.json(errorResponse, 500)
  }
})


app.post('/start', async (c: Context) => {
  try {
    const body = await c.req.json() as EscrowStartRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`🚀 Starting ESCROW transaction for sender: ${keyData.senderAddress}`)
    
    const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    try {
      console.log('🔧 Starting Hydra initialization process...')
      
      const currentHydraState = await updateHydraState()
      console.log(`🔍 Current Hydra state: ${currentHydraState}`)
      
      if (currentHydraState === 'HeadIsInitializing') {
        console.log('⚠️  Hydra Head is already initializing, skipping Init command')
        
        const response: EscrowStartResponse = {
          message: 'ESCROW transaction started - Hydra initialization in progress (continuing existing process)',
          state: currentHydraState,
          escrowId,
          timestamp: new Date().toISOString()
        }
        
        console.log(`✅ ESCROW start acknowledged (existing initialization): ${escrowId}`)
        return c.json(response, 201)
      }
      
      if (currentHydraState === 'HeadIsOpen' || currentHydraState === 'Open') {
        console.log('✅ Hydra Head is already open, transaction ready')
        
        const response: EscrowStartResponse = {
          message: 'ESCROW transaction started - Hydra head already open',
          state: currentHydraState,
          escrowId,
          timestamp: new Date().toISOString()
        }
        
        console.log(`✅ ESCROW start acknowledged (head already open): ${escrowId}`)
        return c.json(response, 201)
      }
      
      console.log('🔌 Establishing WebSocket connections...')
      await Promise.all([
        hydraClient.connectToHydraNode('alice'),
        hydraClient.connectToHydraNode('bob')
      ])
      
      console.log('📤 Sending Init commands...')
      await hydraClient.sendInitCommands()
      
      const hydraState = await updateHydraState()
      
      const response: EscrowStartResponse = {
        message: 'ESCROW transaction started - Hydra initialization started',
        state: hydraState,
        escrowId,
        timestamp: new Date().toISOString()
      }
      
      console.log(`✅ ESCROW initialization started: ${escrowId}`)
      
      hydraClient.continueHydraStartProcess(escrowId).catch((error: Error) => {
        console.error(`❌ Background Hydra process failed for ${escrowId}:`, error)
      })
      
      return c.json(response, 201)
      
    } catch (initError) {
      console.error('❌ Hydra initialization failed:', initError)
      
      const hydraState = await updateHydraState()
      
      const response: EscrowStartResponse = {
        message: 'ESCROW transaction start failed - Hydra initialization failed',
        state: hydraState,
        timestamp: new Date().toISOString()
      }
      
      return c.json(response, 500)
    }
    
  } catch (error) {
    console.error('❌ Start endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while starting ESCROW',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while starting ESCROW transaction'
    }
    return c.json(errorResponse, 500)
  }
})

app.post('/status', async (c: Context) => {
  try {
    const body = await c.req.json() as StatusRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`🔑 Valid API Key for sender: ${keyData.senderAddress}`)
    
    const apiKeyExpiration = keyData.expiration
    const escrowL1Address = keyData.escrowL1Address
    
    const hydraState = await updateHydraState()
    
    console.log('📊 Fetching Alice L2 balance...')
    let aliceBalance: { ada: number; lovelace: number }
    
    if (hydraState === 'Open') {
      console.log('✅ Hydra head is open, fetching L2 balance...')
      aliceBalance = await hydraClient.getAliceL2Balance()
    } else {
      console.log(`⚠️ Hydra head is not open (state: ${hydraState}), returning zero balance`)
      aliceBalance = { ada: 0, lovelace: 0 }
    }
    
    const response: EscrowStatusResponse = {
      message: 'ESCROW status retrieved successfully',
      state: hydraState,
      apiKeyExpiration: apiKeyExpiration.toISOString(),
      escrowL1Address,
      balance: aliceBalance,
      timestamp: new Date().toISOString()
    }
    
    console.log(`✅ Status response: L2 balance=${aliceBalance.ada} ADA (Open: ${hydraState === 'Open'}), state=${hydraState}, sender=${keyData.senderAddress}`)
    return c.json(response, 200)
  } catch (error) {
    console.error('❌ Status endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while getting status',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while fetching ESCROW status'
    }
    return c.json(errorResponse, 500)
  }
})

app.post('/balance', async (c: Context) => {
  try {
    const body = await c.req.json() as StatusRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`🔑 Valid API Key for sender: ${keyData.senderAddress}`)
    
    const apiKeyExpiration = keyData.expiration
    
    console.log('📊 Fetching Bob L1 balance...')
    const bobBalance = await hydraClient.getBobL1Balance()
    
    const bobL1Address = await hydraClient.getBobL1Address()
    
    const hydraState = await updateHydraState()
    
    const response: EscrowStatusResponse = {
      message: 'Bob L1 ESCROW balance retrieved successfully',
      state: hydraState,
      apiKeyExpiration: apiKeyExpiration.toISOString(),
      escrowL1Address: bobL1Address,
      balance: bobBalance,
      timestamp: new Date().toISOString()
    }
    
    console.log(`✅ Balance response: balance=${bobBalance.ada} ADA, sender=${keyData.senderAddress}`)
    return c.json(response, 200)
  } catch (error) {
    console.error('❌ Balance endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while getting balance',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while fetching Bob L1 ESCROW balance'
    }
    return c.json(errorResponse, 500)
  }
})

app.post('/balancel2', async (c: Context) => {
  try {
    const body = await c.req.json() as StatusRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`🔑 Valid API Key for sender: ${keyData.senderAddress}`)
    
    const apiKeyExpiration = keyData.expiration
    
    const hydraState = await updateHydraState()
    
    console.log('📊 Fetching Bob L2 balance...')
    let bobBalance: { ada: number; lovelace: number }
    
    if (hydraState === 'Open') {
      console.log('✅ Hydra head is open, fetching Bob L2 balance...')
      bobBalance = await hydraClient.getBobL2Balance()
    } else {
      console.log(`⚠️ Hydra head is not open (state: ${hydraState}), returning zero balance`)
      bobBalance = { ada: 0, lovelace: 0 }
    }
    
    const bobL2Address = await hydraClient.getBobL1Address()
    
    const response: EscrowStatusResponse = {
      message: 'Bob L2 ESCROW balance retrieved successfully',
      state: hydraState,
      apiKeyExpiration: apiKeyExpiration.toISOString(),
      escrowL1Address: bobL2Address,
      balance: bobBalance,
      timestamp: new Date().toISOString()
    }
    
    console.log(`✅ Bob L2 balance response: balance=${bobBalance.ada} ADA (Open: ${hydraState === 'Open'}), state=${hydraState}, sender=${keyData.senderAddress}`)
    return c.json(response, 200)
  } catch (error) {
    console.error('❌ Bob L2 Balance endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while getting Bob L2 balance',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while fetching Bob L2 ESCROW balance'
    }
    return c.json(errorResponse, 500)
  }
})

app.post('/payment', async (c: Context) => {
  try {
    const body = await c.req.json() as PaymentRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`💰 Starting L2 payment: ${body.amount} lovelace for sender: ${keyData.senderAddress}`)
    
    const hydraState = await updateHydraState()
    if (hydraState !== 'Open') {
      const errorResponse: ErrorResponse = {
        error: 'Payment not allowed in current Hydra state',
        code: 'HEAD_NOT_OPEN',
        details: `Cannot perform L2 payment when Hydra Head state is: ${hydraState}. Please wait for Open state.`
      }
      return c.json(errorResponse, 409)
    }
    
    console.log('🔍 Checking Hydra WebSocket connections...')
    if (!hydraClient.areAllWebSocketsConnected()) {
      console.log('⚠️ Some WebSocket connections are not active, will attempt to reconnect during payment process')
    } else {
      console.log('✅ All WebSocket connections are active')
    }
    
    try {
      const updatedBalance = await hydraClient.executeL2Payment(body.amount)
      
      const response: PaymentResponse = {
        message: 'L2 payment completed',
        state: 'confirmed',
        balance: updatedBalance
      }
      
      console.log(`✅ L2 payment completed: ${body.amount} lovelace`)
      return c.json(response, 201)
      
    } catch (paymentError) {
      console.error('❌ L2 payment failed:', paymentError)
      
      const currentBalance = await hydraClient.getAliceL2Balance()
      
      const response: PaymentResponse = {
        message: 'L2 payment failed',
        state: 'failed',
        balance: currentBalance
      }
      
      return c.json(response, 500)
    }
    
  } catch (error) {
    console.error('❌ Payment endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while processing payment',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while processing L2 payment'
    }
    return c.json(errorResponse, 500)
  }
})


app.post('/close', async (c: Context) => {
  try {
    const body = await c.req.json() as CloseRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`🔒 Starting ESCROW close process for sender: ${keyData.senderAddress}`)
    
    const hydraState = await updateHydraState()
    if (hydraState !== 'Open') {
      const errorResponse: ErrorResponse = {
        error: 'Close not allowed in current Hydra state',
        code: 'HEAD_NOT_OPEN',
        details: `Cannot close ESCROW when Hydra Head state is: ${hydraState}. Close is only allowed when Open.`
      }
      return c.json(errorResponse, 409)
    }
    
    try {
      console.log('🔍 Ensuring WebSocket connections for close...')
      await hydraClient.ensureWebSocketConnection('alice')
      
      console.log('📤 Sending Close command...')
      await hydraClient.sendCloseCommand('alice')
      
      isClosingInitiated = true
      currentHydraState = 'Closing'
      console.log('🔒 Close process initiated, state set to Closing')
      
      const response: CloseResponse = {
        message: 'ESCROW transaction close process started',
        state: 'Closing',
        timestamp: new Date().toISOString()
      }
      
      console.log(`✅ ESCROW close initiated`)
      
      hydraClient.continueCloseProcess()
        .then(() => {
          console.log('✅ Background close process completed successfully')
          isClosingInitiated = false
        })
        .catch((error: Error) => {
          console.error(`❌ Background close process failed:`, error)
          isClosingInitiated = false
        })
      
      return c.json(response, 200)
      
    } catch (closeError) {
      console.error('❌ Close initialization failed:', closeError)
      
      isClosingInitiated = false
      
      const response: CloseResponse = {
        message: 'ESCROW transaction close process failed',
        state: 'failed',
        timestamp: new Date().toISOString()
      }
      
      return c.json(response, 500)
    }
    
  } catch (error) {
    console.error('❌ Close endpoint error:', error)
    
    isClosingInitiated = false
    
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while closing ESCROW',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while closing ESCROW transaction'
    }
    return c.json(errorResponse, 500)
  }
})

app.post('/withdrawal', async (c: Context) => {
  try {
    const body = await c.req.json() as WithdrawalRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`💰 Starting withdrawal: ${body.amount} lovelace to ${body.to} for sender: ${keyData.senderAddress}`)
    
    try {
      console.log('🔍 Checking Hydra head status...')
      const headStatus = await hydraClient.getHeadStatus('alice')
      
      if (headStatus.tag === 'HeadIsOpen' || headStatus.tag === 'Open') {
        const errorResponse: ErrorResponse = {
          error: 'Withdrawal not allowed during active Hydra session',
          code: 'HEAD_IS_OPEN',
          details: 'Cannot perform L1 withdrawal while Hydra Head is open. Please close the Hydra Head first using /close endpoint.'
        }
        return c.json(errorResponse, 409)
      }
      
      console.log(`✅ Hydra head status: ${headStatus.tag} - withdrawal allowed`)
    } catch (statusError) {
      console.warn('⚠️ Could not check Hydra head status, proceeding with withdrawal:', statusError)
    }
    
    try {
      const updatedBalance = await hydraClient.sendBobL1Payment(body.to, body.amount)
      
      const response: WithdrawalResponse = {
        message: 'L1 withdrawal completed',
        balance: updatedBalance
      }
      
      console.log(`✅ Withdrawal completed: ${body.amount} lovelace sent to ${body.to}`)
      return c.json(response, 200)
      
    } catch (withdrawalError) {
      console.error('❌ Withdrawal failed:', withdrawalError)
      
      const currentBalance = await hydraClient.getBobL1Balance()
      
      const response: WithdrawalResponse = {
        message: 'L1 withdrawal failed',
        balance: currentBalance
      }
      
      return c.json(response, 500)
    }
    
  } catch (error) {
    console.error('❌ Withdrawal endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while processing withdrawal',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while processing L1 withdrawal'
    }
    return c.json(errorResponse, 500)
  }
})

app.post('/refund', async (c: Context) => {
  try {
    const body = await c.req.json() as RefundRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`💰 Starting refund: ${body.amount} lovelace to ${body.to} for sender: ${keyData.senderAddress}`)
    
    try {
      console.log('🔍 Checking Hydra head status...')
      const headStatus = await hydraClient.getHeadStatus('alice')
      
      if (headStatus.tag === 'HeadIsOpen' || headStatus.tag === 'Open') {
        const errorResponse: ErrorResponse = {
          error: 'Refund not allowed during active Hydra session',
          code: 'HEAD_IS_OPEN',
          details: 'Cannot perform L1 refund while Hydra Head is open. Please close the Hydra Head first using /close endpoint.'
        }
        return c.json(errorResponse, 409)
      }
      
      console.log(`✅ Hydra head status: ${headStatus.tag} - refund allowed`)
    } catch (statusError) {
      console.warn('⚠️ Could not check Hydra head status, proceeding with refund:', statusError)
    }
    
    try {
      const updatedBalance = await hydraClient.sendL1Payment(body.to, body.amount)
      
      const response: RefundResponse = {
        message: 'L1 refund completed',
        balance: updatedBalance
      }
      
      console.log(`✅ Refund completed: ${body.amount} lovelace sent to ${body.to}`)
      return c.json(response, 200)
      
    } catch (refundError) {
      console.error('❌ Refund failed:', refundError)
      
      const currentBalance = await hydraClient.getAliceL1Balance()
      
      const response: RefundResponse = {
        message: 'L1 refund failed',
        balance: currentBalance
      }
      
      return c.json(response, 500)
    }
    
  } catch (error) {
    console.error('❌ Refund endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while processing refund',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while processing L1 refund'
    }
    return c.json(errorResponse, 500)
  }
})

app.post('/abort', async (c: Context) => {
  try {
    const body = await c.req.json() as AbortRequest
    
    if (!body.apiKey) {
      const errorResponse: ErrorResponse = {
        error: 'API Key is required',
        code: 'MISSING_API_KEY',
        details: 'API Key must be included in the request body'
      }
      return c.json(errorResponse, 400)
    }
    
    const keyData = validateApiKey(body.apiKey)
    if (!keyData) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid or expired API Key',
        code: 'INVALID_API_KEY',
        details: 'The provided API Key is either invalid, expired, or not found. Please obtain a new API Key from /setup endpoint.'
      }
      return c.json(errorResponse, 401)
    }
    
    console.log(`🛑 Starting ESCROW abort process for sender: ${keyData.senderAddress}`)
    
    try {
      console.log('🔍 Ensuring WebSocket connections for abort...')
      await hydraClient.ensureWebSocketConnection('alice')
      
      console.log('📤 Sending Abort command...')
      await hydraClient.sendAbortCommand('alice')
      
      const response: AbortResponse = {
        message: 'ESCROW transaction abort process completed',
        state: 'aborted',
        timestamp: new Date().toISOString()
      }
      
      console.log(`✅ ESCROW abort completed`)
      return c.json(response, 200)
      
    } catch (abortError) {
      console.error('❌ Abort process failed:', abortError)
      
      const response: AbortResponse = {
        message: 'ESCROW transaction abort process failed',
        state: 'failed',
        timestamp: new Date().toISOString()
      }
      
      return c.json(response, 500)
    }
    
  } catch (error) {
    console.error('❌ Abort endpoint error:', error)
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while aborting ESCROW',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error occurred while aborting ESCROW transaction'
    }
    return c.json(errorResponse, 500)
  }
})


const port = Number(process.env.PORT)

console.log(`🚀 Cardano Hydra Escrow API Server starting on port http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})

export default app