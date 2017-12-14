const express = require('express')
const app = express()
const path = require('path')
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const shortid = require('shortid')
const pairedSockets = {}
const socketDetails = {}
const tokenGenerator = {}
app.use(express.static(path.join(__dirname, '/public')))

server.listen(process.env.PORT || 8080, () => {
  console.log('Server running @ : ', 8080)
})

io.on('connection', socket => {
  let token = socket.handshake.query.token
  socketDetails[socket.id] = {socket: socket}
  console.log('[connection] token = ', token)
  if (token) createPairs(socket, token)
  // emitPeerMsg(socket, token)
  generateToken(socket)
  activateSenderProfile(socket)
  connectPeers(socket)
  msgToSender(socket)
  msgToReceiver(socket)
  unregisterToken(socket)
  disconnect(socket)
})

const isPairExist = token => {
  console.log('[isPairExist] pairedSockets[token]', pairedSockets[token])
  return pairedSockets[token] ? true : false
}

const createPairs = (socket, token) => {
  console.log('[createPairs] token = ', token)
  console.log('[createPairs] tokenGenerator = ', tokenGenerator)
  console.log('[createPairs] tokenGenerator[%s] = %s', token, tokenGenerator[token])
  if (tokenGenerator[token]) {
    if (!isPairExist(token)) {
      console.log('[!isPairExist] Entry')
      pairedSockets[token] = {senderId: tokenGenerator[token], recieverId: socket.id}
      socketDetails[socket.id].token = token
      emitPeerMsg(socket, token)
    } else {
      console.log('[isPairExist]')
      notifyInvalidToken(socket, 'Invalid Token', token)
    }
  } else {
    console.log('Sender/Generator of token (%s) doesn\'t exist', token)
    notifyInvalidToken(socket, 'Expired Token', token)
  }
}

const notifyInvalidToken = (socket, type, token) => {
  console.log('[notifyInvalidToken] token : ', token)
  socket.emit('invalid', {
    type: type,
    token: token
  })
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
    let token = shortid.generate()
    tokenGenerator[token] = socket.id
    console.log('[generateToken] tokenGenerator = ', tokenGenerator)
    socketDetails[socket.id]['generatedToken'] = token // For File sender token is named as generated Token
    socket.emit('tokenGenerated', {
      token: token
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
    createPairs(socket, msg.token)
    let fileSender = tokenGenerator[msg.token]
    pairedSockets[msg.token] = {senderId: fileSender, recieverId: socket.id}
    if (msg.token && isValidToken(socket, msg.token)) emitPeerMsg(socket, msg.token)
  })
}

const isValidToken = (socket, token) => {
  return (tokenGenerator[token] && pairedSockets[token])
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

const unregisterToken = socket => {
  socket.on('unregisterToken', () => {
    console.log('[unregisterToken] Entry........')
    let token = socketDetails[socket.id].token
    socketDetails[socket.id].token = '' // reset token key from fileReceiver socketDetail's object
    if (pairedSockets[token]) {
      /*
         1 > delete pairedSocket object for that token
         2 > reset token in fileSender socketDetail's object
         3 > delete token - sender mapping Object
      */
      let fileSendersId = pairedSockets[token].senderId
      delete pairedSockets[token]
      socketDetails[fileSendersId].token = ''
      delete tokenGenerator[token]
    }
  })
}

const disconnect = socket => {
  socket.on('disconnect', () => {
    let token = socketDetails[socket.id].token
    delete socketDetails[socket.id]
    // Below case only if fileReceiver is getting disconnected
    if (token && pairedSockets[token]) {
      /* if token has already been shared and another client uses it
       then get the id of fileSender from pairedSocket
       and set token as empty in senderSocketDetail Object  and delete token - sender mapping Object */
      let fileSendersId = pairedSockets[token].senderId
      socketDetails[fileSendersId].token = ''
      delete tokenGenerator[token]
    }
  })
}
