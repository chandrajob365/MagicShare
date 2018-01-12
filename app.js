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
  if (token) hideSenderProfile(socket)
  socketDetails[socket.id] = {socket: socket}
  if (token) createPairs(socket, token)
  generateToken(socket)
  activateSenderProfile(socket)
  connectPeers(socket)
  msgToSender(socket)
  msgToReceiver(socket)
  transferComplete(socket)
  unregisterToken(socket)
  disconnect(socket)
})

const hideSenderProfile = socket => {
  socket.emit('enableReceiverProfile')
}

const isPairExist = token => {
  return pairedSockets[token] ? true : false
}

const createPairs = (socket, token) => {
  if (tokenGenerator[token]) {
    if (!isPairExist(token)) {
      pairedSockets[token] = {senderId: tokenGenerator[token], recieverId: socket.id}
      socketDetails[socket.id].token = token
      emitPeerMsg(socket, token)
    } else {
      notifyInvalidToken(socket, 'Invalid Token', token)
    }
  } else {
    notifyInvalidToken(socket, 'Expired Token', token)
  }
}

const notifyInvalidToken = (socket, type, token) => {
  socket.emit('invalid', {
    type: type,
    token: token
  })
}

const emitPeerMsg = (socket, token) => {
  let peer = pairedSockets[token]
  if (peer) {
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
    socketDetails[socket.id]['generatedToken'] = token // For File sender token is named as generated Token
    socket.emit('tokenGenerated', {
      token: token
    })
  })
}

const activateSenderProfile = socket => {
  socket.on('activateSenderProfile', msg => {
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
    socketDetails[msg.fileSender].socket.emit('fileSender', msg)
  })
}

const msgToReceiver = socket => {
  socket.on('toFileReciever', msg => {
    socketDetails[msg.fileReceiver].socket.emit('fileReciever', msg)
  })
}

const transferComplete = socket => {
  socket.on('transferComplete', () => {
    let token = socketDetails[socket.id].token
    let fileSender = socketDetails[pairedSockets[token].recieverId].socket
    fileSender.emit('resetProfile')
    socket.emit('resetProfile')
  })
}

const unregisterToken = socket => {
  socket.on('unregisterToken', () => {
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
