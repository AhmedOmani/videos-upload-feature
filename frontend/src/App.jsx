import { useState } from 'react'
import { uploadVideo } from './services/uploadService'

function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')  // idle, uploading, done, error
  const [progress, setProgress] = useState(0)

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    setFile(selectedFile)
    setStatus('idle')
    console.log('Selected file:', selectedFile?.name, selectedFile?.size)
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first!')
      return
    }

    setStatus('uploading')
    setProgress(0)

    try {
      console.log('Starting upload...')
      const result = await uploadVideo(file)
      console.log('Upload complete!', result)
      setStatus('done')
    } catch (error) {
      console.error('Upload failed:', error)
      setStatus('error')
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>🎬 Video Upload Test</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
        />
      </div>

      {file && (
        <div style={{ marginBottom: '20px' }}>
          <p><strong>File:</strong> {file.name}</p>
          <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Type:</strong> {file.type}</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || status === 'uploading'}
        style={{ padding: '10px 20px', fontSize: '16px' }}
      >
        {status === 'uploading' ? '⏳ Uploading...' : '🚀 Upload'}
      </button>

      {status === 'done' && (
        <p style={{ color: 'green', marginTop: '20px' }}>
          ✅ Upload complete! Check your S3 bucket.
        </p>
      )}

      {status === 'error' && (
        <p style={{ color: 'red', marginTop: '20px' }}>
          ❌ Upload failed. Check console for details.
        </p>
      )}

      <div style={{ marginTop: '40px', color: '#666' }}>
        <p>📋 Open browser DevTools (F12) → Console to see upload progress</p>
      </div>
    </div>
  )
}

export default App
