# GitHub Actions Workflows

This directory contains CI/CD workflows for the Quai GPU Miner dashboard.

## Workflows

### Quality Gates (`quality-gates.yml`)
Runs quality checks on push and pull requests:
- Linting
- Format checking
- Security tests
- Unit tests
- Syntax validation
- Security audit

**Note:** For private repositories, some checks are non-blocking to prevent email spam from minor issues.

### Dependabot Auto-Merge (`dependabot-auto-merge.yml`)
Automatically merges Dependabot PRs that pass tests.

## Disabling Workflows

If you want to disable workflows temporarily:

1. Go to your repository Settings → Actions → General
2. Under "Workflow permissions", you can disable workflows
3. Or add `[skip ci]` to your commit message to skip workflows

## Private Repository Notes

- Codecov uploads are skipped for private repos (requires token)
- Security audits are non-blocking to reduce email notifications
- Test failures are logged but don't block the pipeline

