# DOC Trailhead
This is the DOC Trailhead web application!

## Quick Start
To get started developing, run `npm run i` to install the dependencies and `npm run init-db` to create
the `trailhead.db` file. Then, you can run the server with `npm dun dev` and visit it by navigating
your browser to `localhost:8080`.

At this point you will get stuck, because I download the production database to work on Trailhead.
Soon, I will add some scripts that initialize with the database with basic info you can work with.

Development commands:
* `npm i` - install dependencies
* `npm t` - run tests
* `npm run dev` - run in development mode
* `npm start` - run in production mode (requires `.env` file)
* `npm run init-db` - create a clean version of the database
* `npm run lint` - run the linter
* `npm run format` - run the linter in `--fix` mode (might alter the code)

## Development
Trailhead runs on NodeJS, express, and SQLite. The only part of that stack that might seem unusual
is SQLite. You can read more about SQLite in the appendix section below, but the main thing to know
about it is that its datastore is a single file, not a separate process. That means the NodeJS
application does all the database "stuff", not a separate application. This has two big implications
for the application:
* It can be run and tested without any other install besides `npm run i`. This substantially
  improves development speed and simplicity.
* Since database requests do not have to make a network hop, it almost entirely removes the
  performance penalty for executing multiple small SQL queries (sometimes called the "[n+1
  problem](https://www.sqlite.org/np1queryprob.html)"). This lets you write more intelligible SQL
  commands, mixed with a little bit of JS. In practice, I use a bunch of small queries and a few
  medium-sized ones.

## Deployment
Trailhead is deployed on a DigitalOcean droplet and served behind an NGINX proxy.

## Appendix
Here are some useful resources that might help you understand the tech stack better, if you're not
familiar with parts of it:

### Docs
* [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
* [HTMX Reference](https://htmx.org/reference/)
* [Quirks, Caveats, and Gotchas In SQLite](https://www.sqlite.org/quirks.html)

### Blogs
* [Consider SQLite](https://blog.wesleyac.com/posts/consider-sqlite)
* [How Did REST Come To Mean The Opposite Of Rest?](https://htmx.org/essays/how-did-rest-come-to-mean-the-opposite-of-rest/)
