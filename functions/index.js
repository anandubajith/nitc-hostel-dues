const functions = require('firebase-functions');
const pdf_table_extractor = require("pdf-table-extractor");
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

function extract(file) {
  return new Promise(((resolve, reject) => {
    pdf_table_extractor(file, resolve, reject);
  }));
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
function getUpdationDate(data) {
  let updated  = "MMMM YYYY";
  let paymentUpdated = "DD/MM/YYYY"
  return {
    paymentUpdated, 
    updated
  }
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
  console.log(fileName);
  // parse the PDF

  const data = await extract(tempFilePath);

  // get the paymentUpdateDate, updatedDate
  
  const promises = [];
  const updationDates = getUpdationDate(data);

  result.pageTables.forEach(page => {
    page.tables.forEach(item => {
      if (item[0].length === 9) {
        promises.push(
          db.ref(`data/${item[0]}`).update({
            name: item[1],   
            note: item[3]
          }),
          db.ref(`data/${item[0]}/dues/${fileName}`).update({
            amount: item[2],
            paymentUpdated: updationDates.paymentUpdated,
            updated: updationDates.updated,
          })
        );
      } else if (item[1].length === 9) {
        promises.push(
          db.ref(`data/${item[1]}`).update({
            name: item[2],   
            note: item[4]
          }),
          db.ref(`data/${item[1]}/dues/${fileName}`).update({
            amount: item[3],
            paymentUpdated: updationDates.paymentUpdated,
            updated: updationDates.updated,
          })
        );
      }
    });
  });
  promises.push(fs.unlinkSync(tempFilePath));

  return Promise.all(promises);
});