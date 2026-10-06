# proj_mana

中小企業・チーム向けのプロジェクト（案件）管理ツールです。仕様・規約は [CLAUDE.md](./CLAUDE.md) を参照してください。

## 必要なもの

- Node.js 24（`.nvmrc`）
- pnpm（`corepack enable` で `package.json` の `packageManager` に従います）
- Docker（ローカル PostgreSQL 用）

## セットアップ

```bash
corepack enable
pnpm install                 # postinstall で Prisma Client を生成
cp .env.example .env.local   # 必要に応じて値を設定
docker compose up -d         # PostgreSQL 17（proj_mana / proj_mana_test DB）
pnpm db:migrate              # マイグレーション適用
pnpm db:seed                 # サンプルデータ投入（任意）
pnpm dev                     # http://localhost:3000
```

### Google ログインの設定

1. Google Cloud Console の「API とサービス > 認証情報」で OAuth クライアント ID（ウェブ アプリケーション）を作成
2. 承認済みのリダイレクト URI に `http://localhost:3000/api/auth/callback/google` を追加
3. クライアント ID / シークレットを `.env.local` の `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` に設定
4. `AUTH_SECRET` を `openssl rand -base64 32` で生成して設定
5. `ALLOWED_EMAIL_DOMAINS`（ログインを許可するドメイン）と `INITIAL_ADMIN_EMAIL`（最初の管理者）を設定

最初にログインしたユーザー、または `INITIAL_ADMIN_EMAIL` のユーザーが管理者になります。

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバー |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | ルート型生成（`next typegen`）+ `tsc --noEmit` |
| `pnpm test` | Vitest（unit + DB テスト。DB テストは `proj_mana_test` を使用） |
| `pnpm test:e2e` | Playwright（`proj_mana_e2e` DB とポート 3100 の専用サーバーを使用） |
| `pnpm build` | 本番ビルド（`output: "standalone"`） |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:deploy` | `prisma migrate deploy` |
| `pnpm db:seed` | シードデータ投入 |
| `pnpm db:studio` | Prisma Studio |

## インフラ

GCP（Cloud Run / Cloud SQL など）は Terraform で管理しています。構築・運用手順は [infra/README.md](./infra/README.md) を参照してください。

## Docker イメージ

```bash
docker build -t proj_mana .                          # アプリ（Cloud Run 用、PORT=8080）
docker build --target migrate -t proj_mana-migrate . # prisma migrate deploy 用ジョブ
```
