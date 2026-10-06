# インフラ（Terraform）

GCP 環境は Terraform で管理します。1 環境 = 1 GCP プロジェクトです（CLAUDE.md §7）。

```
infra/terraform/
├── bootstrap/     # 環境の土台: GCP プロジェクト・課金の紐付け・基本 API・tfstate バケット
├── modules/app/   # 1 環境分のリソース一式（stg / prod で共通）
└── envs/
    └── stg/       # stg 用の値を渡してモジュールを呼ぶ（GitHub のリポジトリ変数も登録）
```

## 作成されるもの

| リソース | 内容 |
| --- | --- |
| GCP プロジェクト（bootstrap） | 環境ごとに 1 つ。課金を紐付け、`deletion_policy = "PREVENT"` で削除保護 |
| tfstate バケット（bootstrap） | `<project>-tfstate`。バージョニング有効（古い版は 20 件まで保持） |
| GitHub リポジトリ変数（envs/stg） | `STG_GCP_*`。デプロイのワークフローが使う |
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

必要なもの: `gcloud` CLI、Terraform 1.11 以上（CI と同じ 1.16 系を推奨）、課金アカウント（「請求先アカウント ユーザー」権限）、GitHub のトークン。

手作業は「ログイン」「OAuth クライアントの作成」「トークン類を環境変数で渡す」だけで、それ以外は Terraform が作ります。

### 1. ログインする

```bash
gcloud auth login
gcloud auth application-default login   # Terraform が使う認証情報
gcloud billing accounts list            # 課金アカウント ID を確認
```

### 2. bootstrap: プロジェクトと tfstate バケットを作る

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars   # 課金アカウント ID と stg のプロジェクト ID（世界で一意）を記入

terraform init
terraform apply
```

GCP プロジェクト（課金紐付け済み、`deletion_policy = "PREVENT"` で削除保護）、基本 API、tfstate バケットができます。
この時点の bootstrap の state は手元のファイルです。作ったバケットへ移します。

```bash
cp backend.tf.example backend.tf   # bucket を <stg のプロジェクト ID>-tfstate に
terraform init -migrate-state      # 確認に yes。終わったら手元の terraform.tfstate* は削除してよい

terraform output -json backend_configs | jq -r .stg > ../envs/stg/backend.hcl
terraform output oauth_redirect_uris   # 次の手順で使う
```

API の有効化で「quota project」に関するエラーが出た場合は、`gcloud auth application-default set-quota-project <stg のプロジェクト ID>` を実行してから `terraform apply` をやり直してください。

### 3. Google OAuth クライアントを作る（コンソールで手作業）

対応する Terraform リソースがないため、コンソールで作成します。

1. 作成したプロジェクトを選び、「Google Auth Platform」でブランディング（アプリ名・サポートメール）と対象（外部）を設定
   - 公開ステータスが「テスト」の間は、「テストユーザー」に追加したアカウントしかログインできません
2. 「クライアント」で OAuth クライアント ID（ウェブ アプリケーション）を作成し、承認済みのリダイレクト URI に手順 2 の `oauth_redirect_uris` の stg の値を追加
3. クライアント ID とクライアントシークレットを控える

### 4. GitHub のトークンを作る

GitHub の Settings → Developer settings → Fine-grained tokens で、次の条件のトークンを作ります。

- Repository access: `tsatolol/proj_mana` のみ
- Permissions: Repository permissions → **Variables: Read and write**

### 5. stg を作る

```bash
cd ../envs/stg
cp terraform.tfvars.example terraform.tfvars   # project_id、OAuth クライアント ID などを記入

terraform init -backend-config=backend.hcl

# シークレットはファイルに書かず環境変数で渡す
export GITHUB_TOKEN='github_pat_...'
TF_VAR_google_oauth_client_secret='GOCSPX-...' terraform apply
```

初回は Cloud SQL の作成に 10〜15 分かかります。GitHub のリポジトリ変数 `STG_GCP_PROJECT_ID` / `STG_GCP_WORKLOAD_IDENTITY_PROVIDER` / `STG_GCP_DEPLOYER_SERVICE_ACCOUNT` もこのとき登録されます。
`terraform init` で生成される `.terraform.lock.hcl`（bootstrap と envs/stg の両方）はコミットしてください。
この時点の Cloud Run はプレースホルダーのイメージで動いています。

### 6. デプロイする

Actions → Deploy (stg) → Run workflow（`main`）で初回のデプロイを実行します。以降は `main` に push（PR をマージ）すると、CI が通った後に自動でデプロイされます。

ワークフローの流れ: イメージ 2 種（app / migrate）をビルドして Artifact Registry に push → マイグレーションジョブを実行 → Cloud Run にデプロイ → `/api/health` を確認。

初回のデプロイで GitHub Environment `staging` が作られるので、その「Deployment branches」を `main` のみに制限しておくとより安全です。

## 運用

### 2 回目以降の `terraform apply`

`envs/stg` では `TF_VAR_google_oauth_client_secret` は不要ですが、GitHub のリポジトリ変数を管理しているため `GITHUB_TOKEN` は毎回必要です。
Cloud Run のイメージは GitHub Actions がデプロイするため、Terraform は変更を無視します。

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

stg のリソースは `deletion_protection = false` なので、`envs/stg` で `terraform destroy` すれば削除できます。
GCP プロジェクト自体は bootstrap が `deletion_policy = "PREVENT"` で保護しています。プロジェクトごと消す場合は、bootstrap の `deletion_policy` を `DELETE` に変えて apply してから destroy します。

- Workload Identity プールは削除後 30 日間は同じ ID で作り直せません
- Cloud SQL のインスタンス名は削除後しばらく再利用できません
