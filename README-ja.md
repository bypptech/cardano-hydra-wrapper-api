# Cardano Hydra Wrapper API

Cardano Hydra Wrapper APIは 高速なトランザクションを実現する Hydra L2スケーリングソリューションを活用したESCROW取引用APIです。
設計思想として最小限のAPI操作でCardano L1トランザクションの署名・送信、Hydra の制御、L2送金等を実現します。

## API仕様

- [Cardano & Hydra Wrapper API](https://bypp.tech/apidoc/cardano-hydra-wrapper-api/)


## クイックスタート

### 動作要件

| 必要なツール            | バージョン / 詳細                          |
|-------------------------|--------------------------------------------|
| Node.js                | バージョン 24.0.0 以上推奨                     |
| cardano-node           | 10.1.2 [セットアップ済み](https://docs.cardano.org/cardano-testnets/getting-started) かつ 起動済み かつ Ledger同期100%         |
| cardano-cli            | 10.1.1.0                                   |
| hydra-node             | 0.22.3  [セットアップ済み](https://hydra.family/head-protocol/unstable/docs/tutorial#step-0-installation) かつ 起動済み                               |
| websocat               | 1.14.0 |
| curl                   | インストール済みであること                 |
| jq                     | インストール済みであること                 |


### リポジトリ クローン

```bash
git clone https://github.com/bypptech/cardano-hydra-wrapper-api
cd cardano-hydra-wrapper-api
npm install
```


### 環境設定

```bash
cp .env.tmp .env
```

.env を編集し環境変数を設定します。


| 変数名               | 説明                                    |
|-----------------------|-----------------------------------------|
| PORT                 | cardano-cli-wrapperが使用するポート      |
| URL_ALICE_HYDRA_NODE | Alice の Hydra ノードの URL             |
| URL_BOB_HYDRA_NODE   | Bob の Hydra ノードの URL               |
| PATH_PREFIX          | Cardano ノードのパス                   |
| TARGET_NETWORK       | ネットワーク設定 (例: --testnet-magic 1) |
| SEND_LOVELACE        | NewTxで送信するADA(Lovelace) のデフォルト量        |
| TMP_COMMIT_FILE      | 一時的なコミットファイルのパス          |
| TMP_SIGNED_FILE      | 一時的な署名済みファイルのパス          |
| TMP_UTXO_FILE        | 一時的な UTXO ファイルのパス            |
| TMP_TX_FILE          | 一時的なトランザクションファイルのパス   |

### APIサーバーの起動
```bash
npm run dev
```

### APIテストアプリの起動
```bash
cd cardano-hydra-wrapper-api/api-test-app
npm install
npm run dev
```

### APIテストアプリの動作確認

ブラウザから http://localhost:5000 (デフォルト設定時) にアクセスしてください。
