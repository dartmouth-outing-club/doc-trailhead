import cron from 'node-cron';

const schedule = (task, frequency) => {
  switch (frequency) {
    case 'daily':
      cron.schedule('0 0 * * *', task);
      break;
    default:
      break;
  }
};

export default schedule;
