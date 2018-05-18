# GOV.UK PaaS Infrastructure Map

## Overview

Dashboard for a high density overview of the platform state

## Requirements

* Node.js 8 LTS (if you are an [nvm](https://github.com/creationix/nvm) user install with: `nvm use lts/Carbon`)
* Install the deps `npm install`

## Configuration

Configuration is achieved via the following environment variables:

* **`SNAPSHOT_URL`** a URL to the infrastructure state file
* **`BASIC_AUTH_USERNAME`** restrict access to this username
* **`BASIC_AUTH_PASSWORD`** restrict access to this password

## Running locally

If you have access to a development environment you can fetch the snapshot url
from the state bucket. The following assumes you have the necasary aws
credentials already configured:

```
export SNAPSHOT_URL=$(aws s3 cp s3://gds-paas-${DEPLOY_ENV}-state/health-snapshot-secrets.yml - | awk '/snapshot_url/ { print $2 }')
npm start
```
