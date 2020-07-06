const functions = require('firebase-functions');
const download = require('download');
const fs = require('fs');
const hasha = require('hasha');
const path = require('path');
const os = require('os');
const admin = require('firebase-admin');
admin.initializeApp();
const bucket = admin.storage().bucket();
const database = admin.database();


const files = {
  "BTECH": "http://nitc.ac.in/app/webroot/img/upload/BTECH.pdf",
  "PG": "http://www.nitc.ac.in/app/webroot/img/upload/PG.pdf",
  "PHD": "http://www.nitc.ac.in/app/webroot/img/upload/PHD.pdf"
}

async function checkFileChange(course, url) {

  const eventref = database.ref(`details/${course}`);
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
  await database.ref(`details/${course}`).set(hash);

}
exports.archivePDFs = functions.pubsub.schedule('00 12 * * *').timeZone('Asia/Kolkata').onRun(() => {

  console.info("Going to archive pdf at " + Date.now());
  const uploadPromises = Object.keys(files).map(course => {
    return checkFileChange(course, files[course]);
  })

  return Promise.all(uploadPromises);
});


exports.parsePDF = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.

  if (!contentType.startsWith('application/pdf')) {
    return console.log('This is not a PDF file');
  }

  const fileName = path.basename(filePath);
  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);

  await bucket.file(filePath).download({ destination: tempFilePath });
  console.log('PDF downloaded locally to', tempFilePath);

  // parse the PDF

  return fs.unlinkSync(tempFilePath);
});