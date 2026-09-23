FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --ignore-scripts

# Stage completa (node_modules + prisma.config.ts + .next): la usa el servicio
# `migrate` del compose para correr `npx prisma migrate deploy` con el CLI
# entero de Prisma 7 (que necesita @prisma/config, c12, effect, valibot, typescript...).
FROM node:24-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_PROJECT_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_PREPARTE_BUCKET
ARG NEXT_PUBLIC_SHOW_LOGS
ENV NEXT_PUBLIC_PROJECT_URL=$NEXT_PUBLIC_PROJECT_URL \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    NEXT_PUBLIC_PREPARTE_BUCKET=$NEXT_PUBLIC_PREPARTE_BUCKET \
    NEXT_PUBLIC_SHOW_LOGS=$NEXT_PUBLIC_SHOW_LOGS \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# Runner: solo el output standalone de Next. El runtime de Prisma (@prisma/client,
# @prisma/adapter-pg, pg) viene dentro de .next/standalone/node_modules por file
# tracing; el CLI de Prisma NO va aca (las migraciones las corre el servicio `migrate`).
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
