# インフラ（Terraform）

GCP 環境は Terraform で管理します。1 環境 = 1 GCP プロジェクトです（CLAUDE.md §7）。

```
infra/terraform/
├── modules/app/   # 1 環境分のリソース一式（stg / prod で共通）
└── envs/
    └── stg/       # stg 用の値を渡してモジュールを呼ぶ
```

## 作成されるもの

| リソース | 内容 |
| --- | --- |
| Cloud Run サービス `proj-mana` | アプリ本体。URL は `https://proj-mana-<プロジェクト番号>.asia-northeast1.run.app` |
| Cloud Run ジョブ `proj-mana-migrate` | デプロイ前に `prisma migrate deploy` を実行 |
| Cloud SQL `proj-mana-<env>` | PostgreSQL 17。パブリック IP だが許可ネットワークなし + Cloud SQL コネクタ必須 |
| Secret Manager | `database-url` / `auth-secret` / `auth-google-secret` |
| Cloud Storage `<project>-attachments` | 添付ファイル用（非公開、署名付き URL 用の CORS 設定済み） |
| Artifact Registry `proj-mana` | コンテナイメージ（新しい 10 件を保持、30 日より古いものは削除） |
| サービスアカウント | `proj-mana-app`（実行）、`proj-mana-migrate`（マイグレーション）、`proj-mana-deployer`（GitHub Actions） |
| Workload Identity 連携 | GitHub Actions からキーなしで deployer として認証（stg は `main` ブランチのみ） |

シークレットの値（DB パスワード、`AUTH_SECRET`、Google OAuth クライアントシークレット）は Terraform の書き込み専用属性で Secret Manager / Cloud SQL に書き込むため、**tfstate には保存されません**。

## stg の初回構築

必要なもの: `gcloud` CLI、Terraform 1.11 以上（CI と同じ 1.16 系を推奨）、課金を有効にできる Google アカウント。

### 1. GCP プロジェクトを作る

```bash
export PROJECT_ID=proj-mana-stg-xxxx   # 世界で一意な ID を決める

gcloud auth login
gcloud auth application-default login
gcloud projects create "$PROJECT_ID"
gcloud billing projects link "$PROJECT_ID" --billing-account=XXXXXX-XXXXXX-XXXXXX
gcloud config set project "$PROJECT_ID"

# Terraform が動くための最小限の API
gcloud services enable cloudresourcemanager.googleapis.com serviceusage.googleapis.com storage.googleapis.com
```

### 2. tfstate 用のバケットを作る（手動で 1 回だけ）

```bash
gcloud storage buckets create "gs://${PROJECT_ID}-tfstate" \
  --location=asia-northeast1 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update "gs://${PROJECT_ID}-tfstate" --versioning
```

### 3. Google OAuth クライアントを作る

Terraform では作れないため、コンソールで作成します。

1. プロジェクト番号を確認: `gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)'`
2. コンソールの「Google Auth Platform」でブランディング（アプリ名・サポートメール）と対象（外部）を設定
   - 公開ステータスが「テスト」の間は、「テストユーザー」に追加したアカウントしかログインできません
3. 「クライアント」で OAuth クライアント ID（ウェブ アプリケーション）を作成し、承認済みのリダイレクト URI に次を追加
   `https://proj-mana-<プロジェクト番号>.asia-northeast1.run.app/api/auth/callback/google`
4. クライアント ID とクライアントシークレットを控える

### 4. Terraform を実行する

```bash
cd infra/terraform/envs/stg
cp backend.hcl.example backend.hcl            # bucket を手順 2 のバケット名に
cp terraform.tfvars.example terraform.tfvars  # project_id などを記入

terraform init -backend-config=backend.hcl

# クライアントシークレットはファイルに書かず環境変数で渡す（初回と更新時のみ必要）
TF_VAR_google_oauth_client_secret='GOCSPX-...' terraform apply
```

初回は Cloud SQL の作成に 10〜15 分かかります。`terraform init` で生成される `.terraform.lock.hcl` はコミットしてください。
この時点の Cloud Run はプレースホルダーのイメージで動いています。

### 5. GitHub に変数を登録する

リポジトリの Settings → Secrets and variables → Actions → **Variables**（リポジトリ変数）に次を登録します（値は `terraform output` で確認）。
`STG_GCP_PROJECT_ID` が未登録の間は、デプロイのワークフローはスキップされます。

| 変数 | 値 |
| --- | --- |
| `STG_GCP_PROJECT_ID` | プロジェクト ID |
| `STG_GCP_WORKLOAD_IDENTITY_PROVIDER` | `terraform output -raw workload_identity_provider` |
| `STG_GCP_DEPLOYER_SERVICE_ACCOUNT` | `terraform output -raw deployer_service_account` |

どれも秘密情報ではありません（Workload Identity 連携は `main` ブランチの `tsatolol/proj_mana` からのトークンしか受け付けません）。
初回のデプロイで GitHub Environment `staging` が作られるので、その「Deployment branches」を `main` のみに制限しておくとより安全です。

### 6. デプロイする

`main` に push（PR をマージ）すると、CI が通った後に `Deploy (stg)` ワークフローが動きます。
初回は Actions → Deploy (stg) → Run workflow（`main`）で手動実行もできます。

ワークフローの流れ: イメージ 2 種（app / migrate）をビルドして Artifact Registry に push → マイグレーションジョブを実行 → Cloud Run にデプロイ → `/api/health` を確認。

## 運用

### 2 回目以降の `terraform apply`

`TF_VAR_google_oauth_client_secret` は不要です。Cloud Run のイメージは GitHub Actions がデプロイするため、Terraform は変更を無視します。

### シークレットのローテーション

| 対象 | 方法 |
| --- | --- |
| DB パスワード | モジュールの `db_password_version` を上げて apply（Cloud SQL と `database-url` を同時に更新） |
| `AUTH_SECRET` | `auth_secret_version` を上げて apply（全員がログアウトされる） |
| OAuth クライアントシークレット | `google_oauth_client_secret_version` を上げ、`TF_VAR_google_oauth_client_secret` を付けて apply |

シークレット更新後は、新しいリビジョンが値を読むよう Cloud Run を再デプロイしてください（Deploy (stg) を手動実行）。

### stg の DB に手元から接続する

```bash
cloud-sql-proxy "$(terraform output -raw cloud_sql_connection_name)" --port 5433
# パスワードは Secret Manager の database-url を参照
```

### 費用の目安

大半は Cloud SQL（`db-f1-micro` + SSD 10GB）で、月 2,000 円前後です。Cloud Run は最小インスタンス 0 なので、使わない間はほぼ無料枠に収まります。最新の料金は GCP の料金表で確認してください。

### 環境の削除

stg は `deletion_protection = false` なので `terraform destroy` で削除できます。

- Workload Identity プールは削除後 30 日間は同じ ID で作り直せません
- Cloud SQL のインスタンス名は削除後しばらく再利用できません
