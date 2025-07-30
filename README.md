# Cardano Hydra Wrapper API

Cardano Hydra Wrapper API is an ESCROW transaction API leveraging the Hydra L2 scaling solution to achieve high-speed transactions.
The design philosophy aims to realize Cardano L1 transaction signing/sending, Hydra control, and L2 transfers with minimal API operations.

## API Specification

- [Cardano & Hydra Wrapper API](https://bypp.tech/apidoc/cardano-hydra-wrapper-api/)


## Quick Start

### Requirements

| Required Tool          | Version / Details                          |
|------------------------|--------------------------------------------|
| Node.js               | Version 24.0.0 or higher recommended       |
| cardano-node          | 10.1.2 [Setup complete](https://docs.cardano.org/cardano-testnets/getting-started) and running with 100% Ledger sync |
| cardano-cli           | 10.1.1.0                                   |
| hydra-node            | 0.22.3 [Setup complete](https://hydra.family/head-protocol/unstable/docs/tutorial#step-0-installation) and running |
| websocat              | 1.14.0                                     |
| curl                  | Must be installed                          |
| jq                    | Must be installed                          |

### Repository Clone

```bash
git clone https://github.com/bypptech/cardano-hydra-wrapper-api
cd cardano-hydra-wrapper-api
npm install
```

### Environment Configuration

```bash
cp .env.tmp .env
```
Edit the .env file to configure environment variables.

| Variable Name        | Description                                    |
|----------------------|------------------------------------------------|
| PORT                 | Port used by cardano-cli-wrapper               |
| URL_ALICE_HYDRA_NODE | Alice's Hydra node URL                         |
| URL_BOB_HYDRA_NODE   | Bob's Hydra node URL                           |
| PATH_PREFIX          | Cardano node path                              |
| TARGET_NETWORK       | Network settings (e.g., --testnet-magic 1)    |
| SEND_LOVELACE        | Default amount of ADA (Lovelace) sent in NewTx |
| TMP_COMMIT_FILE      | Temporary commit file path                     |
| TMP_SIGNED_FILE      | Temporary signed file path                     |
| TMP_UTXO_FILE        | Temporary UTXO file path                       |
| TMP_TX_FILE          | Temporary transaction file path                |

### Starting the API Server
```bash
npm run dev
```

### Starting the API Test App
```bash
cd cardano-hydra-wrapper-api/api-test-app
npm install
npm run dev
```
## Checking API Test App Operation
Access http://localhost:5000 (default setting) from your browser.

## API Specification
[Cardano & Hydra Wrapper API (0.1.0)]()