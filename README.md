# NIT-C HOSTEL DUES

## Setup
1. Generate `service-key.json`
    1. In the Firebase console, open Settings > Service Accounts.
    2. Click Generate New Private Key, then confirm by clicking Generate Key.
    3. Securely store the JSON file as `service-key.json`
2. Setup Enviornment Variables
    1. Create `.env` file with following contents
                
            onesignal_app_id=<APP_ID>
            onesignal_api_key=<API_KEY>
    2. Replace the values with OneSignal > Settings > Key & IDs

3. Run `npm run update` to download the files and update dues in Firebase Database
4. Run `npm run notify` to send push notification using OneSignal