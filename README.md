# StoreOps Harness -- AI-Native Tech Architect Capstone (Build Track)

A Claude Code development harness that governs AI-assisted feature work
on **StoreOps**, a retail store operations REST API, deployed on
**Google Cloud Platform** (Cloud Run + Artifact Registry + Cloud Build).

This repository is the working implementation submitted against
`AI_Native_Architect_Build_Track_SA_M_SM_AD.pdf` (Cognizant Skillspring,
Capstone Case Study 1, Build Track).

## Start here

| If you want to... | Read |
|---|---|
| Understand the architectural thinking behind this harness | [`DESIGN_BRIEF.md`](./DESIGN_BRIEF.md) |
| See exactly how the harness is wired (orchestration, routing, escalation) | [`CLAUDE.md`](./CLAUDE.md) |
| See the feature prompt used for the demonstration run | [`PROMPT.md`](./PROMPT.md) |
| See the Planner's spec and sprint contract for that run | [`spec.md`](./spec.md), [`sprint-1-contract.md`](./sprint-1-contract.md) |
| See what the Generator produced and how the Evaluator graded it | [`.harness/reviews/`](./.harness/reviews/) |
| Deploy this to your own GCP project | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| Read an honest take on what worked and what didn't | [`REFLECTION.md`](./REFLECTION.md) |
| Follow the build's in-progress reasoning | [`JOURNAL.md`](./JOURNAL.md) |

## Repository structure

```
CLAUDE.md                  Root orchestrator
PROMPT.md                  Demo run's feature prompt
spec.md                    Planner output for the demo run
sprint-1-contract.md       Sprint contract with GIVEN/WHEN/THEN ACs
DESIGN_BRIEF.md            Architectural intent (Sections A-D + GCP mapping)
DEPLOYMENT.md              GCP Cloud Run deployment runbook
REFLECTION.md              Honest assessment of the demo run
JOURNAL.md                 Architecture journal (bonus deliverable)
.harness/agents/           planner / generator / evaluator / monitor definitions
.harness/skills/           8 skill files (feedforward context per agent)
.harness/reviews/          Archived sprint artefacts (governance audit trail)
src/                       StoreOps source: activities, programmes, staff, alerts, reports, shared
tests/                     Test suite mirroring src/
deploy/gcp/cloudbuild.yaml Cloud Build pipeline -> Artifact Registry -> Cloud Run
Dockerfile, docker-compose.yml
```

## Quickstart

```bash
npm install
npm run verify     # typecheck + lint + module-boundary check + tests w/ coverage
npm run build && npm start
curl -s http://localhost:3000/health
```

See `DEPLOYMENT.md` for the full local-Docker and GCP Cloud Run paths,
including a note on the network-sandboxed environment this repository
was authored in and what you should verify yourself before treating this
as a fully proven, live deployment.

## Version control

This repository is intended to be pushed to
`https://github.com/arunFWA/gcpojt`. It was authored in a sandboxed
environment with no outbound network access, so the initial push must be
performed from a machine with GitHub access:

```bash
cd gcpojt
git remote add origin https://github.com/arunFWA/gcpojt.git
git branch -M main
git push -u origin main
```
