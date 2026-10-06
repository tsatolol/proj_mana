# CLAUDE.md — proj_mana（案件管理 SaaS）

このファイルは Claude Code がこのリポジトリで作業する際の仕様・規約をまとめたものです。
実装時はここに書かれた決定事項に従い、変更が必要な場合はこのファイルも合わせて更新してください。

---

## 1. プロダクト概要

- **名称**: proj_mana
- **目的**: 中小企業・チーム（5〜50 人程度）向けの汎用プロジェクト（案件）管理ツール
- **提供形態**: シングルテナント。**1 デプロイ = 1 組織**。テナント ID によるデータ分離は行わない
  - 別の組織に提供する場合は、Terraform で GCP 環境ごと複製する
- **スケジュール**: 期限なし（趣味・学習目的）。品質と学びを優先し、段階的に機能を追加する
- **UI 言語**: 日本語のみ（i18n 対応はしない）
- **タイムゾーン**: Asia/Tokyo 固定

## 2. 技術スタック

| 領域 | 採用技術 |
| --- | --- |
| 言語 | TypeScript（strict） |
| フレームワーク | Next.js（App Router、`output: "standalone"`） |
| UI | Tailwind CSS + shadcn/ui |
| ドラッグ&ドロップ | dnd-kit（カンバン） |
| DB | Cloud SQL for PostgreSQL |
| ORM | Prisma |
| 認証 | Auth.js（NextAuth）+ Google プロバイダ、Prisma Adapter、DB セッション |
| バリデーション | Zod |
| ファイル保存 | Cloud Storage（署名付き URL でアップロード/ダウンロード） |
| メール | Resend |
| Slack 通知 | Incoming Webhook |
| テスト | Vitest（ユニット/統合）、Playwright（E2E） |
| パッケージ管理 | pnpm |
| ランタイム | Node.js（Active LTS） |
| インフラ | Cloud Run、Cloud SQL、Cloud Storage、Secret Manager、Artifact Registry、Cloud Scheduler |
| IaC | Terraform |
| CI/CD | GitHub Actions + Workload Identity Federation |
| リージョン | `asia-northeast1`（東京） |

## 3. 機能仕様（MVP）

### 3.1 認証・ユーザー管理
- Google アカウントでログイン（OAuth）
- ログインできるのは以下のいずれかに該当するユーザーのみ
  - 環境変数 `ALLOWED_EMAIL_DOMAINS` に含まれるドメインのメールアドレス
  - Admin から招待（`Invitation`）されたメールアドレス
- 初回ログイン時に `User` を作成。最初のユーザー、または `INITIAL_ADMIN_EMAIL` と一致するユーザーを Admin にする
- Admin はユーザーの招待・ロール変更・無効化ができる（物理削除はしない）

### 3.2 権限（ロール）
組織全体で 2 種類のみ。プロジェクト単位の権限は持たない。

| 操作 | Admin | Member |
| --- | :---: | :---: |
| 全プロジェクト・タスクの閲覧 | ✓ | ✓ |
| プロジェクト作成・編集 | ✓ | ✓ |
| プロジェクトのアーカイブ・削除 | ✓ | — |
| タスク作成・編集・削除 | ✓ | ✓ |
| 自分のコメント編集・削除 | ✓ | ✓ |
| 他人のコメント削除 | ✓ | — |
| ユーザー招待・ロール変更・無効化 | ✓ | — |
| 組織設定（Slack Webhook 等） | ✓ | — |

### 3.3 プロジェクト
- 項目: 名前、説明（Markdown）、開始日、終了予定日、ステータス（進行中 / アーカイブ）
- 一覧画面（アーカイブ済みはフィルタで表示切替）、詳細画面（カンバン / ガント / リストのタブ切替）

### 3.4 タスク
- 構造: **プロジェクト > タスク > サブタスク（1 階層のみ）**
  - サブタスクにさらにサブタスクは作れない（サーバー側で `parentId` の親が `parentId = null` であることを検証）
- 項目: タイトル、説明（Markdown）、ステータス、担当者、開始日、期限、表示順（`position`）
- ステータスは**固定 4 種**: `TODO`（未着手）/ `IN_PROGRESS`（進行中）/ `IN_REVIEW`（レビュー）/ `DONE`（完了）

### 3.5 カンバンボード
- 4 ステータスの列に親タスクを表示（サブタスクはカード上に「完了数 / 全体数」で表示）
- ドラッグ&ドロップでステータス変更・並び替え。楽観的更新し、失敗時はロールバック
- `position` は列内の並び順。並び替え時は前後の値の中間値を採用し、必要に応じて列内を再採番

### 3.6 ガントチャート
- 開始日・期限が設定されたタスク / サブタスクを横棒で表示（日・週単位の切替）
- MVP では表示のみ（ドラッグでの日程変更は後回し）
- 開始日または期限が未設定のタスクは「日程未設定」として一覧の下部に表示

