import logger from "./logger"
import webpack from "./webpack"
import Patcher from "./patcher"
import storage from "../storage"
import settings from "./settings"
import notifications from "./notifications"
import styles, { documentReady, plugins as pluginStyleNode, themes as themeStyleNode } from "./styles"
import modals from "./modals"
import commands from "./commands"

logger.log("Discord Re-invisioned", `Loading version '${DrApiNative.package.version}'...`)

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "f8") debugger
}, true)

import themes, { getThemes } from "./themes"
import plugins, { getPlugins } from "./plugins"

import ace from "https://ajaxorg.github.io/ace-builds/src-min-noconflict/ace.js"
ace.onerror = (event) => logger.err("Ace", "Cannot the Ace editor", event)
ace.onload = () => logger.log("Ace", "Loaded the Ace editor")

const originalConsole = globalThis.console
for (const key in originalConsole) {
  const e = originalConsole[key]
  Object.defineProperty(console, key, {
    get: () => e,
    set: () => e
  })
}

void function() {  
  function changeClasses(that, classes, old) {
    let newClasses = []
    classes.map(c => c.includes(" dr-") ? newClasses.push(...c.split(" ")) : newClasses.push(c))
    return old.apply(that, newClasses)
  }

  Patcher.instead("DrApi", DOMTokenList.prototype, "add", changeClasses)
  Patcher.instead("DrApi", DOMTokenList.prototype, "remove", changeClasses)
  Patcher.instead("DrApi", DOMTokenList.prototype, "contains", changeClasses)
}()

window.DrApi = {
  request: (url, then) => fetch(url).then(then),
  webpack,
  Patcher,
  storage: {
    useStorage: (pluginName, key, defaultValue) => storage.useStorage(pluginName === "internal" ? pluginName : `${pluginName}.plugin`, key, defaultValue),
    getData: (pluginName, key, defaultValue) => storage.getData(pluginName === "internal" ? pluginName : `${pluginName}.plugin`, key, defaultValue),
    setData: (pluginName, key, value) => storage.setData(pluginName === "internal" ? pluginName : `${pluginName}.plugin`, key, value)
  },
  plugins: {
    getAll: () => getPlugins(),
    get: (id) => getPlugins()[id],
    isEnabled: (id) => storage.getData("internal", "enabledPlugins", []).includes(id),
    toggle: (id) => {
      const enabledPlugins = storage.getData("internal", "enabledPlugins", [])
      const plugin = getPlugins()[id]

      if (!plugin) return
      const index = enabledPlugins.indexOf(id)

      if (index === -1) {
        plugin.exports.onStart?.()
        storage.setData("internal", "enabledPlugins", enabledPlugins.concat(id))
        return true
      }
      
      enabledPlugins.splice(index, 1)
      storage.setData("internal", "enabledPlugins", enabledPlugins)
      plugin.exports.onStop?.()
      
      return false
    }
  },
  themes: {
    getAll: (splash) => getThemes(splash),
    get: (id, splash) => getThemes(splash)[id],
    isEnabled: (id, splash) => storage.getData("internal", splash ? "enabledSplashThemes" : "enabledThemes", []).includes(id),
    toggle: (id, splash) => {
      const enabledThemes = storage.getData("internal", splash ? "enabledSplashThemes" : "enabledThemes", [])
      const theme = getThemes()[id]

      if (!theme) return
      const index = enabledThemes.indexOf(id)

      if (index === -1) {
        storage.setData("internal", splash ? "enabledSplashThemes" : "enabledThemes", enabledThemes.concat(id))

        if (splash) return true

        const style = document.createElement("style")
        style.setAttribute("dr-theme", id)
        style.innerHTML = theme.css
        themeStyleNode.appendChild(style)

        return true
      }

      enabledThemes.splice(index, 1)
      storage.setData("internal", splash ? "enabledSplashThemes" : "enabledThemes", enabledThemes)
      if (!splash) document.querySelector(`[dr-theme=${JSON.stringify(id)}]`).remove()

      return false
    }
  },
  styling: {
    insert: (id, css) => {
      let node = document.querySelector(`[dr-plugin=${JSON.stringify(id)}]`)
      if (!node) {
        node = document.createElement("style")
        node.setAttribute("dr-plugin", id)
        pluginStyleNode.appendChild(node)
      }
      node.innerHTML = css
      return (css) => typeof css === "string" ? DrApi.styling.insert(id, css) : node.remove()
    },
    remove: (id) => document.querySelector(`[dr-plugin=${JSON.stringify(id)}]`)?.remove?.()
  }
}

