
let path = window.location.pathname;
let currentDirName = (path.split('/').length == 2)?'/':path.split('/')[path.split('/').length-2];
let currentFileName = path.split('/')[path.split('/').length-1];
let parentDir = (path.split('/').length == 2)?"/":path.split('/')[1];

/*
document.addEventListener("DOMContentLoaded", 
	function (){
	let title = $("h1#title").text(); 
	console.log(title);
});
*/

/*****************
 active menu item 
******************/

document.addEventListener("DOMContentLoaded", 
	function (){
		if (parentDir == '/' && (currentFileName == 'index.html' || currentFileName == '')) { $("#menu li:contains('Home')").addClass('active'); }
		if (parentDir == 'notes') { $("#menu li:contains('Notes')").addClass('active'); }
		if (parentDir == 'articles') { $("#menu li:contains('Articles')").addClass('active'); }
		if (parentDir == 'books') { $("#menu li:contains('Books')").addClass('active'); }
		if (parentDir == 'contact') { $("#menu li:contains('Contact')").addClass('active'); }
	}
);

/*********
 title
*********/

document.addEventListener("DOMContentLoaded", 
	function (){
		let title = $("h1#title").text(); 
		$('title').text(title);
		console.log('--->'+title);
	}
);

/***********
 responsive
***********/

function myFunction() {

  var x = document.getElementById("menu");

  if (x.className === "menu") {
    x.className += " responsive";
  } else {
    x.className = "menu";
  }

}

/***********
 breadcrumb
***********/

document.addEventListener("DOMContentLoaded", 
	function (){

		let p = path.split('/');
		let currentFileName = path.split('/')[path.split('/').length-1];

		let title = $("h1#title").text(); 

		console.log(path);
		console.log(p);
		console.log('------------>'+title);

		$(".breadcrumb").append("<ul></ul>");

		if (p.length == 2) {
			$(".breadcrumb > ul").append('<li><a href="/index.html">Home</a></li>')
		} else {
			$(".breadcrumb > ul").append('<li><a href="/index.html">Home</a></li>')

			if ( currentFileName == "" || currentFileName == "index.html" ){
				for( i=1; i < p.length-2; i++) {
					$(".breadcrumb > ul").append(`<li><a href="${path.split(p[i+1])[0]}">${p[i]}</a></li>`);
				}
			} else {
				for( i=1; i < p.length-1; i++) {
					$(".breadcrumb > ul").append(`<li><a href="${path.split(p[i+1])[0]}">${p[i]}</a></li>`);
				}
			}

			$(".breadcrumb > ul").append(`<li>${title}</li>`);
		}
	}
);

/**************

***************/

function changeIcon(){
    document.getElementById("icon").style = `background-image: url('/img/bars.svg');`;
}

function restoreIcon(){
    document.getElementById("icon").style = `background-image: url('/img/bars-white.svg');`;
}

