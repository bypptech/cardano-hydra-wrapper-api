// i18n (Internationalization) support for Hydra Escrow API Test App

export type Language = 'en' | 'ja';

export interface I18nMessages {
    // App Title
    appTitle: string;
    
    // API Configuration
    apiConfig: string;
    apiBaseUrl: string;
    updateUrl: string;
    
    // Setup & Start
    setupStart: string;
    setupButton: string;
    startButton: string;
    refreshBalance: string;
    getServerState: string;
    serverState: string;
    setupInProgress: string;
    setupCompleted: string;
    setupFailed: string;
    
    // Wallet Balance
    walletBalance: string;
    aliceL1Balance: string;
    aliceL2Balance: string;
    bobL1Balance: string;
    bobL2Balance: string;
    address: string;
    
    // L2 Payment
    l2Payment: string;
    paymentAmount: string;
    paymentAmountLabel: string;
    executePayment: string;
    
    // Transaction Control
    closeTransaction: string;
    abortTransaction: string;
    
    // Log
    log: string;
    clearLog: string;
    
    // Language
    language: string;
    english: string;
    japanese: string;
    
    // Status Messages
    apiKeyRequired: string;
    setupFirst: string;
    invalidAmount: string;
    invalidUrl: string;
    urlUpdated: string;
    
    // States
    notAvailable: string;
    
    // State Descriptions
    stateIdleDescription: string;
    stateInitialDescription: string;
    stateInitDescription: string;
    stateHeadIsInitializingDescription: string;
    stateHeadIsOpenDescription: string;
    stateHeadIsClosedDescription: string;
    stateCommittedDescription: string;
    stateTxValidDescription: string;
    stateTxInvalidDescription: string;
    stateSnapshotConfirmedDescription: string;
    stateReadyToFanoutDescription: string;
    stateFanoutPossibleDescription: string;
    stateOpenDescription: string;
    stateClosingDescription: string;
    stateClosedDescription: string;
    stateFailedDescription: string;
    
    // Status Messages
    hydraHeadOpenMessage: string;
    hydraHeadInitializationMessage: string;
    hydraHeadCloseRequestMessage: string;
    hydraHeadClosedTimerMessage: string;
    hydraHeadClosingTimerMessage: string;
    apiKeyAcquiredMessage: string;
    initializationInProgressMessage: string;
    paymentSuccessMessage: string;
    
    // Log Messages - Action messages
    initializationMessage: string;
    languageChanged: string;
    apiUrlUpdated: string;
    invalidUrlFormat: string;
    startingApiKeyAcquisition: string;
    apiKeyAcquired: string;
    aliceL1EscrowAddress: string;
    gettingBobL1Balance: string;
    apiKeyAcquisitionCompleted: string;
    apiKeyAcquisitionFailed: string;
    startingTransaction: string;
    transactionStarted: string;
    transactionStartFailed: string;
    refreshingBalances: string;
    hydraStateInfo: string;
    bobL1BalanceUpdated: string;
    stateOpenBobL1Skipped: string;
    allBalancesUpdated: string;
    failedToRefreshBalances: string;
    executingL2Payment: string;
    paymentCompleted: string;
    updatingBobL2BalanceAfterPayment: string;
    bobL2BalanceUpdatedAfterPayment: string;
    failedToUpdateBobL2Balance: string;
    paymentFailed: string;
    closingTransaction: string;
    closeInitiated: string;
    closeFailed: string;
    abortingTransaction: string;
    transactionAborted: string;
    abortFailed: string;
    gettingServerState: string;
    serverStateUpdated: string;
    failedToGetServerState: string;
    startingStatusPolling: string;
    stateChangedToOpen: string;
    statusPollingError: string;
    statusPollingStopped: string;
    
