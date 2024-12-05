const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;
const GObject = imports.gi.GObject;

const Extension = GObject.registerClass(
class Extension extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Dock Swipe Tracker', false);

        this._status = "OUT";
        this._totalTime = 3.3;

        // Create the label
        this._label = new St.Label({
            text: `🔴 In Time: ${this._totalTime} H`,
            style_class: "status-indicator",
            reactive: true,
            track_hover: true,
        });

        // Add the label to the button
        this.add_child(this._label);

        // Start API polling every 30 seconds
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
            this._fetchSwipeData();
            return GLib.SOURCE_CONTINUE;
        });

        global.log("Extension initialized.");
    }

    _updateIndicatorText() {
        global.log(`Updating indicator text. Current status: ${this._status}, Total time: ${this._totalTime} H`);
        this._label.text = this._status === "IN" 
            ? `🟢 In Time: ${this._totalTime} H` 
            : `🔴 In Time: ${this._totalTime} H`;
    }

    _fetchSwipeData() {
        global.log("Fetching swipe data from API...");
        
        const session = new Soup.Session();
        const message = new Soup.Message({
            method: 'GET',
            uri: new Soup.URI('http://localhost:6847/getSwipeData')
        });

        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                global.log("API request completed, processing response.");
                const bytes = session.send_and_read_finish(result);
                const decoder = new TextDecoder('utf-8');
                const jsonResponse = JSON.parse(decoder.decode(bytes.get_data()));
                
                global.log(`API response received: ${JSON.stringify(jsonResponse)}`);
                
                this._totalTime = jsonResponse.totalHours;
                this._status = jsonResponse.currentStatus;
                
                global.log(`Updated totalTime: ${this._totalTime}, status: ${this._status}`);
                this._updateIndicatorText();
            } catch (e) {
                this._logError(e);
            }
        });
    }

    _logError(error) {
        global.log(`Error fetching swipe data: ${error}`);
    }

    destroy() {
        // Remove the timeout when the extension is disabled
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
        }
        super.destroy();
    }
});

// Initialize and add the extension to the panel
function init() {
    global.log("Initializing the extension...");
    let extensionInstance = new Extension();
    Main.panel.addToStatusArea('dock-swipe-tracker', extensionInstance);
    global.log("Extension added to status area.");
    return extensionInstance;
}
