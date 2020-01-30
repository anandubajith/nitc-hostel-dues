const axios = require("axios");
const util = require('util');
const exec = util.promisify(require('child_process').exec);

function getLastUpdated() {
    return axios
      .get("https://nitc-hostel-dues.firebaseio.com/last_updated.json")
      .then(response => response.data);
}

async function updateDatabase() {
    await exec('npm run update');
};
async function sendNotification() {
    await exec('node notify-users.js');
};


async function update() {
    var oldDate = await getLastUpdated();
    updateDatabase();
    var newDate = await getLastUpdated();
    if ( oldDate != newDate ) {
        sendNotification();
        console.log("Notification sent with ", newDate)
    } else {
        console.log("No new data : ", newDate);
    }
    process.exit(0);
}
update();
