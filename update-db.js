var pdf_table_extractor = require("pdf-table-extractor");
var admin = require("firebase-admin");
var serviceAccount = require("../service-key.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://nitc-hostel-dues.firebaseio.com"
});
var db = admin.database();

function setLastUpdated(s) {
	let date = s.split(' ').reverse().slice(0, 3).reverse().join(' ').replace(')', '').toUpperCase();
	return db.ref('last_updated').set(date);
}

var total = 0;
function success(result) {
	setLastUpdated(result.pageTables[0].tables[0][0]);
	// use filter and flatMaps?
	result.pageTables.map(page => {
		page.tables.map(item => {
			if (item[0].length === 9) {
				db.ref(item[0]).set({
					name: item[1],
					due: item[2]
				})
				.then(() => {
					console.log("Inserted "+item[0])
				});
			}
		})
	});
}
function error(e) {
	console.error(e);
}

pdf_table_extractor("PDFs/BTECH_dues.pdf", success, error);
pdf_table_extractor("PDFs/PG_dues.pdf", success, error);
pdf_table_extractor("PDFs/PHD_dues.pdf", success, error);