    // Manual API execution messages
    executingManualSetup: string;
    apiKeyObtainedAndSaved: string;
    setupResponseReceived: string;
    setupRequestFailed: string;
    executingManualStart: string;
    startResponseReceived: string;
    startRequestFailed: string;
    executingManualStatus: string;
    statusResponseReceived: string;
    statusRequestFailed: string;
    executingManualBalance: string;
    balanceResponseReceived: string;
    balanceRequestFailed: string;
    executingManualBalanceL2: string;
    balanceL2ResponseReceived: string;
    balanceL2RequestFailed: string;
    executingManualPayment: string;
    paymentResponseReceived: string;
    paymentRequestFailed: string;
    executingManualClose: string;
    closeResponseReceived: string;
    closeRequestFailed: string;
    executingManualAbort: string;
    abortResponseReceived: string;
    abortRequestFailed: string;
    executingManualWithdrawal: string;
    withdrawalResponseReceived: string;
    withdrawalRequestFailed: string;
    executingManualRefund: string;
    refundResponseReceived: string;
    refundRequestFailed: string;
    
    // Form validation messages
    pleaseEnterWithdrawalAddress: string;
    pleaseEnterRefundAddress: string;
    
    // API request messages
    apiRequestLog: string;
    apiResponseLog: string;
    
    // Placeholder texts
    placeholderPaymentAmount: string;
    placeholderWithdrawalAddress: string;
    placeholderRefundAddress: string;
    
    // Manual API Execution
    manualApiExecution: string;
    manualApiDescription: string;
    setupApiManual: string;
    setupApiDesc: string;
    executeSetup: string;
    senderAddress: string;
    startApiManual: string;
    startApiDesc: string;
    executeStart: string;
    statusApi: string;
    statusApiDesc: string;
    executeStatus: string;
    balanceApi: string;
    balanceApiDesc: string;
    executeBalance: string;
    balancel2Api: string;
    balancel2ApiDesc: string;
    executeBalanceL2: string;
    paymentApiManual: string;
    paymentApiDesc: string;
    executePaymentManual: string;
    closeApiManual: string;
    closeApiDesc: string;
    executeClose: string;
    abortApiManual: string;
    abortApiDesc: string;
    executeAbort: string;
    withdrawalApiManual: string;
    withdrawalApiDesc: string;
    executeWithdrawal: string;
    refundApiManual: string;
    refundApiDesc: string;
    executeRefund: string;
    amount: string;
    toAddress: string;
}

