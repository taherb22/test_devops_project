# simple-node-app

Minimal Node.js (Express) service with Prometheus metrics, containerized with Docker, deployable to Kubernetes, CI/CD via GitHub Actions, and sample Terraform IaC.

- Language: Node.js (Express)
- Metrics: Prometheus (`/metrics` via prom-client)
- CI: GitHub Actions (lint, test matrix, build+push, auto-deploy)
- Registry: Docker Hub
- Orchestration: Kubernetes (Deployment + Service)
- IaC: Terraform (AWS S3 example)



## Project structure
- `index.js` — Express app with `/`, `/health`, `/metrics` (exports app for tests)
- `package.json` — scripts and deps (eslint, test runner)
- `package-lock.json` — lockfile for reproducible CI (commit this)
- `.eslintrc.json` — lint rules
- `Dockerfile` — multi-stage build (small production image)
- `.dockerignore` — trims Docker build context
- `docker-compose.yml` — local development
- `k8s/deployment.yaml`, `k8s/service.yaml` — manifests (probes, replicas)
- `.github/workflows/ci.yml` — CI/CD (lint, test matrix, build+push to Docker Hub, deploy with kubectl)
- `terraform/` — S3 bucket sample (`main.tf`, `variables.tf`)
- `prometheus/prometheus.yml` — local scrape config

## Prerequisites
- Docker Desktop
- Node.js 16+ (optional if you only use Docker)
- kubectl (for Kubernetes)
- Terraform (for IaC)
- Docker Hub account (for image publishing)

## Quick start (local)

Run with Docker Compose:
```powershell
# from repo root
docker compose up --build
# App:     http://localhost:3000
# Health:  http://localhost:3000/health
# Metrics: http://localhost:3000/metrics
```

Run with Node (optional):
```powershell
npm install
npm start
```

Lint locally:
```powershell
npm run lint
```

Test locally:
```powershell
npm test
```

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

Triggers:
- push to main/master, pull_request, and tags `v*.*.*`

Jobs:
1) Lint (Node 18)
- `npm ci` with cache, then ESLint with `--max-warnings=0` (warnings fail CI)

2) Test (matrix: Node 16/18/20)
- `npm ci` with cache, then `npm test` (real endpoint tests)

3) Build & Push (main/tags only)
- Docker Buildx with GitHub cache layers
- Login to Docker Hub using repo secrets
- Push tags:
  - `docker.io/<DOCKERHUB_USERNAME>/simple-node-app:${GITHUB_SHA}`
  - `docker.io/<DOCKERHUB_USERNAME>/simple-node-app:latest`

4) Deploy (after push, main/tags)
- Uses `kubectl` and your kubeconfig to set Deployment image to the SHA tag
- Waits for rollout to complete

Required configuration (secrets & variables)

This project requires a few repository Secrets and an optional repository Variable so CI can push images and deploy to your Kubernetes cluster.

1) Create a Docker Hub repository
- On Docker Hub, create a repository named `simple-node-app` under your account or org.

2) Generate a Docker Hub access token
- Docker Hub → Account Settings → Security → New Access Token
- Save the token; you'll add it to GitHub as `DOCKERHUB_TOKEN`.

3) Create GitHub repository secrets (UI)
- Go to GitHub: Settings → Security → Secrets and variables → Actions → New repository secret
- Add these three secrets:
  - `DOCKERHUB_USERNAME` — your Docker Hub username
  - `DOCKERHUB_TOKEN` — Docker Hub access token (from step 2)
  - `KUBE_CONFIG` — the contents of a kubeconfig file (see step 4)

4) Create a CI-friendly kubeconfig (recommended)
If your kubeconfig references external certificate/key files, flatten it so CI runners can use it directly.

From a machine with `kubectl` configured for the target cluster and the desired context:

```powershell
# (optional) set the context namespace
kubectl config set-context --current --namespace my-namespace

# produce a minimal, flattened kubeconfig suitable for CI
kubectl config view --minify --flatten > kubeconfig_ci.yaml

# inspect and copy the file contents, then paste into the KUBE_CONFIG secret
type kubeconfig_ci.yaml
```

Notes:
- The flattened kubeconfig embeds certs/tokens inline and contains only the current context.
- Use least-privilege credentials: create a Kubernetes `ServiceAccount` (e.g., `ci-deployer`) scoped to the target namespace with a Role/RoleBinding that permits `patch`/`update` on Deployments and `get` on rollouts.

