#!/bin/bash

set -eu

if [ -z "${DEPLOY_ENV:-}" ]; then
  echo "You must set the DEPLOY_ENV environment variable" 1>&2
  exit 1
fi

if [ -z "${AWS_ACCOUNT}" ]; then
  echo "You must set the AWS_ACCOUNT environment variable to (dev|ci|staging|prod)" 1>&2
  exit 1
fi

case "$AWS_ACCOUNT" in
  dev)
	SYSTEM_DNS_ZONE_NAME="${DEPLOY_ENV}.dev.cloudpipeline.digital"
  ;;
  ci)
	SYSTEM_DNS_ZONE_NAME="${DEPLOY_ENV}.ci.cloudpipeline.digital"
  ;;
  staging)
	SYSTEM_DNS_ZONE_NAME="staging.cloudpipeline.digital"
  ;;
  prod)
	SYSTEM_DNS_ZONE_NAME="cloud.service.gov.uk"
  ;;
esac

BOSH_ID_RSA="$(aws s3 cp "s3://gds-paas-${DEPLOY_ENV}-state/bosh_id_rsa" - | base64)"
export BOSH_ID_RSA

BOSH_CA_CERT="$(aws s3 cp "s3://gds-paas-${DEPLOY_ENV}-state/bosh-CA.crt" -)"
export BOSH_CA_CERT

BOSH_IP=$(aws ec2 describe-instances \
	--filters "Name=key-name,Values=${DEPLOY_ENV}_bosh_ssh_key_pair" \
	--query 'Reservations[].Instances[].PublicIpAddress' --output text)
export BOSH_IP

BOSH_ADMIN_PASSWORD=$(aws s3 cp "s3://gds-paas-${DEPLOY_ENV}-state/bosh-secrets.yml" - | \
	ruby -ryaml -e 'print YAML.load(STDIN)["secrets"]["bosh_admin_password"]')
export BOSH_ADMIN_PASSWORD

function bosh() {
	docker run  \
		--rm \
		--env "BOSH_ID_RSA" \
		--env "BOSH_IP" \
		--env "BOSH_ADMIN_PASSWORD" \
		--env "BOSH_ENVIRONMENT=bosh.${SYSTEM_DNS_ZONE_NAME}" \
		--env "BOSH_CA_CERT" \
		--env "BOSH_DEPLOYMENT=${DEPLOY_ENV}" \
		bosh "$@"
}

output=dist/bosh-state.json
while true; do
	bosh --json instances --ps --details | \
	jq '.Tables[0].Rows | {"vms": [.[] | select(.process == "")], "jobs": [.[] | select(.process != "")], "azs": [.[] | select(.az != "") | {"bosh_name": .az}] | unique}' > $output
	echo "updated bosh state $output"
	sleep 5
done
