const socket = io(document.URL)
const $ = id => document.getElementById(id)
const shareFileBtn = $('shareFileBtn')
const generatedURL = $('generatedURL')
const generatedToken = $('generatedToken')
const tokenInput = $('OTP')
const receiveFileBtn = $('receiveFileBtn')
const fileBrowser = $('browseFile')
const fileListContainer = $('fileListContainer')
const alert = document.querySelector('.alert')
const error = document.querySelector('.error')
const receiverProfile = document.querySelector('.receiverProfile')
const senderProfile = document.querySelector('.senderProfile')
let file = null

const handleFiles = () => {
  file = fileBrowser.files[0]
  updateFileList(file)
}

const updateFileList = file => {
  let fileRecord = document.createElement('div')
  fileRecord.setAttribute('id', file.name)
  let fileName = document.createElement('span')
  fileName.innerHTML = file.name
  fileName.setAttribute('class', 'fileName')
  let fileSize = document.createElement('span')
  fileSize.innerHTML = file.size
  fileSize.setAttribute('class', 'size')
  let status = document.createElement('span')
  status.innerHTML = '-'
  status.setAttribute('class', 'status')
  let progressSpan = document.createElement('span')
  let progressBar = document.createElement('progress')
  progressBar.setAttribute('value', 0)
  progressBar.setAttribute('max', 100)
  progressBar.setAttribute('min', 0)
  progressBar.setAttribute('class', 'progressBar')
  progressSpan.appendChild(progressBar)
  progressSpan.setAttribute('class', 'progressSpan')

  fileRecord.appendChild(fileName)
  fileRecord.appendChild(fileSize)
  fileRecord.appendChild(status)
  fileRecord.appendChild(progressSpan)

  fileListContainer.appendChild(fileRecord)
}

fileBrowser.addEventListener('change', handleFiles)

shareFileBtn.addEventListener('click', event => {
  socket.emit('generateToken', socket.id)
  fileBrowser.setAttribute('disabled', true)
})

receiveFileBtn.addEventListener('click', event => {
  if (tokenInput.value.length > 0) {
    socket.emit('connectPeers', {
      token: tokenInput.value
    })
  }
})

socket.on('enableReceiverProfile', () => {
  enableReceiverProfile()
})

socket.on('tokenGenerated', msg => {
  document.querySelector('.token').style.display = 'flex'
  let URLString = document.URL + '?token=' + msg.token
  let genURL = URLString.link(URLString)
  generatedURL.setAttribute('href', genURL)
  generatedURL.innerHTML = genURL
  generatedToken.innerHTML = 'Or share token : ' + msg.token
  enableSenderProfile()
})

const enableSenderProfile = () => {
  senderProfile.setAttribute('disabled', true)
  receiverProfile.style.display = 'none'
}

const enableReceiverProfile = () => {
  senderProfile.style.display = 'none'
  receiverProfile.style.display = 'flex'
}

socket.on('peerConnected', msg => {
  if (msg.type === 'reciever') {
    shareFileBtn.style.display = 'none'
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
  alert.style.display = 'flex'
  error.textContent = msg.token + ' is ' + msg.type
  window.setTimeout(clearError, 3000)
  tokenInput.removeAttribute('disabled')
  receiveFileBtn.removeAttribute('disabled')
})

const clearError = () => {
  error.textContent = ''
  alert.style.display = 'none'
}

socket.on('resetProfile', () => {
  senderProfile.removeAttribute('disabled')
  senderProfile.style.display = 'flex'
  receiverProfile.style.display = 'flex'
  $('shareFileBtn').style.display = 'flex'
  generatedURL.innerHTML = ''
  generatedToken.innerHTML = ''
})
const disableConnectDiv = () => {

}
