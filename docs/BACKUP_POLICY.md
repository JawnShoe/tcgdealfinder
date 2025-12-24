# Backup Policy

**Purpose**: Define backup strategy and restore procedures for this project.

**Last Updated**: 2025-12-24

---

## Source of Truth

**GitHub repository** (`origin`) is the authoritative source of truth for all code and configuration.

- Remote: `https://github.com/JawnShoe/tcgdealfinder.git`
- All merged work must be pushed to the remote immediately after PR merge
- Local clones are ephemeral; remote is canonical

---

## Backup Strategy

### 1. Git Remote (Primary Backup)

**What**: All committed code, configuration, and tracked documentation
**Where**: GitHub repository (`origin`)
**Frequency**: Continuous (every push)
**Responsibility**: Enforced by branch protection on `main`

**Rule**: Every merged pack/PR must be pushed to `origin` immediately after merge.

### 2. Restorepoint Bundles (Secondary Backup)

**What**: Git bundles capturing specific commit snapshots for major milestones
**Where**: `T:\Projects\restorepoints\` (local filesystem, user-managed)
**Frequency**: Manual, on-demand for significant milestones
**Responsibility**: User discretion

**Purpose**:
- Quick rollback to known-good states
- Recovery if remote history is accidentally damaged
- Pre/post snapshots for risky operations

**Not a substitute for remote**: Restorepoint bundles are convenience snapshots, not the primary backup.

### 3. Database (Neon Hosted)

**What**: Production database (Neon Postgres)
**Where**: Neon cloud platform
**Frequency**: Managed by Neon (automatic backups per plan)
**Responsibility**: Neon platform

**Access**: View backup settings in Neon dashboard
**Schema source of truth**: Migration files in `migrations/` directory

---

## Restore Procedures

### Restore from Remote (Standard)

```bash
# Clone from remote
git clone https://github.com/JawnShoe/tcgdealfinder.git

# Or reset local to remote state
git fetch origin
git reset --hard origin/main
```

### Restore from Restorepoint Bundle

```bash
# Verify bundle integrity
git bundle verify /path/to/restorepoint.bundle

# Fetch from bundle
git fetch /path/to/restorepoint.bundle refs/heads/main:refs/heads/restore-temp

# Inspect before applying
git log restore-temp

# Apply if verified
git reset --hard restore-temp
git branch -D restore-temp
```

### Database Restore (Neon)

1. Open Neon project dashboard
2. Navigate to "Backups" section
3. Select restore point
4. Follow Neon's point-in-time recovery workflow

**Schema restoration**: Re-apply migration files from `migrations/` directory in order if schema recovery is needed.

---

## Operator Checklist

**Rule**: Every merge to `main` MUST be pushed to `origin` immediately.

### After PR Merge

Run these commands to verify remote sync:

```bash
# 1. Verify you're on main
git branch --show-current

# 2. Confirm local and remote main are in sync (both should show no output)
git log main..origin/main --oneline    # Local behind remote? (should be empty)
git log origin/main..main --oneline    # Local ahead of remote? (should be empty)

# 3. If local is ahead, push immediately
git push origin main

# 4. Verify remote push succeeded
git log -1 origin/main --oneline
```

**Expected output when in sync**: Both `git log` commands return nothing (empty output).

**If local is ahead**: The second command will show commits. Push immediately with `git push origin main`.

**Testable invariant**: At end of every pack, `git log origin/main..main` MUST return empty output.

---

## Verification Checklist

After any restore operation:

- [ ] `npm ci` completes successfully
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` compiles all routes
- [ ] `.env.local` contains required secrets (not in repo)
- [ ] Database connection verified (`DATABASE_URL` correct)
- [ ] Git remote points to correct repository (`git remote -v`)

---

## Recovery Contacts

- **Code/Git issues**: Check GitHub repository and local restorepoints
- **Database issues**: Neon platform support + dashboard
- **Environment secrets**: Local `.env.local` backup (user-managed, not tracked)

---

**Governance**: This policy is maintained as part of the Repo Hardening Pack (2025-12-24).
