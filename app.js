'use strict';

const logSymbols = require('log-symbols');
const schedule = require('node-schedule');
const {INVERVAL: interval} = require('./config');
const {getHomeTimeline} = require('./util/fanfou');

schedule.scheduleJob(`*/${interval} * * * * *`, () => {
	try {
		getHomeTimeline();
	} catch (error) {
		console.log(logSymbols.error, 'error.message');
	}
});
