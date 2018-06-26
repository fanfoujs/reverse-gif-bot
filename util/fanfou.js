'use strict'

const fs = require('fs')
const Fanfou = require('fanfou-sdk')
const CacheConf = require('cache-conf')
const logSymbols = require('log-symbols')

const {
  CONSUMER_KEY: consumerKey,
  CONSUMER_SECRET: consumerSecret,
  OAUTH_TOKEN: oauthToken,
  OAUTH_TOKEN_SECRET: oauthTokenSecret
} = require('../config')
const {download, reverse} = require('./reverse')

const token = {consumerKey, consumerSecret, oauthToken, oauthTokenSecret}

const ff = new Fanfou(token)
const config = new CacheConf()

const publish = statusId => {
  ff.get('/statuses/show', {id: statusId}, async (err, res) => {
    if (err) {
      console.log(logSymbols.error, err.message)
    } else {
      const {photo = {}} = res
      const {originurl} = photo

      // Check origin status
      if (res.type !== 'origin' || res.plain_text.match(/(RT@|「@|转@)/)) {
        console.log(logSymbols.error, 'Not a origin status')
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
  ff.get('/statuses/public_timeline', {count: 60}, (err, res) => {
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