let loaded = false
async function windowsLoadingIcon(React) {
  const titlebar = await webpack.getModuleAsync(m => {
    const stringed = m.default.toString()
    return stringed.includes("windowKey:") && stringed.includes("themeOverride") && stringed.includes(".macOSFrame")
  })
  
  const dispatcher = webpack.getModuleByProps("dirtyDispatch", "dispatch")

  DrApi.Patcher.after("DrApi", titlebar, "default", (that, args, res) => {
    const [ isLoaded, setLoaded ] = React.useState(loaded)

    React.useEffect(() => {
      function onOpen() {
        if (isLoaded) return
        setLoaded(true)
      }
      dispatcher.subscribe("CONNECTION_OPEN", onOpen)
      return () => dispatcher.unsubscribe("CONNECTION_OPEN", onOpen)
    })

    if (isLoaded) return
    if (res.type.displayName !== "Windows") return

    const old = res.type
    res.type = function() {
      const _res = old.apply(this, arguments)
      
      _res.props.children.push(React.createElement("svg", {
        width: "22",
        height: "22",
        viewBox: "0 0 22 22",
        className: "dr-titlebar-loading-icon",
        children: React.createElement("path", {
          d: "M11.1903 7.802C11.1903 8.426 11.1003 9.092 10.9203 9.8C10.7403 10.496 10.4883 11.192 10.1643 11.888C9.84032 12.572 9.43832 13.232 8.95832 13.868C8.49032 14.492 7.95632 15.044 7.35632 15.524C6.75632 15.992 6.09632 16.37 5.37632 16.658C4.66832 16.946 3.91232 17.09 3.10832 17.09C2.94032 17.09 2.77232 17.078 2.60432 17.054C2.43632 17.042 2.26832 17.024 2.10032 17C2.42432 15.344 2.74232 13.73 3.05432 12.158C3.17432 11.498 3.30032 10.814 3.43232 10.106C3.56432 9.386 3.69032 8.678 3.81032 7.982C3.93032 7.286 4.04432 6.62 4.15232 5.984C4.27232 5.348 4.36832 4.772 4.44032 4.256C4.95632 4.16 5.47832 4.07 6.00632 3.986C6.53432 3.902 7.07432 3.86 7.62632 3.86C8.27432 3.86 8.82032 3.962 9.26432 4.166C9.72032 4.37 10.0863 4.652 10.3623 5.012C10.6503 5.372 10.8603 5.792 10.9923 6.272C11.1243 6.752 11.1903 7.262 11.1903 7.802ZM6.94232 6.398C6.81032 7.106 6.67232 7.784 6.52832 8.432C6.38432 9.08 6.24032 9.734 6.09632 10.394C5.95232 11.054 5.80832 11.744 5.66432 12.464C5.52032 13.184 5.38232 13.97 5.25032 14.822C5.53832 14.63 5.81432 14.372 6.07832 14.048C6.35432 13.712 6.61232 13.328 6.85232 12.896C7.09232 12.464 7.30832 12.008 7.50032 11.528C7.70432 11.048 7.87832 10.58 8.02232 10.124C8.16632 9.668 8.27432 9.242 8.34632 8.846C8.43032 8.45 8.47232 8.108 8.47232 7.82C8.47232 7.376 8.34632 7.028 8.09432 6.776C7.85432 6.524 7.47032 6.398 6.94232 6.398ZM10.0456 17.018C10.3696 15.422 10.6816 13.862 10.9816 12.338C11.0896 11.69 11.2096 11.018 11.3416 10.322C11.4736 9.614 11.5936 8.918 11.7016 8.234C11.8216 7.538 11.9296 6.872 12.0256 6.236C12.1336 5.588 12.2176 5 12.2776 4.472C12.9616 4.256 13.6996 4.1 14.4916 4.004C15.2836 3.896 16.0696 3.842 16.8496 3.842C17.3176 3.842 17.7016 3.896 18.0016 4.004C18.3136 4.112 18.5536 4.268 18.7216 4.472C18.9016 4.664 19.0276 4.892 19.0996 5.156C19.1716 5.42 19.2076 5.714 19.2076 6.038C19.2076 6.518 19.1236 6.992 18.9556 7.46C18.7876 7.916 18.5596 8.354 18.2716 8.774C17.9956 9.182 17.6716 9.56 17.2996 9.908C16.9396 10.244 16.5496 10.52 16.1296 10.736C16.3456 11.216 16.5736 11.744 16.8136 12.32C17.0656 12.884 17.2996 13.424 17.5156 13.94C17.7556 14.54 18.0016 15.14 18.2536 15.74L15.4636 16.712C15.2236 15.944 15.0076 15.224 14.8156 14.552C14.7316 14.276 14.6476 13.994 14.5636 13.706C14.4796 13.406 14.4016 13.124 14.3296 12.86C14.2576 12.596 14.1976 12.362 14.1496 12.158C14.1016 11.942 14.0716 11.768 14.0596 11.636L13.8256 11.708C13.7536 12.092 13.6636 12.542 13.5556 13.058C13.4596 13.574 13.3696 14.072 13.2856 14.552C13.1776 15.116 13.0696 15.686 12.9616 16.262L10.0456 17.018ZM14.2756 9.206C14.5036 9.182 14.7796 9.086 15.1036 8.918C15.4396 8.75 15.7576 8.552 16.0576 8.324C16.3576 8.084 16.6156 7.838 16.8316 7.586C17.0476 7.334 17.1556 7.112 17.1556 6.92C17.1556 6.788 17.1136 6.686 17.0296 6.614C16.9456 6.53 16.8256 6.47 16.6696 6.434C16.5256 6.386 16.3636 6.356 16.1836 6.344C16.0036 6.332 15.8176 6.326 15.6256 6.326C15.4936 6.326 15.3556 6.332 15.2116 6.344C15.0796 6.344 14.9596 6.344 14.8516 6.344L14.2756 9.206Z",
          fill: "currentcolor"
        })
      }))
      res.type = old
      return _res
    }
    Object.assign(res.type, old)
  })
}

