# Trailhead History

# Why write this?
Because it's interesting! And someday someone that is not me will maintain this application and it
is very helpful to understand what circumstances and constraints led to the software that you're
suddenly in charge of. If you see something and think "I would have done that differently," you
might learn that it was done that way not because of incompetence, but because of time pressure,
customer requests, or a requirement that you're not aware of until you try to remove it and
something does wrong. Or incompetence.

Context builds understanding, and empathy.

## History
The first thing I want to note about Trailhead, is that the original developers did a good job.
Building a webservice from scratch is frustrating and time-consuming and when I was in the DALI lab
I didn't accomplish anything even remotely close to this. The fact that Trailhead is a
mission-critical application for the DOC is a testament to original team that worked on it, and
Ziray Hao's work in particular.

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

## Migration Roadmap
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
3. Remove the frontend entirely and serve HTML with an HTML-based API.
4. Now that we have a single deployable application with a lightweight UI, start implementing
   features!

# Migration Results
Removed around 15k lines of source code:

```
# Old Frontend
$ find src -type f | egrep '\.(js|scss|css|html)' | xargs wc -l | grep total
   17228 total

# Old Backend
$ find src -type f | egrep '\.(js|css|html|njs)' | xargs wc -l | grep total
    3561 total

# New Combined Application
$ find src templates static -type f | egrep '\.(js|css|sql|html|njs)$' | xargs wc -l |
grep total
    5272 total
```

Removed MongoDB hosting fees by removing Mongo.

Removed Heroku hosting feeds by removing Heroku. Most of the reason Heroku was costing $100 (!!) a
month was because the 2 professional dynos were having to recalculate the entire trips list every
single minute. It's actually a bit of shame that we're not on serverless anymore because servereless
is very easy to set up, but the resultant application simplicity is, I think, I worth the tradeoff
in setup complexity (for now).

## The Future
In addition to saving at least $300/mo in operating costs, I'm already finding that deploying new
features is a cinch. We'll see what happens next!

-- Alex

