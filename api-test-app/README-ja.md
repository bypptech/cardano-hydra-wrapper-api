# Cardano Hydra Wrapper APIテストアプリケーション

Cardano Hydra Wrapper APIのテストを目的としたWebアプリケーションです。   
Cardano,Hydraを用いたL1,L2ESCROW取引の評価が可能です。

## 機能

- APIサーバー用API Keyの取得・管理
- L1,L2ウォレット残高表示
- 指定金額でのL2送金実行
- Hydra Head Open/Close制御
- 個別API制御

## 動作要件

| 必要なツール            | バージョン / 詳細                          |
|-------------------------|--------------------------------------------|
| Node.js                | バージョン 24.0.0 以上推奨                     |
| cardano-node           | 10.1.2 [セットアップ済み](https://docs.cardano.org/cardano-testnets/getting-started) かつ 起動済み かつ Ledger同期100%         |
| cardano-cli            | 10.1.1.0                                   |
| hydra-node             | 0.22.3  [セットアップ済み](https://hydra.family/head-protocol/unstable/docs/tutorial#step-0-installation) かつ 起動済み                               |
| websocat               | 1.14.0 |
| curl                   | インストール済みであること                 |
| jq                     | インストール済みであること                 |


## クイックスタート

### 依存パッケージのインストール
   ```bash
   cd api-test-app
   npm install
   ```
### 設定変更
   vites.config.tsを編集し環境変数を設定します。


   | 変数名               | 説明                                    |
   |-----------------------|-----------------------------------------|
   | port      | APIテストアプリ起動ポート     |
   | __API_BASE_URL__      | cardano-hydra-wrapper-apiのURL     |

 ### テストアプリの起動
   ```bash
   npm run dev          
   ```

### ブラウザからアクセス
   デフォルトURL: `http://localhost:5000`

