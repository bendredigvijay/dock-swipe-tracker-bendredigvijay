"use strict";

const GETTEXT_DOMAIN = "dock-swipe-tracker";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;
const GObject = imports.gi.GObject;
const Clutter = imports.gi.Clutter;
const ByteArray = imports.byteArray;
const Gio = imports.gi.Gio;

let extension;

const DockSwipeTracker = GObject.registerClass(
  class DockSwipeTracker extends PanelMenu.Button {
    _init() {
      super._init(0.0, `${Me.metadata.name}`);

      // Load CSS
      this._loadStylesheet();

      // Panel button layout
      this.panelContainer = new St.BoxLayout({
        style_class: "swipe-panel",
        reactive: true,
        track_hover: true,
      });

      this.statusIcon = new St.Icon({
        style_class: "status-icon",
        icon_name: "system-run-symbolic",
        icon_size: 18,
      });

      this.timeLabel = new St.Label({
        style_class: "time-label",
        text: "-- H",
      });

      this.panelContainer.add_child(this.statusIcon);
      this.panelContainer.add_child(this.timeLabel);
      this.add_child(this.panelContainer);

      // Menu content
      this.menu.box.add_style_class_name("custom-menu");

      // Header
      let headerBox = new PopupMenu.PopupMenuItem("Dock Session Monitor", {
        reactive: false,
        style_class: "menu-header",
      });
      this.menu.addMenuItem(headerBox);

      // Current Status
      this.statusItem = new PopupMenu.PopupMenuItem("", {
        reactive: false,
        style_class: "stat-item",
      });
      this.menu.addMenuItem(this.statusItem);

      // Total Time
      this.timeItem = new PopupMenu.PopupMenuItem("", {
        reactive: false,
        style_class: "stat-item",
      });
      this.menu.addMenuItem(this.timeItem);

      // Last Update
      this.lastUpdateItem = new PopupMenu.PopupMenuItem("", {
        reactive: false,
        style_class: "stat-item",
      });
      this.menu.addMenuItem(this.lastUpdateItem);

      // Buttons section
      let separator = new PopupMenu.PopupSeparatorMenuItem();
      this.menu.addMenuItem(separator);

      this.refreshButton = new PopupMenu.PopupMenuItem("⟳ Refresh Now");
      this.refreshButton.connect("activate", () => this._fetchSwipeData());
      this.menu.addMenuItem(this.refreshButton);

      this.settingsButton = new PopupMenu.PopupMenuItem("⚙ Preferences");
      this.menu.addMenuItem(this.settingsButton);

      // Initialize state
      this._status = "OUT";
      this._totalTime = 0;
      this._lastUpdate = new Date();

      // Start polling
      this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
        this._fetchSwipeData();
        return GLib.SOURCE_CONTINUE;
      });

      // Initial data fetch
      this._fetchSwipeData();
    }

    _loadStylesheet() {
      // Create the stylesheet if it doesn't exist
      let stylesheetPath = GLib.build_filenamev([Me.path, "stylesheet.css"]);
      let stylesheetFile = Gio.File.new_for_path(stylesheetPath);

      const css = `
.swipe-panel {
    padding: 5px 12px;
    background-color: rgba(40,40,40,0.85);
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin: 2px 6px;
}

.swipe-panel:hover {
    background-color: rgba(60,60,60,0.95);
}

.status-icon {
    margin-right: 8px;
}

.time-label {
    font-weight: bold;
    font-size: 13px;
    color: #fff;
}

.custom-menu {
    padding: 12px;
    border-radius: 12px;
    background-color: rgba(45,45,45,0.98);
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    margin: 5px;
    min-width: 280px;
}

.menu-header {
    font-size: 14px;
    font-weight: bold;
    color: #7aa2f7;
    padding: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.stat-item {
    padding: 6px 8px;
    border-radius: 6px;
    margin: 4px 0;
    background-color: rgba(255,255,255,0.05);
}

.stat-item .popup-menu-item-label {
    font-size: 13px;
    color: #a9b1d6;
}`;

      try {
        let [, etag] = stylesheetFile.replace_contents(css, null, false, Gio.FileCreateFlags.NONE, null);

        let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        theme.load_stylesheet(stylesheetFile);

        this._stylesheet = stylesheetFile;
      } catch (e) {
        logError(e, "Failed to load stylesheet");
      }
    }

    _updateUI() {
      log(  
        `[DockSwipeTracker] Updating UI -> Status: ${this._status}, TotalTime: ${this._totalTime}, LastUpdate: ${this._lastUpdate}`
      );

      const statusColor = this._status === "IN" ? "#9ece6a" : "#f7768e";
      const statusIcon = this._status === "IN" ? "user-available-symbolic" : "user-offline-symbolic";

      this.statusIcon.set_icon_name(statusIcon);
      this.statusIcon.style = `color: ${statusColor}`;
      this.timeLabel.text = `${this._totalTime.toFixed(1)} H`;

      this.statusItem.label.set_text(`Status: ${this._status}`);
      this.timeItem.label.set_text(`Today's Total: ${this._totalTime.toFixed(1)} Hours`);
      this.lastUpdateItem.label.set_text(`Last Sync: ${this._lastUpdate.toLocaleTimeString()}`);
    }

    _fetchSwipeData() {
      log('[DockSwipeTracker] Fetching swipe data...');
  
      let httpSession = new Soup.Session();
      let message = new Soup.Message({
          method: 'GET',
          uri: new Soup.URI('http://localhost:6847/getSwipeData')
      });
  
      httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
          try {
              const bytes = session.send_and_read_finish(result);
              const data = ByteArray.toString(bytes.get_data());
  
              log(`[DockSwipeTracker] Raw Response: ${data}`);
              
              if (message.status_code === Soup.Status.OK) {
                  const jsonResponse = JSON.parse(data);
  
                  log(`[DockSwipeTracker] Parsed Response: ${JSON.stringify(jsonResponse)}`);
  
                  // Check if totalHours is in "hh:mm" format
                  if (typeof jsonResponse.totalHours === 'string' && jsonResponse.totalHours.includes(':')) {
                      // Convert "hh:mm" to decimal hours
                      const timeParts = jsonResponse.totalHours.split(':');
                      const hours = parseInt(timeParts[0]);
                      const minutes = parseInt(timeParts[1]);
                      this._totalTime = hours + (minutes / 60);
                  } else {
                      // Otherwise, parse it as a float
                      this._totalTime = parseFloat(jsonResponse.totalHours);
                  }
                  
                  // Handle NaN case
                  if (isNaN(this._totalTime)) {
                      this._totalTime = 0;
                  }
  
                  this._status = jsonResponse.currentStatus;
                  this._lastUpdate = new Date();
                  
                  log(`[DockSwipeTracker] Updated State -> TotalTime: ${this._totalTime}, Status: ${this._status}`);
  
                  this._updateUI();
                  
                  this.panelContainer.ease({
                      scale_x: 1.05,
                      scale_y: 1.05,
                      duration: 150,
                      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                      onComplete: () => {
                          this.panelContainer.ease({
                              scale_x: 1.0,
                              scale_y: 1.0,
                              duration: 100,
                              mode: Clutter.AnimationMode.EASE_OUT_QUAD
                          });
                      }
                  });
              } else {
                  log(`[DockSwipeTracker] Failed to fetch data. Status Code: ${message.status_code}`);
              }
          } catch (e) {
              logError(e, 'DockSwipeTracker - Error in fetching data');
          }
      });
  }
  
  

    destroy() {
      if (this._timeoutId) {
        GLib.source_remove(this._timeoutId);
      }

      // Unload the stylesheet
      if (this._stylesheet) {
        let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        theme.unload_stylesheet(this._stylesheet);
      }

      super.destroy();
    }
  }
);

function init() {
  ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
}

function enable() {
  extension = new DockSwipeTracker();
  Main.panel.addToStatusArea("dock-swipe-tracker", extension);
}

function disable() {
  if (extension) {
    extension.destroy();
    extension = null;
  }
}
