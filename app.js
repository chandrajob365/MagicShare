const express = require('express')
const app = express()
const path = require('path')
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const pairedSockets = {}
const socketDetails = {}
app.use(express.static(path.join(__dirname, '/public')))

server.listen(process.env.PORT || 8080, () => {
  console.log('Server running @ : ', 8080)
})

io.on('connection', socket => {
  let token = socket.handshake.query.token
  updateSocketAndPairs(socket, token)
  emitPeerMsg(socket, token)
  generateToken(socket)
  connectPeers(socket)
  scrapToken(socket)
  disconnect(socket)
})

const isExist = token => {
  return (token && socketDetails[token])
}

const updateSocketAndPairs = (socket, token) => {
  if (isExist(token)) {
    socketDetails[socket.id] = {socket: socket}
    pairedSockets[token] = {senderId: token, recieverId: socket.id}
  } else {
    socketDetails[socket.id] = {socket: socket}
  }
}

const emitPeerMsg = (socket, token) => {
  let peer = pairedSockets[token]
  if (peer) {
    let peerSocket = socketDetails[peer.senderId]
    peerSocket.socket.emit('peerConnected', {
      self: peerSocket.socket.id,
      peer: socket.id,
      type: 'sender'
    })
    socket.emit('peerConnected', {
      self: socket.id,
      peer: peerSocket.socket.id,
      type: 'reciever'
    })
  } else {
    console.log('Its a new connection')
  }
}

const generateToken = socket => {
  socket.on('generateToken', msg => {
    socket.emit('tokenGenerated', {
      token: socket.id
    })
  })
}

const connectPeers = socket => {
  socket.on('connectPeers', msg => {
    pairedSockets[msg.token] = {senderId: msg.token, recieverId: socket.id}
    emitPeerMsg(socket, msg.token)
  })
}

const scrapToken = socket => {
  // delete the token object from pariedSockets once file transfer is done
}

const disconnect = socket => {
  socket.on('disconnect', () => {
    delete socketDetails[socket.id]
    if (pairedSockets[socket.id]) delete pairedSockets[socket.id]
  })
}
