(function() {

	function $(id) {
		return document.getElementById(id);
	}

	function getFormData(form) {
		let elements = form.elements;

		let fields = Object.keys(elements)
				     .map((k) => elements[k].name)
				     .filter((k) => elements[k].name !== "submit");

		let formData = {};

		fields.forEach((name) => formData[name] =  elements[name].value);

		formData.formDataNameOrder = JSON.stringify(fields);
		formData.formGoogleSheetName = form.dataset.sheet || "mail"; // default sheet name
		formData.formGoogleSendEmail = form.dataset.email || ""; // no email by default
		console.log(formData);
		return formData;
	}

	function submitFormData(event) {

		$("info").style.display="none";

		let data = getFormData($('form'));
		const url = $('form').action;
		let xhr = new XMLHttpRequest();

		xhr.open('POST', url);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

		xhr.onreadystatechange = function() {
			$('form').reset();
			$('info').style.display="block";
			return;
		};

		let encoded = Object.keys(data)
                      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k]))
                      .join('&');

		xhr.send(encoded);
	}

	$("form").addEventListener("submit", submitFormData, false);

	$('form').addEventListener('submit', (event) => event.preventDefault());

})();
