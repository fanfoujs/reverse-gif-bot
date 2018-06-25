'use strict'

const schedule = require('node-schedule')

const {getHomeTimeline} = require('./util/fanfou')

schedule.scheduleJob('*/10 * * * * *', () => {
  getHomeTimeline()
})
