import { I18n, Language } from './i18n.js';

declare const __API_BASE_URL__: string;
declare const __API_KEY__: string | null;

interface ApiConfig {
    baseUrl: string;
    apiKey: string | null;
}

interface Balance {
    ada: number;
    lovelace: number;
}


class HydraEscrowTester {
    private config: ApiConfig = {
        baseUrl: __API_BASE_URL__,
        apiKey: __API_KEY__
    };

    private i18n: I18n;
    private hydraState: string = 'Idle';
    private isStartCompleted: boolean = false;
    private statusPollingInterval: NodeJS.Timeout | null = null;
    private initializationStartTime: Date | null = null;
    private initializationTimerInterval: NodeJS.Timeout | null = null;
    private closingStartTime: Date | null = null;
    private closingTimerInterval: NodeJS.Timeout | null = null;
    private closedStartTime: Date | null = null;
    private closedTimerInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.i18n = new I18n();
        this.initializeEventListeners();
        this.i18n.initializeUI();
        this.loadInitialBalances();
        this.updateButtonStates();
        this.log(this.i18n.getMessage('initializationMessage'));
    }

    private handleLanguageChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        const newLang = target.value as Language;
        this.i18n.setLanguage(newLang);
        this.log(`${this.i18n.getMessage('languageChanged')}: ${newLang}`);
    }

    private loadInitialBalances(): void {
        this.showL1Balances();
        this.hideL2Balances();
    }

    private showL1Balances(): void {
        const aliceL1Card = document.querySelector('.alice-section .balance-card:first-child') as HTMLElement;
        const bobL1Card = document.querySelector('.bob-section .balance-card:first-child') as HTMLElement;
        
        if (aliceL1Card) aliceL1Card.style.display = 'block';
        if (bobL1Card) bobL1Card.style.display = 'block';
    }

    private hideL2Balances(): void {
        const aliceL2Card = document.querySelector('.alice-section .balance-card:last-child') as HTMLElement;
        const bobL2Card = document.querySelector('.bob-section .balance-card:last-child') as HTMLElement;
        
        if (aliceL2Card) {
            aliceL2Card.style.display = 'none';
        }
        if (bobL2Card) {
            bobL2Card.style.display = 'none';
        }
    }

    private showL2Balances(): void {
        const aliceL2Card = document.querySelector('.alice-section .balance-card:last-child') as HTMLElement;
        const bobL2Card = document.querySelector('.bob-section .balance-card:last-child') as HTMLElement;
        
        if (aliceL2Card) {
            aliceL2Card.style.display = 'block';
        }
        if (bobL2Card) {
            bobL2Card.style.display = 'block';
        }
    }

    private checkHydraStateAndUpdateL2Display(state?: string): void {
        const currentState = state || this.hydraState;
        if (currentState === 'Open' || currentState === 'Closing') {
            this.showL2Balances();
        } else {
            this.hideL2Balances();
        }
    }

    private initializeEventListeners(): void {
        document.getElementById('langSelect')?.addEventListener('change', (e) => this.handleLanguageChange(e));
        document.getElementById('updateUrlBtn')?.addEventListener('click', () => this.updateApiUrl());
        document.getElementById('setupBtn')?.addEventListener('click', () => this.setupAndStart());
        document.getElementById('startBtn')?.addEventListener('click', () => this.startTransaction());
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshBalances());
        document.getElementById('getServerStateBtn')?.addEventListener('click', () => this.getServerState());
        document.getElementById('paymentBtn')?.addEventListener('click', () => this.executePayment());
        document.getElementById('closeBtn')?.addEventListener('click', () => this.closeTransaction());
        document.getElementById('abortBtn')?.addEventListener('click', () => this.abortTransaction());
        
        document.getElementById('manualSetupBtn')?.addEventListener('click', () => this.executeManualSetup());
        document.getElementById('manualStartBtn')?.addEventListener('click', () => this.executeManualStart());
        document.getElementById('manualStatusBtn')?.addEventListener('click', () => this.executeManualStatus());
        document.getElementById('manualBalanceBtn')?.addEventListener('click', () => this.executeManualBalance());
        document.getElementById('manualBalanceL2Btn')?.addEventListener('click', () => this.executeManualBalanceL2());
        document.getElementById('manualPaymentBtn')?.addEventListener('click', () => this.executeManualPayment());
        document.getElementById('manualCloseBtn')?.addEventListener('click', () => this.executeManualClose());
        document.getElementById('manualAbortBtn')?.addEventListener('click', () => this.executeManualAbort());
        document.getElementById('manualWithdrawalBtn')?.addEventListener('click', () => this.executeManualWithdrawal());
        document.getElementById('manualRefundBtn')?.addEventListener('click', () => this.executeManualRefund());
        
        this.updateUrlDisplay();
    }

    private updateApiUrl(): void {
        const urlInput = document.getElementById('apiBaseUrl') as HTMLInputElement;
        const newUrl = urlInput.value.trim();
        
        if (!newUrl) {
            this.log(this.i18n.getMessage('invalidUrl'));
            return;
        }
        
        try {
            new URL(newUrl);
            
            this.config.baseUrl = newUrl.replace(/\/$/, '');
            this.config.apiKey = null;
            this.updateButtonStates();
            
            this.updateUrlDisplay();
            this.log(`${this.i18n.getMessage('apiUrlUpdated')}: ${this.config.baseUrl}`);
            this.showStatus(`${this.i18n.getMessage('urlUpdated')}: ${this.config.baseUrl}`, 'success');
        } catch (error) {
            this.log(`${this.i18n.getMessage('invalidUrlFormat')}: ${newUrl}`);
            this.showStatus(this.i18n.getMessage('invalidUrl'), 'error');
        }
    }
    
    private updateUrlDisplay(): void {
        const urlInput = document.getElementById('apiBaseUrl') as HTMLInputElement;
        if (urlInput) {
            urlInput.value = this.config.baseUrl;
        }
    }

    private async setupAndStart(): Promise<void> {
        try {
            this.log(this.i18n.getMessage('startingApiKeyAcquisition'));
            this.showStatus(this.i18n.getMessage('setupInProgress'), 'info');
            
            const setupResponse = await this.callApi('/setup', 'POST', {});
            
            if (setupResponse.apiKey) {
                this.config.apiKey = setupResponse.apiKey;
                this.log(`${this.i18n.getMessage('apiKeyAcquired')}: ${setupResponse.apiKey}`);
                this.log(`${this.i18n.getMessage('aliceL1EscrowAddress')}: ${setupResponse.escrowL1Address}`);
                
                this.updateButtonStates();
                
                this.updateBalance('aliceL1Balance', setupResponse.balance);
                this.updateAddress('aliceL1Address', setupResponse.escrowL1Address);
                
                this.updateServerState(setupResponse.state);
                
                this.log(this.i18n.getMessage('gettingBobL1Balance'));
                const bobBalanceResponse = await this.callApi('/balance', 'POST', {
                    apiKey: this.config.apiKey
                });
                
                this.updateBalance('bobL1Balance', bobBalanceResponse.balance);
                this.updateAddress('bobL1Address', bobBalanceResponse.escrowL1Address);
                
                this.showStatus(this.i18n.getMessage('apiKeyAcquiredMessage'), 'success');
                this.log(this.i18n.getMessage('apiKeyAcquisitionCompleted'));
                
                this.startStatusPolling();
            } else {
                throw new Error('API Key not received');
            }
        } catch (error) {
            this.log(`${this.i18n.getMessage('apiKeyAcquisitionFailed')}: ${error}`);
            this.showStatus(this.i18n.getMessage('setupFailed'), 'error');
        }
    }

    private async startTransaction(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            this.showStatus(this.i18n.getMessage('setupFirst'), 'error');
            return;
        }

        try {
            this.log(this.i18n.getMessage('startingTransaction'));
            this.showStatus(this.i18n.getMessage('setupInProgress'), 'info');
            
            const startResponse = await this.callApi('/start', 'POST', {
                apiKey: this.config.apiKey
            });
            
            this.log(`${this.i18n.getMessage('transactionStarted')}: ${startResponse.message}`);
            this.showStatus(this.i18n.getMessage('hydraHeadInitializationMessage'), 'info');
            this.startInitializationTimer();
            
            this.isStartCompleted = true;
            
            if (startResponse.state) {
                this.updateServerState(startResponse.state);
            }
            
            await this.refreshBalances();
        } catch (error) {
            this.log(`${this.i18n.getMessage('transactionStartFailed')}: ${error}`);
            this.showStatus(this.i18n.getMessage('transactionStartFailed'), 'error');
        }
    }

    private async refreshBalances(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('refreshingBalances'));

            const aliceStatus = await this.callApi('/status', 'POST', {
                apiKey: this.config.apiKey
            });

            this.updateBalance('aliceL2Balance', aliceStatus.balance);
            this.updateAddress('aliceL2Address', aliceStatus.escrowL1Address);
            
            this.updateServerState(aliceStatus.state);
            
            const isStateOpen = aliceStatus.state === 'Open';
            this.log(`${this.i18n.getMessage('hydraStateInfo')}: ${aliceStatus.state}, Skip Bob L1 update: ${isStateOpen}`);

            if (!isStateOpen) {
                const bobL1Balance = await this.callApi('/balance', 'POST', {
                    apiKey: this.config.apiKey
                });
                
                this.updateBalance('bobL1Balance', bobL1Balance.balance);
                this.updateAddress('bobL1Address', bobL1Balance.escrowL1Address);
                this.log(this.i18n.getMessage('bobL1BalanceUpdated'));
            } else {
                this.log(this.i18n.getMessage('stateOpenBobL1Skipped'));
            }

            const bobL2Balance = await this.callApi('/balancel2', 'POST', {
                apiKey: this.config.apiKey
            });

            this.updateBalance('bobL2Balance', bobL2Balance.balance);
            this.updateAddress('bobL2Address', bobL2Balance.escrowL1Address);
            
            this.log(this.i18n.getMessage('allBalancesUpdated'));
        } catch (error) {
            this.log(`${this.i18n.getMessage('failedToRefreshBalances')}: ${error}`);
        }
    }

    private async executePayment(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        const amountInput = document.getElementById('paymentAmount') as HTMLInputElement;
        const amount = parseInt(amountInput.value);

        if (!amount || amount <= 0) {
            this.log(`⚠️ ${this.i18n.getMessage('invalidAmount')}`);
            return;
        }

        try {
            this.log(`${this.i18n.getMessage('executingL2Payment')}: ${amount} lovelace`);
            
            const paymentResponse = await this.callApi('/payment', 'POST', {
                apiKey: this.config.apiKey,
                amount: amount
            });

            this.log(`${this.i18n.getMessage('paymentCompleted')}: ${paymentResponse.message}`);
            
            this.showStatus(this.i18n.formatMessage('paymentSuccessMessage', amount.toString()), 'success');
            
            this.updateBalance('aliceL2Balance', paymentResponse.balance);
            
            try {
                this.log(this.i18n.getMessage('updatingBobL2BalanceAfterPayment'));
                const bobL2Balance = await this.callApi('/balancel2', 'POST', {
                    apiKey: this.config.apiKey
                });
                
                this.updateBalance('bobL2Balance', bobL2Balance.balance);
                this.log(this.i18n.getMessage('bobL2BalanceUpdatedAfterPayment'));
            } catch (bobBalanceError) {
                this.log(`${this.i18n.getMessage('failedToUpdateBobL2Balance')}: ${bobBalanceError}`);
            }
            
            try {
                this.log('🚗 Sending drive request...');
            } catch (driveError) {
                this.log(`⚠️ Drive request failed: ${driveError}`);
            }
        } catch (error) {
            this.log(`${this.i18n.getMessage('paymentFailed')}: ${error}`);
        }
    }

    private async closeTransaction(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('closingTransaction'));
            this.showStatus(this.i18n.getMessage('hydraHeadCloseRequestMessage'), 'info');
            
            const closeResponse = await this.callApi('/close', 'POST', {
                apiKey: this.config.apiKey
            });

            this.log(`${this.i18n.getMessage('closeInitiated')}: ${closeResponse.message}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('closeFailed')}: ${error}`);
            this.showStatus(this.i18n.getMessage('closeFailed'), 'error');
        }
    }

    private async abortTransaction(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('abortingTransaction'));
            
            const abortResponse = await this.callApi('/abort', 'POST', {
                apiKey: this.config.apiKey
            });

            this.log(`${this.i18n.getMessage('transactionAborted')}: ${abortResponse.message}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('abortFailed')}: ${error}`);
        }
    }

    private async callApi(endpoint: string, method: string, data?: any): Promise<any> {
        const url = `${this.config.baseUrl}${endpoint}`;
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        this.log(`${this.i18n.getMessage('apiRequestLog')} ${method} ${endpoint} ${data ? JSON.stringify(data) : ''}`);

        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseData.error || responseData.message || 'Unknown error'}`);
        }

        this.log(`${this.i18n.getMessage('apiResponseLog')}: ${JSON.stringify(responseData, null, 2)}`);
        return responseData;
    }

    private updateBalance(elementId: string, balance: Balance): void {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `${balance.ada.toFixed(2)} ADA (${balance.lovelace.toLocaleString()} lovelace)`;
        }
    }

    private updateAddress(elementId: string, address: string): void {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `Address: ${address}`;
        }
    }

    private updateServerState(state: string): void {
        this.hydraState = state;
        this.checkHydraStateAndUpdateL2Display(state);
        
        const element = document.getElementById('serverStateDisplay');
        if (element) {
            element.textContent = state;
            element.style.color = state === 'Open' ? '#28a745' : 
                                 state === 'HeadIsInitializing' || state === 'Init' ? '#ffc107' :
                                 state === 'Initial' ? '#17a2b8' :
                                 state === 'Closing' ? '#ff8c00' :
                                 state === 'Closed' ? '#dc3545' :
                                 state === 'Idle' ? '#6c757d' : '#007bff';
        }

        this.updateStateDescription(state);
        
        this.updateStatusMessageForState(state);
        
        this.updateButtonStates();
        
        const previousState = this.hydraState;
        if (previousState !== state) {
            this.updateStatusMessageForState(state);
        }
        
        this.checkHydraStateAndUpdateL2Display(state);
        
        this.hydraState = state;
    }

    private updateStatusMessageForState(state: string): void {
        switch (state) {
            case 'Initial':
                this.stopClosedTimer();
                if (!this.initializationStartTime) {
                    this.startInitializationTimer();
                }
                this.updateInitializationMessage();
                break;
            case 'Open':
                this.stopInitializationTimer();
                this.stopClosedTimer();
                this.showStatus(this.i18n.getMessage('hydraHeadOpenMessage'), 'success');
                break;
            case 'Closing':
                this.stopInitializationTimer();
                this.stopClosedTimer();
                if (!this.closingStartTime) {
                    this.startClosingTimer();
                }
                this.updateClosingMessage();
                break;
            case 'Closed':
                this.stopClosingTimer();
                if (!this.closedStartTime) {
                    this.startClosedTimer();
                }
                this.updateClosedMessage();
                break;
            default:
                this.stopClosedTimer();
                break;
        }
    }

    private updateStateDescription(state: string): void {
        const descriptionElement = document.getElementById('stateDescription');
        if (!descriptionElement) return;

        const description = this.i18n.getStateDescription(state);
        descriptionElement.textContent = description;
    }

    private async getServerState(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('gettingServerState'));
            
            const statusResponse = await this.callApi('/status', 'POST', {
                apiKey: this.config.apiKey
            });
            
            this.updateServerState(statusResponse.state);
            this.log(`${this.i18n.getMessage('serverStateUpdated')}: ${statusResponse.state}`);
            
        } catch (error) {
            this.log(`${this.i18n.getMessage('failedToGetServerState')}: ${error}`);
        }
    }

    private startStatusPolling(): void {
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
        }
        
        this.log(this.i18n.getMessage('startingStatusPolling'));
        
        this.statusPollingInterval = setInterval(async () => {
            if (!this.config.apiKey) {
                this.stopStatusPolling();
                return;
            }
            
            try {
                const statusResponse = await this.callApi('/status', 'POST', {
                    apiKey: this.config.apiKey
                });
                
                const previousState = this.hydraState;
                this.updateServerState(statusResponse.state);
                
                if (previousState !== 'Open' && statusResponse.state === 'Open') {
                    this.log(this.i18n.getMessage('stateChangedToOpen'));
                    await this.refreshBalances();
                }
                
            } catch (error) {
                this.log(`${this.i18n.getMessage('statusPollingError')}: ${error}`);
            }
        }, 5000);
    }

    private stopStatusPolling(): void {
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
            this.statusPollingInterval = null;
            this.log(this.i18n.getMessage('statusPollingStopped'));
        }
    }

    private showStatus(message: string, type: 'success' | 'error' | 'info'): void {
        const statusElement = document.getElementById('setupStatus');
        if (statusElement) {
            statusElement.innerHTML = `<div class="status ${type}">${message}</div>`;
        }
    }

    private log(message: string): void {
        const logElement = document.getElementById('logOutput');
        if (logElement) {
            const timestamp = new Date().toLocaleTimeString();
            logElement.textContent += `[${timestamp}] ${message}\n`;
            logElement.scrollTop = logElement.scrollHeight;
        }
        console.log(message);
    }

    private async executeManualSetup(): Promise<void> {
        try {
            this.log(this.i18n.getMessage('executingManualSetup'));
            const response = await this.callApi('/setup', 'POST', {});
            
            if (response.apiKey) {
                this.config.apiKey = response.apiKey;
                this.log(`${this.i18n.getMessage('apiKeyObtainedAndSaved')}: ${response.apiKey}`);
                
                this.updateButtonStates();
            }
            
            this.log(`${this.i18n.getMessage('setupResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('setupRequestFailed')}: ${error}`);
        }
    }

    private async executeManualStart(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('executingManualStart'));
            const response = await this.callApi('/start', 'POST', {
                apiKey: this.config.apiKey
            });
            this.log(`${this.i18n.getMessage('startResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('startRequestFailed')}: ${error}`);
        }
    }

    private async executeManualStatus(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('executingManualStatus'));
            const response = await this.callApi('/status', 'POST', {
                apiKey: this.config.apiKey
            });
            this.log(`${this.i18n.getMessage('statusResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('statusRequestFailed')}: ${error}`);
        }
    }

    private async executeManualBalance(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('executingManualBalance'));
            const response = await this.callApi('/balance', 'POST', {
                apiKey: this.config.apiKey
            });
            this.log(`${this.i18n.getMessage('balanceResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('balanceRequestFailed')}: ${error}`);
        }
    }

    private async executeManualBalanceL2(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('executingManualBalanceL2'));
            const response = await this.callApi('/balancel2', 'POST', {
                apiKey: this.config.apiKey
            });
            this.log(`${this.i18n.getMessage('balanceL2ResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('balanceL2RequestFailed')}: ${error}`);
        }
    }

    private async executeManualPayment(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        const amountInput = document.getElementById('manualPaymentAmount') as HTMLInputElement;
        const amount = parseInt(amountInput.value);

        if (!amount || amount <= 0) {
            this.log(`⚠️ ${this.i18n.getMessage('invalidAmount')}`);
            return;
        }

        try {
            this.log(`${this.i18n.getMessage('executingManualPayment')}: ${amount} lovelace`);
            const response = await this.callApi('/payment', 'POST', {
                apiKey: this.config.apiKey,
                amount: amount
            });
            this.log(`${this.i18n.getMessage('paymentResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('paymentRequestFailed')}: ${error}`);
        }
    }

    private async executeManualClose(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('executingManualClose'));
            const response = await this.callApi('/close', 'POST', {
                apiKey: this.config.apiKey
            });
            this.log(`${this.i18n.getMessage('closeResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('closeRequestFailed')}: ${error}`);
        }
    }

    private async executeManualAbort(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        try {
            this.log(this.i18n.getMessage('executingManualAbort'));
            const response = await this.callApi('/abort', 'POST', {
                apiKey: this.config.apiKey
            });
            this.log(`${this.i18n.getMessage('abortResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('abortRequestFailed')}: ${error}`);
        }
    }

    private async executeManualWithdrawal(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        const amountInput = document.getElementById('withdrawalAmount') as HTMLInputElement;
        const addressInput = document.getElementById('withdrawalAddress') as HTMLInputElement;
        const amount = parseInt(amountInput.value);
        const toAddress = addressInput.value.trim();

        if (!amount || amount <= 0) {
            this.log(`⚠️ ${this.i18n.getMessage('invalidAmount')}`);
            return;
        }

        if (!toAddress) {
            this.log(this.i18n.getMessage('pleaseEnterWithdrawalAddress'));
            return;
        }

        try {
            this.log(`${this.i18n.getMessage('executingManualWithdrawal')}: ${amount} lovelace to ${toAddress}`);
            const response = await this.callApi('/withdrawal', 'POST', {
                apiKey: this.config.apiKey,
                amount: amount,
                to: toAddress
            });
            this.log(`${this.i18n.getMessage('withdrawalResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('withdrawalRequestFailed')}: ${error}`);
        }
    }

    private async executeManualRefund(): Promise<void> {
        if (!this.config.apiKey) {
            this.log(`⚠️ ${this.i18n.getMessage('setupFirst')}`);
            return;
        }

        const amountInput = document.getElementById('refundAmount') as HTMLInputElement;
        const addressInput = document.getElementById('refundAddress') as HTMLInputElement;
        const amount = parseInt(amountInput.value);
        const toAddress = addressInput.value.trim();

        if (!amount || amount <= 0) {
            this.log(`⚠️ ${this.i18n.getMessage('invalidAmount')}`);
            return;
        }

        if (!toAddress) {
            this.log(this.i18n.getMessage('pleaseEnterRefundAddress'));
            return;
        }

        try {
            this.log(`${this.i18n.getMessage('executingManualRefund')}: ${amount} lovelace to ${toAddress}`);
            const response = await this.callApi('/refund', 'POST', {
                apiKey: this.config.apiKey,
                amount: amount,
                to: toAddress
            });
            this.log(`${this.i18n.getMessage('refundResponseReceived')}: ${JSON.stringify(response, null, 2)}`);
        } catch (error) {
            this.log(`${this.i18n.getMessage('refundRequestFailed')}: ${error}`);
        }
    }

    private startInitializationTimer(): void {
        if (this.initializationTimerInterval) {
            clearInterval(this.initializationTimerInterval);
        }
        
        this.initializationStartTime = new Date();
        this.initializationTimerInterval = setInterval(() => {
            this.updateInitializationMessage();
        }, 1000);
    }

    private stopInitializationTimer(): void {
        if (this.initializationTimerInterval) {
            clearInterval(this.initializationTimerInterval);
            this.initializationTimerInterval = null;
        }
        this.initializationStartTime = null;
    }

    private updateInitializationMessage(): void {
        if (!this.initializationStartTime) return;
        
        const elapsedSeconds = Math.floor((new Date().getTime() - this.initializationStartTime.getTime()) / 1000);
        const message = this.i18n.formatMessage('initializationInProgressMessage', elapsedSeconds.toString());
        this.showStatus(message, 'info');
    }

    private startClosingTimer(): void {
        if (this.closingTimerInterval) {
            clearInterval(this.closingTimerInterval);
        }
        
        this.closingStartTime = new Date();
        this.closingTimerInterval = setInterval(() => {
            this.updateClosingMessage();
        }, 1000);
    }

    private stopClosingTimer(): void {
        if (this.closingTimerInterval) {
            clearInterval(this.closingTimerInterval);
            this.closingTimerInterval = null;
        }
        this.closingStartTime = null;
    }

    private updateClosingMessage(): void {
        if (!this.closingStartTime) return;
        
        const elapsedSeconds = Math.floor((new Date().getTime() - this.closingStartTime.getTime()) / 1000);
        const message = this.i18n.formatMessage('hydraHeadClosingTimerMessage', elapsedSeconds.toString());
        this.showStatus(message, 'info');
    }

    private startClosedTimer(): void {
        if (this.closedTimerInterval) {
            clearInterval(this.closedTimerInterval);
        }
        
        this.closedStartTime = new Date();
        this.closedTimerInterval = setInterval(() => {
            this.updateClosedMessage();
        }, 1000);
    }

    private stopClosedTimer(): void {
        if (this.closedTimerInterval) {
            clearInterval(this.closedTimerInterval);
            this.closedTimerInterval = null;
        }
        this.closedStartTime = null;
    }

    private updateClosedMessage(): void {
        if (!this.closedStartTime) return;
        
        const elapsedSeconds = Math.floor((new Date().getTime() - this.closedStartTime.getTime()) / 1000);
        const message = this.i18n.formatMessage('hydraHeadClosedTimerMessage', elapsedSeconds.toString());
        this.showStatus(message, 'info');
    }

    private updateButtonStates(): void {
        const hasApiKey = !!this.config.apiKey;
        const isOpen = this.hydraState === 'Open';
        
        const apiRequiredButtons = [
            { id: 'startBtn', condition: hasApiKey },
            { id: 'refreshBtn', condition: hasApiKey },
            { id: 'getServerStateBtn', condition: hasApiKey },
            { id: 'abortBtn', condition: hasApiKey },
            { id: 'paymentBtn', condition: hasApiKey && isOpen },
            { id: 'closeBtn', condition: hasApiKey && isOpen }
        ];

        apiRequiredButtons.forEach(({ id, condition }) => {
            const button = document.getElementById(id) as HTMLButtonElement;
            if (button) {
                button.disabled = !condition;
                button.style.opacity = condition ? '1' : '0.6';
                button.style.cursor = condition ? 'pointer' : 'not-allowed';
            }
        });
    }
}

function clearLog(): void {
    const logElement = document.getElementById('logOutput');
    if (logElement) {
        logElement.textContent = '';
    }
}

(window as any).clearLog = clearLog;

document.addEventListener('DOMContentLoaded', () => {
    new HydraEscrowTester();
});