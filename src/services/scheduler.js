import cron from 'node-cron'

export function schedule (task, frequency) {
  switch (frequency) {
    case 'daily':
      cron.schedule('0 1 * * *', task)
      break
    case 'minutely':
      cron.schedule('* * * * *', task)
      break
    default:
      cron.schedule('* * * * *', () => {
        console.log('minute has passed')
      })
      break
  }
}
