import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import QtQuick
import qs.Commons
import qs.Commons as Commons
import qs.Ui
import "OrcCatalog.js" as OrcCatalog

// orc.pictures for the Omarchy shell: search the orc reaction GIFs and paste
// the GIF file into the window in front, like the Raycast extension does.
//
// The grid draws poster stills from a local cache that sync.sh fills from
// https://orc.pictures when the overlay opens. A GIF itself is downloaded only
// when it is pasted, copied or previewed (Space), then cached by revision.
Item {
  id: root

  property var shell: null
  property var manifest: null

  property bool opened: false
  property string filterText: ""
  property int selectedIndex: 0
  property bool cursorActive: false
  property string style: "orc"
  // Space turns on previews: the selected GIF is downloaded and plays.
  property bool previewing: false

  property var gifs: []
  property bool usingFallback: true
  // Cache names ("orc/nod.abc123.gif") of GIFs already on disk.
  property var cachedGifs: ({})
  property int posterGeneration: 0
  property string pendingFetch: ""
  // A paste or copy waiting for its GIF to download: { mode, gifStyle, slug, revision, gifName }.
  property var pendingUse: null

  readonly property string home: Quickshell.env("HOME")
  readonly property string cacheDir: (Quickshell.env("XDG_CACHE_HOME") || (root.home + "/.cache")) + "/orc-pictures"
  readonly property string pluginDir: decodeURIComponent(String(Qt.resolvedUrl(".")).replace(/^file:\/\//, "")).replace(/\/$/, "")
  readonly property string pluginId: (root.manifest && root.manifest.id) || "orc-pictures"

  // Shares the [menu] surface tokens, like the clipboard and emoji pickers.
  property color background: Commons.Color.menu.background
  property color foreground: Commons.Color.menu.text
  property color border: Commons.Color.menu.border
  property var borderSpec: Border.surfaceSpec("menu", "border", border, Math.max(1, Style.space(2)))
  property color scrim: Commons.Color.menu.scrim
  property color selectedBackground: Commons.Color.menu.selectedBackground
  property color selectedText: Commons.Color.menu.selectedText
  readonly property int cornerRadius: Style.cornerRadius
  property string fontFamily: Style.font.menuFamily
  property int contentMargin: Style.spacing.panelPadding
  property int headerHeight: Math.max(Style.space(34), Style.font.title + Style.spacing.controlPaddingY * 2)
  property int footerHeight: Style.font.caption + Style.space(8)
  property int contentSpacing: Style.spacing.md
  property int cardWidth: Math.min(Style.space(960), panel.width - Style.gapsOut * 2)
  property int cardHeight: Math.min(Style.space(680), panel.height - Style.gapsOut * 2)
  property int columns: 5
  property int titleHeight: Style.font.body + Style.space(10)

  Commons.Translations { id: strings; directory: Qt.resolvedUrl("i18n") }

  function open(payloadJson) {
    root.opened = true
    root.filterText = ""
    root.selectedIndex = 0
    root.cursorActive = true
    root.previewing = false
    root.pendingUse = null
    pointerGate.reset()
    catalogFile.reload()
    root.rebuildDisplay()
    if (!cachedProc.running) cachedProc.running = true
    if (!syncProc.running) syncProc.running = true
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
  }

  function close() {
    root.opened = false
  }

  function dismiss() {
    root.opened = false
    root.pendingUse = null
    if (root.shell && typeof root.shell.hide === "function") root.shell.hide(root.pluginId)
  }

  function toggle() {
    if (root.opened) root.dismiss()
    else root.open("{}")
  }

  function loadCatalog(raw, fallback) {
    try {
      root.gifs = OrcCatalog.parseCatalog(raw)
      root.usingFallback = fallback
    } catch (e) {
      // A bad cached catalog falls back to the one bundled with the plugin.
      if (!fallback) {
        fallbackFile.reload()
        return
      }
      root.gifs = []
    }
    if (root.opened) root.rebuildDisplay()
  }

  function rebuildDisplay() {
    var rows = OrcCatalog.search(OrcCatalog.gifsForStyle(root.gifs, root.style), root.filterText)
    displayModel.clear()
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      displayModel.append({
        slug: row.slug,
        title: row.title,
        gifStyle: row.style,
        revision: row.revision,
        posterPath: root.cacheDir + "/posters/" + OrcCatalog.cacheName(row, "jpg"),
        gifName: OrcCatalog.cacheName(row, "gif")
      })
    }
    if (displayModel.count === 0) selectedIndex = 0
    else if (selectedIndex >= displayModel.count) selectedIndex = displayModel.count - 1
    else if (selectedIndex < 0) selectedIndex = 0
    Qt.callLater(function() {
      if (displayModel.count > 0) resultGrid.positionViewAtIndex(root.selectedIndex, GridView.Contain)
    })
    previewTimer.restart()
  }

  function setFilter(next) {
    root.filterText = next
    root.selectedIndex = 0
    root.cursorActive = true
    pointerGate.reset()
    root.rebuildDisplay()
  }

  function setStyle(next) {
    if (!OrcCatalog.isStyle(next) || next === root.style) return
    root.style = next
    root.selectedIndex = 0
    root.rebuildDisplay()
  }

  function moveTo(index) {
    if (displayModel.count === 0) return
    pointerGate.reset()
    root.cursorActive = true
    root.selectedIndex = Math.max(0, Math.min(index, displayModel.count - 1))
    resultGrid.positionViewAtIndex(root.selectedIndex, GridView.Contain)
    previewTimer.restart()
  }

  function select(delta) {
    if (displayModel.count === 0) return
    if (!root.cursorActive) root.moveTo(delta < 0 ? displayModel.count - 1 : 0)
    else root.moveTo((root.selectedIndex + delta + displayModel.count) % displayModel.count)
  }

  function selectRows(rows) {
    if (displayModel.count === 0) return
    root.moveTo(root.cursorActive ? root.selectedIndex + rows * root.columns : 0)
  }

  function visibleRows() {
    return Math.max(1, Math.floor(resultGrid.height / resultGrid.cellHeight))
  }

  function selectFromPointer(index, item, mouse) {
    if (!pointerGate.moved(item, mouse)) return
    root.cursorActive = true
    root.selectedIndex = index
    previewTimer.restart()
  }

  function gifArgs(mode, row) {
    return [root.pluginDir + "/gif.sh", mode, row.gifStyle, row.slug, row.revision || "", root.cacheDir]
  }

  function runGif(mode, row) {
    var args = root.gifArgs(mode, row)
    root.dismiss()
    // Login shell for the session PATH (wl-copy, wtype, xdg-open); argv stays literal.
    Util.execArgv(args)
  }

  // mode: "paste", "copy", "link" or "open".
  function useIndex(index, mode) {
    if (index < 0 || index >= displayModel.count) return
    var row = displayModel.get(index)
    var needsFile = mode === "paste" || mode === "copy"
    if (!needsFile || root.cachedGifs[row.gifName]) {
      root.runGif(mode, row)
      return
    }
    // Download with the overlay still up, so the paste goes to the window that
    // was in front when the GIF was picked, not wherever focus wandered since.
    root.cursorActive = true
    root.selectedIndex = index
    root.pendingUse = { mode: mode, gifStyle: row.gifStyle, slug: row.slug, revision: row.revision, gifName: row.gifName }
    root.startFetch(root.pendingUse)
  }

  // One download at a time; a queued paste starts when the current one ends.
  function startFetch(row) {
    if (fetchProc.running) return
    root.pendingFetch = row.gifName
    fetchProc.command = root.gifArgs("fetch", row)
    fetchProc.running = true
  }

  function startPreview() {
    if (!root.previewing || !root.opened || !root.cursorActive || root.pendingUse) return
    if (root.selectedIndex < 0 || root.selectedIndex >= displayModel.count) return
    var row = displayModel.get(root.selectedIndex)
    if (!root.cachedGifs[row.gifName]) root.startFetch(row)
  }

  function markCached(name) {
    var next = ({})
    for (var key in root.cachedGifs) next[key] = true
    next[name] = true
    root.cachedGifs = next
  }

  function loadCachedList(text) {
    var names = ({})
    var lines = String(text || "").split("\n")
    for (var i = 0; i < lines.length && i < 10000; i++)
      if (/^(orc|videorc)\/[a-z0-9-]+\.([a-f0-9]{8,64}|current)\.gif$/.test(lines[i])) names[lines[i]] = true
    root.cachedGifs = names
  }

  ListModel { id: displayModel }

  PointerMoveGate {
    id: pointerGate
    referenceItem: card
  }

  // Waits for the selection to settle before downloading a preview.
  Timer {
    id: previewTimer
    interval: 300
    onTriggered: root.startPreview()
  }

  FileView {
    id: catalogFile
    path: root.cacheDir + "/catalog.json"
    printErrors: false
    onLoaded: root.loadCatalog(text(), false)
    // No synced catalog yet: use the bundled one until sync.sh finishes.
    onLoadFailed: fallbackFile.reload()
  }

  FileView {
    id: fallbackFile
    path: root.pluginDir + "/fallback-catalog.json"
    // Read only when the synced catalog is missing or bad, so it never races it.
    preload: false
    printErrors: false
    onLoaded: root.loadCatalog(text(), true)
    onLoadFailed: root.loadCatalog("[]", true)
  }

  Process {
    id: syncProc
    command: [root.pluginDir + "/sync.sh", root.cacheDir, root.pluginDir + "/fallback-catalog.json"]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        root.posterGeneration++
        catalogFile.reload()
      }
    }
  }

  Process {
    id: cachedProc
    command: ["find", root.cacheDir + "/gifs", "-mindepth", "2", "-maxdepth", "2", "-name", "*.gif", "-size", "+0", "-printf", "%P\\n"]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.loadCachedList(text)
    }
  }

  Process {
    id: fetchProc
    onExited: function(exitCode) {
      var name = root.pendingFetch
      root.pendingFetch = ""
      if (exitCode === 0 && name) root.markCached(name)
      var use = root.pendingUse
      if (use && root.opened) {
        // Done (or failed: gif.sh then retries and reports why), so use it now.
        if (use.gifName === name || root.cachedGifs[use.gifName]) {
          root.pendingUse = null
          root.runGif(use.mode, use)
        } else {
          root.startFetch(use)
        }
        return
      }
      // The selection may have moved on while this one downloaded.
      previewTimer.restart()
    }
  }

  OverlayWindow {
    id: panel
    shown: root.opened
    WlrLayershell.namespace: "orc-pictures"

    Rectangle {
      anchors.fill: parent
      color: root.scrim
    }

    MouseArea {
      anchors.fill: parent
      onClicked: root.dismiss()
    }

    BorderSurface {
      id: card
      width: root.cardWidth
      height: root.cardHeight
      radius: root.cornerRadius
      anchors.centerIn: parent
      color: root.background
      borderSpec: root.borderSpec
      padding: root.contentMargin

      MouseArea { anchors.fill: parent; onClicked: {} }

      Item {
        id: keyCatcher
        anchors.fill: parent
        focus: true

        Keys.priority: Keys.BeforeItem
        Keys.onPressed: function(event) {
          var ctrlOnly = event.modifiers === Qt.ControlModifier
          if (event.key === Qt.Key_Escape) {
            if (root.filterText) root.setFilter("")
            else root.dismiss()
          } else if (event.key === Qt.Key_Tab || event.key === Qt.Key_Backtab) {
            root.setStyle(root.style === "orc" ? "videorc" : "orc")
          } else if (event.key === Qt.Key_Space && !root.filterText) {
            root.previewing = !root.previewing
            previewTimer.restart()
          } else if (Util.editsFilter(event, root.filterText)) {
            root.setFilter(Util.editedFilter(event, root.filterText))
          } else if (ctrlOnly && event.key >= Qt.Key_1 && event.key <= Qt.Key_9) {
            root.useIndex(event.key - Qt.Key_1, "paste")
          } else if (ctrlOnly && event.key === Qt.Key_C) {
            if (root.cursorActive) root.useIndex(root.selectedIndex, "copy")
          } else if (ctrlOnly && event.key === Qt.Key_L) {
            if (root.cursorActive) root.useIndex(root.selectedIndex, "link")
          } else if (ctrlOnly && event.key === Qt.Key_O) {
            if (root.cursorActive) root.useIndex(root.selectedIndex, "open")
          } else if (Util.readingKey(event) === Qt.Key_Left) {
            root.select(-1)
          } else if (Util.readingKey(event) === Qt.Key_Right) {
            root.select(1)
          } else if (event.key === Qt.Key_Up) {
            root.selectRows(-1)
          } else if (event.key === Qt.Key_Down) {
            root.selectRows(1)
          } else if (event.key === Qt.Key_PageUp) {
            root.selectRows(-root.visibleRows())
          } else if (event.key === Qt.Key_PageDown) {
            root.selectRows(root.visibleRows())
          } else if (event.key === Qt.Key_Home && ctrlOnly) {
            root.moveTo(0)
          } else if (event.key === Qt.Key_End && ctrlOnly) {
            root.moveTo(displayModel.count - 1)
          } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
            if (!root.cursorActive) {
              if (displayModel.count > 0) root.cursorActive = true
            } else if (event.modifiers & Qt.ShiftModifier) root.useIndex(root.selectedIndex, "copy")
            else root.useIndex(root.selectedIndex, "paste")
          } else if (event.text && event.text.length === 1 && event.text.charCodeAt(0) >= 32 && event.text.charCodeAt(0) !== 127
                     && !(event.modifiers & (Qt.ControlModifier | Qt.AltModifier | Qt.MetaModifier))) {
            root.setFilter(root.filterText + event.text)
          } else {
            return
          }
          event.accepted = true
        }
      }

      Column {
        anchors.fill: parent
        anchors.topMargin: card.contentTopInset
        anchors.rightMargin: card.contentRightInset
        anchors.bottomMargin: card.contentBottomInset
        anchors.leftMargin: card.contentLeftInset
        spacing: root.contentSpacing

        Item {
          width: parent.width
          height: root.headerHeight

          Text {
            textFormat: Text.PlainText
            anchors.left: parent.left
            anchors.right: styleSwitch.left
            anchors.rightMargin: root.contentSpacing
            anchors.verticalCenter: parent.verticalCenter
            text: root.filterText || (root.style === "videorc" ? strings.t("searchVideorc") : strings.t("search"))
            color: root.foreground
            opacity: root.filterText ? 1 : 0.58
            font.family: root.fontFamily
            font.pixelSize: Style.font.heading
            elide: Text.ElideRight
          }

          Row {
            id: styleSwitch
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(4)

            Repeater {
              model: [
                { value: "orc", label: strings.t("styleOrc") },
                { value: "videorc", label: strings.t("styleVideorc") }
              ]

              delegate: Rectangle {
                id: pill
                required property var modelData
                readonly property bool active: root.style === pill.modelData.value
                width: pillText.implicitWidth + Style.space(20)
                height: pillText.implicitHeight + Style.space(10)
                radius: height / 2
                color: pill.active ? root.selectedBackground : Util.alpha(root.foreground, 0.06)

                Text {
                  id: pillText
                  textFormat: Text.PlainText
                  anchors.centerIn: parent
                  text: pill.modelData.label
                  color: pill.active ? root.selectedText : root.foreground
                  opacity: pill.active ? 1 : 0.7
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.body
                }

                MouseArea {
                  anchors.fill: parent
                  cursorShape: Qt.PointingHandCursor
                  onClicked: root.setStyle(pill.modelData.value)
                }
              }
            }
          }
        }

        Item {
          width: parent.width
          height: parent.height - root.headerHeight - root.footerHeight - root.contentSpacing * 2

          GridView {
            id: resultGrid
            anchors.fill: parent
            model: displayModel
            clip: true
            cellWidth: Math.floor(width / root.columns)
            cellHeight: cellWidth + root.titleHeight
            boundsBehavior: Flickable.StopAtBounds
            cacheBuffer: cellHeight * 2

            delegate: Item {
              id: tile
              required property int index
              required property string slug
              required property string title
              required property string gifStyle
              required property string revision
              required property string posterPath
              required property string gifName

              readonly property bool hasCursor: root.cursorActive && index === root.selectedIndex
              readonly property bool playing: tile.hasCursor && root.opened && !!root.cachedGifs[tile.gifName]
              readonly property bool loadingPreview: (!!root.pendingUse && root.pendingUse.gifName === tile.gifName)
                || (tile.hasCursor && root.previewing && root.pendingFetch === tile.gifName)
              readonly property int inset: Style.space(4)

              width: resultGrid.cellWidth
              height: resultGrid.cellHeight

              Rectangle {
                anchors.fill: parent
                anchors.margins: Style.space(2)
                radius: root.cornerRadius
                color: tile.hasCursor ? root.selectedBackground : "transparent"
              }

              Item {
                id: thumb
                x: tile.inset
                y: tile.inset
                width: tile.width - tile.inset * 2
                height: tile.width - tile.inset * 2
                clip: true

                Rectangle {
                  anchors.fill: parent
                  radius: Math.max(0, root.cornerRadius - tile.inset)
                  color: Util.alpha(root.foreground, 0.06)
                }

                // posterGeneration bumps after a sync so freshly downloaded stills load.
                SizedImage {
                  anchors.fill: parent
                  crop: true
                  visible: !tile.playing
                  url: !visible ? "" : Util.fileUrl(tile.posterPath) + "#" + root.posterGeneration
                  asynchronous: true
                  smooth: true
                }

                // Only the selected GIF plays, and only once it is on disk.
                Loader {
                  anchors.fill: parent
                  active: tile.playing
                  sourceComponent: AnimatedImage {
                    source: Util.fileUrl(root.cacheDir + "/gifs/" + tile.gifName)
                    fillMode: Image.PreserveAspectCrop
                    asynchronous: true
                    smooth: true
                    playing: true
                    // Decode frames as they play instead of holding all of them (~100 MB a GIF).
                    cache: false
                  }
                }

                Rectangle {
                  visible: tile.loadingPreview
                  anchors.left: parent.left
                  anchors.bottom: parent.bottom
                  anchors.margins: Style.space(6)
                  width: loadingText.implicitWidth + Style.space(10)
                  height: loadingText.implicitHeight + Style.space(4)
                  radius: height / 2
                  color: Util.alpha(root.background, 0.82)

                  Text {
                    id: loadingText
                    textFormat: Text.PlainText
                    anchors.centerIn: parent
                    text: strings.t("loading")
                    color: root.foreground
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.caption
                  }
                }

                Text {
                  visible: tile.index < 9
                  textFormat: Text.PlainText
                  anchors.right: parent.right
                  anchors.top: parent.top
                  anchors.margins: Style.space(6)
                  text: String(tile.index + 1)
                  color: root.foreground
                  opacity: 0.6
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                }
              }

              Text {
                textFormat: Text.PlainText
                x: tile.inset * 2
                y: thumb.y + thumb.height
                width: tile.width - tile.inset * 4
                height: root.titleHeight
                text: tile.title
                color: tile.hasCursor ? root.selectedText : root.foreground
                font.family: root.fontFamily
                font.pixelSize: Style.font.body
                elide: Text.ElideRight
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
              }

              MouseArea {
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onPositionChanged: function(mouse) { root.selectFromPointer(tile.index, tile, mouse) }
                onClicked: {
                  root.cursorActive = true
                  root.selectedIndex = tile.index
                  root.useIndex(tile.index, "paste")
                }
              }
            }
          }

          Column {
            anchors.centerIn: parent
            width: parent.width - 2 * root.contentMargin
            spacing: Style.space(8)
            visible: displayModel.count === 0

            Text {
              textFormat: Text.PlainText
              text: root.gifs.length === 0 ? strings.t("noCatalog") : strings.t("noMatches").arg(root.filterText)
              color: root.foreground
              opacity: 0.8
              font.family: root.fontFamily
              font.pixelSize: Style.font.title
              horizontalAlignment: Text.AlignHCenter
              width: parent.width
              elide: Text.ElideRight
            }
          }
        }

        Text {
          textFormat: Text.PlainText
          width: parent.width
          height: root.footerHeight
          text: root.previewing ? strings.t("hintsPreviewing") : strings.t("hints")
          color: root.foreground
          opacity: 0.5
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          horizontalAlignment: Text.AlignHCenter
          verticalAlignment: Text.AlignVCenter
          elide: Text.ElideRight
        }
      }
    }
  }
}
