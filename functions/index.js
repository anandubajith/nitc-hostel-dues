const functions = require('firebase-functions');
const pdf_table_extractor = require("pdf-table-extractor");
const download = require('download');
const fs = require('fs');
const hasha = require('hasha');
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');
const admin = require('firebase-admin');
admin.initializeApp();
const bucket = admin.storage().bucket();
const database = admin.database();

const runtimeOpts = {
  timeoutSeconds: 540,
  memory: '512MB'
}

const files = {
  "DETAILED": "http://www.nitc.ac.in/app/webroot/img/upload/DETAILED-DUES.pdf",
  "BTECH": "http://nitc.ac.in/app/webroot/img/upload/BTECH.pdf",
  "PG": "http://www.nitc.ac.in/app/webroot/img/upload/PG.pdf",
  "PHD": "http://www.nitc.ac.in/app/webroot/img/upload/PHD.pdf",
}

function extract(file) {
  return new Promise(((resolve, reject) => {
    pdf_table_extractor(file, resolve, reject);
  }));
}

async function checkFileChange(course, url, fetchTime) {

  const eventref = database.ref(`details/${course}`);
  const snapshot = await eventref.once('value');
  let oldHash = snapshot.val() || '';

  const filePath = `/tmp/${course}.pdf`;
  fs.writeFileSync(filePath, await download(url));

  const hash = await hasha.fromFile(filePath, { algorithm: 'md5' });
  if (hash !== oldHash) {
    await bucket.upload(filePath, {
      destination: `${fetchTime}_${course}.pdf`,
      resumable: false,
    });
  }
  await database.ref(`details/${course}`).set(hash);

}