export const messages: Record<Language, I18nMessages> = {
    en: {
        // App Title
        appTitle: '🔗 Cardano Hydra Wrapper API Test App',
        
        // API Configuration
        apiConfig: '⚙️ API Configuration',
        apiBaseUrl: 'API Base URL:',
        updateUrl: 'Update URL',
        
        // Setup & Start
        setupStart: '🚀 API Operations',
        setupButton: 'Get API Key',
        startButton: 'Start Transaction',
        refreshBalance: 'Refresh Balance',
        getServerState: 'Get Latest Info',
        serverState: '🔍 Server State:',
        setupInProgress: 'Setup in progress...',
        setupCompleted: 'API key acquisition completed. Transaction start is now available.',
        setupFailed: 'Setup failed',
        
        // Wallet Balance
        walletBalance: '💰 Wallet Balance',
        aliceL1Balance: '🏦 Alice ESCROW L1 Balance',
        aliceL2Balance: '⚡ Alice ESCROW L2 Balance',
        bobL1Balance: '🏦 Bob ESCROW L1 Balance',
        bobL2Balance: '⚡ Bob ESCROW L2 Balance',
        address: 'Address:',
        
        // L2 Payment
        l2Payment: '💸 L2 Payment',
        paymentAmount: 'Payment Amount (lovelace):',
        paymentAmountLabel: 'Amount',
        executePayment: 'Execute L2 Payment',
        
        // Transaction Control
        closeTransaction: 'Close Transaction',
        abortTransaction: 'Abort Transaction',
        
        // Log
        log: '📋 Log',
        clearLog: 'Clear Log',
        
        // Language
        language: '🌐 Language',
        english: 'English',
        japanese: '日本語',
        
        // Status Messages
        apiKeyRequired: 'API Key is required',
        setupFirst: 'Please run setup first',
        invalidAmount: 'Invalid payment amount',
        invalidUrl: 'Invalid URL format',
        urlUpdated: 'API URL updated',
        
        // States
        notAvailable: '-- Not Available --',
        
        // State Descriptions
        stateIdleDescription: 'Hydra Head is closed. Click "Start Transaction" to proceed to the next phase',
        stateInitialDescription: 'Initialization work is in progress to open the Hydra Head',
        stateInitDescription: 'Hydra Head initialization is in progress. Will proceed to next phase when wallet UTXOs are committed',
        stateHeadIsInitializingDescription: 'Hydra Head is being initialized',
        stateHeadIsOpenDescription: 'Hydra Head is open and ready for L2 transactions',
        stateHeadIsClosedDescription: 'Hydra Head has been closed',
        stateCommittedDescription: 'Commit transaction has been processed',
        stateTxValidDescription: 'Transaction is valid and confirmed',
        stateTxInvalidDescription: 'Transaction is invalid or failed',
        stateSnapshotConfirmedDescription: 'L2 snapshot has been confirmed',
        stateReadyToFanoutDescription: 'Ready to distribute final balances',
        stateFanoutPossibleDescription: 'Final balance distribution is possible',
        stateOpenDescription: 'L2 channel is open for payments',
        stateClosingDescription: 'Hydra Head Close process is in progress to finalize L2 transaction contents',
        stateClosedDescription: 'ESCROW transaction has been closed',
        stateFailedDescription: 'ESCROW transaction has failed',
        
        // Status Messages
        hydraHeadOpenMessage: 'Hydra Head is now open. Fast L2 payments are available.',
        hydraHeadInitializationMessage: 'Hydra Head initialization request issued. Initialization is in progress.',
        hydraHeadCloseRequestMessage: 'Hydra Head close request issued. Close process is in progress.',
        hydraHeadClosedTimerMessage: 'Hydra Head has been closed. L2 transaction finalization process is in progress. {0} seconds elapsed',
        hydraHeadClosingTimerMessage: 'Hydra Head close is in progress. {0} seconds elapsed',
        apiKeyAcquiredMessage: 'API Key acquisition completed',
        initializationInProgressMessage: 'Initialization process is currently in progress. {0} seconds elapsed',
        paymentSuccessMessage: 'Payment of {0} lovelace completed successfully.',
        
        // Log Messages - Action messages
        initializationMessage: '🚀 Hydra Escrow API Tester initialized',
        languageChanged: '🌐 Language changed to',
        apiUrlUpdated: '✅ API URL updated to',
        invalidUrlFormat: '❌ Invalid URL format',
        startingApiKeyAcquisition: '🔧 Starting API key acquisition...',
        apiKeyAcquired: '✅ API Key acquired',
        aliceL1EscrowAddress: '📍 Alice L1 Escrow Address',
        gettingBobL1Balance: '💰 Getting Bob L1 balance...',
        apiKeyAcquisitionCompleted: '✅ API Key acquisition completed',
        apiKeyAcquisitionFailed: '❌ API Key acquisition failed',
        startingTransaction: '🚀 Starting transaction...',
        transactionStarted: '✅ Transaction started',
        transactionStartFailed: '❌ Transaction start failed',
        refreshingBalances: '📊 Refreshing balances...',
        hydraStateInfo: '🔍 Hydra state',
        bobL1BalanceUpdated: '✅ Bob L1 balance updated',
        stateOpenBobL1Skipped: '⚠️ State is Open - Bob L1 balance update skipped',
        allBalancesUpdated: '✅ All balances updated',
        failedToRefreshBalances: '❌ Failed to refresh balances',
        executingL2Payment: '💰 Executing L2 payment',
        paymentCompleted: '✅ Payment completed',
        updatingBobL2BalanceAfterPayment: '💰 Updating Bob L2 balance after payment...',
        bobL2BalanceUpdatedAfterPayment: '✅ Bob L2 balance updated after payment',
        failedToUpdateBobL2Balance: '⚠️ Failed to update Bob L2 balance',
        paymentFailed: '❌ Payment failed',
        closingTransaction: '🔒 Closing transaction...',
        closeInitiated: '✅ Close initiated',
        closeFailed: '❌ Close failed',
        abortingTransaction: '🛑 Aborting transaction...',
        transactionAborted: '✅ Transaction aborted',
        abortFailed: '❌ Abort failed',
        gettingServerState: '🔍 Getting server state...',
        serverStateUpdated: '✅ Server state updated',
        failedToGetServerState: '❌ Failed to get server state',
        startingStatusPolling: '🔄 Starting status polling every 5 seconds...',
        stateChangedToOpen: '🎉 State changed to Open - refreshing L2 balances...',
        statusPollingError: '⚠️ Status polling error',
        statusPollingStopped: '⏹️ Status polling stopped',
        
        // Manual API execution messages
        executingManualSetup: '🚀 Executing manual /setup request...',
        apiKeyObtainedAndSaved: '✅ API Key obtained and saved',
        setupResponseReceived: '✅ /setup response',
        setupRequestFailed: '❌ /setup request failed',
        executingManualStart: '🚀 Executing manual /start request...',
        startResponseReceived: '✅ /start response',
        startRequestFailed: '❌ /start request failed',
        executingManualStatus: '📊 Executing manual /status request...',
        statusResponseReceived: '✅ /status response',
        statusRequestFailed: '❌ /status request failed',
        executingManualBalance: '💰 Executing manual /balance request...',
        balanceResponseReceived: '✅ /balance response',
        balanceRequestFailed: '❌ /balance request failed',
        executingManualBalanceL2: '⚡ Executing manual /balancel2 request...',
        balanceL2ResponseReceived: '✅ /balancel2 response',
        balanceL2RequestFailed: '❌ /balancel2 request failed',
        executingManualPayment: '💸 Executing manual /payment request',
        paymentResponseReceived: '✅ /payment response',
        paymentRequestFailed: '❌ /payment request failed',
        executingManualClose: '🔒 Executing manual /close request...',
        closeResponseReceived: '✅ /close response',
        closeRequestFailed: '❌ /close request failed',
        executingManualAbort: '🛑 Executing manual /abort request...',
        abortResponseReceived: '✅ /abort response',
        abortRequestFailed: '❌ /abort request failed',
        executingManualWithdrawal: '💳 Executing manual /withdrawal request',
        withdrawalResponseReceived: '✅ /withdrawal response',
        withdrawalRequestFailed: '❌ /withdrawal request failed',
        executingManualRefund: '↩️ Executing manual /refund request',
        refundResponseReceived: '✅ /refund response',
        refundRequestFailed: '❌ /refund request failed',
        
        // Form validation messages
        pleaseEnterWithdrawalAddress: '⚠️ Please enter withdrawal address',
        pleaseEnterRefundAddress: '⚠️ Please enter refund address',
        
        // API request messages
        apiRequestLog: '🌐',
        apiResponseLog: '📥 Response',
        
        // Placeholder texts
        placeholderPaymentAmount: '1000000',
        placeholderWithdrawalAddress: 'addr_test1...',
        placeholderRefundAddress: 'addr_test1...',
        
        // Manual API Execution
        manualApiExecution: '🔧 Manual API Execution',
        manualApiDescription: 'Execute each API endpoint individually. API Key is automatically set.',
        setupApiManual: '🚀 /setup',
        setupApiDesc: 'Setup ESCROW and generate API Key',
        executeSetup: 'Execute',
        senderAddress: 'Sender Address:',
        startApiManual: '🚀 /start',
        startApiDesc: 'Start ESCROW transaction',
        executeStart: 'Execute',
        statusApi: '📊 /status',
        statusApiDesc: 'Get ESCROW status and Alice L2 balance',
        executeStatus: 'Execute',
        balanceApi: '💰 /balance',
        balanceApiDesc: 'Get Bob L1 ESCROW balance',
        executeBalance: 'Execute',
        balancel2Api: '⚡ /balancel2',
        balancel2ApiDesc: 'Get Bob L2 ESCROW balance',
        executeBalanceL2: 'Execute',
        paymentApiManual: '💸 /payment',
        paymentApiDesc: 'Execute L2 payment',
        executePaymentManual: 'Execute',
        closeApiManual: '🔒 /close',
        closeApiDesc: 'Close ESCROW transaction',
        executeClose: 'Execute',
        abortApiManual: '🛑 /abort',
        abortApiDesc: 'Abort ESCROW transaction',
        executeAbort: 'Execute',
        withdrawalApiManual: '💳 /withdrawal',
        withdrawalApiDesc: 'Withdraw from Bob L1 wallet',
        executeWithdrawal: 'Execute',
        refundApiManual: '↩️ /refund',
        refundApiDesc: 'Refund from Alice L1 wallet',
        executeRefund: 'Execute',
        amount: 'Amount:',
        toAddress: 'To Address:'
    },
    
    ja: {
        // App Title
        appTitle: '🔗 Cardano Hydra Wrapper API テストアプリ',
        
        // API Configuration
        apiConfig: '⚙️ API 設定',
        apiBaseUrl: 'API Base URL:',
        updateUrl: 'URL更新',
        
        // Setup & Start
        setupStart: '🚀 API 操作',
        setupButton: 'APIキー取得',
        startButton: '取引開始',
        refreshBalance: '残高更新',
        getServerState: '最新情報取得',
        serverState: '🔍 サーバー状態:',
        setupInProgress: 'セットアップ開始中...',
        setupCompleted: 'APIキーの取得を完了しました。取引開始が可能です。',
        setupFailed: 'セットアップ失敗',
        
        // Wallet Balance
        walletBalance: '💰 ウォレット残高',
        aliceL1Balance: '🏦 Alice ESCROW L1 残高',
        aliceL2Balance: '⚡ Alice ESCROW L2 残高',
        bobL1Balance: '🏦 Bob ESCROW L1 残高',
        bobL2Balance: '⚡ Bob ESCROW L2 残高',
        address: 'アドレス:',
        
        // L2 Payment
        l2Payment: '💸 L2 決済',
        paymentAmount: '送金額 (lovelace):',
        paymentAmountLabel: '送金額',
        executePayment: 'L2 送金実行',
        
        // Transaction Control
        closeTransaction: '取引終了',
        abortTransaction: '取引中止',
        
        // Log
        log: '📋 ログ',
        clearLog: 'ログクリア',
        
        // Language
        language: '🌐 言語',
        english: 'English',
        japanese: '日本語',
        
        // Status Messages
        apiKeyRequired: 'API Keyが必要です',
        setupFirst: '最初にセットアップを実行してください',
        invalidAmount: '無効な送金額です',
        invalidUrl: '無効なURL形式です',
        urlUpdated: 'API URLが更新されました',
        
        // States
        notAvailable: '-- 利用不可 --',
        
        // State Descriptions
        stateIdleDescription: 'Hydra HeadがCloseされている状態です。「取引開始」で次のフェーズへ移行します',
        stateInitialDescription: 'Hydra Head を Openする為の初期化作業を実施中です',
        stateInitDescription: 'Hydra Headの初期化中です。各ウォレットのUTXOがコミットされると次のフェーズへ移行します',
        stateHeadIsInitializingDescription: 'Hydra Headを初期化中です',
        stateHeadIsOpenDescription: 'Hydra Headが開いており、L2取引の準備ができています',
        stateHeadIsClosedDescription: 'Hydra Headが閉じられました',
        stateCommittedDescription: 'コミット取引が処理されました',
        stateTxValidDescription: '取引は有効で、確認されています',
        stateTxInvalidDescription: '取引が無効または失敗しました',
        stateSnapshotConfirmedDescription: 'L2スナップショットが確認されました',
        stateReadyToFanoutDescription: '最終残高の配布準備が完了しています',
        stateFanoutPossibleDescription: '最終残高の配布が可能です',
        stateOpenDescription: 'L2チャンネルが決済のため開いています',
        stateClosingDescription: 'L2取引内容を確定させる為に、Hydra Head Close 処理を実行中です',
        stateClosedDescription: 'ESCROW取引が終了しました',
        stateFailedDescription: 'ESCROW取引が失敗しました',
        
        // Status Messages
        hydraHeadOpenMessage: 'Hydra Head が Openしました。高速なL2決済が使用可能です。',
        hydraHeadInitializationMessage: 'Hydra Head の初期化要求を発行。初期化を実行中です。',
        hydraHeadCloseRequestMessage: 'Hydra Head の Close要求を発行しました。Close処理を実行中です。',
        hydraHeadClosedTimerMessage: 'Hydra HeadがCloseされました。L2取引の確定処理を実行中です。{0}秒経過',
        hydraHeadClosingTimerMessage: 'Hydra Head のClose処理を実行中です。{0}秒経過',
        apiKeyAcquiredMessage: 'APIキー取得完了',
        initializationInProgressMessage: '現在初期化処理を実行中です。{0}秒経過',
        paymentSuccessMessage: '{0} lovelace の送金が成功しました。',
        
        // Log Messages - Action messages
        initializationMessage: '🚀 Hydra Escrow API テスター初期化完了',
        languageChanged: '🌐 言語変更',
        apiUrlUpdated: '✅ API URL更新',
        invalidUrlFormat: '❌ 無効なURL形式',
        startingApiKeyAcquisition: '🔧 APIキー取得開始中...',
        apiKeyAcquired: '✅ APIキー取得完了',
        aliceL1EscrowAddress: '📍 Alice L1 エスクローアドレス',
        gettingBobL1Balance: '💰 Bob L1残高取得中...',
        apiKeyAcquisitionCompleted: '✅ APIキー取得処理完了',
        apiKeyAcquisitionFailed: '❌ APIキー取得失敗',
        startingTransaction: '🚀 取引開始中...',
        transactionStarted: '✅ 取引開始完了',
        transactionStartFailed: '❌ 取引開始失敗',
        refreshingBalances: '📊 残高更新中...',
        hydraStateInfo: '🔍 Hydra状態',
        bobL1BalanceUpdated: '✅ Bob L1残高更新完了',
        stateOpenBobL1Skipped: '⚠️ 状態がOpenのため Bob L1残高更新をスキップ',
        allBalancesUpdated: '✅ 全残高更新完了',
        failedToRefreshBalances: '❌ 残高更新失敗',
        executingL2Payment: '💰 L2決済実行中',
        paymentCompleted: '✅ 決済完了',
        updatingBobL2BalanceAfterPayment: '💰 決済後のBob L2残高更新中...',
        bobL2BalanceUpdatedAfterPayment: '✅ 決済後のBob L2残高更新完了',
        failedToUpdateBobL2Balance: '⚠️ Bob L2残高更新失敗',
        paymentFailed: '❌ 決済失敗',
        closingTransaction: '🔒 取引終了処理中...',
        closeInitiated: '✅ 終了処理開始',
        closeFailed: '❌ 終了処理失敗',
        abortingTransaction: '🛑 取引中断処理中...',
        transactionAborted: '✅ 取引中断完了',
        abortFailed: '❌ 中断処理失敗',
        gettingServerState: '🔍 サーバー状態取得中...',
        serverStateUpdated: '✅ サーバー状態更新完了',
        failedToGetServerState: '❌ サーバー状態取得失敗',
        startingStatusPolling: '🔄 5秒間隔の状態ポーリング開始...',
        stateChangedToOpen: '🎉 状態がOpenに変更 - L2残高更新中...',
        statusPollingError: '⚠️ 状態ポーリングエラー',
        statusPollingStopped: '⏹️ 状態ポーリング停止',
        
        // Manual API execution messages
        executingManualSetup: '🚀 手動 /setup リクエスト実行中...',
        apiKeyObtainedAndSaved: '✅ APIキー取得・保存完了',
        setupResponseReceived: '✅ /setup レスポンス受信',
        setupRequestFailed: '❌ /setup リクエスト失敗',
        executingManualStart: '🚀 手動 /start リクエスト実行中...',
        startResponseReceived: '✅ /start レスポンス受信',
        startRequestFailed: '❌ /start リクエスト失敗',
        executingManualStatus: '📊 手動 /status リクエスト実行中...',
        statusResponseReceived: '✅ /status レスポンス受信',
        statusRequestFailed: '❌ /status リクエスト失敗',
        executingManualBalance: '💰 手動 /balance リクエスト実行中...',
        balanceResponseReceived: '✅ /balance レスポンス受信',
        balanceRequestFailed: '❌ /balance リクエスト失敗',
        executingManualBalanceL2: '⚡ 手動 /balancel2 リクエスト実行中...',
        balanceL2ResponseReceived: '✅ /balancel2 レスポンス受信',
        balanceL2RequestFailed: '❌ /balancel2 リクエスト失敗',
        executingManualPayment: '💸 手動 /payment リクエスト実行中',
        paymentResponseReceived: '✅ /payment レスポンス受信',
        paymentRequestFailed: '❌ /payment リクエスト失敗',
        executingManualClose: '🔒 手動 /close リクエスト実行中...',
        closeResponseReceived: '✅ /close レスポンス受信',
        closeRequestFailed: '❌ /close リクエスト失敗',
        executingManualAbort: '🛑 手動 /abort リクエスト実行中...',
        abortResponseReceived: '✅ /abort レスポンス受信',
        abortRequestFailed: '❌ /abort リクエスト失敗',
        executingManualWithdrawal: '💳 手動 /withdrawal リクエスト実行中',
        withdrawalResponseReceived: '✅ /withdrawal レスポンス受信',
        withdrawalRequestFailed: '❌ /withdrawal リクエスト失敗',
        executingManualRefund: '↩️ 手動 /refund リクエスト実行中',
        refundResponseReceived: '✅ /refund レスポンス受信',
        refundRequestFailed: '❌ /refund リクエスト失敗',
        
        // Form validation messages
        pleaseEnterWithdrawalAddress: '⚠️ 引き出し先アドレスを入力してください',
        pleaseEnterRefundAddress: '⚠️ 返金先アドレスを入力してください',
        
        // API request messages
        apiRequestLog: '🌐',
        apiResponseLog: '📥 レスポンス',
        
        // Placeholder texts
        placeholderPaymentAmount: '1000000',
        placeholderWithdrawalAddress: 'addr_test1...',
        placeholderRefundAddress: 'addr_test1...',
        
        // Manual API Execution
        manualApiExecution: '🔧 手動API実行',
        manualApiDescription: '各APIエンドポイントを個別に実行できます。API Keyは自動で設定されます。',
        setupApiManual: '🚀 /setup',
        setupApiDesc: 'ESCROWのセットアップとAPI Key生成',
        executeSetup: '実行',
        senderAddress: '送金元アドレス:',
        startApiManual: '🚀 /start',
        startApiDesc: 'ESCROW取引を開始',
        executeStart: '実行',
        statusApi: '📊 /status',
        statusApiDesc: 'ESCROW状態とAlice L2残高を取得',
        executeStatus: '実行',
        balanceApi: '💰 /balance',
        balanceApiDesc: 'Bob L1 ESCROW残高を取得',
        executeBalance: '実行',
        balancel2Api: '⚡ /balancel2',
        balancel2ApiDesc: 'Bob L2 ESCROW残高を取得',
        executeBalanceL2: '実行',
        paymentApiManual: '💸 /payment',
        paymentApiDesc: 'L2決済を実行',
        executePaymentManual: '実行',
        closeApiManual: '🔒 /close',
        closeApiDesc: 'ESCROW取引を終了',
        executeClose: '実行',
        abortApiManual: '🛑 /abort',
        abortApiDesc: 'ESCROW取引を中断',
        executeAbort: '実行',
        withdrawalApiManual: '💳 /withdrawal',
        withdrawalApiDesc: 'Bob L1ウォレットから引き出し',
        executeWithdrawal: '実行',
        refundApiManual: '↩️ /refund',
        refundApiDesc: 'Alice L1ウォレットから返金',
        executeRefund: '実行',
        amount: '金額:',
        toAddress: '送金先:'
    }
};

