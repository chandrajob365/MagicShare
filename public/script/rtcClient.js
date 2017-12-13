const socket = io.connect()
const $ = id => document.getElementById(id)
socket.on('clientConnect', msg => {
  console.log('Client connected', msg.clientId)
  $('generatedToken').innerHTML = 'Use this token to connect with me : ' + socket.id
})

$('connect').addEventListener('click', event => {
  let token = $('token').value
  if (token.length > 0) {
    socket.emit('pair', {token: token})
  }
})

socket.on('paired', msg => {
  $('peerId').innerHTML = 'Connected peer : ' + msg.peer
})

$('send').addEventListener('click', event => {
  let msg = $('inputMsg').value
  if (msg.length > 0) {
    console.log('msg = ', msg)
  }
})