### 3.7 コメント・添付ファイル
- タスクにコメント（Markdown）を投稿・編集・削除（論理削除）
- 添付ファイルはタスクに紐づける。Cloud Storage へ署名付き URL で直接アップロード
  - 上限: 1 ファイル 20MB（`MAX_UPLOAD_BYTES` で変更可能）
  - ダウンロードも署名付き URL（有効期限 5 分）。バケットは非公開

### 3.8 通知
- チャネル: メール（Resend）、Slack（組織で 1 つの Incoming Webhook）
- トリガー
  - タスクの担当者に設定された
  - 自分が担当 / 作成したタスクにコメントが付いた
  - 担当タスクの期限が翌日に迫った（Cloud Scheduler が毎朝 9:00 JST に内部エンドポイントを呼ぶ）
- ユーザーごとにメール通知の ON/OFF を設定可能
- 通知送信の失敗はメイン処理を失敗させない（ログに記録してスキップ）

## 4. データモデル（Prisma 概要）

詳細は `prisma/schema.prisma` を正とする。主要モデルは以下。

- `User` — id, email, name, image, role(`ADMIN` | `MEMBER`), isActive, emailNotification, createdAt
- `Account` / `Session` / `VerificationToken` — Auth.js 標準
- `Invitation` — id, email, role, invitedById, expiresAt, acceptedAt
- `Project` — id, name, description, startDate, endDate, status(`ACTIVE` | `ARCHIVED`), createdById, timestamps
- `Task` — id, projectId, parentId(nullable), title, description, status, assigneeId, startDate, dueDate, position, createdById, timestamps
- `Comment` — id, taskId, authorId, body, deletedAt, timestamps
- `Attachment` — id, taskId, uploadedById, fileName, contentType, size, storageKey, createdAt
- `OrgSetting` — シングルトン。slackWebhookUrl など

規約:
- ID は `cuid()`（Prisma のデフォルト）
- 日時は `timestamptz`（UTC 保存、表示時に Asia/Tokyo に変換）。開始日・期限は `@db.Date`
- 外部キーにはインデックスを張る。`Task` には `(projectId, status, position)` の複合インデックス

## 5. ディレクトリ構成（予定）

```
proj_mana/
├── CLAUDE.md
├── Dockerfile
├── docker-compose.yml          # ローカル用 PostgreSQL
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/                    # ルーティング（App Router）
│   │   ├── (auth)/login/
│   │   ├── (app)/projects/[projectId]/
│   │   ├── (app)/settings/
│   │   └── api/                # Auth.js、Cron 用内部エンドポイントなど
│   ├── components/
│   │   └── ui/                 # shadcn/ui 生成物（手で大きく改変しない）
│   ├── features/               # 機能単位（projects, tasks, comments, attachments, notifications, users）
│   │   └── <feature>/
│   │       ├── actions.ts      # Server Actions
│   │       ├── queries.ts      # 読み取り用関数
│   │       ├── schema.ts       # Zod スキーマ
│   │       └── components/
│   └── lib/                    # db, auth, storage, mail, slack, authz などの共通処理
├── e2e/                        # Playwright
├── infra/
│   └── terraform/
│       ├── modules/
│       └── envs/{stg,prod}/
└── .github/workflows/
```

## 6. 実装規約

- **更新系は Server Actions**、読み取りは Server Components から `queries.ts` を呼ぶ。外部から叩く必要があるものだけ Route Handler（`app/api`）にする
- **すべての Server Action / Route Handler の先頭で認可チェック**を行う（`requireUser()` / `requireAdmin()` を `src/lib/authz.ts` に用意）。UI でボタンを隠すだけにしない
- 入力は必ず Zod で検証する。スキーマは `features/<feature>/schema.ts` に置き、フォームとサーバーで共有する
- Prisma Client は `src/lib/db.ts` のシングルトンを使う
- 識別子・コードコメントは英語、UI 文言は日本語
- `any` は使わない。やむを得ない場合は理由をコメントで残す
- 秘密情報をコードやリポジトリに含めない。ローカルは `.env.local`（git 管理外）、`.env.example` にキー名のみ記載

## 7. 環境

| 環境 | 用途 | DB | デプロイ |
| --- | --- | --- | --- |
| local | 開発 | Docker Compose の PostgreSQL | — |
| stg | 動作確認 | Cloud SQL（最小構成） | `main` へのマージで自動 |
| prod | 本番 | Cloud SQL（自動バックアップ + PITR 有効） | `v*` タグの push で実行（承認付き） |

