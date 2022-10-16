# Trailhead Backend
This is the backend of DOC Trailhead.
The frontend repo is [here](https://github.com/dartmouth-outing-club/trailhead-frontend).

## Development
Trailhead runs on Node 18.

Development commands:
* `npm i` - install dependencies
* `npm run dev` - run in development mode (requires local mongo server to be running)
* `npm run prod` - run in development mode (requires local mongo server to be running)
* `npm start` - run in production mode (requires `.env` file)
* `npm run lint` - run the linter
* `npm run format` - run the linter in `--fix` mode (might alter the code)

## Deployment
Trailhead is deployed on a DigitalOcean droplet and served behind an NGINX proxy.
