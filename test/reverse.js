'use strict'

const path = require('path')
const Reverse = require('../util/reverse')

const run = async () => {
  const file = path.join(__dirname, 'loading.gif')

  // Hash
  console.log('getHash:', await Reverse.getHash(file))

  // Reverse
  console.log('Reverse:', await Reverse.reverse(file))
}

run()
