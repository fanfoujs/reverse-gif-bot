'use strict'

const path = require('path')
const down = require('download')
const hasha = require('hasha')
const {path: ffmpegPath} = require('@ffmpeg-installer/ffmpeg')
const ffmpeg = require('fluent-ffmpeg')

ffmpeg.setFfmpegPath(ffmpegPath)

const getHash = file => {
  return hasha.fromFile(file, {algorithm: 'md5'})
}

const download = async url => {
  const basename = path.basename(url)
  const downpath = path.join(__dirname, '../downloads')
  await down(url, downpath)
  return {
    path: path.join(downpath, basename),
    hash: await getHash(path.join(downpath, basename))
  }
}

const reverse = file => {
  return new Promise((resolve, reject) => {
    const basename = path.basename(file)
    const savepath = path.join(__dirname, '../outputs', 're-' + basename)
    ffmpeg(file)
      .videoFilter('reverse')
      .on('error', error => reject(error))
      .on('end', async () => resolve({
        path: savepath,
        hash: await getHash(savepath)
      }))
      .save(savepath)
  })
}

module.exports = {
  getHash,
  download,
  reverse
}
