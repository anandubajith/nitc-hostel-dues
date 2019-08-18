var pdf_table_extractor = require("pdf-table-extractor");

var admin = require("firebase-admin");
var serviceAccount = require("./service-key.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://nitc-hostel-dues.firebaseio.com"
});
var db = admin.database();
var promises = [];
function success(result) {
	data = {}
	data['last_updated'] = (result.pageTables[0].tables[0][0]).split(' ').reverse().slice(0, 3).reverse().join(' ').replace(')', '');
	result.pageTables.map(page => {
		page.tables.map(item => {
			if (item[0].length === 9) {
				db.ref(item[0]).set({
					name: item[1],
					due: item[2]
				});
				promises.push(db.ref(item[0]).transaction(function(current) { return (current || 0) + 1;}));
			}
		})
	});

	// SEND PUSH NOTIFICATIONP
}

pdf_table_extractor("BTECH_dues.pdf", success, e => {
	console.log("ERROR: ", e);
});

return Promise.all(promises)
  .then(function() {
    console.log("Transaction promises completed! Exiting...");
    process.exit(0);
  })
  .catch(function(error) {
    console.log("Transactions failed:", error);
    process.exit(1);
});