


/*
The HTMLFormElement property elements returns an HTMLFormControlsCollection listing all the form controls contained in the <form> element. 
*/

/*
<form id="form">
    <input type="text" name="username" />
    <input type="text" name="fullname" />
    <input type="password" name="password" />
</form>
*/

const inputs = document.getElementById("form").elements;
const inputByIndex = inputs[0];
const inputByName = inputs["username"];

/***************************/

/*
Object.keys() returns an array of strings corresponding to the skeyes property names of the object. 
*/

const obj1 = {
  a: 'somestring',
  b: 42,
  c: false
};

console.log(Object.keys(obj1));

//output: Array ["a", "b", "c"]

----------------------------------------------------------------------------------------------------

Sanitize data in Google Apps script (XSS)
-----------------------------------------
https://stackoverflow.com/questions/75625273/sanitize-data-in-google-apps-script-xss

Class HtmlOutput
----------------
https://developers.google.com/apps-script/reference/html/html-output?hl=fr#appendUntrusted(String)