export class I18n {
    private currentLanguage: Language = 'ja'; // Default to Japanese
    private elements: Map<string, Element[]> = new Map();
    
    constructor() {
        this.initializeFromStorage();
    }
    
    private initializeFromStorage(): void {
        const savedLang = localStorage.getItem('hydra-app-language') as Language;
        if (savedLang && (savedLang === 'en' || savedLang === 'ja')) {
            this.currentLanguage = savedLang;
        }
    }
    
    public getCurrentLanguage(): Language {
        return this.currentLanguage;
    }
    
    public setLanguage(lang: Language): void {
        this.currentLanguage = lang;
        localStorage.setItem('hydra-app-language', lang);
        this.updateUI();
    }
    
    public getMessage(key: keyof I18nMessages): string {
        return messages[this.currentLanguage][key];
    }
    
    public getStateDescription(state: string): string {
        const stateKey = `state${state}Description` as keyof I18nMessages;
        if (stateKey in messages[this.currentLanguage]) {
            return this.getMessage(stateKey);
        }
        return `Status: ${state}`;
    }
    
    public formatMessage(key: keyof I18nMessages, ...args: string[]): string {
        let message = this.getMessage(key);
        args.forEach((arg, index) => {
            message = message.replace(`{${index}}`, arg);
        });
        return message;
    }
    
