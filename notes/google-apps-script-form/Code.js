function doPost(req) {
	let bodyData = JSON.parse(req?.postData?.contents)

	let name = bodyData.name;
	let email = bodyData.email;
	let message = bodyData.message;

	let date = new Date();

	let newRow = [date, name, email, message];

	let ss = SpreadsheetApp.getActiveSheet();
	ss.appendRow(newRow);
}


function doGet(req) {

	let ss = SpreadsheetApp.getActiveSheet();

	let sheetData = ss.getSheetValues(2, 1, ss.getLastRow() - 1, ss.getLastColumn())

	let data = sheetData.map(element => {
		return {
			"timestamp" : element[0],
			"name" : element[1],
			"email" : element[2],
			"message" : element[3]
		}
	})

	return ContentService
	.createTextOutput(JSON.stringify(data))
	.setMimeType(ContentService.MimeType.JSON);
}