---
title: "Chapter 14. Daily Backup, gpg Encryption, R2 Mirror"
slug: "backup"
chapter: 14
words_target: 3500
screenshots:
  - ch14-step01-pgdump-output
  - ch14-step02-gpg-encrypt-result
  - ch14-step03-rclone-r2-upload
  - ch14-step04-backup-rotation-policy
  - ch14-step05-restore-rehearsal
---

# Chapter 14. Daily Backup, gpg Encryption, R2 Mirror

## Learning Objectives

- Build a three-stage pipeline of pg_dump + gzip + gpg
- Mirror to Cloudflare R2 with rclone
- Apply a 7-30-365 retention policy that balances cost and safety
- Automate semi-annual restore drills
- Map the five failure modes of the backup pipeline to alerts

## The Big Picture

The real meaning of backup is not "we have backups" but "we have backups
**that can be restored**." Backups never rehearsed are not backups. So
every six months we run an actual restore scenario automatically and alert
on the result.

## 14.1 The Three-Stage Pipeline

```bash
pg_dump $DATABASE_URL \
  | gzip \
  | gpg --encrypt --recipient backup@aed.example.kr \
  > /backup/pg-$(date +%Y%m%d).sql.gz.gpg
```

<!-- SCREENSHOT: ch14-step01-pgdump-output -->
![pg_dump — progress and output size](../assets/screenshots/ch14-step01-pgdump-output.png)
*Figure 14-1. A year of 100-device data is ~120MB raw, ~25MB after gzip. gpg barely changes the size.*
<!-- /SCREENSHOT -->

## 14.2 gpg Encryption

The key is doubled — an operator's hot key plus a cold-storage emergency
key. The passphrase is held separately from the operations team.

<!-- SCREENSHOT: ch14-step02-gpg-encrypt-result -->
![gpg --encrypt result — file is application/pgp](../assets/screenshots/ch14-step02-gpg-encrypt-result.png)
*Figure 14-2. `file -i` confirms application/pgp. Even if the entire R2 bucket leaks, it is useless without the key.*
<!-- /SCREENSHOT -->

## 14.3 Mirroring to R2

```bash
rclone copy /backup remote:aed-backup-r2 \
  --include "pg-*.gpg" --transfers 4 --checkers 8
```

<!-- SCREENSHOT: ch14-step03-rclone-r2-upload -->
![rclone upload — Transferred 25 MiB / 25 MiB, 100%](../assets/screenshots/ch14-step03-rclone-r2-upload.png)
*Figure 14-3. Runs at 03:30 every day. R2's free egress makes the cost negligible.*
<!-- /SCREENSHOT -->

## 14.4 Retention — 7-30-365

| Location | Retention |
|---|---|
| abada-65 local (`/backup`) | 7 days |
| R2 (Hot) | 30 days |
| R2 (Infrequent / Glacier-equivalent) | 365 days |

<!-- SCREENSHOT: ch14-step04-backup-rotation-policy -->
![Rotation script — find -mtime +7 / +30 / +365](../assets/screenshots/ch14-step04-backup-rotation-policy.png)
*Figure 14-4. Integrated into the cleanup-stale cron job. A simple `find -mtime` is enough.*
<!-- /SCREENSHOT -->

## 14.5 Restore Drill

Every six months, automatically:

1. Download the latest R2 backup
2. Restore into a temporary container
3. Verify row counts vs the seed reference
4. Push the result to Uptime Kuma

<!-- SCREENSHOT: ch14-step05-restore-rehearsal -->
![Restore drill — restore_passed=true, row_diff=+12,403](../assets/screenshots/ch14-step05-restore-rehearsal.png)
*Figure 14-5. The drill log. A positive row_diff and a recent last_record means pass.*
<!-- /SCREENSHOT -->

### 14.5.1 Why Six Months?

Monthly is too frequent, yearly is too sparse. Six months is the trade-off
sweet spot.

## 14.6 Five Failure Modes

| Failure | Alert |
|---|---|
| pg_dump fails | Immediate (Kuma push miss → 5 min) |
| gpg key expiring | 30 days early advance alert |
| rclone upload fails | Detected at the next job cycle |
| R2 key expires | Quarterly check |
| Restore drill fails | Next business day, immediate |

## Summary

- Backup = pg_dump + gzip + gpg + rclone, a four-step pipeline
- 7-30-365 retention plus R2's free egress is the cost-efficiency core
- Semi-annual automated restore drills are the proof that backups can be restored
- All five failure modes have explicit alert paths

## Next Chapter

Next we build 24/7 monitoring with Uptime Kuma plus Cloudflare Analytics
and define the rules for when an alert deserves to wake you up.

## Capture Checklist

- [ ] `ch14-step01-pgdump-output.png`
- [ ] `ch14-step02-gpg-encrypt-result.png`
- [ ] `ch14-step03-rclone-r2-upload.png`
- [ ] `ch14-step04-backup-rotation-policy.png`
- [ ] `ch14-step05-restore-rehearsal.png`
