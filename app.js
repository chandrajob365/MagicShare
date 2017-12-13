const express = require('express')
const app = express()
const path = require('path')
const server = require('http').createServer(app)
const io = require('socket.io')(server)

app.use(express.static(path.join(__dirname, '/public')))

server.listen(process.env.PORT || 8080, () => {
  console.log('Server running @ : ', 8080)
})
const pairedSockets = {}
const socketDetails = {}
io.on('connection', socket => {
  console.log('client connected : ', socket.id)
  socketDetails[socket.id] = socket
  socket.emit('clientConnect', {clientId: socket.id})
  socket.on('pair', msg => {
    pairedSockets[msg.token] = socket.id
    let senderSocket = socketDetails[msg.token]
    let receiverSocket = socket
    senderSocket.emit('paired', {
      self: senderSocket.id,
      peer: receiverSocket.id
    })
    receiverSocket.emit('paired', {
      self: receiverSocket.id,
      peer: senderSocket.id
    })
  })
})
