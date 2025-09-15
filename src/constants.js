import dotenv from 'dotenv'
import dateFormat from 'dateformat'

dotenv.config({ silent: true })

export const ORIGIN = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://doc.dartmouth.edu'

export const deploymentEmails = [
  'Alexander.W.Petros@dartmouth.edu'
]

export const OPOEmails = [
  'Brad.Geismar@dartmouth.edu',
  'willow.nilsen@dartmouth.edu',
  'Zachary.N.Conrad@dartmouth.edu',
  'Katie.T.Colleran@dartmouth.edu',
  'Dan.Pfistner.Krahn@dartmouth.edu',
  'Clare.C.Arentzen@dartmouth.edu'
]
export const gearAdminEmails = ['Dartmouth.Outdoor.Rentals@Dartmouth.edu', 'Andrew.M.Deaett@dartmouth.edu']

export function createDateObject(date, time, timezone) {
  // adapted from https://stackoverflow.com/questions/2488313/javascripts-getdate-returns-wrong-date
  const parts = date.toString().match(/(\d+)/g)
  const splitTime = time.split(':')
  if (timezone) {
    const dateUTC = new Date(parts[0], parts[1] - 1, parts[2], splitTime[0], splitTime[1])
    return new Date(`${dateFormat(dateUTC, 'mmm dd yyyy hh:MM:ss TT')} ${timezone}`)
  } else {
    return new Date(parts[0], parts[1] - 1, parts[2], splitTime[0], splitTime[1])
  }
}

export function createIntegerDateObject(date, time) {
  return createDateObject(date, time).getTime()
}

export function formatDateAndTime(date, mode) {
  if (mode === 'LONG') {
    return dateFormat(date, 'ddd, m/d/yy @ h:MM TT')
  } else {
    return dateFormat(date, 'm/d/yy, h:MM TT')
  }
}
