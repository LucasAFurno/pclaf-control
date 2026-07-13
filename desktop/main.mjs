import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const indexPath = path.join(root, 'dist', 'index.html')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  })

  if (!existsSync(indexPath)) {
    win.loadURL(`data:text/html,
      <html>
        <body style="font-family:sans-serif;padding:24px">
          <h1>Falta compilar la app</h1>
          <p>Ejecuta <code>npm run build</code> o <code>npm run desktop:start</code>.</p>
        </body>
      </html>`)
    return
  }

  win.loadFile(indexPath)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
