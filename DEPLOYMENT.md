# Deployment

**Target:** Google Cloud Platform -- Cloud Run (containerized), fronted
by Artifact Registry and Cloud Build, matching the "cloud deployment"
option in case study Section 3.4 (recommended over local Docker for the
AI Platform Services competency).

## Important note on how this deployment was produced

The environment this harness build was authored in has **no outbound
network access** (verified: `curl` to `registry.npmjs.org` returns
`403 host_not_allowed`; the same applies to `gcloud`, `docker push`, and
`git push` against GitHub). That means:

- `npm install`, `npm run verify`, and `docker build` could not be
  executed in this environment.
- The `gcloud` commands below could not be run against a real GCP
  project from here.
- Nothing in this repository was "faked" to route around that -- every
  command below is the actual command to run, on a machine with network
  access and `gcloud`/`docker`/`node` installed, to reproduce the
  deployment for real.

Section "Local verification" below is what *was* checked in this
environment: static review of every file for internal consistency
(import paths resolve, route registration order is correct, event names
match between emitter and subscriber, etc.), which is a reasonable proxy
for correctness but is **not** a substitute for actually running
`npm run verify` and a live deployment. Please run the commands below
yourself before treating this as a graded, working submission.

## One-time GCP project setup

```bash
export PROJECT_ID=<your-gcp-project-id>
export REGION=us-central1
export REPOSITORY=storeops

gcloud config set project "$PROJECT_ID"

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

# Artifact Registry repository for the container image
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="StoreOps API container images"

# Least-privilege runtime service account for Cloud Run
gcloud iam service-accounts create storeops-run-sa \
  --display-name="StoreOps Cloud Run runtime identity"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:storeops-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:storeops-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"
```

## Local verification (run this first, before any GCP step)

```bash
npm install
npm run verify        # typecheck + lint + depcruise + test --coverage
npm run build
npm start             # listens on :3000 locally
curl -s http://localhost:3000/health
```

## Local Docker verification (minimum bar per Section 3.4)

```bash
docker build -t storeops-api:local .
docker run --rm -p 8080:8080 storeops-api:local
# in a second terminal:
curl -s http://localhost:8080/health

curl -s -X POST http://localhost:8080/api/activities \
  -H 'Content-Type: application/json' \
  -d '{"storeId":"store-1","title":"Fix freezer unit 3","priority":"CRITICAL","category":"COMPLIANCE","departmentLeadId":"lead-9","dueDate":"2020-01-01T00:00:00.000Z"}'
# copy the returned "id", then:
curl -s -X POST http://localhost:8080/api/activities/sla-sweep -H 'Content-Type: application/json' -d '{}'
# expected: {"data":{"breached":["<the id you copied>"],"escalated":[]}}

curl -s -X PATCH http://localhost:8080/api/activities/bulk-status \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"id":"<the id you copied>","status":"DONE"},{"id":"does-not-exist","status":"DONE"}]}'
# expected: HTTP 207, data has 1 item, failures has 1 item with reason NOT_FOUND
```

## Cloud deployment

**Option A -- manual, one-off deploy (fastest path to a live URL):**

```bash
gcloud builds submit --tag "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/storeops-api:manual" .

gcloud run deploy storeops-api \
  --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/storeops-api:manual" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --service-account="storeops-run-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Run prints a Service URL; verify it:
export SERVICE_URL=$(gcloud run services describe storeops-api --region="$REGION" --format='value(status.url)')
curl -s "${SERVICE_URL}/health"
curl -s -X POST "${SERVICE_URL}/api/activities/sla-sweep" -H 'Content-Type: application/json' -d '{}'
```

**Option B -- CI/CD via Cloud Build trigger (production path):**

```bash
gcloud builds triggers create github \
  --repo-name=gcpojt \
  --repo-owner=arunFWA \
  --branch-pattern="^main$" \
  --build-config=deploy/gcp/cloudbuild.yaml \
  --substitutions=_REGION="$REGION",_REPOSITORY="$REPOSITORY"
```

After this trigger exists, every push to `main` on
`https://github.com/arunFWA/gcpojt` re-runs `npm run verify` inside Cloud
Build (the same commands the harness's own Evaluator ran locally) and,
only if that passes, builds, pushes, and redeploys automatically -- this
is the "CI backstops the harness" relationship described in `CLAUDE.md`
Section 7.

## Evidence to attach once you run the above

- [ ] Output of `npm run verify` showing 0 errors and coverage numbers
- [ ] Screenshot or terminal capture of `docker run` + the three `curl`
      calls above returning the expected bodies
- [ ] The live Cloud Run `SERVICE_URL` and the response body from
      `curl "$SERVICE_URL/health"` and the `sla-sweep` call against it
