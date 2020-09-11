import cron from 'node-cron';

const schedule = (task, frequency) => {
  switch (frequency) {
    case 'daily':
      cron.schedule('0 0 * * *', task);
      break;
    case 'minutely':
      cron.schedule('* * * * *', task);
      break;
    default:
      cron.schedule('* * * * *', () => {
        console.log('minute has passed');
      });
      break;
  }
};

export default { schedule };