const pdf_table_extractor = require("pdf-table-extractor");
const admin = require("firebase-admin");

const serviceAccount = require("./service-key.json");

function extract(file) {
  return new Promise(function(resolve, reject) {
    pdf_table_extractor(file, resolve, reject);
  });
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nitc-hostel-dues.firebaseio.com"
});
const db = admin.database();

function getUpdationDate(data) {
  console.log('data')
  console.log(data);

  let updated = "Unknown";
  let paymentUpdated = "Data unavailable"

  // to extract month yyyy
  let datePattern = /\w{3,9}\s?\d{4}/;
  if (datePattern.test(data)) {
    console.log('managed to execute');
    updated = datePattern.exec(data)[0];
    updated = updated.replace('\n', ' ');
  }

  // to extract dd month yyyy
  let paymentDatePatternWithMonth = /\d{2}\S{2}\s+?\w{3,9}\s+?\d{4}/;
  if (paymentDatePatternWithMonth.test(data)) {
    paymentUpdated = paymentDatePatternWithMonth.exec(data)[0].toString();
    paymentUpdated = paymentUpdated.replace('\n', ' ');
  }

  // to extract dd-mm-yyyy , dd/mm/yyyy or dd.mm.yyyy
  let paymentDatePattenWithSeparator = /\d{1,2}(\.|\/|-)\d{1,2}\1\d{4}/;
  if (paymentDatePattenWithSeparator.test(data)) {
    paymentUpdated = paymentDatePattenWithSeparator.exec(data)[0].toString();
  }

  return {
    paymentUpdated,
    updated
  }
}

function parsePDF(result) {
  let promises = [];
  // setLastUpdated(
  //   result.pageTables[0].tables[2][0],
  //   result.pageTables[0].tables[0][0]
  // );
  console.log(getUpdationDate(result.pageTables[0].tables[0][0].replace(/\n/g, " ")));
}

const fileNames = [
  "PDFs/BTECH.pdf",
  "PDFs/PG.pdf",
  "PDFs/PHD.pdf"
];

filePromises = fileNames.map(file => extract(file).then(parsePDF));

Promise.all(filePromises)
  .then(() => {
    console.log("Successfully updated");
    process.exit(0);
  })
  .catch(e => {
    console.log("Error", e);
  });
