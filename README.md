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

Secrets for Docker Hub
- The workflow is configured to push images to Docker Hub. Add these repository secrets in GitHub Settings → Secrets:
	- `DOCKERHUB_USERNAME` — your Docker Hub username
	- `DOCKERHUB_TOKEN` — a Docker Hub access token (recommended) or your password

You can create an access token in Docker Hub (Account Settings → Security → New Access Token) and paste it into the `DOCKERHUB_TOKEN` secret.

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

Next steps (practical, prioritized)

1) Make CI reproducible and publish images
	- Commit `package-lock.json` and keep `npm ci` in CI so installs are reproducible.
	- Add these GitHub Actions secrets:
	  - `DOCKERHUB_USERNAME` — your Docker Hub username
	  - `DOCKERHUB_TOKEN` — Docker Hub access token
	- CI will push images to Docker Hub as:
	  `docker.io/<DOCKERHUB_USERNAME>/simple-node-app:<sha>` and `:latest`.

	 How to create and commit a lockfile (recommended)

	 If you don't already have `package-lock.json` in the repo, create and commit it so CI's `npm ci` works reproducibly.

	 From the project root (PowerShell):

	 ```powershell
	 # install dependencies and generate package-lock.json without changing node_modules for CI parity
	 npm install

	 # add and commit the lockfile
	 git add package-lock.json
	 git commit -m "chore: add package-lock.json for reproducible CI installs"
	 git push origin main
	 ```

	 Notes:
	 - `npm ci` will use `package-lock.json` to perform clean, deterministic installs in CI.
	 - Pin the Node version in `.github/workflows/ci.yml` (the workflow already uses a Node matrix 16/18/20). Consider documenting the supported Node version in `package.json`'s `engines` field.

2) Wire k8s manifests to use the pushed image
	- Update `k8s/deployment.yaml` image field to reference your Docker Hub image (example):

	  image: docker.io/<your-dockerhub-username>/simple-node-app:latest

	- For immutable deployments, prefer the SHA tag published by CI. Example automation:
	  - Replace `latest` with the image tag that matches the Git commit SHA or release tag.

3) Enforce quality gates in CI
	- Lint: ESLint currently fails on warnings (`--max-warnings=0`). Keep or relax as desired.
	- Tests: replace the placeholder `npm test` with real tests (Jest / Mocha). Add at least one unit test and one small integration test.
	- Add a security scan (e.g., `npm audit` or a dedicated action) in CI.

4) Release flow and tagging
	- Use Git tags (vX.Y.Z) to create releases. CI already triggers on tag pushes and will build & push images.
	- Optionally add a `release` job that creates a GitHub Release and publishes release notes.

5) Monitoring and observability
	- Run Prometheus + Grafana for production metrics; use the provided `prometheus/prometheus.yml` as a starting point.
	- Add alerting rules for `up == 0`, increasing 5xx rates, and high latency.

6) Improve IaC
	- Expand `terraform/` to provision compute (ECS / EKS / GKE) and an Application Load Balancer (or equivalent).
	- Add CloudWatch (or cloud-native) alarms and a basic IAM policy for automation.

7) Optional: automation and polish
	- Push images to a registry namespace matching the GitHub repo (e.g., `<username>/<repo>`).
	- Add image promotion (e.g., tag `latest` only from `main` builds, create staged tags for environments).
	- Add GitHub Actions to update `k8s/deployment.yaml` automatically or use a deployment tool (ArgoCD / Flux) to sync images.

If you'd like, I can implement any of the above (for example: add a sample Jest test and update `package.json` test script, or update `k8s/deployment.yaml` to use the pushed Docker Hub image automatically). Tell me which one and I'll add it next.

