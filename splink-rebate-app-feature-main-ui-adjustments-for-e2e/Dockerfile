# 1) Build stage ---------------------------------------------------------
FROM node:20.12.2 AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn run build

# 2) Runtime stage -------------------------------------------------------
FROM node:20.12.2-slim AS runtime

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip jq awscli \
 && rm -rf /var/lib/apt/lists/*

ARG ENV=main
ENV ENV=$ENV

# Copy only what we need at runtime
COPY package.json yarn.lock ./

# bring in your Next.js config so rewrites / assetPrefix / images work
COPY --from=builder /app/next.config.js ./

# bring in installed modules from builder
COPY --from=builder /app/node_modules ./node_modules
# bring in the build outputs
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy and make your entrypoint executable
COPY ./entrypoint-dev.sh /app/
COPY ./entrypoint-stage.sh /app/
COPY ./entrypoint-main-stage.sh /app/
COPY ./entrypoint.sh /app/

RUN chmod +x /app/entrypoint-dev.sh
RUN chmod +x /app/entrypoint-stage.sh
RUN chmod +x /app/entrypoint-main-stage.sh
RUN chmod +x /app/entrypoint.sh

RUN echo "ENV is set to: $ENV"

RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy your nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose Nginx port
EXPOSE 80

# Run your entrypoint, which ultimately does `yarn start`
ENTRYPOINT ["/bin/sh", "-c", "echo ENV is $ENV && if [ \"$ENV\" = \"develop\" ]; then exec /app/entrypoint-dev.sh; elif [ \"$ENV\" = \"staging\" ]; then exec /app/entrypoint-stage.sh;  elif [ \"$ENV\" = \"main_stage\" ]; then exec /app/entrypoint-main-stage.sh; else exec /app/entrypoint.sh; fi"]

