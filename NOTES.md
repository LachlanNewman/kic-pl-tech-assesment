# Notes

## Assumptions

- The application will need to be scaled to handle approximately a million users.
- A user will be likely making a purchase on Shopify not very often, but a booking will come in once a week. its likly they will login to the kic app at least once a day

## Tradeoffs

- Database design may get large because we are keeping log record of merges. This is to simplify the revert process

## What I'd do differently with more time

<!-- What would change with a full production timeline? -->

- setup a serverless function or setup aws api gateway to handle webhooks
- foward the events from the serverless function to a queue for durability
- implment a worker that can be spun up to read from queue which can be scales horizontally
- send failed parsing events to a DLQ to allow replays.
- remove next js and use a simple koa app.
