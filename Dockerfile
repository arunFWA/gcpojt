# --- build stage ---
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- runtime stage ---
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# Cloud Run sets PORT at runtime; default kept for local `docker run`.
ENV PORT=8080
EXPOSE 8080

# Non-root user for the GCP security baseline (see DEPLOYMENT.md).
RUN addgroup --system storeops && adduser --system --ingroup storeops storeops
USER storeops

CMD ["node", "dist/server.js"]
