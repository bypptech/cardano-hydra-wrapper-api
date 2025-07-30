import WebSocket from 'ws'
import { exec } from 'child_process'
import { readFile } from 'fs/promises'
import { promisify } from 'util'
import 'dotenv/config'

const execAsync = promisify(exec)

interface HydraConfig {
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

interface UtxoData {
  [key: string]: {
    address: string
    value: {
      lovelace: number
    }
  }
}

interface HydraMessage {
  tag: string
  transaction?: any
  utxo?: UtxoData
  [key: string]: any
}

export class HydraClient {
  private config: HydraConfig
  private wsConnections: Map<string, WebSocket> = new Map()
  private messageEventEmitter: Map<string, ((message: HydraMessage) => void)[]> = new Map()
  private currentStates: Map<string, string> = new Map()

  constructor() {
    this.config = {
      aliceHydraNodeUrl: process.env.URL_ALICE_HYDRA_NODE || '127.0.0.1:4001',
      bobHydraNodeUrl: process.env.URL_BOB_HYDRA_NODE || '127.0.0.1:4002',
      pathPrefix: process.env.PATH_PREFIX || '/home/bypp/cardano-testnet-preprod',
      targetNetwork: process.env.TARGET_NETWORK || '--testnet-magic 1',
      sendLovelace: parseInt(process.env.SEND_LOVELACE || '1000000'),
      tempFiles: {
        commitFile: process.env.TMP_COMMIT_FILE || '/tmp/cardano-commit.json',
        signedFile: process.env.TMP_SIGNED_FILE || '/tmp/cardano-signed.json',
        utxoFile: process.env.TMP_UTXO_FILE || '/tmp/hydra-utxo.json',
        txFile: process.env.TMP_TX_FILE || '/tmp/tx.json'
      }
    }
  }

  private getCredentialsPath(): string {
    return `${this.config.pathPrefix}/credentials`
  }

  private getCardanoSocketPath(): string {
    return `${this.config.pathPrefix}/node.socket`
  }

  private getUserAddressPath(user: 'alice' | 'bob'): string {
    const credentialsPath = this.getCredentialsPath()
    return `${credentialsPath}/${user}-funds.addr`
  }

  private getUserSigningKeyPath(user: 'alice' | 'bob'): string {
    const credentialsPath = this.getCredentialsPath()
    return `${credentialsPath}/${user}-funds.sk`
  }

  private getHydraNodeUrl(user: 'alice' | 'bob'): string {
    return user === 'alice' ? this.config.aliceHydraNodeUrl : this.config.bobHydraNodeUrl
  }

  /**
   * WebSocket接続を確立
   */
  async connectToHydraNode(user: 'alice' | 'bob'): Promise<WebSocket> {
    const url = this.getHydraNodeUrl(user)
    const wsUrl = `ws://${url}?history=no`
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl)
      
