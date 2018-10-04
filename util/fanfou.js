'use strict'

const fs = require('fs')
const Fanfou = require('fanfou-sdk')
const CacheConf = require('cache-conf')
const logSymbols = require('log-symbols')

const banned = require('../banned')

const {
  CONSUMER_KEY: consumerKey,
  CONSUMER_SECRET: consumerSecret,
  OAUTH_TOKEN: oauthToken,
  OAUTH_TOKEN_SECRET: oauthTokenSecret,
  HTTPS: https
} = require('../config')
const {download, reverse} = require('./reverse')

const opt = {
  consumerKey,
  consumerSecret,
  oauthToken,
  oauthTokenSecret,
  protocol: https ? 'https:' : 'http',
  fakeHttps: https
}

const ff = new Fanfou(opt)
const config = new CacheConf()

const isBanned = status => {
  const {BOTS, BLACKLIST, APP, TOPIC, REGEX} = banned
  for (const id of BOTS.concat(BLACKLIST)) {
    if (id === status.user.id || id === status.user.unique_id) {
      return true
    }
  }
  for (const appName of APP) {
    if (appName === status.source_name) {
      return true
    }
  }
  for (const tag of TOPIC) {
    const tags = status.txt.filter(item => item.type === 'tag').map(item => item.text)
    for (const tagName of tags) {
      if (tagName.replace(/#/g, '') === tag) {
        return true
      }
    }
  }
  for (const pattern of REGEX) {
    const regex = new RegExp(pattern)
    if (status.plain_text.match(regex)) {
      return true
    }
  }
  return false
}

const publish = statusId => {
  ff.get('/statuses/show', {id: statusId}, async (err, res) => {
    if (err) {
      console.log(logSymbols.error, err.message)
    } else {
      const {photo = {}} = res
      const {originurl} = photo

      // Check bannded
      if (isBanned(res)) {
        console.log(logSymbols.error, 'A banned status')
        return
      }

      // Check origin status
      if (res.type !== 'origin' || res.plain_text.match(/(RT@|「@|转@)/)) {
        console.log(logSymbols.error, 'Not a origin status')
        return
      }

      // Check file type
      if (photo.type !== 'gif') {
        console.log(logSymbols.error, 'Not a GIF file')
        return
      }

      // Download file
      const file = await download(originurl)

      // Check file in cache
      if (config.get(file.hash)) {
        console.log(logSymbols.error, 'File already reversed')
        return
      }
      config.set(file.hash, true, {maxAge: 1000 * 60 * 60 * 24 * 7})

      // Reverse file
      const reverseFile = await reverse(file.path)

      // Log file information
      console.log('Download:', file)
      console.log('Reverse:', reverseFile)

      // Post image
      ff.up('/photos/upload', {photo: fs.createReadStream(reverseFile.path), status: `转@${res.user.name} ${res.plain_text}`}, (err, res) => {
        if (err) {
          console.log(logSymbols.error, err.message)
        } else {
          console.log(res.plain_text)
        }
      })
    }
  })
}

const getHomeTimeline = () => {
  ff.get('/statuses/public_timeline', {count: 60, format: 'html'}, (err, res) => {
    if (err) {
      console.log(logSymbols.error, err.message)
    } else {
      const lastRawId = config.get('lastRawId') || 0
      const [latestStatus = {rawid: 0}] = res

      if (lastRawId >= latestStatus.rawid) {
        console.log(logSymbols.success, 'No new content')
        return
      }

      res
        .filter(status => {
          return status.rawid > lastRawId
        })
        .forEach(status => {
          const {photo = {}} = status
          if (isBanned(status)) {
            console.log(logSymbols.success, 'A banned status')
            return
          }
          if (status.type !== 'origin' || status.plain_text.match(/(RT@|「@|转@)/g)) {
            console.log(logSymbols.success, 'Not origin status')
            return
          }
          if (photo.type !== 'gif') {
            console.log(logSymbols.success, 'No GIF file')
            return
          }
          console.log(logSymbols.success, 'Catch a GIF file')
          publish(status.id)
        })

      console.log('LastRawId is', latestStatus.rawid)
      config.set('lastRawId', latestStatus.rawid, {maxAge: 1000 * 60 * 60})
    }
  })
}

module.exports = {
  publish,
  getHomeTimeline
}
