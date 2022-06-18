const storage = require("../storage")
const { styles } = require("./styles")

const themesFolder = DrApiNative.fileSystem.join(DrApiNative.fileSystem.dirName, "themes")

if (!DrApiNative.fileSystem.exists(themesFolder)) DrApiNative.fileSystem.mkdir(themesFolder)

const readDir = DrApiNative.runInNative("require(\"fs\").readdirSync")

const themes = readDir(themesFolder).filter(theme => theme.endsWith(".css"))

function readMeta(contents) {
  const meta = {}
  const jsdoc = contents.match(/\/\*\*([\s\S]*?)\*\//)
  if (!jsdoc?.[1]) return meta
  for (let ite of jsdoc[1].match(/\*\s([^\n]*)/g)) {
    ite = ite.replace(/\*( +|)@/, "")
    const split = ite.split(" ")
    meta[split[0]] = split.slice(1).join(" ").trim()
  }
  return meta
}

const _themes = {}

for (const theme of themes) {
  const themeContent = DrApiNative.fileSystem.readFile(DrApiNative.fileSystem.join(themesFolder, theme))
  const meta = readMeta(themeContent)
  meta.css = themeContent
  _themes[meta.name] = meta
}

module.exports = () => {
  const enabledThemes = storage.getData("internal", "enabledThemes", [])
  
  for (const theme of Object.keys(_themes)) {
    if (!enabledThemes.includes(theme)) continue
    module.exports.toggleTheme(theme)
  }
}

module.exports.toggleTheme = (id) => {
  const theme = _themes[id]

  const isOn = document.getElementById(id)
  if (isOn) return isOn.remove()

  const style = document.createElement("style")
  style.id = theme.name
  style.innerHTML = theme.css
  styles.appendChild(style)
}

module.exports.getThemes = () => _themes