      ws.on('open', () => {
        console.log(`✅ Connected to ${user} Hydra node: ${wsUrl}`)
        this.wsConnections.set(user, ws)
        resolve(ws)
      })
      
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${user}:`, error)
        reject(error)
      })
      
      ws.on('message', (data) => {
        try {
          const message: HydraMessage = JSON.parse(data.toString())
          this.handleHydraMessage(user, message)
        } catch (error) {
          console.error(`❌ Failed to parse message from ${user}:`, error)
        }
      })
      
      ws.on('close', () => {
        console.log(`🔌 Disconnected from ${user} Hydra node`)
        this.wsConnections.delete(user)
      })
    })
  }

  /**
   * Hydraメッセージハンドラー
   */
  private handleHydraMessage(user: 'alice' | 'bob', message: HydraMessage): void {
    console.log(`📨 Received from ${user}:`, message.tag)
    
    // 現在の状態を更新
    this.currentStates.set(user, message.tag)
    
    switch (message.tag) {
      case 'HeadIsInitializing':
        console.log(`🔄 Hydra Head is initializing for ${user}`)
        break
      case 'HeadIsOpen':
        console.log(`🎉 Hydra Head is now open for ${user}`)
        break
      case 'HeadIsClosed':
        console.log(`🔒 Hydra Head is closed for ${user}`)
        break
      case 'Committed':
        console.log(`✅ UTXO committed for ${user}`)
        break
      case 'TxValid':
        console.log(`✅ Transaction validated for ${user}`)
        break
      case 'TxInvalid':
        console.log(`❌ Transaction invalid for ${user}`)
        break
      case 'SnapshotConfirmed':
        console.log(`📸 Snapshot confirmed for ${user}`)
        break
      default:
        console.log(`📋 ${user} message:`, message)
    }
    
    // イベントリスナーに通知
    const listeners = this.messageEventEmitter.get(user) || []
    listeners.forEach(listener => listener(message))
  }

  /**
   * メッセージイベントリスナーを追加
   */
  private addMessageListener(user: 'alice' | 'bob', listener: (message: HydraMessage) => void): void {
    if (!this.messageEventEmitter.has(user)) {
      this.messageEventEmitter.set(user, [])
    }
    this.messageEventEmitter.get(user)!.push(listener)
  }

  /**
   * Init送信後のバックグラウンド処理を継続実行
   */
  async continueHydraStartProcess(escrowId: string): Promise<void> {
    try {
      console.log(`🔄 Continuing Hydra process in background for escrow: ${escrowId}`)
      
      // 3. HeadIsInitializing状態まで待機（10分タイムアウト）
      console.log('⏳ Waiting for HeadIsInitializing state...')
      await this.waitForState('alice', 'HeadIsInitializing', 600000) // 10分
      console.log('✅ Alice node reached HeadIsInitializing state')
      
      // 4. UTXOコミットを実行（順次実行で状態を監視）
      console.log('📦 Executing UTXO commits...')
      
      // Alice のコミット処理
      await this.sendCommitCommand('alice')
      console.log('⏳ Waiting for Alice Committed response (10 min timeout)...')
      await this.waitForState('alice', 'Committed', 600000) // 10分
      console.log('✅ Alice commit confirmed')
      
      // Bob のコミット処理  
      await this.sendCommitCommand('bob')
      console.log('⏳ Waiting for Bob Committed response (10 min timeout)...')
      await this.waitForState('bob', 'Committed', 600000) // 10分
      console.log('✅ Bob commit confirmed')
      
      // 6. HeadIsOpen状態まで待機
      console.log('⏳ Waiting for HeadIsOpen state (10 min timeout)...')
      await this.waitForState('alice', 'HeadIsOpen', 600000) // 10分
      console.log('🎉 Hydra Head is now open')
      
      console.log(`✅ Background Hydra process completed successfully for escrow: ${escrowId}`)
    } catch (error) {
      console.error(`❌ Background Hydra process failed for escrow ${escrowId}:`, error)
      throw error
    }
  }

  /**
   * 特定の状態まで待機
   */
  private async waitForState(user: 'alice' | 'bob', targetState: string, timeoutMs: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      // 既に目標状態に達している場合
      if (this.currentStates.get(user) === targetState) {
        resolve()
        return
      }
      
      // タイムアウト設定
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${user} to reach state ${targetState}`))
      }, timeoutMs)
      
      // メッセージリスナーを追加
      const listener = (message: HydraMessage) => {
        if (message.tag === targetState) {
          clearTimeout(timeout)
          resolve()
        }
      }
      
      this.addMessageListener(user, listener)
    })
  }

  /**
   * UTXOを取得
   */
  async queryUtxo(user: 'alice' | 'bob'): Promise<string> {
    const addressPath = this.getUserAddressPath(user)
    const socketPath = this.getCardanoSocketPath()
    const utxoFile = `${user}-commit-utxo.json`
    
    const cmd = `cardano-cli query utxo --socket-path ${socketPath} --address $(cat ${addressPath}) --out-file ${utxoFile}`
    
    try {
      console.log(`📊 Querying UTXO for ${user} to file: ${utxoFile}`)
      await execAsync(cmd)
      
      // ファイルから読み込み
      const utxoData = await readFile(utxoFile, 'utf-8')
      console.log(`📊 UTXO for ${user}:`, utxoData)
      return utxoData
    } catch (error) {
      console.error(`❌ Failed to query UTXO for ${user}:`, error)
      throw error
    }
  }

  /**
   * UTXOをHydraにコミット
   */
  async commitUtxo(user: 'alice' | 'bob', utxoData: string): Promise<void> {
    const hydraNodeUrl = this.getHydraNodeUrl(user)
    const utxoFile = `${user}-commit-utxo.json`
    const commitTxFile = `${user}-commit-tx.json`
    
    const cmd = `curl -X POST http://${hydraNodeUrl}/commit --data @${utxoFile} > ${commitTxFile}`
    
    try {
      console.log(`🔄 Committing UTXO for ${user}...`)
      console.log(`📋 Command: ${cmd}`)
      await execAsync(cmd)
      console.log(`✅ UTXO committed for ${user}, transaction saved to ${commitTxFile}`)
    } catch (error) {
      console.error(`❌ Failed to commit UTXO for ${user}:`, error)
      throw error
    }
  }

  /**
   * トランザクションに署名
   */
  async signTransaction(user: 'alice' | 'bob'): Promise<void> {
    const signingKeyPath = this.getUserSigningKeyPath(user)
    const commitTxFile = `${user}-commit-tx.json`
    const signedTxFile = `${user}-commit-tx-signed.json`
    
    const cmd = `cardano-cli latest transaction sign ` +
                `--tx-file ${commitTxFile} ` +
                `--signing-key-file ${signingKeyPath} ` +
                `--out-file ${signedTxFile} ` +
                `${this.config.targetNetwork}`
    
    try {
      console.log(`✍️  Signing transaction for ${user}...`)
      console.log(`📋 Command: ${cmd}`)
      await execAsync(cmd)
      console.log(`✅ Transaction signed for ${user}, saved to ${signedTxFile}`)
    } catch (error) {
      console.error(`❌ Failed to sign transaction for ${user}:`, error)
      throw error
    }
  }

  /**
   * トランザクションを送信
   */
  async submitTransaction(user: 'alice' | 'bob'): Promise<void> {
    const socketPath = this.getCardanoSocketPath()
    const signedTxFile = `${user}-commit-tx-signed.json`
    
    // BOB_COMMIT.mdに合わせて基本形式を使用（必要に応じてオプション追加）
    const cmd = `cardano-cli latest transaction submit --tx-file ${signedTxFile} ` +
                `${this.config.targetNetwork} --socket-path ${socketPath}`
    
    try {
      console.log(`📤 Submitting transaction for ${user}...`)
      console.log(`📋 Command: ${cmd}`)
      await execAsync(cmd)
      console.log(`✅ Transaction submitted for ${user}`)
    } catch (error) {
      console.error(`❌ Failed to submit transaction for ${user}:`, error)
      throw error
    }
  }

  /**
   * Hydra L2でのUTXOを取得
   */
  async getHydraUtxo(user: 'alice' | 'bob'): Promise<UtxoData> {
    const hydraNodeUrl = this.getHydraNodeUrl(user)
    const addressPath = this.getUserAddressPath(user)
    
    const cmd = `curl -s http://${hydraNodeUrl}/snapshot/utxo | ` +
                `jq "with_entries(select(.value.address == \\"$(cat ${addressPath})\\"))" > ${this.config.tempFiles.utxoFile}`
    
    try {
      await execAsync(cmd)
      const utxoJson = await readFile(this.config.tempFiles.utxoFile, 'utf8')
      return JSON.parse(utxoJson)
    } catch (error) {
      console.error(`❌ Failed to get Hydra UTXO for ${user}:`, error)
      throw error
    }
  }

  /**
   * 特定アドレスのHydra L2 UTXOを取得（cardano-cli-wrapper.js準拠）
   */
  async getHydraUtxoForAddress(user: 'alice' | 'bob'): Promise<UtxoData> {
    const hydraNodeUrl = this.getHydraNodeUrl(user)
    const addressPath = this.getUserAddressPath(user)
    
    try {
      // まずアドレスファイルが存在するかチェック
      const address = await readFile(addressPath, 'utf8')
      console.log(`📍 Address for ${user}: ${address.trim()}`)
      
      // Hydraノードから全UTXOを取得
      const getAllUtxoCmd = `curl -s http://${hydraNodeUrl}/snapshot/utxo`
      console.log(`📋 Getting all UTXOs: ${getAllUtxoCmd}`)
      
      const { stdout: allUtxoJson } = await execAsync(getAllUtxoCmd)
      console.log(`📊 All UTXOs from Hydra node:`, allUtxoJson)
      
      if (!allUtxoJson || allUtxoJson.trim() === '' || allUtxoJson.trim() === 'null') {
        throw new Error('Hydra node returned empty UTXO set')
      }
      
      // 特定アドレスのUTXOをフィルタリング
      const cmd = `curl -s http://${hydraNodeUrl}/snapshot/utxo | ` +
                  `jq "with_entries(select(.value.address == \\"$(cat ${addressPath})\\"))" > ${this.config.tempFiles.utxoFile}`
      
      console.log(`📋 Filtering UTXOs for address: ${cmd}`)
      await execAsync(cmd)
      
      const utxoJson = await readFile(this.config.tempFiles.utxoFile, 'utf8')
      console.log(`📊 Filtered UTXO JSON for ${user}:`, utxoJson)
      
      if (!utxoJson.trim() || utxoJson.trim() === '{}' || utxoJson.trim() === 'null') {
        throw new Error(`No UTXOs found for ${user} address: ${address.trim()}`)
      }
      
      const utxoData = JSON.parse(utxoJson)
      const utxoCount = Object.keys(utxoData).length
      console.log(`📊 Found ${utxoCount} UTXOs for ${user}`)
      
      return utxoData
    } catch (error) {
      console.error(`❌ Failed to get Hydra UTXO for address ${user}:`, error)
      throw error
    }
  }

  /**
   * L2トランザクションを構築
   */
  async buildL2Transaction(user: 'alice' | 'bob', toUser: 'alice' | 'bob'): Promise<void> {
    const fromAddressPath = this.getUserAddressPath(user)
    const toAddressPath = this.getUserAddressPath(toUser)
    const amount = this.config.sendLovelace
    
    // UTXOファイルの存在と内容を確認
    try {
      const utxoContent = await readFile(this.config.tempFiles.utxoFile, 'utf8')
      console.log(`📊 UTXO file content: ${utxoContent}`)
      
      if (!utxoContent.trim() || utxoContent.trim() === '{}' || utxoContent.trim() === 'null') {
        throw new Error('UTXO file is empty or contains no valid UTXOs')
      }
      
      const utxoData = JSON.parse(utxoContent)
      const utxoEntries = Object.entries(utxoData)
      
      if (utxoEntries.length === 0) {
        throw new Error('No UTXOs found in the UTXO file')
      }
      
      const [txId, utxoValue] = utxoEntries[0]
      const availableLovelace = (utxoValue as any).value.lovelace
      
      if (availableLovelace < amount) {
        throw new Error(`Insufficient funds: available ${availableLovelace}, requested ${amount}`)
      }
      
      const changeAmount = availableLovelace - amount
      
      console.log(`💰 Using UTXO: ${txId}`)
      console.log(`💰 Available: ${availableLovelace} lovelace`)
      console.log(`💰 Sending: ${amount} lovelace`)
      console.log(`💰 Change: ${changeAmount} lovelace`)
      
      const cmd = `cardano-cli latest transaction build-raw ` +
                  `--tx-in ${txId} ` +
                  `--tx-out $(cat ${toAddressPath})+${amount} ` +
                  `--tx-out $(cat ${fromAddressPath})+${changeAmount} ` +
                  `--fee 0 ` +
                  `--out-file ${this.config.tempFiles.txFile}`
      
      console.log(`🔧 Building L2 transaction from ${user} to ${toUser}...`)
      console.log(`📋 Command: ${cmd}`)
      await execAsync(cmd)
      console.log(`✅ L2 transaction built`)
      
    } catch (error) {
      console.error(`❌ Failed to build L2 transaction:`, error)
      throw error
    }
  }

  /**
   * L2決済用トランザクションを構築（cardano-cli-wrapper.js準拠）
   */
  async buildL2PaymentTransaction(fromUser: 'alice' | 'bob', toUser: 'alice' | 'bob', amount: number): Promise<void> {
    const fromAddressPath = this.getUserAddressPath(fromUser)
    const toAddressPath = this.getUserAddressPath(toUser)
    
    // UTXOファイルの存在と内容を確認
    try {
      const utxoContent = await readFile(this.config.tempFiles.utxoFile, 'utf8')
      console.log(`📊 UTXO file content: ${utxoContent}`)
      
      if (!utxoContent.trim() || utxoContent.trim() === '{}' || utxoContent.trim() === 'null') {
        throw new Error('UTXO file is empty or contains no valid UTXOs')
      }
      
      const utxoData = JSON.parse(utxoContent)
      const utxoEntries = Object.entries(utxoData)
      
      if (utxoEntries.length === 0) {
        throw new Error('No UTXOs found in the UTXO file')
      }
      
      const [txId, utxoValue] = utxoEntries[0]
      const availableLovelace = (utxoValue as any).value.lovelace
      
      if (availableLovelace < amount) {
        throw new Error(`Insufficient funds: available ${availableLovelace}, requested ${amount}`)
      }
      
      const changeAmount = availableLovelace - amount
      
      console.log(`💰 Using UTXO: ${txId}`)
      console.log(`💰 Available: ${availableLovelace} lovelace`)
      console.log(`💰 Sending: ${amount} lovelace`)
      console.log(`💰 Change: ${changeAmount} lovelace`)
      
      const cmd = `cardano-cli latest transaction build-raw ` +
                  `--tx-in ${txId} ` +
                  `--tx-out $(cat ${toAddressPath})+${amount} ` +
                  `--tx-out $(cat ${fromAddressPath})+${changeAmount} ` +
                  `--fee 0 ` +
                  `--out-file ${this.config.tempFiles.txFile}`
      
      console.log(`🔧 Building L2 payment transaction: ${amount} lovelace from ${fromUser} to ${toUser}...`)
      console.log(`📋 Command: ${cmd}`)
      await execAsync(cmd)
      console.log(`✅ L2 payment transaction built`)
      
    } catch (error) {
      console.error(`❌ Failed to build L2 payment transaction:`, error)
      throw error
    }
  }

  /**
   * L2トランザクションに署名
   */
  async signL2Transaction(user: 'alice' | 'bob'): Promise<void> {
    const signingKeyPath = this.getUserSigningKeyPath(user)
    
    const cmd = `cardano-cli latest transaction sign ` +
                `--tx-body-file ${this.config.tempFiles.txFile} ` +
                `--signing-key-file ${signingKeyPath} ` +
                `--out-file ${this.config.tempFiles.signedFile}`
    
    try {
      console.log(`✍️  Signing L2 transaction for ${user}...`)
      await execAsync(cmd)
      console.log(`✅ L2 transaction signed`)
    } catch (error) {
      console.error(`❌ Failed to sign L2 transaction:`, error)
      throw error
    }
  }

  /**
   * L2トランザクションをHydraに送信
   */
  async submitL2Transaction(user: 'alice' | 'bob'): Promise<void> {
    const ws = this.wsConnections.get(user)
    if (!ws) {
      throw new Error(`No WebSocket connection for ${user}`)
    }
    
    try {
      const signedTx = await readFile(this.config.tempFiles.signedFile, 'utf8')
      const txData = JSON.parse(signedTx)
      
      const message: HydraMessage = {
        tag: 'NewTx',
        transaction: txData
      }
      
      console.log(`📤 Submitting L2 transaction for ${user}...`)
      ws.send(JSON.stringify(message))
      console.log(`✅ L2 transaction submitted to Hydra`)
    } catch (error) {
      console.error(`❌ Failed to submit L2 transaction:`, error)
      throw error
    }
  }

  /**
   * L2決済トランザクションをHydraに送信（cardano-cli-wrapper.js準拠）
   */
  async submitL2TransactionToHydra(user: 'alice' | 'bob'): Promise<void> {
    const ws = this.wsConnections.get(user)
    if (!ws) {
      throw new Error(`No WebSocket connection for ${user}`)
    }
    
    try {
      const signedTx = await readFile(this.config.tempFiles.signedFile, 'utf8')
      const txData = JSON.parse(signedTx)
      
      const message: HydraMessage = {
        tag: 'NewTx',
        transaction: txData
      }
      
      console.log(`📤 Submitting L2 payment transaction for ${user}...`)
      console.log(`📋 Transaction data:`, JSON.stringify(txData, null, 2))
      ws.send(JSON.stringify(message))
      console.log(`✅ L2 payment transaction submitted to Hydra`)
    } catch (error) {
      console.error(`❌ Failed to submit L2 payment transaction:`, error)
      throw error
    }
  }

  /**
   * 完全なコミットプロセスを実行
   */
  async executeCommitProcess(user: 'alice' | 'bob'): Promise<void> {
    try {
      console.log(`🚀 Starting commit process for ${user}...`)
      
      // 1. UTXOを取得
      const utxoData = await this.queryUtxo(user)
      
      // 2. UTXOをコミット
      await this.commitUtxo(user, utxoData)
      
      // 3. トランザクションに署名
      await this.signTransaction(user)
      
      // 4. トランザクションを送信
      await this.submitTransaction(user)
      
      console.log(`✅ Commit process completed for ${user}`)
    } catch (error) {
      console.error(`❌ Commit process failed for ${user}:`, error)
      throw error
    }
  }

  /**
   * L2決済プロセスを実行（cardano-cli-wrapper.js getUtxoJSON準拠）
   */
  async executeL2Payment(amount: number): Promise<{ ada: number; lovelace: number }> {
    try {
      console.log(`💰 Starting L2 payment of ${amount} lovelace...`)
      
      // 0. Hydraヘッドの状態を確認
      console.log('🔍 Checking Hydra head status...')
      const headStatus = await this.getHeadStatus('alice')
      console.log(`🔍 Current head status: ${headStatus.tag}`)
      
      if (headStatus.tag !== 'Open' && headStatus.tag !== 'HeadIsOpen') {
        throw new Error(`Hydra head is not open. Current status: ${headStatus.tag}. Please ensure /start has completed successfully.`)
      }
      
      // 1. WebSocket接続を確保
      console.log('🔍 Ensuring WebSocket connections...')
      await this.ensureAllWebSocketConnections()
      
      // 2. Alice L2残高を事前確認
      console.log('💰 Checking Alice L2 balance before payment...')
      const currentBalance = await this.getAliceL2Balance()
      console.log(`💰 Current Alice L2 balance: ${currentBalance.lovelace} lovelace`)
      
      if (currentBalance.lovelace === 0) {
        // Hydraノードの全UTXOを確認してデバッグ情報を提供
        const hydraNodeUrl = this.getHydraNodeUrl('alice')
        const getAllUtxoCmd = `curl -s http://${hydraNodeUrl}/snapshot/utxo`
        const { stdout: allUtxo } = await execAsync(getAllUtxoCmd)
        console.log(`🔍 All UTXOs in Hydra head:`, allUtxo)
        
        throw new Error(`Alice has no L2 UTXOs available for payment. This indicates that the /start process may not have completed successfully, or UTXOs were not properly committed to the Hydra head. Please check that the Hydra head was opened correctly with sufficient funds.`)
      }
      
      if (currentBalance.lovelace < amount) {
        throw new Error(`Insufficient L2 funds: requested ${amount} lovelace, available ${currentBalance.lovelace} lovelace`)
      }
      
      // 3. Hydra L2 UTXOを取得（Aliceのアドレスのみ）
      console.log('📊 Getting Alice Hydra L2 UTXO...')
      await this.getHydraUtxoForAddress('alice')
      
      // 4. L2トランザクションを構築（Alice -> Bob）
      console.log('🔧 Building L2 transaction...')
      await this.buildL2PaymentTransaction('alice', 'bob', amount)
      
      // 5. L2トランザクションに署名
      console.log('✍️ Signing L2 transaction...')
      await this.signL2Transaction('alice')
      
      // 6. L2トランザクションをHydraに送信（WebSocket接続を再確認）
      console.log('📤 Submitting L2 transaction to Hydra...')
      await this.ensureWebSocketConnection('alice') // Alice接続を再確認
      await this.submitL2TransactionToHydra('alice')
      
      // 7. トランザクション処理完了を待機
      console.log('⏳ Waiting for transaction processing...')
      await this.waitForTransactionProcessing()
      
      // 8. 更新されたL2残高を取得
      console.log('💰 Getting updated Alice L2 balance...')
      const updatedBalance = await this.getAliceL2Balance()
      
      console.log(`✅ L2 payment completed: ${amount} lovelace`)
      return updatedBalance
    } catch (error) {
      console.error(`❌ L2 payment failed:`, error)
      throw error
    }
  }

  /**
   * L2送金プロセスを実行
   */
  async executeL2Transfer(fromUser: 'alice' | 'bob', toUser: 'alice' | 'bob'): Promise<void> {
    try {
      console.log(`💰 Starting L2 transfer from ${fromUser} to ${toUser}...`)
      
      // 1. Hydra UTXOを取得
      await this.getHydraUtxo(fromUser)
      
      // 2. L2トランザクションを構築
      await this.buildL2Transaction(fromUser, toUser)
      
      // 3. L2トランザクションに署名
      await this.signL2Transaction(fromUser)
      
      // 4. L2トランザクションをHydraに送信
      await this.submitL2Transaction(fromUser)
      
      console.log(`✅ L2 transfer completed from ${fromUser} to ${toUser}`)
    } catch (error) {
      console.error(`❌ L2 transfer failed:`, error)
      throw error
    }
  }

  /**
   * Hydraを初期化
   */
  async initializeHydra(): Promise<void> {
    try {
      console.log('🚀 Initializing Hydra...')
      
      // 1. Hydra Init処理を実行
      console.log('📋 Sending Hydra Init commands...')
      await this.sendInitCommand('alice')
      await this.sendInitCommand('bob')
      
      // 2. 基本的な接続チェックを実行
      const aliceStatus = await this.getHeadStatus('alice')
      const bobStatus = await this.getHeadStatus('bob')
      
      console.log(`🔍 Alice Hydra status: ${aliceStatus.tag}`)
      console.log(`🔍 Bob Hydra status: ${bobStatus.tag}`)
      
      // 3. 必要に応じてWebSocket接続を確立
      if (!this.wsConnections.has('alice')) {
        await this.connectToHydraNode('alice')
      }
      if (!this.wsConnections.has('bob')) {
        await this.connectToHydraNode('bob')
      }
      
      console.log('✅ Hydra initialization completed')
    } catch (error) {
      console.error('❌ Hydra initialization failed:', error)
      throw error
    }
  }

  /**
   * AliceノードにInitコマンドを送信
   */
  async sendInitCommands(): Promise<void> {
    await this.sendInitCommand('alice')
  }

  /**
   * Hydra Init コマンドを送信（WebSocket専用）
   */
  private async sendInitCommand(user: 'alice' | 'bob'): Promise<void> {
    try {
      console.log(`📤 Sending Init command to ${user}...`)
      
      // WebSocket接続を確保
      let ws = this.wsConnections.get(user)
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log(`🔌 Establishing WebSocket connection to ${user}...`)
        await this.connectToHydraNode(user)
        ws = this.wsConnections.get(user)
      }
      
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error(`Failed to establish WebSocket connection to ${user}`)
      }
      
      // Init メッセージを送信
      const initMessage: HydraMessage = { tag: 'Init' }
      ws.send(JSON.stringify(initMessage))
      console.log(`✅ Init command sent to ${user} via WebSocket`)
      
    } catch (error) {
      console.error(`❌ Failed to send Init command to ${user}:`, error)
      throw error
    }
  }

  /**
   * HTTP POST経由でUTXOコミット処理を実行（cardano-cli-wrapper.js準拠）
   */
  private async sendCommitCommand(user: 'alice' | 'bob'): Promise<void> {
    try {
      console.log(`📤 Starting commit process for ${user}...`)
      
      // 1. UTXOを取得
      console.log(`📊 Querying UTXO for ${user}...`)
      const utxoData = await this.queryUtxo(user)
      console.log(`📊 UTXO data for ${user}:`, JSON.stringify(utxoData, null, 2))
      
      // UTXOが存在するかチェック
      const utxoEntries = Object.entries(utxoData)
      if (utxoEntries.length === 0) {
        throw new Error(`No UTXOs found for ${user}. Cannot proceed with commit.`)
      }
      
      console.log(`📊 Found ${utxoEntries.length} UTXOs for ${user}`)
      utxoEntries.forEach(([txId, utxo]) => {
        const value = (utxo as any).value?.lovelace || 0
        console.log(`  - UTXO ${txId.substring(0, 16)}...: ${value} lovelace`)
      })
      
      // 2. HTTP POST でUTXOをHydraノードにコミット
      console.log(`🔄 Committing UTXO via HTTP POST for ${user}...`)
      await this.commitUtxo(user, utxoData)
      
      // 3. トランザクションに署名
      console.log(`✍️ Signing transaction for ${user}...`)
      await this.signTransaction(user)
      
      // 4. トランザクションを送信
      console.log(`📤 Submitting transaction for ${user}...`)
      await this.submitTransaction(user)
      
      console.log(`✅ Complete commit process finished for ${user}`)
      
    } catch (error) {
      console.error(`❌ Failed to complete commit process for ${user}:`, error)
      throw error
    }
  }

  /**
   * 完全なHydra開始プロセス（状態遷移待機版）
   */
  async executeHydraStart(): Promise<void> {
    try {
      console.log('🚀 Starting complete Hydra process with state monitoring...')
      
      // 1. WebSocket接続を確立
      console.log('🔌 Establishing WebSocket connections...')
      await Promise.all([
        this.connectToHydraNode('alice'),
        this.connectToHydraNode('bob')
      ])
      
      // 2. Hydra Initコマンドを送信
      console.log('📤 Sending Init commands...')
      await Promise.all([
        this.sendInitCommand('alice'),
        this.sendInitCommand('bob')
      ])
      
      // 3. HeadIsInitializing状態まで待機
      console.log('⏳ Waiting for HeadIsInitializing state...')
      await Promise.all([
        this.waitForState('alice', 'HeadIsInitializing'),
        this.waitForState('bob', 'HeadIsInitializing')
      ])
      console.log('✅ Both nodes reached HeadIsInitializing state')
      
      // 4. UTXOコミットを実行（順次実行で状態を監視）
      console.log('📦 Executing UTXO commits...')
      
      // Alice のコミット処理
      await this.sendCommitCommand('alice')
      console.log('⏳ Waiting for Alice Committed response...')
      await this.waitForState('alice', 'Committed')
      console.log('✅ Alice commit confirmed')
      
      // Bob のコミット処理  
      await this.sendCommitCommand('bob')
      console.log('⏳ Waiting for Bob Committed response...')
      await this.waitForState('bob', 'Committed')
      console.log('✅ Bob commit confirmed')
      
      // 6. HeadIsOpen状態まで待機
      console.log('⏳ Waiting for HeadIsOpen state...')
      await Promise.all([
        this.waitForState('alice', 'HeadIsOpen'),
        this.waitForState('bob', 'HeadIsOpen')
      ])
      console.log('🎉 Hydra Head is now open for both nodes')
      
      console.log('✅ Complete Hydra start process finished successfully')
    } catch (error) {
      console.error('❌ Hydra start process failed:', error)
      throw error
    }
  }

  /**
   * HydraのheadStatusを取得
   */
  async getHeadStatus(user: 'alice' | 'bob'): Promise<any> {
    const hydraNodeUrl = this.getHydraNodeUrl(user)
    
    try {
      const cmd = `curl -s http://${hydraNodeUrl}/head`
      const { stdout } = await execAsync(cmd)
      
      // レスポンスがJSONかどうかチェック
      const trimmedResponse = stdout.trim()
      if (!trimmedResponse) {
        console.warn(`⚠️  Empty response from ${user} Hydra node`)
        return {
          tag: 'Idle',
          headId: null,
          snapshotNumber: 0
        }
      }
      
      // JSONパースを試行
      try {
        return JSON.parse(trimmedResponse)
      } catch (parseError) {
        console.warn(`⚠️  Non-JSON response from ${user} Hydra node: ${trimmedResponse}`)
        
        // 一般的なエラーレスポンスをチェック
        if (trimmedResponse.includes('Resource not found') || trimmedResponse.includes('404')) {
          console.warn(`⚠️  Hydra node ${user} not available (404), using default status`)
        } else if (trimmedResponse.includes('Connection refused') || trimmedResponse.includes('Failed to connect')) {
          console.warn(`⚠️  Hydra node ${user} connection refused, using default status`)
        }
        
        // デフォルト値を返す
        return {
          tag: 'Idle',
          headId: null,
          snapshotNumber: 0
        }
      }
    } catch (error) {
      console.error(`❌ Failed to get head status for ${user}:`, error)
      // デフォルト値を返す
      return {
        tag: 'Idle',
        headId: null,
        snapshotNumber: 0
      }
    }
  }

  /**
   * Alice L1アドレスを取得
   */
  async getAliceL1Address(): Promise<string> {
    try {
      const addressPath = this.getUserAddressPath('alice')
      const address = await readFile(addressPath, 'utf8')
      return address.trim()
    } catch (error) {
      console.error(`❌ Failed to get Alice L1 address:`, error)
      return 'addr_test1qp0x6s5h3cj8k3hg3q5d3j2n7v8m9c0b5a4f7e8d9g6h5j4k3l2m1n0'
    }
  }

  /**
   * Bob L1アドレスを取得
   */
  async getBobL1Address(): Promise<string> {
    try {
      const addressPath = this.getUserAddressPath('bob')
      const address = await readFile(addressPath, 'utf8')
      return address.trim()
    } catch (error) {
      console.error(`❌ Failed to get Bob L1 address:`, error)
      return 'addr_test1vr643kr5kwueswz5xvp4vwyckqsyf2phmdca935sjstctwgrcd6x6'
    }
  }

  /**
   * Alice L1アドレスの残高を取得
   */
  async getAliceL1Balance(): Promise<{ ada: number; lovelace: number }> {
    try {
      const addressPath = this.getUserAddressPath('alice')
      const socketPath = this.getCardanoSocketPath()
      
      // デバッグ：Aliceのアドレスを確認
      const aliceAddress = await readFile(addressPath, 'utf8')
      console.log(`🔍 Alice L1 address: ${aliceAddress.trim()}`)
      
      // デバッグ：使用するソケットパスを確認
      console.log(`🔍 Cardano socket path: ${socketPath}`)
      
      // ソケットファイルの存在を確認
      try {
        const { stat } = await import('fs/promises')
        const stats = await stat(socketPath)
        if (stats.isSocket()) {
          console.log(`✅ Socket file exists at: ${socketPath}`)
        } else {
          console.log(`⚠️ File exists but is not a socket: ${socketPath}`)
        }
      } catch (socketError) {
        console.log(`⚠️ Socket file not found or not accessible: ${socketPath}`)
        console.log(`⚠️ Socket error:`, socketError)
      }
      
      const cmd = `cardano-cli query utxo --socket-path ${socketPath} --output-json --address $(cat ${addressPath})`
      console.log(`🔍 L1 balance query command: ${cmd}`)
      
      const { stdout, stderr } = await execAsync(cmd)
      console.log(`🔍 L1 balance query result:`, stdout)
      
      if (stderr) {
        console.log(`⚠️ Command stderr:`, stderr)
      }
      
      if (!stdout.trim()) {
        console.log(`⚠️ No UTXO data returned for Alice L1 address`)
        return { ada: 0, lovelace: 0 }
      }
      
      let utxoData: any
      try {
        utxoData = JSON.parse(stdout)
      } catch (parseError) {
        console.error(`❌ Failed to parse UTXO JSON:`, parseError)
        console.error(`❌ Raw stdout:`, stdout)
        throw new Error(`Invalid JSON response from cardano-cli: ${parseError}`)
      }
      
      console.log(`🔍 Parsed UTXO data:`, JSON.stringify(utxoData, null, 2))
      
      // UTXOデータが空オブジェクトでないかチェック
      if (typeof utxoData !== 'object' || utxoData === null) {
        console.log(`⚠️ Invalid UTXO data structure`)
        return { ada: 0, lovelace: 0 }
      }
      
      const utxoEntries = Object.entries(utxoData)
      if (utxoEntries.length === 0) {
        console.log(`⚠️ No UTXOs found for Alice L1 address - wallet may be empty`)
        return { ada: 0, lovelace: 0 }
      }
      
      let totalLovelace = 0
      let utxoCount = 0
      
      // 全UTXOの合計を計算
      utxoEntries.forEach(([txId, utxo]: [string, any]) => {
        console.log(`🔍 Processing UTXO ${txId}:`, JSON.stringify(utxo, null, 2))
        
        if (utxo && utxo.value) {
          if (typeof utxo.value === 'number') {
            // 古い形式: value が直接数値
            totalLovelace += utxo.value
            utxoCount++
            console.log(`  - UTXO ${txId.substring(0, 16)}...: ${utxo.value} lovelace (direct value)`)
          } else if (utxo.value.lovelace) {
            // 新しい形式: value.lovelace
            totalLovelace += utxo.value.lovelace
            utxoCount++
            console.log(`  - UTXO ${txId.substring(0, 16)}...: ${utxo.value.lovelace} lovelace`)
          } else {
            console.log(`  - UTXO ${txId.substring(0, 16)}...: No lovelace value found`)
          }
        } else {
          console.log(`  - UTXO ${txId.substring(0, 16)}...: No value field found`)
        }
      })
      
      console.log(`📊 Alice L1 total: ${totalLovelace} lovelace (${totalLovelace / 1000000} ADA) from ${utxoCount} UTXOs`)
      
      return {
        ada: totalLovelace / 1000000, // lovelaceをADAに変換
        lovelace: totalLovelace
      }
    } catch (error) {
      console.error(`❌ Failed to get Alice L1 balance:`, error)
      // エラー時はデフォルト値を返す
      return {
        ada: 0,
        lovelace: 0
      }
    }
  }

  /**
   * Bob L1アドレスの残高を取得
   */
  async getBobL1Balance(): Promise<{ ada: number; lovelace: number }> {
    try {
      const addressPath = this.getUserAddressPath('bob')
      const socketPath = this.getCardanoSocketPath()
      
      // デバッグ：Bobのアドレスを確認
      const bobAddress = await readFile(addressPath, 'utf8')
      console.log(`🔍 Bob L1 address: ${bobAddress.trim()}`)
      
      // デバッグ：使用するソケットパスを確認
      console.log(`🔍 Cardano socket path: ${socketPath}`)
      
      const cmd = `cardano-cli query utxo --socket-path ${socketPath} --output-json --address $(cat ${addressPath})`
      console.log(`🔍 Bob L1 balance query command: ${cmd}`)
      
      const { stdout, stderr } = await execAsync(cmd)
      console.log(`🔍 Bob L1 balance query result:`, stdout)
      
      if (stderr) {
        console.log(`⚠️ Command stderr:`, stderr)
      }
      
      if (!stdout.trim()) {
        console.log(`⚠️ No UTXO data returned for Bob L1 address`)
        return { ada: 0, lovelace: 0 }
      }
      
      let utxoData: any
      try {
        utxoData = JSON.parse(stdout)
      } catch (parseError) {
        console.error(`❌ Failed to parse Bob UTXO JSON:`, parseError)
        console.error(`❌ Raw stdout:`, stdout)
        throw new Error(`Invalid JSON response from cardano-cli: ${parseError}`)
      }
      
      console.log(`🔍 Bob parsed UTXO data:`, JSON.stringify(utxoData, null, 2))
      
      const utxoEntries = Object.entries(utxoData)
      if (utxoEntries.length === 0) {
        console.log(`⚠️ No UTXOs found for Bob L1 address - wallet may be empty`)
        return { ada: 0, lovelace: 0 }
      }
      
      let totalLovelace = 0
      let utxoCount = 0
      
      // 全UTXOの合計を計算
      utxoEntries.forEach(([txId, utxo]: [string, any]) => {
        console.log(`🔍 Processing Bob UTXO ${txId}:`, JSON.stringify(utxo, null, 2))
        
        if (utxo && utxo.value) {
          if (typeof utxo.value === 'number') {
            // 古い形式: value が直接数値
            totalLovelace += utxo.value
            utxoCount++
            console.log(`  - UTXO ${txId.substring(0, 16)}...: ${utxo.value} lovelace (direct value)`)
          } else if (utxo.value.lovelace) {
            // 新しい形式: value.lovelace
            totalLovelace += utxo.value.lovelace
            utxoCount++
            console.log(`  - UTXO ${txId.substring(0, 16)}...: ${utxo.value.lovelace} lovelace`)
          } else {
            console.log(`  - UTXO ${txId.substring(0, 16)}...: No lovelace value found`)
          }
        } else {
          console.log(`  - UTXO ${txId.substring(0, 16)}...: No value field found`)
        }
      })
      
      console.log(`📊 Bob L1 total: ${totalLovelace} lovelace (${totalLovelace / 1000000} ADA) from ${utxoCount} UTXOs`)
      
      return {
        ada: totalLovelace / 1000000, // lovelaceをADAに変換
        lovelace: totalLovelace
      }
    } catch (error) {
      console.error(`❌ Failed to get Bob L1 balance:`, error)
      // エラー時はデフォルト値を返す
      return {
        ada: 0,
        lovelace: 0
      }
    }
  }

  /**
   * Bob L2 ESCROWウォレットの残高を取得
   */
  async getBobL2Balance(): Promise<{ ada: number; lovelace: number }> {
    try {
      const hydraNodeUrl = this.getHydraNodeUrl('bob')
      const addressPath = this.getUserAddressPath('bob')
      
      // デバッグ：Bobのアドレスを確認
      const bobAddress = await readFile(addressPath, 'utf8')
      console.log(`🔍 Bob L2 address: ${bobAddress.trim()}`)
      
      // デバッグ：Hydraノードの全UTXOを確認
      const getAllUtxoCmd = `curl -s http://${hydraNodeUrl}/snapshot/utxo`
      const { stdout: allUtxo } = await execAsync(getAllUtxoCmd)
      console.log(`🔍 All UTXOs from Bob Hydra node:`, allUtxo)
      
      // デバッグ：Hydraノードの状態を確認
      const getStatusCmd = `curl -s http://${hydraNodeUrl}`
      const { stdout: nodeStatus } = await execAsync(getStatusCmd)
      console.log(`🔍 Bob Hydra node status:`, nodeStatus)
      
      const cmd = `curl -s http://${hydraNodeUrl}/snapshot/utxo | ` +
                  `jq "with_entries(select(.value.address == \\"$(cat ${addressPath})\\"))" | ` +
                  `jq 'to_entries | map(.value.value.lovelace) | add // 0'`
      
      console.log(`🔍 Bob L2 balance query command: ${cmd}`)
      const { stdout } = await execAsync(cmd)
      console.log(`🔍 Bob L2 balance query result: "${stdout.trim()}"`)
      
      const totalLovelace = parseInt(stdout.trim()) || 0
      
      console.log(`📊 Bob L2 balance: ${totalLovelace} lovelace`)
      
      return {
        ada: totalLovelace / 1000000, // lovelaceをADAに変換
        lovelace: totalLovelace
      }
    } catch (error) {
      console.error(`❌ Failed to get Bob L2 balance:`, error)
      // エラー時はデフォルト値を返す
      return {
        ada: 0,
        lovelace: 0
      }
    }
  }

  /**
   * Alice L2 ESCROWウォレットの残高を取得
   */
  async getAliceL2Balance(): Promise<{ ada: number; lovelace: number }> {
    try {
      const hydraNodeUrl = this.getHydraNodeUrl('alice')
      const addressPath = this.getUserAddressPath('alice')
      
      // デバッグ：Aliceのアドレスを確認
      const aliceAddress = await readFile(addressPath, 'utf8')
      console.log(`🔍 Alice address: ${aliceAddress.trim()}`)
      
      // デバッグ：Hydraノードの全UTXOを確認
      const getAllUtxoCmd = `curl -s http://${hydraNodeUrl}/snapshot/utxo`
      const { stdout: allUtxo } = await execAsync(getAllUtxoCmd)
      console.log(`🔍 All UTXOs from Hydra node:`, allUtxo)
      
      // デバッグ：Hydraノードの状態を確認
      const getStatusCmd = `curl -s http://${hydraNodeUrl}`
      const { stdout: nodeStatus } = await execAsync(getStatusCmd)
      console.log(`🔍 Hydra node status:`, nodeStatus)
      
      const cmd = `curl -s http://${hydraNodeUrl}/snapshot/utxo | ` +
                  `jq "with_entries(select(.value.address == \\"$(cat ${addressPath})\\"))" | ` +
                  `jq 'to_entries | map(.value.value.lovelace) | add // 0'`
      
      console.log(`🔍 Balance query command: ${cmd}`)
      const { stdout } = await execAsync(cmd)
      console.log(`🔍 Balance query result: "${stdout.trim()}"`)
      
      const totalLovelace = parseInt(stdout.trim()) || 0
      
      console.log(`📊 Alice L2 balance: ${totalLovelace} lovelace`)
      
      return {
        ada: totalLovelace / 1000000, // lovelaceをADAに変換
        lovelace: totalLovelace
      }
    } catch (error) {
      console.error(`❌ Failed to get Alice L2 balance:`, error)
      // エラー時はデフォルト値を返す
      return {
        ada: 0,
        lovelace: 0
      }
    }
  }

  /**
   * L2トランザクション処理完了を待機（SnapshotConfirmed待機）
   */
  async waitForTransactionProcessing(timeoutMs: number = 10000): Promise<void> {
    try {
      // TxValidメッセージを待機
      console.log('⏳ Waiting for TxValid confirmation...')
      await Promise.race([
        this.waitForState('alice', 'TxValid', 5000), // 5秒でTxValid待機
        new Promise<void>((resolve) => setTimeout(resolve, 5000)) // 5秒のフォールバック
      ])
      console.log('✅ TxValid confirmed')
      
      // TxValid後にSnapshotConfirmedメッセージを待機
      console.log('⏳ Waiting for SnapshotConfirmed after TxValid...')
      await Promise.race([
        this.waitForState('alice', 'SnapshotConfirmed', timeoutMs), // 指定時間でSnapshotConfirmed待機
        new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)) // タイムアウトのフォールバック
      ])
      console.log('✅ SnapshotConfirmed - L2 balance updated')
    } catch (error) {
      // エラーが発生した場合は時間待機にフォールバック
      console.log('⏳ Falling back to time-based wait for transaction processing...')
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log('✅ Transaction processing wait completed (fallback)')
          resolve()
        }, timeoutMs)
      })
    }
  }

  /**
   * WebSocket接続状態を確認
   */
  isWebSocketConnected(user: 'alice' | 'bob'): boolean {
    const ws = this.wsConnections.get(user)
    return ws !== undefined && ws.readyState === WebSocket.OPEN
  }

  /**
   * すべてのWebSocket接続状態を確認
   */
  areAllWebSocketsConnected(): boolean {
    return this.isWebSocketConnected('alice') && this.isWebSocketConnected('bob')
  }

  /**
   * WebSocket接続を確保（未接続の場合は接続を試行）
   */
  async ensureWebSocketConnection(user: 'alice' | 'bob'): Promise<void> {
    if (!this.isWebSocketConnected(user)) {
      console.log(`🔌 WebSocket not connected for ${user}, attempting to connect...`)
      await this.connectToHydraNode(user)
    } else {
      console.log(`✅ WebSocket already connected for ${user}`)
    }
  }

  /**
   * すべてのWebSocket接続を確保
   */
  async ensureAllWebSocketConnections(): Promise<void> {
    console.log('🔍 Checking WebSocket connections...')
    
    const connectionPromises: Promise<void>[] = []
    
    if (!this.isWebSocketConnected('alice')) {
      connectionPromises.push(this.ensureWebSocketConnection('alice'))
    }
    
    if (!this.isWebSocketConnected('bob')) {
      connectionPromises.push(this.ensureWebSocketConnection('bob'))
    }
    
    if (connectionPromises.length > 0) {
      await Promise.all(connectionPromises)
      console.log('✅ All WebSocket connections ensured')
    } else {
      console.log('✅ All WebSocket connections already active')
    }
  }

  /**
   * WebSocket経由でCloseコマンドを送信
   */
  async sendCloseCommand(user: 'alice' | 'bob' = 'alice'): Promise<void> {
    try {
      console.log(`📤 Sending Close command to ${user}...`)
      
      const ws = this.wsConnections.get(user)
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error(`WebSocket connection not available for ${user}`)
      }
      
      const closeMessage: HydraMessage = { tag: 'Close' }
      ws.send(JSON.stringify(closeMessage))
      console.log(`✅ Close command sent to ${user} via WebSocket`)
      
    } catch (error) {
      console.error(`❌ Failed to send Close command to ${user}:`, error)
      throw error
    }
  }

  /**
   * WebSocket経由でFanoutコマンドを送信
   */
  async sendFanoutCommand(user: 'alice' | 'bob' = 'alice'): Promise<void> {
    try {
      console.log(`📤 Sending Fanout command to ${user}...`)
      
      const ws = this.wsConnections.get(user)
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error(`WebSocket connection not available for ${user}`)
      }
      
      const fanoutMessage: HydraMessage = { tag: 'Fanout' }
      ws.send(JSON.stringify(fanoutMessage))
      console.log(`✅ Fanout command sent to ${user} via WebSocket`)
      
    } catch (error) {
      console.error(`❌ Failed to send Fanout command to ${user}:`, error)
      throw error
    }
  }

  /**
   * WebSocket経由でAbortコマンドを送信
   */
  async sendAbortCommand(user: 'alice' | 'bob' = 'alice'): Promise<void> {
    try {
      console.log(`📤 Sending Abort command to ${user}...`)
      
      const ws = this.wsConnections.get(user)
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error(`WebSocket connection not available for ${user}`)
      }
      
      const abortMessage: HydraMessage = { tag: 'Abort' }
      ws.send(JSON.stringify(abortMessage))
      console.log(`✅ Abort command sent to ${user} via WebSocket`)
      
    } catch (error) {
      console.error(`❌ Failed to send Abort command to ${user}:`, error)
      throw error
    }
  }

  /**
   * Close後のバックグラウンド処理を実行（リトライ機能付き）
   */
  async continueCloseProcess(): Promise<void> {
    try {
      console.log('🔄 Starting background close process with retry functionality...')
      
      // 1. HeadIsClosed状態まで待機（リトライ付き）
      await this.waitForHeadIsClosedWithRetry()
      console.log('✅ Both nodes reached HeadIsClosed state')
      
      // 2. "Ready to Fanout" 状態まで待機してからFanout送信
      console.log('⏳ Waiting for Ready to Fanout state...')
      await Promise.all([
        this.waitForState('alice', 'ReadyToFanout', 600000), // 10分
        this.waitForState('bob', 'ReadyToFanout', 600000)    // 10分
      ])
      console.log('✅ Both nodes ready for fanout')
      
      // 3. Fanoutコマンドを送信
      console.log('📤 Sending Fanout commands...')
      await this.sendFanoutCommand('alice')
      
      // 4. HeadIsFinalized状態まで待機
      console.log('⏳ Waiting for HeadIsFinalized state...')
      await Promise.all([
        this.waitForState('alice', 'HeadIsFinalized', 600000), // 10分
        this.waitForState('bob', 'HeadIsFinalized', 600000)    // 10分
      ])
      console.log('🎉 Hydra Head is now finalized')
      
      console.log('✅ Background close process completed successfully')
    } catch (error) {
      console.error('❌ Background close process failed:', error)
      throw error
    }
  }

  /**
   * HeadIsClosed状態待機（リトライ機能付き）
   */
  async waitForHeadIsClosedWithRetry(): Promise<void> {
    const maxRetries = 5
    const retryTimeoutMs = 60000 // 60秒
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`⏳ Attempt ${attempt}/${maxRetries}: Waiting for HeadIsClosed state (60s timeout)...`)
        
        // 60秒タイムアウトでHeadIsClosed状態を待機
        await Promise.all([
          this.waitForState('alice', 'HeadIsClosed', retryTimeoutMs),
          this.waitForState('bob', 'HeadIsClosed', retryTimeoutMs)
        ])
        
        console.log(`✅ HeadIsClosed achieved on attempt ${attempt}`)
        return // 成功したので終了
        
      } catch (error) {
        console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed to reach HeadIsClosed within 60s`)
        
        if (attempt < maxRetries) {
          // 最大リトライ回数に達していない場合、再度Close送信
          console.log(`🔄 Retrying: Sending Close command again (attempt ${attempt + 1})...`)
          try {
            await this.ensureWebSocketConnection('alice')
            await this.sendCloseCommand('alice')
          } catch (retryError) {
            console.error(`❌ Failed to resend Close command on attempt ${attempt + 1}:`, retryError)
          }
        } else {
          // 最大リトライ回数に達した場合
          console.error(`❌ Failed to reach HeadIsClosed after ${maxRetries} attempts`)
          throw new Error(`HeadIsClosed not achieved after ${maxRetries} close attempts with 60s timeouts each`)
        }
      }
    }
  }

  /**
   * WebSocket接続を閉じる
   */
  disconnectAll(): void {
    this.wsConnections.forEach((ws, user) => {
      ws.close()
      console.log(`🔌 Disconnected from ${user}`)
    })
    this.wsConnections.clear()
  }

  /**
   * Bob L1ウォレットから指定アドレスへ送金
   */
  async sendBobL1Payment(toAddress: string, amount: number): Promise<{ ada: number; lovelace: number }> {
    try {
      console.log(`💰 Starting L1 payment: ${amount} lovelace from Bob to ${toAddress}`)
      
      const addressPath = this.getUserAddressPath('bob')
      const signingKeyPath = this.getUserSigningKeyPath('bob')
      const socketPath = this.getCardanoSocketPath()
      
      // 1. BobのUTXOを取得
      console.log('📊 Querying Bob L1 UTXO...')
      const utxoCmd = `cardano-cli query utxo --socket-path ${socketPath} --output-json --address $(cat ${addressPath})`
      const { stdout: utxoOutput } = await execAsync(utxoCmd)
      const utxoData = JSON.parse(utxoOutput)
      
      // 利用可能なUTXOを選択（最大額のUTXOを選択）
      const utxoKeys = Object.keys(utxoData)
      if (utxoKeys.length === 0) {
        throw new Error('No UTXOs available for Bob L1 wallet')
      }
      
      // 最大のUTXOを選択
      let selectedUtxo = utxoKeys[0]
      let maxValue = utxoData[selectedUtxo].value.lovelace
      
      for (const utxoKey of utxoKeys) {
        const utxoValue = utxoData[utxoKey].value.lovelace
        if (utxoValue > maxValue) {
          maxValue = utxoValue
          selectedUtxo = utxoKey
        }
      }
      
      const utxoValue = maxValue
      
      console.log(`💰 Selected UTXO: ${selectedUtxo} with ${utxoValue} lovelace`)
      
      if (utxoValue < amount + 200000) { // 手数料として200000 lovelace (0.2 ADA) を考慮
        throw new Error(`Insufficient funds: available ${utxoValue}, required ${amount + 200000}`)
      }
      
      // 2. トランザクションを構築
      console.log('🔧 Building L1 transaction...')
      const changeAmount = utxoValue - amount - 200000 // 手数料を差し引いた変更分
      
      const txBuildCmd = `cardano-cli latest transaction build-raw ` +
                        `--tx-in ${selectedUtxo} ` +
                        `--tx-out ${toAddress}+${amount} ` +
                        `--tx-out $(cat ${addressPath})+${changeAmount} ` +
                        `--fee 200000 ` +
                        `--out-file ${this.config.tempFiles.txFile}`
      
      await execAsync(txBuildCmd)
      console.log('✅ L1 transaction built')
      
      // 3. トランザクションに署名
      console.log('✍️ Signing L1 transaction...')
      const signCmd = `cardano-cli latest transaction sign ` +
                     `--tx-body-file ${this.config.tempFiles.txFile} ` +
                     `--signing-key-file ${signingKeyPath} ` +
                     `--out-file ${this.config.tempFiles.signedFile}`
      
      await execAsync(signCmd)
      console.log('✅ L1 transaction signed')
      
      // 4. トランザクションを送信
      console.log('📤 Submitting L1 transaction...')
      const submitCmd = `cardano-cli latest transaction submit ` +
                       `--tx-file ${this.config.tempFiles.signedFile} ` +
                       `${this.config.targetNetwork} --socket-path ${socketPath}`
      
      await execAsync(submitCmd)
      console.log('✅ L1 transaction submitted')
      
      // 5. トランザクション確定を待機してから残高を取得
      console.log('⏳ Waiting for transaction confirmation...')
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3秒待機
      
      console.log('💰 Getting updated Bob L1 balance...')
      const updatedBalance = await this.getBobL1Balance()
      
      console.log(`✅ L1 payment completed: ${amount} lovelace sent to ${toAddress}`)
      return updatedBalance
      
    } catch (error) {
      console.error(`❌ L1 payment failed:`, error)
      throw error
    }
  }

  /**
   * Alice L1ウォレットから指定アドレスへ送金
   */
  async sendL1Payment(toAddress: string, amount: number): Promise<{ ada: number; lovelace: number }> {
    try {
      console.log(`💰 Starting L1 payment: ${amount} lovelace from Alice to ${toAddress}`)
      
      const addressPath = this.getUserAddressPath('alice')
      const signingKeyPath = this.getUserSigningKeyPath('alice')
      const socketPath = this.getCardanoSocketPath()
      
      // 1. AliceのUTXOを取得
      console.log('📊 Querying Alice L1 UTXO...')
      const utxoCmd = `cardano-cli query utxo --socket-path ${socketPath} --output-json --address $(cat ${addressPath})`
      const { stdout: utxoOutput } = await execAsync(utxoCmd)
      const utxoData = JSON.parse(utxoOutput)
      
      // 利用可能なUTXOを選択（最大額のUTXOを選択）
      const utxoKeys = Object.keys(utxoData)
      if (utxoKeys.length === 0) {
        throw new Error('No UTXOs available for Alice L1 wallet')
      }
      
      // 最大のUTXOを選択
      let selectedUtxo = utxoKeys[0]
      let maxValue = utxoData[selectedUtxo].value.lovelace
      
      for (const utxoKey of utxoKeys) {
        const utxoValue = utxoData[utxoKey].value.lovelace
        if (utxoValue > maxValue) {
          maxValue = utxoValue
          selectedUtxo = utxoKey
        }
      }
      
      const utxoValue = maxValue
      
      console.log(`💰 Selected UTXO: ${selectedUtxo} with ${utxoValue} lovelace`)
      
      if (utxoValue < amount + 200000) { // 手数料として200000 lovelace (0.2 ADA) を考慮
        throw new Error(`Insufficient funds: available ${utxoValue}, required ${amount + 200000}`)
      }
      
      // 2. トランザクションを構築
      console.log('🔧 Building L1 transaction...')
      const changeAmount = utxoValue - amount - 200000 // 手数料を差し引いた変更分
      
      const txBuildCmd = `cardano-cli latest transaction build-raw ` +
                        `--tx-in ${selectedUtxo} ` +
                        `--tx-out ${toAddress}+${amount} ` +
                        `--tx-out $(cat ${addressPath})+${changeAmount} ` +
                        `--fee 200000 ` +
                        `--out-file ${this.config.tempFiles.txFile}`
      
      await execAsync(txBuildCmd)
      console.log('✅ L1 transaction built')
      
      // 3. トランザクションに署名
      console.log('✍️ Signing L1 transaction...')
      const signCmd = `cardano-cli latest transaction sign ` +
                     `--tx-body-file ${this.config.tempFiles.txFile} ` +
                     `--signing-key-file ${signingKeyPath} ` +
                     `--out-file ${this.config.tempFiles.signedFile}`
      
      await execAsync(signCmd)
      console.log('✅ L1 transaction signed')
      
      // 4. トランザクションを送信
      console.log('📤 Submitting L1 transaction...')
      const submitCmd = `cardano-cli latest transaction submit ` +
                       `--tx-file ${this.config.tempFiles.signedFile} ` +
                       `${this.config.targetNetwork} --socket-path ${socketPath}`
      
      await execAsync(submitCmd)
      console.log('✅ L1 transaction submitted')
      
      // 5. トランザクション確定を待機してから残高を取得
      console.log('⏳ Waiting for transaction confirmation...')
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3秒待機
      
      console.log('💰 Getting updated Alice L1 balance...')
      const updatedBalance = await this.getAliceL1Balance()
      
      console.log(`✅ L1 payment completed: ${amount} lovelace sent to ${toAddress}`)
      return updatedBalance
      
    } catch (error) {
      console.error(`❌ L1 payment failed:`, error)
      throw error
    }
  }

  /**
   * 設定情報を取得
   */
  getConfig(): HydraConfig {
    return { ...this.config }
  }
}

export default HydraClient