function getUpdationDate(data) {

  let updated = "Unknown";
  let paymentUpdated = "Data unavailable"

  // to extract month yyyy
  let datePattern = /\w{3,9}\s*\d{4}/;
  if (datePattern.test(data)) {
    updated = datePattern.exec(data)[0];
    updated = updated.replace(/\n/g, ' ');
  }

  // to extract dd month yyyy
  let paymentDatePatternWithMonth = /\d{2}\S{2}\s+?\w{3,9}\s+?\d{4}/;
  if (paymentDatePatternWithMonth.test(data)) {
    paymentUpdated = paymentDatePatternWithMonth.exec(data)[0].toString();
    paymentUpdated = paymentUpdated.replace(/\n/g, ' ');
  }

  // to extract dd-mm-yyyy , dd/mm/yyyy or dd.mm.yyyy and make consistent
  let paymentDatePattenWithSeparator = /\d{1,2}(\.|\/|-)\d{1,2}\1\d{4}/;
  if (paymentDatePattenWithSeparator.test(data)) {
    paymentUpdated = paymentDatePattenWithSeparator.exec(data)[0].toString();
    paymentUpdated = paymentUpdated.replace(/\n/g, ' ');
    paymentUpdated = paymentUpdated.replace(/\./g, '-');
    paymentUpdated = paymentUpdated.replace(/\//g, '-');
  }

  return {
    paymentUpdated,
    updated
  }
}
function parseDetailedPDF(fileName, data) {
  const promises = [];
  const updationDates = getUpdationDate(data.pageTables[0].tables[0][0]);

  const normalizedName = fileName.split('.')[0];
  functions.logger.log("Normalized path: " + normalizedName);

  let headers = [];
  data.pageTables.forEach(page => {
    page.tables.forEach(item => {
      if (item[0].includes('SL NO')) {
        headers = item;
      } else if (headers.length === 11 && item[1].length === 9) {
        let r = {};
        for (i = 1; i < headers.length; i++) {
          r[headers[i]] = item[i];
        }
        promises.push(
          database.ref(`data/${item[1]}`).update({
            name: item[2],
            note: item[10]
          }),
          database.ref(`data/${item[1]}/dues/${normalizedName}`).update({
            data: JSON.stringify(r).replace(/\\n/g, " "),
            updated: updationDates.updated
          })
        );
      }
    });
  });

  return promises;
}
function parseDuePDF(fileName, data) {

  const promises = [];
  const updationDates = getUpdationDate(data.pageTables[0].tables[0][0]);

  const normalizedName = fileName.split('.')[0];
  functions.logger.log("Normalized path: " + normalizedName);

  data.pageTables.forEach(page => {
    page.tables.forEach(item => {
      if (item[0].length === 9) {
        promises.push(
          database.ref(`data/${item[0]}`).update({
            name: item[1],
            note: item[3]
          }),
          database.ref(`data/${item[0]}/dues/${normalizedName}`).update({
            data: JSON.stringify({
              amount: item[2],
              paymentUpdated: updationDates.paymentUpdated
            }),
            updated: updationDates.updated,
          })
        );
      } else if (item[1].length === 9) {
        promises.push(
          database.ref(`data/${item[1]}`).update({
            name: item[2],
            note: item[4]
          }),
          database.ref(`data/${item[1]}/dues/${normalizedName}`).update({
            data: JSON.stringify({
              amount: item[3],
              paymentUpdated: updationDates.paymentUpdated
            }),
            updated: updationDates.updated,
          })
        );
      }
    });
  });

  return promises;
}

exports.archivePDFs = functions.pubsub.schedule('every 2 hours').timeZone('Asia/Kolkata').onRun(() => {

  let fetchTime = Date.now();
  functions.logger.info("Going to archive pdf at " + fetchTime);
  const promises = Object.keys(files).map(course => {
    return checkFileChange(course, files[course], fetchTime);
  })

  promises.push(database.ref(`details/fetchTime`).set(fetchTime));

  return Promise.all(promises);
});

exports.manualArchivePDFs = functions.runWith(runtimeOpts).https.onRequest(async (req, res) => {
  
  let fetchTime = Date.now();
  functions.logger.info("Going to archive pdf at " + fetchTime);
  const promises = Object.keys(files).map(course => {
    return checkFileChange(course, files[course], fetchTime);
  })

  promises.push(database.ref(`details/fetchTime`).set(fetchTime));

  await Promise.all(promises);
  return res.send('hi')
});

exports.parsePDF = functions.runWith(runtimeOpts).storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.

  if (!contentType.startsWith('application/pdf')) {
    return functions.logger.info('This is not a PDF file');
  }

  const fileName = path.basename(filePath);
  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);

  await bucket.file(filePath).download({ destination: tempFilePath });
  functions.logger.log('PDF downloaded locally to', tempFilePath);

  // parse the PDF
  const data = await extract(tempFilePath);
  let promises = [];
  if (fileName.includes("DETAILED")) {
    promises = parseDetailedPDF(fileName, data);
  } else {
    promises = parseDuePDF(fileName, data);
  }
  // get the paymentUpdateDate, updatedDate

  functions.logger.info("Awaiting " + promises.length + " promises")
  promises.push(fs.unlinkSync(tempFilePath));

  return Promise.all(promises);
});

// exports.sendNotification = functions.database.ref('details/{course}').onWrite(async (snapshot, context) => {
//   // just a workaround to trigger notification only once
//   if (context.params.course !== 'BTECH') {
//     return;
//   }
//   try {
//     functions.logger.log(`Dues updated, sending notification`);
//     await fetch('https://onesignal.com/api/v1/notifications', {
//       method: 'POST',
//       headers: {
//         'Accept': 'application/json',
//         "Content-Type": "application/json; charset=utf-8",
//         'Authorization': `Basic ${functions.config().onesignal.api_key}`
//       },
//       body: JSON.stringify({
//         app_id: functions.config().onesignal.app_id,
//         contents: { en: `Hostel Dues updated\nTap to view` },
//         included_segments: ["All"]
//       })
//     });
//   } catch (e) {
//     functions.logger.error(e.message);
//   }
// });