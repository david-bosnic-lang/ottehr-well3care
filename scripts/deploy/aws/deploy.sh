#!/bin/sh

CONFIG_FILE="$(dirname "$0")/../deploy-config.json"

project_id=$(grep '"project_id"' "$CONFIG_FILE" | sed 's/.*: "\(.*\)".*/\1/')
access_token=$(grep '"access_token"' "$CONFIG_FILE" | sed 's/.*: "\(.*\)".*/\1/')
provider_email=$(grep '"provider_email"' "$CONFIG_FILE" | sed 's/.*: "\(.*\)".*/\1/')
environment=$(grep '"environment"' "$CONFIG_FILE" | sed 's/.*: "\(.*\)".*/\1/')
ENV="$environment"

if [ -f "apps/intake/env/.env.$environment" ]; then
    first_setup="no"
else
    first_setup="yes"
fi
echo "$first_setup"

if [ "$first_setup" = "yes" ]; then
    ./scripts/ottehr-setup.sh "$project_id" "$access_token" "$provider_email" "$environment"
else
    npm install
fi

cd packages/zambdas || exit 1
ENV="$environment" npm run deploy-zambdas "$environment"
ENV="$environment" npm run setup-secrets "$environment"
ENV="$environment" npm run setup-deployed-resources "$environment"
cd - || exit 1

cd apps/intake || exit 1
npm run build:env --env="$environment"
cd - || exit 1

cd apps/ehr || exit 1
npm run build:env --env="$environment"
cd - || exit 1
first_setup="yes"
if [ "$first_setup" = "yes" ]; then
    cd scripts/deploy/aws || exit 1
    npx cdk bootstrap
    cd - || exit 1
fi

cd scripts/deploy/aws || exit 1
npx cdk deploy --require-approval=never "ottehr-infra-stack-${environment}"
npx ts-node ./bin/update-config.ts
cd - || exit 1

cd apps/intake || exit 1
npm run build:env --env="$environment"
cd - || exit 1

cd apps/ehr || exit 1
npm run build:env --env="$environment"
cd - || exit 1

cd scripts/deploy/aws || exit 1
npx cdk deploy --require-approval=never "ottehr-data-stack-${environment}"
cd - || exit 1
