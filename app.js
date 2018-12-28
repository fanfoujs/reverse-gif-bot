'use strict'

const schedule = require('node-schedule')
const {INVERVAL: interval} = require('./config')
const {getHomeTimeline} = require('./util/fanfou')

schedule.scheduleJob(`*/${interval} * * * * *`, () => {
  getHomeTimeline()
})
