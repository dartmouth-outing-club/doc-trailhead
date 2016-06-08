import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

// configure app to use bodyParser()
// this will let us get the data from a POST
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); // allows all
app.use(bodyParser.json());


// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
app.listen(port);

console.log(`listening on: ${port}`);
