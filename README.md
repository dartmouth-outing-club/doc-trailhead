# Trailhead Backend
This is the backend of DOC Trailhead.
The frontend repo is [here](https://github.com/dartmouth-outing-club/trailhead-frontend).

## Development
Trailhead runs on Node 18. Its datastore is an SQLite file, which you need to initialize if it's
your first time running it.

Development commands:
* `npm i` - install dependencies
* `npm run dev` - run in development mode
* `npm start` - run in production mode (requires `.env` file)
* `npm run init-db` - create a clean version of the database
* `npm run lint` - run the linter
* `npm run format` - run the linter in `--fix` mode (might alter the code)

## Deployment
Trailhead is deployed on a DigitalOcean droplet and served behind an NGINX proxy.

## History
The first thing I want to note about Trailhead, especially before I criticize almost everything
about it, is that the original developers did a good job. Building a webservice from scratch is
frustrating and time-consuming and when I was in the DALI lab I didn't accomplish anything even
remotely close to this. The fact that Trailhead is a mission-critical application for the DOC that
I've been brought in to fix is a testament to original team that worked on it, and Ziray Hao in
particular.

When I was handed this application, it consisted of a React frontend, an Express backend, and a
MongoDB database that the backend connected to via the Mongoose ORM. The primary problem affecting
the service was that over two years of use it had grown unbearably slow to use, with each page load
taking 5-15 seconds. It also suffered from the occasional database inconsistencies, such as trips
with no leaders, that left the application in a bad state and users stuck.

The root cause of these issues is that MongoDB is a poor persistence choice for this application,
and the backend server had architected various solutions to compensate, solutions that frequently
blocked the NodeJS event loop. It is, of course, possible to use MongoDB without blocking the event
loop, but a lot of the complexity of the application resulted from trying to reconnect relations
between data that should have been stored relationally in the first place.

Other problems include a wildly over-engineered frontend (different repo) that holds huge amounts of
information in state and crashes entirely if any of those fields are missing, and pretty chunky
security holes that make it possible for users without the correct level of permissions to access or
alter other user information. The most private thing we have on here is users' self-reported dietary
restrictions and medical conditions, which doesn't represent a massive risk (compared with actual
medical records, SSNs, etc) but is nonetheless something we should endeavor to protect.

## Roadmap
If for some reason I have to stop working on this application and you find yourself in the process
of wondering why I did the things that I did, here is my plan for the service:

1. Replace Mongoose queries with MongoDB query language, a systematic process that would identify
   the most inefficient queries while bringing the query structure for in line with the relational
   model instead of object-like model. This step is complete and it made the application snappy for
   users again.
2. Replace MongoDB and the document-based structure with SQLite and a relational table structure.
   Trailhead's data already relied on relations between the objects and this step explicitly encodes
   those relationships into the data structure to minimize the opportunities for inconsistencies.
   Because I haven't changed the frontend at all, this requires that I then map the DB table into a
   nested structure that the frontend is expecting. This is annoying, but it does actually use less
   code than we were using before, and it's well worth the benefits of data consistency and speed.
3. (**I am here**) Remove the frontend entirely and serve HTML with an HTML-based API. This concept
   is probably best represented by [HTMX](https://htmx.org/), the JS library that I'm going to use
   for it, so check out
   [this blog](https://htmx.org/essays/how-did-rest-come-to-mean-the-opposite-of-rest/) if you're
   unfamiliar with the approach. Most of the code left in the application deals with the process of
   translating SQL queries to the JSON that the frontend expects; once this step is finished a ton
   of boilerplate can be deleted and the application will be very small.
4. Now that we have a single deployable application with a lightweight UI, start implementing
   features!

