const St = imports.gi.St;
const Main = imports.ui.main;

let indicator;
let status = "OUT"; // Can be "IN" or "OUT"
let totalTime = 3.3; // Example total time in hours

function init() {
  // Create the indicator label
  indicator = new St.Label({
    text: `🔴 In Time: ${totalTime} H`,
    style_class: "status-indicator",
    reactive: true,
    track_hover: true,
  });

  // Tooltip on hover to show the total time
  indicator.connect("enter-event", () => {
    indicator.set_tooltip_text(`Total Time: ${totalTime} H`);
  });

  // Change status on click (toggle between "IN" and "OUT")
  indicator.connect("button-press-event", () => {
    status = status === "IN" ? "OUT" : "IN";
    updateIndicatorText();
  });
}

function enable() {
  // Add the indicator to the GNOME dock (panel)
  Main.uiGroup.add_actor(indicator);
}

function disable() {
  // Remove the indicator when the extension is disabled
  indicator.destroy();
}

// Function to update the text based on status
function updateIndicatorText() {
  if (status === "IN") {
    indicator.text = `🟢 In Time: ${totalTime} H`;
  } else {
    indicator.text = `🔴 In Time: ${totalTime} H`;
  }
}

init();
