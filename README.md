# doc-planner-server


## Todo
change leader and member references to ids of models


Everything is /api/[route]
## API DOC
## GET
path : /trips  
description : gets all trips and returns them as a json object  
parameters : none  

path : /trips/:club  
description : gets all trips of a certain club and returns them as a json object  
parameters : club (name of the club that you want to search by)  

path : /trip/:id
description : gets a trip and returns it as a json object  
parameters : id (id of the trip)  

path : /myTrips  
description : gets all the trips of the logged in user and returns them as json  
parameters : none  

path : /isOnTrip/:id  
description : checks if the signed in user is on the trip of :id  
parameters : id (id of trip)  

## POST
path : /signin  
description : signs in the user  
data : email, password  

path : /signup  
description : signs up the user  
data : email, password, name  

path : /trips  
description : Create a trip  
data : club, date, title, cost, description, leaders (array of leader names that does not include the current user)  


## PUT
path : /trip/:id  
description : Update a trip
data : club, date, title, cost, description, leaders (array of leader names that does not include the current user)  

path : /joinTrip/:id
description : Join a trip  
parameter : id of trip  

path : /updateUser  
description : updates the user  
parameters : email, name, club (club that the user is now a leader for), dash_number  

## DELETE
path : /trip/:id  
description : Remove a trip  
data : id of trip  