- GCP プロジェクトは stg / prod で分ける
- Cloud Run → Cloud SQL は Cloud SQL コネクタ（Unix ソケット `/cloudsql/<INSTANCE_CONNECTION_NAME>`）で接続
- シークレット（DB パスワード、`AUTH_SECRET`、Google OAuth、Resend API キー、Slack Webhook）は Secret Manager に置き、Cloud Run の環境変数として注入
- Cloud Run のサービスアカウントは環境ごとに専用のものを作り、最小権限（Cloud SQL Client、対象バケットのオブジェクト管理、Secret Accessor）を付与

### 主な環境変数

| 変数名 | 説明 |
| --- | --- |
| `DATABASE_URL` | Prisma 接続文字列 |
| `AUTH_SECRET` | Auth.js のシークレット |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth クライアント |
| `AUTH_URL` | アプリの公開 URL |
| `ALLOWED_EMAIL_DOMAINS` | ログイン許可ドメイン（カンマ区切り） |
| `INITIAL_ADMIN_EMAIL` | 初期 Admin のメールアドレス |
| `GCS_BUCKET` | 添付ファイル用バケット名 |
| `RESEND_API_KEY` / `MAIL_FROM` | メール送信 |
| `CRON_SECRET` | Cloud Scheduler から内部エンドポイントを呼ぶ際の認証用 |
| `MAX_UPLOAD_BYTES` | 添付ファイルの上限サイズ |

## 8. CI/CD（GitHub Actions）

- `ci.yml`（PR / push）: `pnpm install` → `lint` → `typecheck` → `test` → `build`。E2E は PostgreSQL をサービスコンテナで起動して実行
- `deploy-stg.yml`（`main` への push）: イメージをビルドして Artifact Registry に push → Cloud Run Job で `prisma migrate deploy` → Cloud Run にデプロイ
- `deploy-prod.yml`（`v*` タグ push）: GitHub Environment `production` の承認（必須レビュアー）後、stg と同じ手順で prod にデプロイ
- GCP 認証は Workload Identity Federation（サービスアカウントキーは発行しない）
- マイグレーションは**デプロイ前に**実行する。破壊的変更（カラム削除・型変更）は「追加 → 移行 → 削除」の複数リリースに分ける

## 9. よく使うコマンド

```bash
docker compose up -d          # ローカル DB 起動
pnpm dev                      # 開発サーバー
pnpm lint                     # ESLint
pnpm typecheck                # tsc --noEmit
pnpm test                     # Vitest
pnpm test:e2e                 # Playwright
pnpm db:migrate               # prisma migrate dev
pnpm db:seed                  # シードデータ投入
pnpm db:studio                # Prisma Studio
```

コード変更後は、少なくとも `pnpm lint && pnpm typecheck && pnpm test` を通してから完了とすること。

## 10. テスト方針

- Vitest: Zod スキーマ、認可ロジック、Server Actions の主要パス（テスト用 DB を使用）、日付計算・並び順計算などの純粋関数
- Playwright: ログイン → プロジェクト作成 → タスク作成 → カンバンでステータス変更 → コメント投稿 の主要フロー
  - E2E では Google OAuth を使わず、テスト専用の認証バイパス（`NODE_ENV=test` 時のみ有効）でログインする
- 認可のテストは必ず「Member が Admin 専用操作を実行できないこと」を含める

## 11. Git 運用

- ブランチ: `main` を保護。作業は `feat/*`、`fix/*`、`chore/*` ブランチで行い PR でマージ
- コミットメッセージ: Conventional Commits（`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`）
- リリース: `main` で `vX.Y.Z` タグを打って push → prod デプロイ
- GitHub リポジトリ: `tsatolol/proj_mana`（Public）
  - 公開リポジトリのため、コミットの作成者メールは GitHub の noreply アドレスを使う

## 12. 開発ロードマップ

1. **基盤**: Next.js プロジェクト作成、Tailwind / shadcn/ui、Prisma + ローカル DB、CI
2. **認証**: Google ログイン、許可ドメイン / 招待、ロール、認可ヘルパー
3. **インフラ**: Terraform で stg 環境構築、stg への自動デプロイ
4. **プロジェクト・タスク**: CRUD、サブタスク、リスト表示
5. **カンバン**: ドラッグ&ドロップ、並び順
6. **コメント・添付**: Markdown コメント、Cloud Storage 連携
7. **ガントチャート**: 表示のみ
8. **通知**: メール、Slack、期限リマインド（Cloud Scheduler）
9. **prod 環境**: Terraform で prod 構築、タグデプロイ

## 13. 未決事項（決まり次第更新）

- ガントチャートの実装方法（ライブラリ採用 or 自作 SVG）
- タスクの優先度・ラベル・検索機能の要否
- 監査ログ（誰がいつ何を変更したか）の要否
- カスタムドメインの利用有無
- prod の Cloud SQL マシンタイプとバックアップ保持期間
