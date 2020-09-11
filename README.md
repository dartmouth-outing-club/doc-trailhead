# doc-planner (server)

This is the back-end repo of the DOC planner application. The front-end repo is 
[here](https://github.com/dartmouth-cs52-18S/project-api-doc-planner).

## Architecture

The server is built using Node.js, Babel, and Express.js, with a MongoDB database.

## Setup

To test locally, install npm and yarn and then clone the repo.

Run the following command to install all dependencies:
```
yarn
```

Have MongoDB running in the background and create a `.env` file, which contains the following:
```
AUTH_SECRET="somerandomstringhere"
EMAIL_PASSWORD="docplanner!18s"
```

You can then run the following command to start up the server:
```
yarn dev
```

## Deployment

TBD: use heroku

## Initial Setup of Clubs

There is no club admin interface yet. You must add at least 2 clubs to be able to use the site currently.

To add a club: 
```bash
curl -X POST -H "Content-Type: application/json" -d '{"name": "Mountaineering"}' "http://localhost:9090/api/club"
curl -X POST -H "Content-Type: application/json" -d '{"name": "Ledyard"}' "http://localhost:9090/api/club"
curl -X POST -H "Content-Type: application/json" -d '{"name": "Climbing"}' "http://localhost:9090/api/club"

```



## API DOC

Everything is /api/[route]

### GET
path : /trips  
description : gets all trips and returns them as a json object  
parameters : none  

path : /trips/:club  
description : gets all trips of a certain club and returns them as a json object  
parameters : club (name of the club that you want to search by)  

path : /trip/:id
description : gets a trip and returns it as a json object  
parameters : id (id of the trip)  
response : json object with trip and members as values

path : /myTrips  
description : gets all the trips of the logged in user and returns them as json  
parameters : none  

path : /isOnTrip/:id  
description : checks if the signed in user is on the trip of :id  
parameters : id (id of trip)  

path : /userTrips
description : gets all the trips that a user is on and returns them as json  
parameters : none  
response : json with 2 keys: memberOf and leaderOf, both containing an array of trips

path : /user  
description : gets the user's info
parameters : none

path : /club
description : gets all of the DOC clubs in the database
parameters : none

### POST
path : /signin  
description : signs in the user  
data : email, password  

path : /signup  
description : signs up the user  
data : email, password, name  

path : /trips  
description : Create a trip  
data : club, start date, end date, title, cost, description, limit, leaders (array of leader emails that does not include the current user)  

path : /sendEmail  
description : send an email to a group of emails  
data : subject, text, emails  

path : /club
description : create a new club in the database
data : name


### PUT
path : /trip/:id  
description : Update a trip
data : club, start date, end date, title, cost, description, limit

path : /join
description : Join a trip  
parameter : id of trip  
response : json object with values for trip and isUserOnTrip

path : /user  
description : updates the user  
parameters : email, name, clubs (clubs that the user is now a leader for), dash_number  


### DELETE
path : /trip/:id  
description : Remove a trip  
data : id of trip  

path : /leave  
description : remove a user from a trip
data : id of trip

## Authors

Samuel Schiff, Katie Bernardez, Ben Hannam, Brian Keare, Shashwat Chaturvedi, Isabel Hurley

## Acknowledgments

Thanks to Tim Tregubov and the rest of the CS52 staff for all of their help this term.