void async function() {
  const React = await webpack.getModuleByPropsAsync("memo", "createElement")

  window.DrApi.React = React

  settings(React)
  notifications(React)
  modals(React)
  windowsLoadingIcon(React)
  commands(React)

  const dispatcher = await webpack.getModuleByPropsAsync("dirtyDispatch", "dispatch")
  function onOpen() {
    loaded = true
    
    logger.log("Plugins", "Initializing all plugins")
    plugins()

    logger.log("Updater", "Checking for new update")
    DrApi.request("https://api.github.com/repos/Dr-Discord/Discord-Re-envisioned/releases", async request => {
      const json = (await request.json()).shift()

      if (DrApiNative.package.version >= json.tag_name) return
      
      const CloudDownload = webpack.getModuleByDisplayName("CloudDownload", true)
      DrApi.modals.confirmModal([
        React.createElement(CloudDownload, {
          style: {
            transform: "translateY(4px)",
            marginRight: 8
          }
        }),
        "You version is out of date!"
      ], [
        "Do you want to update Discord Re-envisioned",
        `You version is '${DrApiNative.package.version}' and the latest is '${json.tag_name}'`
      ], {
        confirmText: "Update",
        onConfirm: () => {
          const hash = json.assets.find(a => a.name.endsWith(".asar")).url.split("/").pop()
          DrApiNative.downloadAsar(hash, (err) => err ? null : DrApiNative.quit(true))
        }
      })
    })
    
    dispatcher.unsubscribe("CONNECTION_OPEN", onOpen)
  }

  dispatcher.subscribe("CONNECTION_OPEN", onOpen)
  dispatcher.subscribe("CONNECTION_OPEN", ({ user }) => document.documentElement.setAttribute("user-id", user.id))
  dispatcher.subscribe("LOGOUT", () => document.documentElement.removeAttribute("user-id"))
}()


function onDocumentLoad() {
  globalThis.console = { ...globalThis.console }

  logger.log("Themes", "Adding themes")
  documentReady()

  styles("DrApi", require("../styling/index.scss"))

  themes()

  document.documentElement.setAttribute("release", window.GLOBAL_ENV.RELEASE_CHANNEL)
  if (storage.getData("internal", "transparency", false)) document.documentElement.setAttribute("transparent", "")
}

if (document.readyState === "complete") onDocumentLoad()
else document.addEventListener("DOMContentLoaded", onDocumentLoad)
