---
title: "Chapter 4. abada-65 + Cloudflare Edge Architecture"
slug: "architecture"
chapter: 4
words_target: 4000
screenshots:
  - ch04-step01-architecture-overview
  - ch04-step02-docker-compose-up
  - ch04-step03-cloudflared-tunnel-status
  - ch04-step04-nginx-reverse-proxy-config
  - ch04-step05-container-network-diagram
  - ch04-step06-health-check-dashboard
---

# Chapter 4. abada-65 + Cloudflare Edge Architecture

## Learning Objectives

- Diagram the entire Docker Compose stack on the abada-65 host
- Identify each container's responsibility, ports, and network isolation
- Explain how Cloudflare Tunnel, WAF, and R2 split the work
- Identify single points of failure on a single host and the mitigations we plan
- Trace a single request through nine hops, from browser to DB

## The Big Picture

Our infrastructure is **one server (abada-65) plus one Cloudflare Edge
plane**. The server is a single physical or virtual machine; on top of it,
Docker Compose runs six containers; all outside traffic enters through a
Cloudflare Tunnel. The number of inbound ports is zero — accidental
exposure through firewall misconfiguration is structurally impossible.

<!-- SCREENSHOT: ch04-step01-architecture-overview -->
![Full architecture: abada-65 plus Cloudflare Edge](../assets/screenshots/ch04-step01-architecture-overview.png)
*Figure 4-1. Left: users (inspectors, administrators). Top middle: Cloudflare Edge (DNS, WAF, Tunnel). Bottom middle: abada-65 with six containers. Right: R2 plus Resend.*
<!-- /SCREENSHOT -->

## 4.1 abada-65 — One Host

### 4.1.1 Specs

- 4 vCPU, 8GB RAM, 200GB NVMe SSD
- Ubuntu 22.04 LTS, Docker 25.x, Docker Compose v2
- All persistent volumes live under `/data` (operational convention)

<!-- TODO: Insert real server specs and a hardware photo -->

### 4.1.2 Containers

```yaml
services:
  app:           # Next.js 14 (web + API)
  postgres:      # 16 (Drizzle target)
  redis:         # 7 (rate-limit, magic-link nonce)
  cron-worker:   # node-cron + six jobs (chapter 12)
  nginx:         # internal reverse proxy + healthz
  cloudflared:   # Cloudflare Tunnel
```

<!-- SCREENSHOT: ch04-step02-docker-compose-up -->
![docker compose up — six containers come up healthy](../assets/screenshots/ch04-step02-docker-compose-up.png)
*Figure 4-2. The terminal one minute after `docker compose up -d`. All six containers report healthy.*
<!-- /SCREENSHOT -->

## 4.2 Cloudflare Tunnel — Zero Inbound Ports

### 4.2.1 How it works

The cloudflared container makes only outbound connections to the Cloudflare
edge. User traffic descends through that tunnel and lands on nginx, which
forwards to the app.

<!-- SCREENSHOT: ch04-step03-cloudflared-tunnel-status -->
![cloudflared tunnel info — four active edges](../assets/screenshots/ch04-step03-cloudflared-tunnel-status.png)
*Figure 4-3. Output of `cloudflared tunnel info`. Four points of presence (Seoul, Tokyo, Singapore, LA) hold concurrent connections; if any one drops, traffic does not.*
<!-- /SCREENSHOT -->

### 4.2.2 Effects

- **Zero inbound ports** — even 22 closes (use SSH over Tunnel if needed)
- **DDoS absorbed at the edge**
- **WAF rules** — bot, geo, rate-limit all on the edge

## 4.3 nginx — Internal Reverse Proxy

```nginx
server {
  listen 80;
  location /healthz { return 200 "ok"; }
  location / { proxy_pass http://app:3000; }
}
```

<!-- SCREENSHOT: ch04-step04-nginx-reverse-proxy-config -->
![nginx.conf — healthz separated from app routing](../assets/screenshots/ch04-step04-nginx-reverse-proxy-config.png)
*Figure 4-4. The twelve key lines of nginx.conf. Separating /healthz lets cloudflared's health probe return 200 even while the app is cold-starting or migrating.*
<!-- /SCREENSHOT -->

### 4.3.1 Why /healthz is separate

While the app is building or migrating, nginx still returns 200, preventing
cloudflared from yanking the tunnel during a normal restart. (See commits
`f79a3b1` and `49a1976` for the incident that drove this pattern.)

## 4.4 Container Network Isolation

<!-- SCREENSHOT: ch04-step05-container-network-diagram -->
![Three Docker networks: frontend, backend, data](../assets/screenshots/ch04-step05-container-network-diagram.png)
*Figure 4-5. cloudflared and nginx live on `frontend`; app and cron-worker straddle `frontend`+`backend`; postgres and redis only on `data`.*
<!-- /SCREENSHOT -->

| Network | Members |
|---|---|
| frontend | cloudflared, nginx |
| backend | nginx, app, cron-worker |
| data | app, cron-worker, postgres, redis |

The DB never appears on `frontend`. Even if nginx is somehow compromised,
the database is one extra hop away.

## 4.5 Nine Hops of a Single Request

```
1. Browser
2. Cloudflare DNS
3. Cloudflare Edge (WAF, rate-limit, cache)
4. Cloudflare Tunnel
5. cloudflared (abada-65)
6. nginx (abada-65, frontend network)
7. app/Next.js (abada-65, backend network)
8. Drizzle / postgres (abada-65, data network)
9. Response back, in reverse
```

<!-- TODO: Add an actual trace from a tool similar to X-Ray -->

## 4.6 SPOF and Mitigation

If abada-65 dies, the SaaS dies. That is honestly a SPOF. Our mitigations:

| Threat | Mitigation |
|---|---|
| Disk fault | RAID-1 plus daily R2 backup (chapter 14) |
| OS crash | Auto-reboot plus Uptime Kuma alerts (chapter 15) |
| Datacenter outage | The 30-minute failover scenario in chapter 16 (adapter pattern) |
| Cloudflare itself | DNS swap scenario plus emergency direct-exposure mode |

<!-- SCREENSHOT: ch04-step06-health-check-dashboard -->
![Uptime Kuma — six container monitors plus one external monitor](../assets/screenshots/ch04-step06-health-check-dashboard.png)
*Figure 4-6. Uptime Kuma. app, db, redis, cron, nginx, cloudflared, plus an external probe of https://aed.example.kr/healthz — seven monitors.*
<!-- /SCREENSHOT -->

## Summary

- One abada-65 host plus one Cloudflare Edge plane equals zero inbound ports
- Six containers across three networks isolate responsibilities
- The single-host SPOF is acknowledged honestly and mitigated by chapters 14, 15, 16
- The /healthz separation pattern is the key to surviving cold starts and migrations under cloudflared's health probes

## Next Chapter

Next we look at three-layer multi-tenant isolation — URL, DB column, query
guard — and the guardrails that make a single missed line impossible to
turn into a data leak.

## Capture Checklist

- [ ] `ch04-step01-architecture-overview.png`
- [ ] `ch04-step02-docker-compose-up.png`
- [ ] `ch04-step03-cloudflared-tunnel-status.png`
- [ ] `ch04-step04-nginx-reverse-proxy-config.png`
- [ ] `ch04-step05-container-network-diagram.png`
- [ ] `ch04-step06-health-check-dashboard.png`
