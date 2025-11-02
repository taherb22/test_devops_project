# simple-node-app — Containerized sample

This repository contains a minimal Node.js Express app instrumented with prom-client and provided with containerization, CI, k8s manifests, Terraform IaC, and a basic monitoring plan.

Files added
- `index.js` — Minimal app with `/`, `/health`, and `/metrics`.
- `package.json` — dependencies and scripts (eslint).
- `Dockerfile` — multi-stage Dockerfile.
- `docker-compose.yml` — local compose for development.
- `k8s/` — `deployment.yaml`, `service.yaml` (image placeholder: `simple-node-app:latest`).
- `.github/workflows/ci.yml` — builds and lints on push.
- `terraform/` — simple AWS S3 bucket IaC (`main.tf`, `variables.tf`).
- `prometheus/prometheus.yml` — local Prometheus scrape config.

Decisions and notes
- App: Node.js + Express for small footprint and easy Docker workflow.
- Metrics: `prom-client` exposes `/metrics` for Prometheus.
- Dockerfile: multi-stage (builder + runtime) to keep image small.
- CI: GitHub Actions runs `npm ci`, `npm run lint`, and `docker build` on push.
- K8s: Manifests are basic and use `simple-node-app:latest`; in production use an image registry and update the image tag.
- Terraform: sample AWS S3 bucket. Applying requires AWS credentials in your environment.

How to run locally (recommended)
1. Install Docker and Node >=16.
2. Build & run with Docker Compose:

```powershell
# from repository root (Windows PowerShell)
docker compose up --build
```

3. Visit http://localhost:3000
4. Metrics are available at http://localhost:3000/metrics for Prometheus to scrape.

CI / GitHub
- Create a repo on GitHub and push these files.
- The workflow at `.github/workflows/ci.yml` will run on push to `main`/`master`.

Terraform (IaC)
- To provision the S3 bucket (example):

```powershell
cd terraform
terraform init
terraform plan -var "bucket_name=your-unique-bucket-name-12345"
terraform apply -var "bucket_name=your-unique-bucket-name-12345"
```

You must have AWS credentials configured (e.g., `AWS_PROFILE` or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`).

Monitoring plan (basic)
- Local: run Prometheus using `prometheus.yml` and scrape `host.docker.internal:3000` when using Docker Desktop.
- Production: run Prometheus + Grafana, scrape the service cluster IP or use ServiceMonitor (Prometheus Operator). Create alerts on `up == 0` for the deployment and on request error rates.

Next steps / improvements
- Push images to a registry (Docker Hub / GHCR) and update k8s manifests.
- Add end-to-end tests and more CI jobs (security scan, build matrix).
- Add Terraform to create an ECS/ALB for full infra and CloudWatch alarms for health.

