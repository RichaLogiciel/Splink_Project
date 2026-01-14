#!/bin/bash

echo "Fetching secrets from AWS Secrets Manager..."

SECRET_NAME="dev-splink-app" # Replace with your actual secret name or make this dynamic
REGION="us-east-2" 

# Attempt to fetch secrets
if ! aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$REGION" > /tmp/secret_response.json; then
  echo "Failed to fetch secrets from AWS Secrets Manager. Exiting..."
  exit 1
fi

echo "Parsing secrets..."
SECRETS=$(aws secretsmanager get-secret-value --secret-id $SECRET_NAME --region $REGION | jq -r '.SecretString' | jq -r "to_entries|map(\"\(.key)=\\\"\(.value|tostring)\\\"\")|.[]")
echo "$SECRETS" > .env

# Load environment variables from .env
echo "Loading environment variables from .env"
set -a # Automatically export all variables from the sourced file
source .env
set +a

echo NEXT_PUBLIC_API_BASE_URL = "$NEXT_PUBLIC_API_BASE_URL"

yarn start &    # Start Next.js in background
nginx -g 'daemon off;'  # Start Nginx in foreground (keeps container alive)
