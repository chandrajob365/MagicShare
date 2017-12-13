const socket = io(document.URL)
const $ = id => document.getElementById(id)
const generateTokenBtn = $('generateTokenBtn')
const generatedToken = $('generatedToken')
const connectedPeer = $('connectedPeer')
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
  generatedToken.innerHTML = 'Share URL with other peer to exchange files -> ' + genURL
  disableConnectDiv()
})

socket.on('peerConnected', msg => {
  if (msg.type === 'reciever') {
    generateTokenBtn.style.display = 'none'
    disableConnectDiv()
  }
  connectedPeer.innerHTML = 'Connection established with peer : ' + msg.peer
})

const disableConnectDiv = () => {
  tokenInput.setAttribute('disabled', true)
  connect.setAttribute('disabled', true)
}
