# Trailhead Backend
This is the backend of DOC Trailhead.
The frontend repo is [here](https://github.com/dartmouth-outing-club/trailhead-frontend).

## Development
Trailhead runs on Node 18. A fresh installation of Node should work perfectly.

Development commands:
* `npm i` - install dependencies
* `npm dev` - run in development mode (requires local mongo server to be running)
* `npm start` - run in production mode (requires `.env` file)
* `npm run lint` - run the linter
* `npm run format` - run the linter in `--fix` mode (might alter the code)

## Deployment
Currently deployed using Heroku.
