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
  console.log('[connection] token = ', token)
  updateSocketAndPairs(socket, token)
  emitPeerMsg(socket, token)
  generateToken(socket)
  activateSenderProfile(socket)
  connectPeers(socket)
  msgToSender(socket)
  msgToReceiver(socket)
  scrapToken(socket)
  disconnect(socket)
})

const isExist = token => {
  return (token && socketDetails[token])
}

const updateSocketAndPairs = (socket, token) => {
  if (isExist(token)) {
    console.log('[updateSocketAndPairs] isExit true')
    socketDetails[socket.id] = {socket: socket}
    pairedSockets[token] = {senderId: token, recieverId: socket.id}
  } else {
    console.log('[updateSocketAndPairs] isExit False')
    socketDetails[socket.id] = {socket: socket}
  }
}

const emitPeerMsg = (socket, token) => {
  let peer = pairedSockets[token]
  if (peer) {
    console.log('[emitPeerMsg] peer exist')
    socket.emit('peerConnected', {
      fileReceiver: socket.id,
      fileSender: peer.senderId,
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

const activateSenderProfile = socket => {
  socket.on('activateSenderProfile', msg => {
    console.log('[activateSenderProfile] msg.fileReceiver = ', msg.fileReceiver, '  msg.fileSender = ', msg.fileSender)
    socketDetails[msg.fileSender].socket.emit('activateSenderProfile', {
      type: 'activateSenderProfile',
      fileReceiver: msg.fileReceiver,
      fileSender: msg.fileSender
    })
  })
}

const connectPeers = socket => {
  socket.on('connectPeers', msg => {
    pairedSockets[msg.token] = {senderId: msg.token, recieverId: socket.id}
    emitPeerMsg(socket, msg.token)
  })
}

const msgToSender = socket => {
  socket.on('toFileSender', msg => {
    console.log('[toFileSender], msg = ', msg)
    socketDetails[msg.fileSender].socket.emit('fileSender', msg)
  })
}

const msgToReceiver = socket => {
  socket.on('toFileReciever', msg => {
    console.log('[toFileReciever], msg = ', msg)
    socketDetails[msg.fileReceiver].socket.emit('fileReciever', msg)
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
