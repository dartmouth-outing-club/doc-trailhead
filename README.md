# DOC Trailhead
This is the DOC Trailhead web application!

## Quick Start
To get started developing, run `npm run i` to install the dependencies and `npm run init-db` to create
the `trailhead.db` file. Then, you can run the server with `npm dun dev` and visit it by navigating
your browser to `localhost:8080`.

At this point you will get stuck, because I download the production database to work on Trailhead.
This is issue #52 if you want to take it on.

Development commands:
* `npm i` - install dependencies
* `npm t` - run tests
* `npm run dev` - run in development mode
* `npm start` - run in production mode (requires `.env` file)
* `npm run init-db` - create a clean version of the database
* `npm run lint` - run the linter
* `npm run format` - run the linter in `--fix` mode (might alter the code)

## Architecture
Trailhead is a NodeJS application. It uses SQLite as a datastore, Express to define routes, Nunjucks
to build HTML views, and HTMX to add interactivity to the webpage.

### Persistence
You can read more about SQLite in the appendix section below, but the main thing to know
about it is that its datastore is a single file, not a separate process. That means the NodeJS
application does all the database "stuff", not a separate application. This has two big implications
for the application:
* It can be run and tested without any other install besides `npm run i`. This substantially
  improves development speed and simplicity.
* Since database requests do not have to make a network hop, it basically removes the performance
  penalty for executing multiple small SQL queries (sometimes called the "[n+1 problem]
  (https://www.sqlite.org/np1queryprob.html)"). This lets you write more intelligible SQL commands,
  mixed with a little bit of JS. In practice, I use a bunch of small queries and a few medium-sized
  ones.

### Views
This application does not really have a distinction between frontend and backend. The views are
written in an HTML templating language called [Nunjucks](https://mozilla.github.io/nunjucks/). When
the user requests a webpage, the HTML that they receive is built by the templating language at
runtime. The frontend as such is entirely stateless; whatever the user is "allowed" to do in the
application is built into the HTML that is returned from each route.

If you want to be fancy, this is a concept called Hypertext As The Engine of Application State
([HATEOAS](https://htmx.org/essays/hateoas/)). If you don't want to be fancy, think of this way: the
route responds with some HTML that contains links or buttons relevant to the user that requested it.
If the user is allowed to see a trip to hike Cardigan, the HTML will have an
`<a href=/trips/2>Cardigan Hike!</a>` element in it. If they're allowed to signup, it might have a
`<button type=submit>Signup!</button>` element. In this way the stateless hypertext (HTML) is
defining what the user is allowed to do, and Nunjucks make it easy(ish) to mix and match bits of
HTML.

## Deployment
Trailhead is deployed on a DigitalOcean droplet and served behind an NGINX proxy.

## Appendix
Here are some useful resources that might help you understand the tech stack better, if you're not
familiar with parts of it:

### Docs
* [Nunjucks Templating](https://mozilla.github.io/nunjucks/templating.html)
* [HTMX Reference](https://htmx.org/reference/)
* [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
* [Quirks, Caveats, and Gotchas In SQLite](https://www.sqlite.org/quirks.html)

### Blogs
* [Consider SQLite](https://blog.wesleyac.com/posts/consider-sqlite)
* [How Did REST Come To Mean The Opposite Of Rest?](https://htmx.org/essays/how-did-rest-come-to-mean-the-opposite-of-rest/)
