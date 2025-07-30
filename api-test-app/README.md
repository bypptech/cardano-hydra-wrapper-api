# Cardano Hydra Wrapper API Test Application

A web application for testing the Cardano Hydra Wrapper API.
Enables evaluation of L1 and L2 ESCROW transactions using Cardano and Hydra.

## Features

- API Key acquisition and management for API server
- L1 and L2 wallet balance display
- L2 payment execution with specified amounts
- Hydra Head Open/Close control
- Individual API control

## Requirements

| Required Tool          | Version / Details                          |
|------------------------|--------------------------------------------|
| Node.js               | Version 24.0.0 or higher recommended       |
| cardano-node          | 10.1.2 [Setup complete](https://docs.cardano.org/cardano-testnets/getting-started) and running with 100% Ledger sync |
| cardano-cli           | 10.1.1.0                                   |
| hydra-node            | 0.22.3 [Setup complete](https://hydra.family/head-protocol/unstable/docs/tutorial#step-0-installation) and running |
| websocat              | 1.14.0                                     |
| curl                  | Must be installed                          |
| jq                    | Must be installed                          |

## Quick Start

### Install Dependencies
   ```bash
   cd api-test-app
   npm install
   ```
### Configuration
   Edit vites.config.ts to configure environment variables.

   | Variable Name        | Description                                    |
   |----------------------|------------------------------------------------|
   | port     | API test app launch port                  |
   | __API_BASE_URL__     | cardano-hydra-wrapper-api URL                  |

### Start Test Application
   ```bash
   npm run dev          
   ```

### Access from Browser
   Default URL: `http://localhost:5000`