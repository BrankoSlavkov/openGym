# Two targets from one file.
#
# Fork: the api runs on Bun (FORK.md), from oven/bun's Alpine image, installed from bun.lock.
#
#   default (built when no --target is given) — what every instance has always got. No AI
#           runtime, no AI dependency: `--omit=optional` skips the Agent SDK and its
#           platform runtime entirely, so an owner who never wanted the Coach carries none of it.
#   coach                                     — the same image plus the Claude Agent SDK.
#
# Build the opt-in one with:  docker build --pull --target coach ./api
# or through compose with:    API_TARGET=coach docker compose up --build
#
# The stage order matters: Docker builds the *last* stage when none is named, so `default` is
# deliberately last and `coach` sits above it.

FROM oven/bun:1.4.4-alpine AS base

# Declared on the base stage so both targets inherit the labels and the healthcheck.
ARG VERSION=dev
ARG VCS_REF=dev
ARG BUILD_DATE=unknown

LABEL maintainer="Duarte Santos https://github.com/DuarteSantos8" \
    org.opencontainers.image.title="opengym-api" \
    org.opencontainers.image.description="Backend for Self-hosted gym & body-weight tracker — plan routines, log workouts (supersets & cardio too), track your weight and progress, passkey login. Your data, your server." \
    org.opencontainers.image.source="https://github.com/DuarteSantos8/openGym" \
    org.opencontainers.image.url="https://opengym.ch" \
    org.opencontainers.image.documentation="https://github.com/DuarteSantos8/openGym#readme" \
    org.opencontainers.image.licenses="AGPL-3.0-or-later" \
    org.opencontainers.image.version=$VERSION \
    org.opencontainers.image.revision=$VCS_REF \
    org.opencontainers.image.created=$BUILD_DATE

WORKDIR /app

# The base image is rebuilt on Bun's schedule, not alpine's: between two Bun releases the
# alpine packages it ships fall behind their fixes. Taking the upgrades at build time keeps the
# published image at alpine's current state without waiting for Bun.
RUN apk upgrade --no-cache

# The unprivileged user Coach jobs drop to. Its uid cannot read /data, which is the control that
# keeps a provider runtime away from users, passkeys and the session secret.
#
# Not optional, and not only for the real providers: canDropPrivileges() fails closed on Linux,
# so in an image without this user *every* job is refused with "no `coach` user exists in this
# image" — including the fixture provider that exists precisely so the loop can be walked before
# an account is connected. It costs one line and no bytes worth measuring.
RUN adduser -D -H -s /sbin/nologin coach

COPY package.json bun.lock ./
# --frozen-lockfile: the lockfile is the point of committing one, and the SDK's per-platform
# runtime is resolved from it (musl on this base) rather than from whatever the build host
# happened to be.
RUN bun install --frozen-lockfile --production --omit=optional && rm -rf /root/.bun/install/cache

# Every module server.js imports from the api root has to be named here: the image carries nothing
# else, and one that is missing only shows at boot, as ERR_MODULE_NOT_FOUND.
COPY server.ts http-app.ts push-messages.ts nudge.ts nudge-copy.ts wrapped.ts wrapped-copy.ts checkin-reminder.ts checkin-copy.ts verify-error.ts password.ts rate-limit.ts passkeys-store.ts device-link.ts media.ts queue.ts sync-stamps.ts durable.ts admin-socket.ts recover.ts net-guard.ts permissions.ts consent.ts share-log.ts tokens.ts oauth.ts budgets.ts role-claims.ts origin.ts live-session.ts ./
COPY coach ./coach
COPY library ./library
COPY oidc ./oidc
COPY integrations ./integrations
COPY trainers ./trainers
COPY sources ./sources
# Fork: the OpenAPI route definitions, document and request checks (FORK.md).
COPY openapi ./openapi
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.ts"]

# Every 30 s, so a fresh container reads "healthy" half a minute after it starts instead of after
# five (TrueNAS and Portainer wait for it before they call the app running, #844).
# wget is BusyBox's, already in the Alpine image, so nothing is added for it.
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=20s \
            --retries=3 \
            CMD wget --spider -q "http://127.0.0.1:${PORT}/api/health" || exit 1

# ---------------------------------------------------------------------------------------------
# The opt-in target. Dropping --omit=optional is the whole difference: it pulls in
# @anthropic-ai/claude-agent-sdk together with the one platform runtime this base needs
# (linux-*-musl), both pinned by the lockfile.
FROM base AS coach
RUN bun install --frozen-lockfile --production && rm -rf /root/.bun/install/cache

# Codex ships as a CLI rather than a library, so it is installed rather than resolved, and
# bubblewrap is its sandbox — a Codex requirement, which is why neither appears in the default
# target or anywhere in this tree until now. Fork: its launcher is a Node script, and the Bun
# base has no Node, so this target alone carries Alpine's nodejs (npm only for the install).
RUN apk add --no-cache bubblewrap nodejs npm \
 && npm install -g @openai/codex@0.160.0 \
 && npm cache clean --force \
 && apk del npm

# Where Codex keeps its refreshable login cache. Deliberately a sibling of /data rather than a
# path inside it: docs/SELF_HOSTING tells owners to back up with `tar czf … data/`, and a live
# refresh token has no business riding along in every archive that instruction produces. Owned
# by `coach` because the job that writes it has already dropped to that user.
RUN mkdir -p /coach-auth && chown coach:coach /coach-auth && chmod 700 /coach-auth
VOLUME ["/coach-auth"]

# ---------------------------------------------------------------------------------------------
# Last, so that a plain `docker build --pull ./api` keeps producing the runtime-free image.
# Fork: the Bun base never had npm, so there is nothing to strip here any more.
FROM base AS default
