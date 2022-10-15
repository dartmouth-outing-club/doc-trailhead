import dotenv from 'dotenv'
import dateFormat from 'dateformat'

dotenv.config({ silent: true })

export const frontendURL = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'http://doc.dartmouth.edu'
export const backendURL = process.env.NODE_ENV === 'development' ? 'http://localhost:9090' : `https://${process.env.APP_URL}`

export const OPOEmails = process.env.NODE_ENV === 'development' ? ['ziray.hao@dali.dartmouth.edu'] : ['rory.c.gawler@dartmouth.edu', 'willow.nilsen@dartmouth.edu', 'coz.teplitz@dartmouth.edu', 'kellen.t.appleton@dartmouth.edu', 'f00324r@dartmouth.edu']
export const gearAdminEmails = process.env.NODE_ENV === 'development' ? ['ziray.hao@dali.dartmouth.edu'] : ['Dartmouth.Outdoor.Rentals@Dartmouth.EDU', 'Michael.Silverman@Dartmouth.EDU']

export const createDateObject = (date, time, timezone) => {
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

export const formatDateAndTime = (date, mode) => {
  if (mode === 'LONG') {
    return dateFormat(date, 'ddd, m/d/yy @ h:MM TT')
  } else {
    return dateFormat(date, 'm/d/yy, h:MM TT')
  }
}