    public registerElement(key: keyof I18nMessages, element: Element): void {
        if (!this.elements.has(key)) {
            this.elements.set(key, []);
        }
        this.elements.get(key)!.push(element);
    }
    
    public updateUI(): void {
        // Update registered elements
        this.elements.forEach((elements, key) => {
            const message = this.getMessage(key as keyof I18nMessages);
            elements.forEach(element => {
                if (element instanceof HTMLInputElement && element.type !== 'button') {
                    element.placeholder = message;
                } else {
                    element.textContent = message;
                }
            });
        });
        
        // Update language selector
        this.updateLanguageSelector();
    }
    
    private updateLanguageSelector(): void {
        const langSelect = document.getElementById('langSelect') as HTMLSelectElement;
        if (langSelect) {
            langSelect.value = this.currentLanguage;
        }
    }
    
    public initializeUI(): void {
        // Register all translatable elements
        this.registerTranslatableElements();
        this.updateUI();
    }
    
    private registerTranslatableElements(): void {
        // Title
        const titleElement = document.querySelector('h1');
        if (titleElement) {
            this.registerElement('appTitle', titleElement);
        }
        
        // Register all elements with data-i18n attribute
        const translatableElements = document.querySelectorAll('[data-i18n]');
        translatableElements.forEach(element => {
            const keyAttr = element.getAttribute('data-i18n');
            if (keyAttr && keyAttr in messages.en) {
                const key = keyAttr as keyof I18nMessages;
                this.registerElement(key, element);
            }
        });
        
        // Register placeholder elements
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const keyAttr = element.getAttribute('data-i18n-placeholder');
            if (keyAttr && keyAttr in messages.en) {
                const key = keyAttr as keyof I18nMessages;
                this.registerElement(key, element);
            }
        });
    }
}