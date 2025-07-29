
const encodeFormData = (data) => {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');
};

const id = "AKfycbwWvFQgrBORUbgTNEk1cGU37MIVw92UykMorSOB_nVyZ7U6kKoxwbbVng94_Ortd8T2rQ";
const url = `https://script.google.com/macros/s/${id}/exec`;

function postMessage() {

	let username = $("#name").val();
	let useremail = $("#email").val();
	let message = $("#message").val();

	fetch(url, {
	method: 'POST',
	mode: 'no-cors',
	redirect: 'follow',
	headers: {
		"Content-Type": "text/plain;charset=utf-8"
	},
		body: JSON.stringify({
		name : username?.toString(),
		email : useremail?.toString(),
		message : message?.toString(),
	})
	}).then(response => {
				$("#name").val('');
				$("#email").val('');
				$("#message").val('');
				displayData();
			})

	return false;
};

async function getData() {

	let data = [];

	let promise = await fetch(url);
	let response = await promise.json();
	response.forEach((element) => {
		data.push(element);
	})
	return data;
};

async function displayData(){

	let data = await getData();
	console.log(data);
	//data = data.filter(element => element.name === 'a' || element.name === 'c');
	$('#table').html('');
	$('#table').append(`<tr><th>num</th><th>timestamp</th><th>name</th><th>emai</th><th>message</th></tr>`);
	for(let i=1; i < data.length; i++){
		$('#table').append(`<tr><td>${i}</td><td>${Date.parse(data[i].timestamp).toString()}</td><td>${data[i].name}</td><td>${data[i].email}</td><td>${data[i].message}</tr>`);
	}
}
