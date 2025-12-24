# Release Tagging and Changelog Conventions

**Purpose**: Document release tagging strategy and changelog maintenance process.

**Last Updated**: 2025-12-24

---

## Release Strategy

### Versioning Scheme

**Current approach**: No formal semver versioning yet (pre-1.0 project)

**Future approach** (when needed):
- Semantic Versioning (semver): `MAJOR.MINOR.PATCH`
- Example: `v1.2.3`
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes (backwards compatible)

### When to Create a Release

Create a release tag for:
- Major feature completions (e.g., "Watchlist v1", "Seller Trust Signals")
- Security patches (e.g., "Next.js 14.2.35 security patch")
- Production deployments
- Milestones requiring rollback points

**Do not** create releases for:
- Individual commits or small bug fixes
- Work-in-progress branches
- Internal refactors

---

## Tagging Procedure

### Creating a Release Tag

1. **Ensure clean state**:
   ```bash
   git status  # Should show "working tree clean"
   git log --oneline -5  # Verify commit is ready for release
   ```

2. **Create annotated tag**:
   ```bash
   # For feature releases
   git tag -a v0.1.0 -m "Release: Watchlist v1 + Seller Trust Signals"

   # For security patches
   git tag -a v0.0.1 -m "Security: Next.js 14.2.35 CVE fixes"
   ```

3. **Push tag to remote**:
   ```bash
   git push origin v0.1.0
   ```

4. **Verify tag exists**:
   ```bash
   git tag -l
   git show v0.1.0
   ```

### Tag Naming Conventions

**Format**: `vMAJOR.MINOR.PATCH`

**Examples**:
- `v0.1.0` - First minor release (pre-1.0)
- `v0.1.1` - Patch release
- `v1.0.0` - First production-ready release
- `v1.1.0` - New feature after 1.0

**Pre-release tags** (optional):
- `v0.1.0-alpha.1` - Alpha release
- `v0.1.0-beta.1` - Beta release
- `v0.1.0-rc.1` - Release candidate

---

## Changelog Maintenance

### Where Release Notes Live

**Primary source**: `PROJECT_SSOT.md`

**Reason**: SSOT already contains complete history of all changes with:
- Commit hashes
- Dates
- Classification (bug fix, feature, refactor)
- Blast radius
- Verification notes

**Optional**: `docs/CHANGELOG.md` can be added later if needed for public-facing release notes.

### Extracting Release Notes from SSOT

When creating a release, extract relevant sections from PROJECT_SSOT.md:

**Template**:
```markdown
## Release vX.Y.Z (YYYY-MM-DD)

### Features
- Feature description (commit: abc1234)

### Bug Fixes
- Bug fix description (commit: def5678)

### Security
- Security patch description (commit: ghi9012)

### Infrastructure
- CI/tooling changes (commit: jkl3456)
```

**Example** (from current SSOT):
```markdown
## Release v0.1.0 (2025-12-24)

### Security
- Pinned Next.js to 14.2.35 for RSC/Server Action CVE fixes (commits: 17ccf32, 41fed68)

### Infrastructure
- Migrated to ESLint 9 + flat config (commits: 66b769d, c3f6faf) [PR #15]
- Upgraded Tailwind CSS to v4.1.18 (commit: 2edf5b0) [PR #16]
- Added Dependabot + CI build cache (commit: 9efc3ec)
- Standardized pre-commit hook via Husky (commit: c22b3a6)
```

---

## GitHub Releases (Optional)

### Creating a GitHub Release

1. **Navigate to GitHub repository**:
   - Go to https://github.com/JawnShoe/tcgdealfinder
   - Click "Releases" in right sidebar
   - Click "Draft a new release"

2. **Fill in release form**:
   - **Tag version**: Select existing tag (e.g., `v0.1.0`) or create new
   - **Release title**: `Release vX.Y.Z - Brief Description`
   - **Description**: Paste extracted release notes from SSOT
   - **Set as pre-release**: Check if pre-1.0

3. **Attach assets** (optional):
   - Restorepoint bundles
   - Build artifacts
   - Documentation PDFs

4. **Publish release**

### GitHub Release vs Git Tag

- **Git tag**: Lightweight marker in git history
- **GitHub Release**: Web UI presentation of tag with notes and assets
- **Recommendation**: Use git tags for all releases; create GitHub Releases for major milestones only

---

## Rollback Using Release Tags

### Viewing Available Releases

```bash
# List all tags
git tag -l

# Show tag details
git show v0.1.0

# View commits between tags
git log v0.0.1..v0.1.0 --oneline
```

### Rolling Back to a Previous Release

```bash
# Create rollback branch from tag
git checkout -b rollback-to-v0.1.0 v0.1.0

# Or reset current branch to tag (destructive)
git reset --hard v0.1.0

# Push rollback to remote (requires force if history changed)
git push origin main --force-with-lease
```

**Warning**: Force pushing to `main` is risky. Prefer creating a rollback branch and merging via PR.

### Safer Rollback (Revert Commits)

```bash
# Identify commits to revert
git log v0.1.0..HEAD --oneline

# Revert commits in reverse order
git revert <commit-hash>

# Push reverts (no force push needed)
git push origin main
```

---

## Monthly Dependency Updates (Changelog Hygiene)

**Related to**: Dependabot PR review process

When merging Dependabot PRs:

1. **Review changes**: Check release notes for breaking changes
2. **Test locally**: Run `npm ci && npm run lint && npm run build`
3. **Merge PR**: Use GitHub UI or `gh pr merge`
4. **Update SSOT**: Add one-line note to PROJECT_SSOT.md:
   ```
   - Dependency updates (YYYY-MM-DD): Merged Dependabot PRs #X, #Y, #Z (eslint 9.18.0 → 9.19.0, etc.)
   ```

**Batching**: Merge multiple Dependabot PRs together and document as single SSOT entry.

---

## Release Checklist Template

Use this checklist when preparing a release:

- [ ] All PRs for release merged to `main`
- [ ] `git status` shows clean working tree
- [ ] `npm ci && npm run lint && npm run build` passes
- [ ] PROJECT_SSOT.md updated with all changes and commit hashes
- [ ] Extract release notes from SSOT
- [ ] Create annotated git tag (`git tag -a vX.Y.Z -m "..."`)
- [ ] Push tag to remote (`git push origin vX.Y.Z`)
- [ ] (Optional) Create GitHub Release with notes and assets
- [ ] (Optional) Create restorepoint bundle for rollback safety
- [ ] Deploy to production (if applicable)
- [ ] Verify deployment health (`/api/health` endpoint)

---

**Governance**: This document is maintained as part of the Repo Hardening Pack (2025-12-24).
