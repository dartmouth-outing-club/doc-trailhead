import dotenv from 'dotenv';

dotenv.config({ silent: true });

export const frontendURL = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'http://doc.dartmouth.edu';
export const backendURL = process.env.NODE_ENV === 'development' ? 'http://localhost:9090/api' : 'https://doc-planner.herokuapp.com/api';

export const OPOEmails = ['rory.c.gawler@dartmouth.edu', 'ziray.hao.22@dartmouth.edu'];

export const createDateObject = (date, time) => {
  // adapted from https://stackoverflow.com/questions/2488313/javascripts-getdate-returns-wrong-date
  const parts = date.toString().match(/(\d+)/g);
  const splitTime = time.split(':');
  return new Date(parts[0], parts[1] - 1, parts[2], splitTime[0], splitTime[1]);
};
