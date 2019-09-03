const axios = require("axios");
require('dotenv').config();

function sendUpdateNotification(date) {
  return axios.post(
    "https://onesignal.com/api/v1/notifications",
    {
      app_id: process.env.onesignal_app_id,
      contents: { en: `Dues updated - ${date}` },
      included_segments: ["All"]
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        'Authorization': `Basic ${process.env.onesignal_api_key}`
      }
    }
  );
}

function getLastUpdated() {
  return axios
    .get("https://nitc-hostel-dues.firebaseio.com/last_updated.json")
    .then(response => response.data);
}

getLastUpdated()
  .then(date => sendUpdateNotification(date))
  .catch(e => console.error(e));
