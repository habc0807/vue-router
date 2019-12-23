const { exec } = require('child_process')
const fs = require('fs')

let building = false
fs.watch('./src', {
  recursive: true
}, (event, filename) => {
  if (building) {
    return
  } else {
    building = true
    console.log('start: building ...')
    exec('npm run build', (err, stdout, stderr) => {
      if (err) {
        console.log(err)
      } else {
        console.log('end: building: ', stdout)
      }
      building = false
    })
  }
})
