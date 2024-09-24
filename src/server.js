import fs from 'node:fs'
import express from 'express'
import morgan from 'morgan'
import nunjucks from 'nunjucks'

import apiRouter from './router.js'

process.env.TZ = 'America/New_York'

const PACKAGE_JSON = JSON.parse(fs.readFileSync('./package.json'))
const ONE_YEAR_IN_MS = 3.156e10
const HTMX_VERSION = getPackageVersion('htmx.org')
const FULLCALENDAR_VERSION = getPackageVersion('fullcalendar-scheduler')

export function startServer (trailheadDb, port) {
  const app = express()
  app.use(morgan('dev'))
  app.yearCache = (route, path) => app.use(route, express.static(path, { maxAge: ONE_YEAR_IN_MS }))

  app.use('/static', express.static('static'))
  app.yearCache(`/htmx-${HTMX_VERSION}`, 'node_modules/htmx.org/dist')
  app.yearCache(`/fullcalendar-${FULLCALENDAR_VERSION}`, 'node_modules/fullcalendar-scheduler')
  app.use(express.urlencoded({ extended: true }))

  nunjucks
    .configure('./src/templates', { autoescape: true, express: app })
    .addGlobal('NODE_ENV', process.env.NODE_ENV)
    .addGlobal('HTMX_VERSION', HTMX_VERSION)
    .addGlobal('FULLCALENDAR_VERSION', FULLCALENDAR_VERSION)
  app.set('views', 'templates/views')

  app.use((req, _res, next) => { req.db = trailheadDb; next() })
  app.get('/healthcheck', (_, res) => { res.send('OK') })
  app.use('/', apiRouter)
  app.use(handleError)

  const server = app.listen(port)
  console.log(`Server running at http://localhost:${server.address().port}`)
  console.error(`Starting up at ${new Date()}`)
  return server
}

function handleError (err, req, res, _next) {
  if (err.code < 500) {
    res.status(err.code).send(err.message)
  } else {
      console.error(`Unexpected error for ${req.method} ${req.url}, sending 500`)
      console.error(err.stack)
      console.error(req.body)
    res.status(500).send('Sorry, Trailhead experienced an error. Please reach to OPO.')
  }
}

// For the packages we serve statically, specify the version exactly
// This function wouldn't work if you did something like "<5.0"
// We append the package version to the URL so that the caches bust on upgrade
function getPackageVersion (packageName) {
  return PACKAGE_JSON.dependencies[packageName].replace(/[^0-9.]/, '')
}
