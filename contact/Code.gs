
// uncomment if you want to store the email address server-side (hidden).
let TO_ADDRESS = "contact.maftouhi@gmail.com";

function formatMailBody(obj, order) {
	let result = "";
	for (let idx in order) {
		let key = order[idx];
		result += "<h4 style='text-transform: capitalize; margin-bottom: 0'>" + key + "</h4><div>" + sanitizeInput(obj[key]) + "</div>";
	}
	return result;
}

function sanitizeInput(input) {
   let output = HtmlService.createHtmlOutput(" ");
   output.appendUntrusted(input);
   return output.getContent();
}

function doPost(e) {
try {
	Logger.log(e);
	record_data(e);
	let mailData = e.parameters;
	let orderParameter = e.parameters.formDataNameOrder;
	let dataOrder = JSON.parse(orderParameter);
	let sendEmailTo = (typeof TO_ADDRESS !== "undefined") ? TO_ADDRESS : mailData.formGoogleSendEmail;

	MailApp.sendEmail({
		to: String(sendEmailTo),
		subject: "Contact form submitted",
		replyTo: String(mailData.email), // This is optional
		htmlBody: formatMailBody(mailData, dataOrder)
	});
	return ContentService
		.createTextOutput(JSON.stringify({"result":"success", "data": JSON.stringify(e.parameters) }))
		.setMimeType(ContentService.MimeType.JSON);
	} catch(error) {
	Logger.log(error);
	return ContentService
		.createTextOutput(JSON.stringify({"result":"error", "error": error}))
		.setMimeType(ContentService.MimeType.JSON);
	}
}

//inserts the data received from the html form submission to a spread sheet
function record_data(e) { // e is the data received from the POST
	let lock = LockService.getDocumentLock();
	lock.waitLock(30000); // hold off up to 30 sec to avoid concurrent writing

	try {
		Logger.log(JSON.stringify(e)); // log the POST data in case we need to debug it

		// select the 'responses' sheet by default
		let doc = SpreadsheetApp.getActiveSpreadsheet();
		let sheetName = e.parameters.formGoogleSheetName || "mail";
		let sheet = doc.getSheetByName(sheetName);

		let oldHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
		let newHeader = oldHeader.slice();
		let fieldsFromForm = getDataColumns(e.parameters);
		let row = [new Date()]; // first element in the row should always be a timestamp

		// loop through the header columns
		for (let i = 1; i < oldHeader.length; i++) { // start at 1 to avoid Timestamp column
			let field = oldHeader[i];
			let output = getFieldFromData(field, e.parameters);
			row.push(output);

			// mark as stored by removing from form fields
			let formIndex = fieldsFromForm.indexOf(field);
			if (formIndex > -1) {
				fieldsFromForm.splice(formIndex, 1);
			}
		}

		// set any new fields in our form
		for (let i = 0; i < fieldsFromForm.length; i++) {
			let field = fieldsFromForm[i];
			let output = getFieldFromData(field, e.parameters);
			row.push(output);
			newHeader.push(field);
		}

		// more efficient to set values as [][] array than individually
		let nextRow = sheet.getLastRow() + 1; // get next row
		sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);

		// update header row with any new data
		if (newHeader.length > oldHeader.length) {
			sheet.getRange(1, 1, 1, newHeader.length).setValues([newHeader]);
		}
	}
	catch(error) {
		Logger.log(error);
	}
	finally {
		lock.releaseLock();
		return;
	}
}

function getDataColumns(data) {
	return Object.keys(data).filter(function(column) {
		return !(column === 'formDataNameOrder' || column === 'formGoogleSheetName' || column === 'formGoogleSendEmail' || column === 'honeypot');
	});
}

function getFieldFromData(field, data) {
	let values = data[field] || '';
	let output = values.join ? values.join(', ') : values;
	return output;
}
