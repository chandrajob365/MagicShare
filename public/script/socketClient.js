const socket = io(document.URL)
const $ = id => document.getElementById(id)
const generateTokenBtn = $('generateTokenBtn')
const generatedURL = $('generatedURL')
const generatedToken = $('generatedToken')
const tokenInput = $('tokenInput')
const connect = $('connect')

generateTokenBtn.addEventListener('click', event => {
  socket.emit('generateToken', socket.id)
})

connect.addEventListener('click', event => {
  if (tokenInput.value.length > 0) {
    socket.emit('connectPeers', {
      token: tokenInput.value
    })
  }
})

socket.on('tokenGenerated', msg => {
  let URLString = document.URL + '?token=' + msg.token
  let genURL = URLString.link(URLString)
  generatedURL.innerHTML = 'Share URL with other peer to exchange files -> ' + genURL
  generatedToken.innerHTML = 'OR  Use token to paste in text box ' + msg.token
  disableConnectDiv()
})

socket.on('peerConnected', msg => {
  if (msg.type === 'reciever') {
    generateTokenBtn.style.display = 'none'
    disableConnectDiv()
    socket.on('fileReciever', handleRecieverFlowMsg) // In rtcClient.js
    socket.emit('activateSenderProfile', {
      type: 'activateSender',
      fileReceiver: msg.fileReceiver,
      fileSender: msg.fileSender
    })
  }
})

socket.on('activateSenderProfile', setSenderProfile)

socket.on('invalid', msg => {
  tokenInput.value = ''
  $('error').innerHTML = msg.token + ' is ' + msg.type
  tokenInput.removeAttribute('disabled')
  connect.removeAttribute('disabled')
})

const disableConnectDiv = () => {
  tokenInput.setAttribute('disabled', true)
  connect.setAttribute('disabled', true)
}
