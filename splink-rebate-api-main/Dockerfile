# Use an official Node.js runtime as the base image
FROM node:20.12.2

WORKDIR /app

COPY package.json yarn.lock ./

RUN apt-get update && apt-get install -y jq python3-venv
RUN python3 -m venv /app/venv
RUN /app/venv/bin/pip install awscli

ENV PATH="/app/venv/bin:$PATH"

COPY ./entrypoint-dev.sh /app/
COPY ./entrypoint-stage.sh /app/
COPY ./entrypoint-worker-stage.sh /app/
COPY ./entrypoint.sh /app/
COPY ./entrypoint-worker.sh /app/
COPY ./entrypoint-main-stage.sh /app/
COPY ./entrypoint-worker-main-stage.sh /app/
COPY ./src/config /app/src/config

ARG ENV=default
ENV ENV=${ENV}

RUN yarn install --frozen-lockfile

COPY . .

RUN chmod +x /app/entrypoint-dev.sh
RUN chmod +x /app/entrypoint-stage.sh
RUN chmod +x /app/entrypoint-worker-stage.sh
RUN chmod +x /app/entrypoint.sh
RUN chmod +x /app/entrypoint-worker.sh
RUN chmod +x /app/entrypoint-main-stage.sh
RUN chmod +x /app/entrypoint-worker-main-stage.sh

# bump Node’s heap to 4 GB
ENV NODE_OPTIONS=--max_old_space_size=4096

RUN yarn run build

# Expose application port
EXPOSE ${PORT:-3001}

# Use the entrypoint script
ENTRYPOINT ["/bin/sh", "-c", "if [ \"$ENV\" = \"develop\" ]; then exec /app/entrypoint-dev.sh; elif [ \"$ENV\" = \"staging\" ]; then exec /app/entrypoint-stage.sh; elif [ \"$ENV\" = \"main_stage\" ]; then exec /app/entrypoint-main-stage.sh; else exec /app/entrypoint.sh; fi"]
