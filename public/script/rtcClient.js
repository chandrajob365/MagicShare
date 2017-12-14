const rtcObj = {
  chunkDataChannel: null,
  fileSizeDataChannel: null,
  pc: null
}

const config = {
  iceServers: [
    {'urls': 'stun:stun.l.google.com:19302'},
    {
      'urls': 'turn:numb.viagenie.ca',
      'username': 'chandra.manish645@gmail.com',
      'credential': 'Admin123'
    }
  ]
}

const handleRecieverFlowMsg = message => {
  console.log('[handleRecieverFlowMsg] message = ', message)
  if (!rtcObj.pc) {
    handleRecieverPeerConnection(message)
  }
  messageHandler(message)
}

const handleRecieverPeerConnection = (message) => {
  console.log('[handleRecieverPeerConnection]')
  createPeerConnection()
  rtcObj.pc.onicecandidate = (event) => handleRecieverIceCandidateEvent(event, message)
  rtcObj.pc.ondatachannel = receiveChannelCallback
}

const handleRecieverIceCandidateEvent = (event, message) => {
  console.log('[handleRecieverIceCandidateEvent] message = ', message)
  socket.emit('toFileSender',
    {
      type: 'new-ice-candidate',
      candidate: event.candidate,
      fileSender: message.fileSender,
      fileReceiver: message.fileReceiver
    })
}

const receiveChannelCallback = event => {
  console.log('[receiveChannelCallback] event = ', event)
  rtcObj.chunkDataChannel = event.channel
  rtcObj.chunkDataChannel.onmessage = handleReceiveMessage
  rtcObj.chunkDataChannel.onopen = handleReceiveChannelStatusChange
  rtcObj.chunkDataChannel.onclose = handleReceiveChannelStatusChange
}

const handleReceiveMessage = event => {
  console.log('handleReceiveMessage, event =', event)
  $('msgReceived').innerHTML = event.data
  // This needs to be called when complete msg has been received
  // gracefullyTerminateRTCConnection()
  window.setTimeout(closeConnection, 3000)
}

const handleReceiveChannelStatusChange = event => {
  if (rtcObj.chunkDataChannel) {
    let state = rtcObj.chunkDataChannel.readyState
    if (state === 'closed') {
      console.log('[handleReceiveChannelStatusChange] chunkDataChannel Closed..')
      console.log('[handleReceiveChannelStatusChange] rtcObj.chunkDataChannel = ', rtcObj.chunkDataChannel)
    } else if (state === 'open') {
      console.log('[handleReceiveChannelStatusChange] chunkDataChannel Opened..')
    }
  }
}

const createPeerConnection = () => {
  rtcObj.pc = new RTCPeerConnection(config)
  console.log('[createPeerConnection] rtcObj.pc = ', rtcObj.pc)
}

const messageHandler = message => {
  switch (message.type) {
    case 'offer':
      handleOfferSDP(message)
      break
    case 'answer':
      handleAnswerSPD(message.desc)
      break
    case 'new-ice-candidate':
      handleNewIceCandidateMsg(message.candidate)
      break
    default: console.log('Unhandled Case')
  }
}

const handleOfferSDP = (msg) => {
  rtcObj.pc.setRemoteDescription(new RTCSessionDescription(msg.desc))
    .then(() => rtcObj.pc.createAnswer())
    .then(answer => setLocalDescription(answer))
    .then(() => {
      socket.emit(
        'toFileSender',
        { type: 'answer',
          desc: rtcObj.pc.localDescription,
          fileReceiver: msg.fileReceiver,
          fileSender: msg.fileSender})
    }).catch(err => console.log('err = ', err))
}

const setLocalDescription = answer => {
  return rtcObj.pc.setLocalDescription(answer)
}

const handleAnswerSPD = desc => {
  rtcObj.pc.setRemoteDescription(desc)
  .catch(err => console.log('error = ', err))
}

const handleNewIceCandidateMsg = candidate => {
  if (candidate) {
    rtcObj.pc.addIceCandidate(candidate)
      .catch(err => console.log('[handleCandidate] err : ', err))
  }
}

// Sender Profile
const setSenderProfile = msg => {
  console.log('[setSenderProfile] msg = ', msg)
  handleSenderPeerConnection(msg.fileReceiver)
  socket.on('fileSender', message => {
    handleSenderFlowMsg(message)
  })
}

const handleSenderFlowMsg = (message) => {
  messageHandler(message)
}

const handleSenderPeerConnection = fileReceiver => {
  createPeerConnection()
  rtcObj.chunkDataChannel = rtcObj.pc.createDataChannel('chunks')
  rtcObj.pc.createOffer().then(offer => rtcObj.pc.setLocalDescription(offer))
  .then(() => {
    socket.emit(
      'toFileReciever',
      { type: 'offer',
        desc: rtcObj.pc.localDescription,
        fileReceiver: fileReceiver,
        fileSender: socket.id})
  })
  .catch(err => console.log('[createPeerConnection] rejected  error: ', err))
  rtcObj.pc.onicecandidate = event => handleSenderIceCandidateEvent(event, fileReceiver)
  rtcObj.chunkDataChannel.onmessage = handleReceiveMessage
  rtcObj.chunkDataChannel.onopen = handleSendChannelStatusChage
  rtcObj.chunkDataChannel.onclose = handleSendChannelStatusChage
}

const handleSenderIceCandidateEvent = (event, fileReceiver) => {
  socket.emit('toFileReciever',
    {
      type: 'new-ice-candidate',
      candidate: event.candidate,
      fileReceiver: fileReceiver,
      fileSender: socket.id
    })
}

const handleSendChannelStatusChage = event => {
  if (rtcObj.chunkDataChannel) {
    let state = rtcObj.chunkDataChannel.readyState
    if (state === 'open') {
      console.log('[handleSendChannelStatusChage] chunkDataChannel Open...')
      rtcObj.chunkDataChannel.send(navigator.userAgent)
      window.setTimeout(() => closeConnection(), 3000)
    } else if (state === 'close') {
      console.log('[handleSendChannelStatusChage] chunkDataChannel Closing...')
    }
  }
}

const closeConnection = () => {
  console.log('[closeConnection] Entry')
  if (rtcObj.chunkDataChannel) rtcObj.chunkDataChannel.close()
  if (rtcObj.pc) rtcObj.pc.close()
  rtcObj.pc = null
  console.log('[closeConnection] rtcObj.pc = ', rtcObj.pc)
  socket.emit('unregisterToken')
}
