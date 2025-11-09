# DOC Trailhead
This is the DOC Trailhead web application!

Interested in contributing? See the [contributions guidelines](CONTRIBUTIONS.md).

## Quick Start
To get started developing, run `npm i` to install the dependencies.
Then, you can run the server with `npm run dev` and visit it by navigating your browser to `localhost:8080`.

Development commands:
* `npm i` - install dependencies
* `npm t` - run tests (requires SQLite installation)
* `npm run dev` - run in development mode
* `npm start` - run in production mode (requires `.env` file)
* `npm run lint` - run the linter
* `npm run format` - run the linter in `--fix` mode (might alter the code)

Database commands
* `npm run set-admin` - if using the prebuilt database, this will log the user in as an admin
* `npm run set-leader` - if using the prebuilt database, this will log the user in as trip leader

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
  penalty for executing multiple small SQL queries (sometimes called the "[n+1
  problem](https://www.sqlite.org/np1queryprob.html)"). This lets you write more intelligible SQL
  commands, mixed with a little bit of JS. In practice, I use a bunch of small queries and a few
  medium-sized ones.

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
Trailhead is currently running on Node 22 and it is managed by pm2.

When logged in as the trailhead-running user:

* `pm2 ls` see trailhead (and related processes)
* `pm2 resurrect` restart all the processes after a reboot


### Upgrading
To upgrade it to the latest stable version (22 at the time of this writing, but it won't be forever) using [the n module](https://www.npmjs.com/package/n):

1. Log in as a sudo-capable user and run `sudo n stable`
1. Log in as `node`
1. Check the new node version is the one you expect with `node --version`
1. `cd ~/doc-trailhead` and run `npm rebuild` (otherwise it will crash on startup)
1. `cd ~` and `pm2 restart trailhead`

## Testing

I'll admit I've had a couple fits and starts testing Trailhead and never quite come up with a solution I liked.
The problem isn't that Trailhead couldn't be tested with Playwright or the like;
it's that I'd really like for the tests to be as easy to start and run as the application is.
So far I haven't put together a suite that does that (while still testing something useful).

## Appendix
Here are some useful resources that might help you understand the tech stack better, if you're not
familiar with parts of it:

### Docs
* [Nunjucks Templating](https://mozilla.github.io/nunjucks/templating.html)
* [HTMX Reference](https://htmx.org/reference/)
* [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
* [Quirks, Caveats, and Gotchas In SQLite](https://www.sqlite.org/quirks.html)

### Blogs
* [How To Set Up a Node.js Application for Production on Ubuntu 16.04](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04) (this is basically the deployment setup)
* [Consider SQLite](https://blog.wesleyac.com/posts/consider-sqlite)
* [How Did REST Come To Mean The Opposite Of Rest?](https://htmx.org/essays/how-did-rest-come-to-mean-the-opposite-of-rest/)
