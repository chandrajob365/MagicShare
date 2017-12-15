let fileReader = new FileReader()
const BYTES_PER_CHUNK = 1200
let currentChunk
let incomingFileInfo
let incomingFileData
let bytesReceived

// Sending file
function shareFile (file) {
  currentChunk = 0
  rtcObj.chunkDataChannel.send(JSON.stringify(
    {
      type: 'metadata',
      filetype: file.type,
      fileSize: file.size,
      fileName: file.name
    }))
  console.log('[shareFile] file.size = ', file.size)
  readNextChunk()
}

const readNextChunk = () => {
  let start = BYTES_PER_CHUNK * currentChunk
  let end = Math.min(file.size, start + BYTES_PER_CHUNK)
  fileReader.readAsArrayBuffer(file.slice(start, end))
}

fileReader.onload = () => {
  console.log('[onload]  fileReader.result = ', fileReader.result)
  rtcObj.chunkDataChannel.send(fileReader.result)
  currentChunk++
  if (BYTES_PER_CHUNK * currentChunk < file.size) {
    readNextChunk()
  }
}

// Receiving file
const startDownload = data => {
  incomingFileInfo = JSON.parse(data.toString())
  incomingFileData = []
  bytesReceived = 0
  downloadProgress = true
  console.log('incoming file <b>' + incomingFileInfo.fileName + '</b> of ' + incomingFileInfo.fileSize + ' bytes')
}

const progressDownload = data => {
  bytesReceived += data.byteLength || data.size
  console.log('dataReceived = ', bytesReceived)
  incomingFileData.push(data)
  console.log('progress: ' + ((bytesReceived / incomingFileInfo.fileSize) * 100).toFixed(2) + '%')
  if (bytesReceived === incomingFileInfo.fileSize) {
    endDownload()
  }
}

const endDownload = () => {
  downloadProgress = false
  let blob = new Blob(incomingFileData)
  let anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = incomingFileInfo.fileName
  anchor.textContent = 'Download file ' + incomingFileInfo.fileName
  $('msgReceived').appendChild(anchor)
  if (anchor.click) anchor.click()
  else {
    let clickEvent = document.createEvent('MouseEvents')
    clickEvent.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    anchor.dispatchEvent(clickEvent)
  }
}
