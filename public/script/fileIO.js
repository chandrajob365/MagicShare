let fileReader = new FileReader()
const BYTES_PER_CHUNK = 1200
let currentChunk
let incomingFileInfo
let incomingFileData
let bytesReceived
let progressSpan
let progressBar
let statusSpan
// Sending file
function shareFile (file) {
  currentChunk = 0
  rtcObj.chunkDataChannel.send(JSON.stringify(
    {
      type: 'metadata',
      filetype: file.type,
      size: file.size,
      name: file.name
    }))
  setStatusAndProgressVars(file)
  statusSpan.innerHTML = 'Sending...'
  readNextChunk()
}

const readNextChunk = () => {
  let start = BYTES_PER_CHUNK * currentChunk
  let end = Math.min(file.size, start + BYTES_PER_CHUNK)
  fileReader.readAsArrayBuffer(file.slice(start, end))
}

fileReader.onload = () => {
  let bytesSent = ((currentChunk / file.size) * 100).toFixed(2) + '%'
  progressBar.setAttribute('value', bytesSent)
  rtcObj.chunkDataChannel.send(fileReader.result)
  currentChunk++
  if (BYTES_PER_CHUNK * currentChunk < file.size) {
    readNextChunk()
  } else {
    statusSpan.innerHTML = 'Sent'
    closeConnection()
  }
}

// Receiving file
const startReceiving = data => {
  incomingFileInfo = JSON.parse(data.toString())
  incomingFileData = []
  bytesReceived = 0
  updateFileList(incomingFileInfo)
  setStatusAndProgressVars(incomingFileInfo)
  downloadProgress = true
  statusSpan.innerHTML = 'Receiving..'
}

const progressReceiving = data => {
  bytesReceived += data.byteLength || data.size
  incomingFileData.push(data)
  progressBar.setAttribute('value', bytesReceived)
  if (bytesReceived === incomingFileInfo.size) {
    endReceiving()
  }
}

const endReceiving = () => {
  downloadProgress = false
  let blob = new Blob(incomingFileData)
  let anchor = document.createElement('a')

// var downloadUrl = "https://example.org/image.png";

  var downloading = browser.downloads.download({
    url: blob,
    filename: incomingFileInfo.name,
    conflictAction: 'uniquify'
  })

  downloading.then(onStartedDownload, onFailed)
  // anchor.href = URL.createObjectURL(blob)
  // console.log('URL = ', anchor.href)
  // anchor.download = incomingFileInfo.name
  // console.log('download = ', anchor.download)
  // anchor.click()
  statusSpan.innerHTML = 'Received'
  // statusSpan.appendChild(anchor)
  // socket.emit('transferComplete')
  // closeConnection()
}

function onStartedDownload(id) {
console.log(`Started downloading: ${id}`);
}

function onFailed(error) {
console.log(`Download failed: ${error}`);
}

const setStatusAndProgressVars = file => {
  progressSpan = document.querySelector(`[id='${file.name}'] .progressSpan`)
  progressBar = document.querySelector(`[id='${file.name}'] .progressSpan .progressBar`)
  statusSpan = document.querySelector(`[id='${file.name}'] .status`)
}