5) (Optional) Add repository variable for namespace
- Go to Settings → Security → Secrets and variables → Actions → Variables → New repository variable
- Name: `K8S_NAMESPACE`, Value: the target namespace (e.g., `default` or `staging`). The workflow defaults to `default` if this is not set.

6) Alternative: add secrets using GitHub CLI (PowerShell)
```powershell
gh auth login
gh secret set DOCKERHUB_USERNAME --body "your-dockerhub-username"
gh secret set DOCKERHUB_TOKEN --body "your-dockerhub-access-token"
gh secret set KUBE_CONFIG < .\kubeconfig_ci.yaml
gh variable set K8S_NAMESPACE --body "default"
```

7) One-time Kubernetes bootstrap
- Apply the base manifests once so the Deployment and Service exist before CI runs `kubectl set image`:
```powershell
kubectl apply -f k8s/
```

8) Private Docker Hub repositories
- If the Docker Hub repo is private, create an `imagePullSecret` in Kubernetes and attach it to the ServiceAccount used by the Deployment or directly to the Pod spec. Example:

```bash
# create secret (example)
kubectl create secret docker-registry regcred --docker-server=https://index.docker.io/v1/ \
  --docker-username=$DOCKERHUB_USERNAME --docker-password=$DOCKERHUB_TOKEN --docker-email=you@example.com -n $K8S_NAMESPACE

# reference it in the ServiceAccount or Pod spec
```

Common pitfalls
- Secrets not set: CI will fail when attempting to login to Docker Hub or configure kubeconfig.
- Kubeconfig uses external file paths: flatten with `kubectl config view --minify --flatten`.
- Cluster not reachable from GitHub runners: consider a self-hosted runner with network access.


## Kubernetes

Manifests: `k8s/`
- Deployment `simple-node-app` (2 replicas, readiness/liveness probes)
- Service `simple-node-app` (ClusterIP port 80 → container 3000)

Image reference in manifest:
```yaml
# k8s/deployment.yaml (placeholder; CI overrides during deploy)
containers:
  - name: app
    image: docker.io/<DOCKERHUB_USERNAME>/simple-node-app:latest
    imagePullPolicy: IfNotPresent
```

CI deploy step (automatic):
```bash
kubectl -n $K8S_NAMESPACE set image deployment/simple-node-app app=docker.io/$DOCKERHUB_USERNAME/simple-node-app:$GITHUB_SHA --record
kubectl -n $K8S_NAMESPACE rollout status deploy/simple-node-app --timeout=180s
```

Manual deploy (optional):
```powershell
kubectl apply -f k8s/
```

Private repos: configure an `imagePullSecret` on your ServiceAccount or Pod spec.

## Terraform (IaC)

Creates a versioned S3 bucket (example):
```powershell
cd terraform
terraform init
terraform plan -var "bucket_name=your-unique-bucket-name-12345"
terraform apply -var "bucket_name=your-unique-bucket-name-12345"
```
Requires AWS credentials (AWS CLI profile or env vars).

## Monitoring

Prometheus (local) using `prometheus/prometheus.yml`:
- Scrapes `host.docker.internal:3000/metrics` every 15s (Docker Desktop)

Run Prometheus (optional):
```powershell
docker run -p 9090:9090 -v ${PWD}/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
```

Production recommendations:
- Prometheus + Grafana (or Prometheus Operator)
- Alerts: target down (`up == 0`), 5xx rate, latency (e.g., SLO-based)

## Development notes

Create and commit lockfile:
```powershell
npm install
git add package-lock.json
git commit -m "chore: add package-lock.json for reproducible CI installs"
git push
```

Node version policy:
- CI tests on Node 16/18/20. You can set `"engines": { "node": ">=16" }` in `package.json`.

## Troubleshooting
- `npm ci` fails: ensure `package-lock.json` is committed and matches `package.json`.
- K8s image pull errors: verify Docker Hub path and credentials (if private).
- Probes failing: ensure `/health` is reachable inside the container and port 3000 is exposed.
- CI cannot deploy: verify `KUBE_CONFIG` secret content and cluster access/namespace.

## Decisions
- Multi-stage Docker build with small alpine base
- Non-root container user where practical; probes and resource hygiene in K8s
- Lint and test before building/pushing images
- Automated deploy uses immutable SHA tags for safe rollouts



## License
- MIT (or your preferred license)

