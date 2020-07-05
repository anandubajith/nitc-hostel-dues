const functions = require('firebase-functions');
const download = require('download');
const fs = require('fs');
const hasha = require('hasha');
const admin = require('firebase-admin');
admin.initializeApp();
const bucket = admin.storage().bucket();


const files = {
  "BTECH": "http://nitc.ac.in/app/webroot/img/upload/BTECH.pdf",
  "PG": "http://www.nitc.ac.in/app/webroot/img/upload/PG.pdf",
  "PHD": "http://www.nitc.ac.in/app/webroot/img/upload/PHD.pdf"
}

async function checkFileChange(course, url) {

  const eventref = admin.database().ref(`details/${course}`);
  const snapshot = await eventref.once('value');
  let oldHash = snapshot.val() || '';

  const filePath = `/tmp/${course}.pdf`;
  fs.writeFileSync(filePath, await download(url));
  const hash = await hasha.fromFile(filePath, { algorithm: 'md5' });
  if (hash !== oldHash) {
    await bucket.upload(filePath, {
      destination: `${course}_${Date.now()}.pdf`,
    });
  }
  await admin.database().ref(`details/${course}`).set(hash);

}
exports.archivePDFs = functions.pubsub.schedule('00 12 * * *').timeZone('Asia/Kolkata').onRun(() => {

  console.info("Going to archive pdf at " + Date.now());
  const uploadPromises = Object.keys(files).map(course => {
    return checkFileChange(course, files[course]);
  })

  return Promise.all(uploadPromises);
});