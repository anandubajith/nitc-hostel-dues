const axios = require("axios");

const onesignal_keys = require("../onesignal.json");

function sendUpdateNotification(date) {
  return axios.post(
    "https://onesignal.com/api/v1/notifications",
    {
      app_id: onesignal_keys.onesignal_app_id,
      contents: { en: `Dues updated - ${date}` },
      included_segments: ["All"]
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${onesignal_keys.onesignal_api_key}`
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
