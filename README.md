# 🤖 カリタス中学校 AI試験対策ツール

体系数学・Progress 21に完全準拠したAI学習ツール

## 🚀 クイックスタート

### 1. 依存関係インストール
```bash
npm install
```

### 2. 環境変数設定
```bash
cp .env.example .env
# .envファイルを編集してOpenAI APIキーを設定
```

### 3. サーバー起動
```bash
npm start          # 本番用
npm run dev        # 開発用（nodemon）
```

### 4. アクセス
ブラウザで `http://localhost:3001` を開く

## 🧪 テスト実行

```bash
npm test           # 全テスト実行
npm run test:watch # ウォッチモード
npm run test:coverage # カバレッジ付き
```

## 📁 プロジェクト構成

```
caritas-study-app/
├── server.js              # Expressサーバー
├── index.html             # フロントエンド（React）
├── package.json           # 依存関係・スクリプト
├── .env.example           # 環境変数テンプレート
├── src/                   # フロントエンドソース
│   └── index.js
├── tests/                 # テストコード
│   ├── unit/              # ユニットテスト
│   ├── integration/       # 統合テスト
│   └── e2e/               # E2Eテスト
└── vercel.json            # Vercelデプロイ設定
```

## 🎯 機能

### 数学学習
- **AI問題生成**: OpenAI GPT-4による高品質な問題作成
- **6段階詳細解説**: 思考プロセスから応用まで
- **学年別対応**: 中1～高1の体系数学準拠
- **難易度調整**: 基礎・標準・応用・発展の4レベル

### 英語学習
- **AI単語生成**: Progress 21準拠の単語学習
- **例文付き**: 実用的な用法まで学習
- **レベル別対応**: 中学校英語カリキュラム準拠

### PWA対応
- **オフライン動作**: Service Worker実装予定
- **モバイル最適化**: レスポンシブデザイン
- **高速読み込み**: パフォーマンス最適化

## 🛠️ 技術スタック

### フロントエンド
- **React 18**: コンポーネントベース
- **Tailwind CSS**: ユーティリティファーストCSS
- **Babel**: JSX変換

### バックエンド
- **Express.js**: Node.js Webフレームワーク
- **OpenAI API**: GPT-4による問題生成
- **CORS**: クロスオリジン対応
- **Helmet**: セキュリティ強化

### テスト
- **Jest**: テストフレームワーク
- **Supertest**: HTTPアサーション
- **3層テスト**: Unit・Integration・E2E

### デプロイ
- **Vercel**: フロントエンド・サーバーレス
- **Docker対応**: コンテナ化サポート予定

## 🔧 開発環境

### 要件
- Node.js ≥ 18.0.0
- npm ≥ 11.0.0
- OpenAI APIキー

### 開発フロー
1. **ブランチ作成**: `git checkout -b feature/xxx`
2. **テスト実行**: `npm test`
3. **コード品質**: ESLint・Prettier設定予定
4. **プルリクエスト**: コードレビュー実施

## 📋 コーディング哲学

### DRY原則（Don't Repeat Yourself）
同じ処理・データを複数箇所に書かない

### KISS原則（Keep It Simple, Stupid）
複雑な構造や無駄な抽象化を避け、シンプルに保つ

### SRP（単一責任原則）
1つの関数・クラスは1つの責任だけ持つ

### テスト駆動開発
テスト容易性を重視した設計
自動テストによる品質保証

### 継続的リファクタリング
技術的負債の定期的な見直し・改善

## 🚨 トラブルシューティング

### OpenAI APIエラー
```bash
# APIキー設定確認
echo $OPENAI_API_KEY

# .envファイル確認
cat .env
```

### ポート競合
```bash
# プロセス確認・停止
lsof -ti:3001 | xargs kill -9
```

### テスト失敗
```bash
# 詳細ログ確認
npm test -- --verbose
```

## 📚 学習リソース

- [体系数学](https://www.chart.co.jp/) - 数学カリキュラム準拠
- [Progress 21](https://www.edc.co.jp/) - 英語教材準拠
- [OpenAI API](https://platform.openai.com/docs) - AI機能実装

## 🤝 コントリビューション

1. Issueを作成して議論
2. フォーク・ブランチ作成
3. 変更実装・テスト追加
4. プルリクエスト作成
5. コードレビュー・マージ

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照
